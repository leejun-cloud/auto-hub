import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, getDocs, doc, query, where } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';
import { useNavigate } from 'react-router-dom';

// Prevent Firestore from hanging indefinitely if offline
const withTimeout = (promise, ms = 1000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), ms))
  ]);
};

export default function MyPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [library, setLibrary] = useState([]);
  const [filterType, setFilterType] = useState("전체");

  useEffect(() => {
    const fetchLibrary = async () => {
      const userUid = user ? user.uid : "demo-user-123";
      try {
        // Fetch catalog first
        let catalog = {};
        try {
          const catSnapshot = await withTimeout(getDocs(collection(db, "catalog")));
          catSnapshot.forEach((docSnap) => {
            catalog[docSnap.id] = docSnap.data();
          });
        } catch (e) {
          console.log("Firestore catalog load failed, using local default.");
        }
        
        // Ensure default catalog elements are loaded in the mapping
        DEFAULT_CATALOG.forEach(item => {
          if (!catalog[item.id]) {
            catalog[item.id] = item;
          }
        });

        let list = [];
        try {
          const q = query(collection(db, "libraries"), where("userId", "==", userUid));
          const querySnapshot = await withTimeout(getDocs(q));
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const product = catalog[data.productId];
            if (product) {
              list.push({
                id: data.productId,
                ...product,
                method: data.method,
                lastSync: "Just now"
              });
            }
          });
        } catch (dbErr) {
          console.log("Firestore library load failed, using localStorage.");
        }

        // If list is still empty, check localStorage
        if (list.length === 0) {
          const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
          const userLocalLibs = localLibs.filter(lib => lib.userId === userUid);
          userLocalLibs.forEach((lib) => {
            const product = catalog[lib.productId];
            if (product) {
              list.push({
                id: lib.productId,
                ...product,
                method: lib.method,
                lastSync: "Just now"
              });
            }
          });
        }

        // Default initial library setup for demo convenience if completely empty
        if (list.length === 0) {
          // Pre-populate with blog-writer and ai-documenter for testing convenience
          list = [
            {
              ...catalog["blog-writer"],
              method: "Free Promo",
              lastSync: "Just now"
            },
            {
              ...catalog["ai-documenter"],
              method: "Paid",
              lastSync: "Just now"
            }
          ];
          // Save back to localStorage for consistency
          const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
          if (!localLibs.some(lib => lib.userId === userUid)) {
            localLibs.push({ userId: userUid, productId: "blog-writer", method: "Free Promo", unlockedAt: new Date().toISOString() });
            localLibs.push({ userId: userUid, productId: "ai-documenter", method: "Paid", unlockedAt: new Date().toISOString() });
            localStorage.setItem("autohub_libraries", JSON.stringify(localLibs));
          }
        }

        setLibrary(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLibrary();
  }, [user]);

  const handleDownload = async (productId, title, zipUrl) => {
    showToast(`"${title}" 다운로드 준비 중...`, "info");
    // GitHub로 등록된 상품은 실제 archive ZIP 링크를 바로 사용
    if (zipUrl) {
      const link = document.createElement("a");
      link.href = zipUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = `${productId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`"${title}" 다운로드를 시작합니다.`, "success");
      return;
    }
    try {
      const fileRef = ref(storage, `products/${productId}.zip`);
      const downloadUrl = await getDownloadURL(fileRef);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${productId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`"${title}" 다운로드 완료!`, "success");
    } catch (err) {
      console.warn("Storage download URL failed, running mock simulation download.", err);
      // Create a mock zip text file download so it works on local offline testing
      const blob = new Blob(["Mock source code for " + title], { type: "application/zip" });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${productId}_source.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      showToast(`"${title}" (데모 파일) 다운로드 완료!`, "success");
    }
  };

  const filteredLibrary = library.filter(item => {
    if (filterType === "전체") return true;
    if (filterType === "구매한 상품") return item.method === "Paid";
    if (filterType === "무료로 받은 상품") return item.method === "Free Promo";
    return true;
  });

  const statsTotal = library.length;
  const statsFree = library.filter(item => item.method === "Free Promo").length;
  const statsPaid = library.filter(item => item.method === "Paid").length;

  return (
    <main className="mt-28 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto min-h-screen">
      <header className="mb-8">
        <h1 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">마이페이지 / 유저 라이브러리</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">소유하고 있는 자동화 프로그램 및 소스코드 대시보드입니다.</p>
      </header>

      {/* Bento Grid Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-8 rounded-[24px] flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">소유한 전체 자산</span>
            <span className="font-display-lg text-[36px] font-bold text-primary">{statsTotal}</span>
          </div>
          <span className="material-symbols-outlined text-primary text-[48px]">folder_open</span>
        </div>
        <div className="glass-card p-8 rounded-[24px] flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">무료 다운로드</span>
            <span className="font-display-lg text-[36px] font-bold text-secondary">{statsFree}</span>
          </div>
          <span className="material-symbols-outlined text-secondary text-[48px]">download</span>
        </div>
        <div className="glass-card p-8 rounded-[24px] flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">유료 구매 자산</span>
            <span className="font-display-lg text-[36px] font-bold text-tertiary">{statsPaid}</span>
          </div>
          <span className="material-symbols-outlined text-tertiary text-[48px]">credit_card</span>
        </div>
      </section>

      {/* Navigation Filter Tabs */}
      <div className="flex gap-4 border-b border-outline-variant/30 pb-4 mb-8 overflow-x-auto">
        {["전체", "구매한 상품", "무료로 받은 상품"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`font-label-md text-label-md px-6 py-2.5 rounded-xl transition-all ${filterType === tab ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Library Grid */}
      <div className="space-y-6">
        {filteredLibrary.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-[24px] p-8">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-4">folder_open</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">조건에 맞는 상품이 라이브러리에 없습니다.</p>
          </div>
        ) : (
          filteredLibrary.map((item) => {
            const localizedTitle = lang === 'en' && item.title_en ? item.title_en : item.title;
            const localizedDesc = lang === 'ko' && item.desc_ko ? item.desc_ko : item.desc;
            return (
              <div key={item.id} className="glass-card p-6 md:p-8 rounded-[24px] group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 premium-card-hover">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex gap-6 items-center cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                    <div className="w-16 h-16 rounded-[16px] bg-primary-container/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-primary text-[32px]">{item.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-headline-md text-headline-md text-on-surface font-bold group-hover:text-primary transition-colors">{localizedTitle}</h3>
                        <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full font-label-sm text-label-sm">Method: {item.method}</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">{localizedDesc}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {item.id === "ai-documenter" && (
                      <button onClick={() => navigate(`/product/${item.id}`)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-secondary text-white px-6 py-3 rounded-[12px] font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all btn-animate">
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                        에이전트 실행
                      </button>
                    )}
                    <button onClick={() => handleDownload(item.id, localizedTitle, item.zipUrl)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-[12px] font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all btn-animate">
                      <span className="material-symbols-outlined text-[20px]">download</span>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
