import React from 'react';
import { X, GitBranch, ArrowRight } from 'lucide-react';
import { CompletePath } from '../utils/configGenerator';
import { Language } from '../../../types';

interface PathSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    paths: { id: string; label: string }[];
    onSelect: (pathId: string) => void;
    lang: Language;
}

export const PathSelectModal: React.FC<PathSelectModalProps> = ({
    isOpen,
    onClose,
    paths,
    onSelect,
    lang
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[400px] max-h-[60vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <GitBranch className="text-purple-600" size={20} />
                        <span className="font-bold text-lg dark:text-white">
                            {lang === 'zh' ? '选择数据流路径' : 'Select Data Path'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                        {lang === 'zh' 
                            ? '检测到画布中有多个完整的数据流路径，请选择要生成配置的路径：' 
                            : 'Multiple complete data paths detected. Please select the path to generate config for:'}
                    </p>
                    <div className="space-y-2">
                        {paths.map((path, index) => (
                            <button
                                key={path.id}
                                onClick={() => onSelect(path.id)}
                                className="w-full p-4 text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-purple-600">
                                            {path.label}
                                        </span>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-400 group-hover:text-purple-600" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};
