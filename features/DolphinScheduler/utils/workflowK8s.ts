import { httpFetch } from '../../../utils/http';
import { DolphinSchedulerApiVersion } from '../../../types';
import { getWorkflowApiPath } from './common';

/**
 * 创建 K8S 工作流
 */
export const createK8sWorkflow = async (
    workflowName: string,
    configPath: string,
    datasource: number,
    image: string,
    namespace: string,
    environmentCode: number,
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

    const command = JSON.stringify([
        "./bin/seatunnel.sh", "--config", configPath,
        "--download_url", "http://10.0.1.10:82", "-m", "local"
    ]);

    const taskParams = {
        localParams: [],
        resourceList: [],
        namespace: namespace,
        image: image,
        imagePullPolicy: 'IfNotPresent',
        command: command,
        customizedLabels: [],
        nodeSelectors: [],
        datasource: datasource,
        type: 'K8S',
        kubeConfig: ''
    };

    const taskCode = Date.now();
    
    const taskDefinitionList = [{
        code: taskCode,
        version: 0,
        name: taskName,
        description: '',
        taskType: 'K8S',
        taskParams: JSON.stringify(taskParams),
        flag: 'YES',
        taskPriority: 'MEDIUM',
        workerGroup: 'default',
        environmentCode: environmentCode,
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
        params.append('tenantCode', 'zdiai');

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
            console.log('[CreateK8s] Success:', workflowName);
            return { success: true };
        } else {
            console.error('[CreateK8s] Failed:', result.code, result.msg);
            return { success: false, msg: `[${result.code}] ${result.msg}` };
        }
    } catch (error: any) {
        console.error('[CreateK8s] Error:', error);
        return { success: false, msg: error.message };
    }
};
