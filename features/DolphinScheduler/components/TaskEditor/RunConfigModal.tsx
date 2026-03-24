import React from 'react';
import { Play, X, Settings2, ShieldCheck, AlertTriangle, FastForward, Users, Activity, Copy, Edit, PlayCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskNode } from './types';



interface RunConfigModalProps {
    onClose: () => void;
    onRun: (config: any) => void;
    workerGroups: string[];
    alertGroups: { id: number; groupName: string }[];
    environments?: { code: number; name: string }[];
    tenants?: { id: number; tenantCode: string }[];
    runType?: 'WORKFLOW' | 'NODE';
}

export const RunConfigModal: React.FC<RunConfigModalProps> = ({ 
    onClose, 
    onRun, 
    workerGroups, 
    alertGroups,
    environments = [],
    tenants = [],
    runType = 'WORKFLOW'
}) => {
    const { t } = useTranslation();
    const [config, setConfig] = React.useState({
        executeType: 'NONE',
        failureStrategy: 'CONTINUE',
        warningType: 'NONE',
        warningGroupId: alertGroups[0]?.id || 0,
        processInstancePriority: 'MEDIUM',
        workerGroup: 'default',
        dryRun: 0,
        taskDependType: 'TASK_POST',
        tenantCode: tenants?.[0]?.tenantCode || 'default',
        environmentCode: environments?.[0]?.code || '',
    });
    
    // 启动参数数组状态
    const [startParamsList, setStartParamsList] = React.useState<{prop: string; value: string}[]>([]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                            {runType === 'NODE' ? t('dolphinScheduler.editor.runNode') || '运行节点' : t('dolphinScheduler.editor.runProcess')}
                        </h3>
                        {/* 模拟原生小字体提示 */}
                        <p className="text-xs text-slate-500">启动前请先设置参数</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold">✕</button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    
                    {/* 失败策略 & 通知策略 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                失败策略
                            </label>
                            <div className="flex items-center space-x-4 h-9">
                                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="failureStrategy" 
                                        value="CONTINUE" 
                                        checked={config.failureStrategy === 'CONTINUE'} 
                                        onChange={(e) => setConfig({...config, failureStrategy: e.target.value})}
                                        className="text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>{t('dolphinScheduler.editor.continue')}</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="failureStrategy" 
                                        value="END" 
                                        checked={config.failureStrategy === 'END'} 
                                        onChange={(e) => setConfig({...config, failureStrategy: e.target.value})}
                                        className="text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>{t('dolphinScheduler.editor.end')}</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                通知策略
                            </label>
                            <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                value={config.warningType}
                                onChange={e => setConfig({...config, warningType: e.target.value})}
                            >
                                <option value="NONE">{t('dolphinScheduler.editor.none')}</option>
                                <option value="SUCCESS">{t('dolphinScheduler.editor.success')}</option>
                                <option value="FAILURE">{t('dolphinScheduler.editor.failure')}</option>
                                <option value="ALL">{t('dolphinScheduler.editor.all')}</option>
                            </select>
                        </div>
                    </div>

                    {/* 节点执行（仅在节点运行模式下显示） */}
                    {runType === 'NODE' && (
                        <div>
                            <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 bg-blue-50 dark:bg-blue-900/20 inline-block px-2 py-0.5 rounded">
                                {t('dolphinScheduler.editor.nodeExecution')}
                            </label>
                            <div className="flex items-center space-x-6 h-9">
                                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="taskDependType" 
                                        value="TASK_POST" 
                                        checked={config.taskDependType === 'TASK_POST'} 
                                        onChange={(e) => setConfig({...config, taskDependType: e.target.value})}
                                        className="text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>{t('dolphinScheduler.editor.taskPost')}</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="taskDependType" 
                                        value="TASK_PRE" 
                                        checked={config.taskDependType === 'TASK_PRE'} 
                                        onChange={(e) => setConfig({...config, taskDependType: e.target.value})}
                                        className="text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>{t('dolphinScheduler.editor.taskPre')}</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="taskDependType" 
                                        value="TASK_ONLY" 
                                        checked={config.taskDependType === 'TASK_ONLY'} 
                                        onChange={(e) => setConfig({...config, taskDependType: e.target.value})}
                                        className="text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>{t('dolphinScheduler.editor.taskOnly') || '仅当前节点'}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 流程优先级 & Worker分组 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                流程优先级
                            </label>
                            <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm flex items-center"
                                value={config.processInstancePriority}
                                onChange={e => setConfig({...config, processInstancePriority: e.target.value})}
                            >
                                <option value="HIGHEST">↑ {t('dolphinScheduler.editor.highest')}</option>
                                <option value="HIGH">↑ {t('dolphinScheduler.editor.high')}</option>
                                <option value="MEDIUM">{t('dolphinScheduler.editor.medium')}</option>
                                <option value="LOW">↓ {t('dolphinScheduler.editor.low')}</option>
                                <option value="LOWEST">↓ {t('dolphinScheduler.editor.lowest')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('dolphinScheduler.editor.workerGroup')}
                            </label>
                            <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                value={config.workerGroup}
                                onChange={e => setConfig({...config, workerGroup: e.target.value})}
                            >
                                {workerGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 租户 & 环境名称 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('dolphinScheduler.editor.tenantCode')}
                            </label>
                            <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                value={config.tenantCode}
                                onChange={e => setConfig({...config, tenantCode: e.target.value})}
                            >
                                <option value="default">default</option>
                                {tenants.filter(t => t.tenantCode !== 'default').map(t => (
                                    <option key={t.id} value={t.tenantCode}>{t.tenantCode}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('dolphinScheduler.editor.environment')}
                            </label>
                            <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                value={config.environmentCode}
                                onChange={e => setConfig({...config, environmentCode: e.target.value})}
                            >
                                <option value="">请选择环境</option>
                                {environments.map(env => (
                                    <option key={env.code} value={env.code}>{env.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 启动参数与补数等设置 */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('dolphinScheduler.editor.startParams')}
                                </label>
                            </div>
                            
                            <div className="space-y-2">
                                {startParamsList.map((param, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <input 
                                            type="text"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                            value={param.prop}
                                            onChange={e => {
                                                const newList = [...startParamsList];
                                                newList[index].prop = e.target.value;
                                                setStartParamsList(newList);
                                            }}
                                            placeholder="prop"
                                        />
                                        <input 
                                            type="text"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                            value={param.value}
                                            onChange={e => {
                                                const newList = [...startParamsList];
                                                newList[index].value = e.target.value;
                                                setStartParamsList(newList);
                                            }}
                                            placeholder="value"
                                        />
                                        <button 
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            onClick={() => {
                                                const newList = [...startParamsList];
                                                newList.splice(index, 1);
                                                setStartParamsList(newList);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center space-x-1"
                                    onClick={() => setStartParamsList([...startParamsList, { prop: '', value: '' }])}
                                >
                                    <span>+ {t('dolphinScheduler.editor.addParam')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6 pt-2">
                            <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input type="checkbox" className="rounded text-blue-500 focus:ring-blue-500" />
                                <span>{t('dolphinScheduler.editor.complementData')}</span>
                            </label>
                            
                            <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <div className={`w-10 h-5 rounded-full transition-colors relative ${config.dryRun === 1 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={config.dryRun === 1}
                                        onChange={(e) => setConfig({...config, dryRun: e.target.checked ? 1 : 0})}
                                    />
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.dryRun === 1 ? 'left-[22px]' : 'left-0.5'}`} />
                                </div>
                                <span>{t('dolphinScheduler.editor.dryRun')}</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                    <button 
                        onClick={() => {
                            // 过滤出有效的参数并转为 JSON 字符串
                            const validParams = startParamsList.filter(p => p.prop.trim());
                            let startParamsStr = '';
                            if (validParams.length > 0) {
                                const paramsObj: Record<string, string> = {};
                                validParams.forEach(p => { paramsObj[p.prop] = p.value; });
                                startParamsStr = JSON.stringify(paramsObj);
                            }
                            
                            onRun({
                                ...config,
                                startParams: startParamsStr
                            });
                        }}
                        className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center"
                    >
                        {t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};
