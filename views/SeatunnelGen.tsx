import React, { useState } from 'react';
import { Language, DbConnection, ScriptJob, JobConfig } from '../types';
import {
  Workflow, Plus, Trash2, ChevronLeft, Save, X,
  LayoutGrid, List, ArrowRight, Database, Play, Settings, Plug, Search
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { TableInfo } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

// 数据源选择弹窗
const DataSourceSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  connections: DbConnection[];
  onSelect: (conn: DbConnection) => void;
  onNavigate: (id: string) => void;
  lang: Language;
}> = ({ isOpen, onClose, connections, onSelect, onNavigate, lang }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white">{lang === 'zh' ? '选择数据源' : 'Select Data Source'}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center mb-3">
                <Database className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm mb-4">{lang === 'zh' ? '暂无可用数据源' : 'No data sources found'}</p>
              <button
                onClick={() => { onClose(); onNavigate('data-source-manager'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
              >
                {lang === 'zh' ? '去添加数据源' : 'Add Data Source'}
              </button>
            </div>
          ) : (
            connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => { onSelect(conn); onClose(); }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400`}>
                      <Database size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{conn.name}</p>
                      <p className="text-xs text-slate-500">{conn.type} &bull; {conn.host}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const SeatunnelGen: React.FC<{
  lang: Language;
  connections: DbConnection[];
  onNavigate: (id: string) => void;
}> = ({ lang, connections, onNavigate }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 模拟持久化存储 Jobs
  const [jobs, setJobs] = useState<ScriptJob[]>(() => {
    const saved = localStorage.getItem('seatunnel_jobs');
    return saved ? JSON.parse(saved) : [];
  });

  const saveJobs = (newJobs: ScriptJob[]) => {
    setJobs(newJobs);
    localStorage.setItem('seatunnel_jobs', JSON.stringify(newJobs));
  };

  const [activeJob, setActiveJob] = useState<ScriptJob | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'source' | 'sink' | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 新增：数据库和表状态
  const [sourceDbs, setSourceDbs] = useState<string[]>([]);
  const [sinkDbs, setSinkDbs] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
  const [sinkTables, setSinkTables] = useState<TableInfo[]>([]);
  const [sourceTableSearch, setSourceTableSearch] = useState('');
  const [sinkTableSearch, setSinkTableSearch] = useState('');
  const [isLoadingDbs, setIsLoadingDbs] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  // 删除确认状态
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; jobId: string }>({ isOpen: false, jobId: '' });

  const handleCreateJob = () => {
    const newJob: ScriptJob = {
      id: Date.now().toString(),
      name: lang === 'zh' ? '新同步任务' : 'New Sync Job',
      scriptType: 'seatunnel',
      source: {} as JobConfig,
      sink: {} as JobConfig,
      createdAt: Date.now()
    };
    saveJobs([newJob, ...jobs]);
    setActiveJob(newJob);
    setGeneratedConfig('');
  };

  const handleDeleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ isOpen: true, jobId: id });
  };

  const confirmDeleteJob = () => {
    saveJobs(jobs.filter(j => j.id !== confirmDelete.jobId));
    if (activeJob?.id === confirmDelete.jobId) setActiveJob(null);
    setConfirmDelete({ isOpen: false, jobId: '' });
  };

  const handleSelectDataSource = async (conn: DbConnection) => {
    if (activeJob && selectingFor) {
      const jobConfig: JobConfig = {
        type: conn.type,
        host: conn.host,
        port: conn.port,
        user: conn.user,
        password: conn.password,
        database: conn.defaultDatabase || '',
        table: ''
      };

      const updatedJob = { ...activeJob, [selectingFor]: jobConfig };
      setActiveJob(updatedJob);
      saveJobs(jobs.map(j => j.id === activeJob.id ? updatedJob : j));

      // 加载数据库列表
      await loadDatabases(conn, selectingFor);
    }
    setShowSelector(false);
    setSelectingFor(null);
  };

  // 加载数据库列表
  const loadDatabases = async (conn: DbConnection, side: 'source' | 'sink') => {
    setIsLoadingDbs(true);
    try {
      let dbs: string[] = [];
      if (isTauri) {
        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        dbs = await invoke('db_get_databases', { id: connStr });
      } else {
        dbs = ['demo_db_1', 'demo_db_2', 'test_schema'];
      }
      if (side === 'source') setSourceDbs(dbs);
      else setSinkDbs(dbs);
    } catch (e) {
      console.error('Failed to load databases:', e);
      if (side === 'source') setSourceDbs([]);
      else setSinkDbs([]);
    }
    setIsLoadingDbs(false);
  };

  // 加载表列表
  const loadTables = async (conn: JobConfig, dbName: string, side: 'source' | 'sink') => {
    setIsLoadingTables(true);
    try {
      let tables: TableInfo[] = [];
      if (isTauri) {
        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        tables = await invoke('db_get_tables', { id: connStr, db: dbName });
      } else {
        tables = [{ name: 'table_1', rows: 100, size: '1KB' }, { name: 'table_2', rows: 200, size: '2KB' }];
      }
      if (side === 'source') setSourceTables(tables);
      else setSinkTables(tables);
    } catch (e) {
      console.error('Failed to load tables:', e);
      if (side === 'source') setSourceTables([]);
      else setSinkTables([]);
    }
    setIsLoadingTables(false);
  };

  const updateJobDetails = (part: 'source' | 'sink', key: keyof JobConfig, value: string) => {
    if (activeJob) {
      const updatedJob = {
        ...activeJob,
        [part]: { ...activeJob[part], [key]: value }
      };
      setActiveJob(updatedJob);
      saveJobs(jobs.map(j => j.id === activeJob.id ? updatedJob : j));
    }
  };

  const handleGenerateConfig = async () => {
    if (!activeJob) return;

    // 验证必要字段
    if (!activeJob.source.host || !activeJob.source.table || !activeJob.sink.host || !activeJob.sink.table) {
      alert(lang === 'zh' ? '请先完整配置源端和目标端信息' : 'Please configure both source and sink');
      return;
    }

    setIsGenerating(true);
    try {
      // Reliable check for Tauri v2
      const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

      if (isTauri) {
        const config = await invoke('generate_seatunnel_config', {
          source: activeJob.source,
          sink: activeJob.sink
        }) as string;
        setGeneratedConfig(config);
      } else {
        // Fallback for browser mode
        const config = `env {
  execution.parallelism = 1
  job.mode = "BATCH"
}

source {
  Jdbc {
    url = "jdbc:mysql://${activeJob.source.host}:${activeJob.source.port}/${activeJob.source.database}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${activeJob.source.user}"
    password = "${activeJob.source.password || ''}"
    query = "select * from ${activeJob.source.table}"
  }
}

sink {
  ${activeJob.sink.type === 'doris' ? 'Doris' : 'Jdbc'} {
    ${activeJob.sink.type === 'doris'
            ? `fenodes = "${activeJob.sink.host}:${activeJob.sink.port}"
    username = "${activeJob.sink.user}"
    password = "${activeJob.sink.password || ''}"
    table.identifier = "${activeJob.sink.database}.${activeJob.sink.table}"
    sink.enable-2pc = "true"
    sink.label-prefix = "label_seatunnel"`
            : `url = "jdbc:mysql://${activeJob.sink.host}:${activeJob.sink.port}/${activeJob.sink.database}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${activeJob.sink.user}"
    password = "${activeJob.sink.password || ''}"
    table = "${activeJob.sink.database}.${activeJob.sink.table}"`}
  }
}`;
        setGeneratedConfig(config);
      }
    } catch (error) {
      alert(lang === 'zh' ? '生成配置失败' : 'Failed to generate configuration');
      console.error('Generate config error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LIST VIEW ---
  if (!activeJob) {
    return (
      <div className="h-full flex flex-col">
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
          message={lang === 'zh' ? '确定要删除这个同步任务吗？' : 'Are you sure you want to delete this sync job?'}
          confirmText={lang === 'zh' ? '删除' : 'Delete'}
          cancelText={lang === 'zh' ? '取消' : 'Cancel'}
          onConfirm={confirmDeleteJob}
          onCancel={() => setConfirmDelete({ isOpen: false, jobId: '' })}
          type="danger"
        />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
            <Workflow className="mr-3 text-purple-600" />
            {lang === 'zh' ? '任务脚本生成器' : 'Script Generator'}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <List size={16} />
              </button>
            </div>
            <button onClick={handleCreateJob} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors">
              <Plus size={18} className="mr-2" />
              {lang === 'zh' ? '新建任务' : 'New Job'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => setActiveJob(job)}
                  className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <Workflow size={24} />
                    </div>
                    <button onClick={(e) => handleDeleteJob(job.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10 opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 truncate">{job.name}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="font-bold uppercase truncate max-w-[45%]">{job.source.type || '?'}</span>
                    <ArrowRight size={12} className="text-slate-300" />
                    <span className="font-bold uppercase truncate max-w-[45%]">{job.sink.type || '?'}</span>
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400 text-right">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}

              <button onClick={handleCreateJob} className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-purple-500 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[180px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><Plus size={24} /></div>
                <span className="font-medium">{lang === 'zh' ? '创建新脚本任务' : 'Create New Job'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <div className="col-span-4">Job Name</div>
                <div className="col-span-4">Source &rarr; Sink</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => setActiveJob(job)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex-shrink-0">
                        <Workflow size={16} />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white truncate">{job.name}</span>
                    </div>
                    <div className="col-span-4 text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex items-center">
                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{job.source.type || 'Source'}</span>
                      <ArrowRight size={10} className="mx-2 text-slate-300" />
                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{job.sink.type || 'Sink'}</span>
                    </div>
                    <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={(e) => handleDeleteJob(job.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{lang === 'zh' ? '暂无任务' : 'No jobs found'}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <div className="flex flex-col h-full gap-4">
      <DataSourceSelectorModal
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        connections={connections}
        onSelect={handleSelectDataSource}
        onNavigate={onNavigate}
        lang={lang}
      />

      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <button onClick={() => setActiveJob(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <input
            value={activeJob.name}
            onChange={e => {
              const newName = e.target.value;
              setActiveJob({ ...activeJob, name: newName });
              saveJobs(jobs.map(j => j.id === activeJob.id ? { ...j, name: newName } : j));
            }}
            className="font-bold text-lg text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateConfig}
            disabled={isGenerating || !activeJob.source.host || !activeJob.sink.host}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium flex items-center shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} className="mr-2" />
            {isGenerating ? (lang === 'zh' ? '生成中...' : 'Generating...') : (lang === 'zh' ? '生成预览' : 'Generate')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {/* Source Config Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/10">
              <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center"><Database size={16} className="mr-2" /> Source</span>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {activeJob.source.host ? (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-slate-400 uppercase font-bold">数据源连接</div>
                    </div>
                    <div className="font-bold text-sm dark:text-white flex items-center mb-1">
                      <Database size={16} className="mr-2 text-blue-600" />
                      {activeJob.source.type}
                    </div>
                    <div className="text-xs text-slate-500 ml-6">{activeJob.source.host}:{activeJob.source.port}</div>
                  </div>
                  <button
                    onClick={() => { setShowSelector(true); setSelectingFor('source'); }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-all"
                  >
                    <Plug size={18} className="mr-2" />
                    更换数据源
                  </button>

                  {/* Database Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">选择数据库</label>
                    <select
                      value={activeJob.source.database}
                      onChange={async (e) => {
                        const db = e.target.value;
                        updateJobDetails('source', 'database', db);
                        if (db) await loadTables(activeJob.source, db, 'source');
                      }}
                      disabled={isLoadingDbs}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                    >
                      <option value="">-- 选择数据库 --</option>
                      {sourceDbs.map(db => <option key={db} value={db}>{db}</option>)}
                    </select>
                  </div>

                  {/* Table Selector with Search */}
                  {activeJob.source.database && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">选择数据表</label>
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="搜索表..."
                          value={sourceTableSearch}
                          onChange={(e) => setSourceTableSearch(e.target.value)}
                          disabled={isLoadingTables}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none disabled:opacity-50"
                        />
                      </div>
                      <select
                        value={activeJob.source.table}
                        onChange={e => updateJobDetails('source', 'table', e.target.value)}
                        disabled={isLoadingTables}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- 选择表 --</option>
                        {sourceTables
                          .filter(t => t.name.toLowerCase().includes(sourceTableSearch.toLowerCase()))
                          .map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <Settings size={40} className="mb-2 opacity-30" />
                  <p className="text-sm mb-4">请先选择源端数据连接</p>
                  <button
                    onClick={() => { setShowSelector(true); setSelectingFor('source'); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-all"
                  >
                    <Plug size={18} className="mr-2" />
                    选择数据源
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sink Config Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/10">
              <span className="font-bold text-green-700 dark:text-green-300 flex items-center"><Database size={16} className="mr-2" /> Sink</span>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {activeJob.sink.host ? (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-slate-400 uppercase font-bold">数据源连接</div>
                    </div>
                    <div className="font-bold text-sm dark:text-white flex items-center mb-1">
                      <Database size={16} className="mr-2 text-green-600" />
                      {activeJob.sink.type}
                    </div>
                    <div className="text-xs text-slate-500 ml-6">{activeJob.sink.host}:{activeJob.sink.port}</div>
                  </div>
                  <button
                    onClick={() => { setShowSelector(true); setSelectingFor('sink'); }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-all"
                  >
                    <Plug size={18} className="mr-2" />
                    更换数据源
                  </button>

                  {/* Database Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">选择数据库</label>
                    <select
                      value={activeJob.sink.database}
                      onChange={async (e) => {
                        const db = e.target.value;
                        updateJobDetails('sink', 'database', db);
                        if (db) await loadTables(activeJob.sink, db, 'sink');
                      }}
                      disabled={isLoadingDbs}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                    >
                      <option value="">-- 选择数据库 --</option>
                      {sinkDbs.map(db => <option key={db} value={db}>{db}</option>)}
                    </select>
                  </div>

                  {/* Table Selector with Search */}
                  {activeJob.sink.database && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">选择数据表</label>
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="搜索表..."
                          value={sinkTableSearch}
                          onChange={(e) => setSinkTableSearch(e.target.value)}
                          disabled={isLoadingTables}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none disabled:opacity-50"
                        />
                      </div>
                      <select
                        value={activeJob.sink.table}
                        onChange={e => updateJobDetails('sink', 'table', e.target.value)}
                        disabled={isLoadingTables}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- 选择表 --</option>
                        {sinkTables
                          .filter(t => t.name.toLowerCase().includes(sinkTableSearch.toLowerCase()))
                          .map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <Settings size={40} className="mb-2 opacity-30" />
                  <p className="text-sm mb-4">请先选择目标端数据连接</p>
                  <button
                    onClick={() => { setShowSelector(true); setSelectingFor('sink'); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-all"
                  >
                    <Plug size={18} className="mr-2" />
                    选择数据源
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-[#1e1e1e] rounded-xl border border-slate-800 overflow-hidden mt-2">
          <div className="h-9 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
            <span className="text-xs text-slate-400 font-mono">config.conf</span>
            <button
              onClick={() => {
                if (generatedConfig) {
                  navigator.clipboard.writeText(generatedConfig);
                  alert(lang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
                }
              }}
              disabled={!generatedConfig}
              className="text-xs text-slate-400 hover:text-white flex items-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Save size={14} className="mr-1" /> Copy
            </button>
          </div>
          <div className="p-4 font-mono text-sm text-blue-300 max-h-96 overflow-y-auto custom-scrollbar">
            {generatedConfig ? (
              <pre className="whitespace-pre-wrap text-green-300">{generatedConfig}</pre>
            ) : (
              <span className="text-slate-500"># {lang === 'zh' ? '点击生成按钮预览配置...' : 'Click Generate to preview configuration...'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};