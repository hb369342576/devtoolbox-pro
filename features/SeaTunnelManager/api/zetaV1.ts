import { httpFetch } from '../../../utils/http';
import { SeaTunnelJob, SubmitJobRequest, SeaTunnelEngineType } from '../types';
import { ApiResponse } from './common';

export const zetaApiV1 = {
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

    async getRunningJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/hazelcast/rest/maps/running-jobs`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
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

    async getJobLog(baseUrl: string, jobId: string): Promise<ApiResponse<string>> {
        try {
            const endpoints = [
                `${baseUrl}/hazelcast/rest/maps/logs/${jobId}`,
                `${baseUrl}/hazelcast/rest/maps/log/${jobId}`,
                `${baseUrl}/hazelcast/rest/maps/job-log/${jobId}`,
            ];
            
            for (const url of endpoints) {
                try {
                    const response = await httpFetch(url, { method: 'GET' });
                    if (response.ok) {
                        const text = await response.text();
                        if (text && text.trim()) {
                            return { success: true, data: text };
                        }
                    }
                } catch {
                }
            }
            
            return { 
                success: false, 
                error: 'SeaTunnel Zeta API 暂不支持日志查询，日志存储在服务器本地 logs/ 目录' 
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};
