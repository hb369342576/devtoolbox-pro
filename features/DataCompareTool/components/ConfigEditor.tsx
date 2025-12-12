import React, { useState, useEffect } from 'react';
import {
    GitCompare, ArrowRight, Database, ChevronLeft, Search,
    Key, Filter, SortAsc, SortDesc, Play, RefreshCw, Plus, X
} from 'lucide-react';
import { Language, DbConnection, CompareKey, TableInfo, TableDetail } from '../../../types';
import { SavedCompareConfig, SideConfig } from '../types';
import { getTexts } from '../../../locales';
import { invoke } from '@tauri-apps/api/core';

interface ConfigEditorProps {
    lang: Language;
    connections: DbConnection[];
    configName: string;
    setConfigName: (name: string) => void;
    sourceConfig: SideConfig;
    setSourceConfig: (config: SideConfig) => void;
    targetConfig: SideConfig;
    setTargetConfig: (config: SideConfig) => void;
    primaryKeys: CompareKey[];
    setPrimaryKeys: (keys: CompareKey[]) => void;
    filterCondition: string;
    setFilterCondition: (filter: string) => void;
    editingConfigId: string | null;
    sourceDbs: string[];
    targetDbs: string[];
    filteredSourceTables: TableInfo[];
    filteredTargetTables: TableInfo[];
    sourceTableSearch: string;
    setSourceTableSearch: (search: string) => void;
    targetTableSearch: string;
    setTargetTableSearch: (search: string) => void;
    onSave: () => void;
    onBack: () => void;
    onCompare: () => void;
    isLoading: boolean;
}

/**
 * 配置编辑器组件
 * 用于创建和编辑数据对比配置
 */
export const ConfigEditor: React.FC<ConfigEditorProps> = ({
    lang,
    connections,
    configName,
    setConfigName,
    sourceConfig,
    setSourceConfig,
    targetConfig,
    setTargetConfig,
    primaryKeys,
    setPrimaryKeys,
    filterCondition,
    setFilterCondition,
    editingConfigId,
    sourceDbs,
    targetDbs,
    filteredSourceTables,
    filteredTargetTables,
    sourceTableSearch,
    setSourceTableSearch,
    targetTableSearch,
    setTargetTableSearch,
    onSave,
    onBack,
    onCompare,
    isLoading
}) => {
    const t = getTexts(lang);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);

    // 加载列信息
    useEffect(() => {
        const fetchColumns = async () => {
            if (sourceConfig.connId && sourceConfig.db && sourceConfig.table) {
                const conn = connections.find(c => c.id === sourceConfig.connId);
                if (!conn) return;

                const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
                try {
                    const detail = await invoke<TableDetail>('db_get_table_schema', {
                        id: connStr,
                        db: sourceConfig.db,
                        table: sourceConfig.table
                    });
                    setAvailableColumns(detail.columns.map(c => c.name));

                    // Auto-detect PK
                    const pk = detail.columns.find(c => c.isPrimaryKey);
                    if (pk && primaryKeys.length === 0) {
                        setPrimaryKeys([{ field: pk.name, order: 'ASC' }]);
                    }
                } catch (e) {
                    console.error('Failed to fetch columns:', e);
                }
            }
        };
        fetchColumns();
    }, [sourceConfig.table]);

    const addKey = () => {
        if (primaryKeys.length < 4) {
            setPrimaryKeys([...primaryKeys, { field: '', order: 'ASC' }]);
        }
    };

    const updateKey = (index: number, field: keyof CompareKey, value: any) => {
        const newKeys = [...primaryKeys];
        newKeys[index] = { ...newKeys[index], [field]: value };
        setPrimaryKeys(newKeys);
    };

    const removeKey = (index: number) => {
        setPrimaryKeys(primaryKeys.filter((_, i) => i !== index));
    };

    return (
        <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg mr-2">
                        <ChevronLeft size={20} />
                    </button>
                    <GitCompare className="mr-3 text-indigo-600" size={24} />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {editingConfigId ? (lang === 'zh' ? '编辑对比' : 'Edit Compare') : (lang === 'zh' ? '新建对比' : 'New Compare')}
                    </h2>
                </div>
                <button
                    onClick={onSave}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                    {lang === 'zh' ? '保存配置' : 'Save Config'}
                </button>
            </div>

            {/* Config Name */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-bold text-slate-400 uppercase mb-2">{lang === 'zh' ? '配置名称' : 'Config Name'}</label>
                <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder={lang === 'zh' ? '输入配置名称...' : 'Enter config name...'}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                />
            </div>

            {/* Source & Target Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 z-10 items-center justify-center text-slate-400 shadow-sm">
                    <ArrowRight size={20} />
                </div>

                {/* Source */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-blue-500 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
                        <Database className="mr-2 text-blue-500" size={18} /> {t.dataCompare.sourceSide}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectConn}</label>
                            <select
                                value={sourceConfig.connId}
                                onChange={e => setSourceConfig({ ...sourceConfig, connId: e.target.value })}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white truncate"
                            >
                                <option value="">-- Select --</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectDb}</label>
                            <select
                                value={sourceConfig.db}
                                onChange={e => setSourceConfig({ ...sourceConfig, db: e.target.value })}
                                disabled={!sourceConfig.connId}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate"
                            >
                                <option value="">-- DB --</option>
                                {sourceDbs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectTable}</label>
                            <div className="relative mb-2">
                                <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={lang === 'zh' ? '搜索表...' : 'Search...'}
                                    value={sourceTableSearch}
                                    onChange={(e) => setSourceTableSearch(e.target.value)}
                                    disabled={!sourceConfig.db}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none disabled:opacity-50"
                                />
                            </div>
                            <select
                                value={sourceConfig.table}
                                onChange={e => setSourceConfig({ ...sourceConfig, table: e.target.value })}
                                disabled={!sourceConfig.db}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate"
                            >
                                <option value="">-- Table --</option>
                                {filteredSourceTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Target */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-green-500 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
                        <Database className="mr-2 text-green-500" size={18} /> {t.dataCompare.targetSide}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectConn}</label>
                            <select
                                value={targetConfig.connId}
                                onChange={e => setTargetConfig({ ...targetConfig, connId: e.target.value })}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white truncate"
                            >
                                <option value="">-- Select --</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectDb}</label>
                            <select
                                value={targetConfig.db}
                                onChange={e => setTargetConfig({ ...targetConfig, db: e.target.value })}
                                disabled={!targetConfig.connId}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate"
                            >
                                <option value="">-- DB --</option>
                                {targetDbs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectTable}</label>
                            <div className="relative mb-2">
                                <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={lang === 'zh' ? '搜索表...' : 'Search...'}
                                    value={targetTableSearch}
                                    onChange={(e) => setTargetTableSearch(e.target.value)}
                                    disabled={!targetConfig.db}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none disabled:opacity-50"
                                />
                            </div>
                            <select
                                value={targetConfig.table}
                                onChange={e => setTargetConfig({ ...targetConfig, table: e.target.value })}
                                disabled={!targetConfig.db}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate"
                            >
                                <option value="">-- Table --</option>
                                {filteredTargetTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rules */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center mb-4">
                    <Filter className="mr-2 text-indigo-500" size={20} />
                    <h3 className="font-bold text-slate-800 dark:text-white">{t.dataCompare.configTitle}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Keys */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">{t.dataCompare.primaryKeys}</label>
                            <button onClick={addKey} disabled={primaryKeys.length >= 4} className="text-xs text-blue-500 hover:underline flex items-center disabled:opacity-50">
                                <Plus size={12} className="mr-1" /> {t.dataCompare.addKey}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {primaryKeys.map((key, idx) => (
                                <div key={idx} className="flex space-x-2">
                                    <select
                                        value={key.field}
                                        onChange={e => updateKey(idx, 'field', e.target.value)}
                                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                                    >
                                        <option value="">Column...</option>
                                        {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button
                                        onClick={() => updateKey(idx, 'order', key.order === 'ASC' ? 'DESC' : 'ASC')}
                                        className="px-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {key.order === 'ASC' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                                    </button>
                                    <button onClick={() => removeKey(idx)} className="p-2 text-slate-400 hover:text-red-500"><X size={16} /></button>
                                </div>
                            ))}
                            {primaryKeys.length === 0 && <div className="text-sm text-slate-400 italic p-2">Please add at least one key.</div>}
                        </div>
                    </div>

                    {/* Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t.dataCompare.filter}</label>
                        <textarea
                            rows={4}
                            value={filterCondition}
                            onChange={e => setFilterCondition(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white font-mono resize-none"
                            placeholder={t.dataCompare.filterPlaceholder}
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onCompare}
                        disabled={isLoading}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg flex items-center transition-all disabled:opacity-70"
                    >
                        {isLoading ? <RefreshCw className="animate-spin mr-2" size={20} /> : <Play className="mr-2" size={20} />}
                        {t.dataCompare.startCompare}
                    </button>
                </div>
            </div>
        </div>
    );
};
