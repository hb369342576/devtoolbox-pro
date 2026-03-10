import React from 'react';
import { DbConnection, JobConfig, TableInfo } from '../../../types';
import { Database, Search, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PanelProps {
  type: 'source' | 'sink';
  activeJob: any;
  connections: DbConnection[];
  dbs: string[];
  tables: TableInfo[];
  tableSearch: string;
  setTableSearch: (val: string) => void;
  isLoadingDbs: boolean;
  isLoadingTables: boolean;
  onSelectConn: (id: string, type: 'source' | 'sink') => void;
  onChangeDb: (db: string, type: 'source' | 'sink') => void;
  onSelectTable: (table: string, type: 'source' | 'sink') => void;
}

export const SourceSinkPanel: React.FC<PanelProps> = ({
  type, activeJob, connections, dbs, tables, tableSearch, setTableSearch,
  isLoadingDbs, isLoadingTables, onSelectConn, onChangeDb, onSelectTable
}) => {
  const { t } = useTranslation();
  const jobConfig = activeJob[type] as JobConfig;
  const isSource = type === 'source';
  
  const headerBgClass = isSource ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-green-50 dark:bg-green-900/10';
  const headerTextClass = isSource ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300';
  const focusBorderClass = isSource ? 'focus:border-blue-500' : 'focus:border-green-500';
  const dotClass = isSource ? 'bg-blue-500' : 'bg-green-500';
  const activeItemClass = isSource ? 'bg-blue-600 text-white' : 'bg-green-600 text-white';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm">
      <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center ${headerBgClass}`}>
        <span className={`font-bold flex items-center ${headerTextClass}`}>
          <Database size={16} className="mr-2" /> {isSource ? 'Source' : 'Sink'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 h-[210px]">
        {/* Left: Connection & DB Select */}
        <div className="p-5 flex flex-col space-y-6 bg-slate-50/50 dark:bg-slate-900/20">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">数据源连接</label>
            <select
              value={connections.find(c => c.host === jobConfig.host && c.port === jobConfig.port && c.name === jobConfig.name)?.id || ''}
              onChange={(e) => onSelectConn(e.target.value, type)}
              className={`w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none ${focusBorderClass} dark:text-white`}
            >
              <option value="" disabled>-- 选择数据源 --</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name} ({conn.type})</option>
              ))}
            </select>
            {jobConfig.host && (
              <div className="mt-2 text-xs text-slate-400 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${dotClass}`}></div>
                {jobConfig.type} - {jobConfig.host}:{jobConfig.port}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">数据库</label>
            <select
              value={jobConfig.database || ''}
              onChange={(e) => onChangeDb(e.target.value, type)}
              disabled={!jobConfig.host || isLoadingDbs}
              className={`w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none ${focusBorderClass} dark:text-white disabled:opacity-50`}
            >
              <option value="">-- 选择数据库 --</option>
              {dbs.map(db => (
                <option key={db} value={db}>{db}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Table List */}
        <div className="p-4 flex flex-col h-full min-h-0">
          {jobConfig.database ? (
            <>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">选择数据表</label>
              <div className="relative mb-3 flex-shrink-0">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索表..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none ${focusBorderClass} transition-colors`}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-900/30">
                {isLoadingTables ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">加载中...</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tables
                      .filter(tq => tq.name.toLowerCase().includes(tableSearch.toLowerCase()))
                      .map(tq => (
                        <button
                          key={tq.name}
                          onClick={() => onSelectTable(tq.name, type)}
                          className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between group transition-colors ${jobConfig.table === tq.name
                            ? activeItemClass
                            : 'hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          <span className="font-mono">{tq.name}</span>
                          {jobConfig.table === tq.name && <Check size={14} className="text-white" />}
                        </button>
                      ))}
                    {tables.length === 0 && <div className="p-4 text-center text-xs text-slate-400">{t('common.noData')}</div>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Database size={32} className="mb-2 opacity-20" />
              <span className="text-xs">请先在左侧选择数据库</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
