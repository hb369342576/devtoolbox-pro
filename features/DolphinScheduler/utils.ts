import { save, open } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile, readTextFile, readDir } from '@tauri-apps/plugin-fs';

// 导出核心逻辑
export const exportWorkflowsToLocal = async (
    items: { code: number, name: string }[],
    projectCode: string,
    baseUrl: string,
    token: string,
    baseDir: string,
    batchName: string,
    onProgress?: (current: number, total: number, name: string) => void
) => {
    let successCount = 0;
    const isBatch = items.length > 1;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (onProgress) onProgress(i + 1, items.length, item.name);

        try {
            const url = `${baseUrl}/projects/${projectCode}/process-definition/${item.code}`;
            const response = await fetch(url, { headers: { 'token': token } });
            const result = await response.json();

            if (result.code !== 0 || !result.data) continue;

            const workflowData = result.data;
            const workflowName = workflowData.processDefinition?.name || item.name;

            // 目录结构：
            // 批量: {baseDir}/{batchName}/{workflowName}/
            // 单个: {baseDir}/{workflowName}/
            const workflowDir = isBatch 
                ? `${baseDir}/${batchName}/${workflowName}`
                : `${baseDir}/${workflowName}`;

            try {
                await mkdir(workflowDir, { recursive: true });
            } catch (e) { }

            // 解析并分离文件
            const tasks = workflowData.taskDefinitionList || [];
            const taskRelations = workflowData.taskRelationList || [];

            const simplifiedWorkflow: any = {
                name: workflowName,
                description: workflowData.processDefinition?.description || '',
                globalParams: workflowData.processDefinition?.globalParamList || [],
                timeout: workflowData.processDefinition?.timeout || 0,
                tenantCode: workflowData.processDefinition?.tenantCode || 'default',
                executionType: workflowData.processDefinition?.executionType || 'PARALLEL',
                processDefinition: workflowData.processDefinition, // 保留原始定义以防万一
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
                    await writeTextFile(`${workflowDir}/${sqlFileName}`, taskParams.sql);
                    
                    // 在 JSON 中标记并在 taskParams 中清除内容以免冗余（或者保留引用）
                    taskCopy.sqlFile = sqlFileName;
                    taskParams.sql = `Ref: ${sqlFileName}`; // 替换为引用标记
                }
                // 分离 SeaTunnel
                else if (taskType === 'SEATUNNEL' && taskParams.rawScript) {
                    const confFileName = `${taskName}.conf`;
                    await writeTextFile(`${workflowDir}/${confFileName}`, taskParams.rawScript);
                    
                    taskCopy.configFile = confFileName;
                    taskParams.rawScript = `Ref: ${confFileName}`;
                }

                simplifiedWorkflow.tasks.push(taskCopy);
            }

            await writeTextFile(
                `${workflowDir}/workflow.json`, 
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
