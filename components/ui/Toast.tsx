import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    title?: string;
    description?: string;
    variant: 'default' | 'destructive' | 'success';
}

interface ToastContextType {
    toast: (props: { title?: string; description?: string; variant?: Toast['variant'] }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback(({ title, description, variant = 'default' }: { title?: string; description?: string; variant?: Toast['variant'] }) => {
        const id = ++toastCounter;
        setToasts((prev) => {
            // 最多同时显示 3 条，超出时移除最旧的
            const list = prev.length >= 3 ? prev.slice(1) : prev;
            return [...list, { id, title, description, variant }];
        });

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full fade-in duration-300 min-w-[300px] ${t.variant === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200'
                            : t.variant === 'destructive'
                                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'
                                : 'bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white'
                            }`}
                    >
                        {t.variant === 'success' && <Check size={18} className="mr-3 mt-0.5" />}
                        {t.variant === 'destructive' && <AlertCircle size={18} className="mr-3 mt-0.5" />}
                        <div className="flex-1">
                            {t.title && <div className="font-medium text-sm mb-1">{t.title}</div>}
                            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
                        </div>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-4 hover:opacity-70 mt-0.5"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    // 辅助函数：简化调用方式
    const showToast = (message: string, type: ToastType = 'info') => {
        context.toast({
            description: message,
            variant: type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'default'
        });
    };

    return { ...context, showToast };
};
