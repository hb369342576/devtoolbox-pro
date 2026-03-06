import React, { useState, useEffect } from 'react';
import { Settings, X, Server, Database, Container } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { Language } from '../../../types';

export const DEFAULT_CONFIG_KEY = 'dolphin_global_default_config';

export const defaultSettingsTemplate = {
    common: {
        timeout: 15,
        retryTimes: 0,
        retryInterval: 1
    },
    nodes: {
        k8s: {
            image: 'registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204',
            namespace: '{"name":"default","cluster":"k8s-Security-Cluster-admin"}',
        },
        sql: {
            sqlType: '1',         // 默认非查询
            datasourceId: 1,
        }
    }
};

interface GlobalSettingsModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (settings: any) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({show, onClose, onSave }) => {
  const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'common' | 'k8s' | 'sql'>('common');
    
    // 初始化内部状态
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            
            // 兼容之前直接保存在 k8s 下的字段结构过渡到 common
            const oldK8s = parsed.k8s || {};
            
            return {
                common: {
                    ...defaultSettingsTemplate.common,
                    ...(parsed.common || {}),
                    // 兼容旧格式的数据
                    ...(oldK8s.timeout !== undefined ? { timeout: oldK8s.timeout } : {}),
                    ...(oldK8s.retryTimes !== undefined ? { retryTimes: oldK8s.retryTimes } : {}),
                    ...(oldK8s.retryInterval !== undefined ? { retryInterval: oldK8s.retryInterval } : {})
                },
                nodes: {
                    k8s: {
                        ...defaultSettingsTemplate.nodes.k8s,
                        ...(parsed.nodes?.k8s || {})
                    },
                    sql: {
                        ...defaultSettingsTemplate.nodes.sql,
                        ...(parsed.nodes?.sql || {})
                    }
                }
            };
        } catch {
            return defaultSettingsTemplate;
        }
    });

    // 每次打开时重新读取（应对外部可能发生的更改）
    useEffect(() => {
        if (show) {
            try {
                const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setSettings(prev => ({
                        common: { ...prev.common, ...(parsed.common || {}) },
                        nodes: {
                            k8s: { ...prev.nodes.k8s, ...(parsed.nodes?.k8s || {}) },
                            sql: { ...prev.nodes.sql, ...(parsed.nodes?.sql || {}) }
                        }
                    }));
                }
            } catch (e) {
                console.error("Failed to parse settings:", e);
            }
        }
    }, [show]);

    if (!show) return null;

    const handleSave = () => {
        // 清理旧字典键 k8s（如果存在）以保证数据纯洁性，但直接覆盖即可
        localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(settings));
        toast({ title: t('dolphinScheduler.globalSettings.saveSuccess'), variant: 'success' });
        onSave(settings);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* 头部 */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Settings size={20} className="mr-2 text-blue-500" />
                        {t('dolphinScheduler.globalSettings.title')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex flex-1 min-h-[400px]">
                    {/* 左侧导航树 */}
                    <div className="w-48 bg-slate-50 dark:bg-slate-900/30 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2">
                        <button 
                            onClick={() => setActiveTab('common')}
                            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'common' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <Server size={16} className="mr-2" />
                            {t('dolphinScheduler.globalSettings.tabs.common')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('k8s')}
                            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'k8s' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <Container size={16} className="mr-2" />
                            {t('dolphinScheduler.globalSettings.tabs.k8s')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('sql')}
                            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sql' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            <Database size={16} className="mr-2" />
                            {t('dolphinScheduler.globalSettings.tabs.sql')}
                        </button>
                    </div>

                    {/* 右侧内容区 */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'common' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <h4 className="font-medium text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                                    {t('dolphinScheduler.globalSettings.sections.faultTolerance')}
                                </h4>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                        {t('dolphinScheduler.globalSettings.labels.defaultTimeout')}
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={settings.common.timeout}
                                        onChange={(e) => setSettings({...settings, common: {...settings.common, timeout: Number(e.target.value)}})}
                                        className="w-full max-w-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">{t('dolphinScheduler.globalSettings.hints.timeout')}</p>
                                </div>
                                <div className="flex space-x-6 pt-2">
                                    <div className="flex-1 max-w-[150px]">
                                        <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                            {t('dolphinScheduler.globalSettings.labels.defaultRetryTimes')}
                                        </label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={settings.common.retryTimes}
                                            onChange={(e) => setSettings({...settings, common: {...settings.common, retryTimes: Number(e.target.value)}})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1 max-w-[150px]">
                                        <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                            {t('dolphinScheduler.globalSettings.labels.defaultRetryInterval')}
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={settings.common.retryInterval}
                                            onChange={(e) => setSettings({...settings, common: {...settings.common, retryInterval: Number(e.target.value)}})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'k8s' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <h4 className="font-medium text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                                    {t('dolphinScheduler.globalSettings.sections.k8sDefaults')}
                                </h4>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                        {t('dolphinScheduler.globalSettings.labels.defaultImage')}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={settings.nodes.k8s.image}
                                        onChange={(e) => setSettings({...settings, nodes: {...settings.nodes, k8s: {...settings.nodes.k8s, image: e.target.value}}})}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                        {t('dolphinScheduler.globalSettings.labels.defaultNamespace')}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={settings.nodes.k8s.namespace}
                                        onChange={(e) => setSettings({...settings, nodes: {...settings.nodes, k8s: {...settings.nodes.k8s, namespace: e.target.value}}})}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm font-mono"
                                        placeholder='{"name":"default","cluster":"..."}'
                                    />
                                    <p className="text-xs text-slate-500 mt-1">{t('dolphinScheduler.globalSettings.hints.namespace')}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sql' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <h4 className="font-medium text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                                    {t('dolphinScheduler.globalSettings.sections.sqlDefaults')}
                                </h4>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                                        {t('dolphinScheduler.globalSettings.labels.defaultSqlType')}
                                    </label>
                                    <select
                                        value={settings.nodes.sql.sqlType}
                                        onChange={(e) => setSettings({...settings, nodes: {...settings.nodes, sql: {...settings.nodes.sql, sqlType: e.target.value}}})}
                                        className="w-full max-w-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 text-sm"
                                    >
                                        <option value="0">{t('dolphinScheduler.globalSettings.options.query')}</option>
                                        <option value="1">{t('dolphinScheduler.globalSettings.options.nonQuery')}</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
