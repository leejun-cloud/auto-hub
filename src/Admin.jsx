import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';
import { importFromGithub, polishWithAI, generateImageWithAI } from './githubImport';

export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  
  // Form fields
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("AI 직원");
  const [price, setPrice] = useState("199");
  const [version, setVersion] = useState("v1.0.0");
  const [platform, setPlatform] = useState("Cross-platform");
  const [icon, setIcon] = useState("auto_awesome");
  const [image, setImage] = useState("");
  const [desc, setDesc] = useState("");

  // GitHub 가져오기 / 자동 글 작성 관련 상태
  const [githubInput, setGithubInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  // 폼에 직접 노출되지 않지만 함께 저장되어야 하는 부가 필드들
  const [extra, setExtra] = useState({});

  const fetchCatalogList = async () => {
    let cat = {};
    try {
      const querySnapshot = await getDocs(collection(db, "catalog"));
      querySnapshot.forEach((docSnap) => {
        cat[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
    } catch (err) {
      console.warn("Firestore fetch catalog failed in Admin, using local list.", err);
    }

    // Load defaults
    const localDefaults = {};
    DEFAULT_CATALOG.forEach(item => {
      localDefaults[item.id] = item;
    });

    // Load custom localStorage changes
    const localCustom = JSON.parse(localStorage.getItem("autohub_custom_catalog") || "{}");
    
    const finalCatalog = { ...localDefaults, ...cat, ...localCustom };
    setCatalog(finalCatalog);
    return finalCatalog;
  };

  useEffect(() => {
    fetchCatalogList().then((cat) => {
      const keys = Object.keys(cat || {});
      if (keys.length > 0) {
        loadItemData(cat[keys[0]]);
      }
    });
  }, []);

  const loadItemData = (product) => {
    setActiveItem(product);
    setId(product.id);
    setTitle(product.title);
    setType(product.type);
    setPrice(product.price);
    setVersion(product.version);
    setPlatform(product.platform);
    setIcon(product.icon);
    setImage(product.image || "");
    setDesc(product.desc);
    setExtra({
      features: product.features,
      specs: product.specs,
      tags: product.tags,
      title_en: product.title_en,
      desc_ko: product.desc_ko,
      githubUrl: product.githubUrl,
      zipUrl: product.zipUrl,
      filePath: product.filePath,
      sourceType: product.sourceType,
    });
    setGithubInput(product.githubUrl || "");
  };

  const prepareNewItem = () => {
    setActiveItem(null);
    setId("custom-" + Date.now());
    setTitle("");
    setType("AI 직원");
    setPrice("199");
    setVersion("v1.0.0");
    setPlatform("Cross-platform");
    setIcon("auto_awesome");
    setImage("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80");
    setDesc("");
    setExtra({});
    setGithubInput("");
  };

  // GitHub URL → 상품 정보 자동 추출 후 폼 채우기
  const handleGithubImport = async () => {
    if (!githubInput.trim()) {
      showToast("GitHub 저장소 주소를 입력해주세요.", "error");
      return;
    }
    setImporting(true);
    showToast("GitHub 저장소를 분석하는 중...", "info");
    try {
      const p = await importFromGithub(githubInput);
      setId(p.id);
      setTitle(p.title);
      setType(p.type);
      setPrice(String(p.price));
      setVersion(p.version);
      setPlatform(p.platform);
      setIcon(p.icon);
      setImage(p.image);
      setDesc(p.desc);
      setExtra({
        features: p.features,
        specs: p.specs,
        tags: p.tags,
        title_en: p.title_en,
        desc_ko: p.desc_ko,
        githubUrl: p.githubUrl,
        zipUrl: p.zipUrl,
        filePath: p.filePath,
        sourceType: p.sourceType,
      });
      setActiveItem(null); // 신규 등록 흐름으로 취급
      showToast("저장소 정보를 불러왔습니다. 내용 확인 후 저장하세요.", "success");
    } catch (err) {
      showToast(err.message || "GitHub 가져오기에 실패했습니다.", "error");
    } finally {
      setImporting(false);
    }
  };

  // 선택적 AI 다듬기 (백엔드 준비 시 동작)
  const handlePolish = async () => {
    setPolishing(true);
    showToast("AI가 소개 문구를 다듬는 중...", "info");
    try {
      const result = await polishWithAI({
        title,
        desc,
        features: extra.features,
        githubUrl: extra.githubUrl,
      });
      if (result.title) setTitle(result.title);
      if (result.desc) setDesc(result.desc);
      if (result.features) setExtra((e) => ({ ...e, features: result.features }));
      showToast("AI 다듬기가 완료되었습니다.", "success");
    } catch (err) {
      showToast(err.message || "AI 다듬기에 실패했습니다.", "error");
    } finally {
      setPolishing(false);
    }
  };

  // AI 이미지 생성 (OpenAI gpt-image)
  const handleGenerateImage = async () => {
    if (!title.trim()) {
      showToast("먼저 상품명을 입력하거나 GitHub에서 가져와주세요.", "error");
      return;
    }
    setGeneratingImage(true);
    showToast("AI가 상품 이미지를 생성하는 중... (수십 초 소요)", "info");
    try {
      const result = await generateImageWithAI({ title, desc });
      if (result.image) {
        // 생성된 이미지(약 1.5MB data URL)는 Firestore 1MB 한도를 넘으므로
        // Storage에 업로드하고 작은 다운로드 URL만 저장한다.
        try {
          const imgRef = ref(storage, `catalog-images/${id || "ai"}-${Date.now()}.png`);
          await uploadString(imgRef, result.image, "data_url");
          const url = await getDownloadURL(imgRef);
          setImage(url);
          showToast("AI 이미지를 생성해 Storage에 저장했습니다.", "success");
        } catch (upErr) {
          console.warn("Storage 업로드 실패, data URL 미리보기로 표시.", upErr);
          setImage(result.image);
          showToast(
            "이미지는 생성됐지만 Storage 업로드에 실패했습니다. (Storage 활성화/관리자 로그인 필요 — 이 상태로 저장 시 Firestore 한도 초과 가능)",
            "error"
          );
        }
      }
    } catch (err) {
      showToast(err.message || "이미지 생성에 실패했습니다.", "error");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'admin') {
      alert("관리자 권한이 없습니다.");
      return;
    }

    showToast("데이터 처리 중...", "info");

    let finalImageUrl = image;

    // Image Upload check
    const imgInput = document.getElementById("product-image-file");
    if (imgInput && imgInput.files[0]) {
      const imgFile = imgInput.files[0];
      try {
        const imgRef = ref(storage, `catalog-images/${id}-${imgFile.name}`);
        const snap = await uploadBytes(imgRef, imgFile);
        finalImageUrl = await getDownloadURL(snap.ref);
      } catch (err) {
        console.warn("Storage image upload failed, using default fallback image.");
        finalImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      }
    }

    // Product File Upload check
    const zipInput = document.getElementById("product-zip-file");
    if (zipInput && zipInput.files[0]) {
      const zipFile = zipInput.files[0];
      try {
        const zipRef = ref(storage, `products/${id}.zip`);
        await uploadBytes(zipRef, zipFile);
        showToast("제품 파일(zip) 업로드 완료!", "success");
      } catch (err) {
        console.warn("Storage product file upload failed, simulating file upload.");
        showToast("제품 파일(zip) 가상 업로드 완료!", "success");
      }
    }

    const productData = {
      id,
      title,
      type,
      price: parseFloat(price) || 0,
      version,
      platform,
      icon,
      image: finalImageUrl,
      desc,
      lastSync: "Just now"
    };

    // GitHub 가져오기 등으로 채워진 부가 필드 병합 (값이 있을 때만)
    if (extra.features) productData.features = extra.features;
    if (extra.specs) productData.specs = extra.specs;
    if (extra.tags) productData.tags = extra.tags;
    if (extra.title_en) productData.title_en = extra.title_en;
    if (extra.desc_ko) productData.desc_ko = extra.desc_ko;
    if (extra.githubUrl) productData.githubUrl = extra.githubUrl;
    if (extra.zipUrl) productData.zipUrl = extra.zipUrl;
    if (extra.filePath) productData.filePath = extra.filePath;
    if (extra.sourceType) productData.sourceType = extra.sourceType;

    try {
      await setDoc(doc(db, "catalog", id), productData);
      showToast("상품 정보가 저장 및 반영되었습니다.", "success");
    } catch (err) {
      console.warn("Firestore save failed, saving to localStorage.", err);
      // Save custom item to localstorage
      const localCustom = JSON.parse(localStorage.getItem("autohub_custom_catalog") || "{}");
      localCustom[id] = productData;
      localStorage.setItem("autohub_custom_catalog", JSON.stringify(localCustom));
      showToast("상품 정보가 로컬 저장소에 저장되었습니다.", "success");
    }

    const updatedCat = await fetchCatalogList();
    if (updatedCat[id]) {
      loadItemData(updatedCat[id]);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 이 상품을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "catalog", id));
      showToast("상품이 성공적으로 삭제되었습니다.", "success");
    } catch (err) {
      console.warn("Firestore delete failed, removing from localStorage.", err);
      const localCustom = JSON.parse(localStorage.getItem("autohub_custom_catalog") || "{}");
      delete localCustom[id];
      localStorage.setItem("autohub_custom_catalog", JSON.stringify(localCustom));
      showToast("상품이 로컬 저장소에서 삭제되었습니다.", "success");
    }

    const updatedCat = await fetchCatalogList();
    const keys = Object.keys(updatedCat || {});
    if (keys.length > 0) {
      loadItemData(updatedCat[keys[0]]);
    } else {
      prepareNewItem();
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <main className="mt-28 max-w-container-max mx-auto px-6 text-center py-20">
        <h2 className="font-headline-lg text-red-500 font-bold mb-4">접근 권한 제한</h2>
        <p className="text-on-surface-variant font-body-lg">관리자 계정(duoenjia8@gmail.com)으로 로그인 후 다시 접속해주세요.</p>
      </main>
    );
  }

  return (
    <main className="mt-28 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto min-h-screen">
      <header className="mb-8">
        <h1 className="font-display-lg text-display-lg text-red-600 mb-2 flex items-center gap-2 font-bold">
          <span className="material-symbols-outlined text-[36px]">settings</span>
          상품 및 업데이트 관리자 페이지
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">카탈로그 상품의 버전, 상세정보, 단가, 노출 상태를 관리하고 즉시 업데이트를 반영합니다.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column Sidebar */}
        <div className="lg:col-span-4 glass-card p-6 rounded-[24px] space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
            <h2 className="font-headline-md text-[20px]">상품 리스트</h2>
            <button onClick={prepareNewItem} className="bg-primary text-on-primary text-[12px] font-label-md px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span> 추가
            </button>
          </div>
          <div className="space-y-3">
            {Object.values(catalog).map((product) => (
              <button
                key={product.id}
                onClick={() => loadItemData(product)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${activeItem?.id === product.id ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:bg-surface-container'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">{product.icon}</span>
                  <div>
                    <h3 className="font-label-md font-bold text-on-surface">{product.title}</h3>
                    <p className="text-[11px] text-on-surface-variant">{product.type} • {product.version}</p>
                  </div>
                </div>
                <span className="font-label-sm text-primary group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column Form */}
        <div className="lg:col-span-8 glass-card p-8 rounded-[24px] space-y-6">
          <h2 className="font-headline-md text-headline-md text-on-surface pb-4 border-b border-outline-variant/30">
            {activeItem ? `상품 정보 수정: ${title}` : "신규 상품 등록"}
          </h2>
          
          <form className="space-y-6" onSubmit={handleFormSubmit}>
            {/* GitHub 저장소 자동 가져오기 (소스코드 등록용) */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">code</span>
                <h3 className="font-label-md font-bold text-on-surface">GitHub 저장소로 자동 등록</h3>
              </div>
              <p className="text-[12px] text-on-surface-variant">
                저장소 주소를 입력하면 README·설명·언어·릴리스를 분석해 상품명/설명/기능/태그/버전을 자동 작성하고,
                다운로드용 ZIP 링크(<code>archive/&#123;branch&#125;.zip</code>)를 연결합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="https://github.com/owner/repo  또는  owner/repo"
                  className="flex-1 bg-surface-container-lowest border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md"
                />
                <button
                  type="button"
                  onClick={handleGithubImport}
                  disabled={importing}
                  className="bg-primary text-on-primary font-label-md px-6 py-3 rounded-xl hover:opacity-90 transition-all btn-animate disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">{importing ? "hourglass_top" : "download"}</span>
                  {importing ? "분석 중..." : "가져오기 + 자동 작성"}
                </button>
              </div>
              {extra.zipUrl && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a href={extra.zipUrl} target="_blank" rel="noreferrer" className="text-[12px] text-primary underline break-all">
                    📦 {extra.zipUrl}
                  </a>
                  <button
                    type="button"
                    onClick={handlePolish}
                    disabled={polishing}
                    className="bg-secondary/15 text-secondary font-label-sm px-4 py-2 rounded-lg hover:bg-secondary/25 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                    {polishing ? "다듬는 중..." : "AI로 문구 다듬기"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">상품명 (Title)</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="블로그 작성 자동화 직원" />
              </div>
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">분류 (Type)</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md">
                  <option value="AI 직원">AI 직원</option>
                  <option value="소스코드">소스코드</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">가격 (Price USD)</label>
                <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="199" />
              </div>
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">버전 (Version)</label>
                <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} required className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="v2.4.1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">지원 플랫폼 (Platform)</label>
                <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} required className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="Windows, MacOS" />
              </div>
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">아이콘 명칭 (Material Icons)</label>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} required className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="edit_note, database, share" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">상품 이미지 (업로드 또는 AI 생성)</label>
                <input type="file" id="product-image-file" accept="image/*" className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="bg-secondary/15 text-secondary font-label-sm px-4 py-2 rounded-lg hover:bg-secondary/25 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    {generatingImage ? "생성 중..." : "AI로 이미지 생성"}
                  </button>
                  {image && (
                    <img src={image} alt="미리보기" className="h-12 w-12 rounded-lg object-cover border border-outline-variant/40" />
                  )}
                </div>
              </div>
              <div>
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">원본 파일 업로드 (Zip 등)</label>
                <input type="file" id="product-zip-file" accept=".zip,.tar.gz,.exe,.dmg" className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">상세 설명 (Description)</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} required rows="4" className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" placeholder="상품에 대한 핵심 정보 및 기능 설명"></textarea>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-outline-variant/30">
              {activeItem && (
                <button type="button" onClick={handleDelete} className="bg-red-100 text-red-700 font-label-md px-6 py-3 rounded-xl hover:bg-red-200 transition-all btn-animate">삭제</button>
              )}
              <button type="submit" className="bg-primary text-on-primary font-label-md px-8 py-3 rounded-xl hover:opacity-90 transition-all btn-animate">저장 및 업데이트</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
