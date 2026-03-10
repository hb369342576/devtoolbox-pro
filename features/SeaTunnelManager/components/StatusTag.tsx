import React from 'react';
import { Loader2, CheckCircle2, XCircle, StopCircle, Timer, Clock, AlertCircle } from 'lucide-react';
import { JobStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface StatusTagProps {
    status: JobStatus;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
    const { t } = useTranslation();

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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${color}`}>
            {icon}
            {t('seatunnel.status_' + status)}
        </span>
    );
};
