import React from 'react';
import {
    ListTodo, ArrowLeft, Search, RefreshCw, StopCircle, Eye,
    Loader2, Upload, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { SeaTunnelEngineConfig, FinishedJobState } from './types';
import { Tooltip } from '../common/Tooltip';
import { ConfirmModal } from '../common/ConfirmModal';
import { useTranslation } from "react-i18next";
import { useJobManager } from './hooks/useJobManager';
import { JobDetailModal } from './components/JobDetailModal';
import { EngineListView } from './components/EngineListView';
import { StatusTag } from './components/StatusTag';

interface JobManagerProps {
    currentEngine: SeaTunnelEngineConfig | null;
    configs: SeaTunnelEngineConfig[];
    onSelectEngine: (config: SeaTunnelEngineConfig | null) => void;
    onNavigate: (id: string) => void;
    onOpenSubmitModal: () => void;
}

export const JobManager: React.FC<JobManagerProps> = ({
    currentEngine,
    configs,
    onSelectEngine,
    onNavigate,
    onOpenSubmitModal
}) => {
    const { t } = useTranslation();
    const {
        searchTerm, setSearchTerm, loading, error, cancelConfirm, setCancelConfirm,
        detailJob, setDetailJob, detailLoading, jobLog, setJobLog,
        pageNo, setPageNo, pageSize, statusFilter, setStatusFilter, finishedJobStates,
        fetchJobs, handleCancelJob, handleViewDetail,
        filteredJobs, totalPages, paginatedJobs
    } = useJobManager(currentEngine);

    const getEngineIcon = (type: string) => {
        switch (type) {
            case 'zeta': return '⚡';
            case 'flink': return '🔥';
            case 'spark': return '✨';
            default: return '🔧';
        }
    };

    if (!currentEngine) {
        return <EngineListView configs={configs} onSelectEngine={onSelectEngine} />;
    }

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={cancelConfirm.isOpen}
                title={t('seatunnel.confirmCancelJob')}
                message={t('seatunnel.areYouSureYouWantToCancel', { name: cancelConfirm.jobName })}
                confirmText={t('seatunnel.cancelJob')}
                cancelText={t('seatunnel.back')}
                onConfirm={handleCancelJob}
                onCancel={() => setCancelConfirm({ isOpen: false, jobId: '', jobName: '' })}
                type="danger"
            />

            <JobDetailModal
                detailJob={detailJob}
                detailLoading={detailLoading}
                jobLog={jobLog}
                setDetailJob={setDetailJob}
                setJobLog={setJobLog}
            />

            {/* 头部 */}
            <div className="flex justify-between items-center mb-6 pt-1.5">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => onSelectEngine(null)}
                        className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors text-slate-500"
                        title={t('seatunnel.backToEngines')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center whitespace-nowrap">
                        <ListTodo className="mr-3 text-cyan-600" />
                        {t('seatunnel.jobManager')}
                        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-base font-normal text-slate-600 dark:text-slate-300 flex items-center bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            <span className="mr-1.5 opacity-80">{getEngineIcon(currentEngine.engineType)}</span>
                            <span className="font-medium">{currentEngine.name}</span>
                        </span>
                    </h2>
                </div>
                
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={t('seatunnel.search')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                        />
                    </div>
                    {/* 状态过滤下拉框 */}
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value as FinishedJobState | ''); setPageNo(1); }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    >
                        <option value="">{t('seatunnel.allStatus')}</option>
                        {finishedJobStates.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-500 whitespace-nowrap flex-shrink-0">
                        {t('seatunnel.FilteredJobsLengthTotal', { count: filteredJobs.length })}
                    </span>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <Tooltip content={t('seatunnel.refresh')} position="bottom">
                        <button onClick={fetchJobs} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50 flex-shrink-0">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </Tooltip>
                    {currentEngine.engineType === 'zeta' && (
                        <button 
                            onClick={onOpenSubmitModal} 
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg flex items-center flex-shrink-0 whitespace-nowrap"
                        >
                            <Upload size={14} className="mr-1.5" />
                            {t('seatunnel.submitJob')}
                        </button>
                    )}
                </div>
            </div>
            
            {/* 表格 */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {loading && filteredJobs.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-cyan-500" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-red-500">
                        <AlertCircle size={24} className="mr-2" />
                        {error}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <ListTodo size={48} className="mr-4 opacity-20" />
                        {t('seatunnel.noJobsFound')}
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                <tr className="text-center text-slate-500 dark:text-slate-400">
                                    <th className="px-2 py-3 font-medium w-12 text-center">#</th>
                                    <th className="px-4 py-3 font-medium text-left">{t('seatunnel.jobName')}</th>
                                    <th className="px-4 py-3 font-medium w-28">{t('seatunnel.status')}</th>
                                    <th className="px-4 py-3 font-medium w-20">{t('seatunnel.duration')}</th>
                                    <th className="px-4 py-3 font-medium w-36">{t('seatunnel.created')}</th>
                                    <th className="px-4 py-3 font-medium w-36">{t('seatunnel.finished')}</th>
                                    <th className="px-4 py-3 font-medium w-24">{t('seatunnel.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {paginatedJobs.map((job, index) => (
                                    <tr key={job.jobId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-2 py-3 text-center text-slate-400 text-xs">{(pageNo - 1) * pageSize + index + 1}</td>
                                        <td className="px-4 py-3">
                                            <button 
                                                onClick={() => handleViewDetail(job)}
                                                className="font-medium text-slate-800 dark:text-white hover:text-cyan-600 text-left"
                                            >
                                                {job.jobName}
                                            </button>
                                            <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{job.jobId}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center"><StatusTag status={job.jobStatus} /></td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                            {job.createTime && job.finishTime ? (() => {
                                                const duration = new Date(job.finishTime).getTime() - new Date(job.createTime).getTime();
                                                const seconds = Math.floor(duration / 1000);
                                            if (seconds < 60) return `${seconds}${t('seatunnel.unit_seconds')}`;
                                            const minutes = Math.floor(seconds / 60);
                                            const secs = seconds % 60;
                                            if (minutes < 60) return `${minutes}${t('seatunnel.unit_minutes')} ${secs}${t('seatunnel.unit_seconds')}`;
                                            const hours = Math.floor(minutes / 60);
                                            const mins = minutes % 60;
                                            return `${hours}${t('seatunnel.unit_hours')} ${mins}${t('seatunnel.unit_minutes')}`;
                                        })() : job.jobStatus === 'RUNNING' ? '...' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                            {job.createTime ? new Date(job.createTime).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                            {job.finishTime ? new Date(job.finishTime).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center space-x-1">
                                                <Tooltip content={t('seatunnel.details')} position="top">
                                                    <button
                                                        onClick={() => handleViewDetail(job)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </Tooltip>
                                                {job.jobStatus === 'RUNNING' && (
                                                    <Tooltip content={t('seatunnel.cancel')} position="top">
                                                        <button
                                                            onClick={() => setCancelConfirm({ isOpen: true, jobId: job.jobId, jobName: job.jobName })}
                                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                                                        >
                                                            <StopCircle size={16} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* 分页控件 */}
                {filteredJobs.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900/30">
                        <span className="text-slate-500">
                            {t('seatunnel.FilteredJobsLengthTotalPa', { total: filteredJobs.length, page: pageNo, totalPages: totalPages })}
                        </span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setPageNo(p => Math.max(1, p - 1))}
                                disabled={pageNo <= 1}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-slate-700 dark:text-slate-300 font-medium min-w-[60px] text-center">{pageNo} / {totalPages || 1}</span>
                            <button
                                onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                                disabled={pageNo >= totalPages}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
