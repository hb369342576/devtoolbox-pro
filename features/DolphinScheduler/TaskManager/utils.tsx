import React from 'react';
import { CheckCircle2, XCircle, Loader2, PauseCircle, StopCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

/** 渲染发布状态标签 */
export const renderStateTag = (state: string | number) => {
    const isOnline = state === 'ONLINE' || state === 1;
    const color = isOnline
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    const label = isOnline
        ? i18next.t('dolphinScheduler.online')
        : i18next.t('dolphinScheduler.offline');

    return (
        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {isOnline ? <CheckCircle2 size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
            {label}
        </span>
    );
};

/** 渲染实例运行状态标签 */
export const renderInstanceStateTag = (state: string) => {
    const stateMap: Record<string, { color: string; labelKey: string }> = {
        'SUCCESS': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', labelKey: 'success' },
        'FAILURE': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelKey: 'failure' },
        'RUNNING_EXECUTION': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', labelKey: 'running' },
        'READY_PAUSE': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', labelKey: 'readyPause' },
        'PAUSE': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', labelKey: 'pause' },
        'READY_STOP': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', labelKey: 'readyStop' },
        'STOP': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', labelKey: 'stop' },
        'SUBMITTED_SUCCESS': { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', labelKey: 'submitted' },
        'NEED_FAULT_TOLERANCE': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', labelKey: 'faultTolerance' },
        'KILL': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelKey: 'kill' },
        'DELAY_EXECUTION': { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', labelKey: 'delay' },
        'FORCED_SUCCESS': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', labelKey: 'forcedSuccess' },
        'SERIAL_WAIT': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', labelKey: 'serialWait' },
        'WAIT_TO_RUN': { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', labelKey: 'waiting' },
    };
    const config = stateMap[state];
    if (!config) return (
        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{state}</span>
    );
    const label = i18next.t(`dolphinScheduler.states.${config.labelKey}`);
    return (
        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
            {state === 'SUCCESS' || state === 'FORCED_SUCCESS' ? <CheckCircle2 size={12} className="mr-1" /> :
             state === 'FAILURE' || state === 'KILL' ? <XCircle size={12} className="mr-1" /> :
             state === 'RUNNING_EXECUTION' ? <Loader2 size={12} className="mr-1 animate-spin" /> :
             state === 'PAUSE' || state === 'READY_PAUSE' ? <PauseCircle size={12} className="mr-1" /> :
             state === 'STOP' || state === 'READY_STOP' ? <StopCircle size={12} className="mr-1" /> :
             <AlertCircle size={12} className="mr-1" />}
            {label}
        </span>
    );
};
