import { verifyUid, getDb } from "../_admin.js";
import { PRODUCTS, generateOrderId } from "../_paymentConfig.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  try {
    const { idToken, productId, userEmail, userName } = req.body || {};
    const uid = await verifyUid(idToken);
    const product = PRODUCTS[productId];

    if (!product) {
      res.status(400).json({ error: "유효하지 않은 구독 상품입니다." });
      return;
    }

    const db = getDb();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    let amount = product.amount;
    let discountApplied = false;
    let discount = null;

    if (!userDoc.exists) {
      await userRef.set({
        email: userEmail || "",
        displayName: userName || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    } else {
      const pending = userDoc.data()?.pendingDiscount;
      const isValid = pending?.discount && (!pending.expiresAt || pending.expiresAt > Date.now());
      if (isValid) {
        amount = Math.round(product.amount * (1 - Number(pending.discount)));
        discountApplied = true;
        discount = pending;
      } else if (pending?.discount && pending.expiresAt && pending.expiresAt <= Date.now()) {
        await userRef.update({ pendingDiscount: null, updatedAt: Date.now() });
      }
    }

    const orderId = generateOrderId();
    await db.collection("payments").doc(orderId).set({
      orderId,
      paymentKey: "",
      userId: uid,
      userEmail: userEmail || "",
      userName: userName || "",
      productId,
      amount,
      originalAmount: product.amount,
      discountApplied,
      discount,
      status: "pending",
      cycle: product.cycle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      orderId,
      orderName: product.name,
      amount,
      originalAmount: product.amount,
      discountApplied,
      customerEmail: userEmail || "",
      customerName: userName || userEmail?.split("@")[0] || "AutoHub User",
    });
  } catch (err) {
    console.error("[Payment Initiate Error]", err);
    res.status(/로그인|토큰|auth/i.test(err.message || "") ? 401 : 500).json({
      error: err.message || "결제 시작 중 오류가 발생했습니다.",
    });
  }
}
