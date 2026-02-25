import { save, open } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile, readTextFile, readDir } from '@tauri-apps/plugin-fs';
import { httpFetch, httpUpload } from '../../utils/http';
import { DolphinSchedulerApiVersion } from '../../types';

/**
 * 根据 API 版本获取工作流定义的 API 路径
 * - v3.2 及以下: process-definition
 * - v3.4 及以上: workflow-definition
 */
export const getWorkflowApiPath = (apiVersion?: DolphinSchedulerApiVersion): string => {
    return apiVersion === 'v3.4' ? 'workflow-definition' : 'process-definition';
};

// 导出核心逻辑
export const exportWorkflowsToLocal = async (
    items: { code: number, name: string }[],
    projectCode: string,
    baseUrl: string,
    token: string,
    baseDir: string,
    batchName: string,
    onProgress?: (current: number, total: number, name: string) => void,
    apiVersion?: DolphinSchedulerApiVersion,
    exportVersion?: DolphinSchedulerApiVersion  // 导出目标版本
) => {
    let successCount = 0;
    const isBatch = items.length > 1;
    const apiPath = getWorkflowApiPath(apiVersion);
    const targetVersion = exportVersion || apiVersion || 'v3.2';
    
    // 统一路径分隔符（Windows 使用反斜杠）
    const normalizePath = (path: string) => path.replace(/\//g, '\\');
    const joinPath = (...parts: string[]) => normalizePath(parts.join('/'));

    // 先创建批量导出的主目录
    if (isBatch && batchName) {
        const batchDir = joinPath(baseDir, batchName);
        try {
            await mkdir(batchDir, { recursive: true });
            console.log('[Export] Created batch directory:', batchDir);
        } catch (e) {
            console.log('[Export] Create batch dir result:', e);
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (onProgress) onProgress(i + 1, items.length, item.name);

        try {
            const url = `${baseUrl}/projects/${projectCode}/${apiPath}/${item.code}`;
            const response = await httpFetch(url, { headers: { 'token': token } });
            const result = await response.json();

            if (result.code !== 0 || !result.data) continue;

            const workflowData = result.data;
            // 3.4.0 使用 workflowDefinition，旧版本使用 processDefinition
            const definitionData = workflowData.workflowDefinition || workflowData.processDefinition;
            const workflowName = definitionData?.name || item.name;

            // 目录结构：
            // 批量: {baseDir}/{batchName}/{workflowName}/
            // 单个: {baseDir}/{workflowName}/
            const workflowDir = isBatch 
                ? joinPath(baseDir, batchName, workflowName)
                : joinPath(baseDir, workflowName);

            // 确保目录存在
            try {
                await mkdir(workflowDir, { recursive: true });
            } catch (e) {
                console.log('[Export] mkdir result:', e);
            }

            // === 诊断日志：输出 3.4.0 API 原始响应结构 ===
            console.log(`[Export][${item.name}] workflowData keys:`, Object.keys(workflowData));
            console.log(`[Export][${item.name}] taskDefinitionList:`, workflowData.taskDefinitionList?.length ?? 'undefined');
            console.log(`[Export][${item.name}] taskDefinitions:`, workflowData.taskDefinitions?.length ?? 'undefined');
            if (workflowData.workflowDefinition) {
                console.log(`[Export][${item.name}] workflowDefinition keys:`, Object.keys(workflowData.workflowDefinition));
                console.log(`[Export][${item.name}] workflowDefinition.taskDefinitionList:`, workflowData.workflowDefinition.taskDefinitionList?.length ?? 'undefined');
            }
            // 输出原始数据的前 2000 字符用于深度诊断
            console.log(`[Export][${item.name}] RAW DATA (first 2000 chars):`, JSON.stringify(workflowData).substring(0, 2000));

            // 深度探测任务列表：优先使用非空数组，适配 3.4.0 的结构差异
            let tasks: any[] = 
                (workflowData.taskDefinitionList?.length > 0 ? workflowData.taskDefinitionList : null) || 
                (workflowData.taskDefinitions?.length > 0 ? workflowData.taskDefinitions : null) || 
                (workflowData.workflowDefinition?.taskDefinitionList?.length > 0 ? workflowData.workflowDefinition.taskDefinitionList : null) || 
                [];

            // === 3.4.0 补偿逻辑：如果 tasks 仍为空，从 locations 取 taskCode 并逐一拉取 ===
            if (tasks.length === 0 && definitionData?.locations) {
                console.log(`[Export][${item.name}] taskDefinitionList is empty, fetching tasks from locations...`);
                try {
                    const locations = typeof definitionData.locations === 'string' 
                        ? JSON.parse(definitionData.locations) 
                        : definitionData.locations;
                    
                    if (Array.isArray(locations) && locations.length > 0) {
                        const taskCodes = locations.map((loc: any) => loc.taskCode).filter(Boolean);
                        console.log(`[Export][${item.name}] Found ${taskCodes.length} taskCodes from locations:`, taskCodes);
                        
                        for (const taskCode of taskCodes) {
                            try {
                                const taskUrl = `${baseUrl}/projects/${projectCode}/task-definition/${taskCode}`;
                                const taskRes = await httpFetch(taskUrl, { headers: { 'token': token } });
                                const taskResult = await taskRes.json();
                                if (taskResult.code === 0 && taskResult.data) {
                                    tasks.push(taskResult.data);
                                }
                            } catch (e) {
                                console.warn(`[Export] Failed to fetch task ${taskCode}:`, e);
                            }
                        }
                        console.log(`[Export][${item.name}] Fetched ${tasks.length} tasks via individual API calls`);
                    }
                } catch (e) {
                    console.warn(`[Export][${item.name}] Failed to parse locations:`, e);
                }
            }

            // 深度探测连线关系：优先使用非空数组
            const taskRelations = 
                (workflowData.workflowTaskRelationList?.length > 0 ? workflowData.workflowTaskRelationList : null) || 
                (workflowData.processTaskRelationList?.length > 0 ? workflowData.processTaskRelationList : null) || 
                (workflowData.taskRelationList?.length > 0 ? workflowData.taskRelationList : null) || 
                workflowData.workflowTaskRelationList ||
                [];

            // 根据目标版本选择字段名
            const defKey = targetVersion === 'v3.4' ? 'workflowDefinition' : 'processDefinition';

            const simplifiedWorkflow: any = {
                name: workflowName,
                description: definitionData?.description || '',
                globalParams: definitionData?.globalParamList || [],
                timeout: definitionData?.timeout || 0,
                tenantCode: definitionData?.tenantCode || 'default',
                executionType: definitionData?.executionType || 'PARALLEL',
                [defKey]: definitionData, // 使用目标版本的字段名
                exportVersion: targetVersion, // 标记导出版本
                tasks: [],
                relations: taskRelations
            };

            for (const task of tasks) {
                // 深拷贝任务对象以保留所有字段
                const taskCopy = JSON.parse(JSON.stringify(task));
                const taskParams = taskCopy.taskParams || {};
                const taskType = taskCopy.taskType;
                const taskName = taskCopy.name;

                // 分离 SQL
                if (taskType === 'SQL' && taskParams.sql) {
                    const sqlFileName = `${taskName}.sql`;
                    const sqlFilePath = joinPath(workflowDir, sqlFileName);
                    await writeTextFile(sqlFilePath, taskParams.sql);
                    
                    taskCopy.sqlFile = sqlFileName;
                    taskParams.sql = `Ref: ${sqlFileName}`;
                }
                // 分离 SeaTunnel
                else if (taskType === 'SEATUNNEL' && taskParams.rawScript) {
                    const confFileName = `${taskName}.conf`;
                    const confFilePath = joinPath(workflowDir, confFileName);
                    await writeTextFile(confFilePath, taskParams.rawScript);
                    
                    taskCopy.configFile = confFileName;
                    taskParams.rawScript = `Ref: ${confFileName}`;
                }

                simplifiedWorkflow.tasks.push(taskCopy);
            }

            const workflowJsonPath = joinPath(workflowDir, 'workflow.json');
            await writeTextFile(
                workflowJsonPath, 
                JSON.stringify(simplifiedWorkflow, null, 2)
            );

            successCount++;
        } catch (err) {
            console.error(`Export ${item.name} failed:`, err);
        }
    }
    return successCount;
};

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

    // ================================================================
    // 助手函数：构建任务参数字符串
    // ================================================================
    const buildTaskParamsStr = (task: any): string => {
        let obj: any;
        if (typeof task.taskParams === 'string') {
            try { obj = JSON.parse(task.taskParams); } catch { obj = {}; }
        } else {
            obj = { ...(task.taskParams || {}) };
        }
        // 恢复外部文件内容
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

        // 修复依赖任务中的 projectCode (如果是 Dependent 任务)
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
        // ================================================================
        // 1. 探测是否存在同名工作流 (逻辑：按名对齐原地更新)
        // ================================================================
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

        // ================================================================
        // 2. 如果存在冲突，获取当前详情以对齐 Task Code
        // ================================================================
        if (targetWorkflowCode) {
            const detailUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}/${targetWorkflowCode}`;
            const detailRes = await httpFetch(detailUrl, { headers: { token } });
            const detailResult = await detailRes.json();
            
            if (detailResult.code === 0 && detailResult.data) {
                // 探测远程任务列表
                const remoteData = detailResult.data;
                remoteTasks = 
                    (remoteData.taskDefinitionList?.length > 0 ? remoteData.taskDefinitionList : null) || 
                    (remoteData.taskDefinitions?.length > 0 ? remoteData.taskDefinitions : null) || 
                    (remoteData.workflowDefinition?.taskDefinitionList?.length > 0 ? remoteData.workflowDefinition.taskDefinitionList : null) || 
                    [];
                
                // === 3.4.0 补偿逻辑：从 locations 逐一拉取远程任务定义 ===
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

        // ================================================================
        // 3. 构建任务/关系数据并进行“名称对齐”
        // ================================================================
        const tasks = workflow.tasks || [];
        const relations = workflow.relations || [];
        const defData = workflow.workflowDefinition || workflow.processDefinition || {};
        const globalParams = workflow.globalParams || defData.globalParamList || [];

        // 对齐任务：如果存在远程任务（更新模式），使用远程的 code；否则保留原始 code
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

        // 对齐关系：关系不需要对齐 code，如果是更新模式，后端会自动处理
        let workflowTaskRelationList = relations.map((r: any) => ({
            preTaskCode: r.preTaskCode ?? 0,
            postTaskCode: r.postTaskCode,
            name: r.name || '',
            conditionType: r.conditionType || 'NONE',
            conditionParams: typeof r.conditionParams === 'string' ? r.conditionParams : JSON.stringify(r.conditionParams || {}),
        }));

        // 如果没有显式关系，构造默认关系
        if (workflowTaskRelationList.length === 0 && tasks.length > 0) {
            workflowTaskRelationList = taskDefinitionList.map((t: any) => ({
                preTaskCode: 0,
                postTaskCode: t.code, // 这里可能是 0，但 3.4 原生导入可以选填
                name: '',
                conditionType: 'NONE',
                conditionParams: '{}',
            }));
        }

        // ================================================================
        // 4. 执行更新 (PUT) 或 导入 (POST)
        // ================================================================
        if (targetWorkflowCode) {
            // 直接更新模式：名称不会改变
            console.log(`[Import] Overwrite via PUT: ${workflowName}`);
            const updateUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}/${targetWorkflowCode}`;
            
            // 构建更新参数
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
            // 直接创建模式：全新的工作流（不再使用原生 import 接口，避免 50018 错误）
            console.log(`[Import] Create via POST: ${workflowName}`);
            const createUrl = `${baseUrl}/projects/${projectCode}/${getWorkflowApiPath(apiVersion)}`;
            
            // 使用与 PUT 更新相同的参数格式
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
