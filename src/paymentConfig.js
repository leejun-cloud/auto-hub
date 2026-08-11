export const SOURCE_SUBSCRIPTION_PRODUCT_ID = "AUTOHUB_SOURCE_MONTHLY";

export const SOURCE_SUBSCRIPTION = {
  productId: SOURCE_SUBSCRIPTION_PRODUCT_ID,
  name: "AutoHub 소스코드 월간 구독",
  amount: 20000,
  cycle: "monthly",
  periodDays: 30,
};

export const formatWon = (amount) => `${Number(amount || 0).toLocaleString()}원`;
