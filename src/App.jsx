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
                </Routes>
              </div>
              
              {/* Footer */}
              <footer className="w-full py-16 px-margin-desktop flex flex-col md:flex-row justify-between items-start gap-6 bg-surface-container-highest border-t border-outline-variant/20 mt-20">
                <div className="flex flex-col gap-6">
                  <div className="font-headline-md text-headline-md font-bold text-primary">AutoHub</div>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">
                    비즈니스 효율을 극대화하는 자동화 자산 라이브러리. 전문가를 위한 최상의 코드를 제공합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-12">
                  <div className="flex flex-col gap-4">
                    <h6 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Product</h6>
                    <span className="font-label-sm text-label-sm text-on-surface-variant cursor-pointer hover:text-primary">Library</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant cursor-pointer hover:text-primary">AI Employees</span>
                  </div>
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
