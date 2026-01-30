import { httpFetch } from '../../utils/http';
import { SeaTunnelEngineConfig, SeaTunnelJob, SubmitJobRequest, SeaTunnelEngineType, ZetaApiVersion } from './types';

// API 响应通用类型
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============ Zeta Engine API V1 (hazelcast rest) ============
const zetaApiV1 = {
    // 测试连接 - 使用集群概览端点
    async testConnection(baseUrl: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/hazelcast/rest/maps/overview`, {
                method: 'GET',
            });
            if (response.ok) {
                return { success: true, data: true };
            }
            return { success: false, error: `HTTP ${response.status}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取运行中的作业
    async getRunningJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/hazelcast/rest/maps/running-jobs`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            // V1 返回 Map 格式 {jobId: jobInfo}
            const jobs: SeaTunnelJob[] = Object.entries(data).map(([jobId, info]: [string, any]) => ({
                jobId,
                jobName: info.jobName || jobId,
                jobStatus: info.jobStatus || 'RUNNING',
                createTime: info.createTime || '',
                finishTime: info.finishTime,
                engineType: 'zeta' as SeaTunnelEngineType,
                metrics: info.metrics ? {
                    readRowCount: parseInt(info.metrics.sourceReceivedCount) || 0,
                    writeRowCount: parseInt(info.metrics.sinkWriteCount) || 0,
                    readBytes: 0,
                    writeBytes: 0,
                } : undefined,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取已完成的作业
    async getFinishedJobs(baseUrl: string, state?: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const url = state 
                ? `${baseUrl}/hazelcast/rest/maps/finished-jobs/${state}`
                : `${baseUrl}/hazelcast/rest/maps/finished-jobs`;
            const response = await httpFetch(url, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            const jobs: SeaTunnelJob[] = Object.entries(data).map(([key, info]: [string, any]) => ({
                jobId: info.jobId || key,
                jobName: info.jobName || key,
                jobStatus: info.jobStatus || 'FINISHED',
                createTime: info.createTime || '',
                finishTime: info.finishTime,
                engineType: 'zeta' as SeaTunnelEngineType,
                metrics: info.metrics ? {
                    readRowCount: parseInt(info.metrics.SourceReceivedCount) || 0,
                    writeRowCount: parseInt(info.metrics.SinkWriteCount) || 0,
                    readBytes: parseInt(info.metrics.SourceReceivedBytes) || 0,
                    writeBytes: parseInt(info.metrics.SinkWriteBytes) || 0,
                } : undefined,
                errorMsg: info.errorMsg,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 提交作业
    async submitJob(baseUrl: string, request: SubmitJobRequest): Promise<ApiResponse<string>> {
        try {
            const params = new URLSearchParams();
            if (request.jobName) params.append('jobName', request.jobName);
            if (request.jobId) params.append('jobId', request.jobId);
            if (request.isStartWithSavePoint) params.append('isStartWithSavePoint', 'true');
            
            const queryString = params.toString();
            const url = queryString 
                ? `${baseUrl}/hazelcast/rest/maps/submit-job?${queryString}` 
                : `${baseUrl}/hazelcast/rest/maps/submit-job`;
            
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: request.config,
            });
            
            if (!response.ok) {
                const text = await response.text();
                return { success: false, error: text || `HTTP ${response.status}` };
            }
            
            const result = await response.json();
            return { success: true, data: String(result.jobId) || 'submitted' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 取消作业
    async cancelJob(baseUrl: string, jobId: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/hazelcast/rest/maps/cancel-job/${jobId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            return { success: true, data: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取作业详情
    async getJobInfo(baseUrl: string, jobId: string): Promise<ApiResponse<SeaTunnelJob>> {
        try {
            const response = await httpFetch(`${baseUrl}/hazelcast/rest/maps/job-info/${jobId}`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const info = await response.json();
            return {
                success: true,
                data: {
                    jobId: info.jobId || jobId,
                    jobName: info.jobName || jobId,
                    jobStatus: info.jobStatus,
                    createTime: info.createTime,
                    finishTime: info.finishTime,
                    engineType: 'zeta',
                    metrics: info.metrics ? {
                        readRowCount: parseInt(info.metrics.SourceReceivedCount) || 0,
                        writeRowCount: parseInt(info.metrics.SinkWriteCount) || 0,
                        readBytes: parseInt(info.metrics.SourceReceivedBytes) || 0,
                        writeBytes: parseInt(info.metrics.SinkWriteBytes) || 0,
                    } : undefined,
                    errorMsg: info.errorMsg,
                    jobDag: info.jobDag,
                },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};

// ============ Zeta Engine API V2 (Jetty REST) ============
const zetaApiV2 = {
    // 测试连接 - 使用 /overview 端点
    async testConnection(baseUrl: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/overview`, {
                method: 'GET',
            });
            if (response.ok) {
                return { success: true, data: true };
            }
            return { success: false, error: `HTTP ${response.status}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取运行中的作业
    async getRunningJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/running-jobs`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            // V2 返回数组格式
            const jobs: SeaTunnelJob[] = (data || []).map((job: any) => ({
                jobId: String(job.jobId),
                jobName: job.jobName || String(job.jobId),
                jobStatus: job.jobStatus || 'RUNNING',
                createTime: job.createTime || '',
                finishTime: job.finishedTime,
                engineType: 'zeta' as SeaTunnelEngineType,
                metrics: job.metrics ? {
                    readRowCount: parseInt(job.metrics.sourceReceivedCount) || 0,
                    writeRowCount: parseInt(job.metrics.sinkWriteCount) || 0,
                    readBytes: 0,
                    writeBytes: 0,
                } : undefined,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取已完成的作业
    async getFinishedJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/finished-jobs`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            const jobs: SeaTunnelJob[] = (data || []).map((job: any) => ({
                jobId: String(job.jobId),
                jobName: job.jobName || String(job.jobId),
                jobStatus: job.jobStatus || 'FINISHED',
                createTime: job.createTime || '',
                finishTime: job.finishedTime,
                engineType: 'zeta' as SeaTunnelEngineType,
                metrics: job.metrics ? {
                    readRowCount: parseInt(job.metrics.sourceReceivedCount) || 0,
                    writeRowCount: parseInt(job.metrics.sinkWriteCount) || 0,
                    readBytes: 0,
                    writeBytes: 0,
                } : undefined,
                errorMsg: job.errorMsg,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 提交作业
    async submitJob(baseUrl: string, request: SubmitJobRequest): Promise<ApiResponse<string>> {
        try {
            const params = new URLSearchParams();
            if (request.jobName) params.append('jobName', request.jobName);
            if (request.jobId) params.append('jobId', request.jobId);
            if (request.isStartWithSavePoint) params.append('isStartWithSavePoint', 'true');
            
            const queryString = params.toString();
            const url = queryString ? `${baseUrl}/submit-job?${queryString}` : `${baseUrl}/submit-job`;
            
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: request.config,
            });
            
            if (!response.ok) {
                const text = await response.text();
                return { success: false, error: text || `HTTP ${response.status}` };
            }
            
            const result = await response.json();
            return { success: true, data: String(result.jobId) || 'submitted' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 停止作业
    async cancelJob(baseUrl: string, jobId: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/stop-job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId, isStopWithSavePoint: false }),
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            return { success: true, data: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 获取作业详情
    async getJobInfo(baseUrl: string, jobId: string): Promise<ApiResponse<SeaTunnelJob>> {
        try {
            const response = await httpFetch(`${baseUrl}/job-info/${jobId}`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const info = await response.json();
            return {
                success: true,
                data: {
                    jobId: String(info.jobId),
                    jobName: info.jobName || String(info.jobId),
                    jobStatus: info.jobStatus,
                    createTime: info.createTime,
                    finishTime: info.finishedTime,
                    engineType: 'zeta',
                    metrics: info.metrics ? {
                        readRowCount: parseInt(info.metrics.SourceReceivedCount) || 0,
                        writeRowCount: parseInt(info.metrics.SinkWriteCount) || 0,
                        readBytes: parseInt(info.metrics.SourceReceivedBytes) || 0,
                        writeBytes: parseInt(info.metrics.SinkWriteBytes) || 0,
                    } : undefined,
                    errorMsg: info.errorMsg,
                },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};

// 获取 Zeta API 实例
const getZetaApi = (version: ZetaApiVersion = 'v1') => {
    return version === 'v2' ? zetaApiV2 : zetaApiV1;
};

// Flink Engine API (占位，后续实现)
const flinkApi = {
    async testConnection(baseUrl: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/v1/config`, { method: 'GET' });
            return { success: response.ok, data: response.ok };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    async getJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/v1/jobs`, { method: 'GET' });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            const jobs: SeaTunnelJob[] = (data.jobs || []).map((job: any) => ({
                jobId: job.id,
                jobName: job.name,
                jobStatus: job.state?.toUpperCase() || 'RUNNING',
                createTime: new Date(job['start-time']).toISOString(),
                engineType: 'flink' as SeaTunnelEngineType,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    async cancelJob(baseUrl: string, jobId: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/v1/jobs/${jobId}`, { 
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: 'canceled' }),
            });
            return { success: response.ok, data: response.ok };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};

// Spark Engine API (占位，后续实现)
const sparkApi = {
    async testConnection(baseUrl: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/api/v1/applications`, { method: 'GET' });
            return { success: response.ok, data: response.ok };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    async getJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        // Spark History Server API
        try {
            const response = await httpFetch(`${baseUrl}/api/v1/applications`, { method: 'GET' });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            const jobs: SeaTunnelJob[] = (data || []).map((app: any) => ({
                jobId: app.id,
                jobName: app.name,
                jobStatus: app.attempts?.[0]?.completed ? 'FINISHED' : 'RUNNING',
                createTime: app.attempts?.[0]?.startTime || '',
                finishTime: app.attempts?.[0]?.endTime,
                engineType: 'spark' as SeaTunnelEngineType,
            }));
            return { success: true, data: jobs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};

// 统一的 API 入口
export const seaTunnelApi = {
    // 测试连接
    async testConnection(config: SeaTunnelEngineConfig): Promise<ApiResponse<boolean>> {
        switch (config.engineType) {
            case 'zeta':
                return getZetaApi(config.apiVersion).testConnection(config.baseUrl);
            case 'flink':
                return flinkApi.testConnection(config.baseUrl);
            case 'spark':
                return sparkApi.testConnection(config.baseUrl);
            default:
                return { success: false, error: 'Unknown engine type' };
        }
    },

    // 获取所有作业
    async getAllJobs(config: SeaTunnelEngineConfig): Promise<ApiResponse<SeaTunnelJob[]>> {
        switch (config.engineType) {
            case 'zeta': {
                const api = getZetaApi(config.apiVersion);
                const [running, finished] = await Promise.all([
                    api.getRunningJobs(config.baseUrl),
                    api.getFinishedJobs(config.baseUrl),
                ]);
                if (!running.success && !finished.success) {
                    return { success: false, error: running.error || finished.error };
                }
                return {
                    success: true,
                    data: [...(running.data || []), ...(finished.data || [])],
                };
            }
            case 'flink':
                return flinkApi.getJobs(config.baseUrl);
            case 'spark':
                return sparkApi.getJobs(config.baseUrl);
            default:
                return { success: false, error: 'Unknown engine type' };
        }
    },

    // 获取运行中的作业
    async getRunningJobs(config: SeaTunnelEngineConfig): Promise<ApiResponse<SeaTunnelJob[]>> {
        switch (config.engineType) {
            case 'zeta':
                return getZetaApi(config.apiVersion).getRunningJobs(config.baseUrl);
            case 'flink': {
                const result = await flinkApi.getJobs(config.baseUrl);
                if (result.success && result.data) {
                    result.data = result.data.filter(j => j.jobStatus === 'RUNNING');
                }
                return result;
            }
            case 'spark': {
                const result = await sparkApi.getJobs(config.baseUrl);
                if (result.success && result.data) {
                    result.data = result.data.filter(j => j.jobStatus === 'RUNNING');
                }
                return result;
            }
            default:
                return { success: false, error: 'Unknown engine type' };
        }
    },

    // 提交作业 (仅 Zeta 支持)
    async submitJob(config: SeaTunnelEngineConfig, request: SubmitJobRequest): Promise<ApiResponse<string>> {
        if (config.engineType !== 'zeta') {
            return { success: false, error: 'Only Zeta engine supports job submission via REST API' };
        }
        return getZetaApi(config.apiVersion).submitJob(config.baseUrl, request);
    },

    // 取消作业
    async cancelJob(config: SeaTunnelEngineConfig, jobId: string): Promise<ApiResponse<boolean>> {
        switch (config.engineType) {
            case 'zeta':
                return getZetaApi(config.apiVersion).cancelJob(config.baseUrl, jobId);
            case 'flink':
                return flinkApi.cancelJob(config.baseUrl, jobId);
            default:
                return { success: false, error: 'Engine does not support job cancellation' };
        }
    },

    // 获取作业详情
    async getJobInfo(config: SeaTunnelEngineConfig, jobId: string): Promise<ApiResponse<SeaTunnelJob>> {
        if (config.engineType === 'zeta') {
            return getZetaApi(config.apiVersion).getJobInfo(config.baseUrl, jobId);
        }
        return { success: false, error: 'Engine does not support job info API' };
    },
};
