import React, { useState, useRef } from 'react';
import { Table as TableIcon, Code, Copy, Loader2, Columns, Key, RefreshCw, Play, Database, ChevronLeft, ChevronRight, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Download, Clipboard } from 'lucide-react';
import { detectDbTypeFromDdl, convertMysqlToDoris, convertDorisToMysql, formatColumnType } from '../utils/ddlConverter';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';
import { useTableDetail } from '../hooks/useTableDetail';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import { useToast } from '../../../components/ui/Toast';
import { invoke } from '@tauri-apps/api/core';
import { SqlEditor } from './SqlEditor';


// SQL标签页接口
interface SqlTab {
    id: string;
    name: string;
    sql: string;
    results: any[];
    loading: boolean;
    error: string;
    currentPage: number;
    sortColumn: string | null;
    sortDirection: 'asc' | 'desc';
}

export const TableViewer: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = getTexts(lang);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const columns = useDbViewerStore((state) => state.columns);
    const ddl = useDbViewerStore((state) => state.ddl);
    const tables = useDbViewerStore((state) => state.tables);


    const { showToast } = useToast();

    // 触发数据加载
    const { loading, error } = useTableDetail();

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);

    // 标签切换状态 - 默认数据查询
    const [activeTab, setActiveTab] = useState<'structure' | 'query'>('query');

    // Resize Logic for Structure Tab
    const [ddlHeight, setDdlHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);

    // Resize Logic for Query Tab
    const [queryEditorHeight, setQueryEditorHeight] = useState(200);
    const [isQueryResizing, setIsQueryResizing] = useState(false);

    // DDL 转换状态
    const [isConvertedDdl, setIsConvertedDdl] = useState(false);
    const [convertedDdl, setConvertedDdl] = useState('');

    // SQL多标签状态
    const [sqlTabs, setSqlTabs] = useState<SqlTab[]>([]);
    const [activeSqlTabId, setActiveSqlTabId] = useState<string | null>(null);
    const [tabCounter, setTabCounter] = useState(1);

    // 分页配置
    const [pageSize] = useState(20);

    // 获取当前激活的SQL标签
    const activeTab_sql = sqlTabs.find(t => t.id === activeSqlTabId);

    // 计算当前标签的分页和排序数据
    const currentResults = activeTab_sql?.results || [];
    const currentSortColumn = activeTab_sql?.sortColumn || null;
    const currentSortDirection = activeTab_sql?.sortDirection || 'asc';

    // 排序后的结果
    const sortedResults = React.useMemo(() => {
        if (!currentSortColumn) return currentResults;
        return [...currentResults].sort((a, b) => {
            const aVal = a[currentSortColumn];
            const bVal = b[currentSortColumn];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const strA = String(aVal).toLowerCase();
            const strB = String(bVal).toLowerCase();
            if (currentSortDirection === 'asc') {
                return strA.localeCompare(strB);
            } else {
                return strB.localeCompare(strA);
            }
        });
    }, [currentResults, currentSortColumn, currentSortDirection]);

    const totalPages = Math.ceil(sortedResults.length / pageSize);
    const paginatedResults = sortedResults.slice(
        ((activeTab_sql?.currentPage || 1) - 1) * pageSize,
        (activeTab_sql?.currentPage || 1) * pageSize
    );
    const queryColumns = sortedResults.length > 0 ? Object.keys(sortedResults[0]) : [];

    // 根据 DDL 内容检测实际的数据库类型（MySQL 还是 Doris）
    const detectedDbType = detectDbTypeFromDdl(ddl);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    // Actually, attaching to document is better for smooth dragging.
    // Using useEffect.
    React.useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const container = document.getElementById('table-viewer-split-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const newHeight = rect.bottom - e.clientY;
                if (newHeight > 50 && newHeight < rect.height - 100) {
                    setDdlHeight(newHeight);
                }
            }
        };

        const handleGlobalMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isResizing]);

    // Switch table: Reset conversion state
    React.useEffect(() => {
        setIsConvertedDdl(false);
        setConvertedDdl('');
    }, [selectedTable, selectedDatabase]);

    // Query Tab resize logic
    React.useEffect(() => {
        const handleQueryMouseMove = (e: MouseEvent) => {
            if (!isQueryResizing) return;
            const container = document.getElementById('query-split-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const newHeight = e.clientY - rect.top;
                if (newHeight > 80 && newHeight < rect.height - 100) {
                    setQueryEditorHeight(newHeight);
                }
            }
        };

        const handleQueryMouseUp = () => {
            setIsQueryResizing(false);
        };

        if (isQueryResizing) {
            document.addEventListener('mousemove', handleQueryMouseMove);
            document.addEventListener('mouseup', handleQueryMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleQueryMouseMove);
            document.removeEventListener('mouseup', handleQueryMouseUp);
        };
    }, [isQueryResizing]);

    // 添加新SQL标签
    const handleAddSqlTab = () => {
        const newId = `sql-${Date.now()}`;
        const newTab: SqlTab = {
            id: newId,
            name: `SQL ${tabCounter}`,
            sql: selectedTable && selectedDatabase ? `SELECT * FROM ${selectedDatabase}.${selectedTable} LIMIT 100` : '',
            results: [],
            loading: false,
            error: '',
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc'
        };
        setSqlTabs(prev => [...prev, newTab]);
        setActiveSqlTabId(newId);
        setTabCounter(prev => prev + 1);
    };

    // 关闭SQL标签
    const handleCloseSqlTab = (tabId: string) => {
        setSqlTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeSqlTabId === tabId && newTabs.length > 0) {
                setActiveSqlTabId(newTabs[newTabs.length - 1].id);
            } else if (newTabs.length === 0) {
                setActiveSqlTabId(null);
            }
            return newTabs;
        });
    };

    // 更新SQL标签属性
    const updateSqlTab = (tabId: string, updates: Partial<SqlTab>) => {
        setSqlTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
    };

    // 执行SQL查询
    const handleExecuteQuery = async () => {
        if (!activeTab_sql) return;
        const sql = activeTab_sql.sql;
        
        if (!sql.trim()) {
            showToast(lang === 'zh' ? '请输入SQL语句' : 'Please enter SQL statement', 'error');
            return;
        }

        if (!selectedConnection) {
            showToast(lang === 'zh' ? '请先选择数据库连接' : 'Please select a database connection first', 'error');
            return;
        }

        updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });

        try {
            // 构造连接ID
            const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
            
            const results = await invoke<any[]>('db_query', { id: connectionId, sql: sql.trim() });
            updateSqlTab(activeTab_sql.id, { results, loading: false });
            showToast(lang === 'zh' ? `查询成功，共 ${results.length} 条记录` : `Query successful, ${results.length} records`, 'success');
        } catch (error: any) {
            updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
            showToast(lang === 'zh' ? '查询失败: ' + error : 'Query failed: ' + error, 'error');
        }
    };

    // 切换排序
    const handleSort = (column: string) => {
        if (!activeTab_sql) return;
        if (activeTab_sql.sortColumn === column) {
            updateSqlTab(activeTab_sql.id, {
                sortDirection: activeTab_sql.sortDirection === 'asc' ? 'desc' : 'asc'
            });
        } else {
            updateSqlTab(activeTab_sql.id, { sortColumn: column, sortDirection: 'asc' });
        }
    };

    // textarea引用，用于获取选中文本（备用）
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 执行选中的SQL
    const handleExecuteSelected = async () => {
        if (!activeTab_sql) return;
        
        // 从Monaco编辑器获取选中文本
        const getSelectedText = (window as any).__sqlEditorGetSelectedText;
        const selectedText = getSelectedText ? getSelectedText() : '';
        
        if (!selectedText.trim()) {
            showToast(lang === 'zh' ? '请先选中SQL语句' : 'Please select SQL statement first', 'error');
            return;
        }

        if (!selectedConnection) {
            showToast(lang === 'zh' ? '请先选择数据库连接' : 'Please select a database connection first', 'error');
            return;
        }

        updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });

        try {
            const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
            const results = await invoke<any[]>('db_query', { id: connectionId, sql: selectedText.trim() });
            updateSqlTab(activeTab_sql.id, { results, loading: false });
            showToast(lang === 'zh' ? `查询成功，共 ${results.length} 条记录` : `Query successful, ${results.length} records`, 'success');
        } catch (error: any) {
            updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
            showToast(lang === 'zh' ? '查询失败: ' + error : 'Query failed: ' + error, 'error');
        }
    };

    // 美化SQL
    const handleFormatSql = () => {
        if (!activeTab_sql) return;
        const sql = activeTab_sql.sql;
        if (!sql.trim()) return;
        
        // 简单的SQL美化：关键字大写，换行缩进
        const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'AS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'];
        
        let formatted = sql;
        // 统一换行符
        formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // 去除多余空格
        formatted = formatted.replace(/\s+/g, ' ').trim();
        
        // 在关键字前换行
        const lineBreakKeywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'JOIN'];
        lineBreakKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            formatted = formatted.replace(regex, `\n${kw}`);
        });
        
        // AND/OR 前换行并缩进
        formatted = formatted.replace(/\b(AND|OR)\b/gi, '\n    $1');
        
        // 移除开头的换行
        formatted = formatted.replace(/^\n+/, '');
        
        updateSqlTab(activeTab_sql.id, { sql: formatted });
        showToast(lang === 'zh' ? 'SQL已美化' : 'SQL formatted', 'success');
    };

    // 导出数据到CSV
    const handleExportData = async () => {
        if (!sortedResults.length) return;
        
        const headers = queryColumns.join(',');
        const rows = sortedResults.map(row => 
            queryColumns.map(col => {
                const val = row[col];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // 如果包含逗号、引号或换行，用引号包裹
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        
        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const filePath = await save({
                defaultPath: `query_result_${Date.now()}.csv`,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            
            if (filePath) {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(filePath, csv);
                showToast(lang === 'zh' ? '导出成功' : 'Export successful', 'success');
            }
        } catch (err: any) {
            showToast(lang === 'zh' ? '导出失败: ' + err : 'Export failed: ' + err, 'error');
        }
    };

    // 复制当前页数据
    const handleCopyData = async () => {
        if (!paginatedResults.length) return;
        
        const headers = queryColumns.join('\t');
        const rows = paginatedResults.map(row => 
            queryColumns.map(col => row[col] ?? '').join('\t')
        );
        
        const text = [headers, ...rows].join('\n');
        
        try {
            await navigator.clipboard.writeText(text);
            showToast(lang === 'zh' ? `已复制 ${paginatedResults.length} 条数据` : `Copied ${paginatedResults.length} rows`, 'success');
        } catch (err) {
            showToast(lang === 'zh' ? '复制失败' : 'Copy failed', 'error');
        }
    };

    // 数据表格右键菜单
    const handleResultContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                {
                    label: lang === 'zh' ? '复制当前页数据' : 'Copy Current Page',
                    icon: <Clipboard size={14} />,
                    onClick: handleCopyData
                },
                {
                    label: lang === 'zh' ? '导出全部数据 (CSV)' : 'Export All (CSV)',
                    icon: <Download size={14} />,
                    onClick: handleExportData
                }
            ]
        });
    };

    // DDL 转换函数：MySQL <-> Doris
    const handleConvertDdl = () => {
        if (isConvertedDdl) {
            setIsConvertedDdl(false);
            setConvertedDdl('');
            return;
        }

        if (!ddl || columns.length === 0) return;

        const tableName = selectedTable || 'unknown_table';
        const isMySQL = detectedDbType === 'mysql';

        let result = '';

        if (isMySQL) {
            // MySQL -> Doris: 使用共享的转换函数
            result = convertMysqlToDoris(tableName, columns, ddl);
        } else {
            // Doris -> MySQL: 使用共享的转换函数
            result = convertDorisToMysql(tableName, columns, ddl);
        }

        setConvertedDdl(result);
        setIsConvertedDdl(true);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast(lang === 'zh' ? '复制失败' : 'Failed to copy', 'error');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'column' | 'ddl', data?: any) => {
        e.preventDefault();

        let items = [];

        if (type === 'column') {
            const colName = data?.name;
            items = [
                {
                    label: lang === 'zh' ? '复制列名' : 'Copy Column Name',
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(colName)
                },
                {
                    label: lang === 'zh' ? '复制所有列 (逗号分隔)' : 'Copy All Columns (CSV)',
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join(', '))
                },
                {
                    label: lang === 'zh' ? '复制所有列 (列表)' : 'Copy All Columns (List)',
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join('\n'))
                }
            ];
        } else if (type === 'ddl') {
            items = [
                {
                    label: lang === 'zh' ? '复制 DDL' : 'Copy DDL',
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(isConvertedDdl ? convertedDdl : ddl)
                }
            ];

            // 添加转换选项
            if (detectedDbType === 'mysql' || detectedDbType === 'doris') {
                items.push({
                    label: isConvertedDdl
                        ? (lang === 'zh' ? '恢复原始 DDL' : 'Restore Original DDL')
                        : (lang === 'zh' ? `转换为 ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}` : `Convert to ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}`),
                    icon: <RefreshCw size={14} />,
                    onClick: handleConvertDdl
                });
            }
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items
        });
    };

    if (!selectedTable) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                <TableIcon size={64} className="mb-4 opacity-20" />
                <p className="text-lg">{t.dbViewer.selectDb}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                    <TableIcon className="mr-2 text-blue-600" size={20} />
                    {selectedTable}
                    <button
                        onClick={() => handleCopy(selectedTable)}
                        className="ml-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title={lang === 'zh' ? '复制表名' : 'Copy Table Name'}
                    >
                        <Copy size={16} />
                    </button>
                </h2>
                {loading && (
                    <div className="flex items-center text-slate-500 text-sm">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        {lang === 'zh' ? '加载中...' : 'Loading...'}
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2">
                <button
                    onClick={() => setActiveTab('query')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'query'
                            ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-white dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Database size={16} />
                    <span>{lang === 'zh' ? '数据查询' : 'Query'}</span>
                </button>
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'structure'
                            ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-white dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Columns size={16} />
                    <span>{lang === 'zh' ? '表结构' : 'Structure'}</span>
                </button>
            </div>

            {/* Structure Tab Content */}
            {activeTab === 'structure' && (
                <div id="table-viewer-split-container" className="flex-1 flex flex-col min-h-0 relative">
                    {/* Top: Columns List */}
                <div
                    className="flex-1 overflow-auto border-b border-slate-200 dark:border-slate-700"
                    onContextMenu={(e) => {
                        // prevent default only if clicking on empty space? 
                        // Better to only allow context menu on the list area
                    }}
                >
                    {/* Using a wrapper for context menu on the whole list area if needed, 
                         but request said "Right click column list". 
                         I'll put reference on the table body or rows. */}
                    <div onContextMenu={(e) => handleContextMenu(e, 'column', { name: columns.length > 0 ? columns[0].name : '' })}> {/* Fallback for empty area click? */}
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
                                            {lang === 'zh' ? '暂无字段信息' : 'No columns found'}
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
                                        ? (lang === 'zh' ? '恢复原始 DDL' : 'Restore Original')
                                        : (lang === 'zh' ? `转换为 ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}` : `Convert to ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}`)}
                                >
                                    <RefreshCw size={14} className={isConvertedDdl ? 'mr-1' : ''} />
                                    {isConvertedDdl && (lang === 'zh' ? '恢复' : 'Restore')}
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(isConvertedDdl ? convertedDdl : ddl);
                                }}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                                title={lang === 'zh' ? '复制' : 'Copy'}
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre">
                        {isConvertedDdl ? convertedDdl : (ddl || (loading ? (lang === 'zh' ? '加载中...' : 'Loading...') : (lang === 'zh' ? '无 DDL 信息' : 'No DDL available')))}
                    </div>
                </div>
                </div>
            )}

            {/* Query Tab Content */}
            {activeTab === 'query' && (
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
                            title={lang === 'zh' ? '新建查询' : 'New Query'}
                        >
                            <Plus size={16} className="text-slate-500" />
                        </button>
                    </div>

                    {/* No Tab Selected */}
                    {!activeTab_sql && (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <Database size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="mb-4">{lang === 'zh' ? '点击 + 添加新的查询标签' : 'Click + to add a new query tab'}</p>
                                <button
                                    onClick={handleAddSqlTab}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center space-x-2 mx-auto"
                                >
                                    <Plus size={16} />
                                    <span>{lang === 'zh' ? '新建查询' : 'New Query'}</span>
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
                                            title={lang === 'zh' ? '美化SQL' : 'Format SQL'}
                                        >
                                            <Sparkles size={14} />
                                            <span>{lang === 'zh' ? '美化' : 'Format'}</span>
                                        </button>
                                        <button
                                            onClick={handleExecuteSelected}
                                            disabled={activeTab_sql.loading}
                                            className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
                                            title={lang === 'zh' ? '执行选中的SQL' : 'Run Selected'}
                                        >
                                            <Play size={14} />
                                            <span>{lang === 'zh' ? '执行选中' : 'Run Selected'}</span>
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
                                            <span>{lang === 'zh' ? '执行' : 'Run'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    {/* Monaco SQL编辑器 */}
                                    <SqlEditor
                                        value={activeTab_sql.sql}
                                        onChange={(val) => updateSqlTab(activeTab_sql.id, { sql: val })}
                                        tables={tables.map(t => t.name)}
                                        columns={selectedTable && columns.length > 0 ? [{ table: selectedTable, columns: columns.map(c => c.name) }] : []}
                                        database={selectedDatabase || undefined}
                                        onExecute={handleExecuteQuery}
                                        onExecuteSelected={(text) => {
                                            // 执行选中的SQL
                                            if (!selectedConnection) {
                                                showToast(lang === 'zh' ? '请先选择数据库连接' : 'Please select a database connection first', 'error');
                                                return;
                                            }
                                            updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });
                                            const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
                                            invoke<any[]>('db_query', { id: connectionId, sql: text.trim() })
                                                .then(results => {
                                                    updateSqlTab(activeTab_sql.id, { results, loading: false });
                                                    showToast(lang === 'zh' ? `查询成功，共 ${results.length} 条记录` : `Query successful, ${results.length} records`, 'success');
                                                })
                                                .catch((error: any) => {
                                                    updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
                                                    showToast(lang === 'zh' ? '查询失败: ' + error : 'Query failed: ' + error, 'error');
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
                                        {lang === 'zh' ? `共 ${sortedResults.length} 条记录` : `${sortedResults.length} records`}
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
                                                <p>{lang === 'zh' ? '执行查询以查看结果' : 'Run a query to see results'}</p>
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
                                                                {currentSortColumn === col ? (
                                                                    currentSortDirection === 'asc' ? (
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
