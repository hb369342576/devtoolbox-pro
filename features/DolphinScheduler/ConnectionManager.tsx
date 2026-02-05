import React, { useState } from 'react';
import {
    Plus, Edit, Trash2, X, Server, CheckCircle,
    AlertCircle, RefreshCw, Power, Database
} from 'lucide-react';
import { Language, DolphinSchedulerConnection, DolphinSchedulerApiVersion } from '../../types';
import { httpFetch } from '../../utils/http';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

interface ConnectionManagerProps {
    lang: Language;
    connections: DolphinSchedulerConnection[];
    onAdd: (conn: Omit<DolphinSchedulerConnection, 'id'>) => void;
    onUpdate: (conn: DolphinSchedulerConnection) => void;
    onDelete: (id: string) => void;
    onSelect: (conn: DolphinSchedulerConnection) => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
    lang,
    connections,
    onAdd,
    onUpdate,
    onDelete,
    onSelect
}) => {
    const viewMode = useViewMode();
    const [showModal, setShowModal] = useState(false);
    const [editingConn, setEditingConn] = useState<Partial<DolphinSchedulerConnection>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
    const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
    const [testErrorMsg, setTestErrorMsg] = useState<string>('');

    const handleAddNew = () => {
        setEditingConn({
            name: '',
            baseUrl: 'http://localhost:12345/dolphinscheduler',
            token: '',
            apiVersion: 'v3.2'
        });
        setTestStatus('none');
        setTestErrorMsg('');
        setShowModal(true);
    };

    const handleEdit = (conn: DolphinSchedulerConnection, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingConn({ ...conn });
        setTestStatus('none');
        setTestErrorMsg('');
        setShowModal(true);
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete({ isOpen: true, id });
    };

    const handleConfirmDelete = () => {
        onDelete(confirmDelete.id);
        setConfirmDelete({ isOpen: false, id: '' });
    };

    const handleSave = () => {
        if (editingConn.name && editingConn.baseUrl && editingConn.token) {
            if (editingConn.id) {
                onUpdate(editingConn as DolphinSchedulerConnection);
            } else {
                onAdd(editingConn as Omit<DolphinSchedulerConnection, 'id'>);
            }
            setShowModal(false);
        }
    };

    const handleTestConnection = async () => {
        if (!editingConn.baseUrl || !editingConn.token) return;
        
        setTestStatus('testing');
        setTestErrorMsg('');
        try {
            const url = `${editingConn.baseUrl}/projects?pageNo=1&pageSize=1`;
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': editingConn.token }
            });
            const result = await response.json();
            
            if (result.code === 0) {
                setTestStatus('success');
            } else {
                setTestStatus('failed');
                setTestErrorMsg(result.msg || '连接失败');
            }
        } catch (err: any) {
            setTestStatus('failed');
            setTestErrorMsg(err.message || '连接失败');
        }
        
        setTimeout(() => {
            setTestStatus('none');
            setTestErrorMsg('');
        }, 5000);
    };

    const isFormValid = !!(editingConn.name && editingConn.baseUrl && editingConn.token);

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                message={lang === 'zh' ? '确定要删除这个连接吗？' : 'Are you sure you want to delete this connection?'}
                confirmText={lang === 'zh' ? '删除' : 'Delete'}
                cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
                type="danger"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <Database className="mr-3 text-blue-600" />
                    {lang === 'zh' ? 'DS 服务器管理' : 'DS Server Manager'}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleAddNew}
                        className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        {lang === 'zh' ? '新建连接' : 'New Connection'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {connections.map(conn => (
                            <Tooltip key={conn.id} content={conn.name} position="top">
                                <div
                                    className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] w-72"
                                    onClick={() => onSelect(conn)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                            <Server size={24} />
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEdit(conn, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={18} /></button>
                                            <button onClick={(e) => handleDeleteClick(conn.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{conn.name}</h3>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-12 text-xs font-bold uppercase opacity-70">URL</span>
                                            <span className="truncate flex-1 text-xs font-mono">{conn.baseUrl}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-12 text-xs font-bold uppercase opacity-70">API</span>
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${conn.apiVersion === 'v3.4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {conn.apiVersion || 'v3.2'}
                                            </span>
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
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{lang === 'zh' ? '新建连接' : 'New Connection'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-3">{lang === 'zh' ? '名称' : 'Name'}</div>
                            <div className="col-span-5">Base URL</div>
                            <div className="col-span-2">API</div>
                            <div className="col-span-2 text-right">{lang === 'zh' ? '操作' : 'Actions'}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {connections.map(conn => (
                                <div
                                    key={conn.id}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => onSelect(conn)}
                                >
                                    <div className="col-span-3 flex items-center space-x-3">
                                        <Server size={18} className="text-blue-500" />
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{conn.name}</span>
                                    </div>
                                    <div className="col-span-5 text-sm text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
                                        {conn.baseUrl}
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${conn.apiVersion === 'v3.4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {conn.apiVersion || 'v3.2'}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex justify-end space-x-2">
                                        <button onClick={(e) => handleEdit(conn, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => handleDeleteClick(conn.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {connections.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{lang === 'zh' ? '暂无连接，点击上方按钮添加' : 'No connections, click button above to add'}</div>}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editingConn.id ? (lang === 'zh' ? '编辑连接' : 'Edit Connection') : (lang === 'zh' ? '新建连接' : 'New Connection')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {lang === 'zh' ? '连接名称' : 'Connection Name'} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConn.name || ''}
                                    onChange={e => setEditingConn({ ...editingConn, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    placeholder={lang === 'zh' ? '例如：生产环境' : 'e.g. Production'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Base URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConn.baseUrl || ''}
                                    onChange={e => setEditingConn({ ...editingConn, baseUrl: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                                    placeholder="http://localhost:12345/dolphinscheduler"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Token <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={editingConn.token || ''}
                                    onChange={e => setEditingConn({ ...editingConn, token: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                                    placeholder={lang === 'zh' ? '从 DS 安全中心获取' : 'Get from DS Security Center'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API {lang === 'zh' ? '版本' : 'Version'}
                                </label>
                                <select
                                    value={editingConn.apiVersion || 'v3.2'}
                                    onChange={e => setEditingConn({ ...editingConn, apiVersion: e.target.value as DolphinSchedulerApiVersion })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                >
                                    <option value="v3.2">v3.2.x / v3.3.x</option>
                                    <option value="v3.4">v3.4.x+</option>
                                </select>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !isFormValid}
                                className={`flex items-center space-x-2 text-sm font-medium ${testStatus === 'success' ? 'text-green-600' : testStatus === 'failed' ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={16} /> : <Power size={16} />}
                                <span>
                                    {testStatus === 'testing' ? (lang === 'zh' ? '测试中...' : 'Testing...') :
                                        testStatus === 'success' ? (lang === 'zh' ? '连接成功' : 'Success') :
                                            testStatus === 'failed' ? (testErrorMsg || (lang === 'zh' ? '连接失败' : 'Failed')) :
                                                (lang === 'zh' ? '测试连接' : 'Test Connection')}
                                </span>
                            </button>
                            <div className="flex space-x-3">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    {lang === 'zh' ? '取消' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!isFormValid}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                >
                                    {lang === 'zh' ? '保存' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
