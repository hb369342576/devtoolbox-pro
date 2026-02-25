import { save, open } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile, readTextFile, readDir } from '@tauri-apps/plugin-fs';
import { httpFetch } from '../../utils/http';
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

            const tasks = workflowData.taskDefinitionList || [];
            // DS 3.4 返回 processTaskRelationList，旧版本返回 taskRelationList
            const taskRelations = workflowData.processTaskRelationList || workflowData.taskRelationList || [];

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
    const apiPath = getWorkflowApiPath(apiVersion);
    const tasks = workflow.tasks || [];
    const relations = workflow.relations || [];
    const defData = workflow.workflowDefinition || workflow.processDefinition || {};
    const globalParams = workflow.globalParams || defData.globalParamList || [];
    const isUpdate = !!existingCode;

    // ================================================================
    // 辅助：将 taskParams 统一转为 JSON 字符串
    // 关键：DS 3.4 的 TaskDefinitionLog.taskParams 字段类型是 String
    // JSONUtils.toList 反序列化时遇到 JSON 对象会失败 → 报 10001 错误
    // 必须传 JSON 字符串格式（如 "{\"localParams\":[],...}"）
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
        return JSON.stringify(obj);  // 必须返回字符串！
    };

    // ================================================================
    // 枚举整数转换（DS 3.4 所有枚举字段使用 @JsonValue 返回整数）
    // Jackson 反序列化时期望整数，发送字符串会导致 NumberFormatException
    // → JSONUtils.toList 返回空列表 → REQUEST_PARAMS_NOT_VALID_ERROR (10001)
    // ================================================================
    const flagToInt = (v: any) => {
        if (typeof v === 'number') return v;
        return v === 'YES' ? 1 : 0;  // YES=1, NO=0
    };
    const priorityToInt = (v: any) => {
        if (typeof v === 'number') return v;
        const m: Record<string, number> = { HIGHEST: 0, HIGH: 1, MEDIUM: 2, LOW: 3, LOWEST: 4 };
        return m[v] ?? 2;  // 默认 MEDIUM=2
    };
    const timeoutFlagToInt = (v: any) => {
        if (typeof v === 'number') return v;
        return v === 'OPEN' ? 1 : 0;  // CLOSE=0, OPEN=1
    };
    const timeoutStrategyToInt = (v: any) => {
        if (typeof v === 'number') return v;
        const m: Record<string, number> = { WARN: 0, FAILED: 1, WARN_FAILED: 2 };
        return m[v] ?? 0;  // 默认 WARN=0
    };

    // ================================================================
    // 构建 taskDefinitionJson
    // taskParams 使用 JSON 字符串格式（DS 3.4 JSONUtils.toList 要求）
    // 枚举字段使用整数（DS 3.4 @JsonValue 返回整数，Jackson 反序列化期望整数）
    // ================================================================
    const taskDefinitionJson = tasks.map((task: any) => ({
        code: task.code,
        version: task.version || 1,
        name: task.name,
        description: task.description || '',
        taskType: task.taskType,
        taskParams: buildTaskParamsStr(task),          // JSON 字符串
        flag: flagToInt(task.flag ?? 'YES'),           // 整数！1=YES, 0=NO
        taskPriority: priorityToInt(task.taskPriority ?? 'MEDIUM'),  // 整数！
        workerGroup: task.workerGroup || 'default',
        environmentCode: task.environmentCode ?? -1,
        failRetryTimes: task.failRetryTimes ?? 0,
        failRetryInterval: task.failRetryInterval ?? 1,
        timeout: task.timeout ?? 0,
        timeoutFlag: timeoutFlagToInt(task.timeoutFlag ?? 'CLOSE'),  // 整数！
        timeoutNotifyStrategy: timeoutStrategyToInt(task.timeoutNotifyStrategy ?? 'WARN'),  // 整数！
        delayTime: task.delayTime ?? 0,
    }));

    // ================================================================
    // 构建 taskRelationJson
    // conditionType 也是 @JsonValue 整数枚举（NONE=0, AND=1, OR=2）
    // conditionParams 是 String 类型，使用 JSON 字符串
    // ================================================================
    const conditionTypeToInt = (v: any) => {
        if (typeof v === 'number') return v;
        const m: Record<string, number> = { NONE: 0, AND: 1, OR: 2 };
        return m[v] ?? 0;  // 默认 NONE=0
    };
    const buildConditionParamsStr = (r: any): string => {
        if (typeof r.conditionParams === 'string') return r.conditionParams || '{}';
        return JSON.stringify(r.conditionParams || {});
    };

    let taskRelationJson: any[] = relations.map((r: any) => ({
        preTaskCode: r.preTaskCode ?? 0,
        postTaskCode: r.postTaskCode,
        name: r.name || '',
        preTaskVersion: r.preTaskVersion ?? 0,
        postTaskVersion: r.postTaskVersion ?? 1,
        conditionType: conditionTypeToInt(r.conditionType ?? 'NONE'),  // 整数！NONE=0
        conditionParams: buildConditionParamsStr(r),   // 字符串！
    }));

    // 如果 relations 为空，为所有任务补充根节点关系
    if (taskRelationJson.length === 0 && tasks.length > 0) {
        taskRelationJson = tasks.map((t: any) => ({
            preTaskCode: 0,
            postTaskCode: t.code,
            name: '',
            preTaskVersion: 0,
            postTaskVersion: 1,
            conditionType: 0,   // 整数！NONE=0
            conditionParams: '{}',
        }));
    }

    // ================================================================
    // 构建 locations
    // ================================================================
    const locations = taskDefinitionJson.map((td: any, i: number) => {
        const orig = tasks[i];
        return {
            taskCode: td.code,
            x: orig?.x || 150 + (i % 3) * 250,
            y: orig?.y || 100 + Math.floor(i / 3) * 150,
        };
    });

    // ================================================================
    // 提交 POST（新建）/ PUT（更新）请求
    // 关键：不发送 executionType 参数
    // DS 3.4 的 WorkflowExecutionTypeEnum 使用自定义 Spring MVC 转换器
    // 字符串 "PARALLEL" 无法正确绑定，会导致 MethodArgumentTypeMismatchException → 10001
    // defaultValue = "PARALLEL" 将由 DS 端点自动使用
    // ================================================================
    const url = isUpdate
        ? `${baseUrl}/projects/${projectCode}/${apiPath}/${existingCode}`
        : `${baseUrl}/projects/${projectCode}/${apiPath}`;

    const formData = new URLSearchParams();
    formData.append('name', workflow.name);
    formData.append('description', workflow.description || defData.description || '');
    formData.append('globalParams', JSON.stringify(Array.isArray(globalParams) ? globalParams : []));
    formData.append('locations', JSON.stringify(locations));
    formData.append('timeout', String(workflow.timeout ?? defData.timeout ?? 0));
    formData.append('taskRelationJson', JSON.stringify(taskRelationJson));
    formData.append('taskDefinitionJson', JSON.stringify(taskDefinitionJson));
    // executionType 是 @RequestParam，Spring MVC 用 Enum.valueOf() 解析
    // 必须发送枚举名称字符串（如 "PARALLEL"），不是整数
    const executionTypeStr = workflow.executionType || defData.executionType || 'PARALLEL';
    formData.append('executionType', String(executionTypeStr));

    const bodyStr = formData.toString();
    console.log('[Import] taskDef[0] FULL:', JSON.stringify(taskDefinitionJson[0], null, 2));
    console.log('[Import] taskRelation[0] FULL:', JSON.stringify(taskRelationJson[0], null, 2));
    console.log(`[Import] ${isUpdate ? 'PUT' : 'POST'} workflow:`, workflow.name);
    console.log('[Import] URL:', url);
    console.log('[Import] tasks:', taskDefinitionJson.length, 'relations:', taskRelationJson.length);
    console.log('[Import] taskParams[0] type:', typeof taskDefinitionJson[0]?.taskParams, '(should be string)');
    console.log('[Import] flag[0]:', taskDefinitionJson[0]?.flag, '(should be int, 1=YES)');
    console.log('[Import] executionType:', executionTypeStr, '(should be PARALLEL)');
    console.log('[Import] conditionType[0]:', taskRelationJson[0]?.conditionType, '(should be 0=NONE)');
    console.log('[Import] conditionParams[0] type:', typeof taskRelationJson[0]?.conditionParams, '(should be string)');
    console.log('[Import] body (2000):', bodyStr.substring(0, 2000));

    const response = await httpFetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyStr,
    });

    const responseText = await response.text();
    console.log('[Import] Response:', responseText.substring(0, 500));

    if (responseText.trim().startsWith('<')) {
        return { success: false, msg: 'API 返回 HTML，请检查 API 地址' };
    }
    const result = JSON.parse(responseText);
    return result.code === 0 ? { success: true } : { success: false, msg: result.msg || 'Unknown error' };
};
