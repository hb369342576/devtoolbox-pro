// SeaTunnel 引擎类型
export type SeaTunnelEngineType = 'zeta' | 'flink' | 'spark';

// Zeta API 版本
export type ZetaApiVersion = 'v1' | 'v2';

// 引擎配置
export interface SeaTunnelEngineConfig {
    id: string;
    name: string;                    // 配置名称
    engineType: SeaTunnelEngineType; // 引擎类型
    baseUrl: string;                 // API 地址
    apiVersion?: ZetaApiVersion;     // API 版本 (仅 Zeta, 默认 v1)
    // Zeta V1: http://host:5801 (使用 /hazelcast/rest/maps/*)
    // Zeta V2: http://host:8080 (使用 /overview, /running-jobs 等)
    // Flink: http://host:8088 (Yarn) 或 http://host:8081 (Standalone)
    // Spark: http://host:4040
}

// 作业状态
export type JobStatus = 
    | 'RUNNING' 
    | 'FINISHED' 
    | 'FAILED' 
    | 'CANCELED' 
    | 'CREATED' 
    | 'SCHEDULED'
    | 'CANCELING'
    | 'SAVEPOINT_DONE'
    | 'UNKNOWABLE';

// 已完成作业的状态过滤选项
export type FinishedJobState = 'FINISHED' | 'CANCELED' | 'FAILED' | 'SAVEPOINT_DONE' | 'UNKNOWABLE';

// 作业信息
export interface SeaTunnelJob {
    jobId: string;
    jobName: string;
    jobStatus: JobStatus;
    createTime: string;
    finishTime?: string;
    engineType: SeaTunnelEngineType;
    metrics?: JobMetrics;
    errorMsg?: string;
    jobDag?: string;
}

// 作业指标
export interface JobMetrics {
    readRowCount: number;
    writeRowCount: number;
    readBytes: number;
    writeBytes: number;
}

// 提交作业请求
export interface SubmitJobRequest {
    jobName?: string;
    jobId?: string;
    isStartWithSavePoint?: boolean;
    config: string; // SeaTunnel 配置内容
}

// 配置文件
export interface ConfigFile {
    id: string;
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}
