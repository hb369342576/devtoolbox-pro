import { SeaTunnelEngineConfig, SeaTunnelJob, SubmitJobRequest, ZetaApiVersion } from '../types';
import { ApiResponse } from './common';
import { zetaApiV1 } from './zetaV1';
import { zetaApiV2 } from './zetaV2';
import { flinkApi } from './flink';
import { sparkApi } from './spark';

const getZetaApi = (version: ZetaApiVersion = 'v1') => {
    return version === 'v2' ? zetaApiV2 : zetaApiV1;
};

export const seaTunnelApi = {
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

    async submitJob(config: SeaTunnelEngineConfig, request: SubmitJobRequest): Promise<ApiResponse<string>> {
        if (config.engineType !== 'zeta') {
            return { success: false, error: 'Only Zeta engine supports job submission via REST API' };
        }
        return getZetaApi(config.apiVersion).submitJob(config.baseUrl, request);
    },

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

    async getJobInfo(config: SeaTunnelEngineConfig, jobId: string): Promise<ApiResponse<SeaTunnelJob>> {
        if (config.engineType === 'zeta') {
            return getZetaApi(config.apiVersion).getJobInfo(config.baseUrl, jobId);
        }
        return { success: false, error: 'Engine does not support job info API' };
    },

    async getJobLog(config: SeaTunnelEngineConfig, jobId: string): Promise<ApiResponse<string>> {
        if (config.engineType === 'zeta') {
            const api = getZetaApi(config.apiVersion);
            if ('getJobLog' in api) {
                return (api as typeof zetaApiV1).getJobLog(config.baseUrl, jobId);
            }
        }
        return { success: false, error: 'Engine does not support log API' };
    },
};
