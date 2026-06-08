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
export async function importFromGithub(input) {
  const { owner, repo, branch: urlBranch } = parseGithubUrl(input);

  const meta = await ghFetch(`/repos/${owner}/${repo}`);
  const branch = urlBranch || meta.default_branch || "main";

  // README (실패해도 진행)
  let readmeMd = "";
  try {
    readmeMd = await ghFetch(`/repos/${owner}/${repo}/readme`, { raw: true });
  } catch {
    /* README 없음 — 빈 문자열로 진행 */
  }
  const { intro, features } = distillReadme(readmeMd);

  // 최신 릴리스 → 버전 (없으면 태그, 그것도 없으면 기본값)
  let version = "v1.0.0";
  try {
    const rel = await ghFetch(`/repos/${owner}/${repo}/releases/latest`);
    if (rel && rel.tag_name) version = rel.tag_name;
  } catch {
    /* 릴리스 없음 */
  }

  const topics = Array.isArray(meta.topics) ? meta.topics : [];
  const language = meta.language || "";
  const platform = LANG_PLATFORM[language] || "Cross-platform";

  const title = titleCase(repo);
  const baseDesc = meta.description ? meta.description.trim() : "";
  const descParts = [];
  if (baseDesc) descParts.push(baseDesc);
  if (intro && intro !== baseDesc) descParts.push(intro);
  descParts.push(
    `GitHub 저장소 ${owner}/${repo}를 기반으로 한 프리미엄 소스코드 패키지입니다. ` +
      `구매 즉시 전체 소스를 ZIP으로 내려받아 바로 활용할 수 있습니다.`
  );
  const desc = descParts.join(" ");

  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

  const tags = [...new Set([language, ...topics].filter(Boolean))].slice(0, 6);
  if (tags.length === 0) tags.push("오픈소스", "소스코드");

  const finalFeatures =
    features.length > 0
      ? features
      : [
          "전체 소스코드 ZIP 패키지 제공",
          "즉시 다운로드 및 상업적 활용 가능",
          `${language || "멀티"} 기반 구현`,
        ];

  return {
    id: `gh-${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    title,
    title_en: title,
    type: "소스코드",
    price: 49,
    version,
    platform,
    icon: "code",
    image:
      meta.owner && meta.owner.avatar_url
        ? meta.owner.avatar_url
        : "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=800&q=80",
    desc,
    desc_ko: desc,
    features: finalFeatures,
    specs: {
      저장소: `${owner}/${repo}`,
      "주 언어": language || "다양",
      "기본 브랜치": branch,
      "스타 수": String(meta.stargazers_count ?? 0),
      라이선스: (meta.license && meta.license.spdx_id) || "미지정",
      "최종 업데이트": meta.pushed_at ? meta.pushed_at.slice(0, 10) : "-",
    },
    tags,
    githubUrl: meta.html_url,
    zipUrl,
    filePath: zipUrl,
    sourceType: "github",
  };
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
