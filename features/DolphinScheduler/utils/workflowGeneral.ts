import { httpFetch } from '../../../utils/http';
import { DolphinSchedulerApiVersion } from '../../../types';
import { getWorkflowApiPath } from './common';
import { TaskNode } from '../components/TaskEditor/types';

export const createWorkflowWithNode = async (
    workflowName: string,
    nodeType: string,
    taskParams: TaskNode['taskParams'],
    environmentCode: number | undefined,
    timeoutFlag: boolean,
    timeout: number,
    timeoutNotifyStrategy: string,
    failRetryTimes: number,
    failRetryInterval: number,
    projectCode: string,
    baseUrl: string,
    token: string,
    apiVersion?: DolphinSchedulerApiVersion
): Promise<{ success: boolean; msg?: string }> => {
    const taskName = workflowName.replace(/_/g, '-');
    const taskCode = Date.now();
    
    // Fallbacks or special overrides for specific types
    const paramsPayload = {
        localParams: [],
        resourceList: [],
        type: nodeType,
        ...taskParams
    };

    const taskDefinitionList = [{
        code: taskCode,
        version: 0,
        name: taskName,
        description: '',
        taskType: nodeType,
        taskParams: JSON.stringify(paramsPayload),
        flag: 'YES',
        taskPriority: 'MEDIUM',
        workerGroup: 'default',
        environmentCode: environmentCode || -1,
        failRetryTimes: failRetryTimes,
        failRetryInterval: failRetryInterval,
        timeout: timeoutFlag ? timeout : 0,
        timeoutFlag: timeoutFlag ? 'OPEN' : 'CLOSE',
        timeoutNotifyStrategy: timeoutNotifyStrategy,
        delayTime: 0,
        taskExecuteType: 'BATCH',
        isCache: 'NO',
    }];

    const taskRelationList = [{
        preTaskCode: 0,
        postTaskCode: taskCode,
        name: '',
        conditionType: 'NONE',
        conditionParams: '{}',
    }];

    const locations = JSON.stringify([{ taskCode, x: 324, y: 210 }]);

    try {
        const apiPath = getWorkflowApiPath(apiVersion);
        const createUrl = `${baseUrl}/projects/${projectCode}/${apiPath}`;

        const params = new URLSearchParams();
        params.append('name', workflowName);
        params.append('description', '');
        params.append('globalParams', '[]');
        params.append('timeout', '0');
        params.append('executionType', 'PARALLEL');
        params.append('taskDefinitionJson', JSON.stringify(taskDefinitionList));
        params.append('taskRelationJson', JSON.stringify(taskRelationList));
        params.append('locations', locations);
        params.append('tenantCode', 'zdiai'); // Default tenant

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
            return { success: true };
        } else {
            return { success: false, msg: `[${result.code}] ${result.msg}` };
        }
    } catch (error: any) {
        return { success: false, msg: error.message };
    }
};
