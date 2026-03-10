import { useState, useEffect, useCallback, useRef } from 'react';
import { DolphinSchedulerConfig, ProcessDefinition, TabType, DolphinSchedulerApiVersion } from './types';
import { httpFetch } from '../../../utils/http';
import { getWorkflowApiPath } from '../utils';
import { useToast } from '../../common/Toast';
import { useTranslation } from 'react-i18next';

export const useTaskManagerData = (currentProject: DolphinSchedulerConfig | null) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
    const [total, setTotal] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [resolvedProjectCode, setResolvedProjectCode] = useState<string>(currentProject?.projectCode || '');

    // 工作流实例
    const [instances, setInstances] = useState<any[]>([]);
    const [instanceTotal, setInstanceTotal] = useState(0);
    const [instancePageNo, setInstancePageNo] = useState(1);
    const [instancePageSize, setInstancePageSize] = useState(20);
    const [instanceLoading, setInstanceLoading] = useState(false);
    const [instanceSearch, setInstanceSearch] = useState('');

    // 工作流定时
    const [schedules, setSchedules] = useState<any[]>([]);
    const [scheduleTotal, setScheduleTotal] = useState(0);
    const [schedulePageNo, setSchedulePageNo] = useState(1);
    const [schedulePageSize, setSchedulePageSize] = useState(20);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // 任务实例
    const [taskInstances, setTaskInstances] = useState<any[]>([]);
    const [taskInstanceTotal, setTaskInstanceTotal] = useState(0);
    const [taskInstancePageNo, setTaskInstancePageNo] = useState(1);
    const [taskInstancePageSize, setTaskInstancePageSize] = useState(20);
    const [taskInstanceLoading, setTaskInstanceLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<TabType>('workflow-definition');

    // 解析 projectCode
    const resolveCode = useCallback(async () => {
        if (!currentProject || currentProject.projectCode) {
            if (currentProject?.projectCode) setResolvedProjectCode(currentProject.projectCode);
            return;
        }
        try {
            const url = `${currentProject.baseUrl}/projects?pageNo=1&pageSize=100&searchVal=${encodeURIComponent(currentProject.projectName || '')}`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            const result = await resp.json();
            if (result.code === 0) {
                const found = result.data?.totalList?.find((p: any) => p.name === currentProject.projectName);
                if (found) setResolvedProjectCode(String(found.code));
            }
        } catch (e) {
            console.error(e);
        }
    }, [currentProject]);

    // 获取工作流定义
    const fetchProcesses = useCallback(async () => {
        if (!currentProject || !resolvedProjectCode) return;
        setLoading(true);
        try {
            const apiPath = getWorkflowApiPath(currentProject.apiVersion);
            const url = `${currentProject.baseUrl}/projects/${resolvedProjectCode}/${apiPath}?pageNo=${pageNo}&pageSize=${pageSize}&searchVal=${encodeURIComponent(searchTerm)}`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            const json = await resp.json();
            if (json.code === 0) {
                const list = json.data?.totalList || (Array.isArray(json.data) ? json.data : []);
                setProcesses(list);
                setTotal(json.data?.total || list.length || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [currentProject, resolvedProjectCode, pageNo, pageSize, searchTerm]);

    // 获取工作流实例
    const fetchInstances = useCallback(async () => {
        if (!currentProject || !resolvedProjectCode) return;
        setInstanceLoading(true);
        try {
            const instancesPath = currentProject.apiVersion === 'v3.4' ? 'workflow-instances' : 'process-instances';
            const url = `${currentProject.baseUrl}/projects/${resolvedProjectCode}/${instancesPath}?pageNo=${instancePageNo}&pageSize=${instancePageSize}&searchVal=${encodeURIComponent(instanceSearch)}&startDate=&endDate=`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            
            const textResult = await resp.text();
            if (!textResult.startsWith('{') && !textResult.startsWith('[')) {
                console.error('API Error: Not JSON, returned HTML. URL:', url);
                setInstances([]);
                setInstanceTotal(0);
                return;
            }
            const json = JSON.parse(textResult);
            if (json.code === 0) {
                const list = json.data?.totalList || (Array.isArray(json.data) ? json.data : []);
                setInstances(list);
                setInstanceTotal(json.data?.total || list.length || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setInstanceLoading(false);
        }
    }, [currentProject, resolvedProjectCode, instancePageNo, instancePageSize, instanceSearch]);

    // 获取定时任务
    const fetchSchedules = useCallback(async () => {
        if (!currentProject || !resolvedProjectCode) return;
        setScheduleLoading(true);
        try {
            const url = `${currentProject.baseUrl}/projects/${resolvedProjectCode}/schedules?pageNo=${schedulePageNo}&pageSize=${schedulePageSize}&searchVal=`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            
            const textResult = await resp.text();
            if (!textResult.startsWith('{') && !textResult.startsWith('[')) {
                console.warn('Schedules API returned non-JSON data. Skipping.');
                setSchedules([]);
                setScheduleTotal(0);
                return;
            }
            const json = JSON.parse(textResult);
            if (json.code === 0) {
                const list = json.data?.totalList || (Array.isArray(json.data) ? json.data : []);
                setSchedules(list);
                setScheduleTotal(json.data?.total || list.length || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setScheduleLoading(false);
        }
    }, [currentProject, resolvedProjectCode, schedulePageNo, schedulePageSize]);

    // 获取任务实例
    const fetchTaskInstances = useCallback(async () => {
        if (!currentProject || !resolvedProjectCode) return;
        setTaskInstanceLoading(true);
        try {
            const url = `${currentProject.baseUrl}/projects/${resolvedProjectCode}/task-instances?pageNo=${taskInstancePageNo}&pageSize=${taskInstancePageSize}&searchVal=&startDate=&endDate=`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': currentProject.token } });
            
            const textResult = await resp.text();
            if (!textResult.startsWith('{') && !textResult.startsWith('[')) {
                console.warn('TaskInstances API returned non-JSON data. Skipping.');
                setTaskInstances([]);
                setTaskInstanceTotal(0);
                return;
            }
            const json = JSON.parse(textResult);
            if (json.code === 0) {
                const list = json.data?.totalList || (Array.isArray(json.data) ? json.data : []);
                setTaskInstances(list);
                setTaskInstanceTotal(json.data?.total || list.length || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTaskInstanceLoading(false);
        }
    }, [currentProject, resolvedProjectCode, taskInstancePageNo, taskInstancePageSize]);

    const handleRefresh = useCallback(() => {
        if (activeTab === 'workflow-definition') fetchProcesses();
        else if (activeTab === 'workflow-instance') fetchInstances();
        else if (activeTab === 'workflow-schedule') fetchSchedules();
        else if (activeTab === 'task-instance') fetchTaskInstances();
    }, [activeTab, fetchProcesses, fetchInstances, fetchSchedules, fetchTaskInstances]);

    useEffect(() => {
        resolveCode();
    }, [currentProject, resolveCode]);

    useEffect(() => {
        if (!resolvedProjectCode) return;
        handleRefresh();
    }, [resolvedProjectCode, handleRefresh]);

    return {
        loading, processes, total, pageNo, setPageNo, pageSize, setPageSize, searchTerm, setSearchTerm,
        instances, instanceTotal, instancePageNo, setInstancePageNo, instancePageSize, setInstancePageSize, instanceLoading, instanceSearch, setInstanceSearch,
        schedules, scheduleTotal, schedulePageNo, setSchedulePageNo, schedulePageSize, setSchedulePageSize, scheduleLoading,
        taskInstances, taskInstanceTotal, taskInstancePageNo, setTaskInstancePageNo, taskInstancePageSize, setTaskInstancePageSize, taskInstanceLoading,
        activeTab, setActiveTab, resolvedProjectCode, handleRefresh
    };
};
