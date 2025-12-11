import React, { useState, useEffect } from 'react';
import {
   GitCompare, ArrowRight, Database, ChevronRight,
   Key, Filter, SortAsc, SortDesc, Play, CheckCircle,
   AlertCircle, ChevronLeft, Plus, X, RefreshCw
} from 'lucide-react';
import { Language, DbConnection, CompareConfig, CompareKey, CompareResultRow, TableInfo, TableDetail } from '../types';
import { getTexts } from '../locales';
import { invoke } from '@tauri-apps/api/core';

/* --- Helper Types --- */
interface SideConfig {
   connId: string;
   db: string;
   table: string;
}

export const DataCompareTool: React.FC<{
   lang: Language;
   connections?: DbConnection[];
}> = ({ lang, connections = [] }) => {
   const t = getTexts(lang);

   // --- View State ---
   const [viewMode, setViewMode] = useState<'config' | 'result'>('config');
   const [isLoading, setIsLoading] = useState(false);

   // --- Configuration State ---
   const [sourceConfig, setSourceConfig] = useState<SideConfig>({ connId: '', db: '', table: '' });
   const [targetConfig, setTargetConfig] = useState<SideConfig>({ connId: '', db: '', table: '' });

   // Lists for Dropdowns
   const [sourceDbs, setSourceDbs] = useState<string[]>([]);
   const [targetDbs, setTargetDbs] = useState<string[]>([]);
   const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
   const [targetTables, setTargetTables] = useState<TableInfo[]>([]);

   // Rules
   const [primaryKeys, setPrimaryKeys] = useState<CompareKey[]>([]);
   const [availableColumns, setAvailableColumns] = useState<string[]>([]); // Derived from source table
   const [filterCondition, setFilterCondition] = useState('');

   // --- Result State ---
   const [results, setResults] = useState<CompareResultRow[]>([]);
   const [stats, setStats] = useState({ match: 0, diff: 0, sourceOnly: 0, targetOnly: 0 });

   // --- Effects: Load DBs when Connection Changes ---
   useEffect(() => {
      if (sourceConfig.connId) fetchDatabases(sourceConfig.connId, 'source');
   }, [sourceConfig.connId]);

   useEffect(() => {
      if (targetConfig.connId) fetchDatabases(targetConfig.connId, 'target');
   }, [targetConfig.connId]);

   // --- Effects: Load Tables when DB Changes ---
   useEffect(() => {
      if (sourceConfig.connId && sourceConfig.db) fetchTables(sourceConfig.connId, sourceConfig.db, 'source');
   }, [sourceConfig.db]);

   useEffect(() => {
      if (targetConfig.connId && targetConfig.db) fetchTables(targetConfig.connId, targetConfig.db, 'target');
   }, [targetConfig.db]);

   // --- Effects: Load Columns when Source Table Selected ---
   useEffect(() => {
      if (sourceConfig.connId && sourceConfig.db && sourceConfig.table) {
         fetchColumns(sourceConfig.connId, sourceConfig.db, sourceConfig.table);
      }
   }, [sourceConfig.table]);

   // --- Data Fetching Helpers ---
   const fetchDatabases = async (connId: string, side: 'source' | 'target') => {
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
      try {
         const dbs = await invoke<string[]>('db_get_databases', { id: connStr });
         side === 'source' ? setSourceDbs(dbs) : setTargetDbs(dbs);
      } catch (e) {
         console.error('Failed to fetch databases:', e);
      }
   };

   const fetchTables = async (connId: string, db: string, side: 'source' | 'target') => {
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
      try {
         const tables = await invoke<TableInfo[]>('db_get_tables', { id: connStr, db });
         side === 'source' ? setSourceTables(tables) : setTargetTables(tables);
      } catch (e) {
         console.error('Failed to fetch tables:', e);
      }
   };

   const fetchColumns = async (connId: string, db: string, table: string) => {
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
      try {
         const detail = await invoke<TableDetail>('db_get_table_schema', { id: connStr, db, table });
         setAvailableColumns(detail.columns.map(c => c.name));
         // Auto-detect PK
         const pk = detail.columns.find(c => c.isPrimaryKey);
         if (pk && primaryKeys.length === 0) {
            setPrimaryKeys([{ field: pk.name, order: 'ASC' }]);
         }
      } catch (e) {
         console.error('Failed to fetch columns:', e);
      }
   };

   // --- Key Management ---
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

   // --- Comparison Logic ---
   const handleCompare = () => {
      if (!sourceConfig.table || !targetConfig.table || primaryKeys.length === 0 || !primaryKeys[0].field) {
         alert(lang === 'zh' ? '请完善配置' : 'Please complete configuration');
         return;
      }

      setIsLoading(true);

      // Simulate Comparison Process
      setTimeout(() => {
         const mockResults: CompareResultRow[] = [];
         // Generate 20 rows
         for (let i = 1; i <= 20; i++) {
            const r = Math.random();
            const pk = `100${i}`;
            if (r > 0.8) {
               // Mismatch
               mockResults.push({
                  keyDisplay: pk,
                  status: 'diff',
                  sourceData: { id: pk, username: `User_${i}`, status: 1 },
                  targetData: { id: pk, username: `User_${i}_Modified`, status: 1 },
                  diffFields: ['username']
               });
            } else if (r > 0.7) {
               // Source Only
               mockResults.push({
                  keyDisplay: pk,
                  status: 'only_source',
                  sourceData: { id: pk, username: `User_${i}`, status: 1 },
                  targetData: null,
                  diffFields: []
               });
            } else if (r > 0.6) {
               // Target Only
               mockResults.push({
                  keyDisplay: pk,
                  status: 'only_target',
                  sourceData: null,
                  targetData: { id: pk, username: `User_${i}`, status: 0 },
                  diffFields: []
               });
            } else {
               // Match
               mockResults.push({
                  keyDisplay: pk,
                  status: 'match',
                  sourceData: { id: pk, username: `User_${i}`, status: 1 },
                  targetData: { id: pk, username: `User_${i}`, status: 1 },
                  diffFields: []
               });
            }
         }

         setResults(mockResults);
         setStats({
            match: mockResults.filter(r => r.status === 'match').length,
            diff: mockResults.filter(r => r.status === 'diff').length,
            sourceOnly: mockResults.filter(r => r.status === 'only_source').length,
            targetOnly: mockResults.filter(r => r.status === 'only_target').length,
         });

         setIsLoading(false);
         setViewMode('result');
      }, 1500);
   };

   // --- Render Config View ---
   if (viewMode === 'config') {
      return (
         <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center mb-2">
               <GitCompare className="mr-3 text-indigo-600" size={24} />
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.dataCompare.title}</h2>
            </div>

            {/* Top: Source & Target Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
               {/* Center Arrow */}
               <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 z-10 items-center justify-center text-slate-400 shadow-sm">
                  <ArrowRight size={20} />
               </div>

               {/* Source */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-blue-500 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
                     <Database className="mr-2 text-blue-500" size={18} /> {t.dataCompare.sourceSide}
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectConn}</label>
                        <select
                           value={sourceConfig.connId}
                           onChange={e => setSourceConfig({ ...sourceConfig, connId: e.target.value })}
                           className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                        >
                           <option value="">-- Select --</option>
                           {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectDb}</label>
                           <select
                              value={sourceConfig.db}
                              onChange={e => setSourceConfig({ ...sourceConfig, db: e.target.value })}
                              disabled={!sourceConfig.connId}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                           >
                              <option value="">-- DB --</option>
                              {sourceDbs.map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectTable}</label>
                           <select
                              value={sourceConfig.table}
                              onChange={e => setSourceConfig({ ...sourceConfig, table: e.target.value })}
                              disabled={!sourceConfig.db}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                           >
                              <option value="">-- Table --</option>
                              {sourceTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Target */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-green-500 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
                     <Database className="mr-2 text-green-500" size={18} /> {t.dataCompare.targetSide}
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectConn}</label>
                        <select
                           value={targetConfig.connId}
                           onChange={e => setTargetConfig({ ...targetConfig, connId: e.target.value })}
                           className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white"
                        >
                           <option value="">-- Select --</option>
                           {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectDb}</label>
                           <select
                              value={targetConfig.db}
                              onChange={e => setTargetConfig({ ...targetConfig, db: e.target.value })}
                              disabled={!targetConfig.connId}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                           >
                              <option value="">-- DB --</option>
                              {targetDbs.map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.dataCompare.selectTable}</label>
                           <select
                              value={targetConfig.table}
                              onChange={e => setTargetConfig({ ...targetConfig, table: e.target.value })}
                              disabled={!targetConfig.db}
                              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                           >
                              <option value="">-- Table --</option>
                              {targetTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Bottom: Rules */}
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

                  {/* Common Filter */}
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
                     onClick={handleCompare}
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
   }

   // --- Render Result View ---
   return (
      <div className="h-full flex flex-col">
         {/* Header */}
         <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-4">
               <button onClick={() => setViewMode('config')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.dataCompare.step2}</h2>
               <div className="flex space-x-2 text-xs font-medium">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center"><CheckCircle size={12} className="mr-1" /> {stats.match} {t.dataCompare.statMatch}</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center"><AlertCircle size={12} className="mr-1" /> {stats.diff} {t.dataCompare.statDiff}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{stats.sourceOnly} {t.dataCompare.statSourceOnly}</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">{stats.targetOnly} {t.dataCompare.statTargetOnly}</span>
               </div>
            </div>
         </div>

         {/* Result Table */}
         <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                     <tr>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b dark:border-slate-700">{t.dataCompare.rowStatus}</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b dark:border-slate-700">{t.dataCompare.keyVal} ({primaryKeys.map(k => k.field).join(',')})</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b dark:border-slate-700 w-1/3">{t.dataCompare.sourceSide}</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b dark:border-slate-700 w-1/3">{t.dataCompare.targetSide}</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm font-mono">
                     {results.map((row, idx) => (
                        <tr key={idx} className={`border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${row.status === 'diff' ? 'bg-red-50/50 dark:bg-red-900/10' :
                           row.status === 'only_source' ? 'bg-blue-50/50 dark:bg-blue-900/10' :
                              row.status === 'only_target' ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                           }`}>
                           <td className="p-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${row.status === 'match' ? 'bg-green-100 text-green-700' :
                                 row.status === 'diff' ? 'bg-red-100 text-red-700' :
                                    row.status === 'only_source' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                 }`}>
                                 {row.status}
                              </span>
                           </td>
                           <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{row.keyDisplay}</td>
                           <td className="p-3">
                              {row.sourceData ? (
                                 <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                                    {JSON.stringify(row.sourceData, null, 2)}
                                 </pre>
                              ) : <span className="text-slate-300 italic">NULL</span>}
                           </td>
                           <td className="p-3">
                              {row.targetData ? (
                                 <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                                    {Object.entries(row.targetData).map(([k, v]) => (
                                       <span key={k} className={row.diffFields.includes(k) ? 'bg-yellow-200 dark:bg-yellow-900/50 text-slate-900 dark:text-white font-bold' : ''}>
                                          {`"${k}": ${JSON.stringify(v)}\n`}
                                       </span>
                                    ))}
                                 </pre>
                              ) : <span className="text-slate-300 italic">NULL</span>}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};