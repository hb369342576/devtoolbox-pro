import React, { useState } from 'react';
import { Moon, Sun, Monitor, Globe, Check, Activity, Download, RefreshCw, Info } from 'lucide-react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Language, Theme } from '../../types';
import { useTranslation } from "react-i18next";
import { NAV_ITEMS } from '../../constants';

interface SettingsProps {
    lang: Language;
    onLangChange: (lang: Language) => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    monitorEnabled: boolean;
    onMonitorToggle: (enabled: boolean) => void;
    menuConfig: Record<string, boolean>;
    onToggleMenuConfig: (id: string, enabled: boolean) => void;
}

/**
 * Settings 系统设置页面
 * 简单工具，无需拆分组件
 */
export const Settings: React.FC<SettingsProps> = ({ 
    lang, onLangChange, theme, onThemeChange, 
    monitorEnabled, onMonitorToggle,
    menuConfig, onToggleMenuConfig
}) => {
    const { t, i18n } = useTranslation();
    const [checking, setChecking] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [checkResult, setCheckResult] = useState<'none' | 'latest' | 'error' | null>(null);


    const handleCheckUpdate = async () => {
        setChecking(true);
        setCheckResult(null);
        try {
            const update = await check();
            if (update?.available) {
                setUpdateInfo(update);
            } else {
                setCheckResult('latest');
            }
        } catch (error) {
            console.error('Update check failed:', error);
            setCheckResult('error');
        } finally {
            setChecking(false);
        }
    };

    const handleDownloadAndInstall = async () => {
        if (!updateInfo) return;
        
        setDownloading(true);
        try {
            await updateInfo.downloadAndInstall((event) => {
                if (event.event === 'Progress') {
                    const percent = Math.round((event.data.chunkLength / (updateInfo.downloadSize || 1)) * 100);
                    setProgress(prev => Math.min(prev + percent, 100));
                }
            });
            await relaunch();
        } catch (error) {
            console.error('Update failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {t('settings.settings')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {t('settings.manageApplicationAppearan')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Appearance Section */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Monitor size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t('settings.appearance')}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => onThemeChange('light')}
                            className={`
                relative p-4 rounded-xl border-2 text-left transition-all group
                ${theme === 'light'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500'}
              `}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-white rounded-full shadow-sm text-amber-500 border border-slate-100">
                                    <Sun size={20} />
                                </div>
                                {theme === 'light' && <Check className="text-blue-500" size={20} />}
                            </div>
                            <p className="font-bold text-slate-800 dark:text-white">
                                {t('settings.lightMode')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {t('settings.bestForBrightEnvironments')}
                            </p>
                        </button>

                        <button
                            onClick={() => onThemeChange('dark')}
                            className={`
                relative p-4 rounded-xl border-2 text-left transition-all group
                ${theme === 'dark'
                                    ? 'border-blue-500 bg-slate-800'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500'}
              `}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-slate-900 rounded-full shadow-sm text-indigo-400 border border-slate-700">
                                    <Moon size={20} />
                                </div>
                                {theme === 'dark' && <Check className="text-blue-500" size={20} />}
                            </div>
                            <p className="font-bold text-slate-800 dark:text-white">
                                {t('settings.darkMode')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {t('settings.easyOnTheEyesBestForNight')}
                            </p>
                        </button>
                    </div>
                </div>

                {/* Language Section */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Globe size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t('settings.language')}
                        </h3>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => onLangChange('zh')}
                            className={`
                w-full flex items-center justify-between p-4 rounded-xl border transition-all
                ${lang === 'zh'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
              `}
                        >
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">🇨🇳</span>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-white">{t('settings.chineseSimplified') || '简体中文'}</p>
                                    <p className="text-xs text-slate-500">{t('settings.chineseSimplifiedSub') || 'Chinese (Simplified)'}</p>
                                </div>
                            </div>
                            {lang === 'zh' && <Check className="text-blue-500" size={20} />}
                        </button>

                        <button
                            onClick={() => onLangChange('en')}
                            className={`
                w-full flex items-center justify-between p-4 rounded-xl border transition-all
                ${lang === 'en'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
              `}
                        >
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">🇺🇸</span>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-white">{t('settings.english') || 'English'}</p>
                                    <p className="text-xs text-slate-500">{t('settings.englishSub') || 'United States'}</p>
                                </div>
                            </div>
                            {lang === 'en' && <Check className="text-blue-500" size={20} />}
                        </button>
                    </div>
                </div>

                {/* System Monitor Section */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t('settings.systemMonitor')}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">
                                {t('settings.enableSystemMonitor')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {t('settings.showCPUMemoryUsageDisable')}
                            </p>
                        </div>
                        <button
                            onClick={() => onMonitorToggle(!monitorEnabled)}
                            className={`relative w-14 h-7 rounded-full transition-colors ${monitorEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${monitorEnabled ? 'left-8' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Menu Management Section */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Monitor size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">菜单管理</h3>
                                <p className="text-xs text-slate-500 mt-0.5">控制侧边栏可见的功能模块，调整后将刷新页面生效</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                // Save is already done on toggle, just reload
                                window.location.reload();
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <RefreshCw size={14} />
                            <span>保存并刷新</span>
                        </button>
                    </div>

                    <div className="space-y-2">
                        {NAV_ITEMS.filter(item => item.id !== 'dashboard').map(item => {
                            const isParent = !!(item.children && item.children.length > 0);
                            const isMandatory = item.id === 'settings';
                            const parentEnabled = isMandatory || !!menuConfig[item.id];
                            const hasChildren = isParent;

                            // For items directly under system-management that contain 'settings'
                            const containsMandatoryChild = item.children?.some(c => c.id === 'settings');

                            return (
                                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {/* Parent row */}
                                    <div className={`flex items-center justify-between p-4 ${parentEnabled ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-1.5 rounded-lg ${parentEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                <item.icon size={16} />
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${parentEnabled ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {t(item.label)}
                                                </p>
                                                {hasChildren && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{item.children!.length} 个子菜单</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            disabled={!!containsMandatoryChild}
                                            onClick={() => {
                                                if (containsMandatoryChild) return;
                                                onToggleMenuConfig(item.id, !menuConfig[item.id]);
                                            }}
                                            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${containsMandatoryChild ? 'opacity-50 cursor-not-allowed bg-blue-500' : parentEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${(parentEnabled || containsMandatoryChild) ? 'left-6' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Children rows */}
                                    {hasChildren && item.children!.map((child, idx) => {
                                        const isMandatoryChild = child.id === 'settings';
                                        const childEnabled = isMandatoryChild || !!menuConfig[child.id];
                                        const parentIsEnabled = containsMandatoryChild || !!menuConfig[item.id];

                                        return (
                                            <div
                                                key={child.id}
                                                className={`flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 pl-12 transition-opacity ${!parentIsEnabled ? 'opacity-40' : ''} ${childEnabled && parentIsEnabled ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}
                                            >
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                                                    <div className={`p-1 rounded ${childEnabled && parentIsEnabled ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>
                                                        <child.icon size={14} />
                                                    </div>
                                                    <span className={`text-sm ${childEnabled && parentIsEnabled ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {t(child.label)}
                                                    </span>
                                                    {isMandatoryChild && (
                                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">必选</span>
                                                    )}
                                                </div>
                                                <button
                                                    disabled={!parentIsEnabled || isMandatoryChild}
                                                    onClick={() => {
                                                        if (!parentIsEnabled || isMandatoryChild) return;
                                                        onToggleMenuConfig(child.id, !menuConfig[child.id]);
                                                    }}
                                                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${(!parentIsEnabled || isMandatoryChild) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${(childEnabled && parentIsEnabled) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${(childEnabled && parentIsEnabled) ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* About & Update Section */}
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Info size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t('settings.aboutUpdate')}
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* 版本信息 */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white">DevToolbox Pro</p>
                                    <p className="text-xs text-slate-500 mt-1">v1.1.0</p>
                                </div>
                                <button
                                    onClick={handleCheckUpdate}
                                    disabled={checking || downloading}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {checking ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    <span>{t('settings.checkUpdates')}</span>
                                </button>
                            </div>
                        </div>

                        {/* 检查结果 */}
                        {checkResult === 'latest' && (
                            <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center space-x-2">
                                <Check size={16} />
                                <span>{t('settings.youAreOnTheLatestVersion')}</span>
                            </div>
                        )}

                        {checkResult === 'error' && (
                            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                {t('settings.failedToCheckForUpdatesPl')}
                            </div>
                        )}

                        {/* 发现新版本 */}
                        {updateInfo && (
                            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-medium text-blue-700 dark:text-blue-300">
                                            {t('settings.newVersionAvailable')}
                                        </p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">v{updateInfo.version}</p>
                                    </div>
                                    <button
                                        onClick={handleDownloadAndInstall}
                                        disabled={downloading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        {downloading ? (
                                            <RefreshCw size={16} className="animate-spin" />
                                        ) : (
                                            <Download size={16} />
                                        )}
                                        <span>{t('settings.updateNow')}</span>
                                    </button>
                                </div>
                                {downloading && (
                                    <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 mt-8">
                <p>DevToolbox Pro v1.1.0</p>
                <p>&copy; 2024 DevToolbox Team. All rights reserved.</p>
            </div>
        </div>
    );
};
