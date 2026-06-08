// Vercel Serverless Function: 구매(보유) 검증 후 소스 ZIP 다운로드용 서명 URL 발급.
// 클라이언트는 Firebase ID 토큰 + productId 를 보낸다.
// 1) ID 토큰으로 사용자 검증  2) Firestore libraries 에서 보유 여부 확인  3) 단기 서명 URL 반환.

import { verifyUid, getDb, getBucket } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { idToken, productId } = body || {};
  if (!productId) {
    res.status(400).json({ error: "productId가 필요합니다." });
    return;
  }

  try {
    // 1) 사용자 인증
    const uid = await verifyUid(idToken);

    // 2) 보유 여부 확인 (구매 또는 무료 발급 모두 허용)
    const snap = await getDb()
      .collection("libraries")
      .where("userId", "==", uid)
      .where("productId", "==", productId)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(403).json({ error: "이 상품을 보유하고 있지 않습니다. (구매 후 다운로드 가능)" });
      return;
    }

    // 3) Storage 객체 존재 확인 + 단기 서명 URL 발급
    const file = getBucket().file(`products/${productId}.zip`);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "다운로드 파일이 아직 준비되지 않았습니다. (관리자에서 가져오기를 다시 실행해 주세요)" });
      return;
    }

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000, // 5분
      responseDisposition: `attachment; filename="${productId}.zip"`,
    });

    res.status(200).json({ url, expiresInSec: 300 });
  } catch (err) {
    const msg = err && err.message ? err.message : "다운로드 처리 실패";
    const code = /로그인|토큰|auth/i.test(msg) ? 401 : 500;
    res.status(code).json({ error: msg });
  }
}
