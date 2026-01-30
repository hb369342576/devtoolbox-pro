import React, { useState, useEffect, useCallback } from 'react';
import {
    ListTodo, ArrowLeft, Search, RefreshCw, PlayCircle, 
    StopCircle, AlertCircle, CheckCircle2, XCircle, Timer,
    Loader2, Upload, Eye, Clock, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { Language } from '../../types';
import { SeaTunnelEngineConfig, SeaTunnelJob, JobStatus, FinishedJobState } from './types';
import { seaTunnelApi } from './api';
import { Tooltip } from '../../components/ui/Tooltip';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DagVisualizer } from './components/DagVisualizer';

interface JobManagerProps {
    lang: Language;
    currentEngine: SeaTunnelEngineConfig | null;
    configs: SeaTunnelEngineConfig[];
    onSelectEngine: (config: SeaTunnelEngineConfig | null) => void;
    onNavigate: (id: string) => void;
    onOpenSubmitModal: () => void;
}

export const JobManager: React.FC<JobManagerProps> = ({
    lang,
    currentEngine,
    configs,
    onSelectEngine,
    onNavigate,
    onOpenSubmitModal
}) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState<SeaTunnelJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; jobId: string; jobName: string }>({ isOpen: false, jobId: '', jobName: '' });
    const [detailJob, setDetailJob] = useState<SeaTunnelJob | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [jobLog, setJobLog] = useState<string | null>(null);
    const [logLoading, setLogLoading] = useState(false);
    
    // 分页状态
    const [pageNo, setPageNo] = useState(1);
    const [pageSize] = useState(20);
    
    // 状态过滤
    const [statusFilter, setStatusFilter] = useState<FinishedJobState | ''>('');
    const finishedJobStates: FinishedJobState[] = ['FINISHED', 'CANCELED', 'FAILED', 'SAVEPOINT_DONE', 'UNKNOWABLE'];

    // 获取作业列表
    const fetchJobs = useCallback(async () => {
        if (!currentEngine) return;
        
        setLoading(true);
        setError(null);
        try {
            const result = await seaTunnelApi.getAllJobs(currentEngine);
            if (result.success) {
                setJobs(result.data || []);
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error('[JobManager] Fetch error:', err);
            setError(err.message);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [currentEngine, lang, toast]);

    useEffect(() => {
        if (currentEngine) {
            fetchJobs();
        } else {
            setJobs([]);
        }
    }, [currentEngine, fetchJobs]);

    // 取消作业
    const handleCancelJob = async () => {
        if (!currentEngine || !cancelConfirm.jobId) return;
        
        try {
            const result = await seaTunnelApi.cancelJob(currentEngine, cancelConfirm.jobId);
            if (result.success) {
                toast({ title: lang === 'zh' ? '作业已取消' : 'Job Canceled', variant: 'success' });
                fetchJobs();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '取消失败' : 'Cancel Failed', description: err.message, variant: 'destructive' });
        }
        setCancelConfirm({ isOpen: false, jobId: '', jobName: '' });
    };

    // 渲染状态标签
    const renderStatusTag = (status: JobStatus) => {
        const config: Record<JobStatus, { color: string; icon: React.ReactNode }> = {
            RUNNING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 size={12} className="animate-spin mr-1" /> },
            FINISHED: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 size={12} className="mr-1" /> },
            FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={12} className="mr-1" /> },
            CANCELED: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: <StopCircle size={12} className="mr-1" /> },
            CREATED: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Timer size={12} className="mr-1" /> },
            SCHEDULED: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Clock size={12} className="mr-1" /> },
            CANCELING: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <Loader2 size={12} className="animate-spin mr-1" /> },
            SAVEPOINT_DONE: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 size={12} className="mr-1" /> },
            UNKNOWABLE: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: <AlertCircle size={12} className="mr-1" /> },
        };
        const { color, icon } = config[status] || config.CREATED;
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                {icon}
                {status}
            </span>
        );
    };
    
    // 查看详情
    const handleViewDetail = async (job: SeaTunnelJob) => {
        if (!currentEngine) return;
        
        // 先设置基本信息
        setDetailJob(job);
        setDetailLoading(true);
        
        try {
            // 如果是 Zeta 引擎，调用 getJobInfo 获取详细信息
            if (currentEngine.engineType === 'zeta') {
                const result = await seaTunnelApi.getJobInfo(currentEngine, job.jobId);
                if (result.success && result.data) {
                    setDetailJob(result.data);
                }
            }
        } catch (err) {
            console.error('[JobManager] Get job info failed:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    // 过滤作业
    const filteredJobs = jobs.filter(job => {
        const matchSearch = job.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = !statusFilter || job.jobStatus === statusFilter;
        return matchSearch && matchStatus;
    }).sort((a, b) => {
        // 按创建时间倒序排序
        const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
        const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
        return timeB - timeA;
    });
    
    // 分页计算
    const totalPages = Math.ceil(filteredJobs.length / pageSize);
    const paginatedJobs = filteredJobs.slice((pageNo - 1) * pageSize, pageNo * pageSize);

    const getEngineIcon = (type: string) => {
        switch (type) {
            case 'zeta': return '⚡';
            case 'flink': return '🔥';
            case 'spark': return '✨';
            default: return '🔧';
        }
    };

    // 未选择引擎时显示引擎列表
    if (!currentEngine) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 pt-1.5">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-cyan-600" size={24} />
                        {lang === 'zh' ? '作业管理' : 'Job Manager'}
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {configs.map(config => (
                            <div
                                key={config.id}
                                onClick={() => onSelectEngine(config)}
                                className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[180px]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-2xl">
                                        {getEngineIcon(config.engineType)}
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{config.name}</h3>
                                <div className="space-y-1.5">
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span className="w-16 text-xs font-bold uppercase opacity-70">Engine</span>
                                        <span className="truncate capitalize">{config.engineType}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span className="w-16 text-xs font-bold uppercase opacity-70">URL</span>
                                        <span className="truncate font-mono text-xs">{config.baseUrl}</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                            </div>
                        ))}
                    </div>
                </div>
                
                {configs.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-8">
                        <ListTodo size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">{lang === 'zh' ? '暂无引擎配置，请先添加引擎' : 'No engines configured. Please add an engine first.'}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={cancelConfirm.isOpen}
                title={lang === 'zh' ? '确认取消作业' : 'Confirm Cancel Job'}
                message={lang === 'zh' ? `确定要取消作业 "${cancelConfirm.jobName}" 吗？` : `Are you sure you want to cancel job "${cancelConfirm.jobName}"?`}
                confirmText={lang === 'zh' ? '取消作业' : 'Cancel Job'}
                cancelText={lang === 'zh' ? '返回' : 'Back'}
                onConfirm={handleCancelJob}
                onCancel={() => setCancelConfirm({ isOpen: false, jobId: '', jobName: '' })}
                type="danger"
            />

            {/* 头部 */}
            <div className="flex justify-between items-center mb-6 pt-1.5">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => onSelectEngine(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                        title={lang === 'zh' ? '返回引擎列表' : 'Back to Engines'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <ListTodo className="mr-3 text-cyan-600" />
                        {lang === 'zh' ? '作业管理' : 'Job Manager'}
                        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                        <span className="text-base font-normal text-slate-600 dark:text-slate-300 flex items-center">
                            <span className="mr-1">{getEngineIcon(currentEngine.engineType)}</span>
                            {currentEngine.name}
                        </span>
                    </h2>
                </div>
                
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={lang === 'zh' ? '搜索作业...' : 'Search...'}
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
                        <option value="">{lang === 'zh' ? '全部状态' : 'All Status'}</option>
                        {finishedJobStates.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                        {lang === 'zh' ? `${filteredJobs.length} 个` : `${filteredJobs.length} total`}
                    </span>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                        <button onClick={fetchJobs} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </Tooltip>
                    {currentEngine.engineType === 'zeta' && (
                        <button 
                            onClick={onOpenSubmitModal} 
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg flex items-center"
                        >
                            <Upload size={14} className="mr-1.5" />
                            {lang === 'zh' ? '提交作业' : 'Submit Job'}
                        </button>
                    )}
                </div>
            </div>
            
            {/* 表格 */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {loading && jobs.length === 0 ? (
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
                        {lang === 'zh' ? '暂无作业' : 'No jobs found'}
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                <tr className="text-center text-slate-500 dark:text-slate-400">
                                    <th className="px-2 py-3 font-medium w-12 text-center">#</th>
                                    <th className="px-4 py-3 font-medium text-left">{lang === 'zh' ? '作业名称' : 'Job Name'}</th>
                                    <th className="px-4 py-3 font-medium w-28">{lang === 'zh' ? '状态' : 'Status'}</th>
                                    <th className="px-4 py-3 font-medium w-20">{lang === 'zh' ? '用时' : 'Duration'}</th>
                                    <th className="px-4 py-3 font-medium w-36">{lang === 'zh' ? '创建时间' : 'Created'}</th>
                                    <th className="px-4 py-3 font-medium w-36">{lang === 'zh' ? '完成时间' : 'Finished'}</th>
                                    <th className="px-4 py-3 font-medium w-24">{lang === 'zh' ? '操作' : 'Actions'}</th>
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
                                        <td className="px-4 py-3 text-center">{renderStatusTag(job.jobStatus)}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                            {job.createTime && job.finishTime ? (() => {
                                                const duration = new Date(job.finishTime).getTime() - new Date(job.createTime).getTime();
                                                const seconds = Math.floor(duration / 1000);
                                                if (seconds < 60) return `${seconds}s`;
                                                const minutes = Math.floor(seconds / 60);
                                                const secs = seconds % 60;
                                                if (minutes < 60) return `${minutes}m ${secs}s`;
                                                const hours = Math.floor(minutes / 60);
                                                const mins = minutes % 60;
                                                return `${hours}h ${mins}m`;
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
                                                <Tooltip content={lang === 'zh' ? '详情' : 'Details'} position="top">
                                                    <button
                                                        onClick={() => handleViewDetail(job)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </Tooltip>
                                                {job.jobStatus === 'RUNNING' && (
                                                    <Tooltip content={lang === 'zh' ? '取消' : 'Cancel'} position="top">
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
                            {lang === 'zh' 
                                ? `共 ${filteredJobs.length} 条，第 ${pageNo}/${totalPages} 页`
                                : `${filteredJobs.length} total, page ${pageNo}/${totalPages}`
                            }
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

            {/* 作业详情 Modal */}
            {detailJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {lang === 'zh' ? '作业详情' : 'Job Details'}
                            </h3>
                            <button onClick={() => setDetailJob(null)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '作业名称' : 'Job Name'}</label>
                                    <p className="text-slate-800 dark:text-white font-medium">{detailJob.jobName}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '状态' : 'Status'}</label>
                                    <p>{renderStatusTag(detailJob.jobStatus)}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Job ID</label>
                                    <p className="text-slate-600 dark:text-slate-300 font-mono text-sm break-all">{detailJob.jobId}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '引擎类型' : 'Engine'}</label>
                                    <p className="text-slate-600 dark:text-slate-300 capitalize">{detailJob.engineType}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '创建时间' : 'Created'}</label>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">{detailJob.createTime ? new Date(detailJob.createTime).toLocaleString() : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '完成时间' : 'Finished'}</label>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">{detailJob.finishTime ? new Date(detailJob.finishTime).toLocaleString() : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{lang === 'zh' ? '用时' : 'Duration'}</label>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                                        {detailJob.createTime && detailJob.finishTime ? (() => {
                                            const duration = new Date(detailJob.finishTime).getTime() - new Date(detailJob.createTime).getTime();
                                            const seconds = Math.floor(duration / 1000);
                                            if (seconds < 60) return `${seconds} 秒`;
                                            const minutes = Math.floor(seconds / 60);
                                            const secs = seconds % 60;
                                            if (minutes < 60) return `${minutes} 分 ${secs} 秒`;
                                            const hours = Math.floor(minutes / 60);
                                            const mins = minutes % 60;
                                            return `${hours} 时 ${mins} 分`;
                                        })() : detailJob.jobStatus === 'RUNNING' ? '运行中...' : '-'}
                                    </p>
                                </div>
                            </div>
                            {detailJob.metrics && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">{lang === 'zh' ? '作业指标' : 'Metrics'}</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                            <p className="text-lg font-bold text-cyan-600">{detailJob.metrics.readRowCount?.toLocaleString() || 0}</p>
                                            <p className="text-xs text-slate-500">{lang === 'zh' ? '读取行数' : 'Read Rows'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                            <p className="text-lg font-bold text-green-600">{detailJob.metrics.writeRowCount?.toLocaleString() || 0}</p>
                                            <p className="text-xs text-slate-500">{lang === 'zh' ? '写入行数' : 'Write Rows'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                            <p className="text-lg font-bold text-blue-600">{((detailJob.metrics.readBytes || 0) / 1024 / 1024).toFixed(2)} MB</p>
                                            <p className="text-xs text-slate-500">{lang === 'zh' ? '读取数据' : 'Read Bytes'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center">
                                            <p className="text-lg font-bold text-purple-600">{((detailJob.metrics.writeBytes || 0) / 1024 / 1024).toFixed(2)} MB</p>
                                            <p className="text-xs text-slate-500">{lang === 'zh' ? '写入数据' : 'Write Bytes'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {detailJob.errorMsg && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="text-xs text-red-500 uppercase font-bold mb-2 block">{lang === 'zh' ? '错误信息' : 'Error Message'}</label>
                                    <pre className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-xs overflow-auto max-h-40 whitespace-pre-wrap">{detailJob.errorMsg}</pre>
                                </div>
                            )}
                            {detailJob.jobDag && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">{lang === 'zh' ? '作业 DAG' : 'Job DAG'}</label>
                                    <DagVisualizer dagData={detailJob.jobDag} lang={lang} />
                                </div>
                            )}
                            {detailLoading && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 size={20} className="animate-spin text-cyan-600 mr-2" />
                                    <span className="text-sm text-slate-500">{lang === 'zh' ? '加载详细信息...' : 'Loading details...'}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-800/50">
                            <button 
                                onClick={() => {
                                    toast({ 
                                        title: lang === 'zh' ? '功能暂不可用' : 'Feature not available',
                                        description: lang === 'zh' 
                                            ? 'SeaTunnel Zeta REST API 暂不支持日志查询，请登录服务器查看 logs/ 目录'
                                            : 'SeaTunnel Zeta REST API does not support log query. Please check logs/ directory on server.',
                                        variant: 'default' 
                                    });
                                }}
                                className="flex items-center px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                <FileText size={14} className="mr-1" />
                                {lang === 'zh' ? '查看日志' : 'View Logs'}
                            </button>
                            <button onClick={() => { setDetailJob(null); setJobLog(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                                {lang === 'zh' ? '关闭' : 'Close'}
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
            )}
        </div>
    );
};
