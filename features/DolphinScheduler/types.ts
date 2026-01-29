export interface ProcessDefinition {
    id: number;
    code: number;
    name: string;
    version: number;
    releaseState: 'ONLINE' | 'OFFLINE';
    projectCode: number;
    description: string;
    globalParams: string;
    createTime: string;
    updateTime: string;
    userName?: string;
    modifyBy?: string;
    scheduleReleaseState?: 'ONLINE' | 'OFFLINE' | null;
}

export interface ProjectConfig {
    id: string;
    name: string;
    baseUrl: string;
    token: string;
    projectName: string;
    projectCode?: string;
}

export type Language = 'zh' | 'en';

export interface ProcessInstance {
    id: number;
    name: string;
    processDefinitionCode: number;
    state: string;
    runTimes: number;
    startTime: string;
    endTime: string;
    duration: string;
    host: string;
    executorName: string;
    commandType?: string;
}
