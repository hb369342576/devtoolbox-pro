import React, { useState, useEffect } from 'react';
import { FolderOpen, Loader2, RefreshCw, X, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { getTexts } from '../../../locales';
import { Language } from '../../../types';

interface ConvertDdlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (filePath: string) => void;
    sourceType: 'mysql' | 'doris' | null;
    defaultFileName: string;
    lang: Language;
    isConverting: boolean;
    progress: string;
}

export const ConvertDdlModal: React.FC<ConvertDdlModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    sourceType,
    defaultFileName,
    lang,
    isConverting,
    progress
}) => {
    const t = getTexts(lang);
    const [filePath, setFilePath] = useState(defaultFileName);

    useEffect(() => {
        if (isOpen) {
            setFilePath(defaultFileName);
        }
    }, [isOpen, defaultFileName]);

    const handleBrowseFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择保存文件夹' : 'Select Folder'
            });

            if (selected && typeof selected === 'string') {
                // 组合路径
                setFilePath(`${selected}\\${defaultFileName}`);
            }
        } catch (err) {
            console.error('Failed to open dialog:', err);
        }
    };

    if (!isOpen) return null;

    const title = sourceType === 'mysql'
        ? (lang === 'zh' ? '批量转换 MySQL 到 Doris' : 'Batch Convert MySQL to Doris')
        : (lang === 'zh' ? '批量转换 Doris 到 MySQL' : 'Batch Convert Doris to MySQL');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-[500px] border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
                        <RefreshCw className="mr-2 text-blue-500" size={20} />
                        {title}
                    </h3>
                    {!isConverting && (
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* File Path Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                            {lang === 'zh' ? '保存路径' : 'Save Path'}
                        </label>
                        <div className="flex space-x-2">
                            <div className="relative flex-1">
                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={filePath}
                                    onChange={(e) => setFilePath(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    placeholder={lang === 'zh' ? '请输入或选择保存路径...' : 'Enter or select save path...'}
                                    disabled={isConverting}
                                />
                            </div>
                            <button
                                onClick={handleBrowseFolder}
                                disabled={isConverting}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                                title={lang === 'zh' ? '选择文件夹' : 'Select Folder'}
                            >
                                <FolderOpen size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {lang === 'zh'
                                ? '将转换所有表的 DDL 并保存到单个 SQL 文件中'
                                : 'All table DDLs will be converted and saved to a single SQL file'}
                        </p>
                    </div>

                    {/* Progress Display */}
                    {(isConverting || progress) && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mb-1">
                                {isConverting && <Loader2 className="animate-spin mr-2" size={14} />}
                                <span className="font-medium">{lang === 'zh' ? '处理中...' : 'Processing...'}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all whitespace-pre-wrap">
                                {progress}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        disabled={isConverting}
                        className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                        {t.common.cancel}
                    </button>
                    <button
                        onClick={() => onConfirm(filePath)}
                        disabled={isConverting || !filePath}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConverting ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={16} />
                                {lang === 'zh' ? '正在转换...' : 'Converting...'}
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2" size={16} />
                                {lang === 'zh' ? '开始转换' : 'Start Conversion'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
