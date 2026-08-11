import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { ToastProvider } from './ToastContext';
import Navbar from './Navbar';
import Landing from './Landing';
import Catalog from './Catalog';
import Detail from './Detail';
import MyPage from './MyPage';
import Admin from './Admin';
import Checkout from './Checkout';
import BillingSuccess from './BillingSuccess';
import CheckoutFail from './CheckoutFail';
import Terms from './legal/Terms';
import Privacy from './legal/Privacy';
import Refund from './legal/Refund';
import { BIZ } from './legalConfig';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <Router>
            <div className="bg-background text-on-surface min-h-screen flex flex-col font-sans">
              <Navbar />
              <div className="flex-grow">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/product/:productId" element={<Detail />} />
                  <Route path="/mypage" element={<MyPage />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/billing-success" element={<BillingSuccess />} />
                  <Route path="/checkout/fail" element={<CheckoutFail />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/refund" element={<Refund />} />
                </Routes>
              </div>
              
              {/* Footer */}
              <footer className="w-full py-16 px-margin-desktop bg-surface-container-highest border-t border-outline-variant/20 mt-20">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="flex flex-col gap-6">
                    <div className="font-headline-md text-headline-md font-bold text-primary">AutoHub</div>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">
                      비즈니스 효율을 극대화하는 자동화 자산 라이브러리. 전문가를 위한 최상의 코드를 제공합니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-12">
                    <div className="flex flex-col gap-4">
                      <h6 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Product</h6>
                      <Link to="/catalog" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary">Library</Link>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h6 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">약관·정책</h6>
                      <Link to="/terms" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary">이용약관</Link>
                      <Link to="/privacy" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary">개인정보처리방침</Link>
                      <Link to="/refund" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary">환불정책</Link>
                    </div>
                  </div>
                </div>

                {/* 전자상거래법 제10조 사업자 정보 표시 */}
                <div className="mt-10 pt-6 border-t border-outline-variant/20 text-label-sm text-on-surface-variant leading-relaxed max-w-4xl">
                  <p className="font-bold text-on-surface mb-1">{BIZ.companyName}</p>
                  <p>
                    대표 {BIZ.ceo} · 사업자등록번호 {BIZ.regNo} · 통신판매업 신고 {BIZ.mailOrderNo}
                  </p>
                  <p>주소 {BIZ.address}</p>
                  <p>고객센터 {BIZ.phone} · {BIZ.email}</p>
                  <p className="mt-2 text-on-surface-variant/70">© {new Date().getFullYear()} {BIZ.companyName}. All rights reserved.</p>
                </div>
              </footer>
            </div>
          </Router>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
