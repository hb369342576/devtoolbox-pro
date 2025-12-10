import React, { useState } from 'react';
import { Language, DbConnection, ScriptJob, JobConfig } from '../types';
import { 
  Workflow, Plus, Trash2, ChevronLeft, Save, X, 
  LayoutGrid, List, ArrowRight, Database, Play, Settings
} from 'lucide-react';

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
  };

  const handleDeleteJob = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(lang === 'zh' ? '确定删除此任务吗？' : 'Delete this job?')) {
          saveJobs(jobs.filter(j => j.id !== id));
          if (activeJob?.id === id) setActiveJob(null);
      }
  };

  const handleSelectDataSource = (conn: DbConnection) => {
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
    }
    setShowSelector(false);
    setSelectingFor(null);
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
  
  // --- LIST VIEW ---
  if (!activeJob) {
    return (
      <div className="h-full flex flex-col">
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
                        setActiveJob({...activeJob, name: newName});
                        saveJobs(jobs.map(j => j.id === activeJob.id ? {...j, name: newName} : j));
                    }}
                    className="font-bold text-lg text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors"
                />
            </div>
            <div className="flex space-x-2">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium flex items-center shadow-lg hover:bg-purple-700 transition-colors">
                    <Play size={16} className="mr-2" />
                    {lang === 'zh' ? '生成预览' : 'Generate'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                {/* Source Config Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/10 flex justify-between items-center">
                        <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center"><Database size={16} className="mr-2"/> Source</span>
                        <button 
                            onClick={() => { setShowSelector(true); setSelectingFor('source'); }}
                            className="text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
                        >
                            {lang === 'zh' ? '选择数据源' : 'Select Connection'}
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-1">
                        {activeJob.source.host ? (
                            <>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Current Connection</div>
                                    <div className="font-mono text-sm text-slate-700 dark:text-slate-300 font-bold">{activeJob.source.type}</div>
                                    <div className="text-xs text-slate-500 mt-1 truncate">{activeJob.source.host}:{activeJob.source.port}</div>
                                    <div className="text-xs text-slate-500 mt-1">DB: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{activeJob.source.database || 'Default'}</span></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '源表名' : 'Source Table'}</label>
                                    <input 
                                        value={activeJob.source.table} 
                                        onChange={e => updateJobDetails('source', 'table', e.target.value)} 
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                        placeholder="e.g. users"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                                <Settings size={40} className="mb-2 opacity-30" />
                                <p className="text-sm">{lang === 'zh' ? '请先选择源端数据连接' : 'Please select a source connection'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sink Config Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/10 flex justify-between items-center">
                        <span className="font-bold text-green-700 dark:text-green-300 flex items-center"><Database size={16} className="mr-2"/> Sink</span>
                        <button 
                            onClick={() => { setShowSelector(true); setSelectingFor('sink'); }}
                            className="text-xs bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-3 py-1 rounded-full hover:bg-green-50 transition-colors"
                        >
                            {lang === 'zh' ? '选择数据源' : 'Select Connection'}
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-1">
                        {activeJob.sink.host ? (
                            <>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Current Connection</div>
                                    <div className="font-mono text-sm text-slate-700 dark:text-slate-300 font-bold">{activeJob.sink.type}</div>
                                    <div className="text-xs text-slate-500 mt-1 truncate">{activeJob.sink.host}:{activeJob.sink.port}</div>
                                    <div className="text-xs text-slate-500 mt-1">DB: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{activeJob.sink.database || 'Default'}</span></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '目标表名' : 'Target Table'}</label>
                                    <input 
                                        value={activeJob.sink.table} 
                                        onChange={e => updateJobDetails('sink', 'table', e.target.value)} 
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
                                        placeholder="e.g. ods_users"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                                <Settings size={40} className="mb-2 opacity-30" />
                                <p className="text-sm">{lang === 'zh' ? '请先选择目标端数据连接' : 'Please select a sink connection'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Preview Section Placeholder */}
            <div className="bg-[#1e1e1e] rounded-xl border border-slate-800 overflow-hidden mt-2">
                <div className="h-9 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
                    <span className="text-xs text-slate-400 font-mono">config.conf</span>
                    <button className="text-xs text-slate-400 hover:text-white flex items-center transition-colors">
                        <Save size={14} className="mr-1" /> Copy
                    </button>
                </div>
                <div className="p-4 font-mono text-sm text-blue-300">
                    # {lang === 'zh' ? '点击生成按钮预览配置...' : 'Click Generate to preview configuration...'}
                </div>
            </div>
        </div>
    </div>
  );
};