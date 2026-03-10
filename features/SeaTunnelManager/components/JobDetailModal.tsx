import React from 'react';
import { Loader2, FileText } from 'lucide-react';
import { SeaTunnelJob } from '../types';
import { useTranslation } from "react-i18next";
import { DagVisualizer } from './DagVisualizer';
import { StatusTag } from './StatusTag';
import { useToast } from '../../common/Toast';

interface JobDetailModalProps {
    detailJob: SeaTunnelJob | null;
    detailLoading: boolean;
    jobLog: string | null;
    setDetailJob: (job: SeaTunnelJob | null) => void;
    setJobLog: (log: string | null) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
    detailJob, detailLoading, jobLog, setDetailJob, setJobLog
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    if (!detailJob) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {t('seatunnel.jobDetails')}
                    </h3>
                    <button onClick={() => setDetailJob(null)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.jobName')}</label>
                            <p className="text-slate-800 dark:text-white font-medium">{detailJob.jobName}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.status')}</label>
                            <p><StatusTag status={detailJob.jobStatus} /></p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">Job ID</label>
                            <p className="text-slate-600 dark:text-slate-300 font-mono text-sm break-all">{detailJob.jobId}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.engine')}</label>
                            <p className="text-slate-600 dark:text-slate-300 capitalize">{detailJob.engineType}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.created')}</label>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">{detailJob.createTime ? new Date(detailJob.createTime).toLocaleString() : '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.finished')}</label>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">{detailJob.finishTime ? new Date(detailJob.finishTime).toLocaleString() : '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('seatunnel.duration')}</label>
                            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                                {detailJob.createTime && detailJob.finishTime ? (() => {
                                    const duration = new Date(detailJob.finishTime).getTime() - new Date(detailJob.createTime).getTime();
                                    const seconds = Math.floor(duration / 1000);
                                    if (seconds < 60) return `${seconds} ${t('seatunnel.unit_seconds')}`;
                                    const minutes = Math.floor(seconds / 60);
                                    const secs = seconds % 60;
                                    if (minutes < 60) return `${minutes} ${t('seatunnel.unit_minutes')} ${secs} ${t('seatunnel.unit_seconds')}`;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = minutes % 60;
                                    return `${hours} ${t('seatunnel.unit_hours')} ${mins} ${t('seatunnel.unit_minutes')}`;
                                })() : detailJob.jobStatus === 'RUNNING' ? t('seatunnel.running') || '运行中...' : '-'}
                            </p>
                        </div>
                    </div>
                    {detailJob.metrics && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">{t('seatunnel.metrics')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                    <p className="text-lg font-bold text-cyan-600">{detailJob.metrics.readRowCount?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-500">{t('seatunnel.readRows')}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                    <p className="text-lg font-bold text-green-600">{detailJob.metrics.writeRowCount?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-500">{t('seatunnel.writeRows')}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                    <p className="text-lg font-bold text-blue-600">{((detailJob.metrics.readBytes || 0) / 1024 / 1024).toFixed(2)} MB</p>
                                    <p className="text-xs text-slate-500">{t('seatunnel.readBytes')}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                    <p className="text-lg font-bold text-purple-600">{((detailJob.metrics.writeBytes || 0) / 1024 / 1024).toFixed(2)} MB</p>
                                    <p className="text-xs text-slate-500">{t('seatunnel.writeBytes')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {detailJob.errorMsg && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="text-xs text-red-500 uppercase font-bold mb-2 block">{t('seatunnel.errorMessage')}</label>
                            <pre className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-xs overflow-auto max-h-40 whitespace-pre-wrap">{detailJob.errorMsg}</pre>
                        </div>
                    )}
                    {detailJob.jobDag && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">{t('seatunnel.jobDAG')}</label>
                            <DagVisualizer dagData={detailJob.jobDag} />
                        </div>
                    )}
                    {detailLoading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 size={20} className="animate-spin text-cyan-600 mr-2" />
                            <span className="text-sm text-slate-500">{t('seatunnel.loadingDetails')}</span>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-800/50">
                    <button 
                        onClick={() => {
                            toast({ 
                                title: t('seatunnel.featureNotAvailable'),
                                description: t('seatunnel.seaTunnelZetaRESTAPIDoesN'),
                                variant: 'default' 
                            });
                        }}
                        className="flex items-center px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        <FileText size={14} className="mr-1" />
                        {t('seatunnel.viewLogs')}
                    </button>
                    <button onClick={() => { setDetailJob(null); setJobLog(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                        {t('seatunnel.close')}
                    </button>
                </div>
                {jobLog && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-900">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-green-400 uppercase font-bold">作业日志</label>
                            <button onClick={() => setJobLog(null)} className="text-xs text-slate-400 hover:text-white">关闭</button>
                        </div>
                        <pre className="text-xs text-green-400 font-mono overflow-auto max-h-64 whitespace-pre-wrap">{jobLog}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};
