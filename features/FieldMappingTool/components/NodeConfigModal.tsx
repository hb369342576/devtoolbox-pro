import React, { useState, useEffect } from 'react';
import { X, Database, Code, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DbConnection, Language, TableInfo, TableDetail, CanvasNode } from '../../../types';
import { useFieldMappingStore } from '../store';
import { useToast } from '../../../components/ui/Toast';

interface NodeConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    node: CanvasNode | null;
    lang: Language;
    connections: DbConnection[];
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
    isOpen,
    onClose,
    node,
    lang,
    connections
}) => {
    const { toast } = useToast();
    const { updateNode, saveCurrentProfile } = useFieldMappingStore();

    // Source/Sink state
    const [selectedConnId, setSelectedConnId] = useState<string>('');
    const [selectedDb, setSelectedDb] = useState<string>('');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [databases, setDatabases] = useState<string[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [tableSearch, setTableSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Transform state
    const [transformSql, setTransformSql] = useState<string>('');

    // Reset state when node changes
    useEffect(() => {
        if (node) {
            setSelectedConnId(node.connId || '');
            setSelectedDb(node.database || '');
            setSelectedTable(node.tableName || '');
            setTransformSql(node.sql || '');
        }
    }, [node?.id]);

    // Load databases when connection changes
    useEffect(() => {
        if (selectedConnId) {
            loadDatabases(selectedConnId);
        } else {
            setDatabases([]);
            setSelectedDb('');
        }
    }, [selectedConnId]);

    // Load tables when database changes
    useEffect(() => {
        if (selectedConnId && selectedDb) {
            loadTables(selectedConnId, selectedDb);
        } else {
            setTables([]);
            setSelectedTable('');
        }
    }, [selectedConnId, selectedDb]);

    const getConn = (id: string) => connections.find(c => c.id === id);

    const loadDatabases = async (connId: string) => {
        const conn = getConn(connId);
        if (!conn) return;

        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const dbs = await invoke<string[]>('db_get_databases', { id: connStr });
            setDatabases(dbs);
        } catch (e) {
            console.error(e);
            setDatabases([]);
        }
    };

    const loadTables = async (connId: string, db: string) => {
        const conn = getConn(connId);
        if (!conn || !db) return;

        setIsLoading(true);
        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const tableList = await invoke<TableInfo[]>('db_get_tables', { id: connStr, db });
            setTables(tableList);
        } catch (e) {
            console.error(e);
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Save Source/Sink config
    const handleSaveDataSource = async () => {
        if (!node || !selectedConnId || !selectedDb || !selectedTable) {
            toast({ title: lang === 'zh' ? '请完成配置' : 'Please complete configuration', variant: 'destructive' });
            return;
        }

        const conn = getConn(selectedConnId);
        if (!conn) return;

        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const detail = await invoke<TableDetail>('db_get_table_schema', {
                id: connStr,
                db: selectedDb,
                table: selectedTable
            });

            updateNode(node.id, {
                connId: selectedConnId,
                database: selectedDb,
                tableName: selectedTable,
                dbType: conn.type,
                columns: detail.columns
            });

            saveCurrentProfile();
            toast({ title: lang === 'zh' ? '配置已保存' : 'Configuration saved', variant: 'success' });
            onClose();
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '获取表结构失败' : 'Failed to get schema', description: err.message, variant: 'destructive' });
        }
    };

    // Save Transform config
    const handleSaveTransform = () => {
        if (!node) return;

        if (!transformSql.trim()) {
            toast({ title: lang === 'zh' ? '请输入 SQL 语句' : 'Please enter SQL', variant: 'destructive' });
            return;
        }

        updateNode(node.id, {
            sql: transformSql,
            tableName: 'Transform' // 显示名称
        });

        saveCurrentProfile();
        toast({ title: lang === 'zh' ? 'SQL 已保存' : 'SQL saved', variant: 'success' });
        onClose();
    };

    if (!isOpen || !node) return null;

    const isTransform = node.type === 'transform';
    const nodeTypeLabel = node.type === 'source' ? 'Source' : node.type === 'sink' ? 'Sink' : 'Transform';
    const nodeTypeColor = node.type === 'source' ? 'blue' : node.type === 'sink' ? 'green' : 'amber';

    const filteredTables = tables.filter(t => 
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl ${isTransform ? 'w-[600px]' : 'w-[500px]'} max-h-[80vh] overflow-hidden`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b dark:border-slate-700 bg-${nodeTypeColor}-50 dark:bg-${nodeTypeColor}-900/20 flex justify-between items-center`}>
                    <div className="flex items-center space-x-3">
                        {isTransform ? (
                            <Code className={`text-${nodeTypeColor}-600`} size={20} />
                        ) : (
                            <Database className={`text-${nodeTypeColor}-600`} size={20} />
                        )}
                        <span className="font-bold text-lg dark:text-white">
                            {lang === 'zh' ? `配置 ${nodeTypeLabel} 节点` : `Configure ${nodeTypeLabel} Node`}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isTransform ? (
                        /* Transform SQL Editor */
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {lang === 'zh' ? 'SQL 转换语句' : 'SQL Transform'}
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                                {lang === 'zh' 
                                    ? '编写 SQL 对数据进行转换处理，可使用 SeaTunnel SQL Transform 语法' 
                                    : 'Write SQL to transform data using SeaTunnel SQL Transform syntax'}
                            </p>
                            <textarea
                                value={transformSql}
                                onChange={(e) => setTransformSql(e.target.value)}
                                placeholder={`SELECT 
  id,
  UPPER(name) as name,
  age + 1 as age
FROM source_table`}
                                className="w-full h-64 p-4 font-mono text-sm bg-slate-900 text-green-400 border border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            />
                            <div className="mt-3 text-xs text-slate-500">
                                💡 {lang === 'zh' ? '提示：使用上游节点的表名作为数据源表' : 'Tip: Use upstream node table name as source table'}
                            </div>
                        </div>
                    ) : (
                        /* Source/Sink Data Source Selector */
                        <div className="space-y-5">
                            {/* Connection Select */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {lang === 'zh' ? '数据源连接' : 'Connection'}
                                </label>
                                <select
                                    value={selectedConnId}
                                    onChange={(e) => setSelectedConnId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{lang === 'zh' ? '-- 选择连接 --' : '-- Select Connection --'}</option>
                                    {connections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Database Select */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {lang === 'zh' ? '数据库' : 'Database'}
                                </label>
                                <select
                                    value={selectedDb}
                                    onChange={(e) => setSelectedDb(e.target.value)}
                                    disabled={!selectedConnId}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    <option value="">{lang === 'zh' ? '-- 选择数据库 --' : '-- Select Database --'}</option>
                                    {databases.map(db => (
                                        <option key={db} value={db}>{db}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Table Select with Search */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {lang === 'zh' ? '数据表' : 'Table'}
                                </label>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={lang === 'zh' ? '搜索表...' : 'Search tables...'}
                                        value={tableSearch}
                                        onChange={(e) => setTableSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-slate-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</div>
                                    ) : filteredTables.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">
                                            {!selectedDb ? (lang === 'zh' ? '请先选择数据库' : 'Select database first') : (lang === 'zh' ? '无匹配表' : 'No matching tables')}
                                        </div>
                                    ) : (
                                        filteredTables.map(table => (
                                            <div
                                                key={table.name}
                                                onClick={() => setSelectedTable(table.name)}
                                                className={`px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between ${
                                                    selectedTable === table.name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : ''
                                                }`}
                                            >
                                                <span>{table.name}</span>
                                                <span className="text-xs text-slate-400">{table.rows || 0} rows</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t dark:border-slate-700 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button
                        onClick={isTransform ? handleSaveTransform : handleSaveDataSource}
                        disabled={isTransform ? !transformSql.trim() : (!selectedConnId || !selectedDb || !selectedTable)}
                        className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                            isTransform ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {lang === 'zh' ? '确定' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};
