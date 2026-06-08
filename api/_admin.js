// Firebase Admin 초기화 (서버리스 함수 공용).
// 서비스계정 키는 환경변수로만 보관한다:
//   FIREBASE_SERVICE_ACCOUNT_B64  (base64로 인코딩한 JSON, 권장)  또는
//   FIREBASE_SERVICE_ACCOUNT       (원문 JSON 문자열)
// Storage 버킷은 firebase.js 의 storageBucket 과 동일해야 한다.

import admin from "firebase-admin";

const STORAGE_BUCKET = "auto-hub-2026-unique.firebasestorage.app";

function loadServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let text = "";
  if (b64) {
    text = Buffer.from(b64, "base64").toString("utf8");
  } else if (raw) {
    text = raw;
  } else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT(_B64) 환경변수가 설정되지 않았습니다.");
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 혹시 raw 가 base64였던 경우 한 번 더 시도
    try { json = JSON.parse(Buffer.from(text, "base64").toString("utf8")); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT 형식이 올바른 JSON이 아닙니다."); }
  }
  // PEM 개행이 \\n 으로 이스케이프된 경우 복원
  if (json.private_key && json.private_key.includes("\\n")) {
    json.private_key = json.private_key.replace(/\\n/g, "\n");
  }
  return json;
}

export function getAdmin() {
  if (!admin.apps.length) {
    const sa = loadServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: STORAGE_BUCKET,
    });
  }
  return admin;
}

export function getBucket() {
  return getAdmin().storage().bucket();
}

export function getDb() {
  return getAdmin().firestore();
}

export async function verifyUid(idToken) {
  if (!idToken) throw new Error("로그인이 필요합니다.");
  const decoded = await getAdmin().auth().verifyIdToken(idToken);
  return decoded.uid;
}
