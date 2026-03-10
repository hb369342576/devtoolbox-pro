import { DolphinSchedulerApiVersion } from '../../../types';

/**
 * 根据 API 版本获取工作流定义的 API 路径
 * - v3.2 及以下: process-definition
 * - v3.4 及以上: workflow-definition
 */
export const getWorkflowApiPath = (apiVersion?: DolphinSchedulerApiVersion): string => {
    return apiVersion === 'v3.4' ? 'workflow-definition' : 'process-definition';
};

/**
 * 根据 API 版本获取执行器启动路径
 * - v3.2 及以下: start-process-instance
 * - v3.4 及以上: start-workflow-instance
 */
export const getExecutorStartPath = (apiVersion?: DolphinSchedulerApiVersion): string => {
    return apiVersion === 'v3.4' ? 'start-workflow-instance' : 'start-process-instance';
};

/**
 * 根据 API 版本获取工作流代码参数名
 * - v3.2 及以下: processDefinitionCode
 * - v3.4 及以上: workflowDefinitionCode
 */
export const getWorkflowCodeParamName = (apiVersion?: DolphinSchedulerApiVersion): string => {
    return apiVersion === 'v3.4' ? 'workflowDefinitionCode' : 'processDefinitionCode';
};
