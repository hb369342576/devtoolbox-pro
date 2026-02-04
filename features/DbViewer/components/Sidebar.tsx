import React, { useEffect, useState } from 'react';
import { Database, LogOut, Loader2, Search, Table, ChevronDown, FileCode, Check, Download, Copy, Trash2 } from 'lucide-react';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';
import { useDatabase } from '../../../hooks/useDatabase';
import { useTables } from '../../../hooks/useTables';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import { DatabaseService } from '../../../services/database.service';
import { generateSelectSql, generateInsertSql, generateUpdateSql, generateDeleteSql } from '../utils/sqlGenerator';
import { useToast } from '../../../components/ui/Toast';
import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ExportProgressModal } from './ExportProgressModal';
import { ConvertDdlModal } from './ConvertDdlModal';
import { TruncateModal } from './TruncateModal';
import { detectDbTypeFromDdl, convertMysqlToDoris, convertDorisToMysql } from '../utils/ddlConverter';
import { RefreshCw } from 'lucide-react';

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

    // 导出模态框状态
    const [exportModal, setExportModal] = useState<{
        isOpen: boolean;
        type: 'db-structure' | 'db-data' | 'table-structure' | 'table-data' | null;
        tableName?: string;
    }>({ isOpen: false, type: null });

    // DDL 转换模态框状态
    const [convertModal, setConvertModal] = useState<{
        isOpen: boolean;
        sourceType: 'mysql' | 'doris' | null;
        progress: string;
        isConverting: boolean;
    }>({ isOpen: false, sourceType: null, progress: '', isConverting: false });

    // 清理数据库模态框状态
    const [truncateModal, setTruncateModal] = useState(false);

    const { toast } = useToast();
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        toast({
            title: type === 'error' ? (lang === 'zh' ? '错误' : 'Error') : (lang === 'zh' ? '提示' : 'Info'),
            description: message,
            variant: type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'default'
        });
    };

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

    // 当数据库列表加载完成后，同步到 Zustand store
    useEffect(() => {
        if (fetchedDbs.length > 0) {
            setDatabases(fetchedDbs);

            // 如果连接有默认数据库且没有已选中的数据库，自动选中默认数据库
            if (selectedConnection?.defaultDatabase && !selectedDatabase) {
                const defaultDb = selectedConnection.defaultDatabase;
                if (fetchedDbs.includes(defaultDb)) {
                    setSelectedDatabase(defaultDb);
                }
            }
        }
    }, [fetchedDbs, setDatabases, selectedConnection, selectedDatabase, setSelectedDatabase]);

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

    // 打开导出模态框
    const openExportModal = (type: 'db-structure' | 'db-data' | 'table-structure' | 'table-data', tableName?: string) => {
        setExportModal({ isOpen: true, type, tableName });
    };

    // 执行导出（由模态框调用）
    const handleExport = async (filePath: string, onProgress: (message: string) => void) => {
        if (!selectedConnection || !selectedDatabase || !exportModal.type) return;

        const { type, tableName } = exportModal;

        if (type === 'db-structure') {
            // 导出数据库结构
            onProgress(lang === 'zh' ? `📊 数据库: ${selectedDatabase}` : `📊 Database: ${selectedDatabase}`);
            onProgress(lang === 'zh' ? `📋 共 ${tables.length} 个表` : `📋 Total ${tables.length} tables`);

            let allDdl = `-- Database: ${selectedDatabase}\n-- Export Time: ${new Date().toLocaleString()}\n\n`;

            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                onProgress(lang === 'zh' ? `⏳ [${i + 1}/${tables.length}] 导出表结构: ${table.name}` : `⏳ [${i + 1}/${tables.length}] Exporting table: ${table.name}`);
                const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, table.name);
                allDdl += `-- Table: ${table.name}\n`;
                allDdl += detail.ddl + '\n\n';
            }

            await writeTextFile(filePath, allDdl);
        }
        else if (type === 'db-data') {
            // 导出数据库数据
            onProgress(lang === 'zh' ? `📊 数据库: ${selectedDatabase}` : `📊 Database: ${selectedDatabase}`);
            onProgress(lang === 'zh' ? `📋 共 ${tables.length} 个表` : `📋 Total ${tables.length} tables`);

            const connStr = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;
            let allData = `-- Database: ${selectedDatabase}\n-- Data Export Time: ${new Date().toLocaleString()}\n\n`;

            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                onProgress(lang === 'zh' ? `⏳ [${i + 1}/${tables.length}] 导出表数据: ${table.name}` : `⏳ [${i + 1}/${tables.length}] Exporting data: ${table.name}`);

                const rows: any[] = await invoke('db_query', {
                    id: connStr,
                    sql: `SELECT * FROM \`${selectedDatabase}\`.\`${table.name}\` LIMIT 10000`
                });

                if (rows.length > 0) {
                    allData += `-- Table: ${table.name} (${rows.length} rows)\n`;
                    onProgress(lang === 'zh' ? `  💾 ${table.name}: ${rows.length} 行数据` : `  💾 ${table.name}: ${rows.length} rows`);
                    for (const row of rows) {
                        const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
                        const vals = Object.values(row).map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ');
                        allData += `INSERT INTO \`${table.name}\` (${cols}) VALUES (${vals});\n`;
                    }
                    allData += '\n';
                } else {
                    onProgress(lang === 'zh' ? `  ⚠️ ${table.name}: 无数据` : `  ⚠️ ${table.name}: No data`);
                }
            }

            await writeTextFile(filePath, allData);
        }
        else if (type === 'table-structure' && tableName) {
            // 导出表结构
            onProgress(lang === 'zh' ? `📋 表: ${tableName}` : `📋 Table: ${tableName}`);
            onProgress(lang === 'zh' ? `⏳ 正在获取表结构...` : `⏳ Fetching table structure...`);

            const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, tableName);
            const content = `-- Table: ${tableName}\n-- Export Time: ${new Date().toLocaleString()}\n\n${detail.ddl}`;

            await writeTextFile(filePath, content);
        }
        else if (type === 'table-data' && tableName) {
            // 导出表数据
            onProgress(lang === 'zh' ? `📋 表: ${tableName}` : `📋 Table: ${tableName}`);
            onProgress(lang === 'zh' ? `⏳ 正在查询数据...` : `⏳ Querying data...`);

            const connStr = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;
            const rows: any[] = await invoke('db_query', {
                id: connStr,
                sql: `SELECT * FROM \`${selectedDatabase}\`.\`${tableName}\` LIMIT 10000`
            });

            onProgress(lang === 'zh' ? `💾 共 ${rows.length} 行数据` : `💾 Total ${rows.length} rows`);

            let content = `-- Table: ${tableName}\n-- Data Export Time: ${new Date().toLocaleString()}\n-- Rows: ${rows.length}\n\n`;

            for (const row of rows) {
                const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
                const vals = Object.values(row).map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ');
                content += `INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals});\n`;
            }

            await writeTextFile(filePath, content);
        }
    };



    // 打开转换模态框
    const openConvertModal = () => {
        setConvertModal({
            isOpen: true,
            sourceType: 'mysql', // 默认，后面逻辑会自适应
            progress: '',
            isConverting: false
        });
        setContextMenu(null);
    };

    // 执行批量转换
    const executeBatchConvert = async (filePath: string) => {
        if (!selectedConnection || !selectedDatabase) return;

        setConvertModal(prev => ({ ...prev, isConverting: true, progress: lang === 'zh' ? '正在初始化...' : 'Initializing...' }));

        try {
            // 1. 获取所有表
            const dbId = `${selectedConnection.type}://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;

            // 使用当前的 tables 状态，如果为空则常识重新获取（但通常应该有数据）
            let targetTables = tables;
            if (targetTables.length === 0) {
                // 尝试 fetch，或者直接报错
                // 这里简单处理：如果当前视图没有表，抛出错误
                throw new Error(lang === 'zh' ? '当前数据库没有表' : 'No tables found in current database');
            }

            const tableNames = targetTables.map(t => t.name);

            let convertedContent = `-- Batch DDL Conversion\n-- Database: ${selectedDatabase}\n-- Time: ${new Date().toLocaleString()}\n\n`;
            let sourceType: 'mysql' | 'doris' = 'mysql';

            setConvertModal(prev => ({ ...prev, progress: lang === 'zh' ? `找到 ${tableNames.length} 个表` : `Found ${tableNames.length} tables` }));

            // 2. 遍历表
            for (let i = 0; i < tableNames.length; i++) {
                const tableName = tableNames[i];

                // Update progress
                const progressMsg = lang === 'zh'
                    ? `正在处理 [${i + 1}/${tableNames.length}]: ${tableName}`
                    : `Processing [${i + 1}/${tableNames.length}]: ${tableName}`;

                setConvertModal(prev => ({ ...prev, progress: progressMsg }));

                // 获取列信息
                const schema: any = await invoke('db_get_table_schema', {
                    id: dbId,
                    db: selectedDatabase,
                    table: tableName
                });
                const columns = schema.columns || [];

                // 获取 DDL
                const ddlQuery = `SHOW CREATE TABLE \`${selectedDatabase}\`.\`${tableName}\``;
                const ddlResult = await invoke<any[]>('db_query', {
                    id: dbId,
                    sql: ddlQuery
                });

                let ddl = '';
                if (ddlResult && ddlResult.length > 0) {
                    const row = ddlResult[0];
                    ddl = row['Create Table'] || row['Create View'] || '';
                }

                if (i === 0) {
                    sourceType = detectDbTypeFromDdl(ddl);
                    // Update source type in modal if needed, though mostly visual
                    setConvertModal(prev => ({ ...prev, sourceType }));
                }

                let converted = '';
                if (sourceType === 'mysql') {
                    converted = convertMysqlToDoris(tableName, columns, ddl);
                } else {
                    converted = convertDorisToMysql(tableName, columns, ddl);
                }

                convertedContent += `-- Table: ${tableName}\n`;
                convertedContent += converted;
                convertedContent += '\n\n';

                // Small delay to allow UI update if needed (optional)
                await new Promise(r => setTimeout(r, 10));
            }

            // 3. 保存文件
            setConvertModal(prev => ({ ...prev, progress: lang === 'zh' ? '正在保存文件...' : 'Saving file...' }));
            await writeTextFile(filePath, convertedContent);

            setConvertModal(prev => ({
                ...prev,
                isConverting: false,
                progress: lang === 'zh' ? '转换完成！文件已保存。' : 'Conversion completed! File saved.'
            }));

            showToast(lang === 'zh' ? '转换成功' : 'Conversion successful', 'success');

            // 延迟关闭，让用户看到完成状态
            setTimeout(() => {
                setConvertModal(prev => ({ ...prev, isOpen: false }));
            }, 1000);

        } catch (err: any) {
            console.error('Batch convert failed:', err);
            setConvertModal(prev => ({
                ...prev,
                isConverting: false,
                progress: lang === 'zh' ? `错误: ${err.message || err}` : `Error: ${err.message || err}`
            }));
            showToast(err.toString(), 'error');
            // Do NOT close modal on error, let user see the error
        }
    };

    // 数据库右键菜单
    const handleDatabaseContextMenu = (e: React.MouseEvent) => {
        if (!selectedDatabase || !isTauri) return;
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                {
                    label: lang === 'zh' ? '复制库名' : 'Copy Database Name',
                    icon: <Copy size={14} />,
                    onClick: async () => {
                        await navigator.clipboard.writeText(selectedDatabase);
                        showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
                        setContextMenu(null);
                    }
                },
                { divider: true },
                {
                    label: lang === 'zh' ? '导出库结构' : 'Export Database Structure',
                    icon: <Download size={14} />,
                    onClick: () => openExportModal('db-structure')
                },
                {
                    label: lang === 'zh' ? '导出库数据' : 'Export Database Data',
                    icon: <Download size={14} />,
                    onClick: () => openExportModal('db-data')
                },
                {
                    label: lang === 'zh' ? '一键 DDL 转换' : 'Batch DDL Conversion',
                    icon: <RefreshCw size={14} />,
                    onClick: () => openConvertModal()
                },
                { divider: true },
                {
                    label: lang === 'zh' ? '清理数据库' : 'Truncate Database',
                    icon: <Trash2 size={14} />,
                    onClick: () => {
                        setTruncateModal(true);
                        setContextMenu(null);
                    }
                }
            ]
        });
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
                },
                { divider: true },
                {
                    label: lang === 'zh' ? '复制表名' : 'Copy Table Name',
                    icon: <Copy size={14} />,
                    onClick: async () => {
                        await navigator.clipboard.writeText(tableName);
                        showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
                        setContextMenu(null);
                    }
                },
                {
                    label: lang === 'zh' ? '复制 TRUNCATE 语句' : 'Copy TRUNCATE Statement',
                    icon: <Trash2 size={14} />,
                    onClick: async () => {
                        const sql = `TRUNCATE TABLE \`${selectedDatabase}\`.\`${tableName}\`;`;
                        await navigator.clipboard.writeText(sql);
                        showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
                        setContextMenu(null);
                    }
                },
                { divider: true },
                {
                    label: lang === 'zh' ? '导出表结构' : 'Export Table Structure',
                    icon: <Download size={14} />,
                    onClick: () => openExportModal('table-structure', tableName)
                },
                {
                    label: lang === 'zh' ? '导出表数据' : 'Export Table Data',
                    icon: <Download size={14} />,
                    onClick: () => openExportModal('table-data', tableName)
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
                <div className="mb-4" onContextMenu={handleDatabaseContextMenu}>
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

            {/* 导出进度模态框 */}
            <ExportProgressModal
                isOpen={exportModal.isOpen}
                onClose={() => setExportModal({ isOpen: false, type: null })}
                onConfirm={handleExport}
                title={
                    exportModal.type === 'db-structure' ? (lang === 'zh' ? '导出数据库结构' : 'Export Database Structure') :
                        exportModal.type === 'db-data' ? (lang === 'zh' ? '导出数据库数据' : 'Export Database Data') :
                            exportModal.type === 'table-structure' ? (lang === 'zh' ? '导出表结构' : 'Export Table Structure') :
                                exportModal.type === 'table-data' ? (lang === 'zh' ? '导出表数据' : 'Export Table Data') :
                                    ''
                }
                defaultFileName={
                    (() => {
                        // 生成本地时间戳（UTC+8），格式：2026-01-23_16-32-45
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hour = String(now.getHours()).padStart(2, '0');
                        const minute = String(now.getMinutes()).padStart(2, '0');
                        const second = String(now.getSeconds()).padStart(2, '0');
                        const timestamp = `${year}-${month}-${day}_${hour}-${minute}-${second}`;

                        if (exportModal.type === 'db-structure') {
                            return `${selectedDatabase}_ddl_${timestamp}.sql`;
                        } else if (exportModal.type === 'db-data') {
                            return `${selectedDatabase}_data_${timestamp}.sql`;
                        } else if (exportModal.type === 'table-structure' && exportModal.tableName) {
                            return `${exportModal.tableName}_ddl_${timestamp}.sql`;
                        } else if (exportModal.type === 'table-data' && exportModal.tableName) {
                            return `${exportModal.tableName}_data_${timestamp}.sql`;
                        }
                        return 'export.sql';
                    })()
                }
                lang={lang}
            />

            {/* 批量转换模态框 */}
            {/* 批量转换模态框 */}
            <ConvertDdlModal
                isOpen={convertModal.isOpen}
                onClose={() => setConvertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeBatchConvert}
                sourceType={convertModal.sourceType}
                defaultFileName={`${selectedDatabase}_converted_${(() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hour = String(now.getHours()).padStart(2, '0');
                    const minute = String(now.getMinutes()).padStart(2, '0');
                    const second = String(now.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
                })()}.sql`}
                lang={lang}
                isConverting={convertModal.isConverting}
                progress={convertModal.progress}
            />

            {/* 清理数据库模态框 */}
            <TruncateModal
                isOpen={truncateModal}
                onClose={() => setTruncateModal(false)}
                tables={tables.map(t => t.name)}
                databaseName={selectedDatabase || ''}
                lang={lang}
            />
        </div>
    );
};
