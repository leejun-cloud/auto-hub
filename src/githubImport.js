// GitHub 저장소 URL 하나로 상품 정보를 자동 생성하는 유틸리티.
// 외부 API 키 없이 GitHub 공개 REST API만 사용한다 (비인증 시 시간당 60회 제한).

const LANG_PLATFORM = {
  JavaScript: "Cross-platform (Node.js)",
  TypeScript: "Cross-platform (Node.js)",
  Python: "Cross-platform (Python 3.x)",
  Go: "Cross-platform (Go)",
  Java: "Cross-platform (JVM)",
  Kotlin: "Android, JVM",
  Swift: "iOS, macOS",
  "C#": "Windows, Cross-platform (.NET)",
  "C++": "Cross-platform (Native)",
  C: "Cross-platform (Native)",
  Rust: "Cross-platform (Native)",
  PHP: "Cross-platform (Web)",
  Ruby: "Cross-platform (Ruby)",
  Shell: "Linux, macOS",
  Dart: "Cross-platform (Flutter)",
};

// 다양한 GitHub URL 형태에서 owner/repo/branch 추출
export function parseGithubUrl(input) {
  if (!input) throw new Error("URL을 입력해주세요.");
  let url = input.trim();
  // owner/repo 축약형 허용
  const shorthand = url.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, ""), branch: null };
  }
  url = url.replace(/^git@github\.com:/, "https://github.com/");
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error("올바른 GitHub URL이 아닙니다.");
  }
  if (!/github\.com$/i.test(u.hostname)) {
    throw new Error("github.com 주소만 지원합니다.");
  }
  const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2) throw new Error("owner/repo 형식의 주소가 필요합니다.");
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  // .../tree/{branch} 형태면 branch 추출
  let branch = null;
  if (parts[2] === "tree" && parts[3]) branch = parts[3];
  return { owner, repo, branch };
}

async function ghFetch(path, { raw = false } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: raw
      ? { Accept: "application/vnd.github.raw" }
      : { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) throw new Error("저장소를 찾을 수 없습니다. (비공개이거나 주소 오류)");
  if (res.status === 403) throw new Error("GitHub API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  return raw ? res.text() : res.json();
}

// README 마크다운에서 사람 읽기 좋은 설명 / 기능 목록 추출
function distillReadme(md) {
  if (!md) return { intro: "", features: [] };
  // 코드블록, 배지(이미지 링크), HTML 코멘트 제거
  let text = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  const lines = text.split("\n");

  // 첫 의미 있는 단락(제목/빈줄/배지 제외) 추출
  let intro = "";
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^[-*=]{3,}$/.test(line)) continue;
    if (/^\[!\[/.test(line) || /^\[!\[.*\]/.test(line)) continue;
    // 마크다운 링크/강조 기호 정리
    intro = line
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`>#]/g, "")
      .trim();
    if (intro.length > 15) break;
  }

  // 불릿 목록을 기능 후보로 수집
  const features = [];
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    const m = line.match(/^[-*]\s+(.*)/);
    if (m) {
      const feat = m[1]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim();
      if (feat.length >= 4 && feat.length <= 80 && !/^https?:/.test(feat)) {
        features.push(feat);
      }
    }
    if (features.length >= 6) break;
  }
  return { intro, features };
}

function titleCase(repoName) {
  return repoName
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// 메인: GitHub URL → 상품 폼 데이터
// 비공개 저장소 지원을 위해 서버리스 함수(/api/github-import)를 통해 토큰 인증으로 조회한다.
// (이전: 클라이언트에서 직접 공개 API 호출 → 비공개 저장소는 404)
export async function importFromGithub(input) {
  // 입력 형식은 사전에 클라이언트에서 한 번 검증해 빠른 피드백을 준다.
  parseGithubUrl(input);

  const res = await fetch("/api/github-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (res.status === 404) {
    throw new Error(
      "가져오기 백엔드(/api/github-import)가 아직 배포되지 않았습니다. Vercel 서버리스 함수 배포가 필요합니다."
    );
  }
  if (!res.ok) {
    let msg = `가져오기 실패 (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return res.json();
}

// AI 다듬기 — 백엔드(서버리스 함수)가 있으면 호출, 없으면 명확히 알림.
// 단계적 구현: /api/polish 엔드포인트가 준비되면 자동 동작한다.
export async function polishWithAI(product) {
  const res = await fetch("/api/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: product.title,
      desc: product.desc,
      features: product.features,
      githubUrl: product.githubUrl,
    }),
  });
  if (res.status === 404) {
    throw new Error(
      "AI 다듬기 백엔드(/api/polish)가 아직 설정되지 않았습니다. Vercel 서버리스 함수 + API 키 연동이 필요합니다."
    );
  }
  if (!res.ok) {
    let msg = `AI 다듬기 실패 (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return res.json(); // { title?, desc?, features? }
}

// AI 상품 이미지 생성 (OpenAI gpt-image). 백엔드 /api/generate-image 호출.
export async function generateImageWithAI(product, quality) {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: product.title,
      desc: product.desc,
      quality,
    }),
  });
  if (res.status === 404) {
    throw new Error(
      "이미지 생성 백엔드(/api/generate-image)가 아직 배포되지 않았습니다."
    );
  }
  if (!res.ok) {
    let msg = `이미지 생성 실패 (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return res.json(); // { image, prompt }
}
