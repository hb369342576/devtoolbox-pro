import React from 'react';
import { Play, RefreshCw, Settings, ArrowRight, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { DbConnection } from '../../../types';
import { ColumnMapping } from '../types';

interface ConfigMappingPanelProps {
    connections: DbConnection[];
    selectedConnId: string;
    setSelectedConnId: (v: string) => void;
    dbs: string[];
    selectedDb: string;
    setSelectedDb: (v: string) => void;
    tables: string[];
    selectedTable: string;
    setSelectedTable: (v: string) => void;
    handleGenerate: () => void;
    selectedSheet: string | null;
    isLoadingColumns: boolean;
    tableSchema: { name: string, type: string, comment?: string, pk?: boolean }[];
    mappings: ColumnMapping[];
    setMappings: (m: ColumnMapping[]) => void;
    sheetHeaders: string[];
    splitHeight: number;
    isResizing: React.MutableRefObject<boolean>;
    generatedSql: string;
}

export const ConfigMappingPanel: React.FC<ConfigMappingPanelProps> = ({
    connections, selectedConnId, setSelectedConnId,
    dbs, selectedDb, setSelectedDb,
    tables, selectedTable, setSelectedTable,
    handleGenerate, selectedSheet,
    isLoadingColumns, tableSchema, mappings, setMappings, sheetHeaders,
    splitHeight, isResizing, generatedSql
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    return (
        <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-[500px]">
            {/* Top Config */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.selectConnection', { defaultValue: '选择连接' })}</label>
                        <select
                            value={selectedConnId}
                            onChange={e => setSelectedConnId(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="" className="text-slate-400">{t('excel_import.placeholderSelectConnection', { defaultValue: '选择目标连接' })}</option>
                            {connections.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800">{c.name} ({c.type})</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.selectDb', { defaultValue: '选择数据库' })}</label>
                        <select
                            value={selectedDb}
                            onChange={e => setSelectedDb(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                            disabled={!selectedConnId}
                        >
                            <option value="" className="text-slate-400">{t('excel_import.placeholderSelectDatabase', { defaultValue: '选择目标数据库' })}</option>
                            {dbs.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800">{d}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.selectTable', { defaultValue: '选择表' })}</label>
                        <select
                            value={selectedTable}
                            onChange={e => setSelectedTable(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                            disabled={!selectedDb}
                        >
                            <option value="" className="text-slate-400">{t('excel_import.placeholderSelectTable', { defaultValue: '选择目标表' })}</option>
                            {tables.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-800">{t}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedTable || !selectedSheet}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        <Play size={16} className="mr-2" />
                        {t('common.generate', { defaultValue: '生成' })}
                    </button>
                </div>
            </div>

            {/* Middle Mappings */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{t('excel_import.title', { defaultValue: 'Excel 导入配置' })}</span>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {isLoadingColumns ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <RefreshCw className="w-10 h-10 mb-2 animate-spin opacity-20" />
                            <p>{t('common.loading', { defaultValue: '加载中...' })}</p>
                        </div>
                    ) : tableSchema.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Settings className="w-10 h-10 mb-2 opacity-20" />
                            <p>{t('excel_import.selectTargetTableFirst', { defaultValue: '请先选择目标表' })}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-x-4 gap-y-2 items-center text-sm min-w-[500px]">
                            <div className="col-span-4 font-bold text-slate-500 text-[10px] uppercase mb-2">{t('excel_import.targetCol', { defaultValue: '目标列 (数据库)' })}</div>
                            <div className="col-span-1 text-center font-bold text-slate-500 text-[10px] uppercase mb-2">{t('excel_import.arrow', { defaultValue: '映射' })}</div>
                            <div className="col-span-4 font-bold text-slate-500 text-[10px] uppercase mb-2">{t('excel_import.sourceHeader', { defaultValue: '源表头 (Excel)' })}</div>
                            <div className="col-span-3 font-bold text-slate-500 text-[10px] uppercase mb-2">{t('excel_import.defaultValue', { defaultValue: '固定/默认值' })}</div>

                            {mappings.map((m, idx) => (
                                <React.Fragment key={m.dbColumn}>
                                    <div className="col-span-4 flex items-center">
                                        <span className={`font-mono mr-2 truncate ${m.isPk ? 'text-blue-600 font-bold underline' : 'text-slate-700 dark:text-slate-300'}`} title={m.comment}>{m.dbColumn}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">{m.dbType}</span>
                                    </div>
                                    <div className="col-span-1 flex justify-center text-slate-300">
                                        <ArrowRight size={14} />
                                    </div>
                                    <div className="col-span-4">
                                        <select
                                            value={m.excelHeader}
                                            onChange={e => {
                                                const newMappings = [...mappings];
                                                newMappings[idx].excelHeader = e.target.value;
                                                newMappings[idx].customValue = '';
                                                setMappings(newMappings);
                                            }}
                                            className={`w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded text-xs text-slate-800 dark:text-white outline-none ${m.excelHeader ? 'border-green-300 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <option value="">{t('excel_import.ignore', { defaultValue: '忽略' })}</option>
                                            {sheetHeaders.map(h => <option key={h} value={h} className="bg-white dark:bg-slate-800">{h}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            placeholder="Fixed Val"
                                            value={m.customValue || ''}
                                            onChange={e => {
                                                const newMappings = [...mappings];
                                                newMappings[idx].customValue = e.target.value;
                                                newMappings[idx].excelHeader = '';
                                                setMappings(newMappings);
                                            }}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/30"
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resizer */}
                <div
                    onMouseDown={() => { isResizing.current = true; }}
                    className="h-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-ns-resize transition-colors"
                />

                {/* Bottom: SQL Preview */}
                <div style={{ height: splitHeight }} className="bg-slate-900 flex flex-col shrink-0 overflow-hidden relative group">
                    <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                        <span className="font-bold text-[10px] text-slate-500 uppercase">{t('excel_import.sqlPreview', { defaultValue: 'SQL 预览' })}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generatedSql);
                                toast({ title: t('common.copied', { defaultValue: '已复制' }) });
                            }}
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center bg-blue-900/20 px-2 py-0.5 rounded transition-colors"
                            disabled={!generatedSql}
                        >
                            <Save size={10} className="mr-1" /> Copy
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-3 text-green-400 font-mono text-xs whitespace-pre-wrap select-text custom-scrollbar">
                        {generatedSql || '// generated sql result here...'}
                    </div>
                </div>
            </div>
        </div>
    );
};
