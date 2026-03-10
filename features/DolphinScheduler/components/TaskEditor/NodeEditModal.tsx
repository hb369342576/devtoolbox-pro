import React from 'react';
import { X, Settings, Coffee, Database, Workflow, Terminal, FileCode, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskNode, getNodeType, NODE_TYPES } from './types';

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
    workflowName
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
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {t('dolphinScheduler.editor.datasource')}
                                    </label>
                                    <select
                                        value={editingNode.taskParams?.datasource || ''}
                                        onChange={(e) => {
                                            const dsId = parseInt(e.target.value);
                                            const ds = datasources.find(d => d.id === dsId);
                                            setEditingNode({ 
                                                ...editingNode, 
                                                taskParams: { 
                                                    ...editingNode.taskParams, 
                                                    datasource: dsId,
                                                    datasourceName: ds?.name || '',
                                                    dbType: ds?.type || editingNode.taskParams?.dbType
                                                }
                                            });
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    >
                                        <option value="">{t('dolphinScheduler.editor.selectDatasource')}</option>
                                        {datasources.map(ds => (
                                            <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            {t('dolphinScheduler.editor.dbType')}
                                        </label>
                                        <select
                                            value={editingNode.taskParams?.dbType || 'MYSQL'}
                                            onChange={(e) => setEditingNode({ 
                                                ...editingNode, 
                                                taskParams: { ...editingNode.taskParams, dbType: e.target.value }
                                            })}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                        >
                                            <option value="MYSQL">MySQL</option>
                                            <option value="DORIS">Doris</option>
                                            <option value="POSTGRESQL">PostgreSQL</option>
                                            <option value="ORACLE">Oracle</option>
                                            <option value="SQLSERVER">SQL Server</option>
                                            <option value="HIVE">Hive</option>
                                            <option value="SPARK">Spark</option>
                                            <option value="CLICKHOUSE">ClickHouse</option>
                                            <option value="STARROCKS">StarRocks</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            SQL {t('dolphinScheduler.editor.sqlType')}
                                        </label>
                                        <select
                                            value={editingNode.taskParams?.sqlType || '1'}
                                            onChange={(e) => setEditingNode({ 
                                                ...editingNode, 
                                                taskParams: { ...editingNode.taskParams, sqlType: e.target.value }
                                            })}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                        >
                                            <option value="0">{t('dolphinScheduler.editor.query')}</option>
                                            <option value="1">{t('dolphinScheduler.editor.nonQuery')}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        SQL {t('dolphinScheduler.editor.sqlStatement')}
                                    </label>
                                    <textarea
                                        value={editingNode.taskParams?.sql || ''}
                                        onChange={(e) => setEditingNode({ 
                                            ...editingNode, 
                                            taskParams: { ...editingNode.taskParams, sql: e.target.value }
                                        })}
                                        placeholder="SELECT * FROM ..."
                                        rows={8}
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Java 节点配置 */}
                        {editingNode.taskType.toLowerCase() === 'java' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.editor.jarPath')}</label>
                                    <input type="text" value={editingNode.taskParams?.mainJar?.resourceName || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, mainJar: { resourceName: e.target.value } } })} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.editor.mainClass')}</label>
                                    <input type="text" value={editingNode.taskParams?.mainClass || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, mainClass: e.target.value } })} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.editor.arguments')}</label>
                                    <input type="text" value={editingNode.taskParams?.mainArgs || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, mainArgs: e.target.value } })} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">JVM Args</label>
                                    <input type="text" value={editingNode.taskParams?.jvmArgs || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, jvmArgs: e.target.value } })} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                            </div>
                        )}

                        {editingNode.taskType.toLowerCase() === 'shell' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.editor.scriptContent')}</label>
                                <textarea value={editingNode.taskParams?.rawScript || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, rawScript: e.target.value } })} rows={8} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono" />
                            </div>
                        )}

                        {editingNode.taskType.toLowerCase() === 'python' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.editor.pythonPath')}</label>
                                    <input type="text" value={editingNode.taskParams?.pythonPath || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, pythonPath: e.target.value } })} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                                <textarea value={editingNode.taskParams?.rawScript || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, rawScript: e.target.value } })} rows={8} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono" />
                            </div>
                        )}

                        {editingNode.taskType.toLowerCase() === 'seatunnel' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" value={editingNode.taskParams?.deployMode || 'local'} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, deployMode: e.target.value } })} placeholder="deployMode" className="px-3 py-1.5 text-sm border rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                    <input type="text" value={editingNode.taskParams?.configFile || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, configFile: e.target.value } })} placeholder="configFile" className="px-3 py-1.5 text-sm border rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                </div>
                                <textarea value={editingNode.taskParams?.rawScript || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, rawScript: e.target.value } })} rows={8} className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono" />
                            </div>
                        )}
                        
                        {editingNode.taskType.toLowerCase() === 'dependent' && (
                             <div className="text-sm text-slate-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                                {t('dolphinScheduler.editor.dependentTip')}
                            </div>
                        )}

                        {editingNode.taskType.toLowerCase() === 'k8s' && (
                            <div className="space-y-3">
                                <input type="text" value={editingNode.taskParams?.namespace || 'default'} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, namespace: e.target.value } })} placeholder="namespace" className="w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                <input type="text" value={editingNode.taskParams?.image || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, image: e.target.value } })} placeholder="image" className="w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                                <input type="text" value={editingNode.taskParams?.command || ''} onChange={(e) => setEditingNode({ ...editingNode, taskParams: { ...editingNode.taskParams, command: e.target.value } })} placeholder="command" className="w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                            </div>
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
