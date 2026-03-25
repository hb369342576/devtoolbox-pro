import React from 'react';
import { X, Settings, Coffee, Database, Workflow, Terminal, FileCode, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskNode, getNodeType, NODE_TYPES } from './types';
import { SqlNodeForm, JavaNodeForm, PythonNodeForm, ShellNodeForm, SeaTunnelNodeForm, DependentNodeForm, K8sNodeForm } from '../nodes';

interface NodeEditModalProps {
    editingNode: TaskNode;
    setEditingNode: (node: TaskNode | null) => void;
    onConfirm: (node: TaskNode) => void;
    onCancel?: () => void;
    isReadOnly: boolean;
    workerGroups: string[];
    environments: { code: number; name: string }[];
    datasources: { id: number; name: string; type: string }[];
    workflowName: string;
    projectConfig?: any;
}

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
    editingNode,
    setEditingNode,
    onConfirm,
    onCancel,
    isReadOnly,
    workerGroups,
    environments,
    datasources,
    workflowName,
    projectConfig
}) => {
    const { t } = useTranslation();

    const nodeInfo = getNodeType(editingNode.taskType);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${nodeInfo.bgColor} text-white`}>
                            {React.createElement(nodeInfo.icon, { size: 20 })}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {isReadOnly ? t('dolphinScheduler.editor.viewNode') : t('dolphinScheduler.editor.editNode')}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500">{editingNode.taskType}{isReadOnly && t('dolphinScheduler.editor.readOnly')}</span>
                                <span className="text-xs text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{workflowName}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onCancel || (() => setEditingNode(null))} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <fieldset disabled={isReadOnly} className={isReadOnly ? 'opacity-80' : ''}>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('dolphinScheduler.editor.nodeName')}
                        </label>
                        <input
                            type="text"
                            value={editingNode.name}
                            onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('dolphinScheduler.editor.nodeType')}
                        </label>
                        <select
                            value={editingNode.taskType.toLowerCase()}
                            onChange={(e) => setEditingNode({ ...editingNode, taskType: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {NODE_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Worker Group 和环境变量 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Worker Group
                            </label>
                            <select
                                value={editingNode.taskParams?.workerGroup || 'default'}
                                onChange={(e) => setEditingNode({ 
                                    ...editingNode, 
                                    taskParams: { ...editingNode.taskParams, workerGroup: e.target.value }
                                })}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                            >
                                {workerGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('dolphinScheduler.editor.environment')}
                            </label>
                            <select
                                value={editingNode.environmentCode || editingNode.taskParams?.environmentCode || ''}
                                onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                                    setEditingNode({ 
                                        ...editingNode, 
                                        environmentCode: val,
                                        taskParams: { ...editingNode.taskParams, environmentCode: val }
                                    });
                                }}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                            >
                                <option value="">{t('dolphinScheduler.editor.none')}</option>
                                {environments.map(e => (
                                    <option key={e.code} value={e.code}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center">
                            <Settings size={16} className="mr-2" />
                            {t('dolphinScheduler.editor.nodeConfiguration')}
                        </h4>
                        
                        {/* SQL 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'sql' && (
                            <SqlNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                datasources={datasources}
                                readOnly={isReadOnly}
                            />
                        )}

                        {/* Java 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'java' && (
                            <JavaNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                                projectConfig={projectConfig}
                            />
                        )}

                        {/* Shell 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'shell' && (
                            <ShellNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                                projectConfig={projectConfig}
                            />
                        )}

                        {/* Python 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'python' && (
                            <PythonNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                                projectConfig={projectConfig}
                            />
                        )}

                        {/* SeaTunnel 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'seatunnel' && (
                            <SeaTunnelNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                            />
                        )}
                        
                        {/* Dependent 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'dependent' && (
                            <DependentNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                                projectConfig={projectConfig}
                            />
                        )}

                        {/* K8S 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'k8s' && (
                            <K8sNodeForm
                                data={editingNode.taskParams}
                                onChange={(data) => setEditingNode({ ...editingNode, taskParams: data })}
                                readOnly={isReadOnly}
                            />
                        )}
                    </div>
                    
                    {/* 失败重试配置 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mt-4">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">
                            {t('dolphinScheduler.editor.failureRetry')}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    {t('dolphinScheduler.editor.retryTimes')}
                                </label>
                                <input
                                    type="number"
                                    value={editingNode.failRetryTimes || 0}
                                    onChange={(e) => setEditingNode({ ...editingNode, failRetryTimes: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    {t('dolphinScheduler.editor.retryInterval')}
                                </label>
                                <input
                                    type="number"
                                    value={editingNode.failRetryInterval || 1}
                                    onChange={(e) => setEditingNode({ ...editingNode, failRetryInterval: parseInt(e.target.value) || 1 })}
                                    min="1"
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 描述字段 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('common.description')}
                        </label>
                        <textarea
                            value={editingNode.description || ''}
                            onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                </fieldset>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/80">
                    <button
                        onClick={onCancel || (() => setEditingNode(null))}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {isReadOnly ? t('dolphinScheduler.editor.close') : t('common.cancel')}
                    </button>
                    {!isReadOnly && (
                        <button
                            onClick={() => onConfirm(editingNode)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                            {t('common.confirm')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
