/** 通用 ConfirmModal 确认对话框组件 */
import React from 'react';
import { AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    show, title, message, confirmText, cancelText,
    type = 'danger', loading = false, onConfirm, onClose
}) => {
    const { t } = useTranslation();
    
    if (!show) return null;

    const colors = {
        danger: 'bg-red-500 hover:bg-red-600',
        warning: 'bg-amber-500 hover:bg-amber-600',
        info: 'bg-blue-500 hover:bg-blue-600'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 scale-in-center">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                        <AlertCircle size={18} className="mr-2 text-amber-500" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <XCircle size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-lg active:scale-95 flex items-center ${colors[type]} disabled:opacity-50`}
                    >
                        {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};
