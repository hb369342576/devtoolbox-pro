import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { httpFetch } from '../../../../utils/http';
import { getWorkflowApiPath } from '../../utils';
import { DEFAULT_CONFIG_KEY, defaultSettingsTemplate } from '../GlobalSettingsModal';
import { TaskNode, TaskRelation, DolphinSchedulerConfig, ProcessDefinition } from './types';
import { useToast } from '../../../common/Toast';

export function useTaskEditorData(process: ProcessDefinition, projectConfig: DolphinSchedulerConfig) {
    const { t } = useTranslation();
    const { toast } = useToast();
    
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
    const [tenants, setTenants] = useState<{ id: number; tenantCode: string }[]>([]);

    // 保存和退出提示状态
    const [saving, setSaving] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [originalSnapshot, setOriginalSnapshot] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // 全局参数（用 state 管理，防止 mutation 导致保存时丢失）
    const [globalParams, setGlobalParams] = useState(process.globalParams || '[]');

    // 全局默认配置 - 从 localStorage 加载
    const [globalSettings] = useState(() => {
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
                    
                    let taskDefinitionList: any[] = 
                        (workflowData.taskDefinitionList?.length > 0 ? workflowData.taskDefinitionList : null) || 
                        (workflowData.taskDefinitions?.length > 0 ? workflowData.taskDefinitions : null) || 
                        (workflowData.workflowDefinition?.taskDefinitionList?.length > 0 ? workflowData.workflowDefinition.taskDefinitionList : null) || 
                        [];
                    
                    const definitionData = workflowData.workflowDefinition || workflowData.processDefinition;
                    const rawLocations = definitionData?.locations;
                    if (taskDefinitionList.length === 0 && rawLocations) {
                        try {
                            const locArray = typeof rawLocations === 'string' ? JSON.parse(rawLocations) : rawLocations;
                            if (Array.isArray(locArray) && locArray.length > 0) {
                                const taskCodes = locArray.map((loc: any) => loc.taskCode).filter(Boolean);
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
                                        console.warn(`[useTaskEditorData] Failed to fetch task ${taskCode}:`, e);
                                    }
                                }
                                if (fetchedTasks.length > 0) {
                                    taskDefinitionList = fetchedTasks;
                                }
                            }
                        } catch (e) {
                            console.warn('[useTaskEditorData] Failed to parse locations for task fetching:', e);
                        }
                    }
                    
                    const taskRelationList = 
                        (workflowData.workflowTaskRelationList?.length > 0 ? workflowData.workflowTaskRelationList : null) || 
                        (workflowData.processTaskRelationList?.length > 0 ? workflowData.processTaskRelationList : null) || 
                        (workflowData.taskRelationList?.length > 0 ? workflowData.taskRelationList : null) || 
                        workflowData.workflowTaskRelationList ||
                        [];
                    
                    const locations = workflowData.processDefinition?.locations || workflowData.workflowDefinition?.locations;
                    
                    let locationMap: Record<string, { x: number; y: number }> = {};
                    try {
                        if (locations) {
                            const locArray = typeof locations === 'string' ? JSON.parse(locations) : locations;
                            if (Array.isArray(locArray)) {
                                locArray.forEach((loc: { taskCode: number; x: number; y: number }) => {
                                    locationMap[loc.taskCode] = { x: loc.x, y: loc.y };
                                });
                            } else {
                                locationMap = locArray;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse locations:', e);
                    }
                    
                    const nodes: TaskNode[] = taskDefinitionList.map((task: any, index: number) => {
                        const loc = locationMap[task.code] || { x: 150 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 };
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
                            rawTask: task
                        };
                    });
                    
                    let relations: TaskRelation[] = (taskRelationList || [])
                        .filter((r: any) => r.preTaskCode !== 0)
                        .map((r: any) => ({
                            preTaskCode: r.preTaskCode,
                            postTaskCode: r.postTaskCode
                        }));
                    
                    setTaskNodes(nodes);
                    setTaskRelations(relations);
                    setOriginalSnapshot(JSON.stringify({ nodes, relations }));
                } else {
                    toast({
                        title: t('dolphinScheduler.loadFailed'),
                        description: result.msg || 'Unknown error',
                        variant: 'destructive'
                    });
                }
            } catch (error: any) {
                toast({
                    title: t('dolphinScheduler.loadFailed'),
                    description: error.message,
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };
        
        const loadDatasources = async () => {
            try {
                const url = `${projectConfig.baseUrl}/datasources?pageNo=1&pageSize=100`;
                const response = await httpFetch(url, { headers: { 'token': projectConfig.token } });
                const result = await response.json();
                if (result.code === 0 && result.data?.totalList) {
                    setDatasources(result.data.totalList.map((ds: any) => ({
                        id: ds.id, name: ds.name, type: ds.type
                    })));
                }
            } catch (error) {
                console.error('Failed to load datasources:', error);
            }
        };
        
        const loadWorkerGroups = async () => {
            try {
                const url = `${projectConfig.baseUrl}/projects/${projectConfig.projectCode}/worker-group`;
                const response = await httpFetch(url, { headers: { 'token': projectConfig.token } });
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
                const url = `${projectConfig.baseUrl}/environment/query-environment-list`;
                const response = await httpFetch(url, { headers: { 'token': projectConfig.token } });
                const result = await response.json();
                if (result.code === 0 && result.data) {
                    setEnvironments(result.data.map((e: any) => ({
                        code: e.code, name: e.name, config: e.config
                    })));
                }
            } catch (error) {
                console.error('Failed to load environments:', error);
            }
        };
        
        const loadAlertGroups = async () => {
            try {
                const isV34 = projectConfig.apiVersion === 'v3.4';
                const urls = isV34 
                    ? [
                        `${projectConfig.baseUrl}/alert-group/query-list`,
                        `${projectConfig.baseUrl}/alert-group/list`,
                        `${projectConfig.baseUrl}/alert-group/query-list-paging?pageNo=1&pageSize=100`
                      ]
                    : [`${projectConfig.baseUrl}/alert-groups/normal-list`];
                
                let lastResponse;
                for (const url of urls) {
                    lastResponse = await httpFetch(url, { headers: { 'token': projectConfig.token } });
                    if (lastResponse.status === 200) {
                        const contentType = lastResponse.headers['content-type'] || '';
                        if (contentType.includes('application/json')) break;
                    }
                }

                if (!lastResponse) return;
                const text = await lastResponse.text();
                if (text.trim().startsWith('<')) {
                    setAlertGroups([]);
                    return;
                }

                try {
                    const result = JSON.parse(text);
                    if (result.code === 0 && result.data) {
                        const list = Array.isArray(result.data) ? result.data : (result.data.totalList || []);
                        setAlertGroups(list.map((g: any) => ({ id: g.id, groupName: g.groupName })));
                    }
                } catch (e) {
                    setAlertGroups([]);
                }
            } catch (error) {
                console.error('Failed to load alert groups:', error);
            }
        };
        
        const loadTenants = async () => {
            try {
                const url = `${projectConfig.baseUrl}/tenants?pageNo=1&pageSize=100`;
                const response = await httpFetch(url, { headers: { 'token': projectConfig.token } });
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

        loadWorkflowDetail();
        loadDatasources();
        loadWorkerGroups();
        loadEnvironments();
        loadAlertGroups();
        loadTenants();
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
            const locations = taskNodes.map(node => ({
                taskCode: node.code,
                x: Math.round(node.x),
                y: Math.round(node.y)
            }));
            
            const taskDefinitionJson = taskNodes.map(node => {
                const taskParams = typeof node.taskParams === 'string' 
                    ? JSON.parse(node.taskParams) 
                    : (node.taskParams || {});
                
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
                
                const hasTimeout = node.timeout && node.timeout > 0;
                // 确保新节点（没有 environmentCode）不会带上异常值，使用默认值
                const envCode = (node as any).environmentCode > 0
                    ? (node as any).environmentCode
                    : 164447603311488;
                return {
                    code: node.code,
                    version: 1,
                    name: node.name,
                    taskType: node.taskType,
                    taskParams: taskParams,
                    failRetryTimes: node.failRetryTimes ?? 0,
                    failRetryInterval: node.failRetryInterval ?? 1,
                    timeout: node.timeout ?? 0,
                    description: node.description || '',
                    flag: 'YES',
                    taskPriority: 'MEDIUM',
                    workerGroup: taskParams?.workerGroup || 'default',
                    environmentCode: envCode,
                    delayTime: 0,
                    taskExecuteType: 'BATCH',
                    isCache: 'NO',
                    timeoutFlag: hasTimeout ? 'OPEN' : 'CLOSE',
                    timeoutNotifyStrategy: hasTimeout ? 'FAILED' : null
                };
            });
            
            const taskRelationJson = taskRelations.map(rel => ({
                preTaskCode: rel.preTaskCode,
                postTaskCode: rel.postTaskCode,
                name: '',
                preTaskVersion: 1,
                postTaskVersion: 1,
                conditionType: 'NONE',
                conditionParams: {}
            }));
            
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
            formData.append('globalParams', globalParams);
            formData.append('timeout', '0');
            
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
                    title: t('dolphinScheduler.editor.saveSuccess'),
                    variant: 'success' 
                });
                setOriginalSnapshot(JSON.stringify({ nodes: taskNodes, relations: taskRelations }));
                setHasUnsavedChanges(false);
                return true;
            } else {
                throw new Error(result.msg || 'Unknown error');
            }
        } catch (error: any) {
            toast({ 
                title: t('dolphinScheduler.editor.saveFailed'), 
                description: error.message, 
                variant: 'destructive' 
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
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
    };
}
