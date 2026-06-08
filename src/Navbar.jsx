import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function Navbar() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      // 사용자가 팝업을 닫은 경우는 조용히 무시
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      alert("Google 로그인 실패: " + (err.message || err.code));
    }
  };

  const handleLoginPrompt = async () => {
    const email = prompt("로그인/회원가입 이메일을 입력해주세요:");
    if (!email) return;
    const password = prompt("비밀번호를 입력해주세요 (최소 6자):");
    if (!password) return;

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await registerWithEmail(email, password);
          alert("회원가입 및 로그인이 완료되었습니다!");
        } catch (regErr) {
          alert("회원가입 실패: " + regErr.message);
        }
      } else {
        alert("로그인 실패: " + err.message);
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-surface/70 backdrop-blur-md border-b border-outline-variant/30 h-20 shadow-sm flex items-center">
      <div className="max-w-container-max mx-auto w-full px-margin-desktop flex justify-between items-center">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary">AutoHub</Link>
        <div className="hidden md:flex items-center gap-8">
          <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-1" to="/catalog">라이브러리</Link>
          <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-1" href="#pricing">가격정책</a>
          <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-1" href="#faq">자주묻는질문</a>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLanguage} 
            className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-bold flex items-center gap-1 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xs">translate</span>
            {lang.toUpperCase()}
          </button>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="font-label-md text-label-md text-red-500 hover:text-red-700 transition-colors font-bold px-4 py-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">settings</span>Admin
                  </Link>
                )}
                <Link to="/mypage" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-4 py-2">My Library</Link>
                <button onClick={logout} className="font-label-md text-label-md text-primary scale-95 active:scale-90 transition-transform duration-200 px-4 py-2">{t.logout}</button>
                <div onClick={() => navigate('/mypage')} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 cursor-pointer">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
              </>
            ) : (
              <>
                <button onClick={handleLoginPrompt} className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-4 py-2">{t.login}</button>
                <button onClick={handleGoogleLogin} className="bg-surface-container-low border border-outline-variant/30 text-on-surface-variant font-label-md text-label-md px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-center flex items-center gap-1.5 btn-animate">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Google
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
