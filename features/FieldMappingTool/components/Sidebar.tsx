import React, { useState, useEffect } from 'react';
import { Database, Search, ChevronLeft, Save, Plus, Edit2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DbConnection, Language, TableInfo, TableDetail } from '../../../types';
import { useFieldMappingStore } from '../store';

import { TableCard } from './TableCard';
import { getTexts } from '../../../locales';
import { useToast } from '../../../components/ui/Toast';

interface SidebarProps {
    lang: Language;
    connections: DbConnection[];
    activeProfile: any; // MappingProfile
    onBack: () => void;
    onSave: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    lang,
    connections,
    activeProfile,
    onBack,
    onSave
}) => {
    const t = getTexts(lang);
    const { addNode, nodes, updateSideConfig, saveCurrentProfile, updateActiveProfile } = useFieldMappingStore();
    const { toast } = useToast();

    // Local State
    const [activeTab, setActiveTab] = useState<'source' | 'target'>('source');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    // Connection State
    const [sourceConnId, setSourceConnId] = useState<string>('');
    const [targetConnId, setTargetConnId] = useState<string>('');
    const [sourceDb, setSourceDb] = useState<string>('');
    const [targetDb, setTargetDb] = useState<string>('');

    // Data State
    const [sourceDbs, setSourceDbs] = useState<string[]>([]);
    const [targetDbs, setTargetDbs] = useState<string[]>([]);
    const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
    const [targetTables, setTargetTables] = useState<TableInfo[]>([]);
    const [sourceSearch, setSourceSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Helpers
    const getConn = (id: string) => connections.find(c => c.id === id);

    const loadDatabases = async (connId: string, side: 'source' | 'target') => {
        const conn = getConn(connId);
        if (!conn) return;

        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const dbs = await invoke<string[]>('db_get_databases', { id: connStr });
            if (side === 'source') setSourceDbs(dbs);
            else setTargetDbs(dbs);
        } catch (e) {
            console.error(e);
        }
    };

    const loadTables = async (connId: string, db: string, side: 'source' | 'target') => {
        const conn = getConn(connId);
        if (!conn || !db) return;

        setIsLoading(true);
        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const tables = await invoke<TableInfo[]>('db_get_tables', { id: connStr, db });
            if (side === 'source') setSourceTables(tables);
            else setTargetTables(tables);
        } catch (e) {
            console.error(e);
            if (side === 'source') setSourceTables([]);
            else setTargetTables([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load Initial State from Profile
    useEffect(() => {
        if (activeProfile?.sideConfig) {
            const { source, target } = activeProfile.sideConfig;
            if (source) {
                setSourceConnId(source.connId);
                setSourceDb(source.db);
                if (source.connId) loadDatabases(source.connId, 'source');
                if (source.connId && source.db) loadTables(source.connId, source.db, 'source');
            }
            if (target) {
                setTargetConnId(target.connId);
                setTargetDb(target.db);
                if (target.connId) loadDatabases(target.connId, 'target');
                if (target.connId && target.db) loadTables(target.connId, target.db, 'target');
            }
        }
    }, [activeProfile?.id]); // Only on profile switch


    // Effects for Loading DBs on Conn Change
    // Removed to prevent circular or double loading, strictly controlled by Handlers

    // Handlers
    const handleConnChange = async (side: 'source' | 'target', connId: string) => {
        if (side === 'source') {
            setSourceConnId(connId);
            setSourceDb('');
            setSourceTables([]);
            if (connId) await loadDatabases(connId, 'source');
            updateSideConfig({ source: { connId, db: '' } });
        } else {
            setTargetConnId(connId);
            setTargetDb('');
            setTargetTables([]);
            if (connId) await loadDatabases(connId, 'target');
            updateSideConfig({ target: { connId, db: '' } });
        }
        saveCurrentProfile();
    };

    const handleDbChange = (side: 'source' | 'target', db: string) => {
        if (side === 'source') {
            setSourceDb(db);
            if (sourceConnId && db) loadTables(sourceConnId, db, 'source');
            updateSideConfig({ source: { connId: sourceConnId, db } });
        } else {
            setTargetDb(db);
            if (targetConnId && db) loadTables(targetConnId, db, 'target');
            updateSideConfig({ target: { connId: targetConnId, db } });
        }
        saveCurrentProfile();
    };

    const handleAddNode = async (table: TableInfo) => {
        // Fetch schema first
        const side = activeTab;
        const connId = side === 'source' ? sourceConnId : targetConnId;
        const db = side === 'source' ? sourceDb : targetDb;
        const conn = getConn(connId);
        if (!conn || !db) return;

        try {
            const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
            const detail = await invoke<TableDetail>('db_get_table_schema', {
                id: connStr,
                db,
                table: table.name
            });

            addNode({
                id: Date.now().toString(),
                type: side,
                x: side === 'source' ? 100 : 600,
                y: 100 + (nodes.filter(n => n.type === side).length * 100),
                tableName: table.name,
                dbType: conn.type,
                columns: detail.columns
            });
            saveCurrentProfile(); // Auto save when adding node
        } catch (e) {
            console.error('Failed to add node:', e);
            alert('Failed to get schema');
        }
    };

    const handleNameSave = () => {
        if (tempName.trim()) {
            updateActiveProfile({ name: tempName.trim() });
        }
        setIsEditingName(false);
    };

    const currentTables = activeTab === 'source' ? sourceTables : targetTables;
    const currentSearch = activeTab === 'source' ? sourceSearch : targetSearch;
    const currentConnId = activeTab === 'source' ? sourceConnId : targetConnId;
    const currentDb = activeTab === 'source' ? sourceDb : targetDb;
    const currentDbs = activeTab === 'source' ? sourceDbs : targetDbs;

    return (
        <div className="w-80 bg-white dark:bg-slate-800 border-r dark:border-slate-700 flex flex-col h-full z-10 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1 mx-4 min-w-0">
                    {isEditingName ? (
                        <input
                            autoFocus
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSave();
                                if (e.key === 'Escape') {
                                    setIsEditingName(false);
                                    setTempName(activeProfile?.name || '');
                                }
                            }}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1 font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    ) : (
                        <div className="flex items-center group cursor-pointer" onClick={() => {
                            setIsEditingName(true);
                            setTempName(activeProfile?.name || '');
                        }}>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="点击修改名称">
                                {activeProfile?.name}
                            </span>
                            <Edit2 size={14} className="ml-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
                <button onClick={() => {
                    onSave(); // Assuming onSave might do other things, keep it or remove if redundant
                    saveCurrentProfile();
                    toast({ title: lang === 'zh' ? '保存成功' : 'Saved Successfully', variant: 'success' });
                }} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">
                    <Save size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('source')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'source' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    源端 (Source)
                </button>
                <button
                    onClick={() => setActiveTab('target')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'target' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    目标端 (Target)
                </button>
            </div>

            {/* Config Area */}
            <div className="p-4 flex flex-col space-y-4">
                {/* Connection Select - Dropdown Style */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">连接 (Connection)</label>
                    <select
                        value={currentConnId}
                        onChange={(e) => handleConnChange(activeTab, e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                    >
                        <option value="">-- 选择连接 --</option>
                        {connections.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                    </select>
                </div>

                {/* Database Select */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">数据库 (Database)</label>
                    <select
                        value={currentDb}
                        onChange={(e) => handleDbChange(activeTab, e.target.value)}
                        disabled={!currentConnId}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                    >
                        <option value="">-- 选择数据库 --</option>
                        {currentDbs.map(db => (
                            <option key={db} value={db}>{db}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table List */}
            <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
                <div className="relative mb-3">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索表..."
                        value={currentSearch}
                        onChange={e => activeTab === 'source' ? setSourceSearch(e.target.value) : setTargetSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400 text-xs">加载中...</div>
                    ) : (
                        currentTables
                            .filter(t => t.name.toLowerCase().includes(currentSearch.toLowerCase()))
                            .map(table => (
                                <div key={table.name} className="relative group">
                                    <TableCard
                                        table={table}
                                        side={activeTab}
                                        onMouseDown={(e) => {
                                            useFieldMappingStore.getState().setDraggedItem({
                                                table: table,
                                                side: activeTab,
                                                connId: activeTab === 'source' ? sourceConnId : targetConnId,
                                                db: activeTab === 'source' ? sourceDb : targetDb
                                            });
                                        }}
                                    />
                                    <button
                                        onClick={() => handleAddNode(table)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="添加至画布"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            ))
                    )}
                    {!isLoading && currentTables.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                            {currentConnId ? (sourceDb || targetDb ? '未找到表' : '请选择数据库') : '请选择连接'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
