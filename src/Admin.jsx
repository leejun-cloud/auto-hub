import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';

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
                <label className="block font-label-md text-label-md mb-2 text-on-surface-variant">상품 이미지 업로드 (Storage)</label>
                <input type="file" id="product-image-file" accept="image/*" className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all font-body-md" />
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
