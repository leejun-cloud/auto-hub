// Vercel Serverless Function: AI 마케팅 문구 다듬기 (OpenAI gpt-5.4-mini)
// 클라이언트는 /api/polish 로 POST 한다. OPENAI_API_KEY 는 Vercel 환경변수로만 보관.

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";

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
  const { title = "", desc = "", features = [], githubUrl = "" } = body || {};

  const sys =
    "당신은 소프트웨어 소스코드/AI 제품을 판매하는 한국어 마켓플레이스의 카피라이터입니다. " +
    "입력된 제품 정보를 바탕으로 매력적이고 신뢰감 있는 한국어 상품 소개를 작성하세요. " +
    "과장·허위 없이 구체적인 기능 중심으로 작성합니다. " +
    '반드시 JSON 객체만 출력하세요: {"title": string, "desc": string, "features": string[]}. ' +
    "title은 40자 이내, desc는 2~4문장, features는 4~6개의 간결한 항목.";

  const userMsg =
    `제품명: ${title}\n` +
    `기존 설명: ${desc}\n` +
    `기능 후보: ${Array.isArray(features) ? features.join(" / ") : ""}\n` +
    `GitHub: ${githubUrl}`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      res.status(r.status).json({ error: `OpenAI 오류: ${errText.slice(0, 300)}` });
      return;
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    res.status(200).json({
      title: parsed.title || title,
      desc: parsed.desc || desc,
      features: Array.isArray(parsed.features) ? parsed.features : features,
    });
  } catch (err) {
    res.status(500).json({ error: `요청 처리 실패: ${err.message}` });
  }
}
