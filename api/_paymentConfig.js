export const TOSS_API_BASE_URL = "https://api.tosspayments.com/v1";

export const SOURCE_SUBSCRIPTION_PRODUCT_ID = "AUTOHUB_SOURCE_MONTHLY";

export const PRODUCTS = {
  [SOURCE_SUBSCRIPTION_PRODUCT_ID]: {
    id: SOURCE_SUBSCRIPTION_PRODUCT_ID,
    name: "AutoHub 소스코드 월간 구독",
    amount: 20000,
    periodDays: 30,
    cycle: "monthly",
  },
};

export const SOURCE_PRODUCT_IDS = [
  "database-backup",
  "excel-automation",
  "cloud-monitor",
];

export function getTossSecretKey() {
  return process.env.TOSS_SECRET_KEY || process.env.TOSS_PAYMENTS_SECRET_KEY || "";
}

export function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `AUTOHUB_${timestamp}_${random}`.toUpperCase();
}

export function addDays(timestamp, days) {
  return timestamp + days * 24 * 60 * 60 * 1000;
}
