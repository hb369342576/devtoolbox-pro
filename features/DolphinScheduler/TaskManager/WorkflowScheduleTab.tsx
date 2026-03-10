import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../common/Tooltip';
import { renderStateTag } from './utils';

interface WorkflowScheduleTabProps {
    loading: boolean;
    schedules: any[];
    total: number;
    pageNo: number;
    pageSize: number;
    setPageNo: (n: number) => void;
    setPageSize: (n: number) => void;
    onToggleSchedule: (sch: any) => void;
}

export const WorkflowScheduleTab: React.FC<WorkflowScheduleTabProps> = ({
    loading, schedules, total, pageNo, pageSize, setPageNo, setPageSize, onToggleSchedule
}) => {
    const { t } = useTranslation();
    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : schedules.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">{t('dolphinScheduler.noSchedules')}</div>
            ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent [&::-webkit-scrollbar-corner]:bg-transparent">
                    <table className="w-full text-sm min-w-[1400px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-30">
                            <tr className="text-slate-500 text-xs whitespace-nowrap">
                                <th className="px-3 py-3 text-center w-12">{t('dolphinScheduler.tableHeaders.hash')}</th>
                                <th className="px-3 py-3 text-left min-w-[200px]">{t('dolphinScheduler.tableHeaders.workflowName')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.state')}</th>
                                <th className="px-3 py-3 text-center min-w-[150px]">{t('dolphinScheduler.tableHeaders.scheduleTime')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.executor')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.environment')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.createTime')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.updateTime')}</th>
                                <th className="px-3 py-3 text-center sticky right-0 z-40 bg-slate-50 dark:bg-slate-900 w-px whitespace-nowrap">{t('dolphinScheduler.tableHeaders.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {schedules.map((sch, idx) => (
                                <tr key={sch.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[250px]" title={sch.workflowDefinitionName || sch.processDefinitionName}>{sch.workflowDefinitionName || sch.processDefinitionName}</td>
                                    <td className="px-3 py-2.5 text-center">{renderStateTag(sch.releaseState)}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.crontab || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">{sch.userName || sch.executorName || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">{sch.environmentName || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.createTime || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{sch.updateTime || '-'}</td>
                                    <td className="px-3 py-2.5 text-center sticky right-0 z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 w-px whitespace-nowrap">
                                        <Tooltip content={sch.releaseState === 'ONLINE' ? t('dolphinScheduler.offline') : t('dolphinScheduler.online')} position="top">
                                            <button onClick={() => onToggleSchedule(sch)} className={`p-1 rounded ${sch.releaseState === 'ONLINE' ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500'}`}>
                                                <Power size={15} />
                                            </button>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                <div className="flex items-center space-x-2 text-slate-500">
                    <span>{t('dolphinScheduler.totalCount', { count: total })}</span>
                    {[20, 50, 100].map(size => (
                        <button key={size} onClick={() => { setPageSize(size); setPageNo(1); }}
                            className={`px-2 py-0.5 rounded text-xs border ${pageSize === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                            {size}
                        </button>
                    ))}
                    <span>{t('dolphinScheduler.pageUnit')}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setPageNo(Math.max(1, pageNo - 1))} disabled={pageNo === 1} className="p-1 border rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <span>{pageNo} / {totalPages}</span>
                    <button onClick={() => setPageNo(Math.min(totalPages, pageNo + 1))} disabled={pageNo === totalPages} className="p-1 border rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
};
