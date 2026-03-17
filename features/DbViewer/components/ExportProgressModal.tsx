import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Loader2, CheckCircle, AlertCircle, Folder } from 'lucide-react';
import { Language } from '../../../types';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from "react-i18next";

interface ExportProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (filePath: string, onProgress: (message: string) => void) => Promise<void>;
    title: string;
    defaultFileName: string;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    defaultFileName}) => {
    const { t, i18n } = useTranslation();
    const [filePath, setFilePath] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // 设置默认路径：当前程序目录 + 默认文件名
            setFilePath(defaultFileName);
            setProgress([]);
            setStatus('idle');
            setIsExporting(false);
        }
    }, [isOpen, defaultFileName]);

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.scrollTop = progressRef.current.scrollHeight;
        }
    }, [progress]);

    const addProgress = (message: string) => {
        setProgress(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

    // 选择文件夹
    const handleSelectFolder = async () => {
        if (!isTauri) return;
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: t('dbViewer.selectExportFolder')
            });

            if (selectedPath && typeof selectedPath === 'string') {
                // 提取当前文件名
                const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || defaultFileName;
                setFilePath(`${selectedPath}\\${fileName}`);
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };

    const handleStart = async () => {
        if (isTauri && !filePath.trim()) {
            addProgress(t('dbViewer.PleaseEnterFilePath'));
            return;
        }

        setIsExporting(true);
        setStatus('running');
        addProgress(t('dbViewer.StartingExport'));

        try {
            await onConfirm(filePath, addProgress);
            setStatus('success');
            addProgress(t('dbViewer.ExportCompleted'));
        } catch (error: any) {
            setStatus('error');
            const errorMsg = error?.message || error?.toString() || 'Unknown error';
            console.error('Export error:', error);
            addProgress(t('dbViewer.ExportFailedErrorMsg'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center space-x-2">
                        <Download className="text-blue-600" size={20} />
                        <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isExporting}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* File Path Input */}
                    {isTauri && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                {t('dbViewer.exportPath')}
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={filePath}
                                    onChange={(e) => setFilePath(e.target.value)}
                                    disabled={isExporting}
                                    placeholder={t('dbViewer.enterFullFilePath')}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={handleSelectFolder}
                                    disabled={isExporting}
                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                    title={t('dbViewer.selectFolder')}
                                >
                                    <Folder size={16} />
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {t('dbViewer.eGDDownloadsDatabaseexpor')}
                            </p>
                        </div>
                    )}

                    {/* Progress Log */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                            {t('dbViewer.progressLog')}
                        </label>
                        <div
                            ref={progressRef}
                            className="h-64 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap custom-scrollbar"
                        >
                            {progress.length === 0 ? (
                                <span className="text-slate-400 italic">
                                    {t('dbViewer.waitingToStart')}
                                </span>
                            ) : (
                                progress.map((msg, idx) => (
                                    <div key={idx} className="mb-1">{msg}</div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Status Indicator */}
                    {status !== 'idle' && (
                        <div className={`flex items-center space-x-2 p-3 rounded-lg ${status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                            status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                            {status === 'running' && <Loader2 className="animate-spin" size={16} />}
                            {status === 'success' && <CheckCircle size={16} />}
                            {status === 'error' && <AlertCircle size={16} />}
                            <span className="text-sm font-medium">
                                {status === 'running' && (t('dbViewer.exporting'))}
                                {status === 'success' && (t('dbViewer.exportSuccessful'))}
                                {status === 'error' && (t('dbViewer.exportFailed'))}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={handleClose}
                        disabled={isExporting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('dbViewer.cancel')}
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={isExporting || !filePath.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {isExporting && <Loader2 className="animate-spin" size={16} />}
                        <span>{t('dbViewer.start')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
