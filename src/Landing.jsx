import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';

const withTimeout = (promise, ms = 1000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), ms))
  ]);
};

export default function Landing() {
  const [catalog, setCatalog] = useState([]);
  const { lang, formatPrice, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCatalog = async () => {
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
        const tossCheckout = confirm(lang === 'ko' ? "결제를 진행하시겠습니까? (토스페이먼츠 시뮬레이션)" : "Proceed with checkout? (Toss Payments simulation)");
        if (tossCheckout) {
          try {
            await withTimeout(addDoc(collection(db, "libraries"), {
              userId: userUid,
              productId: productId,
              method: "Paid",
              unlockedAt: new Date()
            }));
          } catch (dbErr) {
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

  const sourceCodes = catalog.filter(p => p.type === '소스코드');
  const aiEmployees = catalog.filter(p => p.type === 'AI 직원');

  return (
    <div className="bg-background text-on-background">
      {/* Apple-Style Hero Header */}
      <header className="pt-40 pb-20 px-margin-mobile md:px-margin-desktop overflow-hidden">
        <div className="max-w-container-max mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full mb-8 border border-secondary/20">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <span className="font-label-sm text-label-sm tracking-wider uppercase">{t.promoBadge}</span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-6 max-w-[850px] leading-tight tracking-tighter" dangerouslySetInnerHTML={{ __html: t.heroTitle }} />
          <p className="font-body-md text-body-md md:font-body-lg md:text-body-lg text-on-surface-variant mb-10 max-w-[640px]">
            {t.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 border-t border-outline-variant/20 pt-10 w-full justify-center">
            <button onClick={() => navigate('/catalog')} className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-xl shadow-lg active:scale-95 transition-all btn-animate">
              {t.btnStartSub}
            </button>
            <button onClick={() => navigate('/catalog')} className="bg-surface-container-low text-on-surface font-label-md text-label-md px-8 py-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-high active:scale-95 transition-all btn-animate">
              {t.btnBrowseAgents}
            </button>
          </div>
        </div>
      </header>

      {/* Source Code Section (MOVED TO TOP) */}
      <section className="py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-primary">code</span>
              {t.secSourceCodeTitle}
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">{t.secSourceCodeDesc}</p>
          </div>
          <button onClick={() => navigate('/catalog')} className="flex items-center gap-1 text-primary font-label-md hover:underline group">
            {t.viewMore}
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sourceCodes.slice(0, 3).map(product => (
            <ProductCard key={product.id} product={product} onCheckout={handleCheckout} formatPrice={formatPrice} t={t} lang={lang} />
          ))}
        </div>
      </section>

      {/* AI Employees Section */}
      <section className="py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-secondary">support_agent</span>
              {t.secAiAgentTitle}
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">{t.secAiAgentDesc}</p>
          </div>
          <button onClick={() => navigate('/catalog')} className="flex items-center gap-1 text-primary font-label-md hover:underline group">
            {t.viewMore}
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiEmployees.slice(0, 3).map(product => (
            <ProductCard key={product.id} product={product} onCheckout={handleCheckout} formatPrice={formatPrice} t={t} lang={lang} />
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-surface-container-low py-16 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto text-center">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-12">
            {t.trustTitle}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 opacity-40 grayscale select-none">
            <span className="font-headline-md text-headline-md font-bold tracking-tighter">TECHFLOW</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tighter">DATACORE</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tighter">NEXUS AI</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tighter">CLOUDSTRAT</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tighter">QUANTUM</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display-lg text-[36px] md:text-[48px] mb-6 leading-tight font-bold">
            {t.ctaTitle}
          </h2>
          <p className="font-body-lg text-on-surface-variant mb-12">
            {t.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/catalog')} className="w-full sm:w-auto bg-primary text-on-primary font-label-md text-label-md px-10 py-5 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg btn-animate">
              {t.btnStartSubBottom}
            </button>
            <button onClick={() => navigate('/catalog')} className="w-full sm:w-auto bg-surface-container-high text-on-surface font-label-md text-label-md px-10 py-5 rounded-2xl hover:bg-surface-container-highest active:scale-95 transition-all btn-animate">
              {t.btnViewSamples}
            </button>
          </div>
        </div>
      </section>
    </div>
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
