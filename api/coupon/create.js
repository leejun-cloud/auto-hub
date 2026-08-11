import { verifyDecodedToken, getDb } from "../_admin.js";

const ADMIN_EMAILS = new Set(["duoenjia8@gmail.com"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  try {
    const { idToken, code, type = "discount", value = 0.5, limit = 100, description = "" } = req.body || {};
    const decoded = await verifyDecodedToken(idToken);
    const uid = decoded.uid;
    const decodedEmail = decoded.email;

    if (!ADMIN_EMAILS.has(decodedEmail)) {
      res.status(403).json({ error: "관리자만 쿠폰을 발행할 수 있습니다." });
      return;
    }

    if (!code) {
      res.status(400).json({ error: "쿠폰 코드를 입력해주세요." });
      return;
    }

    const upperCode = String(code).toUpperCase().trim();
    if (!/^[A-Z0-9_-]{3,30}$/.test(upperCode)) {
      res.status(400).json({ error: "쿠폰 코드는 영문/숫자/_/- 조합 3~30자로 입력해주세요." });
      return;
    }

    const db = getDb();
    const existing = await db.collection("coupons").where("code", "==", upperCode).limit(1).get();
    if (!existing.empty) {
      res.status(400).json({ error: "이미 존재하는 쿠폰 코드입니다." });
      return;
    }

    const discount = Math.max(0, Math.min(0.95, Number(value) || 0));
    const coupon = {
      code: upperCode,
      type,
      discount: type === "discount" ? discount : null,
      maxCount: Number(limit) || 100,
      usedCount: 0,
      description: description || `${Math.round(discount * 100)}% 할인`,
      createdBy: uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      isActive: true,
    };

    const docRef = await db.collection("coupons").add(coupon);
    res.status(200).json({ success: true, coupon: { id: docRef.id, ...coupon } });
  } catch (err) {
    console.error("[Coupon Create Error]", err);
    res.status(/로그인|토큰|auth/i.test(err.message || "") ? 401 : 500).json({
      error: err.message || "쿠폰 생성 중 오류가 발생했습니다.",
    });
  }
}
