
import React, { useState, useEffect } from 'react';
import {
  Database, Table as TableIcon, Code, RefreshCw, Server, Search,
  Key, Columns, Save, Plus, Trash2, X, CheckCircle, AlertCircle,
  ArrowRightLeft, ChevronDown, LogOut, Edit, Power, AlertTriangle,
  HardDrive, Layers, Table2, FileCode, LayoutGrid, List, Copy, FileText
} from 'lucide-react';
import { Language, TableInfo, DbConnection, DatabaseType, TableDetail, ColumnInfo } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getTexts } from '../locales';
import { ContextMenu } from '../components/ContextMenu';

// --- Components & Helpers ---

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error';
  lang: Language;
}

const AlertModal: React.FC<AlertProps> = ({ isOpen, onClose, title, message, type, lang }) => {
  const t = getTexts(lang);

  // Auto-close for success messages after 2 seconds
  useEffect(() => {
    if (isOpen && type === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
        <div className={`px-6 py-4 flex items-center space-x-3 ${type === 'error' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
          <div className={`p-2 rounded-full ${type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200' : 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200'}`}>
            {type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          </div>
          <h3 className={`font-bold text-lg ${type === 'error' ? 'text-red-800 dark:text-red-100' : 'text-green-800 dark:text-green-100'}`}>
            {title}
          </h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed text-sm">
            {message}
          </p>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

const getDbConfig = (type: DatabaseType) => {
  switch (type) {
    case 'MySQL': return { icon: Database, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'PostgreSQL': return { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400' };
    case 'Doris': return { icon: Server, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400' };
    case 'Oracle': return { icon: HardDrive, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30 dark:text-red-400' };
    case 'SQL Server': return { icon: Table2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'SQLite': return { icon: FileCode, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' };
    default: return { icon: Database, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700 dark:text-slate-400' };
  }
};

// --- Main Component ---

export const DbViewer: React.FC<{
  lang: Language;
  connections: DbConnection[];
  onNavigate: (id: string) => void;
  onUpdate?: (conn: DbConnection) => void;
  onDelete?: (id: string) => void;
}> = ({ lang, connections, onNavigate, onUpdate, onDelete }) => {
  const t = getTexts(lang);
  // Reliable check for Tauri v2
  const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

  // View State
  const [activeConnection, setActiveConnection] = useState<DbConnection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConn, setEditingConn] = useState<DbConnection | null>(null);

  // Data State
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableDetail, setTableDetail] = useState<TableDetail | null>(null);

  // Loading & Alert State
  const [isLoading, setIsLoading] = useState(false);
  const [alertState, setAlertState] = useState<AlertProps>({
    isOpen: false, title: '', message: '', type: 'error', onClose: () => { }, lang
  });

  // Search State
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'table' | 'column' | null;
    tableName?: string;
  }>({ show: false, x: 0, y: 0, type: null });

  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      onClose: () => setAlertState(prev => ({ ...prev, isOpen: false })),
      lang
    });
  };

  // Filter databases and tables based on search
  const filteredDatabases = databases.filter(db =>
    db.toLowerCase().includes(dbSearchTerm.toLowerCase())
  );
  const filteredTables = tables.filter(tbl =>
    tbl.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  // --- SQL Generation Helpers ---
  const generateInsertSQL = (tableName: string, columns: ColumnInfo[]) => {
    const columnNames = columns.map(c => c.name).join(', ');
    const valuePlaceholders = columns.map(() => '?').join(', ');
    return `INSERT INTO ${tableName} (${columnNames})\nVALUES (${valuePlaceholders});`;
  };

  const generateUpdateSQL = (tableName: string, columns: ColumnInfo[]) => {
    const setClause = columns.filter(c => !c.isPrimaryKey).map(c => `${c.name} = ?`).join(',\n  ');
    const pkColumn = columns.find(c => c.isPrimaryKey)?.name || 'id';
    return `UPDATE ${tableName}\nSET ${setClause}\nWHERE ${pkColumn} = ?;`;
  };

  const generateDeleteSQL = (tableName: string, columns: ColumnInfo[]) => {
    const pkColumn = columns.find(c => c.isPrimaryKey)?.name || 'id';
    return `DELETE FROM ${tableName}\nWHERE ${pkColumn} = ?;`;
  };

  const copyToClipboard = (text: string, successMsg: string) => {
    navigator.clipboard.writeText(text);
    showAlert(t.common.success, successMsg, 'success');
  };

  // --- Context Menu Handlers ---
  const handleTableContextMenu = (e: React.MouseEvent, tableName: string) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: 'table',
      tableName
    });
  };

  const handleColumnContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!tableDetail) return;
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: 'column'
    });
  };


  // --- Connection Management Actions ---

  const handleEdit = (conn: DbConnection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConn({ ...conn });
    setShowEditModal(true);
  };

  const handleDelete = (conn: DbConnection, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(lang === 'zh' ? `确定删除连接 "${conn.name}" 吗？` : `Delete connection "${conn.name}"?`)) {
      onDelete?.(conn.id);
      if (activeConnection?.id === conn.id) {
        handleDisconnect();
      }
    }
  };

  const handleSaveEdit = () => {
    if (editingConn && onUpdate) {
      onUpdate(editingConn);
      setShowEditModal(false);
      setEditingConn(null);
    }
  };

  // --- Database Actions ---


  const handleConnect = async (conn: DbConnection) => {
    setIsLoading(true);

    try {
      await invoke<string>('db_test_connection', { payload: conn });
      // TCP 连接成功
      setActiveConnection(conn);
      await fetchDatabases(conn);
    } catch (error) {
      // 连接失败
      const errorMsg = typeof error === 'string' ? error : String(error);
      showAlert(t.common.failed, errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatabases = async (conn: DbConnection) => {
    const connStr = `mysql://${conn.user}:${conn.password}@${conn.host}:${conn.port}`;
    try {
      const dbs = await invoke<string[]>('db_get_databases', { id: connStr });
      setDatabases(dbs);
      if (conn.defaultDatabase && dbs.includes(conn.defaultDatabase)) {
        handleSelectDb(conn, conn.defaultDatabase);
      }
    } catch (e) {
      const errorMsg = typeof e === 'string' ? e : String(e);
      showAlert(t.common.error, errorMsg, 'error');
      console.error('Failed to fetch databases:', e);
    }
  };

  const handleSelectDb = async (conn: DbConnection, db: string) => {
    setSelectedDb(db);
    setSelectedTable('');
    setTableDetail(null);
    setTables([]);
    setIsLoading(true);
    const connStr = `mysql://${conn.user}:${conn.password}@${conn.host}:${conn.port}`;
    try {
      const tbls = await invoke<TableInfo[]>('db_get_tables', { id: connStr, db });
      setTables(tbls);
    } catch (e) {
      const errorMsg = typeof e === 'string' ? e : String(e);
      showAlert(t.common.error, errorMsg, 'error');
      console.error('Failed to fetch tables:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTable = async (conn: DbConnection, db: string, table: string) => {
    setSelectedTable(table);
    setTableDetail(null);
    setIsLoading(true);
    const connStr = `mysql://${conn.user}:${conn.password}@${conn.host}:${conn.port}`;
    try {
      const detail = await invoke<TableDetail>('db_get_table_schema', { id: connStr, db, table });
      setTableDetail(detail);
    } catch (e) {
      const errorMsg = typeof e === 'string' ? e : String(e);
      showAlert(t.common.error, errorMsg, 'error');
      console.error('Failed to fetch table schema:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setActiveConnection(null);
    setDatabases([]);
    setTables([]);
    setSelectedDb('');
    setSelectedTable('');
    setTableDetail(null);
  };

  // --- Render: Connection Selection ---
  if (!activeConnection) {
    return (
      <div className="h-full flex flex-col animate-in fade-in">
        <AlertModal {...alertState} />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
            <Database className="mr-3 text-blue-600" />
            {t.dbViewer.selectSource}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><List size={16} /></button>
            </div>
            <button
              onClick={() => onNavigate('data-source-manager')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
            >
              <Plus size={18} className="mr-2" />
              {t.dataSource.title}
            </button>
          </div>
        </div>

        {connections.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
              <Database size={48} className="opacity-50" />
            </div>
            <p className="mb-4 text-lg">{lang === 'zh' ? '暂无数据源' : 'No Data Sources'}</p>
            <button onClick={() => onNavigate('data-source-manager')} className="text-blue-500 hover:underline">
              {t.dataSource.addTitle}
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
            {connections.map(conn => {
              const style = getDbConfig(conn.type);
              if (viewMode === 'grid') {
                return (
                  <div key={conn.id} className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${style.bg} ${style.color}`}>
                        <style.icon size={24} />
                      </div>
                      {(onUpdate || onDelete) && (
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onUpdate && (
                            <button onClick={(e) => handleEdit(conn, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Edit size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={(e) => handleDelete(conn, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div onClick={() => handleConnect(conn)} className="cursor-pointer">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate">{conn.name}</h3>
                      <div className="text-sm text-slate-500 font-mono">{conn.host}:{conn.port}</div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={conn.id} className="group flex items-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div onClick={() => handleConnect(conn)} className="flex items-center flex-1 cursor-pointer">
                      <div className={`p-2 rounded-lg ${style.bg} ${style.color} mr-4`}>
                        <style.icon size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white">{conn.name}</h3>
                        <div className="text-xs text-slate-500 font-mono">{conn.type} &bull; {conn.host}</div>
                      </div>
                    </div>
                    {(onUpdate || onDelete) && (
                      <div className="flex space-x-2 ml-4">
                        {onUpdate && (
                          <button onClick={(e) => handleEdit(conn, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Edit size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={(e) => handleDelete(conn, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                    <ArrowRightLeft size={18} className="text-slate-300 ml-2" />
                  </div>
                );
              }
            })}
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl flex items-center space-x-3">
              <RefreshCw className="animate-spin text-blue-600" />
              <span className="font-medium text-slate-800 dark:text-white">{t.common.loading}...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Render: Workbench ---
  return (
    <div className="h-full flex flex-col md:flex-row -m-6 animate-in fade-in">
      <AlertModal {...alertState} />

      {/* Sidebar: DB & Tables */}
      <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 dark:text-white truncate flex items-center">
              <Database size={16} className="mr-2 text-blue-600" />
              {activeConnection.name}
            </h3>
            <button onClick={handleDisconnect} className="text-slate-400 hover:text-red-500 transition-colors" title={t.dbViewer.disconnect}>
              <LogOut size={16} />
            </button>
          </div>
          {/* Database Search */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'zh' ? '搜索数据库...' : 'Search databases...'}
              value={dbSearchTerm}
              onChange={(e) => setDbSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          {/* Database List */}
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredDatabases.map(db => (
              <button
                key={db}
                onClick={() => handleSelectDb(activeConnection, db)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedDb === db
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {db}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {selectedDb ? (
            <div>
              {/* Table Search */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === 'zh' ? '搜索表...' : 'Search tables...'}
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {/* Table List */}
              <div className="space-y-1">
                {filteredTables.map(tbl => (
                  <button
                    key={tbl.name}
                    onClick={() => handleSelectTable(activeConnection, selectedDb, tbl.name)}
                    onContextMenu={(e) => handleTableContextMenu(e, tbl.name)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 transition-colors ${selectedTable === tbl.name ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <TableIcon size={14} className={selectedTable === tbl.name ? 'text-blue-200' : 'text-slate-400'} />
                    <span className="truncate">{tbl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Database size={32} className="mb-2 opacity-20" />
              <p>{t.dbViewer.selectDb}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
        {selectedTable && tableDetail ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="mb-6 flex items-end justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center mb-1">
                  <TableIcon className="mr-3 text-blue-600" />
                  {selectedTable}
                </h2>
                <p className="text-slate-500 text-sm">{tableDetail.columns.length} {lang === 'zh' ? '列' : 'Columns'} &bull; DDL Available</p>
              </div>
            </div>

            {/* Columns */}
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                <Columns size={16} className="mr-2" />
                {lang === 'zh' ? '列定义' : 'Columns'}
              </h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm" onContextMenu={handleColumnContextMenu}>
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Type</th>
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-16 text-center">PK</th>
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 w-16 text-center">Null</th>
                      <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {tableDetail.columns.map(col => (
                      <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5 font-mono text-slate-800 dark:text-white font-medium">{col.name}</td>
                        <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-mono">{col.type}</td>
                        <td className="px-4 py-2.5 text-center">
                          {col.isPrimaryKey && <Key size={14} className="mx-auto text-amber-500" />}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {col.isNullable ? <span className="text-slate-300 text-xs">Yes</span> : <span className="text-slate-800 dark:text-white font-bold text-xs">No</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 italic truncate max-w-xs" title={col.comment || ''}>{col.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DDL */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center">
                  <Code size={16} className="mr-2" />
                  DDL
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tableDetail.ddl);
                    showAlert(t.common.success, lang === 'zh' ? 'DDL 已复制' : 'DDL Copied', 'success');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors shadow-sm"
                >
                  <Copy size={14} />
                  <span>{lang === 'zh' ? '复制' : 'Copy'}</span>
                </button>
              </div>
              <div className="relative group">
                <pre className="bg-slate-900 text-blue-100 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                  {tableDetail.ddl}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <TableIcon size={64} className="mb-4 opacity-20" />
            <p className="text-lg">{t.dbViewer.selectDb}</p>
          </div>
        )}
      </div>

      {/* Edit Connection Modal */}
      {showEditModal && editingConn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{lang === 'zh' ? '编辑连接' : 'Edit Connection'}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '连接名称' : 'Connection Name'}</label>
                <input
                  type="text"
                  value={editingConn.name || ''}
                  onChange={e => setEditingConn({ ...editingConn, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '主机' : 'Host'}</label>
                  <input
                    type="text"
                    value={editingConn.host || ''}
                    onChange={e => setEditingConn({ ...editingConn, host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '端口' : 'Port'}</label>
                  <input
                    type="text"
                    value={editingConn.port || ''}
                    onChange={e => setEditingConn({ ...editingConn, port: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '用户名' : 'User'}</label>
                  <input
                    type="text"
                    value={editingConn.user || ''}
                    onChange={e => setEditingConn({ ...editingConn, user: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '密码' : 'Password'}</label>
                  <input
                    type="password"
                    value={editingConn.password || ''}
                    onChange={e => setEditingConn({ ...editingConn, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">{lang === 'zh' ? '取消' : 'Cancel'}</button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-colors"
              >
                {lang === 'zh' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
          items={
            contextMenu.type === 'table' && contextMenu.tableName
              ? [
                {
                  label: lang === 'zh' ? '复制表名' : 'Copy Table Name',
                  icon: <Copy size={16} />,
                  onClick: () => copyToClipboard(contextMenu.tableName!, lang === 'zh' ? '表名已复制' : 'Table name copied')
                },
                // Only show SQL options if table is selected and we have column info
                ...(selectedTable === contextMenu.tableName && tableDetail ? [
                  { label: '', onClick: () => { }, divider: true },
                  {
                    label: lang === 'zh' ? '复制 INSERT 语句' : 'Copy INSERT Statement',
                    icon: <FileText size={16} />,
                    onClick: () => {
                      const sql = generateInsertSQL(contextMenu.tableName!, tableDetail.columns);
                      copyToClipboard(sql, lang === 'zh' ? 'INSERT 语句已复制' : 'INSERT statement copied');
                    }
                  },
                  {
                    label: lang === 'zh' ? '复制 UPDATE 语句' : 'Copy UPDATE Statement',
                    icon: <Edit size={16} />,
                    onClick: () => {
                      const sql = generateUpdateSQL(contextMenu.tableName!, tableDetail.columns);
                      copyToClipboard(sql, lang === 'zh' ? 'UPDATE 语句已复制' : 'UPDATE statement copied');
                    }
                  },
                  {
                    label: lang === 'zh' ? '复制 DELETE 语句' : 'Copy DELETE Statement',
                    icon: <Trash2 size={16} />,
                    onClick: () => {
                      const sql = generateDeleteSQL(contextMenu.tableName!, tableDetail.columns);
                      copyToClipboard(sql, lang === 'zh' ? 'DELETE 语句已复制' : 'DELETE statement copied');
                    }
                  }
                ] : [])
              ]
              : contextMenu.type === 'column' && tableDetail
                ? [
                  {
                    label: lang === 'zh' ? '复制字段列表（逗号分隔）' : 'Copy Column Names (Comma Separated)',
                    icon: <Copy size={16} />,
                    onClick: () => {
                      const columnNames = tableDetail.columns.map(c => c.name).join(', ');
                      copyToClipboard(columnNames, lang === 'zh' ? '字段列表已复制（逗号）' : 'Column names copied (comma)');
                    }
                  },
                  {
                    label: lang === 'zh' ? '复制字段列表（换行分隔）' : 'Copy Column Names (Line Separated)',
                    icon: <FileText size={16} />,
                    onClick: () => {
                      const columnNames = tableDetail.columns.map(c => c.name).join('\n');
                      copyToClipboard(columnNames, lang === 'zh' ? '字段列表已复制（换行）' : 'Column names copied (newline)');
                    }
                  }
                ]
                : []
          }
        />
      )}
    </div>
  );
};
