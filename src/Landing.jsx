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
    <div className="bg-background text-on-background overflow-hidden">
      {/* ===== Hero ===== */}
      <header className="relative pt-36 md:pt-44 pb-20 px-margin-mobile md:px-margin-desktop">
        {/* decorative gradient blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute top-10 right-[-120px] w-[460px] h-[460px] rounded-full bg-secondary/10 blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
        </div>

        <div className="relative max-w-container-max mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full mb-8 border border-secondary/20">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <span className="font-label-sm text-label-sm tracking-wider uppercase">{t.promoBadge}</span>
          </div>

          <h1
            className="font-headline-lg-mobile md:font-display-lg text-[40px] leading-[1.1] md:text-[64px] md:leading-[1.05] text-on-surface mb-6 max-w-[900px] tracking-tighter font-bold"
            dangerouslySetInnerHTML={{ __html: t.heroTitle }}
          />
          <p className="font-body-md text-body-md md:font-body-lg md:text-body-lg text-on-surface-variant mb-10 max-w-[660px]">
            {t.heroDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-14">
            <button
              onClick={() => navigate('/catalog')}
              className="group bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-xl shadow-lg shadow-primary/25 hover:opacity-95 active:scale-95 transition-all btn-animate inline-flex items-center justify-center gap-2"
            >
              {t.btnStartSub}
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="bg-surface-container-lowest text-on-surface font-label-md text-label-md px-8 py-4 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high active:scale-95 transition-all btn-animate"
            >
              {t.btnBrowseAgents}
            </button>
          </div>

          {/* trust stat strip */}
          <div className="grid grid-cols-3 gap-px w-full max-w-[640px] rounded-2xl overflow-hidden border border-outline-variant/30 bg-outline-variant/20">
            {[
              { v: "120+", l: lang === 'ko' ? '검증된 자동화 자산' : 'Verified assets' },
              { v: "7일", l: lang === 'ko' ? '무료 프로모션' : 'Free promo' },
              { v: "24/7", l: lang === 'ko' ? '즉시 다운로드' : 'Instant download' },
            ].map((s, i) => (
              <div key={i} className="bg-surface-container-lowest py-5 px-3 flex flex-col items-center">
                <span className="font-headline-md text-headline-md font-bold text-primary">{s.v}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ===== Source Code Section ===== */}
      <ProductSection
        icon="code"
        iconColor="text-primary"
        title={t.secSourceCodeTitle}
        desc={t.secSourceCodeDesc}
        viewMore={t.viewMore}
        onViewMore={() => navigate('/catalog')}
        products={sourceCodes.slice(0, 3)}
        onCheckout={handleCheckout}
        formatPrice={formatPrice}
        t={t}
        lang={lang}
      />

      {/* ===== AI Employees Section ===== */}
      <ProductSection
        icon="support_agent"
        iconColor="text-secondary"
        title={t.secAiAgentTitle}
        desc={t.secAiAgentDesc}
        viewMore={t.viewMore}
        onViewMore={() => navigate('/catalog')}
        products={aiEmployees.slice(0, 3)}
        onCheckout={handleCheckout}
        formatPrice={formatPrice}
        t={t}
        lang={lang}
        className="mb-8"
      />

      {/* ===== Trust logos ===== */}
      <section className="bg-surface-container-low py-16 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto text-center">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-12">
            {t.trustTitle}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 opacity-40 grayscale select-none">
            {["TECHFLOW", "DATACORE", "NEXUS AI", "CLOUDSTRAT", "QUANTUM"].map((n) => (
              <span key={n} className="font-headline-md text-headline-md font-bold tracking-tighter">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary to-surface-tint px-6 py-16 md:px-16 md:py-20 text-center">
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl"></div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative max-w-2xl mx-auto">
            <h2 className="font-display-lg text-[32px] md:text-[48px] leading-tight font-bold text-on-primary mb-5">
              {t.ctaTitle}
            </h2>
            <p className="font-body-lg text-body-lg text-on-primary/80 mb-10">
              {t.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/catalog')}
                className="w-full sm:w-auto bg-surface-container-lowest text-primary font-label-md text-label-md px-10 py-5 rounded-2xl hover:opacity-95 active:scale-95 transition-all shadow-lg btn-animate"
              >
                {t.btnStartSubBottom}
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="w-full sm:w-auto bg-on-primary/10 text-on-primary border border-on-primary/30 font-label-md text-label-md px-10 py-5 rounded-2xl hover:bg-on-primary/20 active:scale-95 transition-all btn-animate"
              >
                {t.btnViewSamples}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductSection({ icon, iconColor, title, desc, viewMore, onViewMore, products, onCheckout, formatPrice, t, lang, className = "" }) {
  return (
    <section className={`py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto ${className}`}>
      <div className="flex justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold flex items-center gap-2">
            <span className={`material-symbols-outlined text-[28px] ${iconColor}`}>{icon}</span>
            {title}
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">{desc}</p>
        </div>
        <button onClick={onViewMore} className="flex items-center gap-1 text-primary font-label-md hover:underline group shrink-0">
          {viewMore}
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {products.map(product => (
          <ProductCard key={product.id} product={product} onCheckout={onCheckout} formatPrice={formatPrice} t={t} lang={lang} />
        ))}
      </div>
    </section>
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
      className="product-card bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] p-5 flex flex-col group premium-card-hover cursor-pointer"
    >
      <div className="relative rounded-[16px] overflow-hidden aspect-[4/3] mb-5 bg-surface-container">
        <img alt={localizedTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={product.image} />
        <div className={`absolute top-3 left-3 ${badgeColor} px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-md`}>
          <span className="font-label-sm text-label-sm">{badgeText}</span>
        </div>
      </div>
      <div className="flex-grow">
        <h3 className="font-headline-md text-headline-md mb-2 font-bold leading-snug">{localizedTitle}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-6">
          {localizedDesc}
        </p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="font-headline-md text-headline-md font-bold">{formatPrice(product.price)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCheckout(product.id, isFree);
          }}
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all btn-animate inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">{isFree ? 'download' : 'shopping_cart'}</span>
          {isFree ? (lang === 'ko' ? '무료 다운로드' : 'Download Free') : (lang === 'ko' ? '구매하기' : 'Buy Now')}
        </button>
      </div>
    </div>
  );
}
