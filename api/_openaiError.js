// OpenAI 오류 응답을 사용자 친화적인 한국어 메시지로 변환한다.
// 원시 JSON을 그대로 노출하지 않고, 흔한 사유(결제 한도/크레딧/레이트리밋/키/모델)를 안내한다.
export function friendlyOpenAiError(status, text) {
  let code = "", message = "", type = "";
  try {
    const j = JSON.parse(text);
    code = j?.error?.code || "";
    message = j?.error?.message || "";
    type = j?.error?.type || "";
  } catch { /* JSON 아님 — 원문 일부만 사용 */ }

  const hay = `${code} ${type} ${message}`.toLowerCase();
  if (hay.includes("billing_hard_limit") || hay.includes("billing"))
    return "AI 사용 한도(결제)에 도달했습니다. OpenAI 대시보드에서 결제 한도를 상향하거나 크레딧을 충전해주세요.";
  if (hay.includes("insufficient_quota") || hay.includes("quota"))
    return "AI 크레딧이 부족합니다. OpenAI 결제·크레딧 상태를 확인해주세요.";
  if (status === 429 || hay.includes("rate_limit"))
    return "AI 요청이 잠시 몰렸습니다. 잠시 후 다시 시도해주세요.";
  if (status === 401 || hay.includes("invalid_api_key") || hay.includes("incorrect api key"))
    return "OpenAI API 키가 유효하지 않습니다. 키 설정을 확인해주세요.";
  if (hay.includes("model") && (hay.includes("not found") || hay.includes("does not exist") || hay.includes("not exist")))
    return "요청한 AI 모델을 사용할 수 없습니다. 모델 설정을 확인해주세요.";
  return message ? `AI 오류: ${message.slice(0, 160)}` : "AI 처리 중 오류가 발생했습니다.";
}
