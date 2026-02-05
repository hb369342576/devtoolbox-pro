import React, { useState, useEffect, useRef } from 'react';
import { Eye, XCircle, Search, Loader2, Tag, RefreshCw } from 'lucide-react';
import { httpFetch } from '../../../utils/http';
import { useToast } from '../../../components/ui/Toast';
import { Tooltip } from '../../../components/ui/Tooltip';
import { Language, ProcessInstance } from '../types';
import { DolphinSchedulerApiVersion } from '../../../types';

interface LogModalProps {
    show: boolean;
    lang: Language;
    projectCode: string;
    baseUrl: string;
    token: string;
    apiVersion?: DolphinSchedulerApiVersion;
    onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ show, lang, projectCode, baseUrl, token, apiVersion, onClose }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<ProcessInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
    const [logContent, setLogContent] = useState<string>('');
    const [loadingLog, setLoadingLog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    
    // 可拖拽分隔条状态
    const [leftWidth, setLeftWidth] = useState(384); // 默认 w-96 = 384px
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // 拖拽处理
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newWidth = Math.min(Math.max(280, e.clientX - rect.left), rect.width - 300);
            setLeftWidth(newWidth);
        };
        const handleMouseUp = () => setIsDragging(false);
        
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);
    
    useEffect(() => {
        if (show && projectCode) {
            fetchInstances();
        }
    }, [show, projectCode, pageNo]);
    
    const fetchInstances = async () => {
        setLoading(true);
        try {
            // 3.4.0+ 版本使用 workflow-instances，旧版本使用 process-instances
            const instancesPath = apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            const url = `${baseUrl}/projects/${projectCode}/${instancesPath}?pageNo=${pageNo}&pageSize=${pageSize}`;
            const response = await httpFetch(url, { headers: { 'token': token } });
            const result = await response.json();
            if (result.code === 0) {
                setInstances(result.data?.totalList || []);
                setTotal(result.data?.total || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const fetchTaskLog = async (instance: ProcessInstance) => {
        setSelectedInstance(instance);
        setLoadingLog(true);
        setLogContent('');
        try {
            const taskUrl = `${baseUrl}/projects/${projectCode}/task-instances?processInstanceId=${instance.id}&pageNo=1&pageSize=100`;
            const taskResponse = await httpFetch(taskUrl, { 
                method: 'GET',
                headers: { 
                    'token': token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                } 
            });
            
            const taskText = await taskResponse.text();
            
            if (!taskText.startsWith('{') && !taskText.startsWith('[')) {
                setLogContent(`API 返回非 JSON 格式:\n\n${taskText.substring(0, 500)}\n\n请求地址: ${taskUrl}`);
                setLoadingLog(false);
                return;
            }
            
            const taskResult = JSON.parse(taskText);
            
            let tasks: any[] = [];
            if (taskResult.code === 0 && taskResult.data) {
                tasks = taskResult.data.totalList || taskResult.data.list || taskResult.data || [];
            }
            
            if (tasks.length > 0) {
                let allLogs = `工作流实例: ${instance.name}\n运行状态: ${instance.state}\n开始时间: ${instance.startTime}\n结束时间: ${instance.endTime || '-'}\n耗时: ${instance.duration || '-'}\n\n`;
                allLogs += `共 ${tasks.length} 个任务\n`;
                allLogs += '='.repeat(60) + '\n';
                
                for (const task of tasks) {
                    allLogs += `\n【${task.name}】 状态: ${task.state}\n`;
                    allLogs += `  开始: ${task.startTime || '-'}\n`;
                    allLogs += `  结束: ${task.endTime || '-'}\n`;
                    allLogs += `  耗时: ${task.duration || '-'}\n`;
                    allLogs += `  主机: ${task.host || '-'}\n`;
                    allLogs += `  任务ID: ${task.id || '-'}\n`;
                    
                    const taskId = task.id || task.taskInstanceId;
                    if (taskId) {
                        try {
                            let fullLog = '';
                            let skipLineNum = 0;
                            const limit = 1000;
                            let hasMore = true;
                            let fetchCount = 0;
                            const maxFetch = 5; 
                            
                            while (hasMore && fetchCount < maxFetch) {
                                fetchCount++;
                                const logUrl = `${baseUrl}/log/detail?taskInstanceId=${taskId}&limit=${limit}&skipLineNum=${skipLineNum}`;
                                const logResponse = await httpFetch(logUrl, { headers: { 'token': token } });
                                const logResult = await logResponse.json();
                                
                                if (logResult.code === 0 && logResult.data) {
                                    const logMsg = logResult.data.message || '';
                                    const lineNum = logResult.data.lineNum || 0;
                                    
                                    if (logMsg && logMsg.trim()) {
                                        fullLog += logMsg;
                                    }
                                    
                                    if (lineNum > skipLineNum) {
                                        skipLineNum = lineNum;
                                    } else {
                                        hasMore = false;
                                    }
                                } else {
                                    hasMore = false;
                                    if (!fullLog) {
                                        fullLog = logResult.msg || '暂无日志';
                                    }
                                }
                            }
                            
                            if (fullLog.trim()) {
                                allLogs += `\n--- 日志内容 ---\n${fullLog}\n`;
                            } else {
                                allLogs += `  [暂无日志内容]\n`;
                            }
                        } catch (logErr: any) {
                            allLogs += `  [获取日志失败: ${logErr.message}]\n`;
                        }
                    } else {
                        allLogs += `  [无任务ID，无法获取日志]\n`;
                    }
                    allLogs += '-'.repeat(40) + '\n';
                }
                setLogContent(allLogs);
            } else {
                const errMsg = taskResult.msg || (lang === 'zh' ? '该实例暂无任务记录' : 'No task records for this instance');
                setLogContent(`${errMsg}\n\n响应数据: ${JSON.stringify(taskResult, null, 2)}`);
            }
        } catch (err: any) {
            setLogContent(`Error: ${err.message}\n\n请检查网络连接或 API 权限`);
        } finally {
            setLoadingLog(false);
        }
    };
    
    if (!show) return null;
    
    const filteredInstances = instances.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(total / pageSize);
    
    const getStateColor = (state: string) => {
        switch (state) {
            case 'SUCCESS': return 'bg-green-100 text-green-700';
            case 'FAILURE': case 'KILL': return 'bg-red-100 text-red-700';
            case 'RUNNING_EXECUTION': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Eye size={20} className="mr-2 text-blue-500" />
                        {lang === 'zh' ? '运行日志' : 'Run Logs'}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <Tooltip content={lang === 'zh' ? '刷新列表' : 'Refresh'} position="bottom">
                            <button 
                                onClick={() => fetchInstances()} 
                                disabled={loading}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </Tooltip>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                    </div>
                </div>
                
                <div ref={containerRef} className={`flex flex-1 overflow-hidden ${isDragging ? 'select-none' : ''}`}>
                    {/* 左侧实例列表 */}
                    <div style={{ width: leftWidth }} className="border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder={lang === 'zh' ? '搜索...' : 'Search...'} 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" 
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
                            ) : filteredInstances.length === 0 ? (
                                <p className="text-slate-400 text-center py-8 text-sm">{lang === 'zh' ? '暂无运行记录' : 'No records'}</p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredInstances.map(instance => (
                                        <div key={instance.id} onClick={() => fetchTaskLog(instance)} className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedInstance?.id === instance.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate flex-1" title={instance.name}>{instance.name}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${getStateColor(instance.state)}`}>{instance.state}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 space-y-0.5">
                                                <div>{instance.startTime || '-'}</div>
                                                <div className="flex justify-between">
                                                    <span>{lang === 'zh' ? '耗时' : 'Duration'}: {instance.duration || '-'}</span>
                                                    <span>{instance.executorName || '-'}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-500">
                                                    <span><Tag size={10} className="inline mr-1" />{instance.commandType || 'START_PROCESS'}</span>
                                                    <span>{lang === 'zh' ? '重试' : 'Retry'}: {instance.runTimes || 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-2">
                                <button onClick={() => setPageNo(p => Math.max(1, p - 1))} disabled={pageNo === 1} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-50">«</button>
                                <span className="text-xs text-slate-500">{pageNo} / {totalPages}</span>
                                <button onClick={() => setPageNo(p => Math.min(totalPages, p + 1))} disabled={pageNo === totalPages} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-50">»</button>
                            </div>
                        )}
                    </div>
                    
                    {/* 可拖拽分隔条 */}
                    <div 
                        onMouseDown={handleMouseDown}
                        className={`w-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors shrink-0 ${isDragging ? 'bg-blue-500' : ''}`}
                    />
                    
                    {/* 右侧日志内容 */}
                    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
                        {selectedInstance ? (
                            <>
                                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
                                    <span className="text-sm text-slate-300 truncate flex-1" title={selectedInstance.name}>{selectedInstance.name}</span>
                                    <div className="flex items-center space-x-2 shrink-0">
                                        <Tooltip content={lang === 'zh' ? '重新加载' : 'Reload'} position="bottom">
                                            <button 
                                                onClick={() => fetchTaskLog(selectedInstance)} 
                                                disabled={loadingLog}
                                                className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw size={14} className={loadingLog ? 'animate-spin' : ''} />
                                            </button>
                                        </Tooltip>
                                        <span className={`text-xs px-2 py-0.5 rounded ${getStateColor(selectedInstance.state)}`}>{selectedInstance.state}</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4">
                                    {loadingLog ? (
                                        <div className="flex items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-slate-500" /></div>
                                    ) : (
                                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">{logContent}</pre>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                {lang === 'zh' ? '← 选择一个运行实例查看日志' : '← Select an instance to view logs'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
