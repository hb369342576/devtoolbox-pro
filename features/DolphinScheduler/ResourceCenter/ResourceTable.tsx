import React from 'react';
import { Upload, Download, Edit, Pencil, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DSResource } from './types';
import { Tooltip } from '../../common/Tooltip';
import { getFileIcon, formatSize, isTextFile } from './utils';

interface ResourceTableProps {
    loading: boolean;
    resources: DSResource[];
    selectedIds: string[];
    onSelectAll: () => void;
    onSelect: (key: string, isDirectory?: boolean) => void;
    onNavigate: (resource: DSResource) => void;
    onUploadSingle: (resource: DSResource, e: React.MouseEvent) => void;
    onEdit: (resource: DSResource, e: React.MouseEvent) => void;
    onDownloadSingle: (resource: DSResource, e: React.MouseEvent) => void;
    onRename: (resource: DSResource, e: React.MouseEvent) => void;
    onDeleteSingle: (resource: DSResource, e: React.MouseEvent) => void;
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
    loading, resources, selectedIds, onSelectAll, onSelect, onNavigate,
    onUploadSingle, onEdit, onDownloadSingle, onRename, onDeleteSingle
}) => {
    const { t } = useTranslation();

    const allSelected = resources.filter(r => !r.directory).length > 0 &&
                        resources.filter(r => !r.directory).every(r => selectedIds.includes(r.fullName));

    return (
        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-amber-500" />
                </div>
            ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
                    <table className="w-full table-fixed">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-800/60">
                                <th className="w-11 px-3 py-2.5 text-left">
                                    <button onClick={onSelectAll} className="text-slate-400 hover:text-amber-500 transition-colors">
                                        {allSelected ? <CheckSquare size={15} className="text-amber-500" /> : <Square size={15} />}
                                    </button>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.name')}</th>
                                <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.size')}</th>
                                <th className="w-44 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.updated')}</th>
                                <th className="w-40 px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800/40">
                            {resources.map((resource) => (
                                <tr
                                    key={resource.fullName}
                                    className={`group border-b border-slate-100 dark:border-slate-700/40 last:border-b-0 transition-colors cursor-pointer
                                        ${selectedIds.includes(resource.fullName)
                                            ? 'bg-amber-50/80 dark:bg-amber-900/15 hover:bg-amber-100/70 dark:hover:bg-amber-900/25'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                                    onClick={() => onNavigate(resource)}
                                >
                                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                        {resource.directory ? (
                                            <span className="text-slate-300 dark:text-slate-600"><Square size={16} /></span>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onSelect(resource.fullName, resource.directory); }} className="text-slate-400 hover:text-amber-500 transition-colors">
                                                {selectedIds.includes(resource.fullName) ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                            <span className="flex-shrink-0">{getFileIcon(resource)}</span>
                                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{resource.alias}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                        {resource.directory ? '-' : formatSize(resource.size)}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                                        {resource.updateTime || '-'}
                                    </td>
                                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {!resource.directory && (
                                                <>
                                                    <Tooltip content={t('dolphinScheduler.uploadReplace')} position="top">
                                                        <button onClick={(e) => onUploadSingle(resource, e)} className="p-1 hover:bg-green-500/10 dark:hover:bg-green-500/15 rounded-md text-green-500 transition-colors">
                                                            <Upload size={15} />
                                                        </button>
                                                    </Tooltip>
                                                    {isTextFile(resource) && (
                                                        <Tooltip content={t('dolphinScheduler.edit')} position="top">
                                                            <button onClick={(e) => onEdit(resource, e)} className="p-1 hover:bg-purple-500/10 dark:hover:bg-purple-500/15 rounded-md text-purple-400 transition-colors">
                                                                <Edit size={15} />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip content={t('dolphinScheduler.download')} position="top">
                                                        <button onClick={(e) => onDownloadSingle(resource, e)} className="p-1 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 rounded-md text-blue-400 transition-colors">
                                                            <Download size={15} />
                                                        </button>
                                                    </Tooltip>
                                                </>
                                            )}
                                            <Tooltip content={t('dolphinScheduler.rename')} position="top">
                                                <button onClick={(e) => { e.stopPropagation(); onRename(resource, e); }} className="p-1 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 rounded-md text-slate-400 transition-colors">
                                                    <Pencil size={15} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content={t('dolphinScheduler.delete')} position="top">
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteSingle(resource, e); }} className="p-1 hover:bg-red-500/10 dark:hover:bg-red-500/15 rounded-md text-red-400 transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {resources.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                        {t('dolphinScheduler.noResourcesFound')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
