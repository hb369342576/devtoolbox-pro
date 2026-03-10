import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, StopCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { Tooltip } from '../../common/Tooltip';
import { renderInstanceStateTag } from './utils';

interface WorkflowInstanceTabProps {
    loading: boolean;
    deleting: boolean;
    instances: any[];
    total: number;
    pageNo: number;
    pageSize: number;
    setPageNo: (n: number) => void;
    setPageSize: (n: number) => void;
    selectedInstances: Set<number>;
    setSelectedInstances: (s: Set<number>) => void;
    onStop: (id: number) => void;
    onDelete: (id: number) => void;
}

export const WorkflowInstanceTab: React.FC<WorkflowInstanceTabProps> = ({
    loading, deleting, instances, total, pageNo, pageSize, setPageNo, setPageSize,
    selectedInstances, setSelectedInstances, onStop, onDelete
}) => {
    const { t } = useTranslation();
    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="flex-1 flex flex-col min-h-0 relative">
            {deleting && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
                    <Loader2 size={36} className="animate-spin text-white mb-3" />
                    <span className="text-white text-sm font-medium">{t('dolphinScheduler.deleting')}</span>
                </div>
            )}
            {loading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : instances.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">{t('dolphinScheduler.noInstances')}</div>
            ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent [&::-webkit-scrollbar-corner]:bg-transparent">
                    <table className="w-full text-sm min-w-[1200px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-30">
                            <tr className="text-slate-500 text-xs whitespace-nowrap">
                                <th className="px-2 py-3 text-center w-10">
                                    <input type="checkbox"
                                        checked={selectedInstances.size === instances.length && instances.length > 0}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedInstances(new Set(instances.map(inst => inst.id)));
                                            else setSelectedInstances(new Set());
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                    />
                                </th>
                                <th className="px-3 py-3 text-left min-w-[200px]">{t('dolphinScheduler.tableHeaders.instanceName')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.state')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.runType')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.scheduleTime')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.startTime')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.endTime')}</th>
                                <th className="px-3 py-3 text-center">{t('dolphinScheduler.tableHeaders.duration')}</th>
                                <th className="px-3 py-3 text-center sticky right-0 z-40 bg-slate-50 dark:bg-slate-900 w-px whitespace-nowrap">{t('dolphinScheduler.tableHeaders.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {instances.map(inst => (
                                <tr key={inst.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedInstances.has(inst.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-2 py-2.5 text-center">
                                        <input type="checkbox"
                                            checked={selectedInstances.has(inst.id)}
                                            onChange={e => {
                                                const next = new Set(selectedInstances);
                                                if (e.target.checked) next.add(inst.id); else next.delete(inst.id);
                                                setSelectedInstances(next);
                                            }}
                                            className="rounded border-slate-300"
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[400px]" title={inst.name}>{inst.name}</td>
                                    <td className="px-3 py-2.5 text-center">{renderInstanceStateTag(inst.state)}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">
                                        {inst.commandType === 'SCHEDULER' ? (i18next.language === 'zh' ? '调度执行' : 'Scheduler') :
                                         inst.commandType === 'START_PROCESS' ? (i18next.language === 'zh' ? '手动执行' : 'Manual') :
                                         inst.commandType || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{inst.scheduleTime || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{inst.startTime || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">{inst.endTime || '-'}</td>
                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">{inst.duration || '-'}</td>
                                    <td className="px-3 py-2.5 text-center sticky right-0 z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 w-px whitespace-nowrap">
                                        <div className="flex items-center justify-center space-x-1">
                                            {(inst.state === 'RUNNING_EXECUTION' || inst.state === 'READY_PAUSE' || inst.state === 'READY_STOP') && (
                                                <Tooltip content="停止" position="top">
                                                    <button onClick={() => onStop(inst.id)} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded text-orange-600">
                                                        <StopCircle size={15} />
                                                    </button>
                                                </Tooltip>
                                            )}
                                            <Tooltip content="删除" position="top">
                                                <button onClick={() => onDelete(inst.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                                                    <Trash2 size={15} />
                                                </button>
                                            </Tooltip>
                                        </div>
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
