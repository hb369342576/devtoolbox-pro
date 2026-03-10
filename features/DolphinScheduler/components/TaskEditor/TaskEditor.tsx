import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Loader2, Save, Play, Settings, LayoutGrid, X, Copy, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useToast } from '../../../common/Toast';
import { Tooltip } from '../../../common/Tooltip';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { httpFetch } from '../../../../utils/http';
import { getExecutorStartPath, getWorkflowCodeParamName } from '../../utils';

import { TaskEditorProps, TaskNode } from './types';
import { useTaskEditorData } from './useTaskEditorData';
import { useCanvasInteraction } from './useCanvasInteraction';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeEditModal } from './NodeEditModal';
import { K8sNodeDialog } from './K8sNodeDialog';
import { RunConfigModal } from './RunConfigModal';
import { GlobalParamsModal } from './GlobalParamsModal';

export const TaskEditor: React.FC<TaskEditorProps> = ({ process, projectConfig, onClose }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const canvasRef = useRef<HTMLDivElement>(null);

    // 数据加载与保存逻辑
    const {
        loading,
        taskNodes, setTaskNodes,
        taskRelations, setTaskRelations,
        datasources,
        workerGroups,
        environments,
        alertGroups,
        tenants,
        saving,
        showExitConfirm, setShowExitConfirm,
        hasUnsavedChanges,
        globalSettings,
        globalParams, setGlobalParams,
        handleSaveWorkflow
    } = useTaskEditorData(process, projectConfig);

    // UI 交互状态
    const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);
    const [editingNode, setEditingNode] = useState<TaskNode | null>(null);
    const [runModalState, setRunModalState] = useState<{show: boolean; type: 'WORKFLOW' | 'NODE'; nodeCode?: number}>({ show: false, type: 'WORKFLOW' });
    const [showGlobalParams, setShowGlobalParams] = useState(false);
    // 右键菜单
    const [contextMenu, setContextMenu] = useState<{
        x: number; y: number;
        type: 'node' | 'relation';
        node?: TaskNode;
        relationIndex?: number;
    } | null>(null);

    // K8S 节点专用状态
    const [showK8sDialog, setShowK8sDialog] = useState(false);
    const [editingK8sNodeId, setEditingK8sNodeId] = useState<string | null>(null);
    const [k8sNodeConfigPath, setK8sNodeConfigPath] = useState('');
    const [k8sNodeDatasource, setK8sNodeDatasource] = useState(1);
    const [k8sNodeImage, setK8sNodeImage] = useState('');
    const [k8sNodeNamespace, setK8sNodeNamespace] = useState('dolphin-scheduler');
    const [k8sNodeEnvCode, setK8sNodeEnvCode] = useState(0);
    const [k8sNodeTimeoutFlag, setK8sNodeTimeoutFlag] = useState(false);
    const [k8sNodeTimeout, setK8sNodeTimeout] = useState(30);
    const [k8sNodeTimeoutWarn, setK8sNodeTimeoutWarn] = useState(true);
    const [k8sNodeTimeoutFail, setK8sNodeTimeoutFail] = useState(false);
    const [k8sNodeRetryTimes, setK8sNodeRetryTimes] = useState(0);
    const [k8sNodeRetryInterval, setK8sNodeRetryInterval] = useState(1);

    const isReadOnly = process.releaseState === 'ONLINE';

    // 初始化 K8S 默认设置
    useEffect(() => {
        if (globalSettings?.nodes?.k8s) {
            setK8sNodeImage(globalSettings.nodes.k8s.image || '');
            setK8sNodeNamespace(globalSettings.nodes.k8s.namespace || '');
            setK8sNodeDatasource(globalSettings.nodes.k8s.datasourceId || 1);
        }
        if (globalSettings?.common) {
            if (globalSettings.common.timeout) setK8sNodeTimeout(globalSettings.common.timeout);
            if (globalSettings.common.retryTimes !== undefined) setK8sNodeRetryTimes(globalSettings.common.retryTimes);
            if (globalSettings.common.retryInterval) setK8sNodeRetryInterval(globalSettings.common.retryInterval);
            if (globalSettings.common.timeout > 0) {
                setK8sNodeTimeoutFlag(true);
                setK8sNodeTimeoutWarn(false);
                setK8sNodeTimeoutFail(true);
            }
        }
    }, [globalSettings]);

    // 画布交互逻辑
    const canvas = useCanvasInteraction({
        canvasRef,
        isReadOnly,
        taskNodes,
        setTaskNodes,
        taskRelations,
        setTaskRelations,
        setSelectedNode
    });

    // 处理关闭
    const handleClose = () => {
        if (hasUnsavedChanges) {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };

    // 运行工作流逻辑
    const handleRunProcess = async (runConfig: any) => {
        try {
            const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/executors/${getExecutorStartPath(projectConfig.apiVersion)}`;
            const formData = new URLSearchParams();
            formData.append(getWorkflowCodeParamName(projectConfig.apiVersion), process.code.toString());
            formData.append('scheduleTime', '');
            
            if (runModalState.type === 'NODE' && runModalState.nodeCode) {
                formData.append('startNodeList', runModalState.nodeCode.toString());
            } else {
                formData.append('startNodeList', '');
            }
            
            formData.append('startParams', runConfig.startParams || '');
            formData.append('failureStrategy', runConfig.failureStrategy);
            formData.append('warningType', runConfig.warningType);
            formData.append('warningGroupId', runConfig.warningGroupId.toString());
            formData.append('taskDependType', runConfig.taskDependType);
            formData.append('runMode', 'RUN_MODE_SERIAL');
            formData.append('processInstancePriority', runConfig.processInstancePriority);
            formData.append('workerGroup', runConfig.workerGroup);
            formData.append('tenantCode', runConfig.tenantCode);
            formData.append('dryRun', runConfig.dryRun.toString());
            formData.append('testFlag', '0');
            formData.append('complementDependentMode', 'OFF_MODE');
            
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 
                    'token': projectConfig.token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });
            const result = await response.json();
            
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.editor.runStarted'), variant: 'success' });
                setRunModalState({ show: false, type: 'WORKFLOW' });
            } else {
                throw new Error(result.msg || 'Unknown error');
            }
        } catch (error: any) {
            toast({ title: t('dolphinScheduler.editor.runFailed'), description: error.message, variant: 'destructive' });
        }
    };

    // 拖拽添加新节点
    const handleDragStart = (e: React.DragEvent, type: string) => {
        if (isReadOnly) return;
        e.dataTransfer.setData('taskType', type);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isReadOnly) return;
        e.preventDefault();
        const taskType = e.dataTransfer.getData('taskType');
        if (!taskType) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left - canvas.offset.x) / canvas.scale;
            const y = (e.clientY - rect.top - canvas.offset.y) / canvas.scale;
            
            if (taskType === 'K8S') {
                setEditingK8sNodeId(null);
                // 配置路径默认设为项目名/
                const defaultPath = projectConfig.projectName
                    ? `${projectConfig.projectName}/`
                    : '';
                setK8sNodeConfigPath(defaultPath);
                setShowK8sDialog(true);
                return;
            }

            const newNode: TaskNode = {
                id: Math.random().toString(36).substr(2, 9),
                code: Date.now() + Math.floor(Math.random() * 1000),
                name: `${taskType}_${taskNodes.length + 1}`,
                taskType: taskType,
                x,
                y,
                _isNew: true,
                taskParams: { workerGroup: 'default' }
            };
            setTaskNodes([...taskNodes, newNode]);
            setEditingNode(newNode);
        }
    };

    // 节点操作
    const handleDeleteNode = (node: TaskNode) => {
        if (isReadOnly) return;
        setTaskNodes(nodes => nodes.filter(n => n.id !== node.id));
        setTaskRelations(rels => rels.filter(r => r.preTaskCode !== node.code && r.postTaskCode !== node.code));
        setSelectedNode(null);
    };

    const handleCopyNode = (node: TaskNode) => {
        if (isReadOnly) return;
        const newNode: TaskNode = {
            ...node,
            id: Math.random().toString(36).substr(2, 9),
            code: Date.now() + Math.floor(Math.random() * 1000),
            name: `${node.name}_copy`,
            x: node.x + 30,
            y: node.y + 30
        };
        setTaskNodes([...taskNodes, newNode]);
    };

    // 右键菜单处理
    const handleNodeContextMenu = (e: React.MouseEvent, node: TaskNode) => {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', node });
    };
    const handleRelationContextMenu = (e: React.MouseEvent, index: number) => {
        if (isReadOnly) return;
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'relation', relationIndex: index });
    };
    const closeContextMenu = () => setContextMenu(null);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={24} />
                </div>
                <p className="mt-6 text-slate-500 font-medium tracking-wide animate-bounce">{t('dolphinScheduler.editor.loadingWorkflow')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden select-none">
            {/* 顶部工具栏 */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 group"
                    >
                        <ChevronLeft className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(process.name).then(() => {
                                    toast({ title: t('dolphinScheduler.copiedName'), variant: 'success' });
                                });
                            }}
                            className="group flex items-center gap-1.5 font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent hover:opacity-75 transition-opacity truncate max-w-[280px]"
                            title={process.name}
                        >
                            <span className="truncate text-base">{process.name}</span>
                            <Copy size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(String(process.code)).then(() => {
                                    toast({ title: t('dolphinScheduler.copiedCode'), variant: 'success' });
                                });
                            }}
                            className="group flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                            title={`CODE: ${process.code}`}
                        >
                            <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-500 transition-colors">CODE: {process.code}</span>
                            <Copy size={10} className="opacity-0 group-hover:opacity-60 transition-opacity text-blue-500" />
                        </button>
                        {isReadOnly && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-200/50 dark:border-amber-800/50 flex items-center flex-shrink-0">
                                <span className="w-1 h-1 bg-amber-500 rounded-full mr-1.5 animate-pulse" />
                                {t('dolphinScheduler.editor.readOnly')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <Tooltip content={t('dolphinScheduler.editor.autoLayout')}>
                        <button 
                            onClick={canvas.handleAutoLayout}
                            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:text-blue-500"
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content={t('dolphinScheduler.editor.globalParams')}>
                        <button 
                            onClick={() => setShowGlobalParams(true)}
                            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:text-blue-500"
                        >
                            <Settings size={20} />
                        </button>
                    </Tooltip>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
                    <button 
                        onClick={() => setRunModalState({ show: true, type: 'WORKFLOW' })}
                        disabled={!isReadOnly}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg whitespace-nowrap
                            ${!isReadOnly ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'}`}
                    >
                        <Play size={18} fill="currentColor" />
                        <span>{t('dolphinScheduler.editor.run')}</span>
                    </button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSaveWorkflow}
                            disabled={saving || !hasUnsavedChanges}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg whitespace-nowrap
                                ${saving || !hasUnsavedChanges ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'}`}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>{saving ? t('common.saving') : t('common.save')}</span>
                        </button>
                    )}
                    <button 
                        onClick={handleClose}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <WorkflowCanvas
                    {...canvas}
                    taskNodes={taskNodes}
                    taskRelations={taskRelations}
                    canvasRef={canvasRef}
                    isReadOnly={isReadOnly}
                    selectedNode={selectedNode}
                    onCanvasMouseDown={canvas.handleCanvasMouseDown}
                    onNodeMouseDown={canvas.handleNodeMouseDown}
                    onNodeMouseUp={canvas.handleNodeMouseUp}
                    onNodeDoubleClick={setEditingNode}
                    onOutputPortMouseDown={canvas.handleOutputPortMouseDown}
                    onInputPortMouseUp={canvas.handleInputPortMouseUp}
                    onDeleteRelation={canvas.handleDeleteRelation}
                    onZoomIn={canvas.handleZoomIn}
                    onZoomOut={canvas.handleZoomOut}
                    onZoomReset={canvas.handleZoomReset}
                    onMouseMove={canvas.handleMouseMove}
                    onMouseUp={canvas.handleMouseUp}
                    onWheel={canvas.handleWheel}
                    onNodeContextMenu={handleNodeContextMenu}
                    onRelationContextMenu={handleRelationContextMenu}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    getConnectionPath={canvas.getConnectionPath}
                />
            </main>

            {/* 各类弹窗 */}
            {editingNode && (
                <NodeEditModal
                    editingNode={editingNode}
                    setEditingNode={setEditingNode}
                    onCancel={() => {
                        if (editingNode._isNew) {
                            setTaskNodes(nodes => nodes.filter(n => n.id !== editingNode.id));
                        }
                        setEditingNode(null);
                    }}
                    onConfirm={(node) => {
                        const finalNode = { ...node };
                        delete finalNode._isNew;
                        setTaskNodes(nodes => nodes.map(n => n.id === finalNode.id ? finalNode : n));
                        setEditingNode(null);
                    }}
                    isReadOnly={isReadOnly}
                    workerGroups={workerGroups}
                    environments={environments}
                    datasources={datasources}
                    workflowName={process.name}
                    projectConfig={projectConfig}
                />
            )}

            {showK8sDialog && (
                <K8sNodeDialog
                    editingK8sNodeId={editingK8sNodeId}
                    processName={process.name}
                    projectConfig={projectConfig}
                    k8sNodeConfigPath={k8sNodeConfigPath}
                    setK8sNodeConfigPath={setK8sNodeConfigPath}
                    k8sNodeDatasource={k8sNodeDatasource}
                    setK8sNodeDatasource={setK8sNodeDatasource}
                    k8sNodeImage={k8sNodeImage}
                    setK8sNodeImage={setK8sNodeImage}
                    k8sNodeNamespace={k8sNodeNamespace}
                    setK8sNodeNamespace={setK8sNodeNamespace}
                    k8sNodeEnvCode={k8sNodeEnvCode}
                    setK8sNodeEnvCode={setK8sNodeEnvCode}
                    k8sNodeTimeoutFlag={k8sNodeTimeoutFlag}
                    setK8sNodeTimeoutFlag={setK8sNodeTimeoutFlag}
                    k8sNodeTimeout={k8sNodeTimeout}
                    setK8sNodeTimeout={setK8sNodeTimeout}
                    k8sNodeTimeoutWarn={k8sNodeTimeoutWarn}
                    setK8sNodeTimeoutWarn={setK8sNodeTimeoutWarn}
                    k8sNodeTimeoutFail={k8sNodeTimeoutFail}
                    setK8sNodeTimeoutFail={setK8sNodeTimeoutFail}
                    k8sNodeRetryTimes={k8sNodeRetryTimes}
                    setK8sNodeRetryTimes={setK8sNodeRetryTimes}
                    k8sNodeRetryInterval={k8sNodeRetryInterval}
                    setK8sNodeRetryInterval={setK8sNodeRetryInterval}
                    onCancel={() => setShowK8sDialog(false)}
                    onConfirm={(customName) => {
                        const strategies: string[] = [];
                        if (k8sNodeTimeoutWarn) strategies.push('WARN');
                        if (k8sNodeTimeoutFail) strategies.push('FAILED');

                        const newNode: TaskNode = {
                            id: Math.random().toString(36).substr(2, 9),
                            code: Date.now(),
                            name: customName?.trim() || `K8S_${taskNodes.length + 1}`,
                            taskType: 'K8S',
                            x: 200, y: 200,
                            failRetryTimes: k8sNodeRetryTimes,
                            failRetryInterval: k8sNodeRetryInterval,
                            timeoutFlag: k8sNodeTimeoutFlag ? 'OPEN' : 'CLOSE',
                            timeout: k8sNodeTimeout,
                            timeoutNotifyStrategy: strategies.join(','),
                            environmentCode: k8sNodeEnvCode,
                            taskParams: {
                                type: 'K8S',
                                namespace: k8sNodeNamespace,
                                image: k8sNodeImage,
                                configFile: k8sNodeConfigPath,
                                datasource: k8sNodeDatasource
                            }
                        };
                        setTaskNodes([...taskNodes, newNode]);
                        setShowK8sDialog(false);
                    }}
                />
            )}

            {runModalState.show && (
                <RunConfigModal
                    onClose={() => setRunModalState({ show: false, type: 'WORKFLOW' })}
                    onRun={handleRunProcess}
                    runType={runModalState.type}
                    workerGroups={workerGroups}
                    alertGroups={alertGroups}
                    tenants={tenants}
                    environments={environments}
                />
            )}

            {showGlobalParams && (
                <GlobalParamsModal
                    globalParams={globalParams}
                    onSave={(params) => {
                        setGlobalParams(params);
                        setShowGlobalParams(false);
                    }}
                    onClose={() => setShowGlobalParams(false)}
                />
            )}


            {/* 全局点击关闭右键菜单 */}
            {contextMenu && (
                <div
                    className="fixed inset-0 z-[55]"
                    onClick={closeContextMenu}
                    onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
                >
                    <div
                        className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {contextMenu.type === 'node' && contextMenu.node && (
                            <>
                                {!isReadOnly && (
                                    <>
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
                                            onClick={() => { setEditingNode(contextMenu.node!); closeContextMenu(); }}
                                        >
                                            <Edit2 size={14} className="text-blue-500" />
                                            <span>{t('dolphinScheduler.editor.editNode')}</span>
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                            onClick={() => { handleCopyNode(contextMenu.node!); closeContextMenu(); }}
                                        >
                                            <Copy size={14} className="text-indigo-500" />
                                            <span>{t('dolphinScheduler.editor.copyNode')}</span>
                                        </button>
                                    </>
                                )}
                                {isReadOnly && (
                                    <>
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
                                            onClick={() => { setEditingNode(contextMenu.node!); closeContextMenu(); }}
                                        >
                                            <Edit2 size={14} className="text-blue-500" />
                                            <span>{t('dolphinScheduler.editor.viewNode')}</span>
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors"
                                            onClick={() => { setRunModalState({ show: true, type: 'NODE', nodeCode: contextMenu.node?.code }); closeContextMenu(); }}
                                        >
                                            <Play size={14} className="text-green-500" />
                                            <span>{t('dolphinScheduler.editor.run')}</span>
                                        </button>
                                    </>
                                )}
                                {!isReadOnly && (
                                    <>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2" />
                                        <button
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                            onClick={() => { handleDeleteNode(contextMenu.node!); closeContextMenu(); }}
                                        >
                                            <Trash2 size={14} />
                                            <span>{t('dolphinScheduler.editor.deleteNode')}</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {contextMenu.type === 'relation' && (
                            <button
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                onClick={() => {
                                    if (contextMenu.relationIndex !== undefined) {
                                        canvas.handleDeleteRelation(contextMenu.relationIndex);
                                    }
                                    closeContextMenu();
                                }}
                            >
                                <Trash2 size={14} />
                                <span>{t('dolphinScheduler.editor.deleteRelation')}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                show={showExitConfirm}
                onClose={() => setShowExitConfirm(false)}
                onConfirm={() => {
                    setShowExitConfirm(false);
                    onClose();
                }}
                title={t('dolphinScheduler.editor.unsavedTitle')}
                message={t('dolphinScheduler.editor.unsavedMessage')}
                confirmText={t('dolphinScheduler.editor.exitWithoutSaving')}
                cancelText={t('common.cancel')}
            />
        </div>
    );
};
