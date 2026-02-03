import React, { useState, useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, RefreshCw, X, CheckCircle } from 'lucide-react';

interface UpdateCheckerProps {
    lang: 'zh' | 'en';
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({ lang }) => {
    const [update, setUpdate] = useState<Update | null>(null);
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);

    // 应用启动时检查更新
    useEffect(() => {
        checkForUpdate();
    }, []);

    const checkForUpdate = async () => {
        setChecking(true);
        try {
            const updateInfo = await check();
            if (updateInfo?.available) {
                setUpdate(updateInfo);
                setShowModal(true);
            }
        } catch (error) {
            console.log('Update check failed:', error);
        } finally {
            setChecking(false);
        }
    };

    const downloadAndInstall = async () => {
        if (!update) return;
        
        setDownloading(true);
        try {
            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        console.log('Download started, total size:', event.data.contentLength);
                        break;
                    case 'Progress':
                        const percent = Math.round((event.data.chunkLength / (update.downloadSize || 1)) * 100);
                        setProgress(prev => Math.min(prev + percent, 100));
                        break;
                    case 'Finished':
                        console.log('Download finished');
                        break;
                }
            });
            // 下载完成后重启应用
            await relaunch();
        } catch (error) {
            console.error('Update failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    if (!showModal || !update) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[450px] overflow-hidden">
                {/* 标题栏 */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                        <Download size={20} className="mr-2 text-blue-500" />
                        {lang === 'zh' ? '发现新版本' : 'Update Available'}
                    </h3>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* 内容 */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {lang === 'zh' ? '新版本' : 'New Version'}
                            </span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                v{update.version}
                            </span>
                        </div>
                        {update.body && (
                            <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 border-t border-blue-200 dark:border-blue-700 pt-2">
                                <strong>{lang === 'zh' ? '更新说明：' : 'Release Notes:'}</strong>
                                <p className="mt-1 whitespace-pre-wrap">{update.body}</p>
                            </div>
                        )}
                    </div>
                    
                    {downloading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{lang === 'zh' ? '下载中...' : 'Downloading...'}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 按钮 */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                    <button
                        onClick={() => setShowModal(false)}
                        disabled={downloading}
                        className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                        {lang === 'zh' ? '稍后提醒' : 'Remind Later'}
                    </button>
                    <button
                        onClick={downloadAndInstall}
                        disabled={downloading}
                        className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                    >
                        {downloading ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Download size={16} />
                        )}
                        <span>{lang === 'zh' ? '立即更新' : 'Update Now'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
