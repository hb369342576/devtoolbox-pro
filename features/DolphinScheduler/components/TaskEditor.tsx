import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    X, ChevronLeft, Loader2, Workflow, Database, GitBranch, Container, 
    Coffee, FileCode, Terminal, ZoomIn, ZoomOut, Maximize2, GripVertical,
    Save, Settings, Play, Trash2, Copy, Edit, LayoutGrid
} from 'lucide-react';
import { Language, DolphinSchedulerConfig } from '../../../types';
import { ProcessDefinition } from '../types';
import { httpFetch } from '../../../utils/http';
import { getWorkflowApiPath } from '../utils';
import { useToast } from '../../../components/ui/Toast';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

// 节点类型定义
const NODE_TYPES = [
    { id: 'seatunnel', name: 'SeaTunnel', icon: Workflow, color: '#3b82f6', bgColor: 'bg-blue-500' },
    { id: 'sql', name: 'SQL', icon: Database, color: '#22c55e', bgColor: 'bg-green-500' },
    { id: 'dependent', name: '依赖', icon: GitBranch, color: '#f59e0b', bgColor: 'bg-amber-500' },
    { id: 'k8s', name: 'K8S', icon: Container, color: '#a855f7', bgColor: 'bg-purple-500' },
    { id: 'java', name: 'Java', icon: Coffee, color: '#ef4444', bgColor: 'bg-red-500' },
    { id: 'python', name: 'Python', icon: FileCode, color: '#eab308', bgColor: 'bg-yellow-500' },
    { id: 'shell', name: 'Shell', icon: Terminal, color: '#64748b', bgColor: 'bg-slate-500' },
];

// 节点尺寸常量
const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;

// 工作流节点
interface TaskNode {
    id: string;
    code: number;
    name: string;
    taskType: string;
    x: number;
    y: number;
    // 任务参数
    taskParams: {
        // SQL 节点
        datasource?: number;
        datasourceName?: string;
        dbType?: string;        // MYSQL/DORIS/POSTGRESQL 等
        sql?: string;
        sqlType?: string;       // 0=查询, 1=非查询
        sqlFile?: string;       // SQL 文件路径
        // Java 节点
        mainJar?: { resourceName?: string };
        mainClass?: string;
        mainArgs?: string;
        jvmArgs?: string;
        // Shell 节点
        rawScript?: string;
        // Python 节点
        pythonPath?: string;
        pythonCommand?: string;
        // SeaTunnel 节点
        useCustom?: boolean;
        deployMode?: string;
        runMode?: string;
        startupScript?: string;
        configFile?: string;    // 配置文件路径
        // DEPENDENT 节点
        dependence?: {
            relation?: string;  // AND/OR
            checkInterval?: number;
            dependTaskList?: any[];
        };
        // K8S 节点
        namespace?: string;
        image?: string;
        imagePullPolicy?: string;
        command?: string;
        type?: string;
        kubeConfig?: string;
        customizedLabels?: any[];
        nodeSelectors?: any[];
        // 通用
        workerGroup?: string;
        environmentCode?: number;
        localParams?: any[];
        resourceList?: any[];
    };
    // 失败重试
    failRetryTimes?: number;
    failRetryInterval?: number;
    // 超时
    timeout?: number;
    // 描述
    description?: string;
    // 保存原始任务数据（用于保存时保留所有字段）
    rawTask?: any;
}

// 节点连线
interface TaskRelation {
    preTaskCode: number;
    postTaskCode: number;
}

interface TaskEditorProps {
    lang: Language;
    process: ProcessDefinition;
    projectConfig: DolphinSchedulerConfig;
    onClose: () => void;
}

export const TaskEditor: React.FC<TaskEditorProps> = ({
    lang,
    process,
    projectConfig,
    onClose
}) => {
    const { toast } = useToast();
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // 基础状态
    const [loading, setLoading] = useState(true);
    const [taskNodes, setTaskNodes] = useState<TaskNode[]>([]);
    const [taskRelations, setTaskRelations] = useState<TaskRelation[]>([]);
    
    // 数据源列表（用于 SQL 节点选择）
    const [datasources, setDatasources] = useState<{ id: number; name: string; type: string }[]>([]);
    
    // 配置数据（工作组、环境变量、告警组）
    const [workerGroups, setWorkerGroups] = useState<string[]>(['default']);
    const [environments, setEnvironments] = useState<{ code: number; name: string; config: string }[]>([]);
    const [alertGroups, setAlertGroups] = useState<{ id: number; groupName: string }[]>([]);
    
    // 画布变换状态
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    
    // 拖拽状态
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // 选中和编辑状态
    const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);
    const [editingNode, setEditingNode] = useState<TaskNode | null>(null);
    
    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TaskNode } | null>(null);
    
    // 运行弹窗状态
    const [showRunModal, setShowRunModal] = useState(false);
    const [runningProcess, setRunningProcess] = useState(false);
    const [runningNodeCode, setRunningNodeCode] = useState<number>(0);  // 要运行的节点 code
    const [runConfig, setRunConfig] = useState({
        failureStrategy: 'CONTINUE',        // 失败策略: CONTINUE/END
        warningType: 'NONE',                // 告警类型: NONE/SUCCESS/FAILURE/ALL
        processInstancePriority: 'MEDIUM',  // 优先级: HIGHEST/HIGH/MEDIUM/LOW/LOWEST
        workerGroup: 'default',
        dryRun: 0,                          // 空跑: 0=否, 1=是
        execType: 'START_PROCESS',          // 执行类型
        taskDependType: 'TASK_POST'         // 任务依赖类型: TASK_ONLY=只运行当前, TASK_POST=运行当前及后续
    });

    // 保存和退出提示状态
    const [saving, setSaving] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [originalSnapshot, setOriginalSnapshot] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // K8S 节点配置弹窗
    const [showK8sNodeDialog, setShowK8sNodeDialog] = useState(false);
    const [pendingK8sNode, setPendingK8sNode] = useState<{ code: number; x: number; y: number } | null>(null);
    const [editingK8sNodeId, setEditingK8sNodeId] = useState<string | null>(null);
    const [k8sNodeConfigPath, setK8sNodeConfigPath] = useState('smart_cloud_pro/');
    const [k8sNodeDatasource, setK8sNodeDatasource] = useState(1);
    const [k8sNodeImage, setK8sNodeImage] = useState('registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204');
    const [k8sNodeNamespace, setK8sNodeNamespace] = useState('{"name":"default","cluster":"k8s-Security-Cluster-admin"}');
    const [k8sNodeEnvCode, setK8sNodeEnvCode] = useState(164447603311488);
    const [k8sNodeTimeoutFlag, setK8sNodeTimeoutFlag] = useState(true);
    const [k8sNodeTimeout, setK8sNodeTimeout] = useState(10);
    const [k8sNodeTimeoutWarn, setK8sNodeTimeoutWarn] = useState(false);
    const [k8sNodeTimeoutFail, setK8sNodeTimeoutFail] = useState(true);
    const [k8sNodeRetryTimes, setK8sNodeRetryTimes] = useState(3);
    const [k8sNodeRetryInterval, setK8sNodeRetryInterval] = useState(1);

    // K8S 节点资源浏览
    const [showK8sResourceBrowser, setShowK8sResourceBrowser] = useState(false);
    const [k8sResourceFiles, setK8sResourceFiles] = useState<any[]>([]);
    const [k8sResourceLoading, setK8sResourceLoading] = useState(false);
    const [k8sResourceHistory, setK8sResourceHistory] = useState<{name: string; path: string}[]>([{name: '根目录', path: ''}]);
    const [k8sResourceSearch, setK8sResourceSearch] = useState('');

    // 只读模式：上线状态不允许编辑
    const isReadOnly = process.releaseState === 'ONLINE';

    // 加载工作流详情
    useEffect(() => {
        const loadWorkflowDetail = async () => {
            setLoading(true);
            try {
                const apiPath = getWorkflowApiPath(projectConfig.apiVersion);
                const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/${apiPath}/${process.code}`;
                const response = await httpFetch(url, {
                    method: 'GET',
                    headers: { 'token': projectConfig.token }
                });
                const result = await response.json();
                
                if (result.code === 0 && result.data) {
                    const workflowData = result.data;
                    
                    // 深度探测任务列表：适配 3.2, 3.3, 3.4 及其潜在的变体名
                    // 修正：使用 .length > 0 判定，避免被 3.4.0 返回的空数组 placeholder 干扰
                    let taskDefinitionList: any[] = 
                        (workflowData.taskDefinitionList?.length > 0 ? workflowData.taskDefinitionList : null) || 
                        (workflowData.taskDefinitions?.length > 0 ? workflowData.taskDefinitions : null) || 
                        (workflowData.workflowDefinition?.taskDefinitionList?.length > 0 ? workflowData.workflowDefinition.taskDefinitionList : null) || 
                        [];
                    
                    // === 3.4.0 补偿逻辑：如果 tasks 仍为空，从 locations 取 taskCode 并逐一拉取 ===
                    const definitionData = workflowData.workflowDefinition || workflowData.processDefinition;
                    const rawLocations = definitionData?.locations;
                    if (taskDefinitionList.length === 0 && rawLocations) {
                        console.log('TaskEditor - taskDefinitionList is empty, fetching tasks from locations...');
                        try {
                            const locArray = typeof rawLocations === 'string' ? JSON.parse(rawLocations) : rawLocations;
                            if (Array.isArray(locArray) && locArray.length > 0) {
                                const taskCodes = locArray.map((loc: any) => loc.taskCode).filter(Boolean);
                                console.log('TaskEditor - Found taskCodes from locations:', taskCodes);
                                
                                const fetchedTasks: any[] = [];
                                for (const taskCode of taskCodes) {
                                    try {
                                        const taskUrl = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/task-definition/${taskCode}`;
                                        const taskRes = await httpFetch(taskUrl, { headers: { 'token': projectConfig.token } });
                                        const taskResult = await taskRes.json();
                                        if (taskResult.code === 0 && taskResult.data) {
                                            fetchedTasks.push(taskResult.data);
                                        }
                                    } catch (e) {
                                        console.warn(`TaskEditor - Failed to fetch task ${taskCode}:`, e);
                                    }
                                }
                                if (fetchedTasks.length > 0) {
                                    taskDefinitionList = fetchedTasks;
                                    console.log(`TaskEditor - Fetched ${fetchedTasks.length} tasks via individual API calls`);
                                }
                            }
                        } catch (e) {
                            console.warn('TaskEditor - Failed to parse locations for task fetching:', e);
                        }
                    }
                    
                    // 深度探测连线关系
                    const taskRelationList = 
                        (workflowData.workflowTaskRelationList?.length > 0 ? workflowData.workflowTaskRelationList : null) || 
                        (workflowData.processTaskRelationList?.length > 0 ? workflowData.processTaskRelationList : null) || 
                        (workflowData.taskRelationList?.length > 0 ? workflowData.taskRelationList : null) || 
                        workflowData.workflowTaskRelationList ||
                        [];
                    
                    const locations = workflowData.processDefinition?.locations || workflowData.workflowDefinition?.locations;
                    
                    console.log('TaskEditor - Raw workflowData keys:', Object.keys(workflowData));
                    console.log('TaskEditor - Final nodes count:', taskDefinitionList.length);
                    console.log('TaskEditor - Final relations count:', taskRelationList.length);
                    
                    let locationMap: Record<string, { x: number; y: number }> = {};
                    try {
                        if (locations) {
                            // locations 可能是 JSON 字符串，先解析
                            const locArray = typeof locations === 'string' ? JSON.parse(locations) : locations;
                            // locations 是数组格式 [{taskCode, x, y}, ...]，转换为对象格式 {taskCode: {x, y}}
                            if (Array.isArray(locArray)) {
                                locArray.forEach((loc: { taskCode: number; x: number; y: number }) => {
                                    locationMap[loc.taskCode] = { x: loc.x, y: loc.y };
                                });
                            } else {
                                // 兼容旧格式（对象格式）
                                locationMap = locArray;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse locations:', e);
                    }
                    
                    const nodes: TaskNode[] = taskDefinitionList.map((task: any, index: number) => {
                        const loc = locationMap[task.code] || { x: 150 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 };
                        // 解析 taskParams
                        let taskParams = {};
                        try {
                            taskParams = typeof task.taskParams === 'string' ? JSON.parse(task.taskParams) : (task.taskParams || {});
                        } catch (e) {
                            console.error('Failed to parse taskParams:', e);
                        }
                        return {
                            id: task.code.toString(),
                            code: task.code,
                            name: task.name,
                            taskType: task.taskType,
                            x: loc.x,
                            y: loc.y,
                            taskParams,
                            failRetryTimes: task.failRetryTimes || 0,
                            failRetryInterval: task.failRetryInterval || 1,
                            timeout: task.timeout || 0,
                            description: task.description || '',
                            rawTask: task  // 保存原始数据
                        };
                    });
                    
                    let relations: TaskRelation[] = (taskRelationList || [])
                        .filter((r: any) => r.preTaskCode !== 0)
                        .map((r: any) => ({
                            preTaskCode: r.preTaskCode,
                            postTaskCode: r.postTaskCode
                        }));
                    
                    // 关键适配：如果 API 返回的关系列表为空，但存在任务列表，
                    // 说明可能是 3.4.0 的详情接口结构变动，我们需要显式设置节点，
                    // 即使没有连线也应该让节点显示出来。
                    if (nodes.length > 0 && relations.length === 0) {
                        console.log('TaskEditor - No valid relations found, but nodes exist. Displaying nodes with default layout.');
                    }

                    console.log('TaskEditor - Loaded nodes:', nodes.length, nodes.map(n => ({ code: n.code, name: n.name })));
                    console.log('TaskEditor - Loaded relations:', relations.length, relations);
                    
                    setTaskNodes(nodes);
                    setTaskRelations(relations);
                    // 保存原始快照用于检测未保存更改
                    setOriginalSnapshot(JSON.stringify({ nodes, relations }));
                } else {
                    toast({
                        title: lang === 'zh' ? '加载失败' : 'Load Failed',
                        description: result.msg || 'Unknown error',
                        variant: 'destructive'
                    });
                }
            } catch (error: any) {
                toast({
                    title: lang === 'zh' ? '加载失败' : 'Load Failed',
                    description: error.message,
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };
        
        // 加载数据源列表
        const loadDatasources = async () => {
            try {
                const url = `${projectConfig.baseUrl}/datasources?pageNo=1&pageSize=100`;
                const response = await httpFetch(url, {
                    method: 'GET',
                    headers: { 'token': projectConfig.token }
                });
                const result = await response.json();
                if (result.code === 0 && result.data?.totalList) {
                    setDatasources(result.data.totalList.map((ds: any) => ({
                        id: ds.id,
                        name: ds.name,
                        type: ds.type
                    })));
                }
            } catch (error) {
                console.error('Failed to load datasources:', error);
            }
        };
        
        // 加载工作组列表
        const loadWorkerGroups = async () => {
            try {
                const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/worker-group`;
                const response = await httpFetch(url, {
                    method: 'GET',
                    headers: { 'token': projectConfig.token }
                });
                const result = await response.json();
                if (result.data) {
                    const groups = result.data.map((g: any) => g.workerGroup);
                    setWorkerGroups(groups.length > 0 ? groups : ['default']);
                }
            } catch (error) {
                console.error('Failed to load worker groups:', error);
            }
        };
        
        // 加载环境变量列表
        const loadEnvironments = async () => {
            try {
                const url = `${projectConfig.baseUrl}/environment/query-environment-list`;
                const response = await httpFetch(url, {
                    method: 'GET',
                    headers: { 'token': projectConfig.token }
                });
                const result = await response.json();
                if (result.code === 0 && result.data) {
                    setEnvironments(result.data.map((e: any) => ({
                        code: e.code,
                        name: e.name,
                        config: e.config
                    })));
                }
            } catch (error) {
                console.error('Failed to load environments:', error);
            }
        };
        
        // 加载告警组列表
        const loadAlertGroups = async () => {
            try {
                const isV34 = projectConfig.apiVersion === 'v3.4';
                // v3.4 路径探测：尝试多个可能的官方及非官方路径
                const urls = isV34 
                    ? [
                        `${projectConfig.baseUrl}/alert-group/query-list`,
                        `${projectConfig.baseUrl}/alert-group/list`,
                        `${projectConfig.baseUrl}/alert-group/query-list-paging?pageNo=1&pageSize=100`
                      ]
                    : [`${projectConfig.baseUrl}/alert-groups/normal-list`];
                
                let lastResponse;
                let finalUrl = urls[0];

                // 简单的多路径尝试逻辑
                for (const url of urls) {
                    finalUrl = url;
                    lastResponse = await httpFetch(url, {
                        method: 'GET',
                        headers: { 'token': projectConfig.token }
                    });
                    if (lastResponse.status === 200) {
                        const contentType = lastResponse.headers['content-type'] || '';
                        if (contentType.includes('application/json')) break;
                    }
                }

                const text = await lastResponse!.text();
                // 防御性处理：如果返回的是 HTML 代码
                if (text.trim().startsWith('<')) {
                    console.warn(`[AlertGroup] All probed URLs returned HTML or error from: ${finalUrl}`);
                    setAlertGroups([]);
                    return;
                }

                try {
                    const result = JSON.parse(text);
                    if (result.code === 0 && result.data) {
                        const list = Array.isArray(result.data) ? result.data : (result.data.totalList || []);
                        setAlertGroups(list.map((g: any) => ({
                            id: g.id,
                            groupName: g.groupName
                        })));
                    }
                } catch (e) {
                    console.error('[AlertGroup] Failed to parse JSON:', e);
                    setAlertGroups([]);
                }
            } catch (error) {
                console.error('Failed to load alert groups:', error);
            }
        };
        
        loadWorkflowDetail();
        loadDatasources();
        loadWorkerGroups();
        loadEnvironments();
        loadAlertGroups();
    }, [process.code, projectConfig]);

    // 检测未保存更改
    useEffect(() => {
        if (!originalSnapshot) return;
        const currentSnapshot = JSON.stringify({ 
            nodes: taskNodes.map(n => ({ ...n })), 
            relations: taskRelations 
        });
        setHasUnsavedChanges(currentSnapshot !== originalSnapshot);
    }, [taskNodes, taskRelations, originalSnapshot]);

    // 保存工作流
    const handleSaveWorkflow = async () => {
        setSaving(true);
        try {
            // 构建 locations 数组
            const locations = taskNodes.map(node => ({
                taskCode: node.code,
                x: Math.round(node.x),
                y: Math.round(node.y)
            }));
            
            // 构建 taskDefinitionJson - 使用原始数据合并当前修改
            const taskDefinitionJson = taskNodes.map(node => {
                // taskParams 需要保持为对象格式
                const taskParams = typeof node.taskParams === 'string' 
                    ? JSON.parse(node.taskParams) 
                    : (node.taskParams || {});
                
                // 如果有原始数据，合并原始数据和当前修改
                if (node.rawTask) {
                    return {
                        ...node.rawTask,
                        name: node.name,
                        taskType: node.taskType,
                        taskParams: taskParams,
                        failRetryTimes: node.failRetryTimes || 0,
                        failRetryInterval: node.failRetryInterval || 1,
                        timeout: node.timeout || 0,
                        description: node.description || ''
                    };
                }
                
                // 新创建的节点（没有原始数据）
                return {
                    code: node.code,
                    version: 1,
                    name: node.name,
                    taskType: node.taskType,
                    taskParams: taskParams,
                    failRetryTimes: node.failRetryTimes || 0,
                    failRetryInterval: node.failRetryInterval || 1,
                    timeout: node.timeout || 0,
                    description: node.description || '',
                    flag: 'YES',
                    taskPriority: 'MEDIUM',
                    workerGroup: taskParams?.workerGroup || 'default',
                    environmentCode: taskParams?.environmentCode || -1,
                    delayTime: 0,
                    taskExecuteType: 'BATCH',
                    isCache: 'NO',
                    timeoutFlag: (node.timeout && node.timeout > 0) ? 'OPEN' : 'CLOSE',
                    timeoutNotifyStrategy: (node.timeout && node.timeout > 0) ? 'FAILED' : ''
                };
            });
            
            // 构建 taskRelationJson
            const taskRelationJson = taskRelations.map(rel => ({
                preTaskCode: rel.preTaskCode,
                postTaskCode: rel.postTaskCode,
                name: '',
                preTaskVersion: 1,
                postTaskVersion: 1,
                conditionType: 'NONE',
                conditionParams: {}
            }));
            
            // 添加根节点关系（没有前置任务的节点需要与 0 关联）
            const postTaskCodes = new Set(taskRelations.map(r => r.postTaskCode));
            taskNodes.forEach(node => {
                if (!postTaskCodes.has(node.code)) {
                    taskRelationJson.push({
                        preTaskCode: 0,
                        postTaskCode: node.code,
                        name: '',
                        preTaskVersion: 0,
                        postTaskVersion: 1,
                        conditionType: 'NONE',
                        conditionParams: {}
                    });
                }
            });
            
            // 调用更新API
            const apiPath = getWorkflowApiPath(projectConfig.apiVersion);
            const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/${apiPath}/${process.code}`;
            const formData = new URLSearchParams();
            formData.append('name', process.name);
            formData.append('locations', JSON.stringify(locations));
            formData.append('taskDefinitionJson', JSON.stringify(taskDefinitionJson));
            formData.append('taskRelationJson', JSON.stringify(taskRelationJson));
            formData.append('tenantCode', 'default');
            formData.append('executionType', 'PARALLEL');
            formData.append('description', process.description || '');
            formData.append('globalParams', '[]');
            formData.append('timeout', '0');
            
            console.log('=== Save Workflow Request ===');
            console.log('URL:', url);
            console.log('locations:', JSON.stringify(locations));
            console.log('taskDefinitionJson:', JSON.stringify(taskDefinitionJson));
            console.log('taskRelationJson:', JSON.stringify(taskRelationJson));
            
            const response = await httpFetch(url, {
                method: 'PUT',
                headers: { 
                    'token': projectConfig.token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });
            const result = await response.json();
            
            if (result.code === 0) {
                toast({ 
                    title: lang === 'zh' ? '保存成功' : 'Saved Successfully',
                    variant: 'success' 
                });
                // 更新原始快照
                setOriginalSnapshot(JSON.stringify({ nodes: taskNodes, relations: taskRelations }));
                setHasUnsavedChanges(false);
                return true;
            } else {
                throw new Error(result.msg || 'Unknown error');
            }
        } catch (error: any) {
            toast({ 
                title: lang === 'zh' ? '保存失败' : 'Save Failed', 
                description: error.message, 
                variant: 'destructive' 
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    // 处理关闭（检查未保存更改）
    const handleClose = () => {
        if (hasUnsavedChanges) {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };

    // 获取节点类型信息
    const getNodeType = (taskType: string) => {
        return NODE_TYPES.find(t => t.id.toLowerCase() === taskType.toLowerCase()) || NODE_TYPES[NODE_TYPES.length - 1];
    };

    // 缩放控制
    const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
    const handleZoomReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

    // 鼠标滚轮缩放
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(s => Math.max(0.3, Math.min(2, s + delta)));
    }, []);

    // 画布拖拽开始（左键点击背景或右键点击任意位置）
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // 右键点击任意位置开始拖动画布
        if (e.button === 2) {
            e.preventDefault();
            setIsPanning(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            return;
        }
        // 左键点击背景开始拖动画布
        if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
            setIsPanning(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            setSelectedNode(null);
        }
    };
    
    // 禁用右键菜单（画布区域）
    const handleContextMenuCanvas = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // 节点拖拽开始
    const handleNodeMouseDown = (e: React.MouseEvent, node: TaskNode) => {
        e.stopPropagation();
        setSelectedNode(node);
        // 只读模式不允许拖拽
        if (isReadOnly) return;
        setDraggingNode(node.id);
        setDragStart({ x: e.clientX / scale - node.x, y: e.clientY / scale - node.y });
    };

    // 鼠标移动
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        } else if (draggingNode) {
            const newX = e.clientX / scale - dragStart.x;
            const newY = e.clientY / scale - dragStart.y;
            setTaskNodes(nodes => nodes.map(n => 
                n.id === draggingNode ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
            ));
        }
    }, [isPanning, draggingNode, dragStart, scale]);

    // 鼠标释放
    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingNode(null);
    };

    // 节点双击编辑/查看
    const handleNodeDoubleClick = (node: TaskNode) => {
        // K8S 节点使用自定义弹窗
        if (node.taskType === 'K8S') {
            setEditingK8sNodeId(node.id);
            // 从已有节点数据回填
            const params = node.taskParams || {};
            // 从 command 中提取配置路径
            try {
                const cmdArr = typeof params.command === 'string' ? JSON.parse(params.command) : [];
                const configIdx = cmdArr.indexOf('--config');
                setK8sNodeConfigPath(configIdx >= 0 && cmdArr[configIdx + 1] ? cmdArr[configIdx + 1] : 'smart_cloud_pro/');
            } catch {
                setK8sNodeConfigPath('smart_cloud_pro/');
            }
            setK8sNodeDatasource(params.datasource || 1);
            setK8sNodeImage(params.image || 'registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204');
            setK8sNodeNamespace(params.namespace || '{"name":"default","cluster":"k8s-Security-Cluster-admin"}');
            setK8sNodeEnvCode(params.environmentCode || 164447603311488);
            setK8sNodeTimeoutFlag((node.timeout || 0) > 0);
            setK8sNodeTimeout(node.timeout || 10);
            setK8sNodeTimeoutWarn(false);
            setK8sNodeTimeoutFail(true);
            setK8sNodeRetryTimes(node.failRetryTimes || 3);
            setK8sNodeRetryInterval(node.failRetryInterval || 1);
            setPendingK8sNode(null);
            setShowK8sNodeDialog(true);
            return;
        }
        // 只读模式也允许打开查看，但不能保存
        setEditingNode(node);
    };

    // 左侧节点拖拽到画布
    const handleDragStart = (e: React.DragEvent, nodeType: typeof NODE_TYPES[0]) => {
        // 只读模式不允许添加新节点
        if (isReadOnly) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('nodeType', JSON.stringify(nodeType));
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const nodeTypeData = e.dataTransfer.getData('nodeType');
        if (!nodeTypeData) return;
        
        const nodeType = JSON.parse(nodeTypeData);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = (e.clientX - rect.left - offset.x) / scale;
        const y = (e.clientY - rect.top - offset.y) / scale;
        
        // 生成任务代码
        let taskCode = Date.now();
        try {
            const genUrl = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/task-definition/gen-task-codes?genNum=1`;
            const genResponse = await httpFetch(genUrl, {
                method: 'GET',
                headers: { 'token': projectConfig.token }
            });
            const genResult = await genResponse.json();
            if (genResult.code === 0 && genResult.data?.[0]) {
                taskCode = genResult.data[0];
            }
        } catch (error) {
            console.error('Failed to generate task code:', error);
        }
        
        // K8S 节点：打开配置弹窗，不立即添加
        if (nodeType.id.toUpperCase() === 'K8S') {
            setPendingK8sNode({
                code: taskCode,
                x: Math.max(0, x - NODE_WIDTH / 2),
                y: Math.max(0, y - NODE_HEIGHT / 2)
            });
            // 重置表单到默认值
            setK8sNodeConfigPath('smart_cloud_pro/');
            setK8sNodeDatasource(1);
            setK8sNodeImage('registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204');
            setK8sNodeNamespace('{"name":"default","cluster":"k8s-Security-Cluster-admin"}');
            setK8sNodeEnvCode(164447603311488);
            setK8sNodeTimeoutFlag(true);
            setK8sNodeTimeout(10);
            setK8sNodeTimeoutWarn(false);
            setK8sNodeTimeoutFail(true);
            setK8sNodeRetryTimes(3);
            setK8sNodeRetryInterval(1);
            setShowK8sNodeDialog(true);
            return;
        }
        
        const newNode: TaskNode = {
            id: `new_${taskCode}`,
            code: taskCode,
            name: `${nodeType.name}_${taskNodes.length + 1}`,
            taskType: nodeType.id.toUpperCase(),
            x: Math.max(0, x - NODE_WIDTH / 2),
            y: Math.max(0, y - NODE_HEIGHT / 2),
            taskParams: {
                workerGroup: 'default'
            },
            failRetryTimes: 0,
            failRetryInterval: 1,
            timeout: 0,
            description: ''
        };
        
        setTaskNodes([...taskNodes, newNode]);
        setSelectedNode(newNode);
        setEditingNode(newNode);
    };

    // K8S 节点弹窗确认（新建 + 编辑）
    const handleConfirmK8sNode = () => {
        if (!k8sNodeConfigPath.trim()) return;
        
        const command = JSON.stringify([
            "./bin/seatunnel.sh", "--config", k8sNodeConfigPath.trim(),
            "--download_url", "http://10.0.1.10:82", "-m", "local"
        ]);
        
        const nodeName = k8sNodeConfigPath.replace(/^.*\//, '').replace(/\.conf$/, '').replace(/_/g, '-') || `k8s-${taskNodes.length + 1}`;
        
        const k8sTaskParams = {
            namespace: k8sNodeNamespace,
            image: k8sNodeImage,
            imagePullPolicy: 'IfNotPresent',
            command: command,
            datasource: k8sNodeDatasource,
            type: 'K8S',
            kubeConfig: '',
            customizedLabels: [],
            nodeSelectors: [],
            localParams: [],
            resourceList: [],
            workerGroup: 'default',
            environmentCode: k8sNodeEnvCode,
        };
        
        if (editingK8sNodeId) {
            // 编辑已有节点
            setTaskNodes(nodes => nodes.map(n => 
                n.id === editingK8sNodeId ? {
                    ...n,
                    name: nodeName,
                    taskParams: k8sTaskParams,
                    failRetryTimes: k8sNodeRetryTimes,
                    failRetryInterval: k8sNodeRetryInterval,
                    timeout: k8sNodeTimeoutFlag ? k8sNodeTimeout : 0,
                } : n
            ));
        } else if (pendingK8sNode) {
            // 新建节点
            const newNode: TaskNode = {
                id: `new_${pendingK8sNode.code}`,
                code: pendingK8sNode.code,
                name: nodeName,
                taskType: 'K8S',
                x: pendingK8sNode.x,
                y: pendingK8sNode.y,
                taskParams: k8sTaskParams,
                failRetryTimes: k8sNodeRetryTimes,
                failRetryInterval: k8sNodeRetryInterval,
                timeout: k8sNodeTimeoutFlag ? k8sNodeTimeout : 0,
                description: ''
            };
            setTaskNodes([...taskNodes, newNode]);
            setSelectedNode(newNode);
        }
        
        setShowK8sNodeDialog(false);
        setPendingK8sNode(null);
        setEditingK8sNodeId(null);
    };

    // K8S 节点弹窗取消
    const handleCancelK8sNode = () => {
        setShowK8sNodeDialog(false);
        setPendingK8sNode(null);
        setEditingK8sNodeId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 节点右键菜单
    const handleNodeContextMenu = (e: React.MouseEvent, node: TaskNode) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedNode(node);
        // 只读模式也显示右键菜单（但只允许运行）
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    // 删除节点
    const handleDeleteNode = (node: TaskNode) => {
        setTaskNodes(nodes => nodes.filter(n => n.id !== node.id));
        setTaskRelations(relations => relations.filter(
            r => r.preTaskCode !== node.code && r.postTaskCode !== node.code
        ));
        setContextMenu(null);
        setSelectedNode(null);
    };

    // 复制节点
    const handleCopyNode = (node: TaskNode) => {
        const newNode: TaskNode = {
            ...node,
            id: `copy_${Date.now()}`,
            code: Date.now(),
            name: `${node.name}_copy`,
            x: node.x + 30,
            y: node.y + 30
        };
        setTaskNodes([...taskNodes, newNode]);
        setContextMenu(null);
    };

    // 关闭右键菜单
    const closeContextMenu = () => setContextMenu(null);
    
    // 打开运行弹窗 - 传入要运行的节点
    const handleOpenRunModal = (node: TaskNode) => {
        setRunningNodeCode(node.code);  // 传入节点 code
        setShowRunModal(true);
    };
    
    // 执行运行工作流
    const handleRunProcess = async () => {
        setRunningProcess(true);
        try {
            // 1. 先获取最新的工作流定义，确保使用最新版本号
            const apiPath = getWorkflowApiPath(projectConfig.apiVersion);
            const defUrl = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/${apiPath}/${process.code}`;
            const defResponse = await httpFetch(defUrl, {
                method: 'GET',
                headers: { 'token': projectConfig.token }
            });
            const defResult = await defResponse.json();
            
            if (defResult.code !== 0 || !defResult.data?.processDefinition) {
                throw new Error(defResult.msg || 'Failed to get process definition');
            }
            
            const latestVersion = defResult.data.processDefinition.version;
            console.log('Using latest version:', latestVersion);
            
            // 2. 启动工作流实例
            const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/executors/start-process-instance`;
            
            // 构建 scheduleTime JSON
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`;
            const scheduleTimeJson = JSON.stringify({
                complementStartDate: dateStr,
                complementEndDate: dateStr
            });
            
            const formData = new URLSearchParams();
            formData.append('processDefinitionCode', process.code.toString());
            formData.append('failureStrategy', runConfig.failureStrategy);
            formData.append('warningType', runConfig.warningType);
            formData.append('warningGroupId', '');
            formData.append('execType', runConfig.execType);
            formData.append('startNodeList', runningNodeCode.toString());  // 使用任务 code
            formData.append('taskDependType', runConfig.taskDependType);  // 使用用户选择的模式
            formData.append('complementDependentMode', 'OFF_MODE');
            formData.append('runMode', 'RUN_MODE_SERIAL');
            formData.append('processInstancePriority', runConfig.processInstancePriority);
            formData.append('workerGroup', runConfig.workerGroup);
            formData.append('tenantCode', 'default');
            formData.append('environmentCode', '');
            formData.append('startParams', '');
            formData.append('expectedParallelismNumber', '2');
            formData.append('dryRun', runConfig.dryRun.toString());
            formData.append('testFlag', '0');
            formData.append('version', latestVersion.toString());
            formData.append('allLevelDependent', 'false');
            formData.append('executionOrder', 'DESC_ORDER');
            formData.append('scheduleTime', scheduleTimeJson);
            
            // 调试：输出完整请求参数
            console.log('=== Start Process Request ===');
            console.log('URL:', url);
            console.log('Params:', formData.toString());
            console.log('startNodeList (code):', runningNodeCode);
            
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
                toast({
                    title: lang === 'zh' ? '运行成功' : 'Run Success',
                    description: lang === 'zh' ? '任务已开始运行' : 'Task has started running'
                });
                setShowRunModal(false);
            } else {
                toast({
                    title: lang === 'zh' ? '运行失败' : 'Run Failed',
                    description: result.msg || 'Unknown error',
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            toast({
                title: lang === 'zh' ? '运行失败' : 'Run Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setRunningProcess(false);
        }
    };

    // 自动布局（拓扑排序 + 分层布局）
    const handleAutoLayout = () => {
        if (taskNodes.length === 0) return;
        
        // 1. 构建依赖关系图
        const inDegree: Record<number, number> = {};
        const children: Record<number, number[]> = {};
        
        taskNodes.forEach(node => {
            inDegree[node.code] = 0;
            children[node.code] = [];
        });
        
        taskRelations.forEach(rel => {
            if (inDegree[rel.postTaskCode] !== undefined) {
                inDegree[rel.postTaskCode]++;
            }
            if (children[rel.preTaskCode]) {
                children[rel.preTaskCode].push(rel.postTaskCode);
            }
        });
        
        // 2. 拓扑排序分层
        const levels: number[][] = [];
        const visited = new Set<number>();
        let queue = taskNodes.filter(n => inDegree[n.code] === 0).map(n => n.code);
        
        while (queue.length > 0) {
            levels.push([...queue]);
            queue.forEach(code => visited.add(code));
            
            const nextQueue: number[] = [];
            queue.forEach(code => {
                children[code]?.forEach(childCode => {
                    if (!visited.has(childCode)) {
                        inDegree[childCode]--;
                        if (inDegree[childCode] === 0) {
                            nextQueue.push(childCode);
                        }
                    }
                });
            });
            queue = nextQueue;
        }
        
        // 处理未访问的节点（孤立节点或循环）
        const unvisited = taskNodes.filter(n => !visited.has(n.code)).map(n => n.code);
        if (unvisited.length > 0) {
            levels.push(unvisited);
        }
        
        // 3. 计算位置
        const horizontalGap = NODE_WIDTH + 80;
        const verticalGap = NODE_HEIGHT + 40;
        const startX = 100;
        const startY = 100;
        
        const newPositions: Record<number, { x: number; y: number }> = {};
        
        levels.forEach((levelCodes, levelIndex) => {
            const totalHeight = levelCodes.length * NODE_HEIGHT + (levelCodes.length - 1) * (verticalGap - NODE_HEIGHT);
            const startYLevel = startY + (levels.length > 1 ? 0 : 0);
            
            levelCodes.forEach((code, nodeIndex) => {
                newPositions[code] = {
                    x: startX + levelIndex * horizontalGap,
                    y: startYLevel + nodeIndex * verticalGap
                };
            });
        });
        
        // 4. 更新节点位置
        setTaskNodes(nodes => nodes.map(node => ({
            ...node,
            x: newPositions[node.code]?.x ?? node.x,
            y: newPositions[node.code]?.y ?? node.y
        })));
        
        // 重置画布视图
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // 计算连线路径（贝塞尔曲线）
    const getConnectionPath = (from: TaskNode, to: TaskNode) => {
        const startX = from.x + NODE_WIDTH;
        const startY = from.y + NODE_HEIGHT / 2;
        const endX = to.x;
        const endY = to.y + NODE_HEIGHT / 2;
        const midX = (startX + endX) / 2;
        
        return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 flex flex-col">
            {/* 顶部栏 */}
            <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0 shadow-sm">
            <div className="flex items-center space-x-3">
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white flex items-center">
                            {process.name}
                            {isReadOnly && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                                    {lang === 'zh' ? '已上线' : 'ONLINE'}
                                </span>
                            )}
                        </h2>
                        <span className="text-xs text-slate-500">
                            {lang === 'zh' ? '工作流编辑器' : 'Workflow Editor'}
                            {isReadOnly && (lang === 'zh' ? ' (只读模式)' : ' (Read Only)')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {!isReadOnly && (
                        <button 
                            onClick={handleSaveWorkflow}
                            disabled={saving}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{lang === 'zh' ? '保存' : 'Save'}</span>
                        </button>
                    )}
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧节点类型列表 */}
                <div className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 shrink-0 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wide">
                        {lang === 'zh' ? '节点类型' : 'Node Types'}
                    </h3>
                    <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                        {NODE_TYPES.map(nodeType => (
                            <div
                                key={nodeType.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, nodeType)}
                                className="flex items-center px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all hover:shadow-md hover:-translate-y-0.5"
                            >
                                <div className={`p-1.5 rounded-md ${nodeType.bgColor} text-white mr-3 shadow-sm`}>
                                    <nodeType.icon size={16} />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {nodeType.name}
                                </span>
                                <GripVertical size={14} className="ml-auto text-slate-400" />
                            </div>
                        ))}
                    </div>

                    {/* 工作流节点列表 */}
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wide">
                            {lang === 'zh' ? '当前节点' : 'Nodes'} ({taskNodes.length})
                        </h3>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {taskNodes.map(node => {
                                const nodeType = getNodeType(node.taskType);
                                return (
                                    <div
                                        key={node.id}
                                        onClick={() => setSelectedNode(node)}
                                        className={`flex items-center px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                                            selectedNode?.id === node.id 
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-400' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: nodeType.color }} />
                                        <span className="text-slate-600 dark:text-slate-300 truncate">{node.name}</span>
                                    </div>
                                );
                            })}
                            {taskNodes.length === 0 && !loading && (
                                <div className="text-xs text-slate-400 text-center py-4">
                                    {lang === 'zh' ? '拖拽节点到画布' : 'Drag nodes to canvas'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右侧画布 */}
                <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    {/* 缩放控制 */}
                    <div className="absolute top-4 right-4 z-10 flex items-center space-x-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1">
                        <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <ZoomOut size={18} />
                        </button>
                        <span className="px-2 text-sm font-medium text-slate-600 dark:text-slate-300 min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <ZoomIn size={18} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
                        <button onClick={handleZoomReset} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300" title={lang === 'zh' ? '重置' : 'Reset'}>
                            <Maximize2 size={18} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
                        <button 
                            onClick={handleAutoLayout} 
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                            title={lang === 'zh' ? '自动布局' : 'Auto Layout'}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div
                            ref={canvasRef}
                            className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={handleWheel}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onContextMenu={handleContextMenuCanvas}
                        >
                            {/* 固定网格背景（不随缩放变化） */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                                <defs>
                                    <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
                                    </pattern>
                                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                                        <rect width="100" height="100" fill="url(#smallGrid)" />
                                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#475569" strokeWidth="1" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>
                            
                            {/* 可缩放的内容层 */}
                            <svg
                                width="5000"
                                height="5000"
                                style={{ 
                                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                    transformOrigin: '0 0',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    overflow: 'visible'
                                }}
                            >
                                {/* 箭头定义 */}
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                
                                {/* 连线 */}
                                {taskRelations.map((relation, index) => {
                                    const fromNode = taskNodes.find(n => n.code === relation.preTaskCode);
                                    const toNode = taskNodes.find(n => n.code === relation.postTaskCode);
                                    if (!fromNode || !toNode) return null;
                                    
                                    return (
                                        <g key={`relation-${index}`}>
                                            <path
                                                d={getConnectionPath(fromNode, toNode)}
                                                fill="none"
                                                stroke="#94a3b8"
                                                strokeWidth="2"
                                                markerEnd="url(#arrowhead)"
                                            />
                                        </g>
                                    );
                                })}
                                
                                {/* 节点 */}
                                {taskNodes.map(node => {
                                    const nodeType = getNodeType(node.taskType);
                                    const isSelected = selectedNode?.id === node.id;
                                    const NodeIcon = nodeType.icon;
                                    
                                    return (
                                        <g 
                                            key={node.id} 
                                            transform={`translate(${node.x}, ${node.y})`}
                                            onMouseDown={(e) => handleNodeMouseDown(e as any, node)}
                                            onDoubleClick={() => handleNodeDoubleClick(node)}
                                            onContextMenu={(e) => handleNodeContextMenu(e as any, node)}
                                            className="cursor-pointer"
                                        >
                                            {/* 选中阴影 */}
                                            {isSelected && (
                                                <rect
                                                    x="-4"
                                                    y="-4"
                                                    width={NODE_WIDTH + 8}
                                                    height={NODE_HEIGHT + 8}
                                                    rx="12"
                                                    fill="none"
                                                    stroke="#3b82f6"
                                                    strokeWidth="2"
                                                    strokeDasharray="5,5"
                                                />
                                            )}
                                            
                                            {/* 节点阴影 */}
                                            <rect
                                                x="2"
                                                y="4"
                                                width={NODE_WIDTH}
                                                height={NODE_HEIGHT}
                                                rx="10"
                                                fill="rgba(0,0,0,0.1)"
                                            />
                                            
                                            {/* 节点背景 */}
                                            <rect
                                                width={NODE_WIDTH}
                                                height={NODE_HEIGHT}
                                                rx="10"
                                                fill="white"
                                                stroke={isSelected ? '#3b82f6' : '#e2e8f0'}
                                                strokeWidth={isSelected ? 2 : 1}
                                            />
                                            
                                            {/* 顶部颜色条 */}
                                            <rect
                                                width={NODE_WIDTH}
                                                height="6"
                                                rx="10"
                                                fill={nodeType.color}
                                            />
                                            <rect
                                                y="3"
                                                width={NODE_WIDTH}
                                                height="3"
                                                fill={nodeType.color}
                                            />
                                            
                                            {/* 图标 */}
                                            <foreignObject x="12" y="18" width="32" height="32">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: nodeType.color + '20' }}>
                                                    <NodeIcon size={18} color={nodeType.color} />
                                                </div>
                                            </foreignObject>
                                            
                                            {/* 节点名称 */}
                                            <text
                                                x="52"
                                                y="32"
                                                className="text-sm font-medium"
                                                fill="#334155"
                                            >
                                                {node.name.length > 12 ? node.name.slice(0, 12) + '...' : node.name}
                                            </text>
                                            
                                            {/* 节点类型 */}
                                            <text
                                                x="52"
                                                y="50"
                                                className="text-xs"
                                                fill="#94a3b8"
                                            >
                                                {node.taskType}
                                            </text>
                                            
                                            {/* 运行按钮 - 仅上线状态显示 */}
                                            {process.releaseState === 'ONLINE' && (
                                                <foreignObject x={NODE_WIDTH - 32} y="22" width="24" height="24">
                                                    <button 
                                                        className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-sm transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenRunModal(node); }}
                                                        title={lang === 'zh' ? '运行此节点' : 'Run This Node'}
                                                    >
                                                        <Play size={12} fill="white" />
                                                    </button>
                                                </foreignObject>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* 节点编辑弹窗 */}
            {editingNode && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${getNodeType(editingNode.taskType).bgColor} text-white`}>
                                    {React.createElement(getNodeType(editingNode.taskType).icon, { size: 20 })}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                        {lang === 'zh' ? (isReadOnly ? '查看节点' : '编辑节点') : (isReadOnly ? 'View Node' : 'Edit Node')}
                                    </h3>
                                    <span className="text-xs text-slate-500">{editingNode.taskType}{isReadOnly && (lang === 'zh' ? ' (只读)' : ' (Read Only)')}</span>
                                </div>
                            </div>
                            <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <fieldset disabled={isReadOnly} className={isReadOnly ? 'opacity-80' : ''}>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {lang === 'zh' ? '节点名称' : 'Node Name'}
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
                                    {lang === 'zh' ? '节点类型' : 'Node Type'}
                                </label>
                                <select
                                    value={editingNode.taskType.toLowerCase()}
                                    onChange={(e) => setEditingNode({ ...editingNode, taskType: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {NODE_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
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
                                        value={editingNode.taskParams.workerGroup || 'default'}
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
                                        {lang === 'zh' ? '环境变量' : 'Environment'}
                                    </label>
                                    <select
                                        value={editingNode.taskParams.environmentCode || ''}
                                        onChange={(e) => setEditingNode({ 
                                            ...editingNode, 
                                            taskParams: { ...editingNode.taskParams, environmentCode: e.target.value ? parseInt(e.target.value) : undefined }
                                        })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    >
                                        <option value="">{lang === 'zh' ? '无' : 'None'}</option>
                                        {environments.map(e => (
                                            <option key={e.code} value={e.code}>{e.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center">
                                    <Settings size={16} className="mr-2" />
                                    {lang === 'zh' ? '节点配置' : 'Node Configuration'}
                                </h4>
                                
                                {/* SQL 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'sql' && (
                                    <div className="space-y-3">
                                        {/* 数据源选择 */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '数据源' : 'Datasource'}
                                            </label>
                                            <select
                                                value={editingNode.taskParams.datasource || ''}
                                                onChange={(e) => {
                                                    const dsId = parseInt(e.target.value);
                                                    const ds = datasources.find(d => d.id === dsId);
                                                    setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { 
                                                            ...editingNode.taskParams, 
                                                            datasource: dsId,
                                                            datasourceName: ds?.name || '',
                                                            dbType: ds?.type || editingNode.taskParams.dbType
                                                        }
                                                    });
                                                }}
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            >
                                                <option value="">{lang === 'zh' ? '请选择数据源' : 'Select datasource'}</option>
                                                {datasources.map(ds => (
                                                    <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
                                                ))}
                                            </select>
                                            {editingNode.taskParams.datasource && datasources.length === 0 && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    ID: {editingNode.taskParams.datasource}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* 数据库类型 */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '数据库类型' : 'DB Type'}
                                                </label>
                                                <select
                                                    value={editingNode.taskParams.dbType || 'MYSQL'}
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
                                                    SQL {lang === 'zh' ? '类型' : 'Type'}
                                                </label>
                                                <select
                                                    value={editingNode.taskParams.sqlType || '1'}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, sqlType: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                >
                                                    <option value="0">{lang === 'zh' ? '查询' : 'Query'}</option>
                                                    <option value="1">{lang === 'zh' ? '非查询' : 'Non-Query'}</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* SQL 语句 */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                SQL {lang === 'zh' ? '语句' : 'Statement'}
                                            </label>
                                            <textarea
                                                value={editingNode.taskParams.sql || ''}
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
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? 'JAR包路径' : 'JAR Path'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.mainJar?.resourceName || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, mainJar: { resourceName: e.target.value } }
                                                })}
                                                placeholder="/path/to/app.jar"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '主类' : 'Main Class'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.mainClass || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, mainClass: e.target.value }
                                                })}
                                                placeholder="com.example.Main"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '命令参数' : 'Arguments'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.mainArgs || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, mainArgs: e.target.value }
                                                })}
                                                placeholder="--config xxx"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                JVM {lang === 'zh' ? '参数' : 'Options'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.jvmArgs || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, jvmArgs: e.target.value }
                                                })}
                                                placeholder="-Xmx1g -Xms512m"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* SeaTunnel 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'seatunnel' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '运行模式' : 'Deploy Mode'}
                                                </label>
                                                <select
                                                    value={editingNode.taskParams.deployMode || 'local'}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, deployMode: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                >
                                                    <option value="local">Local</option>
                                                    <option value="cluster">Cluster</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '自定义配置' : 'Custom Config'}
                                                </label>
                                                <select
                                                    value={editingNode.taskParams.useCustom ? 'true' : 'false'}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, useCustom: e.target.value === 'true' }
                                                    })}
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                >
                                                    <option value="false">{lang === 'zh' ? '否' : 'No'}</option>
                                                    <option value="true">{lang === 'zh' ? '是' : 'Yes'}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '启动脚本' : 'Startup Script'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingNode.taskParams.startupScript || ''}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, startupScript: e.target.value }
                                                    })}
                                                    placeholder="seatunnel.sh"
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '配置文件' : 'Config File'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingNode.taskParams.configFile || ''}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, configFile: e.target.value }
                                                    })}
                                                    placeholder="sync_job.conf"
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        {editingNode.taskParams.useCustom && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '配置内容' : 'Configuration'}
                                                </label>
                                                <textarea
                                                    value={editingNode.taskParams.rawScript || ''}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, rawScript: e.target.value }
                                                    })}
                                                    placeholder="env { ... } source { ... } sink { ... }"
                                                    rows={8}
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Shell 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'shell' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '脚本内容' : 'Script Content'}
                                            </label>
                                            <textarea
                                                value={editingNode.taskParams.rawScript || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, rawScript: e.target.value }
                                                })}
                                                placeholder="#!/bin/bash&#10;echo 'Hello World'"
                                                rows={8}
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Python 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'python' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? 'Python路径' : 'Python Path'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.pythonPath || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, pythonPath: e.target.value }
                                                })}
                                                placeholder="/usr/bin/python3"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '脚本内容' : 'Script Content'}
                                            </label>
                                            <textarea
                                                value={editingNode.taskParams.rawScript || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, rawScript: e.target.value }
                                                })}
                                                placeholder="print('Hello World')"
                                                rows={8}
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Dependent 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'dependent' && (
                                    <div className="space-y-3">
                                        <div className="text-sm text-slate-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                                            {lang === 'zh' ? '依赖节点用于等待上游工作流完成。' : 'Dependent nodes wait for upstream workflows to complete.'}
                                        </div>
                                        
                                        {/* 依赖配置详情 */}
                                        {editingNode.taskParams.dependence && (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                            {lang === 'zh' ? '关系类型' : 'Relation'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingNode.taskParams.dependence.relation || 'AND'}
                                                            readOnly
                                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                            {lang === 'zh' ? '检查间隔(秒)' : 'Check Interval(s)'}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={editingNode.taskParams.dependence.checkInterval || 10}
                                                            readOnly
                                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* 依赖任务列表 */}
                                                {editingNode.taskParams.dependence.dependTaskList?.map((taskGroup: any, idx: number) => (
                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-xs">
                                                        <div className="font-medium text-slate-600 dark:text-slate-300 mb-1">
                                                            {lang === 'zh' ? '依赖组' : 'Dependency Group'} {idx + 1} ({taskGroup.relation})
                                                        </div>
                                                        {taskGroup.dependItemList?.map((item: any, itemIdx: number) => (
                                                            <div key={itemIdx} className="ml-2 text-slate-500 dark:text-slate-400">
                                                                • {item.cycle}/{item.dateValue} - Code: {item.definitionCode}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* K8S 节点配置 */}
                                {editingNode.taskType.toLowerCase() === 'k8s' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '命名空间' : 'Namespace'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingNode.taskParams.namespace || ''}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, namespace: e.target.value }
                                                    })}
                                                    placeholder="default"
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    {lang === 'zh' ? '镜像' : 'Image'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingNode.taskParams.image || ''}
                                                    onChange={(e) => setEditingNode({ 
                                                        ...editingNode, 
                                                        taskParams: { ...editingNode.taskParams, image: e.target.value }
                                                    })}
                                                    placeholder="nginx:latest"
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                {lang === 'zh' ? '命令' : 'Command'}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.taskParams.command || ''}
                                                onChange={(e) => setEditingNode({ 
                                                    ...editingNode, 
                                                    taskParams: { ...editingNode.taskParams, command: e.target.value }
                                                })}
                                                placeholder="/bin/bash -c 'echo hello'"
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* 失败重试配置 */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mt-4">
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">
                                    {lang === 'zh' ? '失败重试' : 'Failure Retry'}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            {lang === 'zh' ? '重试次数' : 'Retry Times'}
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
                                            {lang === 'zh' ? '重试间隔(分钟)' : 'Retry Interval(min)'}
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
                        </div>
                        </fieldset>
                        
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/80">
                            <button
                                onClick={() => setEditingNode(null)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                {lang === 'zh' ? (isReadOnly ? '关闭' : '取消') : (isReadOnly ? 'Close' : 'Cancel')}
                            </button>
                            {!isReadOnly && (
                                <button
                                    onClick={() => {
                                        setTaskNodes(nodes => nodes.map(n => n.id === editingNode.id ? editingNode : n));
                                        setEditingNode(null);
                                    }}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                >
                                    {lang === 'zh' ? '确定' : 'Confirm'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 右键菜单 */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-[55]" onClick={closeContextMenu} />
                    <div 
                        className="fixed z-[56] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[160px] animate-in fade-in zoom-in-95"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {process.releaseState === 'ONLINE' && (
                            <button
                                onClick={() => { handleOpenRunModal(contextMenu.node); closeContextMenu(); }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                            >
                                <Play size={16} className="text-green-500" />
                                <span>{lang === 'zh' ? '运行此节点' : 'Run This Node'}</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setEditingNode(contextMenu.node); closeContextMenu(); }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                        >
                            <Edit size={16} className="text-blue-500" />
                            <span>{lang === 'zh' ? (isReadOnly ? '查看节点' : '编辑节点') : (isReadOnly ? 'View Node' : 'Edit Node')}</span>
                        </button>
                        {!isReadOnly && (
                            <>
                                <button
                                    onClick={() => handleCopyNode(contextMenu.node)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                                >
                                    <Copy size={16} className="text-green-500" />
                                    <span>{lang === 'zh' ? '复制节点' : 'Copy Node'}</span>
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-slate-600 my-1" />
                                <button
                                    onClick={() => handleDeleteNode(contextMenu.node)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center space-x-2"
                                >
                                    <Trash2 size={16} />
                                    <span>{lang === 'zh' ? '删除节点' : 'Delete Node'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
            
            {/* 运行配置弹窗 */}
            {showRunModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                                <Play size={20} className="mr-2 text-green-500" />
                                {lang === 'zh' ? '运行工作流' : 'Run Workflow'}
                            </h3>
                            <button 
                                onClick={() => setShowRunModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                                <strong>{process.name}</strong>
                            </div>
                            
                            {/* 任务执行范围 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    {lang === 'zh' ? '执行范围' : 'Execution Scope'}
                                </label>
                                <select
                                    value={runConfig.taskDependType}
                                    onChange={(e) => setRunConfig({ ...runConfig, taskDependType: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                >
                                    <option value="TASK_ONLY">{lang === 'zh' ? '当前节点' : 'Current Node Only'}</option>
                                    <option value="TASK_POST">{lang === 'zh' ? '当前及以后节点' : 'Current and Downstream Nodes'}</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {lang === 'zh' ? '失败策略' : 'Failure Strategy'}
                                    </label>
                                    <select
                                        value={runConfig.failureStrategy}
                                        onChange={(e) => setRunConfig({ ...runConfig, failureStrategy: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    >
                                        <option value="CONTINUE">{lang === 'zh' ? '继续执行' : 'Continue'}</option>
                                        <option value="END">{lang === 'zh' ? '结束执行' : 'End'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {lang === 'zh' ? '告警类型' : 'Warning Type'}
                                    </label>
                                    <select
                                        value={runConfig.warningType}
                                        onChange={(e) => setRunConfig({ ...runConfig, warningType: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    >
                                        <option value="NONE">{lang === 'zh' ? '无' : 'None'}</option>
                                        <option value="SUCCESS">{lang === 'zh' ? '成功' : 'Success'}</option>
                                        <option value="FAILURE">{lang === 'zh' ? '失败' : 'Failure'}</option>
                                        <option value="ALL">{lang === 'zh' ? '全部' : 'All'}</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {lang === 'zh' ? '优先级' : 'Priority'}
                                    </label>
                                    <select
                                        value={runConfig.processInstancePriority}
                                        onChange={(e) => setRunConfig({ ...runConfig, processInstancePriority: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    >
                                        <option value="HIGHEST">{lang === 'zh' ? '最高' : 'Highest'}</option>
                                        <option value="HIGH">{lang === 'zh' ? '高' : 'High'}</option>
                                        <option value="MEDIUM">{lang === 'zh' ? '中' : 'Medium'}</option>
                                        <option value="LOW">{lang === 'zh' ? '低' : 'Low'}</option>
                                        <option value="LOWEST">{lang === 'zh' ? '最低' : 'Lowest'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Worker Group
                                    </label>
                                    <input
                                        type="text"
                                        value={runConfig.workerGroup}
                                        onChange={(e) => setRunConfig({ ...runConfig, workerGroup: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={runConfig.dryRun === 1}
                                        onChange={(e) => setRunConfig({ ...runConfig, dryRun: e.target.checked ? 1 : 0 })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {lang === 'zh' ? '空跑模式' : 'Dry Run'}
                                    </span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowRunModal(false)}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleRunProcess}
                                disabled={runningProcess}
                                className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {runningProcess && <Loader2 size={16} className="animate-spin" />}
                                <Play size={16} />
                                <span>{lang === 'zh' ? '运行' : 'Run'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 退出确认弹窗 */}
            <ConfirmModal
                isOpen={showExitConfirm}
                title={lang === 'zh' ? '退出确认' : 'Confirm Exit'}
                message={lang === 'zh' ? '是否保存当前更改后退出？' : 'Save changes before exit?'}
                confirmText={lang === 'zh' ? '保存并退出' : 'Save & Exit'}
                cancelText={lang === 'zh' ? '不保存' : 'Discard'}
                type="info"
                onConfirm={async () => {
                    const saved = await handleSaveWorkflow();
                    if (saved) {
                        setShowExitConfirm(false);
                        onClose();
                    }
                }}
                onCancel={() => {
                    setShowExitConfirm(false);
                    onClose();
                }}
            />

            {/* K8S 节点配置弹窗 */}
            {showK8sNodeDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <Container size={20} className="mr-2 text-purple-500" />
                                {lang === 'zh' ? (editingK8sNodeId ? '编辑 K8S 节点' : '新建 K8S 节点') : (editingK8sNodeId ? 'Edit K8S Node' : 'New K8S Node')}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* 配置文件路径 */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                    {lang === 'zh' ? '配置文件路径' : 'Config Path'} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={k8sNodeConfigPath}
                                        onChange={e => setK8sNodeConfigPath(e.target.value)}
                                        placeholder="smart_cloud_pro/syn_ods_t_table_name_d.conf"
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setShowK8sResourceBrowser(true);
                                            setK8sResourceHistory([{name: '根目录', path: ''}]);
                                            setK8sResourceSearch('');
                                            setK8sResourceLoading(true);
                                            try {
                                                const url = `${projectConfig.baseUrl}/resources?fullName=&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
                                                const result = await resp.json();
                                                if (result.code === 0) setK8sResourceFiles(result.data?.totalList || result.data || []);
                                            } catch (e) { console.error(e); }
                                            finally { setK8sResourceLoading(false); }
                                        }}
                                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                                    >
                                        📂 {lang === 'zh' ? '浏览' : 'Browse'}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                    {lang === 'zh' ? '节点名称自动生成' : 'Node name auto-generated'}
                                    {k8sNodeConfigPath && (
                                        <span className="ml-1 text-purple-500 font-mono">
                                            → {k8sNodeConfigPath.replace(/^.*\//, '').replace(/\.conf$/, '').replace(/_/g, '-') || '...'}
                                        </span>
                                    )}
                                </p>
                                {/* 资源中心文件浏览器 */}
                                {showK8sResourceBrowser && (() => {
                                    return (
                                    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                                            <div className="flex items-center space-x-1 text-xs overflow-x-auto">
                                                {k8sResourceHistory.map((h, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <span className="text-slate-400">/</span>}
                                                        <button
                                                            onClick={async () => {
                                                                setK8sResourceHistory(k8sResourceHistory.slice(0, i + 1));
                                                                setK8sResourceSearch('');
                                                                setK8sResourceLoading(true);
                                                                try {
                                                                    const url = `${projectConfig.baseUrl}/resources?fullName=${encodeURIComponent(h.path)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                                    const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
                                                                    const result = await resp.json();
                                                                    if (result.code === 0) setK8sResourceFiles(result.data?.totalList || result.data || []);
                                                                } catch (e) { console.error(e); }
                                                                finally { setK8sResourceLoading(false); }
                                                            }}
                                                            className="text-blue-500 hover:underline"
                                                        >
                                                            {h.name}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <button onClick={() => setShowK8sResourceBrowser(false)} className="text-slate-400 hover:text-slate-600 ml-2">✕</button>
                                        </div>
                                        {/* 全局搜索框 */}
                                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                            <input
                                                type="text"
                                                value={k8sResourceSearch}
                                                onChange={e => setK8sResourceSearch(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        setK8sResourceLoading(true);
                                                        try {
                                                            const searchVal = k8sResourceSearch ? encodeURIComponent(k8sResourceSearch) : '';
                                                            const url = `${projectConfig.baseUrl}/resources?fullName=&tenantCode=&type=FILE&searchVal=${searchVal}&pageNo=1&pageSize=200`;
                                                            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
                                                            const result = await resp.json();
                                                            if (result.code === 0) setK8sResourceFiles(result.data?.totalList || result.data || []);
                                                        } catch (e) { console.error(e); }
                                                        finally { setK8sResourceLoading(false); }
                                                    }
                                                }}
                                                placeholder={lang === 'zh' ? '🔍 全局搜索，回车搜索...' : '🔍 Global search, press Enter...'}
                                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {k8sResourceLoading ? (
                                                <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                                            ) : k8sResourceFiles.length === 0 ? (
                                                <div className="text-center py-4 text-xs text-slate-400">{lang === 'zh' ? '无匹配文件' : 'No matching files'}</div>
                                            ) : (
                                                k8sResourceFiles.map((f: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={async () => {
                                                            if (f.directory) {
                                                                setK8sResourceHistory([...k8sResourceHistory, { name: (f.alias || f.fileName || '').replace(/\/$/, ''), path: f.fullName }]);
                                                                setK8sResourceSearch('');
                                                                setK8sResourceLoading(true);
                                                                try {
                                                                    const url = `${projectConfig.baseUrl}/resources?fullName=${encodeURIComponent(f.fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=200`;
                                                                    const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
                                                                    const result = await resp.json();
                                                                    if (result.code === 0) setK8sResourceFiles(result.data?.totalList || result.data || []);
                                                                } catch (e) { console.error(e); }
                                                                finally { setK8sResourceLoading(false); }
                                                            } else {
                                                                const path = (f.fullName || '').replace(/^.*\/resources\//, '');
                                                                setK8sNodeConfigPath(path);
                                                                setShowK8sResourceBrowser(false);
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
                                        value={k8sNodeDatasource}
                                        onChange={e => setK8sNodeDatasource(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                                        value={k8sNodeImage}
                                        onChange={e => setK8sNodeImage(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:2.3.12-20260204">seatunnel-k8s:2.3.12-20260204</option>
                                        <option value="registry-vpc.cn-shenzhen.aliyuncs.com/zdiai-library/apache_seatunnel-k8s:latest">seatunnel-k8s:latest</option>
                                    </select>
                                    <p className="mt-1 text-xs text-slate-400 font-mono truncate">{k8sNodeImage}</p>
                                </div>
                            </div>

                            {/* 命名空间和环境 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '命名空间' : 'Namespace'}
                                    </label>
                                    <select
                                        value={k8sNodeNamespace}
                                        onChange={e => setK8sNodeNamespace(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value='{"name":"default","cluster":"k8s-Security-Cluster-admin"}'>default (k8s-Security-Cluster-admin)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '环境名称' : 'Environment'}
                                    </label>
                                    <select
                                        value={k8sNodeEnvCode}
                                        onChange={e => setK8sNodeEnvCode(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                                        onClick={() => setK8sNodeTimeoutFlag(!k8sNodeTimeoutFlag)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${k8sNodeTimeoutFlag ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${k8sNodeTimeoutFlag ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                                {k8sNodeTimeoutFlag && (
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-xs text-slate-500">{lang === 'zh' ? '超时策略' : 'Strategy'}</span>
                                            <label className="flex items-center space-x-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                                                <input type="checkbox" checked={k8sNodeTimeoutWarn} onChange={e => setK8sNodeTimeoutWarn(e.target.checked)} className="rounded border-slate-300" />
                                                <span className="text-xs">{lang === 'zh' ? '超时告警' : 'Warn'}</span>
                                            </label>
                                            <label className="flex items-center space-x-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                                                <input type="checkbox" checked={k8sNodeTimeoutFail} onChange={e => setK8sNodeTimeoutFail(e.target.checked)} className="rounded border-slate-300" />
                                                <span className="text-xs">{lang === 'zh' ? '超时失败' : 'Fail'}</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-slate-500">{lang === 'zh' ? '超时时长' : 'Duration'}</span>
                                            <input
                                                type="number"
                                                value={k8sNodeTimeout}
                                                onChange={e => setK8sNodeTimeout(Number(e.target.value))}
                                                min={1}
                                                className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-center focus:ring-2 focus:ring-purple-500 outline-none"
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
                                        value={k8sNodeRetryTimes}
                                        onChange={e => setK8sNodeRetryTimes(Number(e.target.value))}
                                        min={0}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                                        {lang === 'zh' ? '失败重试间隔' : 'Retry Interval'}
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={k8sNodeRetryInterval}
                                            onChange={e => setK8sNodeRetryInterval(Number(e.target.value))}
                                            min={1}
                                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                                    {`["./bin/seatunnel.sh", "--config", "${k8sNodeConfigPath || '...'}", "--download_url", "http://10.0.1.10:82", "-m", "local"]`}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                            <button 
                                onClick={handleCancelK8sNode} 
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button 
                                onClick={handleConfirmK8sNode} 
                                disabled={!k8sNodeConfigPath.trim()}
                                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {lang === 'zh' ? (editingK8sNodeId ? '保存' : '添加节点') : (editingK8sNodeId ? 'Save' : 'Add Node')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
