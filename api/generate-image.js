// Vercel Serverless Function: AI 상품 이미지 생성 (OpenAI gpt-image-1)
// 클라이언트는 /api/generate-image 로 POST. OPENAI_API_KEY 는 환경변수로만 보관.

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
// 기본 품질 medium (≈ $0.053/장). OPENAI_IMAGE_QUALITY 로 low/high 조정 가능.
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "medium";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { title = "", desc = "", prompt = "", quality } = body || {};

  const finalPrompt =
    prompt ||
    `소프트웨어 제품 "${title}"을 표현하는 모던하고 미니멀한 프로모션 썸네일 일러스트레이션. ` +
      `깔끔한 그라데이션 배경, 추상적 기술 모티브, 텍스트 없음, 프리미엄 느낌. 제품 설명: ${desc}`;

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024",
        quality: quality || IMAGE_QUALITY,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      res.status(r.status).json({ error: `OpenAI 오류: ${errText.slice(0, 300)}` });
      return;
    }

    const data = await r.json();
    const item = data?.data?.[0] || {};
    // gpt-image-1 은 기본적으로 b64_json 반환
    const imageUrl = item.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item.url || "";

    if (!imageUrl) {
      res.status(502).json({ error: "이미지 응답을 해석할 수 없습니다." });
      return;
    }
    res.status(200).json({ image: imageUrl, prompt: finalPrompt });
  } catch (err) {
    res.status(500).json({ error: `요청 처리 실패: ${err.message}` });
  }
}
