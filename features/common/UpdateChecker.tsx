/** 应用程序版本更新检测及 Tauri OTA 组件 */
import React, { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { 
  Download, 
  RefreshCw, 
  XCircle, 
  CheckCircle2, 
  ChevronRight, 
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { Language } from '../../types';
import { useToast } from './Toast';

interface UpdateCheckerProps {
  lang: Language;
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({ lang }) => {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const checkForUpdates = async (silent = true) => {
    try {
      if (!silent) setChecking(true);
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setShowModal(true);
      } else if (!silent) {
        toast({
          type: 'info',
          message: lang === 'zh' ? '当前已是最新版本' : 'Already up to date',
          description: lang === 'zh' ? '无需更新' : 'No updates available'
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      if (!silent) {
        toast({
          type: 'error',
          message: lang === 'zh' ? '检查更新失败' : 'Update Check Failed',
          description: String(error)
        });
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!updateInfo) return;
    try {
      setDownloading(true);
      
      let downloaded = 0;
      let contentLength = 0;

      await updateInfo.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`started downloading ${contentLength} bytes`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            console.log('download finished');
            break;
        }
      });

      toast({
        type: 'success',
        message: lang === 'zh' ? '更新下载完成' : 'Update Downloaded',
        description: lang === 'zh' ? '正在重启以应用更新...' : 'Relaunching to apply updates...'
      });

      // Restart after 2 seconds
      setTimeout(async () => {
        await relaunch();
      }, 2000);

    } catch (error) {
      console.error('Failed to install update:', error);
      toast({
        type: 'error',
        message: lang === 'zh' ? '安装更新失败' : 'Update Failed',
        description: String(error)
      });
      setDownloading(false);
    }
  };

  // Check for updates on mount
  useEffect(() => {
    // Wait a few seconds after launch
    const timer = setTimeout(() => {
      checkForUpdates(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 scale-in-center">
        {/* Header Image/Pattern */}
        <div className="relative h-48 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex flex-col items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]" />
              <div className="grid grid-cols-8 gap-4 p-4">
                 {Array.from({length: 32}).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-white rounded-full opacity-30" />
                 ))}
              </div>
           </div>
           
           <div className="relative z-10 w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl mb-4">
              <Download className="text-white animate-bounce" size={32} />
           </div>
           <h2 className="relative z-10 text-white font-bold text-2xl tracking-tight">
              {lang === 'zh' ? '发现新版本' : 'New Version Found'}
           </h2>
           <div className="relative z-10 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full mt-2 border border-white/20 shadow-sm">
              <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center">
                 <Sparkles size={12} className="mr-1.5" />
                 v{updateInfo?.version || 'Unknown'}
              </span>
           </div>
        </div>

        {/* Content */}
        <div className="p-8">
           <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-8">
              <div className="flex items-start">
                 <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">
                    <Info size={16} />
                 </div>
                 <div className="ml-4 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                       {lang === 'zh' ? '更新日志' : 'Release Notes'}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-h-32 overflow-y-auto pr-2 no-scrollbar italic whitespace-pre-wrap">
                       {updateInfo?.body || (lang === 'zh' ? '暂无详细说明' : 'No description available')}
                    </p>
                 </div>
              </div>
           </div>

           {/* Progress for download */}
           {downloading && (
              <div className="mb-8 animate-in fade-in duration-300">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                       {lang === 'zh' ? '正在下载更新...' : 'Downloading update...'}
                    </span>
                    <span className="text-xs font-bold text-blue-500 font-mono">{downloadProgress}%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div 
                       className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out shadow-sm shadow-blue-500/20"
                       style={{ width: `${downloadProgress}%` }}
                    />
                 </div>
              </div>
           )}

           {/* Buttons */}
           <div className="flex items-center justify-between space-x-4">
              <button
                 disabled={downloading}
                 onClick={() => setShowModal(false)}
                 className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all disabled:opacity-30"
              >
                 {lang === 'zh' ? '稍后提醒' : 'Later'}
              </button>
              <button
                 disabled={downloading}
                 onClick={installUpdate}
                 className="flex-1 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center group"
              >
                 {downloading ? (
                    <>
                       <Loader2 className="animate-spin mr-2" size={18} />
                       {lang === 'zh' ? '处理中' : 'Processing'}
                    </>
                 ) : (
                    <>
                       {lang === 'zh' ? '立即更新并重启' : 'Update & Restart'}
                       <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                    </>
                 )}
              </button>
           </div>
        </div>

        {/* Dynamic decorative backdrop circles */}
        <div className="absolute top-1/2 -left-12 -z-10 w-24 h-24 bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-12 -z-10 w-32 h-32 bg-indigo-500/10 blur-3xl" />
      </div>
    </div>
  );
};
