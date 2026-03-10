import React, { useState, useCallback } from 'react';
import { Container, X, Loader2, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { httpFetch } from '../../../../utils/http';
import { DolphinSchedulerConfig } from './types';

interface K8sNodeDialogProps {
    editingK8sNodeId: string | null;
    processName: string;
    projectConfig: DolphinSchedulerConfig;
    k8sNodeConfigPath: string;
    setK8sNodeConfigPath: (path: string) => void;
    k8sNodeDatasource: number;
    setK8sNodeDatasource: (id: number) => void;
    k8sNodeImage: string;
    setK8sNodeImage: (image: string) => void;
    k8sNodeNamespace: string;
    setK8sNodeNamespace: (ns: string) => void;
    k8sNodeEnvCode: number;
    setK8sNodeEnvCode: (code: number) => void;
    k8sNodeTimeoutFlag: boolean;
    setK8sNodeTimeoutFlag: (flag: boolean) => void;
    k8sNodeTimeout: number;
    setK8sNodeTimeout: (timeout: number) => void;
    k8sNodeTimeoutWarn: boolean;
    setK8sNodeTimeoutWarn: (flag: boolean) => void;
    k8sNodeTimeoutFail: boolean;
    setK8sNodeTimeoutFail: (flag: boolean) => void;
    k8sNodeRetryTimes: number;
    setK8sNodeRetryTimes: (times: number) => void;
    k8sNodeRetryInterval: number;
    setK8sNodeRetryInterval: (interval: number) => void;
    onConfirm: (nodeName?: string) => void;
    onCancel: () => void;
}

export const K8sNodeDialog: React.FC<K8sNodeDialogProps> = (props) => {
    const { t } = useTranslation();
    const {
        editingK8sNodeId, processName, projectConfig,
        k8sNodeConfigPath, setK8sNodeConfigPath,
        k8sNodeImage, setK8sNodeImage,
        k8sNodeNamespace, setK8sNodeNamespace,
        k8sNodeTimeoutWarn, setK8sNodeTimeoutWarn,
        k8sNodeTimeoutFail, setK8sNodeTimeoutFail,
        k8sNodeTimeout, setK8sNodeTimeout,
        k8sNodeRetryTimes, setK8sNodeRetryTimes,
        k8sNodeRetryInterval, setK8sNodeRetryInterval,
        onConfirm, onCancel
    } = props;

    const [nodeName, setNodeName] = useState('');
    const [nameCopied, setNameCopied] = useState(false);

    // 从配置文件路径自动生成节点名（下划线转减号，符合 K8s 命名规则）
    const autoNodeNameFromPath = useCallback((path: string) => {
        const fileName = path.split('/').pop() || '';
        // 去掉后缀，下划线转减号，小写
        const name = fileName
            .replace(/\.[^.]+$/, '')
            .replace(/_/g, '-')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return name;
    }, []);

    const handleConfigPathChange = (path: string) => {
        setK8sNodeConfigPath(path);
        // 如果节点名未有自定义（即等于上次自动生成的），则自动更新
        const newAutoName = autoNodeNameFromPath(path);
        if (newAutoName) setNodeName(newAutoName);
    };

    const handleCopyProcessName = () => {
        navigator.clipboard.writeText(processName).then(() => {
            setNameCopied(true);
            setTimeout(() => setNameCopied(false), 2000);
        });
    };

    // 资源浏览
    const [showResourceBrowser, setShowResourceBrowser] = useState(false);
    const [resourceFiles, setResourceFiles] = useState<any[]>([]);
    const [resourceLoading, setResourceLoading] = useState(false);
    const [resourceHistory, setResourceHistory] = useState<{name: string; path: string}[]>([{name: '根目录', path: ''}]);
    const [searchVal, setSearchVal] = useState('');

    const browseResources = async (fullName: string = '') => {
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* 顶部标题 */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Container size={20} className="mr-2 text-purple-500" />
                        {editingK8sNodeId ? t('dolphinScheduler.editK8sNode') : t('dolphinScheduler.newK8sNode')}
                    </h3>
                    {/* 工作流名称（可点击复制） */}
                    {processName && (
                        <button
                            onClick={handleCopyProcessName}
                            title={`点击复制: ${processName}`}
                            className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group"
                        >
                            <span className="font-mono truncate max-w-[340px]">{processName}</span>
                            {nameCopied
                                ? <Check size={11} className="text-green-500 flex-shrink-0" />
                                : <Copy size={11} className="opacity-0 group-hover:opacity-60 flex-shrink-0" />}
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* 节点名称 */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.editor.nodeName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nodeName}
                            onChange={e => setNodeName(e.target.value)}
                            placeholder={t('dolphinScheduler.nodeNameAutoGenerated') || '如果不填则自动生成'}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                        />
                    </div>

                    {/* 配置文件路径 */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.configPath')} *
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={k8sNodeConfigPath}
                                onChange={e => handleConfigPathChange(e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none"
                            />
                            <button
                                onClick={() => { setShowResourceBrowser(true); browseResources(); }}
                                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >📂</button>
                        </div>
                        {showResourceBrowser && (
                            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 max-h-60 flex flex-col shadow-sm">
                                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {resourceHistory.length > 1 ? resourceHistory[resourceHistory.length - 1].name : '资源中心'}
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
                                            >返回上级</button>
                                        )}
                                    </div>
                                    <button onClick={() => { setShowResourceBrowser(false); setSearchVal(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                    <input
                                        type="text"
                                        placeholder="搜索文件..."
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
                                                            handleConfigPathChange(f.fullName.replace(/^.*\/resources\//, ''));
                                                            setShowResourceBrowser(false);
                                                            setSearchVal('');
                                                        }
                                                    }} className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center transition-colors text-slate-700 dark:text-slate-300">
                                                        <span className="mr-2 opacity-80">{f.directory ? '📁' : '📄'}</span>
                                                        <span className="truncate flex-1" title={f.alias || f.fileName}>{f.alias || f.fileName}</span>
                                                    </button>
                                                ))}
                                            {resourceFiles.filter(f => (f.alias || f.fileName || '').toLowerCase().includes(searchVal.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400">未能匹配到结果</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 镜像（文本输入） */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.image')}
                        </label>
                        <input
                            type="text"
                            value={k8sNodeImage}
                            onChange={e => setK8sNodeImage(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                        />
                    </div>

                    {/* 命名空间（文本输入） */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.namespace')}
                        </label>
                        <textarea
                            value={k8sNodeNamespace}
                            onChange={e => setK8sNodeNamespace(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none resize-none"
                        />
                    </div>

                    {/* 超时告警+超时时长（横排） */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.timeoutWarn')}
                            </label>
                            <div className="flex items-center space-x-3 mt-2">
                                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={k8sNodeTimeoutWarn}
                                        onChange={e => setK8sNodeTimeoutWarn(e.target.checked)}
                                        className="rounded text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span>{t('dolphinScheduler.warn')}</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={k8sNodeTimeoutFail}
                                        onChange={e => setK8sNodeTimeoutFail(e.target.checked)}
                                        className="rounded text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span>{t('dolphinScheduler.fail')}</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.timeoutDuration')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={k8sNodeTimeout}
                                onChange={e => setK8sNodeTimeout(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* 重试次数 + 重试间隔 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.retryTimes')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={k8sNodeRetryTimes}
                                onChange={e => setK8sNodeRetryTimes(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.retryInterval')}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={k8sNodeRetryInterval}
                                onChange={e => setK8sNodeRetryInterval(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => onConfirm(nodeName)}
                        disabled={!k8sNodeConfigPath.trim()}
                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {editingK8sNodeId ? t('common.save') : t('dolphinScheduler.addNode')}
                    </button>
                </div>
            </div>
        </div>
    );
};
