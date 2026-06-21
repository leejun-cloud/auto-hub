// Vercel Serverless Function: Auto Toolkit → AutoHub 동기화 수신 엔드포인트.
//
// Auto Toolkit(빌더)이 표준화한 도구를 이 엔드포인트로 전송하면:
//   1) x-sync-secret 헤더로 인증
//   2) ZIP을 Firebase Storage(products/{id}.zip)에 저장
//   3) catalog/{id} 문서를 upsert (프론트가 그대로 렌더링하는 상품 형태로 매핑)
//   4) 사라진 도구는 비활성화(deleted:true)
//   5) syncLogs 기록
//
// 전송은 도구 1개당 1요청(phase:"upsert") + 마지막 정리 1요청(phase:"finalize") 구조다.
// Vercel 요청 본문 크기 한계(~4.5MB) 때문에 도구별로 나눠 받는다. ZIP은 base64로 싣는다.
//
// 필요한 서버 환경변수:
//   AUTOHUB_SYNC_SECRET            동기화 공유 시크릿 (Auto Toolkit과 동일 값)
//   FIREBASE_SERVICE_ACCOUNT_B64   (_admin.js 에서 사용)

import crypto from "crypto";
import { getDb, getBucket } from "./_admin.js";

const SOURCE = "auto-toolkit";
const MAX_ZIP_BYTES = 8 * 1024 * 1024; // 디코딩 후 안전 상한 (Vercel 본문 한계 고려)

// 구독 플랜과 동일하게 다루기 위한 값. 프론트는 (type === '소스코드' && price !== 0)일 때
// 소스 구독 상품으로 인식하므로, 구독형 도구는 반드시 이 형태여야 한다.
const SOURCE_TYPE = "소스코드";
const SUBSCRIBER_PRICE = 49;

const PLATFORM_BY_RUNTIME = {
  nodejs: "Cross-platform (Node.js)",
  "browser-automation": "Cross-platform (Node.js)",
  python: "Cross-platform (Python 3.x)",
};

function parseBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body || {};
}

function secretOk(req) {
  const expected = process.env.AUTOHUB_SYNC_SECRET || "";
  if (!expected) return { ok: false, code: 503, error: "서버에 AUTOHUB_SYNC_SECRET이 설정되지 않았습니다." };
  const provided = req.headers["x-sync-secret"] || "";
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 401, error: "동기화 인증 실패 (x-sync-secret)." };
  }
  return { ok: true };
}

export function normalizeVersion(v) {
  const s = String(v || "1.0.0").trim();
  return /^v/i.test(s) ? s : `v${s}`;
}

// Auto Toolkit 매니페스트(autohub.json) → AutoHub catalog 문서로 매핑.
export function mapToCatalogDoc(manifest, extra = {}) {
  const id = manifest.id;
  const isFree = manifest.plan === "free";
  const runtime = manifest.runtime || "nodejs";
  const required = Array.isArray(manifest.requiredEnv) ? manifest.requiredEnv : [];

  const doc = {
    id,
    title: manifest.title || id,
    title_en: manifest.title_en || manifest.title || id,
    type: isFree ? "자동화 도구" : SOURCE_TYPE,
    price: isFree ? 0 : SUBSCRIBER_PRICE,
    version: normalizeVersion(manifest.version),
    platform: PLATFORM_BY_RUNTIME[runtime] || "Cross-platform",
    icon: "smart_toy",
    image: manifest.imageUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    desc: manifest.description || manifest.summary || "",
    desc_ko: manifest.description || manifest.summary || "",
    summary: manifest.summary || "",
    features: Array.isArray(manifest.features) ? manifest.features : [],
    useCases: Array.isArray(manifest.useCases) ? manifest.useCases : [],
    specs: {
      런타임: runtime,
      난이도: manifest.level || "beginner",
      카테고리: manifest.category || "automation",
      버전: manifest.version || "1.0.0",
      "필수 환경변수": required.length ? required.join(", ") : "없음",
      "설치 명령": manifest.installCommand || "",
      "실행 명령": manifest.startCommand || "",
    },
    tags: Array.isArray(manifest.tags) ? manifest.tags : [],
    requiredEnv: required,
    category: manifest.category || "automation",
    level: manifest.level || "beginner",
    plan: manifest.plan || "subscriber",
    runtime,
    // 다운로드/연동 메타
    sourceType: SOURCE,
    source: SOURCE,
    sourcePath: `tools/${id}`,
    downloadType: "storage",
    storagePath: `products/${id}.zip`,
    zipBytes: extra.size || 0,
    active: true,
    deleted: false,
    syncedAt: Date.now(),
    lastSync: new Date().toISOString(),
  };
  if (extra.readme) doc.manual = extra.readme;
  return doc;
}

async function handleUpsert(req, res) {
  const body = parseBody(req);
  const tool = body.tool || {};
  const manifest = tool.manifest;
  if (!manifest || !manifest.id) {
    res.status(400).json({ error: "tool.manifest.id 가 필요합니다." });
    return;
  }
  const id = manifest.id;

  if (!tool.zipBase64) {
    res.status(400).json({ error: `${id}: zipBase64 가 없습니다.` });
    return;
  }

  let buf;
  try {
    buf = Buffer.from(tool.zipBase64, "base64");
  } catch {
    res.status(400).json({ error: `${id}: zipBase64 디코딩 실패.` });
    return;
  }
  if (buf.length > MAX_ZIP_BYTES) {
    res.status(413).json({ error: `${id}: ZIP이 너무 큽니다 (${buf.length} bytes).` });
    return;
  }

  // 무결성 검증 (선택): 빌더가 보낸 sha256 과 비교
  if (tool.sha256) {
    const digest = crypto.createHash("sha256").update(buf).digest("hex");
    if (digest !== tool.sha256) {
      res.status(400).json({ error: `${id}: sha256 불일치 (전송 손상 가능).` });
      return;
    }
  }

  // 1) Storage 업로드 (products/{id}.zip)
  const storagePath = `products/${id}.zip`;
  await getBucket().file(storagePath).save(buf, {
    contentType: "application/zip",
    resumable: false,
    metadata: { metadata: { source: SOURCE, syncedAt: String(Date.now()) } },
  });

  // 2) catalog/{id} upsert
  const doc = mapToCatalogDoc(manifest, { size: buf.length, readme: tool.readme });
  await getDb().collection("catalog").doc(id).set(doc, { merge: true });

  res.status(200).json({ ok: true, id, bytes: buf.length });
}

async function handleFinalize(req, res) {
  const body = parseBody(req);
  const activeIds = Array.isArray(body.activeIds) ? body.activeIds : [];
  const summary = body.summary || {};
  const db = getDb();

  // 이번 동기화에 없는 auto-toolkit 도구는 비활성화 (프론트는 deleted 로 숨김)
  const snap = await db.collection("catalog").where("source", "==", SOURCE).get();
  const activeSet = new Set(activeIds);
  let deactivated = 0;
  const batch = db.batch();
  snap.forEach((d) => {
    if (!activeSet.has(d.id) && d.data().deleted !== true) {
      batch.set(
        d.ref,
        { active: false, deleted: true, syncedAt: Date.now(), lastSync: new Date().toISOString() },
        { merge: true }
      );
      deactivated += 1;
    }
  });
  if (deactivated > 0) await batch.commit();

  const result = {
    source: SOURCE,
    status: "success",
    createdAt: new Date().toISOString(),
    synced: Number(summary.synced || activeIds.length),
    failed: Number(summary.failed || 0),
    deactivated,
    results: Array.isArray(summary.results) ? summary.results.slice(0, 200) : [],
  };
  await db.collection("syncLogs").add(result);

  res.status(200).json({ ok: true, ...result });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  const auth = secretOk(req);
  if (!auth.ok) {
    res.status(auth.code).json({ error: auth.error });
    return;
  }

  try {
    const body = parseBody(req);
    const phase = body.phase || "upsert";
    if (phase === "finalize") {
      await handleFinalize(req, res);
    } else if (phase === "upsert") {
      await handleUpsert(req, res);
    } else {
      res.status(400).json({ error: `알 수 없는 phase: ${phase}` });
    }
  } catch (err) {
    const msg = err && err.message ? err.message : "동기화 처리 실패";
    // 실패도 로그로 남겨 추적 가능하게 한다.
    try {
      await getDb().collection("syncLogs").add({
        source: SOURCE, status: "error", error: msg, createdAt: new Date().toISOString(),
      });
    } catch { /* 로깅 실패는 무시 */ }
    res.status(500).json({ error: msg });
  }
}
