import { getDb, verifyDecodedToken } from "../_admin.js";

const ADMIN_EMAILS = new Set(["duoenjia8@gmail.com"]);

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function serializeDoc(doc) {
  const data = doc.data() || {};
  return { id: doc.id, ...data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  try {
    const { idToken } = req.body || {};
    const decoded = await verifyDecodedToken(idToken);
    if (!ADMIN_EMAILS.has(decoded.email)) {
      res.status(403).json({ error: "관리자만 조회할 수 있습니다." });
      return;
    }

    const db = getDb();
    const [usersSnap, subscriptionsSnap, paymentsSnap, couponsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("subscriptions").get(),
      db.collection("payments").get(),
      db.collection("coupons").get(),
    ]);

    const users = usersSnap.docs.map(serializeDoc);
    const subscriptions = subscriptionsSnap.docs
      .map(serializeDoc)
      .sort((a, b) => toMillis(b.createdAt || b.startDate) - toMillis(a.createdAt || a.startDate));
    const payments = paymentsSnap.docs
      .map(serializeDoc)
      .sort((a, b) => toMillis(b.createdAt || b.approvedAt) - toMillis(a.createdAt || a.approvedAt));
    const coupons = couponsSnap.docs
      .map(serializeDoc)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    const activeSubscriptions = subscriptions.filter((item) => {
      const endDate = toMillis(item.endDate);
      return item.status === "active" && (!endDate || endDate > Date.now());
    });
    const completedPayments = payments.filter((item) => item.status === "completed");
    const failedPayments = payments.filter((item) => item.status === "failed");
    const monthlyRevenue = completedPayments
      .filter((item) => toMillis(item.approvedAt || item.createdAt) >= Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        users: users.length,
        subscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        completedPayments: completedPayments.length,
        failedPayments: failedPayments.length,
        monthlyRevenue,
        coupons: coupons.length,
      },
      users,
      subscriptions,
      payments,
      coupons,
    });
  } catch (err) {
    console.error("[Admin Commerce Error]", err);
    res.status(/로그인|토큰|auth/i.test(err.message || "") ? 401 : 500).json({
      error: err.message || "관리자 데이터를 불러오지 못했습니다.",
    });
  }
}
