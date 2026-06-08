import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const TRANSLATIONS = {
  ko: {
    heroTitle: "자동화는 필요한데,<br/>매번 직접 만들기 힘드셨나요?",
    heroDesc: "최고 수준의 소스코드와 24/7 일하는 AI 직원을 통해 반복 업무에서 해방되세요.",
    login: "로그인",
    logout: "로그아웃",
    searchPlaceholder: "자동화 상품 검색...",
    downloadFree: "무료 다운로드",
    buyNow: "구매하기",
    addedToast: "라이브러리에 추가되었습니다!",
    alreadyToast: "이미 라이브러리에 존재하는 상품입니다.",
    paymentSuccess: "토스페이 결제 승인이 완료되었습니다!"
  },
  en: {
    heroTitle: "Need Automation but<br/>Tired of Building It Yourself?",
    heroDesc: "Free yourself from repetitive tasks with elite-level source code and 24/7 autonomous digital employees.",
    login: "Login",
    logout: "Logout",
    searchPlaceholder: "Search automations...",
    downloadFree: "Download Free",
    buyNow: "Buy Now",
    addedToast: "Added to your library!",
    alreadyToast: "Already in your library.",
    paymentSuccess: "Toss Payments checkout confirmed successfully!"
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
