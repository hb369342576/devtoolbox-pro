import React, { useState, useCallback } from 'react';
import { ListTodo, ArrowLeft, Plus, Folder, Calendar, CheckCircle2, RefreshCw, Settings, Search, Download, Upload, PlayCircle, ToggleRight, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { Tooltip } from '../../common/Tooltip';
import { useTaskManagerData } from './useTaskManagerData';
import { WorkflowDefinitionTab } from './WorkflowDefinitionTab';
import { WorkflowInstanceTab } from './WorkflowInstanceTab';
import { WorkflowScheduleTab } from './WorkflowScheduleTab';
import { TaskInstanceTab } from './TaskInstanceTab';
import { TaskManagerProps, TabType } from './types';
import { TaskEditor, GlobalSettingsModal, BatchRunModal, BatchPublishModal, ExportModal, ImportModal, LogModal } from '../components';
import { CreateK8sDialog } from './CreateK8sDialog';
import { RunWorkflowModal } from './RunWorkflowModal';
import { httpFetch } from '../../../utils/http';
import { getWorkflowApiPath, getExecutorStartPath, getWorkflowCodeParamName } from '../utils';

export const TaskManager: React.FC<TaskManagerProps> = ({ currentProject, configs, onSelectProject, onBack }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const {
        loading, processes, total, pageNo, setPageNo, pageSize, setPageSize, searchTerm, setSearchTerm,
        instances, instanceTotal, instancePageNo, setInstancePageNo, instancePageSize, setInstancePageSize, instanceLoading, instanceSearch, setInstanceSearch,
        schedules, scheduleTotal, schedulePageNo, setSchedulePageNo, schedulePageSize, setSchedulePageSize, scheduleLoading,
        taskInstances, taskInstanceTotal, taskInstancePageNo, setTaskInstancePageNo, taskInstancePageSize, setTaskInstancePageSize, taskInstanceLoading,
        activeTab, setActiveTab, resolvedProjectCode, handleRefresh
    } = useTaskManagerData(currentProject);

    const [showCreateK8s, setShowCreateK8s] = useState(false);
    const [showBatchRun, setShowBatchRun] = useState(false);
    const [showBatchPublish, setShowBatchPublish] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    // viewLogTaskId: null = 弹窗关闭; 0 = 查看全部日志模式; >0 = 直接查看某个任务实例日志
    const [viewLogTaskId, setViewLogTaskId] = useState<number | null>(null);
    const [editProcess, setEditProcess] = useState<any>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedProcesses, setSelectedProcesses] = useState<Set<number | string>>(new Set());
    const [selectedInstances, setSelectedInstances] = useState<Set<number>>(new Set());
    // 运行配置弹窗
    const [runProcess, setRunProcess] = useState<any>(null);

    // 工作流定义上下线操作
    const handleToggleOnline = useCallback(async (process: any) => {
        try {
            const action = process.releaseState === 'ONLINE' ? 'offline' : 'online';
            const defPath = getWorkflowApiPath(currentProject?.apiVersion);
            const code = resolvedProjectCode || currentProject?.projectCode;
            const url = `${currentProject?.baseUrl}/projects/${code}/${defPath}/${process.code}/release`;
            const resp = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': currentProject?.token || '', 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `releaseState=${action === 'online' ? 'ONLINE' : 'OFFLINE'}`
            });
            const text = await resp.text();
            if (!text.startsWith('{')) { toast({ title: t('dolphinScheduler.apiPathError'), description: text.substring(0, 100), variant: 'destructive' }); return; }
            const result = JSON.parse(text);
            if (result.code === 0) {
                toast({ title: action === 'online' ? t('dolphinScheduler.onlineSuccess') : t('dolphinScheduler.offlineSuccess'), variant: 'success' });
                handleRefresh();
            } else {
                toast({ title: t('dolphinScheduler.operationFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.operationFailed'), description: err.message, variant: 'destructive' });
        }
    }, [currentProject, resolvedProjectCode, handleRefresh]);

    // 复制工作流
    const handleCopyWorkflow = useCallback(async (process: any) => {
        try {
            const defPath = getWorkflowApiPath(currentProject?.apiVersion);
            const code = resolvedProjectCode || currentProject?.projectCode;
            const url = `${currentProject?.baseUrl}/projects/${code}/${defPath}/batch-copy`;
            const params = new URLSearchParams();
            params.append('codes', String(process.code));
            params.append('targetProjectCode', String(code));
            const resp = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': currentProject?.token || '', 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            const text = await resp.text();
            if (!text.startsWith('{')) {
                toast({ title: 'API路径错误', description: text.substring(0, 100), variant: 'destructive' });
                return;
            }
            const result = JSON.parse(text);
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.copySuccess'), description: `${process.name}`, variant: 'success' });
                handleRefresh();
            } else {
                toast({ title: t('dolphinScheduler.copyWorkflow'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.copyWorkflow'), description: err.message, variant: 'destructive' });
        }
    }, [currentProject, resolvedProjectCode, handleRefresh]);


    // 定时上下线操作
    const handleToggleSchedule = useCallback(async (schedule: any) => {
        try {
            const action = schedule.releaseState === 'ONLINE' ? 'offline' : 'online';
            const code = resolvedProjectCode || currentProject?.projectCode;
            const url = `${currentProject?.baseUrl}/projects/${code}/schedules/${schedule.id}/${action}`;
            const resp = await httpFetch(url, { 
                method: 'POST', 
                headers: { 'token': currentProject?.token || '', 'Content-Type': 'application/x-www-form-urlencoded' },
                body: ''
            });
            const text = await resp.text();
            if (!text.startsWith('{')) { toast({ title: 'API路径错误', description: text.substring(0, 100), variant: 'destructive' }); return; }
            const result = JSON.parse(text);
            if (result.code === 0) {
                toast({ title: '操作成功', variant: 'success' });
                handleRefresh();
            } else {
                toast({ title: '操作失败', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: '操作失败', description: err.message, variant: 'destructive' });
        }
    }, [currentProject, resolvedProjectCode, handleRefresh]);

    if (!currentProject) {
        return (
            <div className="h-full flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-blue-600" size={24} />
                        {t('dolphinScheduler.projectManager')}
                    </h2>
                </div>
                <div className="flex flex-wrap gap-6 overflow-y-auto pb-4">
                    {configs.map(config => (
                        <div key={config.id} onClick={() => onSelectProject(config)} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all">
                            <h3 className="font-bold text-lg mb-2">{config.name}</h3>
                            <p className="text-sm text-slate-500 font-mono">{config.baseUrl}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 进入编辑模式时全屏显示 TaskEditor，隐藏所有顶部导航和工具栏
    if (editProcess) {
        return (
            <div className="h-full flex flex-col">
                <TaskEditor
                    process={editProcess}
                    projectConfig={currentProject}
                    onClose={() => setEditProcess(null)}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* 顶部导航 */}
            <div className="flex flex-col mb-4 pt-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center px-6 mb-4">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => onBack ? onBack() : onSelectProject(null as any)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold flex items-center">
                            <ListTodo className="mr-3 text-blue-600" />
                            <span className="text-slate-500 font-normal mr-2 whitespace-nowrap">{t('dolphinScheduler.projectManager')} / </span>
                            {currentProject.name}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center space-x-1 px-6 -mb-px">
                    {[
                        { id: 'workflow-definition', name: t('dolphinScheduler.workflowDefinition'), icon: <Folder size={16} /> },
                        { id: 'workflow-instance', name: t('dolphinScheduler.workflowInstance'), icon: <ListTodo size={16} /> },
                        { id: 'workflow-schedule', name: t('dolphinScheduler.workflowSchedule'), icon: <Calendar size={16} /> },
                        { id: 'task-instance', name: t('dolphinScheduler.taskInstance'), icon: <CheckCircle2 size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center px-4 py-2 text-sm font-medium transition-all ${
                                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 工具栏 */}
                <div className="flex justify-between items-center px-6 mb-4">
                    <div className="flex items-center space-x-3">
                        {activeTab === 'workflow-definition' && (
                            <button onClick={() => setShowCreateK8s(true)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-all" title={t('dolphinScheduler.newK8sWorkflow')}>
                                <Plus size={18} />
                            </button>
                        )}
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('common.search')}
                                value={activeTab === 'workflow-instance' ? instanceSearch : searchTerm}
                                onChange={e => activeTab === 'workflow-instance' ? setInstanceSearch(e.target.value) : setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                <div className="flex items-center space-x-1 pr-2">
                    {activeTab === 'workflow-definition' && (
                        <>
                            <Tooltip content={t('dolphinScheduler.batchPublishUnpublish')} position="bottom">
                                <button onClick={() => setShowBatchPublish(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                    <ToggleRight size={16} />
                                </button>
                            </Tooltip>
                            <Tooltip content={t('dolphinScheduler.exportWorkflow')} position="bottom">
                                <button onClick={() => setShowExport(true)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors text-blue-600">
                                    <Download size={16} />
                                </button>
                            </Tooltip>
                            <Tooltip content={t('dolphinScheduler.importWorkflow')} position="bottom">
                                <button onClick={() => setShowImport(true)} className="p-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded transition-colors text-cyan-600">
                                    <Upload size={16} />
                                </button>
                            </Tooltip>
                            <Tooltip content={t('dolphinScheduler.batchRunWorkflows')} position="bottom">
                                <button onClick={() => setShowBatchRun(true)} className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors text-orange-600">
                                    <PlayCircle size={16} />
                                </button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip content={t('dolphinScheduler.refresh')} position="bottom">
                        <button onClick={handleRefresh} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            <RefreshCw size={16} className={loading || instanceLoading ? 'animate-spin' : ''} />
                        </button>
                    </Tooltip>
                    <Tooltip content={t('dolphinScheduler.runLogs')} position="bottom">
                        <button onClick={() => setViewLogTaskId(0)} className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors text-purple-600">
                            <Eye size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip content={t('dolphinScheduler.globalSettings.title')} position="bottom">
                        <button onClick={() => setShowConfigModal(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            <Settings size={16} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 px-6 pb-6 overflow-hidden">
                <div className="h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm">
                    {activeTab === 'workflow-definition' && (
                        <WorkflowDefinitionTab
                            loading={loading}
                            error={null}
                            processes={processes}
                            total={total}
                            pageNo={pageNo}
                            pageSize={pageSize}
                            setPageNo={setPageNo}
                            setPageSize={setPageSize}
                            selectedProcesses={selectedProcesses}
                            setSelectedProcesses={setSelectedProcesses}
                            onEdit={setEditProcess}
                            onCopy={handleCopyWorkflow}
                            onRun={(p: any) => setRunProcess(p)}
                            onSchedule={() => toast({ title: t('dolphinScheduler.schedule'), description: t('dolphinScheduler.workflowSchedule'), variant: 'default' })}
                            onToggleOnline={handleToggleOnline}
                        />
                    )}
                    {activeTab === 'workflow-instance' && (
                         <WorkflowInstanceTab
                            loading={instanceLoading}
                            deleting={false}
                            instances={instances}
                            total={instanceTotal}
                            pageNo={instancePageNo}
                            pageSize={instancePageSize}
                            setPageNo={setInstancePageNo}
                            setPageSize={setInstancePageSize}
                            selectedInstances={selectedInstances}
                            setSelectedInstances={setSelectedInstances}
                            onStop={() => {}}
                            onDelete={() => {}}
                        />
                    )}
                    {activeTab === 'workflow-schedule' && (
                        <WorkflowScheduleTab
                            loading={scheduleLoading}
                            schedules={schedules}
                            total={scheduleTotal}
                            pageNo={schedulePageNo}
                            pageSize={schedulePageSize}
                            setPageNo={setSchedulePageNo}
                            setPageSize={setSchedulePageSize}
                            onToggleSchedule={handleToggleSchedule}
                        />
                    )}
                    {activeTab === 'task-instance' && (
                        <TaskInstanceTab
                            loading={taskInstanceLoading}
                            instances={taskInstances}
                            total={taskInstanceTotal}
                            pageNo={taskInstancePageNo}
                            pageSize={taskInstancePageSize}
                            setPageNo={setTaskInstancePageNo}
                            setPageSize={setTaskInstancePageSize}
                            onViewLog={(id: number) => setViewLogTaskId(id)}
                        />
                    )}
                </div>
            </div>

            {/* 各类弹窗 */}
            {showCreateK8s && <CreateK8sDialog currentProject={currentProject} onClose={() => setShowCreateK8s(false)} onSuccess={handleRefresh} />}
            <GlobalSettingsModal show={showConfigModal} onClose={() => setShowConfigModal(false)} onSave={() => {}} />

            {/* 运行配置弹窗 */}
            <RunWorkflowModal 
                show={!!runProcess}
                process={runProcess}
                currentProject={currentProject}
                onClose={() => setRunProcess(null)}
                onSuccess={() => setTimeout(handleRefresh, 1500)}
            />

            <BatchPublishModal 
                show={showBatchPublish} 
                processes={processes} 
                projectCode={String(currentProject.projectCode)} 
                baseUrl={currentProject.baseUrl || ''} 
                token={currentProject.token || ''} 
                apiVersion={currentProject.apiVersion}
                onClose={() => setShowBatchPublish(false)} 
                onSuccess={handleRefresh} 
            />
            
            <BatchRunModal 
                show={showBatchRun} 
                processes={processes} 
                projectCode={String(currentProject.projectCode)} 
                baseUrl={currentProject.baseUrl || ''} 
                token={currentProject.token || ''} 
                apiVersion={currentProject.apiVersion}
                onClose={() => setShowBatchRun(false)} 
                onSuccess={() => setActiveTab('workflow-instance')} 
            />

            <ExportModal 
                show={showExport} 
                processes={processes} 
                projectCode={String(currentProject.projectCode)} 
                baseUrl={currentProject.baseUrl || ''} 
                token={currentProject.token || ''} 
                apiVersion={currentProject.apiVersion}
                onClose={() => setShowExport(false)} 
            />

            <ImportModal 
                show={showImport} 
                projectCode={String(currentProject.projectCode)} 
                baseUrl={currentProject.baseUrl || ''} 
                token={currentProject.token || ''} 
                apiVersion={currentProject.apiVersion}
                onClose={() => setShowImport(false)} 
                onSuccess={handleRefresh} 
            />

            <LogModal
                show={viewLogTaskId !== null}
                projectCode={String(currentProject.projectCode)}
                baseUrl={currentProject.baseUrl || ''}
                token={currentProject.token || ''}
                apiVersion={currentProject.apiVersion}
                directTaskId={viewLogTaskId && viewLogTaskId > 0 ? viewLogTaskId : undefined}
                onClose={() => setViewLogTaskId(null)}
            />
        </div>
    );
};
