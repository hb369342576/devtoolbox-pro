import React, { useEffect, useState } from 'react';
import { Database, LogOut, Loader2, Search, Table, ChevronDown, FileCode, Check } from 'lucide-react';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';
import { useDatabase } from '../../../hooks/useDatabase';
import { useTables } from '../../../hooks/useTables';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import { DatabaseService } from '../../../services/database.service';
import { generateSelectSql, generateInsertSql, generateUpdateSql, generateDeleteSql } from '../utils/sqlGenerator';
import { useToast } from '../../../components/ui/Toast';

export const Sidebar: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = getTexts(lang);

    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const databases = useDbViewerStore((state) => state.databases);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const tables = useDbViewerStore((state) => state.tables);
    const tableSearch = useDbViewerStore((state) => state.tableSearch);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);

    const setSelectedConnection = useDbViewerStore((state) => state.setSelectedConnection);
    const setDatabases = useDbViewerStore((state) => state.setDatabases);
    const setSelectedDatabase = useDbViewerStore((state) => state.setSelectedDatabase);
    const setTables = useDbViewerStore((state) => state.setTables);
    const setTableSearch = useDbViewerStore((state) => state.setTableSearch);
    const setSelectedTable = useDbViewerStore((state) => state.setSelectedTable);

    // 使用 useDatabase hook 加载数据库列表
    const { databases: fetchedDbs, loading: dbLoading, error: dbError } = useDatabase(selectedConnection);

    // 使用 useTables hook 加载表列表
    const { tables: fetchedTables, loading: tableLoading, error: tableError } = useTables(
        selectedConnection,
        selectedDatabase || ''
    );

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);
    const [generatingSql, setGeneratingSql] = useState(false);

    const { showToast } = useToast();

    // 当数据库列表加载完成后，同步到 Zustand store
    useEffect(() => {
        if (fetchedDbs.length > 0) {
            setDatabases(fetchedDbs);
        }
    }, [fetchedDbs, setDatabases]);

    // 当表列表加载完成后，同步到 Zustand store
    useEffect(() => {
        if (fetchedTables.length > 0) {
            setTables(fetchedTables);
        }
    }, [fetchedTables, setTables]);

    // 过滤后的表列表
    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    const handleGenerateSql = async (tableName: string, type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') => {
        if (!selectedConnection || !selectedDatabase) return;

        setGeneratingSql(true);
        try {
            const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, tableName);
            const cols = detail.columns;

            let sql = '';
            switch (type) {
                case 'SELECT': sql = generateSelectSql(tableName, cols); break;
                case 'INSERT': sql = generateInsertSql(tableName, cols); break;
                case 'UPDATE': sql = generateUpdateSql(tableName, cols); break;
                case 'DELETE': sql = generateDeleteSql(tableName, cols); break;
            }

            await navigator.clipboard.writeText(sql);
            showToast(t.common?.copied || (lang === 'zh' ? '复制成功' : 'Copied successfully'), 'success');
        } catch (e) {
            console.error('Failed to generate SQL', e);
            showToast(lang === 'zh' ? '生成失败' : 'Failed to generate', 'error');
        } finally {
            setGeneratingSql(false);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, tableName: string) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                {
                    label: lang === 'zh' ? '生成 SELECT 语句' : 'Generate SELECT',
                    icon: <FileCode size={14} />,
                    onClick: () => handleGenerateSql(tableName, 'SELECT')
                },
                {
                    label: lang === 'zh' ? '生成 INSERT 语句' : 'Generate INSERT',
                    icon: <FileCode size={14} />,
                    onClick: () => handleGenerateSql(tableName, 'INSERT')
                },
                {
                    label: lang === 'zh' ? '生成 UPDATE 语句' : 'Generate UPDATE',
                    icon: <FileCode size={14} />,
                    onClick: () => handleGenerateSql(tableName, 'UPDATE')
                },
                {
                    label: lang === 'zh' ? '生成 DELETE 语句' : 'Generate DELETE',
                    icon: <FileCode size={14} />,
                    onClick: () => handleGenerateSql(tableName, 'DELETE')
                }
            ]
        });
    };

    return (
        <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
            {/* 连接信息 */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white truncate flex items-center">
                        <Database size={16} className="mr-2 text-blue-600" />
                        {selectedConnection?.name}
                    </h3>
                    <button
                        onClick={() => setSelectedConnection(null)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title={lang === 'zh' ? '断开连接' : 'Disconnect'}
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                {/* 数据库下拉选择框 */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {lang === 'zh' ? '选择数据库' : 'Select Database'}
                    </label>
                    <div className="relative">
                        <select
                            value={selectedDatabase || ''}
                            onChange={(e) => setSelectedDatabase(e.target.value)}
                            disabled={dbLoading || databases.length === 0}
                            className="w-full px-3 py-2 pr-8 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                        >
                            <option value="">
                                {dbLoading
                                    ? (lang === 'zh' ? '加载中...' : 'Loading...')
                                    : (lang === 'zh' ? '请选择数据库' : 'Select a database')}
                            </option>
                            {databases.map(db => (
                                <option key={db} value={db}>
                                    {db}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {dbError && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{dbError}</p>
                    )}
                </div>
            </div>

            {/* 表列表区域 */}
            {selectedDatabase && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 搜索框 */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder={lang === 'zh' ? '搜索表名...' : 'Search tables...'}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {filteredTables.length > 0 && (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {filteredTables.length !== tables.length
                                    ? `${filteredTables.length} / ${tables.length} ${lang === 'zh' ? '个表' : 'tables'}`
                                    : `${tables.length} ${lang === 'zh' ? '个表' : 'tables'}`}
                            </p>
                        )}

                    </div>

                    {/* 表列表 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tableLoading && (
                            <div className="flex items-center justify-center py-8 text-slate-500">
                                <Loader2 size={18} className="animate-spin mr-2" />
                                <span className="text-sm">{lang === 'zh' ? '加载表列表...' : 'Loading tables...'}</span>
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
                                    ? (lang === 'zh' ? '未找到匹配的表' : 'No matching tables')
                                    : (lang === 'zh' ? '该数据库暂无表' : 'No tables in this database')}
                            </div>
                        )}
                        {!tableLoading && filteredTables.map(table => (
                            <button
                                key={table.name}
                                onClick={() => setSelectedTable(table.name)}
                                onContextMenu={(e) => handleContextMenu(e, table.name)}
                                title={table.name}
                                className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 transition-colors group ${selectedTable === table.name
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
                                                    {table.rows.toLocaleString()} {lang === 'zh' ? '行' : 'rows'}
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
            )}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};
