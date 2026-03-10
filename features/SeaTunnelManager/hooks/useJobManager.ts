import { useState, useEffect, useCallback } from 'react';
import { SeaTunnelEngineConfig, SeaTunnelJob, FinishedJobState } from '../types';
import { seaTunnelApi } from '../api';
import { useToast } from '../../common/Toast';
import { useTranslation } from "react-i18next";

export const useJobManager = (currentEngine: SeaTunnelEngineConfig | null) => {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState<SeaTunnelJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; jobId: string; jobName: string }>({ isOpen: false, jobId: '', jobName: '' });
    const [detailJob, setDetailJob] = useState<SeaTunnelJob | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [jobLog, setJobLog] = useState<string | null>(null);
    
    const [pageNo, setPageNo] = useState(1);
    const [pageSize] = useState(20);
    
    const [statusFilter, setStatusFilter] = useState<FinishedJobState | ''>('');
    const finishedJobStates: FinishedJobState[] = ['FINISHED', 'CANCELED', 'FAILED', 'SAVEPOINT_DONE', 'UNKNOWABLE'];

    const fetchJobs = useCallback(async () => {
        if (!currentEngine) return;
        
        setLoading(true);
        setError(null);
        try {
            const result = await seaTunnelApi.getAllJobs(currentEngine);
            if (result.success) {
                setJobs(result.data || []);
            } else {
                throw new Error(result.error || '');
            }
        } catch (err: any) {
            console.error('[JobManager] Fetch error:', err);
            setError(err.message);
            toast({ title: t('seatunnel.loadFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [currentEngine, i18n.language, toast, t]);

    useEffect(() => {
        if (currentEngine) {
            fetchJobs();
        } else {
            setJobs([]);
        }
    }, [currentEngine, fetchJobs]);

    const handleCancelJob = async () => {
        if (!currentEngine || !cancelConfirm.jobId) return;
        
        try {
            const result = await seaTunnelApi.cancelJob(currentEngine, cancelConfirm.jobId);
            if (result.success) {
                toast({ title: t('seatunnel.jobCanceled'), variant: 'success' });
                fetchJobs();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ title: t('seatunnel.cancelFailed'), description: err.message, variant: 'destructive' });
        }
        setCancelConfirm({ isOpen: false, jobId: '', jobName: '' });
    };

    const handleViewDetail = async (job: SeaTunnelJob) => {
        if (!currentEngine) return;
        
        setDetailJob(job);
        setDetailLoading(true);
        
        try {
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

    const filteredJobs = jobs.filter(job => {
        const matchSearch = job.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = !statusFilter || job.jobStatus === statusFilter;
        return matchSearch && matchStatus;
    }).sort((a, b) => {
        const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
        const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
        return timeB - timeA;
    });
    
    const totalPages = Math.ceil(filteredJobs.length / pageSize);
    const paginatedJobs = filteredJobs.slice((pageNo - 1) * pageSize, pageNo * pageSize);

    return {
        searchTerm, setSearchTerm, jobs, loading, error, cancelConfirm, setCancelConfirm,
        detailJob, setDetailJob, detailLoading, jobLog, setJobLog,
        pageNo, setPageNo, pageSize, statusFilter, setStatusFilter, finishedJobStates,
        fetchJobs, handleCancelJob, handleViewDetail,
        filteredJobs, totalPages, paginatedJobs
    };
};
