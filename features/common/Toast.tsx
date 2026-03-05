/** 通用 Toast 通知提示组件 */
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Copy, Check } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

// 模拟全局事件进行跨组件调用
const TOAST_EVENT = 'app_toast_event';

export const useToast = () => {
  const toast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { 
      detail: { ...message, id } 
    }));
  }, []);

  return { toast };
};

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleEvent = (e: any) => {
      const newToast = e.detail;
      setToasts(prev => [...prev.slice(-2), newToast]); // 最多保留3个
      
      const duration = newToast.duration || 5000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, duration);
    };

    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const copyError = (desc: string, id: string) => {
    navigator.clipboard.writeText(desc);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="text-emerald-500" size={20} />,
    error: <XCircle className="text-rose-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />
  };

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50',
    error: 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50',
    warning: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50',
    info: 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50'
  };

  return (
    <>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none min-w-[320px] max-w-md">
      {toasts.map((t) => (
        <div 
          key={t.id}
          className={`pointer-events-auto group relative flex items-start p-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-8 duration-300 backdrop-blur-md ${styles[t.type]}`}
        >
          <div className="mt-0.5">{icons[t.type]}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
              {t.message}
            </p>
            {t.description && (
              <div className="mt-1 relative">
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 break-all pr-6">
                  {t.description}
                </p>
                <button 
                  onClick={() => copyError(t.description!, t.id)}
                  className="absolute right-0 top-0 p-1 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Copy error"
                >
                  {copiedId === t.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => removeToast(t.id)}
            className="ml-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-black/5 dark:bg-white/5 w-full rounded-b-2xl overflow-hidden">
            <div 
              className={`h-full opacity-30 transition-all duration-[5000ms] linear ${
                t.type === 'success' ? 'bg-emerald-500' : 
                t.type === 'error' ? 'bg-rose-500' : 
                t.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: '0%', animation: 'toast-progress 5s linear forwards' }}
            />
          </div>
        </div>
      ))}
      </div>
    </>
  );
};
