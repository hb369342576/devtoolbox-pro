import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { httpFetch } from '../../../utils/http';
import { getExecutorStartPath, getWorkflowCodeParamName } from '../utils';
import { Trash2 } from 'lucide-react';

interface RunWorkflowModalProps {
    show: boolean;
    process: any;
    currentProject: any;
    runType?: 'WORKFLOW' | 'NODE'; // 添加运行模式类型
    onClose: () => void;
    onSuccess: () => void;
}

export const RunWorkflowModal: React.FC<RunWorkflowModalProps> = ({ 
    show, 
    process, 
    currentProject, 
    runType = 'WORKFLOW', // 默认为运行工作流
    onClose, 
    onSuccess 
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    
    const [runConfig, setRunConfig] = useState({
        failureStrategy: 'CONTINUE', 
        taskDependType: 'TASK_POST',
        warningType: 'NONE', 
        processInstancePriority: 'MEDIUM',
        workerGroup: 'default', 
        tenantCode: 'default', 
        environmentCode: '',
        dryRun: 0,
        complementData: 0
    });
    
    const [startParamsList, setStartParamsList] = useState<{prop: string; value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    const [workerGroups, setWorkerGroups] = useState<string[]>(['default']);
    const [environments, setEnvironments] = useState<{ code: string; name: string }[]>([]);
    const [tenants, setTenants] = useState<{ id: number; tenantCode: string }[]>([]);

    useEffect(() => {
        if (!show || !currentProject) return;
        
        const loadWorkerGroups = async () => {
            try {
                const url = `${currentProject.baseUrl}/projects/${currentProject.projectCode}/worker-group`;
                const response = await httpFetch(url, { headers: { 'token': currentProject.token } });
                const result = await response.json();
                if (result.data) {
                    const groups = result.data.map((g: any) => g.workerGroup);
                    setWorkerGroups(groups.length > 0 ? groups : ['default']);
                }
            } catch (error) {
                console.error('Failed to load worker groups:', error);
            }
        };

        const loadEnvironments = async () => {
            try {
                const url = `${currentProject.baseUrl}/environment/query-environment-list`;
                const response = await httpFetch(url, { headers: { 'token': currentProject.token } });
                const result = await response.json();
                if (result.code === 0 && result.data) {
                    setEnvironments(result.data.map((e: any) => ({
                        code: e.code, name: e.name
                    })));
                }
            } catch (error) {
                console.error('Failed to load environments:', error);
            }
        };

        const loadTenants = async () => {
            try {
                const url = `${currentProject.baseUrl}/tenants?pageNo=1&pageSize=100`;
                const response = await httpFetch(url, { headers: { 'token': currentProject.token } });
                const result = await response.json();
                if (result.code === 0 && result.data?.totalList) {
                    setTenants(result.data.totalList.map((t: any) => ({
                        id: t.id, tenantCode: t.tenantCode
                    })));
                }
            } catch (error) {
                console.error('Failed to load tenants:', error);
            }
        };

        loadWorkerGroups();
        loadEnvironments();
        loadTenants();
    }, [show, currentProject]);

    if (!show || !process) return null;

    const handleConfirmRun = async () => {
        setLoading(true);
        try {
            const code = currentProject?.projectCode;
            const url = `${currentProject?.baseUrl}/projects/${code}/executors/${getExecutorStartPath(currentProject?.apiVersion)}`;
            const params = new URLSearchParams();
            
            // 过滤并组装启动参数
            const validParams = startParamsList.filter(p => p.prop.trim());
            let startParamsStr = '';
            if (validParams.length > 0) {
                const paramsObj: Record<string, string> = {};
                validParams.forEach(p => { paramsObj[p.prop] = p.value; });
                startParamsStr = JSON.stringify(paramsObj);
            }

            params.append(getWorkflowCodeParamName(currentProject?.apiVersion), String(process.code));
            params.append('scheduleTime', '');
            params.append('startNodeList', '');
            params.append('startParams', startParamsStr);
            params.append('failureStrategy', runConfig.failureStrategy);
            params.append('warningType', runConfig.warningType);
            params.append('warningGroupId', '0');
            params.append('taskDependType', runConfig.taskDependType);
            params.append('runMode', 'RUN_MODE_SERIAL');
            params.append('processInstancePriority', runConfig.processInstancePriority);
            params.append('workerGroup', runConfig.workerGroup);
            params.append('tenantCode', runConfig.tenantCode);
            if (runConfig.environmentCode) {
                params.append('environmentCode', runConfig.environmentCode);
            }
            params.append('dryRun', String(runConfig.dryRun));
            params.append('testFlag', '0');
            params.append('complementDependentMode', 'OFF_MODE');
            params.append('execType', runConfig.complementData === 1 ? 'COMPLEMENT_DATA' : '');
            
            const resp = await httpFetch(url, {
                method: 'POST',
                headers: { 
                    'token': currentProject?.token || '', 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: params.toString()
            });
            const text = await resp.text();
            
            if (!text.startsWith('{')) { 
                toast({ title: 'API路径错误', description: text.substring(0, 100), variant: 'destructive' }); 
            } else {
                const result = JSON.parse(text);
                if (result.code === 0) {
                    toast({ title: '已提交运行', variant: 'success' });
                    onSuccess();
                    onClose();
                } else {
                    toast({ title: '运行失败', description: result.msg, variant: 'destructive' });
                }
            }
        } catch (err: any) {
            toast({ title: '运行失败', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-base text-slate-800 dark:text-slate-200">
                        启动前请先设置参数
                    </h3>
                </div>
                
                {/* Form Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
                    
                    {/* 工作流名称 */}
                    <div>
                        <label className="text-slate-700 block mb-1">工作流名称</label>
                        <div className="text-slate-500">{process.name}</div>
                    </div>

                    {/* 失败策略 */}
                    <div>
                        <label className="text-slate-700 block mb-2">失败策略</label>
                        <div className="flex space-x-6">
                            <label className="flex items-center text-slate-600 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={runConfig.failureStrategy === 'CONTINUE'} 
                                    onChange={() => setRunConfig({...runConfig, failureStrategy: 'CONTINUE'})} 
                                    className="mr-2 text-blue-500 focus:ring-blue-500" 
                                />
                                继续
                            </label>
                            <label className="flex items-center text-slate-600 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={runConfig.failureStrategy === 'END'} 
                                    onChange={() => setRunConfig({...runConfig, failureStrategy: 'END'})} 
                                    className="mr-2 text-blue-500 focus:ring-blue-500" 
                                />
                                结束
                            </label>
                        </div>
                    </div>

                    {/* 节点执行 - 仅在运行节点时出现 */}
                    {runType === 'NODE' && (
                        <div>
                            <label className="text-slate-700 dark:text-slate-300 block mb-2">节点执行</label>
                            <div className="flex space-x-6">
                                <label className="flex items-center text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={runConfig.taskDependType === 'TASK_POST'} 
                                        onChange={() => setRunConfig({...runConfig, taskDependType: 'TASK_POST'})} 
                                        className="mr-2 text-blue-500 focus:ring-blue-500" 
                                    />
                                    向后执行
                                </label>
                                <label className="flex items-center text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={runConfig.taskDependType === 'TASK_PRE'} 
                                        onChange={() => setRunConfig({...runConfig, taskDependType: 'TASK_PRE'})} 
                                        className="mr-2 text-blue-500 focus:ring-blue-500" 
                                    />
                                    向前执行
                                </label>
                                <label className="flex items-center text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={runConfig.taskDependType === 'TASK_ONLY'} 
                                        onChange={() => setRunConfig({...runConfig, taskDependType: 'TASK_ONLY'})} 
                                        className="mr-2 text-blue-500 focus:ring-blue-500" 
                                    />
                                    仅执行当前节点
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* 通知策略 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-1">通知策略</label>
                        <select 
                            value={runConfig.warningType} 
                            onChange={e => setRunConfig({...runConfig, warningType: e.target.value})} 
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="NONE">都不发</option>
                            <option value="SUCCESS">成功发</option>
                            <option value="FAILURE">失败发</option>
                            <option value="ALL">都发</option>
                        </select>
                    </div>
                    
                    {/* 流程优先级 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-1">流程优先级</label>
                        <select 
                            value={runConfig.processInstancePriority} 
                            onChange={e => setRunConfig({...runConfig, processInstancePriority: e.target.value})} 
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="HIGHEST">↑ HIGHEST</option>
                            <option value="HIGH">↑ HIGH</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="LOW">↓ LOW</option>
                            <option value="LOWEST">↓ LOWEST</option>
                        </select>
                    </div>
                    
                    {/* WORKER分组 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-1">Worker分组</label>
                        <select 
                            value={runConfig.workerGroup} 
                            onChange={e => setRunConfig({...runConfig, workerGroup: e.target.value})} 
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {workerGroups.map(wg => (
                                <option key={wg} value={wg}>{wg}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* 租户 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-1">租户</label>
                        <select 
                            value={runConfig.tenantCode} 
                            onChange={e => setRunConfig({...runConfig, tenantCode: e.target.value})} 
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="default">default</option>
                            {tenants.map(t => (
                                <option key={t.id} value={t.tenantCode}>{t.tenantCode}</option>
                            ))}
                        </select>
                    </div>

                    {/* 环境名称 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-1">环境名称</label>
                        <select 
                            value={runConfig.environmentCode} 
                            onChange={e => setRunConfig({...runConfig, environmentCode: e.target.value})} 
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">请选择</option>
                            {environments.map(env => (
                                <option key={env.code} value={env.code}>{env.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 补数 */}
                    <div>
                        <label className="text-slate-700 block mb-2">补数</label>
                        <label className="flex items-center text-slate-600 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={runConfig.complementData === 1}
                                onChange={(e) => setRunConfig({...runConfig, complementData: e.target.checked ? 1 : 0})}
                                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                            />
                            是否补数
                        </label>
                    </div>

                    {/* 启动参数 */}
                    <div>
                        <label className="text-slate-700 dark:text-slate-300 block mb-2">启动参数</label>
                        <div className="space-y-2">
                            {startParamsList.map((param, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input 
                                        type="text"
                                        className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none"
                                        value={param.prop}
                                        onChange={e => {
                                            const newList = [...startParamsList];
                                            newList[index].prop = e.target.value;
                                            setStartParamsList(newList);
                                        }}
                                        placeholder="键"
                                    />
                                    <select className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 w-20">
                                        <option>IN</option>
                                    </select>
                                    <select className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 w-28">
                                        <option>VARCHAR</option>
                                    </select>
                                    <input 
                                        type="text"
                                        className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 focus:border-blue-500 focus:outline-none"
                                        value={param.value}
                                        onChange={e => {
                                            const newList = [...startParamsList];
                                            newList[index].value = e.target.value;
                                            setStartParamsList(newList);
                                        }}
                                        placeholder="值"
                                    />
                                    <button 
                                        className="p-1.5 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-500 dark:hover:border-red-500 transition-colors"
                                        onClick={() => {
                                            const newList = [...startParamsList];
                                            newList.splice(index, 1);
                                            setStartParamsList(newList);
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-500 transition-colors text-sm flex items-center justify-center"
                                onClick={() => setStartParamsList([...startParamsList, { prop: '', value: '' }])}
                            >
                                + 添加参数
                            </button>
                        </div>
                    </div>
                    
                    {/* 是否空跑 (高亮卡片) */}
                    <div>
                        <label className="text-slate-700 block mb-2">是否空跑</label>
                        <div className="flex items-center">
                            <button 
                                onClick={() => setRunConfig({...runConfig, dryRun: runConfig.dryRun === 1 ? 0 : 1})} 
                                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer outline-none ${
                                    runConfig.dryRun === 1 ? 'bg-blue-500' : 'bg-slate-300'
                                }`}
                            >
                                <div 
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                                        runConfig.dryRun === 1 ? 'left-[22px]' : 'left-0.5'
                                    }`} 
                                />
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end space-x-3">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-1.5 text-slate-600 dark:text-slate-300 font-normal hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-sm"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleConfirmRun} 
                        disabled={loading}
                        className={`px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-sm transition-colors ${
                            loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? '提交中...' : '确定'}
                    </button>
                </div>
            </div>
        </div>
    );
};
