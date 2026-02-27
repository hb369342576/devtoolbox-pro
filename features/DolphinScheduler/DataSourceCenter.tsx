import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Search, RefreshCw, Loader2, Database,
    Plus, Edit, Trash2, Server, Eye, Copy, X
} from 'lucide-react';
import { Language, DolphinSchedulerConnection } from '../../types';
import { httpFetch } from '../../utils/http';
import { useToast } from '../../components/ui/Toast';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface DataSourceCenterProps {
    lang: Language;
    connection: DolphinSchedulerConnection;
    onBack: () => void;
}

interface DSDataSource {
    id: number;
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    userName?: string;
    connectionParams?: string;
    note?: string;
    createTime?: string;
    updateTime?: string;
}

export const DataSourceCenter: React.FC<DataSourceCenterProps> = ({
    lang,
    connection,
    onBack
}) => {
    const { toast } = useToast();
    const [dataSources, setDataSources] = useState<DSDataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    // 删除确认模态框
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number; name: string }>({ isOpen: false, id: 0, name: '' });

    // 查看详情模态框
    const [viewModal, setViewModal] = useState<{ isOpen: boolean; dataSource: DSDataSource | null }>({ isOpen: false, dataSource: null });

    // 创建/编辑模态框
    const [editModal, setEditModal] = useState<{ isOpen: boolean; dataSource: DSDataSource | null; isEdit: boolean }>({ isOpen: false, dataSource: null, isEdit: false });
    const [formData, setFormData] = useState<Partial<DSDataSource>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDataSources();
    }, [connection, pageNo]);

    const fetchDataSources = async () => {
        setLoading(true);
        try {
            const searchVal = searchTerm ? `&searchVal=${encodeURIComponent(searchTerm)}` : '';
            const url = `${connection.baseUrl}/datasources?pageNo=${pageNo}&pageSize=${pageSize}${searchVal}`;
            
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': connection.token }
            });
            
            const responseText = await response.text();
            if (responseText.trim().startsWith('<')) {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: 'API error', variant: 'destructive' });
                return;
            }
            
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                const dataSourceList = result.data?.totalList || result.data || [];
                setDataSources(Array.isArray(dataSourceList) ? dataSourceList : []);
                setTotal(result.data?.total || dataSourceList.length || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('DataSources fetch error:', err);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPageNo(1);
        fetchDataSources();
    };

    // 删除数据源
    const handleDelete = async () => {
        try {
            const url = `${connection.baseUrl}/datasources/${confirmDelete.id}`;
            const response = await httpFetch(url, {
                method: 'DELETE',
                headers: { 'token': connection.token }
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '删除成功' : 'Deleted successfully', variant: 'success' });
                fetchDataSources();
            } else {
                toast({ title: lang === 'zh' ? '删除失败' : 'Delete failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '删除失败' : 'Delete failed', description: err.message, variant: 'destructive' });
        } finally {
            setConfirmDelete({ isOpen: false, id: 0, name: '' });
        }
    };

    // 复制数据源名称
    const handleCopy = async (ds: DSDataSource) => {
        try {
            await navigator.clipboard.writeText(ds.name);
            toast({ title: lang === 'zh' ? '已复制名称' : 'Name copied', variant: 'success' });
        } catch {
            toast({ title: lang === 'zh' ? '复制失败' : 'Copy failed', variant: 'destructive' });
        }
    };

    // 打开编辑模态框
    const openEditModal = (ds?: DSDataSource) => {
        if (ds) {
            setFormData({ ...ds });
            setEditModal({ isOpen: true, dataSource: ds, isEdit: true });
        } else {
            setFormData({ type: 'MYSQL', name: '', host: '', port: 3306, database: '', userName: '', note: '' });
            setEditModal({ isOpen: true, dataSource: null, isEdit: false });
        }
    };

    // 保存数据源（创建/编辑）
    const handleSave = async () => {
        if (!formData.name?.trim()) {
            toast({ title: lang === 'zh' ? '请输入名称' : 'Please enter name', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const isEdit = editModal.isEdit && editModal.dataSource;
            const url = isEdit ? `${connection.baseUrl}/datasources/${editModal.dataSource!.id}` : `${connection.baseUrl}/datasources`;
            
            const body = new URLSearchParams();
            body.append('name', formData.name || '');
            body.append('type', formData.type || 'MYSQL');
            body.append('host', formData.host || '');
            body.append('port', String(formData.port || 3306));
            body.append('database', formData.database || '');
            body.append('userName', formData.userName || '');
            body.append('note', formData.note || '');
            if (formData.connectionParams) body.append('connectionParams', formData.connectionParams);

            const response = await httpFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? (isEdit ? '更新成功' : '创建成功') : (isEdit ? 'Updated' : 'Created'), variant: 'success' });
                setEditModal({ isOpen: false, dataSource: null, isEdit: false });
                setFormData({});
                fetchDataSources();
            } else {
                toast({ title: lang === 'zh' ? '保存失败' : 'Save failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '保存失败' : 'Save failed', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const getDbTypeIcon = (type: string) => {
        const typeUpper = type?.toUpperCase() || '';
        switch (typeUpper) {
            case 'MYSQL': return <Database size={18} className="text-blue-500" />;
            case 'POSTGRESQL': return <Database size={18} className="text-indigo-500" />;
            case 'ORACLE': return <Database size={18} className="text-red-500" />;
            case 'SQLSERVER': return <Database size={18} className="text-purple-500" />;
            case 'CLICKHOUSE': return <Database size={18} className="text-yellow-500" />;
            case 'DORIS': return <Database size={18} className="text-green-500" />;
            default: return <Database size={18} className="text-slate-400" />;
        }
    };

    const totalPages = Math.ceil(total / pageSize);
    const filteredDataSources = dataSources.filter(ds =>
        ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const dbTypes = ['MYSQL', 'POSTGRESQL', 'ORACLE', 'SQLSERVER', 'CLICKHOUSE', 'DORIS', 'HIVE', 'SPARK', 'PRESTO'];

    return (
        <div className="h-full flex flex-col">
            {/* 删除确认模态框 */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                message={lang === 'zh' ? `确定要删除数据源 "${confirmDelete.name}" 吗？` : `Delete datasource "${confirmDelete.name}"?`}
                confirmText={lang === 'zh' ? '删除' : 'Delete'}
                cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, id: 0, name: '' })}
                type="danger"
            />

            {/* 查看详情模态框 */}
            {viewModal.isOpen && viewModal.dataSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                                <Eye className="mr-2 text-blue-500" size={20} />
                                {lang === 'zh' ? '数据源详情' : 'DataSource Details'}
                            </h3>
                            <button onClick={() => setViewModal({ isOpen: false, dataSource: null })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '名称' : 'Name'}:</span>
                                <span className="col-span-2 font-medium text-slate-800 dark:text-white">{viewModal.dataSource.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '类型' : 'Type'}:</span>
                                <span className="col-span-2 font-medium text-slate-800 dark:text-white">{viewModal.dataSource.type}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '主机' : 'Host'}:</span>
                                <span className="col-span-2 font-mono text-slate-800 dark:text-white">{viewModal.dataSource.host || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '端口' : 'Port'}:</span>
                                <span className="col-span-2 font-mono text-slate-800 dark:text-white">{viewModal.dataSource.port || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '数据库' : 'Database'}:</span>
                                <span className="col-span-2 font-mono text-slate-800 dark:text-white">{viewModal.dataSource.database || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '用户名' : 'Username'}:</span>
                                <span className="col-span-2 font-mono text-slate-800 dark:text-white">{viewModal.dataSource.userName || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '描述' : 'Note'}:</span>
                                <span className="col-span-2 text-slate-800 dark:text-white">{viewModal.dataSource.note || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '创建时间' : 'Created'}:</span>
                                <span className="col-span-2 text-slate-600 dark:text-slate-400">{viewModal.dataSource.createTime || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">{lang === 'zh' ? '更新时间' : 'Updated'}:</span>
                                <span className="col-span-2 text-slate-600 dark:text-slate-400">{viewModal.dataSource.updateTime || '-'}</span>
                            </div>
                            {viewModal.dataSource.connectionParams && (
                                <div>
                                    <span className="text-slate-500 block mb-1">{lang === 'zh' ? '连接参数' : 'Connection Params'}:</span>
                                    <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs font-mono overflow-x-auto">{viewModal.dataSource.connectionParams}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 创建/编辑模态框 */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                            {editModal.isEdit ? <Edit className="mr-2 text-blue-500" size={20} /> : <Plus className="mr-2 text-green-500" size={20} />}
                            {editModal.isEdit ? (lang === 'zh' ? '编辑数据源' : 'Edit DataSource') : (lang === 'zh' ? '创建数据源' : 'Create DataSource')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '名称' : 'Name'} *</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '类型' : 'Type'}</label>
                                <select
                                    value={formData.type || 'MYSQL'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    {dbTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '主机' : 'Host'}</label>
                                    <input
                                        type="text"
                                        value={formData.host || ''}
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '端口' : 'Port'}</label>
                                    <input
                                        type="number"
                                        value={formData.port || ''}
                                        onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 3306 })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '数据库' : 'Database'}</label>
                                <input
                                    type="text"
                                    value={formData.database || ''}
                                    onChange={e => setFormData({ ...formData, database: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '用户名' : 'Username'}</label>
                                <input
                                    type="text"
                                    value={formData.userName || ''}
                                    onChange={e => setFormData({ ...formData, userName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{lang === 'zh' ? '描述' : 'Note'}</label>
                                <textarea
                                    value={formData.note || ''}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => { setEditModal({ isOpen: false, dataSource: null, isEdit: false }); setFormData({}); }}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                                {lang === 'zh' ? '保存' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <Tooltip content={lang === 'zh' ? '返回项目列表' : 'Back to projects'} position="right">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>
                    </Tooltip>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                            <Server className="mr-3 text-green-500" />
                            {lang === 'zh' ? '数据源中心' : 'DataSource Center'}
                        </h2>
                        <p className="text-xs text-slate-500">{connection.name}</p>
                    </div>
                </div>
                <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                    <button onClick={fetchDataSources} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
                        <RefreshCw size={18} className={`text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </Tooltip>
            </div>

            {/* 搜索栏和创建按钮 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={lang === 'zh' ? '搜索数据源...' : 'Search datasources...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {lang === 'zh' ? `共 ${total} 个数据源` : `${total} datasources`}
                    </span>
                </div>
                <button
                    onClick={() => openEditModal()}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center transition-colors"
                >
                    <Plus size={18} className="mr-2" />
                    {lang === 'zh' ? '创建数据源' : 'Create DataSource'}
                </button>
            </div>

            {/* 数据源列表 */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-green-500" />
                    </div>
                ) : (
                    <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-800/60">
                                    <th className="w-11 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">#</th>
                                    <th className="w-40 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '名称' : 'Name'}</th>
                                    <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '类型' : 'Type'}</th>
                                    <th className="w-32 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '描述' : 'Description'}</th>
                                    <th className="w-44 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '创建时间' : 'Created'}</th>
                                    <th className="w-44 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '更新时间' : 'Updated'}</th>
                                    <th className="w-32 px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'zh' ? '操作' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800/40">
                                {filteredDataSources.map((ds, idx) => (
                                    <tr
                                        key={ds.id}
                                        className="group border-b border-slate-100 dark:border-slate-700/40 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">
                                            {(pageNo - 1) * pageSize + idx + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span className="flex-shrink-0">{getDbTypeIcon(ds.type)}</span>
                                                <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{ds.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 uppercase tracking-wide">
                                                {ds.type}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {ds.note || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                                            {ds.createTime || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                                            {ds.updateTime || '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-end space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Tooltip content={lang === 'zh' ? '查看' : 'View'} position="top">
                                                    <button
                                                        onClick={() => setViewModal({ isOpen: true, dataSource: ds })}
                                                        className="p-1 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 rounded-md text-blue-400 transition-colors"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={lang === 'zh' ? '编辑' : 'Edit'} position="top">
                                                    <button
                                                        onClick={() => openEditModal(ds)}
                                                        className="p-1 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 rounded-md text-slate-400 transition-colors"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={lang === 'zh' ? '复制名称' : 'Copy'} position="top">
                                                    <button
                                                        onClick={() => handleCopy(ds)}
                                                        className="p-1 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 rounded-md text-slate-400 transition-colors"
                                                    >
                                                        <Copy size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={lang === 'zh' ? '删除' : 'Delete'} position="top">
                                                    <button
                                                        onClick={() => setConfirmDelete({ isOpen: true, id: ds.id, name: ds.name })}
                                                        className="p-1 hover:bg-red-500/10 dark:hover:bg-red-500/15 rounded-md text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDataSources.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                            {lang === 'zh' ? '暂无数据源' : 'No datasources found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setPageNo(p => Math.max(1, p - 1))}
                        disabled={pageNo === 1}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '上一页' : 'Prev'}
                    </button>
                    <span className="text-sm text-slate-500">{pageNo} / {totalPages}</span>
                    <button
                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                        disabled={pageNo === totalPages}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '下一页' : 'Next'}
                    </button>
                </div>
            )}
        </div>
    );
};
