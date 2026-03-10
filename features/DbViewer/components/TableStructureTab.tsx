import React from 'react';
import { Code, Copy, RefreshCw, Key } from 'lucide-react';
import { formatColumnType } from '../utils/ddlConverter';
import { useTranslation } from 'react-i18next';

interface TableStructureTabProps {
    columns: any[];
    loading: boolean;
    handleContextMenu: (e: React.MouseEvent, type: 'column' | 'ddl', data?: any) => void;
    handleMouseDown: (e: React.MouseEvent) => void;
    ddlHeight: number;
    detectedDbType: string;
    isConvertedDdl: boolean;
    convertedDdl: string;
    ddl: string;
    handleConvertDdl: () => void;
    handleCopy: (text: string) => void;
}

export const TableStructureTab: React.FC<TableStructureTabProps> = ({
    columns, loading, handleContextMenu, handleMouseDown, ddlHeight,
    detectedDbType, isConvertedDdl, convertedDdl, ddl, handleConvertDdl, handleCopy
}) => {
    const { t } = useTranslation();

    return (
        <div id="table-viewer-split-container" className="flex-1 flex flex-col min-h-0 relative">
            {/* Top: Columns List */}
            <div className="flex-1 overflow-auto border-b border-slate-200 dark:border-slate-700">
                <div onContextMenu={(e) => handleContextMenu(e, 'column', { name: columns.length > 0 ? columns[0].name : '' })}>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-center w-12">#</th>
                                <th className="px-2 py-2 font-medium text-slate-600 dark:text-slate-300 text-center w-10" title="Primary Key">PK</th>
                                <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Name</th>
                                <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Type</th>
                                <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-center">Nullable</th>
                                <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Comment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {columns.map((col, idx) => (
                                <tr
                                    key={col.name}
                                    title={col.name}
                                    className="hover:bg-blue-50 dark:hover:bg-blue-900/20 group cursor-pointer"
                                    onContextMenu={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, 'column', col);
                                    }}
                                >
                                    <td className="px-4 py-2 text-slate-400 text-xs text-center">{idx + 1}</td>
                                    <td className="px-2 py-2 text-center flex items-center justify-center">
                                        {col.isPrimaryKey && <Key size={14} className="text-yellow-500" />}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-slate-800 dark:text-white font-medium">
                                        {col.name}
                                    </td>
                                    <td className="px-4 py-2 text-blue-600 dark:text-blue-400 font-mono text-xs">{formatColumnType(col)}</td>
                                    <td className="px-4 py-2 text-center text-xs">
                                        {col.nullable ? <span className="text-slate-400">Yes</span> : <span className="font-bold text-slate-600 dark:text-slate-300">No</span>}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs truncate max-w-xs" title={col.comment}>
                                        {col.comment}
                                    </td>
                                </tr>
                            ))}
                            {columns.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        {t('db_viewer.noColumnsFound')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resizer Handle */}
            <div
                className="h-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 cursor-row-resize flex items-center justify-center z-20 shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Bottom: DDL */}
            <div
                className="flex flex-col bg-slate-50 dark:bg-slate-900 shrink-0"
                style={{ height: ddlHeight }}
                onContextMenu={(e) => handleContextMenu(e, 'ddl')}
            >
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                        <Code size={14} className="mr-2" />
                        DDL Statement
                        {isConvertedDdl && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">
                                {detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}
                            </span>
                        )}
                    </span>
                    <div className="flex items-center space-x-1">
                        {(detectedDbType === 'mysql' || detectedDbType === 'doris') && ddl && (
                            <button
                                onClick={handleConvertDdl}
                                className={`p-1 rounded transition-colors flex items-center text-xs ${isConvertedDdl
                                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900'
                                    : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                    }`}
                                title={isConvertedDdl
                                    ? (t('db_viewer.restoreOriginal'))
                                    : (t('db_viewer.convertToDetectedDbTypeMy', { dbType: detectedDbType === 'mysql' ? 'Doris' : 'MySQL' }))}
                            >
                                <RefreshCw size={14} className={isConvertedDdl ? 'mr-1' : ''} />
                                {isConvertedDdl && (t('db_viewer.restore'))}
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(isConvertedDdl ? convertedDdl : ddl);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                            title={t('dbViewer.copy')}
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre">
                    {isConvertedDdl ? convertedDdl : (ddl || (loading ? (t('db_viewer.loading')) : (t('db_viewer.noDDLAvailable'))))}
                </div>
            </div>
        </div>
    );
};
