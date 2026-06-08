import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

export default function Landing() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section */}
      <header className="pt-40 pb-20 px-margin-mobile md:px-margin-desktop overflow-hidden">
        <div className="max-w-container-max mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-1.5 rounded-full mb-8 border border-primary/10">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="font-label-sm text-label-sm">Expert Automation Assets</span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-6 max-w-[800px]" dangerouslySetInnerHTML={{ __html: t.heroTitle }} />
          <p className="font-body-md text-body-md md:font-body-lg md:text-body-lg text-on-surface-variant mb-10 max-w-[640px]">
            {t.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => navigate('/catalog')} className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-xl shadow-lg active:scale-95 transition-all btn-animate">
              소스코드 구독 시작하기
            </button>
            <button onClick={() => navigate('/catalog')} className="bg-surface-container-low text-on-surface font-label-md text-label-md px-8 py-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors btn-animate">
              자동화 직원 둘러보기
            </button>
          </div>
          <div className="mt-20 w-full max-w-[1000px] relative">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-full"></div>
            <img alt="AutoHub Dashboard Preview" className="w-full h-auto rounded-2xl shadow-2xl border border-outline-variant/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDhpnHRksauDHoN09c78ANLww7sixMpWmGpUvKoeS3UIvAnL8AbUXcq23QBvShgfzzRGN5VXrrl9RvMv9Q8ehC4LeL3-MkYBvS_zjZNKZa4F3yF62PMBGZnMtUF_EfDjBoPc_qmVhkQa0bGYE9X_0fn-XPGP2kjh0DwIMEJYVVGYPTWmypIZPDKWk7nlinA4i0CdFd8-9H4pvj8COM068joq1zpMmq7h5euc1FA01l7JUHxr4aWjm7VV_SkwUB0Ks7Fu1dV5mgGAI"/>
          </div>
        </div>
      </header>

      {/* Problem Statement Section */}
      <section className="py-20 bg-surface-container-low px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-center mb-16">자동화가 필요하지만 실행까지가 어렵습니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">code_off</span>
              </div>
              <h3 className="font-label-md text-label-md mb-2">직접 개발 부담</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">코딩 없이 구축하기엔 한계가 명확합니다.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined">api</span>
              </div>
              <h3 className="font-label-md text-label-md mb-2">복잡한 API 설정</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">각 서비스별 API 연동은 매번 번거롭습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined">bug_report</span>
              </div>
              <h3 className="font-label-md text-label-md mb-2">테스트 시간 소요</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">오류 수정과 안정화에 너무 많은 시간이 듭니다.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined">tune</span>
              </div>
              <h3 className="font-label-md text-label-md mb-2">커스텀의 한계</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">범용 툴은 우리 회사만의 로직을 담기 어렵습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined">schedule</span>
              </div>
              <h3 className="font-label-md text-label-md mb-2">절대적 시간 부족</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">실무를 하면서 자동화까지 챙기기 불가능합니다.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
