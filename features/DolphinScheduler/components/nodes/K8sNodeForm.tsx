import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NodeFormProps } from './types';
import { DEFAULT_CONFIG_KEY, defaultSettingsTemplate } from '../GlobalSettingsModal';
import { httpFetch } from '../../../../utils/http';

export const K8sNodeForm: React.FC<NodeFormProps> = ({
    data,
    onChange,
    projectConfig,
    readOnly = false
}) => {
    const { t } = useTranslation();

    // 从 globalSettings 读取默认值
    const globalSettings = (() => {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            return {
                common: { ...defaultSettingsTemplate.common, ...(parsed.common || {}) },
                nodes: { k8s: { ...defaultSettingsTemplate.nodes?.k8s, ...(parsed.nodes?.k8s || {}) } }
            };
        } catch {
            return defaultSettingsTemplate;
        }
    })();

    const [configPath, setConfigPath] = useState<string>(
        data?.configPath || 'smart_cloud_pro/'
    );
    const [image, setImage] = useState<string>(
        data?.image || globalSettings.nodes.k8s?.image || ''
    );
    const [namespace, setNamespace] = useState<string>(
        data?.namespace || globalSettings.nodes.k8s?.namespace || ''
    );
    const [showResourceBrowser, setShowResourceBrowser] = useState(false);
    const [resourceFiles, setResourceFiles] = useState<any[]>([]);
    const [resourceLoading, setResourceLoading] = useState(false);
    const [resourceHistory, setResourceHistory] = useState<{ name: string; path: string }[]>([{ name: t('dolphinScheduler.editor.resourceCenter'), path: '' }]);
    const [searchVal, setSearchVal] = useState('');

    const emitChange = (cp: string, img: string, ns: string) => {
        const command = JSON.stringify([
            './bin/seatunnel.sh', '--config', cp,
            '--download_url', 'http://10.0.1.10:82', '-m', 'local'
        ]);
        onChange({
            ...data,
            configPath: cp,
            image: img,
            namespace: ns,
            command,
            imagePullPolicy: 'IfNotPresent',
            customizedLabels: [],
            nodeSelectors: [],
            datasource: data?.datasource ?? 1,
            kubeConfig: '',
            localParams: [],
            resourceList: [],
            type: 'K8S',
        });
    };

    const browseResources = async (fullName: string = '') => {
        if (!projectConfig?.baseUrl || !projectConfig?.token) return;
        setResourceLoading(true);
        try {
            const url = `${projectConfig.baseUrl}/resources?fullName=${encodeURIComponent(fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
            const result = await resp.json();
            if (result.code === 0) setResourceFiles(result.data?.totalList || result.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setResourceLoading(false);
        }
    };

    const handleConfigPathChange = (val: string) => {
        setConfigPath(val);
        emitChange(val, image, namespace);
    };
    const handleImageChange = (val: string) => {
        setImage(val);
        emitChange(configPath, val, namespace);
    };
    const handleNamespaceChange = (val: string) => {
        setNamespace(val);
        emitChange(configPath, image, val);
    };

    return (
        <div className="space-y-4">
            {/* 配置路径 */}
            <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    {t('dolphinScheduler.configPath')} *
                </label>
                <div className="flex space-x-2">
                    <input
                        disabled={readOnly}
                        type="text"
                        value={configPath}
                        onChange={e => handleConfigPathChange(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none"
                    />
                    {!readOnly && (
                        <button
                            onClick={() => { setShowResourceBrowser(true); browseResources(); }}
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >📂</button>
                    )}
                </div>

                {showResourceBrowser && (
                    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 max-h-60 flex flex-col shadow-sm">
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {t('dolphinScheduler.editor.resourceCenter')}
                                </span>
                                {resourceHistory.length > 1 && (
                                    <button
                                        onClick={() => {
                                            const newHistory = [...resourceHistory];
                                            newHistory.pop();
                                            setResourceHistory(newHistory);
                                            browseResources(newHistory[newHistory.length - 1].path);
                                        }}
                                        className="text-xs text-blue-500 hover:text-blue-600 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30"
                                    >
                                        {t('dolphinScheduler.editor.backToParent')}
                                    </button>
                                )}
                            </div>
                            <button onClick={() => { setShowResourceBrowser(false); setSearchVal(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                            <input
                                type="text"
                                placeholder={t('dolphinScheduler.editor.searchFiles')}
                                value={searchVal}
                                onChange={e => setSearchVal(e.target.value)}
                                className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-900 outline-none"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                            {resourceLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-500 w-5 h-5" /></div>
                            ) : (
                                <div className="space-y-0.5">
                                    {resourceFiles
                                        .filter(f => (f.alias || f.fileName || '').toLowerCase().includes(searchVal.toLowerCase()))
                                        .map((f: any, i: number) => (
                                            <button key={i} onClick={() => {
                                                if (f.directory) {
                                                    browseResources(f.fullName);
                                                    setResourceHistory([...resourceHistory, { name: f.alias, path: f.fullName }]);
                                                    setSearchVal('');
                                                } else {
                                                    const newPath = f.fullName.replace(/^.*\/resources\//, '');
                                                    handleConfigPathChange(newPath);
                                                    setShowResourceBrowser(false);
                                                    setSearchVal('');
                                                }
                                            }} className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center transition-colors text-slate-700 dark:text-slate-300">
                                                <span className="mr-2 opacity-80">{f.directory ? '📁' : '📄'}</span>
                                                <span className="truncate flex-1" title={f.alias || f.fileName}>{f.alias || f.fileName}</span>
                                            </button>
                                        ))}
                                    {resourceFiles.filter(f => (f.alias || f.fileName || '').toLowerCase().includes(searchVal.toLowerCase())).length === 0 && (
                                        <div className="p-4 text-center text-xs text-slate-400">{t('dolphinScheduler.editor.noMatchingResults')}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Image */}
            <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    {t('dolphinScheduler.image')}
                </label>
                <input
                    disabled={readOnly}
                    type="text"
                    value={image}
                    onChange={e => handleImageChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                />
            </div>

            {/* Namespace */}
            <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    {t('dolphinScheduler.namespace')}
                </label>
                <textarea
                    disabled={readOnly}
                    value={namespace}
                    onChange={e => handleNamespaceChange(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none"
                />
            </div>
        </div>
    );
};
