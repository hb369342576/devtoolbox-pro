import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { httpFetch } from '../../../utils/http';
import { DolphinSchedulerApiVersion } from '../../../types';
import { getWorkflowApiPath } from './common';
import JSZip from 'jszip';

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
    
    // 环境检测
    const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
    
    const normalizePath = (path: string) => path.replace(/\//g, '\\');
    const joinPath = (...parts: string[]) => normalizePath(parts.join('/'));

    let zip: JSZip | null = null;
    let baseZipFolder: JSZip | null = null;
    
    if (isTauri) {
        if (isBatch && batchName) {
            const batchDir = joinPath(baseDir, batchName);
            try {
                await mkdir(batchDir, { recursive: true });
                console.log('[Export] Created batch directory:', batchDir);
            } catch (e) {
                console.log('[Export] Create batch dir result:', e);
            }
        }
    } else {
        // Web 模式：初始化 JSZip
        zip = new JSZip();
        baseZipFolder = isBatch && batchName ? zip.folder(batchName) : zip;
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
            const definitionData = workflowData.workflowDefinition || workflowData.processDefinition;
            const workflowName = definitionData?.name || item.name;

            let workflowDir = '';
            let workflowZipFolder: JSZip | null = null;
            
            if (isTauri) {
                workflowDir = isBatch 
                    ? joinPath(baseDir, batchName, workflowName)
                    : joinPath(baseDir, workflowName);

                try {
                    await mkdir(workflowDir, { recursive: true });
                } catch (e) {
                    console.log('[Export] mkdir result:', e);
                }
            } else if (baseZipFolder) {
                workflowZipFolder = baseZipFolder.folder(workflowName);
            }

            console.log(`[Export][${item.name}] workflowData keys:`, Object.keys(workflowData));
            console.log(`[Export][${item.name}] taskDefinitionList:`, workflowData.taskDefinitionList?.length ?? 'undefined');
            console.log(`[Export][${item.name}] taskDefinitions:`, workflowData.taskDefinitions?.length ?? 'undefined');
            if (workflowData.workflowDefinition) {
                console.log(`[Export][${item.name}] workflowDefinition keys:`, Object.keys(workflowData.workflowDefinition));
                console.log(`[Export][${item.name}] workflowDefinition.taskDefinitionList:`, workflowData.workflowDefinition.taskDefinitionList?.length ?? 'undefined');
            }
            console.log(`[Export][${item.name}] RAW DATA (first 2000 chars):`, JSON.stringify(workflowData).substring(0, 2000));

            let tasks: any[] = 
                (workflowData.taskDefinitionList?.length > 0 ? workflowData.taskDefinitionList : null) || 
                (workflowData.taskDefinitions?.length > 0 ? workflowData.taskDefinitions : null) || 
                (workflowData.workflowDefinition?.taskDefinitionList?.length > 0 ? workflowData.workflowDefinition.taskDefinitionList : null) || 
                [];

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

            const taskRelations = 
                (workflowData.workflowTaskRelationList?.length > 0 ? workflowData.workflowTaskRelationList : null) || 
                (workflowData.processTaskRelationList?.length > 0 ? workflowData.processTaskRelationList : null) || 
                (workflowData.taskRelationList?.length > 0 ? workflowData.taskRelationList : null) || 
                workflowData.workflowTaskRelationList ||
                [];

            const defKey = targetVersion === 'v3.4' ? 'workflowDefinition' : 'processDefinition';

            const simplifiedWorkflow: any = {
                name: workflowName,
                description: definitionData?.description || '',
                globalParams: definitionData?.globalParamList || [],
                timeout: definitionData?.timeout || 0,
                tenantCode: definitionData?.tenantCode || 'default',
                executionType: definitionData?.executionType || 'PARALLEL',
                [defKey]: definitionData,
                exportVersion: targetVersion,
                tasks: [],
                relations: taskRelations
            };

            for (const task of tasks) {
                const taskCopy = JSON.parse(JSON.stringify(task));
                const taskParams = taskCopy.taskParams || {};
                const taskType = taskCopy.taskType;
                const taskName = taskCopy.name;

                if (taskType === 'SQL' && taskParams.sql) {
                    const sqlFileName = `${taskName}.sql`;
                    
                    if (isTauri) {
                        const sqlFilePath = joinPath(workflowDir, sqlFileName);
                        await writeTextFile(sqlFilePath, taskParams.sql);
                    } else if (workflowZipFolder) {
                        workflowZipFolder.file(sqlFileName, taskParams.sql);
                    }
                    
                    taskCopy.sqlFile = sqlFileName;
                    taskParams.sql = `Ref: ${sqlFileName}`;
                }
                else if (taskType === 'SEATUNNEL' && taskParams.rawScript) {
                    const confFileName = `${taskName}.conf`;
                    
                    if (isTauri) {
                        const confFilePath = joinPath(workflowDir, confFileName);
                        await writeTextFile(confFilePath, taskParams.rawScript);
                    } else if (workflowZipFolder) {
                        workflowZipFolder.file(confFileName, taskParams.rawScript);
                    }
                    
                    taskCopy.configFile = confFileName;
                    taskParams.rawScript = `Ref: ${confFileName}`;
                }

                simplifiedWorkflow.tasks.push(taskCopy);
            }

            const workflowJsonStr = JSON.stringify(simplifiedWorkflow, null, 2);
            if (isTauri) {
                const workflowJsonPath = joinPath(workflowDir, 'workflow.json');
                await writeTextFile(workflowJsonPath, workflowJsonStr);
            } else if (workflowZipFolder) {
                workflowZipFolder.file('workflow.json', workflowJsonStr);
            }

            successCount++;
        } catch (err) {
            console.error(`Export ${item.name} failed:`, err);
        }
    }
    
    // 如果是 Web 模式，导出压缩包并下载
    if (!isTauri && zip) {
        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = batchName ? `${batchName}.zip` : 'workflows_export.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[Export] Generate zip failed:', err);
            throw new Error(`Failed to generate Zip file: ${(err as Error).message}`);
        }
    }
    
    return successCount;
};
