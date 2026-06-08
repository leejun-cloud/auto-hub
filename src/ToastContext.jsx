import React, { useState } from 'react';

export const ToastContext = React.createContext();

export const useToast = () => React.useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Dynamic Toast Renderer with glassmorphism styling */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 glass border border-outline-variant/30 animate-fade-in transition-all transform duration-300"
          >
            <span className={`material-symbols-outlined ${toast.type === 'success' ? 'text-secondary' : 'text-primary'}`}>
              {toast.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span className="font-label-md text-label-md text-on-surface">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
