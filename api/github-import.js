// Vercel Serverless Function: GitHub 저장소 → 상품 정보 자동 생성 (비공개 저장소 지원)
// 비밀 GITHUB_TOKEN 으로 인증하여 private repo 도 조회 가능. 토큰은 서버 환경변수로만 보관.
// 토큰이 없으면 비인증(공개 저장소 한정)으로 동작한다.
// 비공개 저장소는 가져오기 시점에 소스 ZIP을 Firebase Storage(products/{id}.zip)로 업로드해 둔다.

import { getBucket } from "./_admin.js";

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

function parseGithubUrl(input) {
  if (!input) throw new Error("URL을 입력해주세요.");
  let url = String(input).trim();
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
  let branch = null;
  if (parts[2] === "tree" && parts[3]) branch = parts[3];
  return { owner, repo, branch };
}

function makeGhFetch(token) {
  return async function ghFetch(path, { raw = false } = {}) {
    const headers = {
      Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      "User-Agent": "auto-hub-importer",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (res.status === 404) {
      throw new Error(
        token
          ? "저장소를 찾을 수 없습니다. (주소 오류이거나, 토큰 계정에 접근 권한이 없는 저장소입니다)"
          : "저장소를 찾을 수 없습니다. 비공개 저장소라면 서버에 GITHUB_TOKEN 설정이 필요합니다."
      );
    }
    if (res.status === 401) throw new Error("GitHub 토큰이 유효하지 않습니다. (GITHUB_TOKEN 확인)");
    if (res.status === 403) throw new Error("GitHub API 호출 한도 초과 또는 권한 부족입니다.");
    if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
    return raw ? res.text() : res.json();
  };
}

function distillReadme(md) {
  if (!md) return { intro: "", features: [] };
  let text = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  const lines = text.split("\n");

  let intro = "";
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^[-*=]{3,}$/.test(line)) continue;
    if (/^\[!\[/.test(line) || /^\[!\[.*\]/.test(line)) continue;
    intro = line
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`>#]/g, "")
      .trim();
    if (intro.length > 15) break;
  }

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용됩니다." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const input = (body && body.input) || "";

  const token = process.env.GITHUB_TOKEN || "";
  const ghFetch = makeGhFetch(token);

  try {
    const { owner, repo, branch: urlBranch } = parseGithubUrl(input);

    const meta = await ghFetch(`/repos/${owner}/${repo}`);
    const branch = urlBranch || meta.default_branch || "main";

    let readmeMd = "";
    try {
      readmeMd = await ghFetch(`/repos/${owner}/${repo}/readme`, { raw: true });
    } catch { /* README 없음 */ }
    const { intro, features } = distillReadme(readmeMd);

    let version = "v1.0.0";
    try {
      const rel = await ghFetch(`/repos/${owner}/${repo}/releases/latest`);
      if (rel && rel.tag_name) version = rel.tag_name;
    } catch { /* 릴리스 없음 */ }

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

    const product = {
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
        공개여부: meta.private ? "Private" : "Public",
      },
      tags,
      githubUrl: meta.html_url,
      zipUrl,
      filePath: zipUrl,
      sourceType: "github",
      isPrivate: !!meta.private,
    };

    // 비공개 저장소는 ZIP을 Firebase Storage에 올려 구매자 다운로드에 대비한다.
    // (공개 저장소는 archive URL을 그대로 사용하므로 업로드 불필요)
    if (meta.private && token) {
      try {
        const zipApi = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
        const zr = await fetch(zipApi, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "auto-hub-importer",
            Accept: "application/vnd.github+json",
          },
        });
        if (!zr.ok) throw new Error(`zip 다운로드 실패 (${zr.status})`);
        const buf = Buffer.from(await zr.arrayBuffer());
        const storagePath = `products/${product.id}.zip`;
        await getBucket().file(storagePath).save(buf, {
          contentType: "application/zip",
          resumable: false,
          metadata: { metadata: { source: `${owner}/${repo}`, branch } },
        });
        product.storagePath = storagePath;
        product.downloadType = "storage";
        product.zipBytes = buf.length;
      } catch (upErr) {
        // 업로드 실패해도 메타데이터 가져오기는 성공 처리하되, 상태를 알린다.
        product.downloadType = "pending";
        product.uploadError = upErr.message;
      }
    } else if (!meta.private) {
      product.downloadType = "public";
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message || "가져오기에 실패했습니다." });
  }
}
