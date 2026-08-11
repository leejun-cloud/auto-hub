import { getDb, verifyUid } from "../_admin.js";
import { addDays, getTossSecretKey, PRODUCTS, SOURCE_PRODUCT_IDS, TOSS_API_BASE_URL } from "../_paymentConfig.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  const secretKey = getTossSecretKey();
  if (!secretKey) {
    res.status(500).json({ success: false, message: "Toss Payments Secret Key가 설정되지 않았습니다." });
    return;
  }

  try {
    const { idToken, authKey, customerKey, orderId } = req.body || {};
    if (!authKey || !customerKey || !orderId) {
      res.status(400).json({ success: false, message: "필수 결제 정보가 누락되었습니다." });
      return;
    }

    const uid = await verifyUid(idToken);
    if (uid !== customerKey) {
      res.status(403).json({ success: false, message: "요청자 정보가 결제 정보와 일치하지 않습니다." });
      return;
    }

    const db = getDb();
    const paymentRef = db.collection("payments").doc(orderId);
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
      return;
    }

    const payment = paymentDoc.data();
    if (payment.userId !== customerKey) {
      res.status(403).json({ success: false, message: "주문 사용자 정보가 일치하지 않습니다." });
      return;
    }

    if (payment.status === "completed") {
      res.status(200).json({ success: true, message: "이미 처리된 결제입니다.", subscription: payment.subscription });
      return;
    }

    const product = PRODUCTS[payment.productId];
    if (!product) {
      res.status(400).json({ success: false, message: "유효하지 않은 구독 상품입니다." });
      return;
    }

    const authorization = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
    const billingKeyResponse = await fetch(`${TOSS_API_BASE_URL}/billing/authorizations/issue`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey, customerKey }),
    });
    const billingKeyResult = await billingKeyResponse.json();

    if (!billingKeyResponse.ok) {
      await paymentRef.update({
        status: "failed",
        tossResponse: billingKeyResult,
        updatedAt: Date.now(),
      });
      res.status(400).json({
        success: false,
        message: billingKeyResult.message || "빌링키 발급에 실패했습니다.",
      });
      return;
    }

    const paymentResponse = await fetch(`${TOSS_API_BASE_URL}/billing/${billingKeyResult.billingKey}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        amount: payment.amount,
        orderId,
        orderName: product.name,
        customerEmail: payment.userEmail || undefined,
        customerName: payment.userName || payment.userEmail || "AutoHub User",
      }),
    });
    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      await paymentRef.update({
        status: "failed",
        billingKey: billingKeyResult.billingKey,
        tossResponse: paymentResult,
        updatedAt: Date.now(),
      });
      res.status(400).json({
        success: false,
        message: paymentResult.message || "첫 정기결제 승인에 실패했습니다.",
      });
      return;
    }

    const now = Date.now();
    const expiresAt = addDays(now, product.periodDays);
    const subscription = {
      status: "active",
      productId: product.id,
      productName: product.name,
      cycle: product.cycle,
      amount: payment.amount,
      originalAmount: product.amount,
      billingKey: billingKeyResult.billingKey,
      cardInfo: {
        company: billingKeyResult.card?.company || null,
        number: billingKeyResult.card?.number || null,
      },
      startDate: now,
      endDate: expiresAt,
      nextPaymentDate: expiresAt,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.update(paymentRef, {
      paymentKey: paymentResult.paymentKey || "",
      status: "completed",
      paymentMethod: paymentResult.method || "CARD",
      billingKey: billingKeyResult.billingKey,
      approvedAt: now,
      tossResponse: paymentResult,
      subscription,
      updatedAt: now,
    });

    const userRef = db.collection("users").doc(customerKey);
    batch.set(userRef, {
      subscriptionStatus: "active",
      subscription,
      pendingDiscount: null,
      lastPaymentId: orderId,
      updatedAt: now,
    }, { merge: true });

    const subRef = db.collection("subscriptions").doc();
    batch.set(subRef, {
      userId: customerKey,
      productId: product.id,
      status: "active",
      startDate: now,
      endDate: expiresAt,
      paymentId: orderId,
      autoRenew: true,
      amount: payment.amount,
      createdAt: now,
    });

    const libraryRef = db.collection("libraries").doc(`${customerKey}_${product.id}`);
    batch.set(libraryRef, {
      userId: customerKey,
      productId: product.id,
      method: "Subscription",
      status: "active",
      unlockedAt: now,
      expiresAt,
      paymentId: orderId,
      updatedAt: now,
    }, { merge: true });

    SOURCE_PRODUCT_IDS.forEach((sourceProductId) => {
      batch.set(db.collection("libraries").doc(`${customerKey}_${sourceProductId}`), {
        userId: customerKey,
        productId: sourceProductId,
        method: "Subscription",
        status: "active",
        unlockedAt: now,
        expiresAt,
        paymentId: orderId,
        subscriptionProductId: product.id,
        updatedAt: now,
      }, { merge: true });
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: "소스코드 월간 구독이 활성화되었습니다.",
      subscription: {
        productId: product.id,
        cycle: product.cycle,
        endDate: expiresAt,
        nextPaymentDate: expiresAt,
      },
    });
  } catch (err) {
    console.error("[Billing API Error]", err);
    res.status(500).json({ success: false, message: err.message || "정기결제 처리 중 오류가 발생했습니다." });
  }
}
