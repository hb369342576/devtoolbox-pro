import { httpFetch } from '../../../utils/http';
import { SeaTunnelJob, SeaTunnelEngineType } from '../types';
import { ApiResponse } from './common';

export const sparkApi = {
    async testConnection(baseUrl: string): Promise<ApiResponse<boolean>> {
        try {
            const response = await httpFetch(`${baseUrl}/api/v1/applications`, { method: 'GET' });
            return { success: response.ok, data: response.ok };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    async getJobs(baseUrl: string): Promise<ApiResponse<SeaTunnelJob[]>> {
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
