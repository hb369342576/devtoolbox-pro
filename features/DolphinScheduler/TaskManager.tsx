import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ListTodo, ArrowLeft, Search, Folder, Calendar, AlertCircle,
    PlayCircle, Settings, RefreshCw, CalendarClock, Plus, CheckCircle2, XCircle, Timer, User, Loader2,
    Eye, Download, Upload, Power, Clock, ChevronLeft, ChevronRight, MoreHorizontal, Tag, Copy
} from 'lucide-react';
import { Language, DolphinSchedulerConfig } from '../../types';
import { getTexts } from '../../locales';
import { Tooltip } from '../../components/ui/Tooltip';
import { useToast } from '../../components/ui/Toast';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import { exportWorkflowsToLocal, readWorkflowFromDir } from './utils';
import { ProcessDefinition } from './types';
import {
    DetailModal, RunModal, ScheduleModal, BatchRunModal, 
    BatchPublishModal, ExportModal, ImportModal, LogModal 
} from './components';

interface TaskManagerProps {
    lang: Language;
    currentProject: DolphinSchedulerConfig | null;
    configs: DolphinSchedulerConfig[];
    onSelectProject: (config: DolphinSchedulerConfig) => void;
    onNavigate: (id: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
    lang,
    currentProject,
    configs,
    onSelectProject,
    onNavigate
}) => {
    const t = getTexts(lang);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailProcess, setDetailProcess] = useState<ProcessDefinition | null>(null);
    const [runProcess, setRunProcess] = useState<ProcessDefinition | null>(null);
    const [scheduleProcess, setScheduleProcess] = useState<ProcessDefinition | null>(null);
    const [showBatchRun, setShowBatchRun] = useState(false);
    const [showBatchPublish, setShowBatchPublish] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showLog, setShowLog] = useState(false);
    
    // 分页
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;
    
    // 项目配置
    const baseUrl = currentProject?.baseUrl || '';
    const token = currentProject?.token || '';
    // 初始 projectCode 从配置中获取，后续可能由 resolveProjectCodeAndFetch 更新
    const [resolvedProjectCode, setResolvedProjectCode] = useState<string>(currentProject?.projectCode || '');
    const projectCode = resolvedProjectCode || currentProject?.projectCode || '';

    // 获取工作流列表
    const fetchProcessDefinitions = useCallback(async (projectCodeParam: string) => {
        if (!baseUrl || !token || !projectCodeParam) return;
        
        setLoading(true);
        setError(null);
        try {
            const url = `${baseUrl}/projects/${projectCodeParam}/process-definition?pageNo=${pageNo}&pageSize=${pageSize}&searchVal=${encodeURIComponent(searchTerm)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'token': token }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (result.code === 0) {
                setProcesses(result.data?.totalList || []);
                setTotal(result.data?.total || 0);
            } else {
                throw new Error(result.msg || 'Unknown error');
            }
        } catch (err: any) {
            console.error('[TaskManager] Fetch error:', err);
            setError(err.message);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, pageNo, pageSize, searchTerm, lang, toast]);

    // 解析 projectCode 并获取数据
    const resolveProjectCodeAndFetch = useCallback(async () => {
        if (!currentProject) return;
        
        let code = currentProject.projectCode;
        
        // 如果没有 projectCode，尝试通过 projectName 获取
        if (!code && currentProject.projectName) {
            try {
                const listUrl = `${currentProject.baseUrl}/projects?pageNo=1&pageSize=100&searchVal=${encodeURIComponent(currentProject.projectName)}`;
                const response = await fetch(listUrl, {
                    method: 'GET',
                    headers: { 'token': currentProject.token }
                });
                const result = await response.json();
                if (result.code === 0 && result.data?.totalList) {
                    const project = result.data.totalList.find((p: any) => p.name === currentProject.projectName);
                    if (project) {
                        code = String(project.code);
                    }
                }
            } catch (err) {
                console.error('[TaskManager] Failed to resolve projectCode:', err);
            }
        }
        
        if (code) {
            setResolvedProjectCode(code); // 保存解析后的 projectCode
            fetchProcessDefinitions(code);
        }
    }, [currentProject, fetchProcessDefinitions]);

    useEffect(() => {
        if (currentProject) {
            // 重置解析的 projectCode
            setResolvedProjectCode(currentProject.projectCode || '');
            resolveProjectCodeAndFetch();
        } else {
            setResolvedProjectCode('');
        }
    }, [currentProject, pageNo, searchTerm]);

    // 刷新
    const handleRefresh = () => {
        if (projectCode) {
            fetchProcessDefinitions(projectCode);
        } else {
            resolveProjectCodeAndFetch();
        }
    };

    // 切换上下线状态
    const handleToggleOnline = async (process: ProcessDefinition) => {
        const newState = process.releaseState === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        try {
            // DolphinScheduler API: POST /projects/{projectCode}/process-definition/{code}/release
            const url = `${baseUrl}/projects/${projectCode}/process-definition/${process.code}/release`;
            console.log('[DolphinScheduler] Toggle online URL:', url, 'newState:', newState);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'token': token, 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: `releaseState=${newState}`
            });
            
            const responseText = await response.text();
            console.log('[DolphinScheduler] Toggle response:', response.status, responseText.substring(0, 200));
            
            // 检查是否返回了 HTML（表示 URL 错误）
            if (responseText.trim().startsWith('<')) {
                throw new Error(`API 返回 HTML 页面，请检查 API 地址是否正确。URL: ${url}`);
            }
            
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '操作成功' : 'Success', variant: 'success' });
                handleRefresh();
            } else {
                throw new Error(result.msg);
            }
        } catch (err: any) {
            console.error('[DolphinScheduler] Toggle error:', err);
            toast({ title: lang === 'zh' ? '操作失败' : 'Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 复制工作流
    const handleCopyWorkflow = async (process: ProcessDefinition) => {
        try {
            const url = `${baseUrl}/projects/${projectCode}/process-definition/${process.code}/copy`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `targetProjectCode=${projectCode}`
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '复制成功' : 'Copy Success', variant: 'success' });
                handleRefresh();
            } else {
                throw new Error(result.msg);
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '复制失败' : 'Copy Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 导出单个工作流
    const handleExportSingle = async (process: ProcessDefinition) => {
        try {
            const savePath = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择导出目录' : 'Select Export Directory'
            });
            
            if (!savePath) return;
            
            const count = await exportWorkflowsToLocal(
                [{ code: process.code, name: process.name }],
                projectCode,
                baseUrl,
                token,
                savePath as string,
                process.name,
                () => {}
            );
            
            toast({ title: lang === 'zh' ? `导出成功` : `Export Success`, variant: 'success' });
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '导出失败' : 'Export Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 导入到当前工作流
    const handleImportSingle = async (process: ProcessDefinition) => {
        try {
            const dirPath = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择导入目录' : 'Select Import Directory'
            });
            
            if (!dirPath) return;
            
            const workflow = await readWorkflowFromDir(dirPath as string);
            
            if (!workflow) {
                toast({ title: lang === 'zh' ? '未找到 workflow.json' : 'workflow.json not found', variant: 'destructive' });
                return;
            }
            
            // 检查工作流状态
            if (process.releaseState === 'ONLINE') {
                toast({ 
                    title: lang === 'zh' ? '请先下线工作流' : 'Please unpublish the workflow first', 
                    variant: 'destructive' 
                });
                return;
            }
            
            toast({ title: lang === 'zh' ? '导入功能开发中...' : 'Import feature coming soon...', variant: 'default' });
            
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '导入失败' : 'Import Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 渲染状态标签
    const renderStateTag = (state: 'ONLINE' | 'OFFLINE') => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            state === 'ONLINE' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
            {state === 'ONLINE' ? <CheckCircle2 size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
            {state}
        </span>
    );

    // 分页信息
    const totalPages = Math.ceil(total / pageSize);
    const filteredProcesses = processes;

    if (!currentProject) {
        return (
            <div className="h-full flex flex-col">
                {/* 头部 */}
                <div className="flex justify-between items-center mb-6 pt-1.5">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-blue-600" size={24} />
                        {lang === 'zh' ? '任务管理' : 'Task Manager'}
                    </h2>
                </div>
                
                {/* 项目卡片网格 */}
                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {/* 已配置的项目卡片 */}
                        {configs.map(config => (
                            <div
                                key={config.id}
                                onClick={() => onSelectProject(config)}
                                className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        <CalendarClock size={24} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{config.name}</h3>
                                <div className="space-y-1.5">
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span className="w-20 text-xs font-bold uppercase opacity-70">Project</span>
                                        <span className="truncate">{config.projectName || '-'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span className="w-20 text-xs font-bold uppercase opacity-70">URL</span>
                                        <span className="truncate font-mono text-xs">{config.baseUrl}</span>
                                    </div>
                                </div>
                                {/* 悬浮提示 */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                            </div>
                        ))}
                        
                        {/* 新增项目卡片 */}
                        <div
                            onClick={() => onNavigate('dolphin-project')}
                            className="group relative bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                        >
                            <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 dark:group-hover:bg-blue-900/50 dark:group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110 mb-3">
                                <Plus size={28} />
                            </div>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {lang === 'zh' ? '添加项目' : 'Add Project'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {configs.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-8">
                        <ListTodo size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">{lang === 'zh' ? '暂无已配置的项目，请先添加项目' : 'No projects configured. Please add a project first.'}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-6 pt-1.5">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => onSelectProject(null as any)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                        title={lang === 'zh' ? '返回项目列表' : 'Back to Projects'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-blue-600" />
                        {lang === 'zh' ? '任务管理' : 'Task Manager'}
                        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-base font-normal text-slate-600 dark:text-slate-300">
                            {currentProject.name}
                        </span>
                    </h2>
                </div>
                
                {/* 操作按钮和搜索框 */}
                <div className="flex items-center space-x-3">
                    {/* 搜索框 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={lang === 'zh' ? '搜索工作流...' : 'Search...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                        {lang === 'zh' ? `${total} 个` : `${total} total`}
                    </span>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                        <button onClick={handleRefresh} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </Tooltip>
                    <Tooltip content={lang === 'zh' ? '批量运行' : 'Batch Run'} position="bottom">
                        <button onClick={() => setShowBatchRun(true)} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg text-orange-600">
                            <PlayCircle size={18} />
                        </button>
                    </Tooltip>
                    <Tooltip content={lang === 'zh' ? '批量上下线' : 'Batch Publish'} position="bottom">
                        <button onClick={() => setShowBatchPublish(true)} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-green-600">
                            <Power size={18} />
                        </button>
                    </Tooltip>
                    <Tooltip content={lang === 'zh' ? '导出' : 'Export'} position="bottom">
                        <button onClick={() => setShowExport(true)} className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-purple-600">
                            <Download size={18} />
                        </button>
                    </Tooltip>
                    <Tooltip content={lang === 'zh' ? '导入' : 'Import'} position="bottom">
                        <button onClick={() => setShowImport(true)} className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-purple-600">
                            <Upload size={18} />
                        </button>
                    </Tooltip>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <Tooltip content={lang === 'zh' ? '运行日志' : 'Run Logs'} position="bottom">
                        <button onClick={() => setShowLog(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                            <Eye size={18} />
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            {/* 表格 */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {loading && processes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-red-500">
                        <AlertCircle size={24} className="mr-2" />
                        {error}
                    </div>
                ) : filteredProcesses.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <ListTodo size={48} className="mr-4 opacity-20" />
                        {lang === 'zh' ? '暂无工作流' : 'No workflows found'}
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                    <tr className="text-left text-slate-500 dark:text-slate-400">
                                        <th className="px-4 py-3 font-medium">{lang === 'zh' ? '名称' : 'Name'}</th>
                                        <th className="px-4 py-3 font-medium w-20">{lang === 'zh' ? '版本' : 'Ver'}</th>
                                        <th className="px-4 py-3 font-medium w-24">{lang === 'zh' ? '状态' : 'State'}</th>
                                        <th className="px-4 py-3 font-medium w-24">{lang === 'zh' ? '调度' : 'Schedule'}</th>
                                        <th className="px-4 py-3 font-medium w-32">{lang === 'zh' ? '修改人' : 'Modified'}</th>
                                        <th className="px-4 py-3 font-medium w-40">{lang === 'zh' ? '更新时间' : 'Updated'}</th>
                                        <th className="px-4 py-3 font-medium w-48 text-right">{lang === 'zh' ? '操作' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProcesses.map(process => (
                                        <tr key={process.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <button 
                                                    onClick={() => setDetailProcess(process)}
                                                    className="font-medium text-slate-800 dark:text-white hover:text-blue-600 text-left"
                                                >
                                                    {process.name}
                                                </button>
                                                {process.description && (
                                                    <p className="text-xs text-slate-400 truncate max-w-xs">{process.description}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">v{process.version}</td>
                                            <td className="px-4 py-3">{renderStateTag(process.releaseState)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    process.scheduleReleaseState === 'ONLINE'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                    {process.scheduleReleaseState || 'NONE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                                {process.userName || process.modifyBy || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                                {new Date(process.updateTime).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <Tooltip content={lang === 'zh' ? '运行' : 'Run'} position="top">
                                                        <button
                                                            onClick={() => setRunProcess(process)}
                                                            disabled={process.releaseState !== 'ONLINE'}
                                                            className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <PlayCircle size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={lang === 'zh' ? '调度' : 'Schedule'} position="top">
                                                        <button
                                                            onClick={() => setScheduleProcess(process)}
                                                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600"
                                                        >
                                                            <Timer size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={process.releaseState === 'ONLINE' ? (lang === 'zh' ? '下线' : 'Unpublish') : (lang === 'zh' ? '上线' : 'Publish')} position="top">
                                                        <button
                                                            onClick={() => handleToggleOnline(process)}
                                                            className={`p-1.5 rounded ${process.releaseState === 'ONLINE' ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600'}`}
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={lang === 'zh' ? '复制' : 'Copy'} position="top">
                                                        <button
                                                            onClick={() => handleCopyWorkflow(process)}
                                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={lang === 'zh' ? '导出' : 'Export'} position="top">
                                                        <button
                                                            onClick={() => handleExportSingle(process)}
                                                            className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={lang === 'zh' ? '导入' : 'Import'} position="top">
                                                        <button
                                                            onClick={() => handleImportSingle(process)}
                                                            className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600"
                                                        >
                                                            <Upload size={16} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                <span className="text-sm text-slate-500">
                                    {lang === 'zh' ? `第 ${pageNo} 页 / 共 ${totalPages} 页` : `Page ${pageNo} of ${totalPages}`}
                                </span>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setPageNo(p => Math.max(1, p - 1))}
                                        disabled={pageNo === 1}
                                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                                        disabled={pageNo === totalPages}
                                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* Modal 组件 */}
            {detailProcess && (
                <DetailModal
                    process={detailProcess}
                    lang={lang}
                    onClose={() => setDetailProcess(null)}
                />
            )}
            
            {runProcess && (
                <RunModal
                    process={runProcess}
                    lang={lang}
                    projectCode={projectCode}
                    baseUrl={baseUrl}
                    token={token}
                    onClose={() => setRunProcess(null)}
                    onSuccess={handleRefresh}
                />
            )}
            
            {scheduleProcess && (
                <ScheduleModal
                    process={scheduleProcess}
                    lang={lang}
                    projectCode={projectCode}
                    baseUrl={baseUrl}
                    token={token}
                    onClose={() => setScheduleProcess(null)}
                    onSuccess={handleRefresh}
                />
            )}
            
            <BatchRunModal
                show={showBatchRun}
                lang={lang}
                processes={processes}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                onClose={() => setShowBatchRun(false)}
                onSuccess={handleRefresh}
            />
            
            <BatchPublishModal
                show={showBatchPublish}
                lang={lang}
                processes={processes}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                onClose={() => setShowBatchPublish(false)}
                onSuccess={handleRefresh}
            />
            
            <ExportModal
                show={showExport}
                lang={lang}
                processes={processes}
                projectCode={projectCode}
                projectName={currentProject?.projectName || currentProject?.name || ''}
                baseUrl={baseUrl}
                token={token}
                onClose={() => setShowExport(false)}
            />
            
            <ImportModal
                show={showImport}
                lang={lang}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                processes={processes}
                onClose={() => setShowImport(false)}
                onSuccess={handleRefresh}
            />
            
            <LogModal
                show={showLog}
                lang={lang}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                onClose={() => setShowLog(false)}
            />
        </div>
    );
};
