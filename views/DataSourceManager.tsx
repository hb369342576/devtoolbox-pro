import React, { useState } from 'react';
import {
  Database, Plus, Edit, Trash2, RefreshCw, CheckCircle, X, LayoutGrid, List,
  DatabaseZap, AlertCircle, Server, HardDrive, Layers, Table2, FileCode, Power
} from 'lucide-react';
import { Language, DbConnection, DatabaseType } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getTexts } from '../locales';
import { ConfirmModal } from '../components/ConfirmModal';

interface DataSourceManagerProps {
  lang: Language;
  connections: DbConnection[];
  onAdd: (conn: Omit<DbConnection, 'id'>) => void;
  onUpdate: (conn: DbConnection) => void;
  onDelete: (id: string) => void;
}

// Alert Modal Component
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

export const DataSourceManager: React.FC<{
  lang: Language;
  connections: DbConnection[];
  onAdd: (conn: Omit<DbConnection, 'id'>) => void;
  onUpdate: (conn: DbConnection) => void;
  onDelete: (id: string) => void;
}> = ({ lang, connections, onAdd, onUpdate, onDelete }) => {
  const t = getTexts(lang); // Get Translations
  // Reliable check for Tauri v2
  const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingConn, setEditingConn] = useState<Partial<DbConnection>>({});
  const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
  const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'error' });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });

  const isFormValid = editingConn.type === 'SQLite'
    ? !!(editingConn.name && editingConn.host)
    : !!(editingConn.name && editingConn.host && editingConn.port && editingConn.user);

  const handleAddNew = () => {
    setEditingConn({ type: 'MySQL', name: t.dataSource.addTitle, host: '127.0.0.1', port: '3306', user: 'root' });
    setTestStatus('none');
    setShowModal(true);
  };

  const handleEdit = (conn: DbConnection, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingConn({ ...conn });
    setTestStatus('none');
    setShowModal(true);
  };

  const handleSave = () => {
    if (isFormValid) {
      if (editingConn.id) {
        onUpdate(editingConn as DbConnection);
      } else {
        onAdd(editingConn as Omit<DbConnection, 'id'>);
      }
      setShowModal(false);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ isOpen: true, id });
  };

  const handleConfirmDelete = () => {
    onDelete(confirmDelete.id);
    setConfirmDelete({ isOpen: false, id: '' });
  };

  const handleTest = async () => {
    setTestStatus('testing');
    if (isTauri) {
      try {
        await invoke<string>('db_test_connection', { payload: editingConn });
        // 成功
        setTestStatus('success');
        setAlertState({ isOpen: true, title: t.common.success, message: t.dataSource.connSuccess, type: 'success' });
        // 2秒后重置状态
        setTimeout(() => setTestStatus('none'), 2000);
      } catch (error) {
        // 失败 - error 是 Err(string)
        setTestStatus('failed');
        const errorMsg = typeof error === 'string' ? error : String(error);
        setAlertState({ isOpen: true, title: t.common.failed, message: errorMsg, type: 'error' });
        // 3秒后重置状态
        setTimeout(() => setTestStatus('none'), 3000);
      }
    } else {
      setTimeout(() => {
        setTestStatus('failed');
        setAlertState({ isOpen: true, title: 'Web Mode', message: 'Connection testing is mocked in web mode.', type: 'error' });
        setTimeout(() => setTestStatus('none'), 3000);
      }, 800);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} lang={lang} />
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
        message={t.dataSource.deleteConfirm}
        confirmText={lang === 'zh' ? '删除' : 'Delete'}
        cancelText={lang === 'zh' ? '取消' : 'Cancel'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <DatabaseZap className="mr-3 text-blue-600" />
          {t.dataSource.title}
        </h2>
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><List size={16} /></button>
          </div>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
          >
            <Plus size={18} className="mr-2" />{t.common.add}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map(conn => {
              const style = getDbConfig(conn.type);
              return (
                <div
                  key={conn.id}
                  className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
                  onDoubleClick={() => handleEdit(conn)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${style.bg}`}>
                      <style.icon size={24} className={style.color} />
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEdit(conn, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={18} /></button>
                      <button onClick={(e) => handleDeleteClick(conn.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate">{conn.name}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <span className="w-16 text-xs font-bold uppercase opacity-70">{t.dataSource.type}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700`}>{conn.type}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <span className="w-16 text-xs font-bold uppercase opacity-70">{t.dataSource.host}</span>
                      <span className="truncate font-mono">{conn.host}:{conn.port}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={handleAddNew}
              className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Plus size={24} />
              </div>
              <span className="font-medium">{t.common.add}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <div className="col-span-4">{t.common.name}</div>
              <div className="col-span-2">{t.dataSource.type}</div>
              <div className="col-span-4">{t.dataSource.host}</div>
              <div className="col-span-2 text-right">{t.common.actions}</div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {connections.map(conn => {
                const style = getDbConfig(conn.type);
                return (
                  <div
                    key={conn.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onDoubleClick={() => handleEdit(conn)}
                  >
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                        <style.icon size={16} className={style.color} />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white truncate">{conn.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{conn.type}</span>
                    </div>
                    <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                      {conn.host}:{conn.port}
                    </div>
                    <div className="col-span-2 flex justify-end space-x-2">
                      <button onClick={(e) => handleEdit(conn, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16} /></button>
                      <button onClick={(e) => handleDeleteClick(conn.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
              {connections.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{t.common.noData}</div>}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingConn.id ? t.dataSource.editTitle : t.dataSource.addTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Connection Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.connectionName} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingConn.name || ''}
                  onChange={e => setEditingConn({ ...editingConn, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  placeholder={t.dataSource.placeholderName}
                />
              </div>

              {/* Connection Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.type}</label>
                <select
                  value={editingConn.type}
                  onChange={e => setEditingConn({ ...editingConn, type: e.target.value as DatabaseType })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                >
                  {['MySQL', 'PostgreSQL', 'Doris', 'Oracle', 'SQL Server', 'SQLite'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Dynamic Fields */}
              {editingConn.type === 'SQLite' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.filePath} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editingConn.host || ''}
                    onChange={e => setEditingConn({ ...editingConn, host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    placeholder={t.dataSource.placeholderPath}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.host} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editingConn.host || ''}
                        onChange={e => setEditingConn({ ...editingConn, host: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        placeholder={t.dataSource.placeholderHost}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.port} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editingConn.port || ''}
                        onChange={e => setEditingConn({ ...editingConn, port: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        placeholder="3306"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.user} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editingConn.user || ''}
                        onChange={e => setEditingConn({ ...editingConn, user: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.password}</label>
                      <input
                        type="password"
                        value={editingConn.password || ''}
                        onChange={e => setEditingConn({ ...editingConn, password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dataSource.defaultDb} ({t.common.optional})</label>
                    <input
                      type="text"
                      value={editingConn.defaultDatabase || ''}
                      onChange={e => setEditingConn({ ...editingConn, defaultDatabase: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                      placeholder="target_db"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleTest}
                disabled={testStatus === 'testing'}
                className={`flex items-center space-x-2 text-sm font-medium ${testStatus === 'success' ? 'text-green-600' : testStatus === 'failed' ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}
              >
                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={16} /> : <Power size={16} />}
                <span>
                  {testStatus === 'testing' ? t.dataSource.testing :
                    testStatus === 'success' ? t.dataSource.connSuccess :
                      testStatus === 'failed' ? t.dataSource.connFailed :
                        t.dataSource.testConn}
                </span>
              </button>
              <div className="flex space-x-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">{t.common.cancel}</button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                  {t.dataSource.saveConn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};