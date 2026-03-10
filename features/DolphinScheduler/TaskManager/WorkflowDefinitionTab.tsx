import React, { useRef, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, Loader2, AlertCircle, ListTodo, Copy,
    Edit, PlayCircle, Timer, Power, ToggleRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { Tooltip } from '../../common/Tooltip';
import { useToast } from '../../common/Toast';
import { ProcessDefinition } from '../types';
import { renderStateTag } from './utils';

const DEFAULT_COL_WIDTHS = { name: 300, version: 60, state: 80, schedule: 80, updatedTime: 150, actions: 180 };
const COL_WIDTHS_KEY = 'dolphin_task_manager_column_widths';

interface WorkflowDefinitionTabProps {
    loading: boolean;
    error: string | null;
    processes: ProcessDefinition[];
    total: number;
    pageNo: number;
    pageSize: number;
    setPageNo: (n: number) => void;
    setPageSize: (n: number) => void;
    selectedProcesses: Set<number | string>;
    setSelectedProcesses: (s: Set<number | string>) => void;
    onDetail: (p: ProcessDefinition) => void;
    onEdit: (p: ProcessDefinition) => void;
    onRun: (p: ProcessDefinition) => void;
    onSchedule: (p: ProcessDefinition) => void;
    onToggleOnline: (p: ProcessDefinition) => void;
}

export const WorkflowDefinitionTab: React.FC<WorkflowDefinitionTabProps> = ({
    loading, error, processes, total, pageNo, pageSize, setPageNo, setPageSize,
    selectedProcesses, setSelectedProcesses, onDetail, onEdit, onRun, onSchedule, onToggleOnline
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    // 列宽管理
    const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(COL_WIDTHS_KEY);
            if (saved) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) };
        } catch {}
        return DEFAULT_COL_WIDTHS;
    });
    
    const resizingRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        resizingRef.current = { column, startX: e.clientX, startWidth: columnWidths[column] || 100 };
        const handleMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const newWidth = Math.max(50, resizingRef.current.startWidth + ev.clientX - resizingRef.current.startX);
            setColumnWidths(prev => ({ ...prev, [resizingRef.current!.column]: newWidth }));
        };
        const handleMouseUp = () => {
            setColumnWidths(prev => { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(prev)); return prev; });
            resizingRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    if (loading && processes.length === 0) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-blue-500" /></div>;
    }
    if (error) {
        return <div className="flex-1 flex items-center justify-center text-red-500"><AlertCircle size={24} className="mr-2" />{error}</div>;
    }
    if (processes.length === 0) {
        return <div className="flex-1 flex items-center justify-center text-slate-400"><ListTodo size={48} className="mr-4 opacity-20" />{t('dolphinScheduler.noWorkflows')}</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent [&::-webkit-scrollbar-corner]:bg-transparent">
                <table className="w-full text-sm min-w-[1000px]">
                    <colgroup>
                        <col style={{ width: '40px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: columnWidths.name }} />
                        <col style={{ width: columnWidths.version }} />
                        <col style={{ width: columnWidths.state }} />
                        <col style={{ width: columnWidths.schedule }} />
                        <col /><col />
                        <col style={{ width: '1%' }} />
                    </colgroup>
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-30">
                        <tr className="text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <th className="px-2 py-3 w-10 text-center">
                                <input type="checkbox"
                                    checked={selectedProcesses.size === processes.length && processes.length > 0}
                                    onChange={e => {
                                        if (e.target.checked) setSelectedProcesses(new Set(processes.map(p => p.code)));
                                        else setSelectedProcesses(new Set());
                                    }}
                                    className="rounded border-slate-300"
                                />
                            </th>
                            <th className="px-2 py-3 font-medium w-12 text-center">{t('dolphinScheduler.tableHeaders.hash')}</th>
                            <th className="px-4 py-3 font-medium relative text-left">
                                {t('dolphinScheduler.tableHeaders.workflowName')}
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'name')} />
                            </th>
                            <th className="px-4 py-3 font-medium relative text-center">
                                {t('dolphinScheduler.tableHeaders.version')}
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'version')} />
                            </th>
                            <th className="px-4 py-3 font-medium relative text-center">
                                {t('dolphinScheduler.tableHeaders.state')}
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'state')} />
                            </th>
                            <th className="px-4 py-3 font-medium relative text-center">
                                {t('dolphinScheduler.tableHeaders.scheduleTime')}
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 active:bg-purple-500" onMouseDown={e => handleResizeStart(e, 'schedule')} />
                            </th>
                            <th className="px-4 py-3 font-medium text-center">{t('dolphinScheduler.tableHeaders.createTime')}</th>
                            <th className="px-4 py-3 font-medium text-center">{t('dolphinScheduler.tableHeaders.updateTime')}</th>
                            <th className="px-4 py-3 font-medium sticky right-0 z-40 bg-slate-50 dark:bg-slate-900 w-px whitespace-nowrap text-center">
                                {t('dolphinScheduler.tableHeaders.actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {processes.map((process, index) => (
                            <tr key={process.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedProcesses.has(process.code) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <td className="px-2 py-3 text-center">
                                    <input type="checkbox"
                                        checked={selectedProcesses.has(process.code)}
                                        onChange={e => {
                                            const next = new Set(selectedProcesses);
                                            if (e.target.checked) next.add(process.code); else next.delete(process.code);
                                            setSelectedProcesses(next);
                                        }}
                                        className="rounded border-slate-300"
                                    />
                                </td>
                                <td className="px-2 py-3 text-center text-slate-400 text-xs">{(pageNo - 1) * pageSize + index + 1}</td>
                                <td className="px-4 py-3 relative group/name">
                                    <div className="flex items-center space-x-2 w-full pr-6 whitespace-nowrap">
                                        <button
                                            onClick={() => onDetail(process)}
                                            className="font-medium text-slate-800 dark:text-white hover:text-blue-600 text-left truncate flex-1 block overflow-hidden leading-snug"
                                            title={process.name}
                                        >
                                            {process.name}
                                        </button>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(process.name).then(() => {
                                                    toast({ title: t('common.copied'), variant: 'success' });
                                                });
                                            }}
                                            className="absolute right-4 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 opacity-0 group-hover/name:opacity-100 transition-opacity"
                                            title={t('dolphinScheduler.copyName')}
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    {process.description && (
                                        <p className="text-xs text-slate-400 truncate mt-1 w-full" title={process.description}>{process.description}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">v{process.version}</td>
                                <td className="px-4 py-3">{renderStateTag(process.releaseState)}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded ${process.scheduleReleaseState === 'ONLINE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        {process.scheduleReleaseState === 'ONLINE' ? t('dolphinScheduler.online') : t('dolphinScheduler.offline')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                    {process.createTime ? new Date(process.createTime).toLocaleString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs text-center">
                                    {process.updateTime ? new Date(process.updateTime).toLocaleString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-center sticky right-0 z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 w-px whitespace-nowrap">
                                    <div className="flex items-center justify-center space-x-1">
                                        <Tooltip content={t('dolphinScheduler.edit')} position="top">
                                            <button onClick={() => onEdit(process)} className="p-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded text-cyan-600"><Edit size={16} /></button>
                                        </Tooltip>
                                        <Tooltip content={t('dolphinScheduler.run')} position="top">
                                            <button onClick={() => onRun(process)} disabled={process.releaseState !== 'ONLINE'} className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded text-orange-600 disabled:opacity-30"><PlayCircle size={16} /></button>
                                        </Tooltip>
                                        <Tooltip content={t('dolphinScheduler.schedule')} position="top">
                                            <button onClick={() => onSchedule(process)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600"><Timer size={16} /></button>
                                        </Tooltip>
                                        <Tooltip content={process.releaseState === 'ONLINE' ? t('dolphinScheduler.offline') : t('dolphinScheduler.online')} position="top">
                                            <button onClick={() => onToggleOnline(process)} className={`p-1.5 rounded ${process.releaseState === 'ONLINE' ? 'text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/30' : 'text-green-600 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-900/30'}`}><ToggleRight size={16} /></button>
                                        </Tooltip>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* 分页 */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm shrink-0">
                <div className="flex items-center space-x-2 text-slate-500">
                    <p className="text-slate-500 text-sm">{t('dolphinScheduler.totalCount', { count: total })}</p>
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
