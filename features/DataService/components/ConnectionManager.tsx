import React, { useState } from 'react';
import { useGlobalStore, useViewMode } from '../../../store/globalStore';
import { DataServiceConnection } from '../../../types';
import { Database, Plus, Edit, Trash2, Server, Key, Search, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useToast } from '../../common/Toast';
import { Tooltip } from '../../common/Tooltip';
import { ViewModeToggle } from '../../common/ViewModeToggle';

interface ConnectionManagerProps {
    onSelect: (conn: DataServiceConnection) => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ onSelect }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const viewMode = useViewMode();
    const { dataServiceConnections, addDataServiceConnection, updateDataServiceConnection, deleteDataServiceConnection } = useGlobalStore();
    
    const [showModal, setShowModal] = useState(false);
    const [editingConn, setEditingConn] = useState<Partial<DataServiceConnection>>({
        name: '',
        baseUrl: 'http://localhost:18087/dataservice',
        token: ''
    });

    const filteredConns = dataServiceConnections;

    const handleSave = () => {
        if (!editingConn.name || !editingConn.baseUrl) {
            toast({ message: t('common.saveFailed') || '请输入必填项', type: 'error' });
            return;
        }

        if (editingConn.id) {
            updateDataServiceConnection(editingConn as DataServiceConnection);
            toast({ message: t('common.saveSuccess'), type: 'success' });
        } else {
            addDataServiceConnection(editingConn as Omit<DataServiceConnection, 'id'>);
            toast({ message: t('common.success'), type: 'success' });
        }
        setShowModal(false);
    };

    const handleAddNew = () => {
        setEditingConn({ name: '', baseUrl: 'http://localhost:18087/dataservice', token: '' });
        setShowModal(true);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <Database className="mr-3 text-blue-600" />
                    数据服务管理区
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleAddNew}
                        className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        新建引擎
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {filteredConns.map((conn) => (
                            <Tooltip key={conn.id} content={conn.name} position="top">
                                <div
                                    className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] w-72 flex flex-col"
                                    onClick={() => onSelect(conn)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-[10px] rounded-lg border-2 border-blue-200 dark:border-blue-800/60 text-blue-500 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors duration-300">
                                            <Database size={24} />
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingConn(conn); setShowModal(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (window.confirm('确定要删除这个数据服务实例吗？')) deleteDataServiceConnection(conn.id!); 
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{conn.name}</h3>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-12 text-xs font-bold uppercase opacity-70">URL</span>
                                            <span className="truncate flex-1 text-xs font-mono">{conn.baseUrl}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-12 text-xs font-bold uppercase opacity-70">KEY</span>
                                            <span className="truncate flex-1 text-xs font-mono">{conn.token ? '••••' + conn.token.slice(-4) : '未设置'}</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                </div>
                            </Tooltip>
                        ))}
                        
                        <button
                            onClick={handleAddNew}
                            className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[200px] w-72"
                        >
                            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">添加服务引擎</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-3">服务名称</div>
                            <div className="col-span-7">Base URL</div>
                            <div className="col-span-2 text-right">操作</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredConns.map((conn) => (
                                <div
                                    key={conn.id}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => onSelect(conn)}
                                >
                                    <div className="col-span-3 flex items-center space-x-3">
                                        <Database size={18} className="text-blue-500" />
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{conn.name}</span>
                                    </div>
                                    <div className="col-span-7 text-sm text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
                                        {conn.baseUrl}
                                    </div>
                                    <div className="col-span-2 flex justify-end space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingConn(conn); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (window.confirm('确定要删除这个数据服务实例吗？')) deleteDataServiceConnection(conn.id!); 
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredConns.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">未找到匹配的服务引擎</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-extrabold text-xl text-slate-800 dark:text-white flex items-center">
                                <Database className="mr-2 text-blue-600" />
                                {editingConn.id ? '编辑服务实例' : '注册新数据服务引擎'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">服务别名 (Name) *</label>
                                <input 
                                    type="text" 
                                    placeholder="例如：开发环境数据服务"
                                    value={editingConn.name || ''}
                                    onChange={e => setEditingConn({...editingConn, name: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">基础连接 (BASE URL) *</label>
                                <div className="relative">
                                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="http://IP:PORT/dataservice"
                                        value={editingConn.baseUrl || ''}
                                        onChange={e => setEditingConn({...editingConn, baseUrl: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">安全凭证 (Admin Token)</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="password" 
                                        placeholder="用于操作管理界面的鉴权 Token"
                                        value={editingConn.token || ''}
                                        onChange={e => setEditingConn({...editingConn, token: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/50">
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleSave} 
                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all active:translate-y-0"
                            >
                                完成保存
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
