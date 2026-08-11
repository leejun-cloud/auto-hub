import { verifyUid, getDb } from "../_admin.js";

function isCouponValid(coupon) {
  if (!coupon?.isActive) return { valid: false, reason: "비활성화된 쿠폰입니다." };
  if (coupon.expiresAt && coupon.expiresAt < Date.now()) return { valid: false, reason: "만료된 쿠폰입니다." };
  if ((coupon.usedCount || 0) >= (coupon.maxCount || coupon.maxUses || 0)) {
    return { valid: false, reason: "사용 한도를 초과했습니다." };
  }
  return { valid: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  try {
    const { idToken, code, userEmail } = req.body || {};
    const uid = await verifyUid(idToken);
    if (!code) {
      res.status(400).json({ error: "쿠폰 코드를 입력해주세요." });
      return;
    }

    const upperCode = String(code).toUpperCase().trim();
    const db = getDb();
    const couponSnap = await db.collection("coupons").where("code", "==", upperCode).limit(1).get();
    if (couponSnap.empty) {
      res.status(404).json({ error: "유효하지 않은 쿠폰 코드입니다." });
      return;
    }

    const couponDoc = couponSnap.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() };
    const validation = isCouponValid(coupon);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }

    const usageSnap = await db
      .collection("couponUsages")
      .where("couponId", "==", coupon.id)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (!usageSnap.empty) {
      res.status(400).json({ error: "이미 사용한 쿠폰입니다." });
      return;
    }

    const discount = Number(coupon.discount || 0);
    if (coupon.type !== "discount" || !discount) {
      res.status(400).json({ error: "현재 AutoHub에서는 할인 쿠폰만 적용할 수 있습니다." });
      return;
    }

    const now = Date.now();
    const benefit = `${Math.round(discount * 100)}% 할인`;
    const batch = db.batch();
    const userRef = db.collection("users").doc(uid);
    batch.set(userRef, {
      email: userEmail || "",
      pendingDiscount: {
        couponId: coupon.id,
        couponCode: coupon.code,
        discount,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      },
      updatedAt: now,
    }, { merge: true });

    batch.set(db.collection("couponUsages").doc(), {
      couponId: coupon.id,
      couponCode: coupon.code,
      userId: uid,
      userEmail: userEmail || "",
      usedAt: now,
      benefit,
    });

    batch.update(couponDoc.ref, {
      usedCount: (coupon.usedCount || 0) + 1,
      updatedAt: now,
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: `쿠폰이 적용되었습니다: ${benefit}`,
      benefit,
      couponType: coupon.type,
    });
  } catch (err) {
    console.error("[Coupon Apply Error]", err);
    res.status(/로그인|토큰|auth/i.test(err.message || "") ? 401 : 500).json({
      error: err.message || "쿠폰 적용 중 오류가 발생했습니다.",
    });
  }
}
