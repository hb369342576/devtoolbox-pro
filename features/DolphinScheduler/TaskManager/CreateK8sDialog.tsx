import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { httpFetch } from '../../../utils/http';
import { DolphinSchedulerConfig } from './types';
import { DEFAULT_CONFIG_KEY, defaultSettingsTemplate } from '../components/GlobalSettingsModal';
import { createK8sWorkflow } from '../utils/workflowK8s';
import { useToast } from '../../common/Toast';

interface CreateK8sDialogProps {
    currentProject: DolphinSchedulerConfig;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateK8sDialog: React.FC<CreateK8sDialogProps> = ({ currentProject, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [globalSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            return {
                common: { ...defaultSettingsTemplate.common, ...(parsed.common || {}) },
                nodes: {
                    k8s: { ...defaultSettingsTemplate.nodes?.k8s, ...(parsed.nodes?.k8s || {}) }
                }
            };
        } catch {
            return defaultSettingsTemplate;
        }
    });

    const [name, setName] = useState('');
    const [configPath, setConfigPath] = useState('smart_cloud_pro/');
    const [datasource, setDatasource] = useState(1);
    const [image, setImage] = useState(globalSettings.nodes.k8s.image);
    const [namespace, setNamespace] = useState(globalSettings.nodes.k8s.namespace);
    const [envCode, setEnvCode] = useState(164447603311488);
    const [timeoutFlag, setTimeoutFlag] = useState(true);
    const [timeout, setTimeout] = useState(globalSettings.common.timeout);
    const [timeoutWarn, setTimeoutWarn] = useState(false);
    const [timeoutFail, setTimeoutFail] = useState(true);
    const [retryTimes, setRetryTimes] = useState(globalSettings.common.retryTimes);
    const [retryInterval, setRetryInterval] = useState(globalSettings.common.retryInterval);
    const [loading, setLoading] = useState(false);

    // 资源中心文件浏览相关逻辑 (简化版，TaskManager.tsx 原逻辑较长，此处封装基本交互)
    const [showResourceBrowser, setShowResourceBrowser] = useState(false);
    const [resourceFiles, setResourceFiles] = useState<any[]>([]);
    const [resourceLoading, setResourceLoading] = useState(false);
    const [resourceHistory, setResourceHistory] = useState<{name: string; path: string}[]>([{name: '根目录', path: ''}]);
    const [searchVal, setSearchVal] = useState('');

    const browseResources = async (fullName: string = '') => {
        setResourceLoading(true);
        try {
            const url = `${currentProject.baseUrl}/resources?fullName=${encodeURIComponent(fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            const result = await resp.json();
            if (result.code === 0) setResourceFiles(result.data?.totalList || result.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setResourceLoading(false);
        }
    };

    const { toast } = useToast();

    const handleCreate = async () => {
        if (!name.trim() || !configPath.trim()) return;
        setLoading(true);
        try {
            const result = await createK8sWorkflow(
                name.trim(),
                configPath.trim(),
                datasource,
                image,
                namespace,
                envCode,
                timeoutFlag,
                timeout,
                timeoutWarn && timeoutFail ? 'WARNFAILED' : timeoutWarn ? 'WARNING' : timeoutFail ? 'FAILED' : 'WARNFAILED',
                retryTimes,
                retryInterval,
                currentProject.projectCode!,
                currentProject.baseUrl,
                currentProject.token,
                currentProject.apiVersion
            );
            if (result.success) {
                toast({ title: t('common.saveSuccess', { defaultValue: '保存成功' }), variant: 'success' });
                onSuccess();
                onClose();
            } else {
                toast({ title: t('common.saveFailed', { defaultValue: '保存失败' }), description: result.msg, variant: 'destructive' });
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Plus size={20} className="mr-2 text-emerald-500" />
                        {t('dolphinScheduler.newK8sWorkflow')}
                    </h3>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.workflowName')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="syn_ods_t_table_name_d" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                    </div>
                    {/* 路径及浏览 */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t('dolphinScheduler.configPath')} *</label>
                        <div className="flex space-x-2">
                            <input type="text" value={configPath} onChange={e => setConfigPath(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono" />
                            <button onClick={() => { setShowResourceBrowser(true); browseResources(); }} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm">📂</button>
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
                                            >
                                                返回上级
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={()=>{setShowResourceBrowser(false); setSearchVal('');}} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14}/></button>
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
                                            {resourceFiles.filter(f => (f.alias || f.fileName || '').toLowerCase().includes(searchVal.toLowerCase())).map((f:any, i:number)=>(
                                                <button key={i} onClick={()=>{
                                                    if(f.directory){ 
                                                        browseResources(f.fullName); 
                                                        setResourceHistory([...resourceHistory, {name: f.alias, path: f.fullName}]);
                                                        setSearchVal(''); 
                                                    } else { 
                                                        setConfigPath(f.fullName.replace(/^.*\/resources\//, '')); 
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.image')}
                            </label>
                            <input type="text" value={image} onChange={e => setImage(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.namespace')}
                            </label>
                            <textarea value={namespace} onChange={e => setNamespace(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none" />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.timeoutWarn')}
                            </label>
                            <div className="flex items-center space-x-3 mt-2">
                                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                    <input type="checkbox" checked={timeoutWarn} onChange={e => setTimeoutWarn(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500" />
                                    <span>{t('dolphinScheduler.warn')}</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                    <input type="checkbox" checked={timeoutFail} onChange={e => setTimeoutFail(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500" />
                                    <span>{t('dolphinScheduler.fail')}</span>
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.timeoutDuration')}
                            </label>
                            <div className="flex items-center space-x-2">
                                <input type="number" min="0" value={timeout} onChange={e => setTimeout(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.retryTimes')}
                            </label>
                            <input type="number" min="0" value={retryTimes} onChange={e => setRetryTimes(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.retryInterval')}
                            </label>
                            <input type="number" min="1" value={retryInterval} onChange={e => setRetryInterval(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleCreate} disabled={loading || !name.trim()} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all">
                        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
