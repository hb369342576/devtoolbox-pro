import React from 'react';
import {
    ArrowLeft, Search, RefreshCw, Loader2, Database,
    Plus, Edit, Trash2, Server, Eye, Copy
} from 'lucide-react';
import { DolphinSchedulerConnection } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { Tooltip } from '../common/Tooltip';
import { useTranslation } from "react-i18next";
import { useDataSourceCenter } from './hooks/useDataSourceCenter';
import { DataSourceViewModal } from './components/DataSourceViewModal';
import { DataSourceEditModal } from './components/DataSourceEditModal';

interface DataSourceCenterProps {
    connection: DolphinSchedulerConnection;
    onBack: () => void;
}

export const DataSourceCenter: React.FC<DataSourceCenterProps> = ({
    connection,
    onBack
}) => {
    const { t } = useTranslation();
    const {
        loading, searchTerm, setSearchTerm, pageNo, setPageNo, total, totalPages,
        filteredDataSources,
        confirmDelete, setConfirmDelete, viewModal, setViewModal, editModal, setEditModal,
        formData, setFormData, saving,
        fetchDataSources, handleSearch, handleDelete, handleCopy, openEditModal, handleSave
    } = useDataSourceCenter(connection);

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

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={t('dolphinScheduler.confirmDelete')}
                message={t('dolphinScheduler.deleteDatasourceConfirmDe')}
                confirmText={t('dolphinScheduler.delete')}
                cancelText={t('dolphinScheduler.cancel')}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, id: 0, name: '' })}
                type="danger"
            />

            <DataSourceViewModal
                isOpen={viewModal.isOpen}
                dataSource={viewModal.dataSource}
                onClose={() => setViewModal({ isOpen: false, dataSource: null })}
            />

            <DataSourceEditModal
                isOpen={editModal.isOpen}
                isEdit={editModal.isEdit}
                formData={formData}
                setFormData={setFormData}
                saving={saving}
                onClose={() => { setEditModal({ isOpen: false, dataSource: null, isEdit: false }); setFormData({}); }}
                onSave={handleSave}
            />

            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <Tooltip content={t('dolphinScheduler.backToProjects')} position="right">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>
                    </Tooltip>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                            <Server className="mr-3 text-green-500" />
                            {t('dolphinScheduler.dataSourceCenter')}
                        </h2>
                        <p className="text-xs text-slate-500">{connection.name}</p>
                    </div>
                </div>
                <Tooltip content={t('dolphinScheduler.refresh')} position="bottom">
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
                            placeholder={t('dolphinScheduler.searchDatasources')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {t('dolphinScheduler.TotalDatasources', { count: total })}
                    </span>
                </div>
                <button
                    onClick={() => openEditModal()}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center transition-colors"
                >
                    <Plus size={18} className="mr-2" />
                    {t('dolphinScheduler.createDataSource')}
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
                                    <th className="w-40 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.name')}</th>
                                    <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.type')}</th>
                                    <th className="w-32 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.description')}</th>
                                    <th className="w-44 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.created')}</th>
                                    <th className="w-44 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.updated')}</th>
                                    <th className="w-32 px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dolphinScheduler.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800/40">
                                {filteredDataSources.map((ds, idx) => (
                                    <tr
                                        key={ds.id}
                                        className="group border-b border-slate-100 dark:border-slate-700/40 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">
                                            {(pageNo - 1) * 20 + idx + 1}
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
                                                <Tooltip content={t('dolphinScheduler.view')} position="top">
                                                    <button
                                                        onClick={() => setViewModal({ isOpen: true, dataSource: ds })}
                                                        className="p-1 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 rounded-md text-blue-400 transition-colors"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={t('dolphinScheduler.edit')} position="top">
                                                    <button
                                                        onClick={() => openEditModal(ds)}
                                                        className="p-1 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 rounded-md text-slate-400 transition-colors"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={t('dolphinScheduler.copy')} position="top">
                                                    <button
                                                        onClick={() => handleCopy(ds)}
                                                        className="p-1 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 rounded-md text-slate-400 transition-colors"
                                                    >
                                                        <Copy size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={t('dolphinScheduler.delete')} position="top">
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
                                            {t('dolphinScheduler.noDatasourcesFound')}
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
                        {t('dolphinScheduler.prev')}
                    </button>
                    <span className="text-sm text-slate-500">{pageNo} / {totalPages}</span>
                    <button
                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                        disabled={pageNo === totalPages}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {t('dolphinScheduler.next')}
                    </button>
                </div>
            )}
        </div>
    );
};
