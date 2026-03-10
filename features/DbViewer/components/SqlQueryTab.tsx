import React from 'react';
import { Loader2, X, Plus, Database, Code, Sparkles, Play, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SqlTab } from '../hooks/useSqlTabs';
import { SqlEditor } from './SqlEditor';
import { useTranslation } from 'react-i18next';
import { DbConnection, TableInfo } from '../../../types';

interface SqlQueryTabProps {
    sqlTabs: SqlTab[];
    activeSqlTabId: string | null;
    setActiveSqlTabId: (id: string | null) => void;
    handleAddSqlTab: () => void;
    handleCloseSqlTab: (id: string) => void;
    activeTab_sql?: SqlTab;
    queryEditorHeight: number;
    setIsQueryResizing: (resizing: boolean) => void;
    handleFormatSql: () => void;
    handleExecuteSelected: () => void;
    handleExecuteQuery: () => void;
    updateSqlTab: (id: string, updates: Partial<SqlTab>) => void;
    tables: TableInfo[];
    selectedTable: string | null;
    selectedDatabase: string | null;
    selectedConnection: DbConnection | null;
    columns: any[];
    sortedResults: any[];
    totalPages: number;
    handleResultContextMenu: (e: React.MouseEvent) => void;
    queryColumns: string[];
    handleSort: (col: string) => void;
    paginatedResults: any[];
    pageSize: number;
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export const SqlQueryTab: React.FC<SqlQueryTabProps> = ({
    sqlTabs, activeSqlTabId, setActiveSqlTabId, handleAddSqlTab, handleCloseSqlTab,
    activeTab_sql, queryEditorHeight, setIsQueryResizing,
    handleFormatSql, handleExecuteSelected, handleExecuteQuery, updateSqlTab,
    tables, selectedTable, selectedDatabase, selectedConnection, columns,
    sortedResults, totalPages, handleResultContextMenu, queryColumns, handleSort,
    paginatedResults, pageSize, showToast
}) => {
    const { t } = useTranslation();

    return (
        <div id="query-split-container" className="flex-1 flex flex-col min-h-0 relative">
            {/* SQL Tabs Bar */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2">
                <div className="flex-1 flex items-center overflow-x-auto">
                    {sqlTabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveSqlTabId(tab.id)}
                            className={`flex items-center px-3 py-1.5 cursor-pointer border-r border-slate-200 dark:border-slate-700 group ${
                                activeSqlTabId === tab.id
                                    ? 'bg-white dark:bg-slate-900 text-blue-600'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-xs font-medium whitespace-nowrap">{tab.name}</span>
                            {tab.loading && <Loader2 size={12} className="ml-1 animate-spin" />}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCloseSqlTab(tab.id); }}
                                className="ml-2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleAddSqlTab}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ml-1 shrink-0"
                    title={t('dbViewer.newQuery')}
                >
                    <Plus size={16} className="text-slate-500" />
                </button>
            </div>

            {/* No Tab Selected */}
            {!activeTab_sql && (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <Database size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="mb-4">{t('db_viewer.clickToAddANewQueryTab')}</p>
                        <button
                            onClick={handleAddSqlTab}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center space-x-2 mx-auto"
                        >
                            <Plus size={16} />
                            <span>{t('db_viewer.newQuery')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Active Tab Content */}
            {activeTab_sql && (
                <>
                    {/* SQL Editor Area */}
                    <div 
                        className="flex flex-col bg-slate-50 dark:bg-slate-900 shrink-0"
                        style={{ height: queryEditorHeight }}
                    >
                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-100 dark:bg-slate-800">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                <Code size={14} className="mr-2" />
                                SQL
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleFormatSql}
                                    className="px-2.5 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
                                    title={t('db_viewer.formatSQL')}
                                >
                                    <Sparkles size={14} />
                                    <span>{t('db_viewer.format')}</span>
                                </button>
                                <button
                                    onClick={handleExecuteSelected}
                                    disabled={activeTab_sql.loading}
                                    className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
                                    title={t('db_viewer.runSelected')}
                                >
                                    <Play size={14} />
                                    <span>{t('db_viewer.runSelected')}</span>
                                </button>
                                <button
                                    onClick={handleExecuteQuery}
                                    disabled={activeTab_sql.loading}
                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-lg text-sm flex items-center space-x-1.5 transition-colors"
                                >
                                    {activeTab_sql.loading ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Play size={14} />
                                    )}
                                    <span>{t('db_viewer.run')}</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {/* Monaco SQL编辑器 */}
                            <SqlEditor
                                value={activeTab_sql.sql}
                                onChange={(val: string) => updateSqlTab(activeTab_sql.id, { sql: val })}
                                tables={tables.map(t => t.name)}
                                columns={selectedTable && columns.length > 0 ? [{ table: selectedTable, columns: columns.map(c => c.name) }] : []}
                                database={selectedDatabase || undefined}
                                onExecute={handleExecuteQuery}
                                onExecuteSelected={(text: string) => {
                                    if (!selectedConnection) {
                                        showToast(t('dbViewer.pleaseSelectADatabaseConn'), 'error');
                                        return;
                                    }
                                    updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });
                                    const { invoke } = require('@tauri-apps/api/core');
                                    const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
                                    invoke('db_query', { id: connectionId, sql: text.trim() })
                                        .then((results: any) => {
                                            updateSqlTab(activeTab_sql.id, { results, loading: false });
                                            showToast(t('dbViewer.querySuccessfulResultsLen'), 'success');
                                        })
                                        .catch((error: any) => {
                                            updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
                                            showToast(`${t('dbViewer.queryFailed')}: ${error}`, 'error');
                                        });
                                }}
                                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                                height="100%"
                            />
                        </div>
                    </div>

                    {/* Query Resizer Handle */}
                    <div
                        className="h-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 cursor-row-resize flex items-center justify-center z-20 shrink-0 transition-colors"
                        onMouseDown={(e) => { setIsQueryResizing(true); e.preventDefault(); }}
                    >
                        <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    </div>

                    {/* Query Results Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Results Header */}
                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
                            <span className="text-xs font-medium text-slate-500">
                                {t('db_viewer.SortedResultsLengthRecord', { length: sortedResults.length })}
                            </span>
                            {totalPages > 1 && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => updateSqlTab(activeTab_sql.id, { currentPage: Math.max(1, activeTab_sql.currentPage - 1) })}
                                        disabled={activeTab_sql.currentPage === 1}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        {activeTab_sql.currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => updateSqlTab(activeTab_sql.id, { currentPage: Math.min(totalPages, activeTab_sql.currentPage + 1) })}
                                        disabled={activeTab_sql.currentPage === totalPages}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Results Table */}
                        <div className="flex-1 overflow-auto" onContextMenu={handleResultContextMenu}>
                            {activeTab_sql.error ? (
                                <div className="p-4 text-red-500 text-sm">{activeTab_sql.error}</div>
                            ) : sortedResults.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 py-12">
                                    <div className="text-center">
                                        <Database size={48} className="mx-auto mb-3 opacity-30" />
                                        <p>{t('db_viewer.runAQueryToSeeResults')}</p>
                                    </div>
                                </div>
                            ) : (
                                <table className="min-w-max text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300 text-center w-12 border-r border-slate-200 dark:border-slate-700">#</th>
                                            {queryColumns.map(col => (
                                                <th 
                                                    key={col} 
                                                    onClick={() => handleSort(col)}
                                                    className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>{col}</span>
                                                        {activeTab_sql.sortColumn === col ? (
                                                            activeTab_sql.sortDirection === 'asc' ? (
                                                                <ArrowUp size={14} className="text-blue-500" />
                                                            ) : (
                                                                <ArrowDown size={14} className="text-blue-500" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown size={14} className="text-slate-300 dark:text-slate-600" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {paginatedResults.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                <td className="px-3 py-2 text-slate-400 text-xs text-center border-r border-slate-100 dark:border-slate-700">
                                                    {(activeTab_sql.currentPage - 1) * pageSize + idx + 1}
                                                </td>
                                                {queryColumns.map(col => (
                                                    <td 
                                                        key={col} 
                                                        className="px-3 py-2 text-slate-700 dark:text-slate-300 font-mono text-xs border-r border-slate-100 dark:border-slate-700 max-w-xs truncate"
                                                        title={row[col]?.toString() || ''}
                                                    >
                                                        {row[col] === null ? <span className="text-slate-400 italic">NULL</span> : row[col]?.toString()}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
