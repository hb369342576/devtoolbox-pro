import { readTextFile } from '@tauri-apps/plugin-fs';
import { httpFetch } from '../../../utils/http';
import { DolphinSchedulerApiVersion } from '../../../types';
import { getWorkflowApiPath } from './common';

// 从目录读取工作流
export const readWorkflowFromDir = async (dirPath: string) => {
    try {
        const content = await readTextFile(`${dirPath}/workflow.json`);
        const workflow = JSON.parse(content);
        
        // 读取外部引用文件
        for (const task of workflow.tasks || []) {
            if (task.sqlFile) {
                try {
                    task.sql = await readTextFile(`${dirPath}/${task.sqlFile}`);
                } catch {}
            }
            if (task.configFile) {
                try {
                    task.rawScript = await readTextFile(`${dirPath}/${task.configFile}`);
                } catch {}
            }
        }
        
        return workflow;
    } catch (e) {
        throw new Error(`Invalid workflow directory: ${e}`);
    }
};

/**
 * 将工作流导入到 DolphinScheduler
 * @param workflow - readWorkflowFromDir 读取的工作流数据
 * @param projectCode - 项目编码
 * @param baseUrl - API 基础地址
 * @param token - API Token
 * @param apiVersion - API 版本
 * @param existingCode - 已有工作流的 code（更新模式），为空则创建新工作流
 */
export const importWorkflowToDS = async (
    workflow: any,
    projectCode: string,
    baseUrl: string,
    token: string,
    apiVersion?: DolphinSchedulerApiVersion,
    existingCode?: number
): Promise<{ success: boolean; msg?: string }> => {
    const isV34 = apiVersion === 'v3.4';
    const workflowName = workflow.name;

    const buildTaskParamsStr = (task: any): string => {
        let obj: any;
        if (typeof task.taskParams === 'string') {
            try { obj = JSON.parse(task.taskParams); } catch { obj = {}; }
        } else {
            obj = { ...(task.taskParams || {}) };
        }
        if (task.taskType === 'SQL' && task.sql) {
            obj.sql = task.sql;
        } else if (typeof obj.sql === 'string' && obj.sql.startsWith('Ref:') && task.sql) {
            obj.sql = task.sql;
        }
        if (task.taskType === 'SEATUNNEL' && task.rawScript) {
            obj.rawScript = task.rawScript;
        } else if (typeof obj.rawScript === 'string' && obj.rawScript.startsWith('Ref:') && task.rawScript) {
            obj.rawScript = task.rawScript;
        }

        if (task.taskType === 'DEPENDENT' && obj.dependence && Array.isArray(obj.dependence.dependTaskList)) {
            obj.dependence.dependTaskList.forEach((list: any) => {
                if (Array.isArray(list.dependItemList)) {
                    list.dependItemList.forEach((item: any) => {
                        if (item.projectCode) {
                            item.projectCode = Number(projectCode);
                        }
                    });
                }
            });
        }
        return JSON.stringify(obj);
    };

    try {
        let targetWorkflowCode = existingCode;
        let remoteTasks: any[] = [];
        
        if (!targetWorkflowCode) {
            const queryUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}/query-by-name?searchVal=${encodeURIComponent(workflowName)}`;
            const queryRes = await httpFetch(queryUrl, { headers: { token } });
            const queryResult = await queryRes.json();
            
            if (queryResult.code === 0 && queryResult.data) {
                targetWorkflowCode = queryResult.data.code;
                console.log(`[Import] Found existing workflow: ${workflowName} (code: ${targetWorkflowCode})`);
            }
        }

        if (targetWorkflowCode) {
            const detailUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}/${targetWorkflowCode}`;
            const detailRes = await httpFetch(detailUrl, { headers: { token } });
            const detailResult = await detailRes.json();
            
            if (detailResult.code === 0 && detailResult.data) {
                const remoteData = detailResult.data;
                remoteTasks = 
                    (remoteData.taskDefinitionList?.length > 0 ? remoteData.taskDefinitionList : null) || 
                    (remoteData.taskDefinitions?.length > 0 ? remoteData.taskDefinitions : null) || 
                    (remoteData.workflowDefinition?.taskDefinitionList?.length > 0 ? remoteData.workflowDefinition.taskDefinitionList : null) || 
                    [];
                
                if (remoteTasks.length === 0) {
                    const remoteDef = remoteData.workflowDefinition || remoteData.processDefinition;
                    const remoteLocations = remoteDef?.locations;
                    if (remoteLocations) {
                        try {
                            const locArray = typeof remoteLocations === 'string' ? JSON.parse(remoteLocations) : remoteLocations;
                            if (Array.isArray(locArray) && locArray.length > 0) {
                                const taskCodes = locArray.map((loc: any) => loc.taskCode).filter(Boolean);
                                console.log(`[Import] Fetching ${taskCodes.length} remote tasks from locations...`);
                                for (const taskCode of taskCodes) {
                                    try {
                                        const taskUrl = `${baseUrl}/projects/${projectCode}/task-definition/${taskCode}`;
                                        const taskRes = await httpFetch(taskUrl, { headers: { token } });
                                        const taskResult = await taskRes.json();
                                        if (taskResult.code === 0 && taskResult.data) {
                                            remoteTasks.push(taskResult.data);
                                        }
                                    } catch (e) {
                                        console.warn(`[Import] Failed to fetch remote task ${taskCode}:`, e);
                                    }
                                }
                                console.log(`[Import] Fetched ${remoteTasks.length} remote tasks for code alignment`);
                            }
                        } catch (e) {
                            console.warn('[Import] Failed to parse remote locations:', e);
                        }
                    }
                }
            }
        }

        const tasks = workflow.tasks || [];
        const relations = workflow.relations || [];
        const defData = workflow.workflowDefinition || workflow.processDefinition || {};
        const globalParams = workflow.globalParams || defData.globalParamList || [];

        const taskDefinitionList = tasks.map((task: any) => {
            const remoteTask = remoteTasks.find(t => t.name === task.name);
            const taskParamsStr = buildTaskParamsStr(task);
            return {
                code: remoteTask ? remoteTask.code : (task.code || 0),
                version: remoteTask ? remoteTask.version : (task.version || 0),
                name: task.name,
                description: task.description || '',
                taskType: task.taskType,
                taskParams: taskParamsStr,
                flag: task.flag || 'YES',
                taskPriority: task.taskPriority || 'MEDIUM',
                workerGroup: task.workerGroup || 'default',
                environmentCode: task.environmentCode ?? -1,
                failRetryTimes: task.failRetryTimes ?? 0,
                failRetryInterval: task.failRetryInterval ?? 1,
                timeout: task.timeout ?? 0,
                timeoutFlag: task.timeoutFlag || 'CLOSE',
                timeoutNotifyStrategy: task.timeoutNotifyStrategy || 'WARN',
                delayTime: task.delayTime ?? 0,
                taskExecuteType: task.taskExecuteType || 'BATCH',
                isCache: task.isCache || 'NO',
            };
        });
        console.log(`[Import] Built taskDefinitionList: count=${taskDefinitionList.length}, codes=${taskDefinitionList.map(t => t.code).join(',')}`);

        let workflowTaskRelationList = relations.map((r: any) => ({
            preTaskCode: r.preTaskCode ?? 0,
            postTaskCode: r.postTaskCode,
            name: r.name || '',
            conditionType: r.conditionType || 'NONE',
            conditionParams: typeof r.conditionParams === 'string' ? r.conditionParams : JSON.stringify(r.conditionParams || {}),
        }));

        if (workflowTaskRelationList.length === 0 && tasks.length > 0) {
            workflowTaskRelationList = taskDefinitionList.map((t: any) => ({
                preTaskCode: 0,
                postTaskCode: t.code,
                name: '',
                conditionType: 'NONE',
                conditionParams: '{}',
            }));
        }

        if (targetWorkflowCode) {
            console.log(`[Import] Overwrite via PUT: ${workflowName}`);
            const updateUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}/${targetWorkflowCode}`;
            
            const params = new URLSearchParams();
            params.append('name', workflowName);
            params.append('description', workflow.description || defData.description || '');
            params.append('globalParams', JSON.stringify((Array.isArray(globalParams) ? globalParams : []).map((p: any) => ({
                prop: p.prop,
                direct: p.direct || 'IN',
                type: p.type || 'VARCHAR',
                value: p.value || ''
            }))));
            params.append('timeout', (workflow.timeout ?? defData.timeout ?? 0).toString());
            params.append('executionType', workflow.executionType || defData.executionType || 'PARALLEL');
            params.append('taskDefinitionJson', JSON.stringify(taskDefinitionList));
            params.append('taskRelationJson', JSON.stringify(workflowTaskRelationList));
            params.append('locations', JSON.stringify(tasks.map((orig: any, i: number) => ({
                taskCode: taskDefinitionList.find(td => td.name === orig.name)?.code || 0,
                x: orig.x || 150 + (i % 3) * 250,
                y: orig.y || 100 + Math.floor(i / 3) * 150,
            }))));
            params.append('otherParamsJson', '{}');

            const response = await httpFetch(updateUrl, {
                method: 'PUT',
                headers: { 
                    'token': token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const result = await response.json();
            if (result.code === 0) {
                console.log('[Import] Update Success:', workflowName);
                return { success: true };
            } else {
                console.error('[Import] Update Failed:', result.code, result.msg);
                return { success: false, msg: `[${result.code}] ${result.msg}` };
            }

        } else {
            console.log(`[Import] Create via POST: ${workflowName}`);
            const createUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}`;
            
            const params = new URLSearchParams();
            params.append('name', workflowName);
            params.append('description', workflow.description || defData.description || '');
            params.append('globalParams', JSON.stringify((Array.isArray(globalParams) ? globalParams : []).map((p: any) => ({
                prop: p.prop,
                direct: p.direct || 'IN',
                type: p.type || 'VARCHAR',
                value: p.value || ''
            }))));
            params.append('timeout', (workflow.timeout ?? defData.timeout ?? 0).toString());
            params.append('executionType', workflow.executionType || defData.executionType || 'PARALLEL');
            params.append('taskDefinitionJson', JSON.stringify(taskDefinitionList));
            params.append('taskRelationJson', JSON.stringify(workflowTaskRelationList));
            params.append('locations', JSON.stringify(tasks.map((orig: any, i: number) => ({
                taskCode: taskDefinitionList.find(td => td.name === orig.name)?.code || orig.code || 0,
                x: orig.x || 150 + (i % 3) * 250,
                y: orig.y || 100 + Math.floor(i / 3) * 150,
            }))));
            params.append('tenantCode', workflow.tenantCode || defData.tenantCode || 'default');

            const response = await httpFetch(createUrl, {
                method: 'POST',
                headers: { 
                    'token': token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const result = await response.json();
            if (result.code === 0) {
                console.log('[Import] Create Success:', workflowName);
                return { success: true };
            } else {
                console.error('[Import] Create Failed:', result.code, result.msg);
                return { success: false, msg: `[${result.code}] ${result.msg}` };
            }
        }
    } catch (error: any) {
        console.error('[Import] Error:', error);
        return { success: false, msg: error.message };
    }
};
