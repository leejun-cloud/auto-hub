import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';

// Prevent Firestore from hanging indefinitely if offline
const withTimeout = (promise, ms = 1000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), ms))
  ]);
};

export default function Catalog() {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const { lang, formatPrice, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCatalog = async () => {
      // 기본 카탈로그를 베이스로 깔고, Firestore에서 등록/수정된 상품을 덮어쓰기로 병합한다.
      // 이렇게 해야 관리자가 신규 상품을 추가해도 기본 상품들이 사라지지 않는다.
      const merged = {};
      DEFAULT_CATALOG.forEach((item) => {
        merged[item.id] = item;
      });

      try {
        const querySnapshot = await withTimeout(getDocs(collection(db, "catalog")));
        querySnapshot.forEach((doc) => {
          merged[doc.id] = { ...merged[doc.id], id: doc.id, ...doc.data() };
        });
      } catch (err) {
        console.warn("Firestore get error (using DEFAULT_CATALOG only):", err);
      }

      // localStorage 폴백 저장본도 병합 (Firestore 쓰기 실패 시 대비)
      try {
        const localCustom = JSON.parse(localStorage.getItem("autohub_custom_catalog") || "{}");
        Object.values(localCustom).forEach((item) => {
          merged[item.id] = { ...merged[item.id], ...item };
        });
      } catch { /* ignore */ }

      setCatalog(Object.values(merged));
    };
    fetchCatalog();
  }, []);

  const handleCheckout = async (productId, isFree) => {
    const user = auth.currentUser;
    const userUid = user ? user.uid : "demo-user-123";
    
    try {
      // Check if product is already in libraries
      let alreadyExists = false;
      try {
        const q = query(
          collection(db, "libraries"),
          where("userId", "==", userUid),
          where("productId", "==", productId)
        );
        const existing = await withTimeout(getDocs(q));
        alreadyExists = !existing.empty;
      } catch (err) {
        // Fallback localStorage check
        const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
        alreadyExists = localLibs.some(lib => lib.userId === userUid && lib.productId === productId);
      }

      if (alreadyExists) {
        showToast(t.alreadyToast, "info");
        navigate('/mypage');
        return;
      }

      if (isFree) {
        try {
          await withTimeout(addDoc(collection(db, "libraries"), {
            userId: userUid,
            productId: productId,
            method: "Free Promo",
            unlockedAt: new Date()
          }));
        } catch (dbErr) {
          // localStorage fallback
          const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
          localLibs.push({
            userId: userUid,
            productId: productId,
            method: "Free Promo",
            unlockedAt: new Date().toISOString()
          });
          localStorage.setItem("autohub_libraries", JSON.stringify(localLibs));
        }
        showToast("라이브러리에 추가되었습니다!", "success");
        navigate('/mypage');
      } else {
        // Toss Payments simulation
        const tossCheckout = confirm("결제를 진행하시겠습니까? (토스페이먼츠 시뮬레이션)");
        if (tossCheckout) {
          try {
            await withTimeout(addDoc(collection(db, "libraries"), {
              userId: userUid,
              productId: productId,
              method: "Paid",
              unlockedAt: new Date()
            }));
          } catch (dbErr) {
            // localStorage fallback
            const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
            localLibs.push({
              userId: userUid,
              productId: productId,
              method: "Paid",
              unlockedAt: new Date().toISOString()
            });
            localStorage.setItem("autohub_libraries", JSON.stringify(localLibs));
          }
          showToast(t.paymentSuccess, "success");
          navigate('/mypage');
        }
      }
    } catch (err) {
      console.error(err);
      showToast("오류가 발생했습니다.", "error");
    }
  };

  const filteredCatalog = catalog.filter((product) => {
    const title = (lang === 'en' ? product.title_en || product.title : product.title).toLowerCase();
    const desc = (lang === 'ko' ? product.desc_ko || product.desc : product.desc).toLowerCase();
    return title.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());
  });

  return (
    <main className="mt-28 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">자동화 자산 카탈로그</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">엄선된 프리미엄 소스코드와 지능형 에이전트 리스트입니다.</p>
        </div>
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-high border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-body-md"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        </div>
      </header>

      {/* Source Code Section */}
      <section className="mb-16">
        <h2 className="font-headline-lg text-headline-lg mb-8 font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[28px] text-primary">code</span>
          Premium Source Codes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredCatalog.filter(p => p.type === '소스코드').map(product => (
            <ProductCard key={product.id} product={product} onCheckout={handleCheckout} formatPrice={formatPrice} t={t} lang={lang} />
          ))}
        </div>
      </section>

      {/* AI Employees Section */}
      <section className="mb-16">
        <h2 className="font-headline-lg text-headline-lg mb-8 font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[28px] text-secondary">support_agent</span>
          AI Digital Employees
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredCatalog.filter(p => p.type === 'AI 직원').map(product => (
            <ProductCard key={product.id} product={product} onCheckout={handleCheckout} formatPrice={formatPrice} t={t} lang={lang} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product, onCheckout, formatPrice, t, lang }) {
  const isFree = product.price === 0 || product.method === 'Free Promo';
  const badgeText = isFree ? (lang === 'ko' ? '무료' : 'Free') : (product.type === '소스코드' ? 'Source Code' : 'New');
  const badgeColor = isFree ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary';
  const localizedTitle = lang === 'en' && product.title_en ? product.title_en : product.title;
  const localizedDesc = lang === 'ko' && product.desc_ko ? product.desc_ko : product.desc;

  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/product/${product.id}`)}
      className="product-card bg-surface-container-lowest border border-[#E5E5E7] rounded-[24px] p-6 premium-card-shadow flex flex-col group hover:border-primary/30 transition-all duration-300 premium-card-hover cursor-pointer"
    >
      <div className="relative rounded-[16px] overflow-hidden aspect-[4/3] mb-6">
        <img alt={localizedTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={product.image}/>
        <div className={`absolute top-3 left-3 ${badgeColor} px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-md`}>
          <span className="font-label-sm text-label-sm">{badgeText}</span>
        </div>
      </div>
      <div className="flex-grow">
        <h3 className="font-headline-md text-headline-md mb-2 font-bold">{localizedTitle}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-6">
          {localizedDesc}
        </p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="font-headline-md text-headline-md font-bold">{formatPrice(product.price)}</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onCheckout(product.id, isFree);
          }} 
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all btn-animate"
        >
          {isFree ? (lang === 'ko' ? '무료 다운로드' : 'Download Free') : (lang === 'ko' ? '구매하기' : 'Buy Now')}
        </button>
      </div>
    </div>
  );
}
