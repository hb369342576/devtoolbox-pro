import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRightLeft, Plus, Save, Download, Upload, Trash2, 
  RefreshCw, LayoutGrid, List, Edit, ArrowRight, X, Database,
  Link, AlertTriangle, FileJson, Check, GripHorizontal, Plug,
  ZoomIn, ZoomOut, Move, LayoutTemplate, MousePointer2, ChevronLeft
} from 'lucide-react';
import { Language, MappingProfile, FieldMapping, DbConnection, DatabaseType, TableInfo, CanvasNode, CanvasLink, ColumnInfo, TableDetail } from '../types';

/* --- Helper: Type Compatibility Check --- */
const checkTypeCompatibility = (sourceType: string = '', targetType: string = ''): { compatible: boolean; warning?: string } => {
  const s = sourceType.toLowerCase();
  const t = targetType.toLowerCase();
  
  if (!s || !t) return { compatible: true };

  // Warning: String -> Number
  if ((s.includes('char') || s.includes('text')) && (t.includes('int') || t.includes('decimal') || t.includes('double'))) {
    return { compatible: false, warning: 'String -> Number risk' };
  }
  
  // Warning: Large Number -> Small Number
  if (s.includes('bigint') && t.includes('int') && !t.includes('big')) {
    return { compatible: false, warning: 'BigInt -> Int overflow risk' };
  }

  // Warning: Date -> Not Date
  if ((s.includes('date') || s.includes('time')) && (!t.includes('date') && !t.includes('time') && !t.includes('char') && !t.includes('text'))) {
    return { compatible: false, warning: 'Date -> Non-Date/String' };
  }

  return { compatible: true };
};

/* --- Data Source Selector Modal --- */
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
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
                >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400`}>
                            <Database size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{conn.name}</p>
                            <p className="text-xs text-slate-500">{conn.type} &bull; {conn.host}</p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const FieldMappingTool: React.FC<{ 
    lang: Language; 
    connections: DbConnection[]; 
    onNavigate: (id: string) => void 
}> = ({ lang, connections, onNavigate }) => {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  // --- Global State ---
  const [activeProfile, setActiveProfile] = useState<MappingProfile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // --- Connection Selection State ---
  const [showSelector, setShowSelector] = useState(false);
  const [selectingSide, setSelectingSide] = useState<'source' | 'target' | null>(null);

  // --- Canvas State ---
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [links, setLinks] = useState<CanvasLink[]>([]);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [linkingSource, setLinkingSource] = useState<string | null>(null);

  // --- Sidebar State ---
  const [activeSideTab, setActiveSideTab] = useState<'source' | 'target'>('source');
  
  // Store selected connection objects
  const [sourceConn, setSourceConn] = useState<DbConnection | undefined>(undefined);
  const [targetConn, setTargetConn] = useState<DbConnection | undefined>(undefined);
  
  const [sourceNav, setSourceNav] = useState<{ step: 'dbs' | 'tables', dbList: string[], tableList: TableInfo[], currentDb: string }>({ step: 'dbs', dbList: [], tableList: [], currentDb: '' });
  const [targetNav, setTargetNav] = useState<{ step: 'dbs' | 'tables', dbList: string[], tableList: TableInfo[], currentDb: string }>({ step: 'dbs', dbList: [], tableList: [], currentDb: '' });
  const [isLoadingSide, setIsLoadingSide] = useState(false);

  // --- Modal State ---
  const [activeLink, setActiveLink] = useState<CanvasLink | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // --- Profiles List ---
  const [profiles, setProfiles] = useState<MappingProfile[]>(() => {
    const saved = localStorage.getItem('visual_mappings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('visual_mappings', JSON.stringify(profiles)); }, [profiles]);

  // Load profile
  useEffect(() => {
    if (activeProfile) {
      setNodes(activeProfile.nodes || []);
      setLinks(activeProfile.links || []);
      setSourceConn(activeProfile.sourceConn);
      setTargetConn(activeProfile.targetConn);
      if (activeProfile.viewport) setView(activeProfile.viewport);
      // Automatically load DBs if conn exists
      if (activeProfile.sourceConn) handleConnect('source', activeProfile.sourceConn);
      if (activeProfile.targetConn) handleConnect('target', activeProfile.targetConn);
    }
  }, [activeProfile]);

  // --- Actions: Connection ---
  const handleOpenSelector = (side: 'source' | 'target') => {
      setSelectingSide(side);
      setShowSelector(true);
  };

  const handleSelectConnection = (conn: DbConnection) => {
      if (selectingSide === 'source') {
          setSourceConn(conn);
          handleConnect('source', conn);
      } else if (selectingSide === 'target') {
          setTargetConn(conn);
          handleConnect('target', conn);
      }
      setShowSelector(false);
      setSelectingSide(null);
  };

  const handleConnect = async (side: 'source' | 'target', conn: DbConnection) => {
    setIsLoadingSide(true);
    // Reset nav
    if (side === 'source') setSourceNav(prev => ({ ...prev, step: 'dbs', dbList: [] }));
    else setTargetNav(prev => ({ ...prev, step: 'dbs', dbList: [] }));

    try {
        let dbs: string[] = [];
        if (isTauri) {
            dbs = await window.__TAURI__!.invoke('db_get_databases', { id: conn.id });
        } else {
            await new Promise(r => setTimeout(r, 600));
            dbs = ['web_mock_db_1', 'test_schema', 'production'];
        }

        if (side === 'source') setSourceNav(prev => ({ ...prev, step: 'dbs', dbList: dbs }));
        else setTargetNav(prev => ({ ...prev, step: 'dbs', dbList: dbs }));

    } catch (e) {
        console.error(e);
        const mockDBs = ['demo_db_1', 'demo_db_2'];
        if (side === 'source') setSourceNav(prev => ({ ...prev, step: 'dbs', dbList: mockDBs }));
        else setTargetNav(prev => ({ ...prev, step: 'dbs', dbList: mockDBs }));
    }
    setIsLoadingSide(false);
  };

  const handleSelectDb = async (side: 'source' | 'target', dbName: string) => {
    setIsLoadingSide(true);
    const conn = side === 'source' ? sourceConn : targetConn;
    if (!conn) return;

    try {
        let tables: TableInfo[] = [];
        if (isTauri) {
             tables = await window.__TAURI__!.invoke('db_get_tables', { id: conn.id, db: dbName });
        } else {
             await new Promise(r => setTimeout(r, 400));
             tables = [
                 { name: 'mock_table_1', rows: 10, size: '1KB' },
                 { name: 'mock_table_2', rows: 20, size: '2KB' }
             ];
        }

        if (side === 'source') setSourceNav(prev => ({ ...prev, step: 'tables', tableList: tables, currentDb: dbName }));
        else setTargetNav(prev => ({ ...prev, step: 'tables', tableList: tables, currentDb: dbName }));

    } catch (e) {
        alert('Failed to load tables');
    }
    setIsLoadingSide(false);
  };

  const handleBackToDbs = (side: 'source' | 'target') => {
      if (side === 'source') setSourceNav(prev => ({ ...prev, step: 'dbs', currentDb: '' }));
      else setTargetNav(prev => ({ ...prev, step: 'dbs', currentDb: '' }));
  };

  // --- Canvas Logic (Same as before) ---
  const handleDragStart = (e: React.DragEvent, tableName: string, type: 'source' | 'target') => {
    const dbName = type === 'source' ? sourceNav.currentDb : targetNav.currentDb;
    e.dataTransfer.setData('application/json', JSON.stringify({ tableName, type, dbName }));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    const { tableName, type, dbName } = JSON.parse(dataStr);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - view.x) / view.zoom;
    const y = (e.clientY - rect.top - view.y) / view.zoom;

    const conn = type === 'source' ? sourceConn : targetConn;
    if(!conn) return;

    let columns: ColumnInfo[] = [];
    if (isTauri) {
        try {
            const schema = await window.__TAURI__!.invoke('db_get_table_schema', { 
                id: conn.id, db: dbName, table: tableName 
            }) as TableDetail;
            columns = schema.columns;
        } catch (e) {
            columns = [{ name: 'id', type: 'bigint', nullable: false, isPrimaryKey: true }];
        }
    } else {
        columns = [{ name: 'id', type: 'int', nullable: false, isPrimaryKey: true }, { name: 'name', type: 'varchar', length: 255, nullable: true, isPrimaryKey: false }];
    }

    const newNode: CanvasNode = {
        id: Math.random().toString(36).substr(2, 9),
        type, x, y, tableName,
        dbType: conn.type,
        columns
    };
    setNodes(prev => [...prev, newNode]);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('canvas-bg')) {
          setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY });
      }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
      } else if (draggingNode) {
          setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: n.x + e.movementX/view.zoom, y: n.y + e.movementY/view.zoom } : n));
      }
  };
  const handleMouseUp = () => { setIsPanning(false); setDraggingNode(null); };
  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey) { e.preventDefault(); setView(prev => ({ ...prev, zoom: Math.min(Math.max(0.2, prev.zoom - e.deltaY * 0.001), 3) })); }
  };
  const handleAutoLayout = () => {
      const sn = nodes.filter(n => n.type === 'source');
      const tn = nodes.filter(n => n.type === 'target');
      const nn = [...nodes];
      let sy = 100;
      sn.forEach((n, i) => { n.x = 100; n.y = sy + (i * 300); });
      tn.forEach((n, i) => { n.x = 600; n.y = sy + (i * 300); });
      setNodes(nn);
      setView({ x: 50, y: 50, zoom: 1 });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => { if(linkingSource) return; e.stopPropagation(); setDraggingNode(id); };
  const handleNodeClick = (id: string, type: 'source' | 'target') => {
    if (!linkingSource) { if (type === 'source') setLinkingSource(id); } 
    else {
        if (type === 'target') {
            const exists = links.find(l => l.sourceNodeId === linkingSource && l.targetNodeId === id);
            if (!exists) {
                const newLink: CanvasLink = { id: Math.random().toString(36).substr(2, 9), sourceNodeId: linkingSource, targetNodeId: id, mappings: [] };
                setLinks(prev => [...prev, newLink]); setActiveLink(newLink); setShowMappingModal(true);
            }
            setLinkingSource(null);
        } else { setLinkingSource(null); }
    }
  };
  const handleAutoMap = () => { if (!activeLink) return; const sNode = nodes.find(n => n.id === activeLink.sourceNodeId); const tNode = nodes.find(n => n.id === activeLink.targetNodeId); if(!sNode || !tNode) return; const newMaps: FieldMapping[] = []; sNode.columns.forEach(sc => { const tc = tNode.columns.find(c => c.name === sc.name); if(tc) newMaps.push({ id: Math.random().toString(), sourceField: sc.name, sourceType: sc.type, targetField: tc.name, targetType: tc.type, description: 'Auto' }); }); setActiveLink({...activeLink, mappings: newMaps}); setLinks(links.map(l => l.id === activeLink.id ? {...activeLink, mappings: newMaps} : l)); };
  
  const saveMapping = () => { setShowMappingModal(false); setActiveLink(null); };

  const renderLinks = () => links.map(link => {
        const s = nodes.find(n => n.id === link.sourceNodeId);
        const t = nodes.find(n => n.id === link.targetNodeId);
        if(!s || !t) return null;
        const sx = s.x + 220, sy = s.y + 30, ex = t.x, ey = t.y + 30;
        const d = `M ${sx} ${sy} C ${sx+80} ${sy}, ${ex-80} ${ey}, ${ex} ${ey}`;
        return <path key={link.id} d={d} stroke="#64748b" strokeWidth="3" fill="none" className="hover:stroke-blue-500 cursor-pointer" onClick={() => {setActiveLink(link); setShowMappingModal(true);}} />
  });

  // --- ACTIONS: Profile ---
  const handleSaveProfile = () => {
    if(!activeProfile) return;
    const updated: MappingProfile = { ...activeProfile, sourceConn, targetConn, nodes, links, viewport: view, updatedAt: Date.now() };
    setProfiles(prev => { const ex = prev.find(p => p.id === updated.id); return ex ? prev.map(p => p.id === updated.id ? updated : p) : [updated, ...prev]; });
    setActiveProfile(null); // Return to list view
  };
  const handleDeleteProfile = (id: string, e: React.MouseEvent) => { e.stopPropagation(); if(window.confirm('Delete?')) setProfiles(p => p.filter(x => x.id !== id)); };

  if (!activeProfile) {
     return (
        <div className="h-full flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white flex items-center"><ArrowRightLeft className="mr-3 text-indigo-600"/>{lang === 'zh' ? '可视化数据映射' : 'Visual Mapping'}</h2>
              <div className="flex items-center space-x-3">
                 <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode==='grid'?'bg-white dark:bg-slate-700 text-indigo-600':'text-slate-400'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode==='list'?'bg-white dark:bg-slate-700 text-indigo-600':'text-slate-400'}`}><List size={16}/></button>
                 </div>
                 <button onClick={() => setActiveProfile({ id: Date.now().toString(), name: lang === 'zh' ? '新映射项目' : 'New Project', updatedAt: Date.now(), nodes: [], links: [] })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center shadow-lg hover:bg-indigo-700 transition-colors"><Plus size={18} className="mr-2"/>{lang === 'zh' ? '新建项目' : 'New Project'}</button>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
              {viewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(p => (
                       <div key={p.id} onClick={() => setActiveProfile(p)} className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md text-left relative group cursor-pointer transition-all">
                          <div className="flex justify-between mb-4"><div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><ArrowRightLeft size={24}/></div><div onClick={(e)=>handleDeleteProfile(p.id, e)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></div></div>
                          <h3 className="font-bold text-lg dark:text-white mb-2">{p.name}</h3>
                          <div className="flex items-center text-xs text-slate-500 space-x-2">
                             <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{p.nodes.length} Nodes</span>
                             <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                    ))}
                    {profiles.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 text-sm italic">{lang === 'zh' ? '暂无项目' : 'No projects found'}</div>}
                 </div>
              ) : (
                 <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b dark:border-slate-700 font-bold text-xs text-slate-500 uppercase sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                        <div className="col-span-8">Name</div>
                        <div className="col-span-2">Updated</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {profiles.map(p => (
                        <div key={p.id} onClick={() => setActiveProfile(p)} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer items-center">
                            <div className="col-span-8 font-medium dark:text-white flex items-center"><ArrowRightLeft size={16} className="mr-3 text-indigo-500"/>{p.name}</div>
                            <div className="col-span-2 text-xs text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</div>
                            <div className="col-span-2 text-right"><button onClick={(e)=>handleDeleteProfile(p.id, e)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></div>
                        </div>
                        ))}
                    </div>
                 </div>
              )}
           </div>
        </div>
     );
  }

  // --- EDITOR VIEW ---
  const currentNav = activeSideTab === 'source' ? sourceNav : targetNav;
  const activeConn = activeSideTab === 'source' ? sourceConn : targetConn;

  return (
    <div className="flex h-full gap-0 overflow-hidden relative">
       <DataSourceSelectorModal isOpen={showSelector} onClose={() => setShowSelector(false)} connections={connections} onSelect={handleSelectConnection} onNavigate={onNavigate} lang={lang} />
       
       <div className="w-80 bg-white dark:bg-slate-800 border-r dark:border-slate-700 flex flex-col z-20 shadow-xl">
          <div className="h-14 flex items-center px-4 border-b dark:border-slate-700 justify-between">
             <button onClick={() => setActiveProfile(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ChevronLeft size={18}/></button>
             <input value={activeProfile.name} onChange={e => setActiveProfile({...activeProfile, name: e.target.value})} className="bg-transparent text-sm font-bold text-center outline-none dark:text-white w-32 border-b border-transparent focus:border-blue-500"/>
             <button onClick={handleSaveProfile} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Save size={18}/></button>
          </div>
          <div className="flex border-b dark:border-slate-700">
             <button onClick={() => setActiveSideTab('source')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeSideTab==='source'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10':'text-slate-500'}`}>Source DB</button>
             <button onClick={() => setActiveSideTab('target')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeSideTab==='target'?'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/10':'text-slate-500'}`}>Target DB</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-slate-400 uppercase">Connection</span>
                   <button onClick={() => handleOpenSelector(activeSideTab)} className="text-xs text-blue-500 hover:underline">{activeConn ? 'Change' : 'Select'}</button>
                </div>
                {activeConn ? (
                   <div><div className="font-bold text-sm dark:text-white">{activeConn.name}</div><div className="text-xs text-slate-500">{activeConn.type}</div></div>
                ) : <div className="text-xs text-slate-400 italic">No connection selected</div>}
             </div>
             
             {activeConn && (
                <div className="border-t dark:border-slate-700 pt-4">
                   {currentNav.step === 'dbs' ? (
                      <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Databases</h4>
                         {isLoadingSide ? <div className="text-center"><RefreshCw className="animate-spin inline"/></div> : 
                           <div className="space-y-1">{currentNav.dbList.map(db => <button key={db} onClick={() => handleSelectDb(activeSideTab, db)} className="w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300 flex items-center"><Database size={14} className="mr-2"/>{db}</button>)}</div>
                         }
                      </div>
                   ) : (
                      <div>
                         <div className="flex items-center justify-between mb-3"><button onClick={() => handleBackToDbs(activeSideTab)} className="text-xs text-blue-500 flex items-center"><ChevronLeft size={12}/> Back</button><span className="text-xs font-bold text-slate-500 truncate max-w-[150px]">{currentNav.currentDb}</span></div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Tables</h4>
                         <div className="space-y-2">{currentNav.tableList.map(t => (
                            <div key={t.name} draggable onDragStart={(e) => handleDragStart(e, t.name, activeSideTab)} className={`p-2 rounded border dark:border-slate-700 cursor-grab bg-white dark:bg-slate-900 ${activeSideTab==='source'?'border-l-4 border-l-blue-500':'border-l-4 border-l-green-500'}`}>
                               <div className="font-medium text-sm dark:text-slate-200 flex items-center"><GripHorizontal size={14} className="mr-2 text-slate-400"/>{t.name}</div>
                            </div>
                         ))}</div>
                      </div>
                   )}
                </div>
             )}
          </div>
       </div>

       {/* Canvas */}
       <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-hidden relative canvas-bg" onDrop={handleDrop} onDragOver={handleDragOver} onMouseDown={handleCanvasMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} style={{ cursor: isPanning ? 'grabbing' : 'default', backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
             <div className="bg-white dark:bg-slate-800 p-1 rounded-lg shadow border dark:border-slate-700 flex flex-col"><button onClick={()=>setView(v=>({...v,zoom:Math.min(v.zoom+0.1,3)}))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><ZoomIn size={18}/></button><button onClick={()=>setView(v=>({...v,zoom:Math.max(v.zoom-0.1,0.2)}))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><ZoomOut size={18}/></button><button onClick={()=>setView({x:0,y:0,zoom:1})} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Move size={18}/></button></div>
             <button onClick={handleAutoLayout} className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow border dark:border-slate-700"><LayoutTemplate size={18}/></button>
          </div>
          <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
             <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">{renderLinks()}{linkingSource && <line x1={nodes.find(n=>n.id===linkingSource)?.x!+220} y1={nodes.find(n=>n.id===linkingSource)?.y!+30} x2={(lastMousePos.x - 320 - view.x)/view.zoom} y2={(lastMousePos.y - 56 - view.y)/view.zoom} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />}</svg>
             {nodes.map(node => (
                <div key={node.id} style={{ left: node.x, top: node.y }} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} onClick={() => handleNodeClick(node.id, node.type)} className={`absolute w-[220px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 z-10 ${node.type==='source'?'border-blue-500':'border-green-500'} ${linkingSource===node.id?'ring-4 ring-blue-500/30':''}`}>
                   <div className={`px-3 py-2 border-b text-xs font-bold text-white flex justify-between items-center rounded-t-md ${node.type==='source'?'bg-blue-500':'bg-green-500'}`}><span>{node.tableName}</span><button onClick={(e)=>{e.stopPropagation(); setNodes(n=>n.filter(x=>x.id!==node.id)); setLinks(l=>l.filter(x=>x.sourceNodeId!==node.id&&x.targetNodeId!==node.id))}}><X size={14}/></button></div>
                   <div className="p-2 max-h-[250px] overflow-y-auto space-y-1 text-xs bg-slate-50 dark:bg-slate-900/50">{node.columns.map(c => <div key={c.name} className="flex justify-between p-1 bg-white dark:bg-slate-800 rounded border dark:border-slate-700"><span>{c.name}</span><span className="text-[10px] text-slate-400">{c.type}</span></div>)}</div>
                   {node.type==='source' && <div className="absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 shadow-sm z-20"><MousePointer2 size={12} className="text-blue-500 rotate-90"/></div>}
                   {node.type==='target' && <div className="absolute -left-3 top-8 w-6 h-6 bg-white dark:bg-slate-800 border-2 border-green-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 shadow-sm z-20"><Link size={12} className="text-green-500"/></div>}
                </div>
             ))}
          </div>
       </div>

       {showMappingModal && activeLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50"><h3 className="font-bold text-lg dark:text-white">{lang==='zh'?'字段映射':'Field Mapping'}</h3><div className="flex space-x-2"><button onClick={handleAutoMap} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-bold flex items-center"><RefreshCw size={14} className="mr-1"/> Auto</button><button onClick={saveMapping} className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-bold flex items-center"><Check size={14} className="mr-1"/> Done</button></div></div>
                <div className="flex-1 overflow-auto p-6"><table className="w-full text-left"><thead><tr className="border-b dark:border-slate-700 text-xs font-bold text-slate-500 uppercase"><th>Source</th><th>Type</th><th></th><th>Target</th><th>Type</th><th>Action</th></tr></thead><tbody className="text-sm">{activeLink.mappings.map(m=>{const c=checkTypeCompatibility(m.sourceType,m.targetType); return(<tr key={m.id} className="border-b dark:border-slate-800"><td className="py-2 dark:text-slate-300 font-mono">{m.sourceField}</td><td className="text-xs text-slate-500">{m.sourceType}</td><td><ArrowRight size={14}/></td><td className="dark:text-slate-300 font-mono">{m.targetField}</td><td className="text-xs text-slate-500">{m.targetType}{!c.compatible&&<span className="ml-2 text-amber-500 text-[10px] flex items-center"><AlertTriangle size={10} className="mr-1"/>{c.warning}</span>}</td><td><button onClick={()=>{const nm=activeLink.mappings.filter(x=>x.id!==m.id); setActiveLink({...activeLink, mappings:nm}); setLinks(links.map(l=>l.id===activeLink.id?{...l,mappings:nm}:l))}}><Trash2 size={16}/></button></td></tr>)})}</tbody></table></div>
             </div>
          </div>
       )}
    </div>
  );
};