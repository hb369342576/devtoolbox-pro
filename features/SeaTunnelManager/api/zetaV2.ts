import { httpFetch } from '../../../utils/http';
import { SeaTunnelJob, SubmitJobRequest, SeaTunnelEngineType } from '../types';
import { ApiResponse } from './common';

export const zetaApiV2 = {
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

    async getRunningJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
        try {
            const response = await httpFetch(`${baseUrl}/running-jobs`, {
                method: 'GET',
            });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
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
