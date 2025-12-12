import React from 'react';
import { Moon, Sun, Monitor, Globe, Check } from 'lucide-react';
import { Language, Theme } from '../../types';

interface SettingsProps {
    lang: Language;
    onLangChange: (lang: Language) => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

/**
 * Settings 系统设置页面
 * 简单工具，无需拆分组件
 */
export const Settings: React.FC<SettingsProps> = ({ lang, onLangChange, theme, onThemeChange }) => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {lang === 'zh' ? '系统设置' : 'Settings'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {lang === 'zh' ? '管理应用的外观和语言偏好' : 'Manage application appearance and language preferences'}
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
                            {lang === 'zh' ? '外观主题' : 'Appearance'}
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
                                {lang === 'zh' ? '浅色模式' : 'Light Mode'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {lang === 'zh' ? '适合明亮环境，清晰易读' : 'Best for bright environments'}
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
                                {lang === 'zh' ? '深色模式' : 'Dark Mode'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {lang === 'zh' ? '保护视力，适合夜间使用' : 'Easy on the eyes, best for night'}
                            </p>
                        </button>
                    </div>
                </div>

                {/* Language Section */}
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Globe size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {lang === 'zh' ? '语言设置' : 'Language'}
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
                                    <p className="font-bold text-slate-800 dark:text-white">简体中文</p>
                                    <p className="text-xs text-slate-500">Chinese (Simplified)</p>
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
                                    <p className="font-bold text-slate-800 dark:text-white">English</p>
                                    <p className="text-xs text-slate-500">United States</p>
                                </div>
                            </div>
                            {lang === 'en' && <Check className="text-blue-500" size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 mt-8">
                <p>DevToolbox Pro v1.0.0</p>
                <p>&copy; 2024 DevToolbox Team. All rights reserved.</p>
            </div>
        </div>
    );
};
