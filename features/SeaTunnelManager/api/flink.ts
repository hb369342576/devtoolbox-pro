import { httpFetch } from '../../../utils/http';
import { SeaTunnelJob, SeaTunnelEngineType } from '../types';
import { ApiResponse } from './common';

export const flinkApi = {
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
