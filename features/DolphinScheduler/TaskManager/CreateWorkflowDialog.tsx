import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DolphinSchedulerConfig } from './types';
import { DEFAULT_CONFIG_KEY, defaultSettingsTemplate } from '../components/GlobalSettingsModal';
import { useToast } from '../../common/Toast';
import { getNodeType, TaskNode } from '../components/TaskEditor/types';
import { SqlNodeForm, JavaNodeForm, PythonNodeForm, ShellNodeForm, SeaTunnelNodeForm, DependentNodeForm, K8sNodeForm } from '../components/nodes';
import { createWorkflowWithNode } from '../utils/workflowGeneral';
import { httpFetch } from '../../../utils/http';

interface CreateWorkflowDialogProps {
    currentProject: DolphinSchedulerConfig;
    nodeType: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({ currentProject, nodeType, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    
    // Base form states
    const [name, setName] = useState('');
    const [envCode, setEnvCode] = useState<number | undefined>();
    const [timeoutWarn, setTimeoutWarn] = useState(false);
    const [timeoutFail, setTimeoutFail] = useState(true);
    const [timeout, setTimeout] = useState(0);
    const [retryTimes, setRetryTimes] = useState(0);
    const [retryInterval, setRetryInterval] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Advanced data fields
    const [environments, setEnvironments] = useState<{ code: number; name: string }[]>([]);
    const [datasources, setDatasources] = useState<{ id: number; name: string; type: string }[]>([]);
    
    // Node-specific stats mapped to TaskNode['taskParams']
    const sqlGlobalDefaults = (() => {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            return { ...defaultSettingsTemplate.nodes.sql, ...(parsed.nodes?.sql || {}) };
        } catch { return defaultSettingsTemplate.nodes.sql; }
    })();

    const [taskParams, setTaskParams] = useState<TaskNode['taskParams']>(
        nodeType.toLowerCase() === 'sql'
            ? { dbType: sqlGlobalDefaults.dbType || 'MYSQL', sqlType: sqlGlobalDefaults.sqlType || '1' }
            : {}
    );

    const nodeInfo = getNodeType(nodeType);

    useEffect(() => {
        // Load global settings
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            const common = { ...defaultSettingsTemplate.common, ...(parsed.common || {}) };
            setTimeout(common.timeout || 0);
            setRetryTimes(common.retryTimes || 0);
            setRetryInterval(common.retryInterval || 1);
        } catch {}

        // Load environments & datasources
        const fetchAuxData = async () => {
            try {
                // 环境列表 - 使用正确的API路径
                const envResp = await httpFetch(`${currentProject.baseUrl}/environment/query-environment-list`, { headers: { 'token': currentProject.token } });
                const envData = await envResp.json();
                if (envData.code === 0 && envData.data) {
                    const envList = envData.data.map((e: any) => ({ code: e.code, name: e.name }));
                    setEnvironments(envList);
                    // 自动选第一个有效环境
                    if (envList.length > 0 && !envCode) {
                        setEnvCode(envList[0].code);
                    }
                }
                
                // 数据源列表
                const dsResp = await httpFetch(`${currentProject.baseUrl}/datasources?pageNo=1&pageSize=200`, { headers: { 'token': currentProject.token } });
                const dsData = await dsResp.json();
                if (dsData.code === 0) setDatasources(dsData.data?.totalList || []);
            } catch (err) {
                console.error('Failed to load aux data for dialog', err);
            }
        };
        fetchAuxData();
    }, [currentProject]);

    // Handle Workflow Creation
    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const timeoutNotifyStrategy = timeoutWarn && timeoutFail ? 'WARNFAILED' : timeoutWarn ? 'WARNING' : timeoutFail ? 'FAILED' : 'WARNFAILED';

            const result = await createWorkflowWithNode(
                name.trim(),
                nodeType.toUpperCase(),
                taskParams,
                envCode,
                timeoutWarn || timeoutFail,
                timeout,
                timeoutNotifyStrategy,
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
                        {t('dolphinScheduler.newWorkflow')} - {t(`dolphinScheduler.nodeTypeMap.${nodeType.toLowerCase()}`, { defaultValue: nodeInfo?.name })}
                    </h3>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* General Section */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.workflowName')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. sync_data_job" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                            {t('dolphinScheduler.editor.environment')}
                        </label>
                        <select
                            value={envCode || ''}
                            onChange={(e) => setEnvCode(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('dolphinScheduler.editor.none', { defaultValue: '无' })}</option>
                            {environments.map(env => (
                                <option key={env.code} value={env.code}>{env.name}</option>
                            ))}
                        </select>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700 my-4" />

                    {/* Node Specific UI Injection */}
                    {nodeType.toLowerCase() === 'sql' && (
                        <SqlNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            datasources={datasources}
                        />
                    )}

                    {nodeType.toLowerCase() === 'java' && (
                        <JavaNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            projectConfig={currentProject}
                        />
                    )}

                    {nodeType.toLowerCase() === 'shell' && (
                        <ShellNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            projectConfig={currentProject}
                        />
                    )}

                    {nodeType.toLowerCase() === 'python' && (
                        <PythonNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            projectConfig={currentProject}
                        />
                    )}

                    {nodeType.toLowerCase() === 'seatunnel' && (
                        <SeaTunnelNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                        />
                    )}

                    {nodeType.toLowerCase() === 'dependent' && (
                        <DependentNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            projectConfig={currentProject}
                        />
                    )}

                    {nodeType.toLowerCase() === 'k8s' && (
                        <K8sNodeForm
                            data={taskParams}
                            onChange={(data) => setTaskParams(data)}
                            projectConfig={currentProject}
                        />
                    )}

                    <hr className="border-slate-200 dark:border-slate-700 my-4" />

                    {/* Timeout & Retry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.timeoutDuration')} (minutes)
                            </label>
                            <input type="number" min="0" value={timeout} onChange={e => setTimeout(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
                                {t('dolphinScheduler.retryTimes')}
                            </label>
                            <input type="number" min="0" value={retryTimes} onChange={e => setRetryTimes(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                {t('dolphinScheduler.retryInterval')} (minutes)
                            </label>
                            <input type="number" min="1" value={retryInterval} onChange={e => setRetryInterval(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleCreate} disabled={loading || !name.trim()} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
                        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
