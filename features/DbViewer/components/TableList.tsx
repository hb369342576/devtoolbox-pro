import React from 'react';
import { Search, Loader2, Table } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { TableInfo } from '../../../types';

interface TableListProps {
    tables: TableInfo[];
    filteredTables: TableInfo[];
    tableSearch: string;
    setTableSearch: (val: string) => void;
    tableLoading: boolean;
    tableError: string | null;
    selectedTable: string | null;
    setSelectedTable: (name: string) => void;
    selectedDatabase: string | null;
    handleContextMenu: (e: React.MouseEvent, tableName: string) => void;
}

export const TableList: React.FC<TableListProps> = ({
    tables, filteredTables, tableSearch, setTableSearch,
    tableLoading, tableError, selectedTable, setSelectedTable,
    selectedDatabase, handleContextMenu
}) => {
    const { t } = useTranslation();

    if (!selectedDatabase) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder={t('dbViewer.searchTables', { defaultValue: '搜索数据表...' })}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {filteredTables.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {filteredTables.length !== tables.length
                            ? `${filteredTables.length} / ${tables.length} ${t('dbViewer.tables', { defaultValue: '张表' })}`
                            : `${tables.length} ${t('dbViewer.tables', { defaultValue: '张表' })}`}
                    </p>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tableLoading && (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                        <Loader2 size={18} className="animate-spin mr-2" />
                        <span className="text-sm">{t('dbViewer.loadingTables', { defaultValue: '加载中...' })}</span>
                    </div>
                )}
                {tableError && (
                    <div className="px-4 py-3 text-sm text-red-500 dark:text-red-400">
                        {tableError}
                    </div>
                )}
                {!tableLoading && !tableError && filteredTables.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">
                        {tableSearch
                            ? t('dbViewer.noMatchingTables', { defaultValue: '未找到匹配的表' })
                            : t('dbViewer.noTablesInThisDatabase', { defaultValue: '当前库中无任何表' })}
                    </div>
                )}
                {!tableLoading && filteredTables.map(table => (
                    <button
                        key={table.name}
                        onClick={() => setSelectedTable(table.name)}
                        onContextMenu={(e) => handleContextMenu(e, table.name)}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', `\`${selectedDatabase}\`.\`${table.name}\``);
                            e.dataTransfer.effectAllowed = 'copy';
                        }}
                        title={table.name}
                        className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 transition-colors group cursor-grab active:cursor-grabbing ${selectedTable === table.name
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-l-4 border-l-transparent'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2 flex-1 min-w-0">
                                <Table size={16} className="mt-0.5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {table.name}
                                    </p>
                                    {table.comment && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {table.comment}
                                        </p>
                                    )}
                                    <div className="flex items-center space-x-3 mt-1">
                                        <span className="text-xs text-slate-400">
                                            {table.rows.toLocaleString()} {t('dbViewer.rows', { defaultValue: '行' })}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {table.size}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
