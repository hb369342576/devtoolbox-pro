import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    ListTodo, ArrowLeft, Search, Folder, Calendar, AlertCircle,
    PlayCircle, Settings, RefreshCw, CalendarClock, Plus, CheckCircle2, XCircle, Timer, User, Loader2,
    Eye, Download, Upload, Power, Clock, ChevronLeft, ChevronRight, MoreHorizontal, Tag, Copy, Edit, Container,
    Trash2, StopCircle, AlignJustify
} from 'lucide-react';
import { Language, DolphinSchedulerConfig, DolphinSchedulerApiVersion } from '../../types';
import { getTexts } from '../../locales';
import { Tooltip } from '../../components/ui/Tooltip';
import { useToast } from '../../components/ui/Toast';
import { save, open } from '@tauri-apps/plugin-dialog';
import { httpFetch } from '../../utils/http';
import { readDir } from '@tauri-apps/plugin-fs';
import { exportWorkflowsToLocal, readWorkflowFromDir, getWorkflowApiPath, importWorkflowToDS, createK8sWorkflow } from './utils';
import { ProcessDefinition } from './types';
import {
    DetailModal, RunModal, ScheduleModal, BatchRunModal, 
    BatchPublishModal, ExportModal, ImportModal, LogModal, TaskEditor,
    GlobalSettingsModal, DEFAULT_CONFIG_KEY, defaultSettingsTemplate
} from './components';

interface TaskManagerProps {
    lang: Language;
    currentProject: DolphinSchedulerConfig | null;
    configs: DolphinSchedulerConfig[];
    onSelectProject: (config: DolphinSchedulerConfig) => void;
    onNavigate: (id: string) => void;
    onBack?: () => void; // 可选：返回上级（DS管理模式）
}

export const TaskManager: React.FC<TaskManagerProps> = ({
    lang,
    currentProject,
    configs,
    onSelectProject,
    onNavigate,
    onBack
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
    const [editProcess, setEditProcess] = useState<ProcessDefinition | null>(null);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    
    // 新建 K8S 工作流
    const [showCreateK8s, setShowCreateK8s] = useState(false);
    const [createK8sName, setCreateK8sName] = useState('');
    const [createK8sConfigPath, setCreateK8sConfigPath] = useState('smart_cloud_pro/');
    const [createK8sDatasource, setCreateK8sDatasource] = useState(1);
    const [createK8sImage, setCreateK8sImage] = useState('registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204');
    const [createK8sNamespace, setCreateK8sNamespace] = useState('{"name":"default","cluster":"k8s-Security-Cluster-admin"}');
    const [createK8sEnvCode, setCreateK8sEnvCode] = useState(164447603311488);
    const [createK8sTimeoutFlag, setCreateK8sTimeoutFlag] = useState(true);
    const [createK8sTimeout, setCreateK8sTimeout] = useState(10);
    const [createK8sTimeoutWarn, setCreateK8sTimeoutWarn] = useState(false);
    const [createK8sTimeoutFail, setCreateK8sTimeoutFail] = useState(true);
    const [createK8sRetryTimes, setCreateK8sRetryTimes] = useState(3);
    const [createK8sRetryInterval, setCreateK8sRetryInterval] = useState(1);
    const [creatingK8s, setCreatingK8s] = useState(false);

    // 资源中心文件浏览
    const [showResourceBrowser, setShowResourceBrowser] = useState(false);
    const [resourceBrowserPath, setResourceBrowserPath] = useState('');
    const [resourceBrowserFiles, setResourceBrowserFiles] = useState<any[]>([]);
    const [resourceBrowserLoading, setResourceBrowserLoading] = useState(false);
    const [resourceBrowserHistory, setResourceBrowserHistory] = useState<{name: string; path: string}[]>([{name: '根目录', path: ''}]);
    const [resourceBrowserSearch, setResourceBrowserSearch] = useState('');
    
    // 单个导出版本选择
    const [exportSingleProcess, setExportSingleProcess] = useState<ProcessDefinition | null>(null);
    const [exportSingleVersion, setExportSingleVersion] = useState<DolphinSchedulerApiVersion>('v3.2');
    const [exportingSingle, setExportingSingle] = useState(false);
    
    // Tab 导航
    type TabType = 'workflow-definition' | 'workflow-instance' | 'workflow-schedule' | 'task-instance';
    const [activeTab, setActiveTab] = useState<TabType>('workflow-definition');

    // 工作流实例
    const [processInstances, setProcessInstances] = useState<any[]>([]);
    const [instanceLoading, setInstanceLoading] = useState(false);
    const [instancePageNo, setInstancePageNo] = useState(1);
    const [instancePageSize, setInstancePageSize] = useState(20);
    const [instanceTotal, setInstanceTotal] = useState(0);
    const [instanceStateFilter, setInstanceStateFilter] = useState('');
    const [instanceDeleting, setInstanceDeleting] = useState(false);
    const [instanceSearchTerm, setInstanceSearchTerm] = useState('');
    const [selectedInstances, setSelectedInstances] = useState<Set<number>>(new Set());
    const [instanceLogId, setInstanceLogId] = useState<number | null>(null);
    const [instanceLogContent, setInstanceLogContent] = useState('');
    const [instanceLogLoading, setInstanceLogLoading] = useState(false);

    // 工作流定时
    const [schedules, setSchedules] = useState<any[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [schedulePageNo, setSchedulePageNo] = useState(1);
    const [schedulePageSize, setSchedulePageSize] = useState(20);
    const [scheduleTotal, setScheduleTotal] = useState(0);
    const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');

    // 任务实例
    const [taskInstances, setTaskInstances] = useState<any[]>([]);
    const [taskInstanceLoading, setTaskInstanceLoading] = useState(false);
    const [taskInstancePageNo, setTaskInstancePageNo] = useState(1);
    const [taskInstancePageSize, setTaskInstancePageSize] = useState(20);
    const [taskInstanceTotal, setTaskInstanceTotal] = useState(0);
    const [taskInstanceSearchTerm, setTaskInstanceSearchTerm] = useState('');
    const [taskInstanceStateFilter, setTaskInstanceStateFilter] = useState('');
    const [taskLogId, setTaskLogId] = useState<number | null>(null);
    const [taskLogContent, setTaskLogContent] = useState('');
    const [taskLogLoading, setTaskLogLoading] = useState(false);
    const [taskLogName, setTaskLogName] = useState('');

    // 分页
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    
    // 全局默认配置 - 从 localStorage 加载并支持灵活扩展

    const [globalSettings, setGlobalSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            return {
                ...defaultSettingsTemplate,
                ...parsed,
                common: {
                    ...defaultSettingsTemplate.common,
                    ...(parsed.common || {})
                },
                nodes: {
                    k8s: { ...defaultSettingsTemplate.nodes?.k8s, ...(parsed.nodes?.k8s || {}) },
                    sql: { ...defaultSettingsTemplate.nodes?.sql, ...(parsed.nodes?.sql || {}) }
                }
            };
        } catch {
            return defaultSettingsTemplate;
        }
    });
    
    const [showConfigModal, setShowConfigModal] = useState(false);

    const handleCreateK8sClick = () => {
        // 使用保存的配置或默认配置
        const commonConfig = globalSettings.common;
        
        // 提取项目名称作为默认路径（追加反斜杠）
        const projectName = currentProject?.projectName || currentProject?.name || '';
        const defaultPath = projectName ? `${projectName}/` : 'smart_cloud_pro/';
        
        // 设置默认值
        setCreateK8sConfigPath(defaultPath);
        setCreateK8sTimeout(commonConfig.timeout);
        setCreateK8sRetryTimes(commonConfig.retryTimes);
        setCreateK8sRetryInterval(commonConfig.retryInterval);
        
        setShowCreateK8s(true);
    };

    // 列宽配置 - 从 localStorage 加载
    const COLUMN_WIDTHS_KEY = 'dolphin_task_manager_column_widths';
    const defaultColumnWidths = {
        name: 300,
        version: 60,
        state: 80,
        schedule: 80,
        updatedTime: 150,
        actions: 180
    };
    
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
            if (saved) {
                return { ...defaultColumnWidths, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('[TaskManager] Failed to load column widths:', e);
        }
        return defaultColumnWidths;
    });

    
    // 保存列宽到 localStorage
    const saveColumnWidths = useCallback((widths: Record<string, number>) => {
        try {
            localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
        } catch (e) {
            console.error('[TaskManager] Failed to save column widths:', e);
        }
    }, []);
    
    // 拖拽调整列宽
    const resizingRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);
    
    const handleResizeStart = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        resizingRef.current = {
            column,
            startX: e.clientX,
            startWidth: columnWidths[column] || 100
        };
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = moveEvent.clientX - resizingRef.current.startX;
            const newWidth = Math.max(50, resizingRef.current.startWidth + delta);
            setColumnWidths(prev => {
                const updated = { ...prev, [resizingRef.current!.column]: newWidth };
                return updated;
            });
        };
        
        const handleMouseUp = () => {
            if (resizingRef.current) {
                // 保存到 localStorage
                setColumnWidths(prev => {
                    saveColumnWidths(prev);
                    return prev;
                });
            }
            resizingRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths, saveColumnWidths]);
    
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
            const apiPath = getWorkflowApiPath(currentProject?.apiVersion);
            const url = `${baseUrl}/projects/${projectCodeParam}/${apiPath}?pageNo=${pageNo}&pageSize=${pageSize}&searchVal=${encodeURIComponent(searchTerm)}`;
            const response = await httpFetch(url, {
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
                const response = await httpFetch(listUrl, {
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

    // --- 数据获取函数开始 (移至此处以解决引用顺序问题) ---

    // 获取工作流实例列表
    const fetchProcessInstances = useCallback(async (code?: string) => {
        const pc = code || projectCode;
        if (!baseUrl || !token || !pc) return;
        setInstanceLoading(true);
        try {
            const instancePath = currentProject?.apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            let url = `${baseUrl}/projects/${pc}/${instancePath}?pageNo=${instancePageNo}&pageSize=${instancePageSize}`;
            if (instanceSearchTerm) url += `&searchVal=${encodeURIComponent(instanceSearchTerm)}`;
            if (instanceStateFilter) url += `&stateType=${instanceStateFilter}`;
            console.log('[TaskManager] Fetching process instances:', url);
            const response = await httpFetch(url, { method: 'GET', headers: { 'token': token } });
            if (!response.ok) {
                const text = await response.text();
                console.error('[TaskManager] Process instances response not ok:', response.status, text.substring(0, 200));
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            if (result.code === 0) {
                setProcessInstances(result.data?.totalList || []);
                setInstanceTotal(result.data?.total || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('[TaskManager] Fetch process instances error:', err);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setInstanceLoading(false);
        }
    }, [baseUrl, token, projectCode, currentProject, instancePageNo, instancePageSize, instanceSearchTerm, instanceStateFilter, lang, toast]);

    // 获取工作流定时列表
    const fetchSchedules = useCallback(async (code?: string) => {
        const pc = code || projectCode;
        if (!baseUrl || !token || !pc) return;
        setScheduleLoading(true);
        try {
            let url = `${baseUrl}/projects/${pc}/schedules?pageNo=${schedulePageNo}&pageSize=${schedulePageSize}`;
            if (scheduleSearchTerm) url += `&searchVal=${encodeURIComponent(scheduleSearchTerm)}`;
            console.log('[TaskManager] Fetching schedules:', url);
            const response = await httpFetch(url, { method: 'GET', headers: { 'token': token } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.code === 0) {
                setSchedules(result.data?.totalList || []);
                setScheduleTotal(result.data?.total || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('[TaskManager] Fetch schedules error:', err);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setScheduleLoading(false);
        }
    }, [baseUrl, token, projectCode, schedulePageNo, schedulePageSize, scheduleSearchTerm, lang, toast]);

    // 获取任务实例列表
    const fetchTaskInstances = useCallback(async (code?: string) => {
        const pc = code || projectCode;
        if (!baseUrl || !token || !pc) return;
        setTaskInstanceLoading(true);
        try {
            let url = `${baseUrl}/projects/${pc}/task-instances?pageNo=${taskInstancePageNo}&pageSize=${taskInstancePageSize}`;
            if (taskInstanceSearchTerm) url += `&searchVal=${encodeURIComponent(taskInstanceSearchTerm)}`;
            if (taskInstanceStateFilter) url += `&stateType=${taskInstanceStateFilter}`;
            console.log('[TaskManager] Fetching task instances:', url);
            const response = await httpFetch(url, { method: 'GET', headers: { 'token': token } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.code === 0) {
                setTaskInstances(result.data?.totalList || []);
                setTaskInstanceTotal(result.data?.total || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('[TaskManager] Fetch task instances error:', err);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setTaskInstanceLoading(false);
        }
    }, [baseUrl, token, projectCode, taskInstancePageNo, taskInstancePageSize, taskInstanceSearchTerm, taskInstanceStateFilter, lang, toast]);

    // --- 数据获取函数结束 ---

    // 当项目切换或搜索/分页/Tab变化时，根据 activeTab 获取数据
    const handleRefresh = useCallback(() => {
        if (!projectCode) return;
        if (activeTab === 'workflow-definition') {
            fetchProcessDefinitions(projectCode);
        } else if (activeTab === 'workflow-instance') {
            fetchProcessInstances(projectCode);
        } else if (activeTab === 'workflow-schedule') {
            fetchSchedules(projectCode);
        } else if (activeTab === 'task-instance') {
            fetchTaskInstances(projectCode);
        }
    }, [activeTab, projectCode, fetchProcessDefinitions, fetchProcessInstances, fetchSchedules, fetchTaskInstances]);

    useEffect(() => {
        if (currentProject) {
            if (!projectCode) {
                resolveProjectCodeAndFetch();
            } else {
                handleRefresh();
            }
        } else {
            setResolvedProjectCode('');
            setProcesses([]);
        }
    }, [currentProject, projectCode, handleRefresh, resolveProjectCodeAndFetch]);

    // 当项目切换时，重置状态
    const currentProjectId = currentProject?.id;
    useEffect(() => {
        setProcesses([]);
        setProcessInstances([]);
        setSchedules([]);
        setTaskInstances([]);
        setPageNo(1);
        setInstancePageNo(1);
        setSchedulePageNo(1);
        setTaskInstancePageNo(1);
        setSearchTerm('');
        setInstanceSearchTerm('');
        setScheduleSearchTerm('');
        setTaskInstanceSearchTerm('');
        setActiveTab('workflow-definition');
    }, [currentProjectId]);

    // 新建 K8S 工作流
    const handleCreateK8s = async () => {
        if (!createK8sName.trim() || !createK8sConfigPath.trim()) return;
        setCreatingK8s(true);
        try {
            const result = await createK8sWorkflow(
                createK8sName.trim(),
                createK8sConfigPath.trim(),
                createK8sDatasource,
                createK8sImage,
                createK8sNamespace,
                createK8sEnvCode,
                createK8sTimeoutFlag,
                createK8sTimeout,
                createK8sTimeoutWarn && createK8sTimeoutFail ? 'WARNFAILED' : createK8sTimeoutWarn ? 'WARN' : 'FAILED',
                createK8sRetryTimes,
                createK8sRetryInterval,
                projectCode,
                baseUrl,
                token,
                currentProject?.apiVersion
            );
            if (result.success) {
                toast({ title: lang === 'zh' ? '创建成功' : 'Created', variant: 'success' });
                setShowCreateK8s(false);
                setCreateK8sName('');
                setCreateK8sConfigPath('smart_cloud_pro/');
                handleRefresh();
            } else {
                toast({ title: lang === 'zh' ? '创建失败' : 'Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '创建失败' : 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setCreatingK8s(false);
        }
    };

    // 切换上下线状态
    const handleToggleOnline = async (process: ProcessDefinition) => {
        const newState = process.releaseState === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        try {
            // DolphinScheduler API: POST /projects/{projectCode}/[process|workflow]-definition/{code}/release
            const apiPath = getWorkflowApiPath(currentProject?.apiVersion);
            const url = `${baseUrl}/projects/${projectCode}/${apiPath}/${process.code}/release`;
            console.log('[DolphinScheduler] Toggle online URL:', url, 'newState:', newState);
            
            const response = await httpFetch(url, {
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
            // DolphinScheduler copy API: /projects/{projectCode}/[process|workflow]-definition/batch-copy
            const apiPath = getWorkflowApiPath(currentProject?.apiVersion);
            const url = `${baseUrl}/projects/${projectCode}/${apiPath}/batch-copy`;
            console.log('[DolphinScheduler] Copy workflow URL:', url, 'codes:', process.code);
            
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 
                    'token': token, 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: `codes=${process.code}&targetProjectCode=${projectCode}`
            });
            
            const responseText = await response.text();
            console.log('[DolphinScheduler] Copy response:', response.status, responseText.substring(0, 200));
            
            if (responseText.trim().startsWith('<')) {
                throw new Error(`API 返回 HTML 页面，请检查 API 地址是否正确`);
            }
            
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '复制成功' : 'Copy Success', variant: 'success' });
                handleRefresh();
            } else {
                throw new Error(result.msg);
            }
        } catch (err: any) {
            console.error('[DolphinScheduler] Copy error:', err);
            toast({ title: lang === 'zh' ? '复制失败' : 'Copy Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 导出单个工作流 - 打开版本选择对话框
    const handleExportSingle = (process: ProcessDefinition) => {
        setExportSingleVersion(currentProject?.apiVersion || 'v3.2');
        setExportSingleProcess(process);
    };
    
    // 执行单个导出
    const doExportSingle = async () => {
        if (!exportSingleProcess) return;
        
        try {
            const savePath = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择导出目录' : 'Select Export Directory'
            });
            
            if (!savePath) return;
            
            setExportingSingle(true);
            const count = await exportWorkflowsToLocal(
                [{ code: exportSingleProcess.code, name: exportSingleProcess.name }],
                projectCode,
                baseUrl,
                token,
                savePath as string,
                exportSingleProcess.name,
                () => {},
                currentProject?.apiVersion,
                exportSingleVersion
            );
            
            toast({ title: lang === 'zh' ? `导出成功` : `Export Success`, variant: 'success' });
            setExportSingleProcess(null);
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '导出失败' : 'Export Failed', description: err.message, variant: 'destructive' });
        } finally {
            setExportingSingle(false);
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
            
            toast({ title: lang === 'zh' ? `正在导入到 ${process.name}...` : `Importing to ${process.name}...`, variant: 'default' });
            
            const result = await importWorkflowToDS(
                workflow,
                projectCode,
                baseUrl,
                token,
                currentProject?.apiVersion,
                process.code
            );
            
            if (result.success) {
                toast({ title: lang === 'zh' ? '导入成功' : 'Import Success', variant: 'success' });
                handleRefresh();
            } else {
                toast({ title: lang === 'zh' ? '导入失败' : 'Import Failed', description: result.msg, variant: 'destructive' });
            }
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

    // 实例运行状态渲染
    const renderInstanceStateTag = (state: string) => {
        const stateMap: Record<string, { color: string; label: string }> = {
            'SUCCESS': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '成功' },
            'RUNNING_EXECUTION': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: '运行中' },
            'FAILURE': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '失败' },
            'STOP': { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: '停止' },
            'PAUSE': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: '暂停' },
            'KILL': { color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', label: '终止' },
            'SUBMITTED_SUCCESS': { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', label: '已提交' },
            'DISPATCH': { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', label: '调度中' },
        };
        const info = stateMap[state] || { color: 'bg-slate-100 text-slate-500', label: state };
        return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info.color}`}>{info.label}</span>;
    };



    // 查看任务日志
    const fetchTaskLog = async (taskInstanceId: number, taskName: string) => {
        setTaskLogId(taskInstanceId);
        setTaskLogName(taskName);
        setTaskLogContent('');
        setTaskLogLoading(true);
        try {
            const url = `${baseUrl}/log/detail?taskInstanceId=${taskInstanceId}&skipLineNum=0&limit=9999`;
            const response = await httpFetch(url, { method: 'GET', headers: { 'token': token } });
            const result = await response.json();
            if (result.code === 0) {
                const data = result.data;
                let logText = '';
                if (typeof data === 'string') {
                    logText = data;
                } else if (data && typeof data.message === 'string') {
                    logText = data.message;
                } else {
                    logText = JSON.stringify(data, null, 2);
                }
                // 将 \r\n 转换为真实换行
                logText = logText.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
                setTaskLogContent(logText);
            } else {
                setTaskLogContent(`[Error] ${result.msg}`);
            }
        } catch (err: any) {
            setTaskLogContent(`[Error] ${err.message}`);
        } finally {
            setTaskLogLoading(false);
        }
    };

    // 定时上/下线
    const handleToggleSchedule = async (schedule: any) => {
        const newState = schedule.releaseState === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        try {
            const url = `${baseUrl}/projects/${projectCode}/schedules/${schedule.id}/online`;
            const body = newState === 'ONLINE' ? undefined : undefined;
            const onlineUrl = newState === 'ONLINE'
                ? `${baseUrl}/projects/${projectCode}/schedules/${schedule.id}/online`
                : `${baseUrl}/projects/${projectCode}/schedules/${schedule.id}/offline`;
            const response = await httpFetch(onlineUrl, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '操作成功' : 'Success', variant: 'success' });
                fetchSchedules();
            } else {
                toast({ title: lang === 'zh' ? '操作失败' : 'Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '操作失败' : 'Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 停止工作流实例
    const handleStopInstance = async (instanceId: number) => {
        try {
            const instancePath = currentProject?.apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            const url = `${baseUrl}/projects/${projectCode}/${instancePath}/${instanceId}`;
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'executeType=STOP'
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '已停止' : 'Stopped', variant: 'success' });
                fetchProcessInstances();
            } else {
                toast({ title: lang === 'zh' ? '停止失败' : 'Stop Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '停止失败' : 'Stop Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 删除工作流实例
    const handleDeleteInstance = async (instanceId: number) => {
        setInstanceDeleting(true);
        try {
            const instancePath = currentProject?.apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            const url = `${baseUrl}/projects/${projectCode}/${instancePath}/${instanceId}`;
            const response = await httpFetch(url, {
                method: 'DELETE',
                headers: { 'token': token }
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '已删除' : 'Deleted', variant: 'success' });
                setSelectedInstances(prev => { const n = new Set(prev); n.delete(instanceId); return n; });
                fetchProcessInstances();
            } else {
                toast({ title: lang === 'zh' ? '删除失败' : 'Delete Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '删除失败' : 'Delete Failed', description: err.message, variant: 'destructive' });
        } finally {
            setInstanceDeleting(false);
        }
    };

    // 批量删除工作流实例
    const handleBatchDeleteInstances = async () => {
        if (selectedInstances.size === 0) return;
        setInstanceDeleting(true);
        try {
            const instancePath = currentProject?.apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            const paramName = currentProject?.apiVersion === 'v3.4' ? 'workflowInstanceIds' : 'processInstanceIds';
            const ids = Array.from(selectedInstances);
            const url = `${baseUrl}/projects/${projectCode}/${instancePath}/batch-delete`;
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `${paramName}=${ids.join(',')}`
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? `已删除 ${ids.length} 个实例` : `Deleted ${ids.length} instances`, variant: 'success' });
                setSelectedInstances(new Set());
                fetchProcessInstances();
            } else {
                toast({ title: lang === 'zh' ? '批量删除失败' : 'Batch Delete Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '批量删除失败' : 'Batch Delete Failed', description: err.message, variant: 'destructive' });
        } finally {
            setInstanceDeleting(false);
        }
    };

    // 分页信息
    const totalPages = Math.ceil(total / pageSize);
    const filteredProcesses = processes;
    const instanceTotalPages = Math.ceil(instanceTotal / instancePageSize) || 1;
    const scheduleTotalPages = Math.ceil(scheduleTotal / schedulePageSize) || 1;
    const taskInstanceTotalPages = Math.ceil(taskInstanceTotal / taskInstancePageSize) || 1;


    if (!currentProject) {
        return (
            <div className="h-full flex flex-col">
                {/* 头部 */}
                <div className="flex justify-between items-center mb-6 pt-1.5">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-blue-600" size={24} />
                        {lang === 'zh' ? '项目管理' : 'Project Manager'}
                    </h2>
                </div>
                
                {/* 项目卡片网格 */}
                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    <div className="flex flex-wrap gap-6 pt-2">
                        {/* 已配置的项目卡片 */}
                        {configs.map(config => (
                            <div
                                key={config.id}
                                onClick={() => onSelectProject(config)}
                                className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] w-72"
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
            {/* 头部 - 第一行: 标题/返回 + Tab 导航 */}
            <div className="flex flex-col mb-4 pt-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => onBack ? onBack() : onSelectProject(null as any)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                            title={lang === 'zh' ? '返回项目列表' : 'Back to Projects'}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center whitespace-nowrap">
                            <ListTodo className="mr-3 text-blue-600" />
                            {lang === 'zh' ? '项目管理' : 'Project Manager'}
                            <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                            <span className="text-base font-normal text-slate-600 dark:text-slate-300">
                                {currentProject.name}
                            </span>
                        </h2>
                    </div>
                </div>

                {/* Tab 导航区域 */}
                <div className="flex items-center space-x-1 px-1 -mb-px">
                    {[
                        { id: 'workflow-definition', name: lang === 'zh' ? '工作流定义' : 'Workflow Definitions', icon: <Folder size={16} /> },
                        { id: 'workflow-instance', name: lang === 'zh' ? '工作流实例' : 'Workflow Instances', icon: <ListTodo size={16} /> },
                        { id: 'workflow-schedule', name: lang === 'zh' ? '工作流定时' : 'Workflow Schedules', icon: <Calendar size={16} /> },
                        { id: 'task-instance', name: lang === 'zh' ? '任务实例' : 'Task Instances', icon: <CheckCircle2 size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center px-4 py-2 text-sm font-medium transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* 头部 - 第二行: 操作按钮栏 (随 Tab 变化) */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    {/* 根据不同的 Tab 显示不同的操作/统计 */}
                    {activeTab === 'workflow-definition' && (
                        <>
                            <div className="relative">
                                <Tooltip content={lang === 'zh' ? '快速创建' : 'Quick Create'} position="bottom">
                                    <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600">
                                        <Plus size={18} />
                                    </button>
                                </Tooltip>
                                {showCreateMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                                        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 w-52 overflow-hidden">
                                            <button
                                                onClick={() => { setShowCreateMenu(false); handleCreateK8sClick(); }}
                                                className="w-full flex items-center px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors"
                                            >
                                                <div className="p-1.5 rounded-md bg-purple-500 text-white mr-3"><Container size={14} /></div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">K8S</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
                        </>
                    )}
                    
                    {activeTab === 'workflow-instance' && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder={lang === 'zh' ? '搜索实例...' : 'Search Instances...'}
                                    value={instanceSearchTerm}
                                    onChange={e => setInstanceSearchTerm(e.target.value)}
                                    className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <select 
                                value={instanceStateFilter} 
                                onChange={e => setInstanceStateFilter(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            >
                                <option value="">{lang === 'zh' ? '全部状态' : 'All States'}</option>
                                <option value="SUCCESS">成功</option>
                                <option value="RUNNING_EXECUTION">运行中</option>
                                <option value="FAILURE">失败</option>
                                <option value="PAUSE">暂停</option>
                                <option value="STOP">停止</option>
                            </select>
                        </>
                    )}

                    {activeTab === 'workflow-schedule' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={lang === 'zh' ? '搜索定时...' : 'Search Schedules...'}
                                value={scheduleSearchTerm}
                                onChange={e => setScheduleSearchTerm(e.target.value)}
                                className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    )}

                    {activeTab === 'task-instance' && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder={lang === 'zh' ? '搜索任务实例...' : 'Search Task Instances...'}
                                    value={taskInstanceSearchTerm}
                                    onChange={e => setTaskInstanceSearchTerm(e.target.value)}
                                    className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <select 
                                value={taskInstanceStateFilter} 
                                onChange={e => setTaskInstanceStateFilter(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            >
                                <option value="">{lang === 'zh' ? '全部状态' : 'All States'}</option>
                                <option value="SUCCESS">成功</option>
                                <option value="RUNNING_EXECUTION">运行中</option>
                                <option value="FAILURE">失败</option>
                            </select>
                        </>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                        <button onClick={handleRefresh} disabled={loading || instanceLoading || scheduleLoading || taskInstanceLoading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50">
                            <RefreshCw size={18} className={(loading || instanceLoading || scheduleLoading || taskInstanceLoading) ? 'animate-spin' : ''} />
                        </button>
                    </Tooltip>
                    
                    <Tooltip content={lang === 'zh' ? '参数设置' : 'Settings'} position="bottom">
                        <button onClick={() => setShowConfigModal(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                            <Settings size={18} />
                        </button>
                    </Tooltip>

                        {activeTab === 'workflow-definition' && (
                        <>
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
                        </>
                    )}

                    {activeTab === 'workflow-instance' && selectedInstances.size > 0 && (
                        <Tooltip content={lang === 'zh' ? `批量删除 (${selectedInstances.size})` : `Batch Delete (${selectedInstances.size})`} position="bottom">
                            <button onClick={handleBatchDeleteInstances} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600">
                                <Trash2 size={18} />
                            </button>
                        </Tooltip>
                    )}                    
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <Tooltip content={lang === 'zh' ? '运行日志' : 'Run Logs'} position="bottom">
                        <button onClick={() => setShowLog(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                            <Eye size={18} />
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            {/* 主内容区域 - 根据 activeTab 分发渲染 */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {/* 1. 工作流定义 Tab */}
                {activeTab === 'workflow-definition' && (
                    <div className="flex-1 flex flex-col min-h-0">
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
                            <div className="overflow-auto flex-1 min-h-0">
                                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '50px' }} />
                                        <col style={{ width: columnWidths.name }} />
                                        <col style={{ width: columnWidths.version }} />
                                        <col style={{ width: columnWidths.state }} />
                                        <col style={{ width: columnWidths.schedule }} />
                                        <col style={{ width: columnWidths.actions }} />
                                        <col />
                                    </colgroup>
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                        <tr className="text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            <th className="px-2 py-3 font-medium w-12 text-center">#</th>
                                            <th className="px-4 py-3 font-medium relative text-left">
                                                {lang === 'zh' ? '名称' : 'Name'}
                                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'name')} />
                                            </th>
                                            <th className="px-4 py-3 font-medium relative">
                                                {lang === 'zh' ? '版本' : 'Ver'}
                                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'version')} />
                                            </th>
                                            <th className="px-4 py-3 font-medium relative">
                                                {lang === 'zh' ? '状态' : 'State'}
                                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'state')} />
                                            </th>
                                            <th className="px-4 py-3 font-medium relative">
                                                {lang === 'zh' ? '调度' : 'Schedule'}
                                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'schedule')} />
                                            </th>
                                            <th className="px-4 py-3 font-medium relative">
                                                {lang === 'zh' ? '操作' : 'Actions'}
                                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'actions')} />
                                            </th>
                                            <th className="px-4 py-3 font-medium">{lang === 'zh' ? '更新时间' : 'Updated'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredProcesses.map((process, index) => (
                                            <tr key={process.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="px-2 py-3 text-center text-slate-400 text-xs">{(pageNo - 1) * pageSize + index + 1}</td>
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
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Tooltip content={lang === 'zh' ? '编辑' : 'Edit'} position="top">
                                                            <button onClick={() => setEditProcess(process)} className="p-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded text-cyan-600">
                                                                <Edit size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content={lang === 'zh' ? '运行' : 'Run'} position="top">
                                                            <button onClick={() => setRunProcess(process)} disabled={process.releaseState !== 'ONLINE'} className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded text-orange-600 disabled:opacity-30">
                                                                <PlayCircle size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content={lang === 'zh' ? '定时' : 'Schedule'} position="top">
                                                            <button onClick={() => setScheduleProcess(process)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600">
                                                                <Timer size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content={process.releaseState === 'ONLINE' ? '下线' : '上线'} position="top">
                                                            <button onClick={() => handleToggleOnline(process)} className={`p-1.5 rounded ${process.releaseState === 'ONLINE' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                                <Power size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                                    {new Date(process.updateTime).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* 底部分页 - 始终显示 */}
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                            <div className="flex items-center space-x-2 text-slate-500">
                                <span>共 {total} 条 · 每页</span>
                                {[20, 50, 100].map(size => (
                                    <button key={size} onClick={() => { setPageSize(size); setPageNo(1); }}
                                        className={`px-2 py-0.5 rounded text-xs border ${pageSize === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                    >{size}</button>
                                ))}
                                <span>条</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setPageNo(p => Math.max(1, p - 1))} disabled={pageNo === 1} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                                <span>{pageNo} / {totalPages || 1}</span>
                                <button onClick={() => setPageNo(p => Math.min(totalPages || 1, p + 1))} disabled={pageNo === (totalPages || 1)} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 工作流实例 Tab */}
                {activeTab === 'workflow-instance' && (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {/* 删除中遮罩 */}
                        {instanceDeleting && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg transition-opacity duration-300">
                                <Loader2 size={36} className="animate-spin text-white mb-3" />
                                <span className="text-white text-sm font-medium">删除中...</span>
                            </div>
                        )}
                        {/* 内容区：加载/空/表格 */}
                        {instanceLoading ? (
                            <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : processInstances.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400">暂无实例</div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                                <table className="w-full text-sm min-w-[1200px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                        <tr className="text-slate-500 text-xs whitespace-nowrap">
                                            <th className="px-2 py-3 text-center w-10">
                                                <input type="checkbox"
                                                    checked={selectedInstances.size === processInstances.length && processInstances.length > 0}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedInstances(new Set(processInstances.map(i => i.id)));
                                                        } else {
                                                            setSelectedInstances(new Set());
                                                        }
                                                    }}
                                                    className="rounded border-slate-300"
                                                />
                                            </th>
                                            <th className="px-2 py-3 text-center w-12">#</th>
                                            <th className="px-3 py-3 text-left min-w-[200px]">工作流实例名称</th>
                                            <th className="px-3 py-3 text-center w-24">状态</th>
                                            <th className="px-3 py-3 text-center w-24">运行类型</th>
                                            <th className="px-3 py-3 text-center w-40">调度时间</th>
                                            <th className="px-3 py-3 text-center w-40">开始时间</th>
                                            <th className="px-3 py-3 text-center w-40">结束时间</th>
                                            <th className="px-3 py-3 text-center w-20">运行时长</th>
                                            <th className="px-3 py-3 text-center w-16">运行次数</th>
                                            <th className="px-3 py-3 text-center w-16">容错标识</th>
                                            <th className="px-3 py-3 text-center w-16">空跑标识</th>
                                            <th className="px-3 py-3 text-center w-20">执行用户</th>
                                            <th className="px-3 py-3 text-center w-24">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {processInstances.map((inst, idx) => (
                                            <tr key={inst.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedInstances.has(inst.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                <td className="px-2 py-2.5 text-center">
                                                    <input type="checkbox"
                                                        checked={selectedInstances.has(inst.id)}
                                                        onChange={e => {
                                                            const next = new Set(selectedInstances);
                                                            if (e.target.checked) next.add(inst.id); else next.delete(inst.id);
                                                            setSelectedInstances(next);
                                                        }}
                                                        className="rounded border-slate-300"
                                                    />
                                                </td>
                                                <td className="px-2 py-2.5 text-center text-slate-400 text-xs">{inst.id}</td>
                                                <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[300px]" title={inst.name}>{inst.name}</td>
                                                <td className="px-3 py-2.5 text-center">{renderInstanceStateTag(inst.state)}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.commandType === 'SCHEDULER' ? '调度执行' : inst.commandType === 'START_PROCESS' ? '手动执行' : inst.commandType || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono">{inst.scheduleTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono">{inst.startTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono">{inst.endTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.duration || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.runTimes ?? '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.recovery === 'NO' ? 'NO' : inst.recovery || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.dryRun === 0 ? 'NO' : 'YES'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{inst.executorName || '-'}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        {(inst.state === 'RUNNING_EXECUTION' || inst.state === 'READY_PAUSE' || inst.state === 'READY_STOP') && (
                                                            <Tooltip content="停止" position="top">
                                                                <button onClick={() => handleStopInstance(inst.id)} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded text-orange-600">
                                                                    <StopCircle size={15} />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip content="删除" position="top">
                                                            <button onClick={() => handleDeleteInstance(inst.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* 底部分页 - 始终显示 */}
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                            <div className="flex items-center space-x-2 text-slate-500">
                                <span>共 {instanceTotal} 条 · 每页</span>
                                {[20, 50, 100].map(size => (
                                    <button key={size} onClick={() => { setInstancePageSize(size); setInstancePageNo(1); }}
                                        className={`px-2 py-0.5 rounded text-xs border ${instancePageSize === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                    >{size}</button>
                                ))}
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="自定义"
                                    defaultValue={![20, 50, 100].includes(instancePageSize) ? instancePageSize : ''}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const v = parseInt((e.target as HTMLInputElement).value);
                                            if (v > 0) { setInstancePageSize(v); setInstancePageNo(1); }
                                        }
                                    }}
                                    onBlur={e => {
                                        const v = parseInt(e.target.value);
                                        if (v > 0) { setInstancePageSize(v); setInstancePageNo(1); }
                                    }}
                                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none text-center"
                                />
                                <span>条</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setInstancePageNo(p => Math.max(1, p - 1))} disabled={instancePageNo === 1} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                                <span>{instancePageNo} / {instanceTotalPages}</span>
                                <button onClick={() => setInstancePageNo(p => Math.min(instanceTotalPages, p + 1))} disabled={instancePageNo === instanceTotalPages} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. 工作流定时 Tab */}
                {activeTab === 'workflow-schedule' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {scheduleLoading ? (
                            <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : schedules.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400">暂无定时</div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent [&::-webkit-scrollbar-corner]:bg-transparent">
                                <table className="w-full text-sm min-w-[1400px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                        <tr className="text-slate-500 text-xs whitespace-nowrap">
                                            <th className="px-3 py-3 text-center w-12">#</th>
                                            <th className="px-3 py-3 text-left min-w-[180px]">工作流名称</th>
                                            <th className="px-3 py-3 text-center">开始时间</th>
                                            <th className="px-3 py-3 text-center">结束时间</th>
                                            <th className="px-3 py-3 text-center">Crontab</th>
                                            <th className="px-3 py-3 text-center">失败策略</th>
                                            <th className="px-3 py-3 text-center">状态</th>
                                            <th className="px-3 py-3 text-center">Worker分组</th>
                                            <th className="px-3 py-3 text-center">租户</th>
                                            <th className="px-3 py-3 text-center">环境名称</th>
                                            <th className="px-3 py-3 text-center">创建时间</th>
                                            <th className="px-3 py-3 text-center">更新时间</th>
                                            <th className="px-3 py-3 text-center w-24">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {schedules.map((sch, idx) => (
                                            <tr key={sch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{idx + 1}</td>
                                                <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[250px]" title={sch.workflowDefinitionName || sch.processDefinitionName}>{sch.workflowDefinitionName || sch.processDefinitionName}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.startTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.endTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs font-mono text-slate-500">{sch.crontab || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{sch.failureStrategy === 'CONTINUE' ? '继续' : sch.failureStrategy === 'END' ? '结束' : sch.failureStrategy || '-'}</td>
                                                <td className="px-3 py-2.5 text-center">{renderStateTag(sch.releaseState)}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{sch.workerGroup || 'default'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{sch.tenantCode || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{sch.environmentName || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.createTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.updateTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Tooltip content={sch.releaseState === 'ONLINE' ? '下线' : '上线'} position="top">
                                                            <button onClick={() => handleToggleSchedule(sch)} className={`p-1 rounded ${sch.releaseState === 'ONLINE' ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500'}`}>
                                                                <Power size={15} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* 底部分页 - 始终显示 */}
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                            <div className="flex items-center space-x-2 text-slate-500">
                                <span>共 {scheduleTotal} 条 · 每页</span>
                                {[20, 50, 100].map(size => (
                                    <button key={size} onClick={() => { setSchedulePageSize(size); setSchedulePageNo(1); }}
                                        className={`px-2 py-0.5 rounded text-xs border ${schedulePageSize === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                    >{size}</button>
                                ))}
                                <span>条</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setSchedulePageNo(p => Math.max(1, p - 1))} disabled={schedulePageNo === 1} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                                <span>{schedulePageNo} / {scheduleTotalPages}</span>
                                <button onClick={() => setSchedulePageNo(p => Math.min(scheduleTotalPages, p + 1))} disabled={schedulePageNo === scheduleTotalPages} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. 任务实例 Tab */}
                {activeTab === 'task-instance' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {taskInstanceLoading ? (
                            <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : taskInstances.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400">暂无任务</div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent [&::-webkit-scrollbar-corner]:bg-transparent">
                                <table className="w-full text-sm min-w-[1500px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                        <tr className="text-slate-500 text-xs whitespace-nowrap">
                                            <th className="px-3 py-3 text-center w-12">#</th>
                                            <th className="px-3 py-3 text-left min-w-[180px]">任务名称</th>
                                            <th className="px-3 py-3 text-left min-w-[200px]">工作流实例</th>
                                            <th className="px-3 py-3 text-center">执行用户</th>
                                            <th className="px-3 py-3 text-center">节点类型</th>
                                            <th className="px-3 py-3 text-center">状态</th>
                                            <th className="px-3 py-3 text-center">提交时间</th>
                                            <th className="px-3 py-3 text-center">开始时间</th>
                                            <th className="px-3 py-3 text-center">结束时间</th>
                                            <th className="px-3 py-3 text-center">运行时长</th>
                                            <th className="px-3 py-3 text-center">重试次数</th>
                                            <th className="px-3 py-3 text-center">空跑标识</th>
                                            <th className="px-3 py-3 text-left">主机</th>
                                            <th className="px-3 py-3 text-center w-20">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {taskInstances.map((ti, idx) => (
                                            <tr key={ti.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{(taskInstancePageNo - 1) * taskInstancePageSize + idx + 1}</td>
                                                <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[250px]" title={ti.name}>{ti.name}</td>
                                                <td className="px-3 py-2.5 text-slate-500 text-xs truncate max-w-[280px]" title={ti.workflowInstanceName || ti.processInstanceName}>{ti.workflowInstanceName || ti.processInstanceName || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{ti.executorName || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{ti.taskType || '-'}</td>
                                                <td className="px-3 py-2.5 text-center">{renderInstanceStateTag(ti.state)}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{ti.submitTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{ti.startTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{ti.endTime || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{ti.duration || '-'}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{ti.retryTimes ?? 0}</td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500">{ti.dryRun === 1 ? 'YES' : 'NO'}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[180px]" title={ti.host}>{ti.host || '-'}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Tooltip content="查看日志" position="top">
                                                        <button onClick={() => fetchTaskLog(ti.id, ti.name)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500">
                                                            <Eye size={15} />
                                                        </button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* 底部分页 - 始终显示 */}
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                            <div className="flex items-center space-x-2 text-slate-500">
                                <span>共 {taskInstanceTotal} 条 · 每页</span>
                                {[20, 50, 100].map(size => (
                                    <button key={size} onClick={() => { setTaskInstancePageSize(size); setTaskInstancePageNo(1); }}
                                        className={`px-2 py-0.5 rounded text-xs border ${taskInstancePageSize === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                    >{size}</button>
                                ))}
                                <span>条</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setTaskInstancePageNo(p => Math.max(1, p - 1))} disabled={taskInstancePageNo === 1} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                                <span>{taskInstancePageNo} / {taskInstanceTotalPages}</span>
                                <button onClick={() => setTaskInstancePageNo(p => Math.min(taskInstanceTotalPages, p + 1))} disabled={taskInstancePageNo === taskInstanceTotalPages} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
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
                apiVersion={currentProject?.apiVersion}
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
                apiVersion={currentProject?.apiVersion}
                onClose={() => setShowExport(false)}
            />
            
            <ImportModal
                show={showImport}
                lang={lang}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                processes={processes}
                apiVersion={currentProject?.apiVersion}
                onClose={() => setShowImport(false)}
                onSuccess={handleRefresh}
            />
            
            <LogModal
                show={showLog}
                lang={lang}
                projectCode={projectCode}
                baseUrl={baseUrl}
                token={token}
                apiVersion={currentProject?.apiVersion}
                onClose={() => setShowLog(false)}
            />
            
            {/* 单条任务日志查看弹窗 */}
            {taskLogName && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
                            <h3 className="text-white font-medium text-sm flex items-center min-w-0">
                                <AlignJustify size={16} className="mr-2 text-blue-400 shrink-0" />
                                <span className="truncate">{taskLogName}</span>
                            </h3>
                            <div className="flex items-center space-x-2 shrink-0 ml-4">
                                <Tooltip content="重新加载" position="bottom">
                                    <button onClick={() => { if (taskLogId) fetchTaskLog(taskLogId, taskLogName); }} className={`p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${taskLogLoading ? 'animate-spin' : ''}`}>
                                        <RefreshCw size={16} />
                                    </button>
                                </Tooltip>
                                <button onClick={() => { setTaskLogName(''); setTaskLogContent(''); }} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 min-h-0">
                            {taskLogLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-blue-500 mr-2" />
                                    <span className="text-slate-400">加载日志中...</span>
                                </div>
                            ) : (
                                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed">{taskLogContent || '暂无日志内容'}</pre>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {exportSingleProcess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setExportSingleProcess(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <Download size={20} className="mr-2 text-purple-500" />
                                {lang === 'zh' ? '导出工作流' : 'Export Workflow'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                    {lang === 'zh' ? '工作流' : 'Workflow'}
                                </label>
                                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm text-slate-600 dark:text-slate-400 truncate">
                                    {exportSingleProcess.name}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                    {lang === 'zh' ? '导出版本' : 'Export Version'}
                                </label>
                                <select
                                    value={exportSingleVersion}
                                    onChange={e => setExportSingleVersion(e.target.value as DolphinSchedulerApiVersion)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="v3.2">v3.2.x / v3.3.x</option>
                                    <option value="v3.4">v3.4.x+</option>
                                </select>
                                <p className="mt-1 text-xs text-slate-400">
                                    {currentProject?.apiVersion === exportSingleVersion 
                                        ? (lang === 'zh' ? '当前连接版本' : 'Current connection version')
                                        : (lang === 'zh' ? '将转换为此版本格式' : 'Will convert to this version format')}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                            <button 
                                onClick={() => setExportSingleProcess(null)} 
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button 
                                onClick={doExportSingle} 
                                disabled={exportingSingle}
                                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {exportingSingle && <Loader2 size={16} className="animate-spin mr-2" />}
                                {lang === 'zh' ? '选择目录并导出' : 'Select & Export'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 新建 K8S 工作流对话框 */}
            {showCreateK8s && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <Plus size={20} className="mr-2 text-emerald-500" />
                                {lang === 'zh' ? '新建 K8S 工作流' : 'New K8S Workflow'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* 工作流名称 */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                    {lang === 'zh' ? '工作流名称' : 'Workflow Name'} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createK8sName}
                                    onChange={e => setCreateK8sName(e.target.value)}
                                    placeholder="syn_ods_t_table_name_d"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    {lang === 'zh' ? '节点名称自动转换' : 'Node name auto-converted'}
                                    {createK8sName && <span className="ml-1 text-emerald-500 font-mono">{`→ ${createK8sName.replace(/_/g, '-')}`}</span>}
                                </p>
                            </div>

                            {/* 配置文件路径 */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                    {lang === 'zh' ? '配置文件路径' : 'Config Path'} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={createK8sConfigPath}
                                        onChange={e => setCreateK8sConfigPath(e.target.value)}
                                        placeholder="smart_cloud_pro/syn_ods_t_table_name_d.conf"
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setShowResourceBrowser(true);
                                            setResourceBrowserPath('');
                                            setResourceBrowserHistory([{name: '根目录', path: ''}]);
                                            setResourceBrowserLoading(true);
                                            try {
                                                const url = `${currentProject!.baseUrl}/resources?fullName=&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject!.token } });
                                                const result = await resp.json();
                                                if (result.code === 0) {
                                                    setResourceBrowserFiles(result.data?.totalList || result.data || []);
                                                }
                                            } catch (e) { console.error(e); }
                                            finally { setResourceBrowserLoading(false); }
                                        }}
                                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                                    >
                                        📂 {lang === 'zh' ? '浏览' : 'Browse'}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                    {lang === 'zh' ? '最终命令：' : 'Final command: '}
                                    <span className="font-mono text-slate-500">./bin/seatunnel.sh --config {createK8sConfigPath || '...'}</span>
                                </p>
                                {/* 资源中心文件浏览器 */}
                                {showResourceBrowser && (() => {
                                    return (
                                    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                                            <div className="flex items-center space-x-1 text-xs overflow-x-auto">
                                                {resourceBrowserHistory.map((h, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <span className="text-slate-400">/</span>}
                                                        <button
                                                            onClick={async () => {
                                                                setResourceBrowserPath(h.path);
                                                                setResourceBrowserHistory(resourceBrowserHistory.slice(0, i + 1));
                                                                setResourceBrowserSearch('');
                                                                setResourceBrowserLoading(true);
                                                                try {
                                                                    const url = `${currentProject!.baseUrl}/resources?fullName=${encodeURIComponent(h.path)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                                    const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject!.token } });
                                                                    const result = await resp.json();
                                                                    if (result.code === 0) setResourceBrowserFiles(result.data?.totalList || result.data || []);
                                                                } catch (e) { console.error(e); }
                                                                finally { setResourceBrowserLoading(false); }
                                                            }}
                                                            className="text-blue-500 hover:underline"
                                                        >
                                                            {h.name}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <button onClick={() => setShowResourceBrowser(false)} className="text-slate-400 hover:text-slate-600 ml-2">
                                                ✕
                                            </button>
                                        </div>
                                        {/* 全局搜索框 */}
                                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={resourceBrowserSearch}
                                                onChange={e => setResourceBrowserSearch(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        setResourceBrowserLoading(true);
                                                        try {
                                                            const searchVal = resourceBrowserSearch ? encodeURIComponent(resourceBrowserSearch) : '';
                                                            const url = `${currentProject!.baseUrl}/resources?fullName=&tenantCode=&type=FILE&searchVal=${searchVal}&pageNo=1&pageSize=200`;
                                                            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject!.token } });
                                                            const result = await resp.json();
                                                            if (result.code === 0) setResourceBrowserFiles(result.data?.totalList || result.data || []);
                                                        } catch (e) { console.error(e); }
                                                        finally { setResourceBrowserLoading(false); }
                                                    }
                                                }}
                                                placeholder={lang === 'zh' ? '🔍 全局搜索，回车搜索...' : '🔍 Global search, press Enter...'}
                                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {resourceBrowserLoading ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                                </div>
                                            ) : resourceBrowserFiles.length === 0 ? (
                                                <div className="text-center py-4 text-xs text-slate-400">{lang === 'zh' ? '无匹配文件' : 'No matching files'}</div>
                                            ) : (
                                                resourceBrowserFiles.map((f: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={async () => {
                                                            if (f.directory) {
                                                                setResourceBrowserPath(f.fullName);
                                                                setResourceBrowserHistory([...resourceBrowserHistory, { name: (f.alias || f.fileName || '').replace(/\/$/, ''), path: f.fullName }]);
                                                                setResourceBrowserSearch('');
                                                                setResourceBrowserLoading(true);
                                                                try {
                                                                    const url = `${currentProject!.baseUrl}/resources?fullName=${encodeURIComponent(f.fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                                    const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject!.token } });
                                                                    const result = await resp.json();
                                                                    if (result.code === 0) setResourceBrowserFiles(result.data?.totalList || result.data || []);
                                                                } catch (e) { console.error(e); }
                                                                finally { setResourceBrowserLoading(false); }
                                                            } else {
                                                                // 选择文件 — 去掉开头 /
                                                                const path = (f.fullName || '').replace(/^.*\/resources\//, '');
                                                                setCreateK8sConfigPath(path);
                                                                setShowResourceBrowser(false);
                                                            }
                                                        }}
                                                        className="w-full flex items-center px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-sm border-b border-slate-100 dark:border-slate-800 last:border-0"
                                                    >
                                                        <span className="mr-2">{f.directory ? '📁' : '📄'}</span>
                                                        <span className="truncate text-slate-700 dark:text-slate-300">{(f.alias || f.fileName || '').replace(/\/$/, '')}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    );
                                })()}
                            </div>

                            {/* 数据源实例和镜像 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '数据源实例' : 'Datasource'}
                                    </label>
                                    <select
                                        value={createK8sDatasource}
                                        onChange={e => setCreateK8sDatasource(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value={1}>k8s-user</option>
                                        <option value={2}>k8s-admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '镜像' : 'Image'}
                                    </label>
                                    <select
                                        value={createK8sImage}
                                        onChange={e => setCreateK8sImage(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204">seatunnel-k8s:2.3.12-20260204</option>
                                        <option value="registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:latest">seatunnel-k8s:latest</option>
                                    </select>
                                    <p className="mt-1 text-xs text-slate-400 font-mono truncate">{createK8sImage}</p>
                                </div>
                            </div>

                            {/* 命名空间和环境 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '命名空间' : 'Namespace'}
                                    </label>
                                    <select
                                        value={createK8sNamespace}
                                        onChange={e => setCreateK8sNamespace(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value='{"name":"default","cluster":"k8s-Security-Cluster-admin"}'>default (k8s-Security-Cluster-admin)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '环境名称' : 'Environment'}
                                    </label>
                                    <select
                                        value={createK8sEnvCode}
                                        onChange={e => setCreateK8sEnvCode(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value={164447603311488}>JAVA_HOME</option>
                                    </select>
                                </div>
                            </div>

                            {/* 超时设置 */}
                            <div>
                                <div className="flex items-center mb-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-3">
                                        {lang === 'zh' ? '超时告警' : 'Timeout'}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setCreateK8sTimeoutFlag(!createK8sTimeoutFlag)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${createK8sTimeoutFlag ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${createK8sTimeoutFlag ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                                {createK8sTimeoutFlag && (
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-xs text-slate-500">{lang === 'zh' ? '超时策略' : 'Strategy'}</span>
                                            <label className="flex items-center space-x-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                                                <input type="checkbox" checked={createK8sTimeoutWarn} onChange={e => setCreateK8sTimeoutWarn(e.target.checked)} className="rounded border-slate-300" />
                                                <span className="text-xs">{lang === 'zh' ? '超时告警' : 'Warn'}</span>
                                            </label>
                                            <label className="flex items-center space-x-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                                                <input type="checkbox" checked={createK8sTimeoutFail} onChange={e => setCreateK8sTimeoutFail(e.target.checked)} className="rounded border-slate-300" />
                                                <span className="text-xs">{lang === 'zh' ? '超时失败' : 'Fail'}</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-slate-500">{lang === 'zh' ? '超时时长' : 'Duration'}</span>
                                            <input
                                                type="number"
                                                value={createK8sTimeout}
                                                onChange={e => setCreateK8sTimeout(Number(e.target.value))}
                                                min={1}
                                                className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                            <span className="text-xs text-slate-400">{lang === 'zh' ? '分钟' : 'min'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 失败重试 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '失败重试次数' : 'Retry Times'}
                                    </label>
                                    <input
                                        type="number"
                                        value={createK8sRetryTimes}
                                        onChange={e => setCreateK8sRetryTimes(Number(e.target.value))}
                                        min={0}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '失败重试间隔' : 'Retry Interval'}
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={createK8sRetryInterval}
                                            onChange={e => setCreateK8sRetryInterval(Number(e.target.value))}
                                            min={1}
                                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <span className="text-xs text-slate-400 whitespace-nowrap">{lang === 'zh' ? '分钟' : 'min'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 完整容器命令预览 */}
                            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    {lang === 'zh' ? '容器执行命令' : 'Container Command'}
                                </p>
                                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all">
                                    {`["./bin/seatunnel.sh", "--config", "${createK8sConfigPath || '...'}", "--download_url", "http://10.0.1.10:82", "-m", "local"]`}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowCreateK8s(false)} 
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button 
                                onClick={handleCreateK8s} 
                                disabled={creatingK8s || !createK8sName.trim() || !createK8sConfigPath.trim()}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {creatingK8s && <Loader2 size={16} className="animate-spin mr-2" />}
                                {lang === 'zh' ? '创建' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 任务编辑器 */}
            {editProcess && currentProject && (
                <TaskEditor
                    lang={lang}
                    process={editProcess}
                    projectConfig={currentProject}
                    onClose={() => setEditProcess(null)}
                />
            )}

            {/* 参数设置弹窗 */}
            <GlobalSettingsModal 
                show={showConfigModal}
                lang={lang}
                onClose={() => setShowConfigModal(false)}
                onSave={(newSettings) => setGlobalSettings(newSettings)}
            />
        </div>
    );
};
