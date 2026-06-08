import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const TRANSLATIONS = {
  ko: {
    heroTitle: "실무에 꼭 필요한 자동화,<br/>이제 직접 만들지 말고&nbsp;<span class=\"text-primary\">바로 가져다 쓰세요.</span>",
    heroDesc: "복잡한 개발 없이 바로 업무에 투입할 수 있는 검증된 소스코드와 AI 직원을 제공합니다. 오늘부터 반복 업무에서 해방되세요.",
    login: "로그인",
    logout: "로그아웃",
    searchPlaceholder: "자동화 상품 검색...",
    downloadFree: "무료 다운로드",
    buyNow: "구매하기",
    addedToast: "라이브러리에 추가되었습니다!",
    alreadyToast: "이미 라이브러리에 존재하는 상품입니다.",
    paymentSuccess: "토스페이 결제 승인이 완료되었습니다!",
    promoBadge: "7일 무료 프로모션 진행 중",
    btnStartSub: "소스코드 구독 시작하기",
    btnBrowseAgents: "자동화 직원 둘러보기",
    secSourceCodeTitle: "실무 필수 소스코드",
    secSourceCodeDesc: "즉시 실행 가능한 자동화의 기초 프레임워크입니다.",
    secAiAgentTitle: "업무별 전담 AI 직원",
    secAiAgentDesc: "설치 후 바로 시작하는 당신의 가장 스마트한 자동화 파트너입니다.",
    viewMore: "더보기",
    trustTitle: "글로벌 기업들이 신뢰하는 자동화 파트너",
    ctaTitle: "자동화 구축 시간을 혁신적으로 줄이세요",
    ctaDesc: "지금 바로 구독하고 당신의 24시간을 더 가치 있는 곳에 사용하세요.",
    btnStartSubBottom: "구독 시작하기",
    btnViewSamples: "무료 샘플 보기"
  },
  en: {
    heroTitle: "Essential Work Automation,<br/>Don't Build from Scratch&nbsp;<span class=\"text-primary\">Just Plug & Play.</span>",
    heroDesc: "Get proven source code and AI employees ready for action without complex development. Break free from repetitive tasks today.",
    login: "Login",
    logout: "Logout",
    searchPlaceholder: "Search automations...",
    downloadFree: "Download Free",
    buyNow: "Buy Now",
    addedToast: "Added to your library!",
    alreadyToast: "Already in your library.",
    paymentSuccess: "Toss Payments checkout confirmed successfully!",
    promoBadge: "7-Day Free Trial Promotion Active",
    btnStartSub: "Start Source Code Subscription",
    btnBrowseAgents: "Browse Digital Employees",
    secSourceCodeTitle: "Essential Source Code",
    secSourceCodeDesc: "Basic frameworks for instantly executable automation.",
    secAiAgentTitle: "Dedicated AI Employees",
    secAiAgentDesc: "Your smartest automation partners, ready to go right after installation.",
    viewMore: "View More",
    trustTitle: "Trusted Automation Partner for Global Enterprises",
    ctaTitle: "Revolutionize Your Automation Build Time",
    ctaDesc: "Subscribe today and invest your 24 hours where they matter most.",
    btnStartSubBottom: "Start Subscription",
    btnViewSamples: "View Free Samples"
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('autohub_lang') || 'ko');
  const [geo, setGeo] = useState('KR');
  const [currencySymbol, setCurrencySymbol] = useState('₩');
  const currencyRatio = 1400; // 1 USD = 1400 KRW

  useEffect(() => {
    // Detect GeoIP
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        const country = data.country_code || "KR";
        setGeo(country);
        if (country === 'KR') {
          setCurrencySymbol('₩');
        } else {
          setCurrencySymbol('$');
          // For non-Koreans, switch language automatically to English if not set
          if (!localStorage.getItem('autohub_lang')) {
            setLang('en');
          }
        }
      })
      .catch(() => {
        setGeo('KR');
        setCurrencySymbol('₩');
      });
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'ko' ? 'en' : 'ko';
    setLang(nextLang);
    localStorage.setItem('autohub_lang', nextLang);
  };

  const formatPrice = (priceUSD) => {
    if (priceUSD === 0) return lang === 'ko' ? '무료' : 'Free';
    if (currencySymbol === '₩') {
      return (priceUSD * currencyRatio).toLocaleString() + '원';
    }
    return '$' + priceUSD;
  };

  const t = TRANSLATIONS[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, geo, currencySymbol, formatPrice, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
