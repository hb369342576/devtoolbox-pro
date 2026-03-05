/** 试图模式切换开关组件（桌面/Web 模拟） */
import React from 'react';
import { Monitor, Globe, Info } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { getTexts } from '../../locales';
import { Tooltip } from './Tooltip';

export const ViewModeToggle: React.FC = () => {
    const { viewMode, setViewMode, language: lang } = useGlobalStore();
    const texts = getTexts(lang);
    
    return (
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <button
                onClick={() => setViewMode('desktop')}
                className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    viewMode === 'desktop'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <Monitor size={16} className="mr-2" />
                {texts.common.desktopMode}
            </button>
            <button
                onClick={() => setViewMode('web')}
                className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    viewMode === 'web'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <Globe size={16} className="mr-2" />
                {texts.common.webMode}
            </button>
            <div className="pl-1 pr-2">
                <Tooltip content={viewMode === 'desktop' 
                    ? (lang === 'zh' ? '当前使用本地桌面环境 API' : 'Using local desktop environment APIs')
                    : (lang === 'zh' ? '当前使用 Web 模拟模式，模拟数据返回' : 'Using web mode with mock data')}>
                    <Info size={14} className="text-slate-400 hover:text-blue-500 transition-colors cursor-help" />
                </Tooltip>
            </div>
        </div>
    );
};
