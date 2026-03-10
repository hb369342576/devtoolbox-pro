import React, { useState } from 'react';
import {
    ArrowLeft, Search, RefreshCw, Upload, Download,
    HardDrive, Folder, ChevronRight, Trash2, FolderPlus, FilePlus, Loader2
} from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useToast } from '../../common/Toast';
import { Tooltip } from '../../common/Tooltip';
import { ConfirmModal } from '../../common/ConfirmModal';

import { useResourceCenterData } from './useResourceCenterData';
import { ResourceTable } from './ResourceTable';
import { CreateResourceModal, RenameResourceModal, EditFileModal } from './ResourceModals';
import { ResourceCenterProps, CreateModalState, RenameModalState, EditFileModalState, ConfirmDeleteState, DSResource } from './types';

export const ResourceCenter: React.FC<ResourceCenterProps> = ({
    connection,
    onBack
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    // 集成 Hook 状态和回调
    const data = useResourceCenterData(connection);

    // 模态框状态
    const [createModal, setCreateModal] = useState<CreateModalState>({ isOpen: false, type: 'folder' });
    const [renameModal, setRenameModal] = useState<RenameModalState>({ isOpen: false, resource: null });
    const [editFileModal, setEditFileModal] = useState<EditFileModalState>({ isOpen: false, resource: null, content: '', loading: false, saving: false });
    const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ isOpen: false, ids: [], names: [] });

    // 删除前置逻辑
    const handleDeleteSingleClick = async (resource: DSResource, e: React.MouseEvent) => {
        e.stopPropagation();
        if (resource.directory) {
            const isEmpty = await data.checkFolderEmpty(resource.fullName);
            if (!isEmpty) {
                toast({
                    title: t('dolphinScheduler.cannotDelete'),
                    description: t('dolphinScheduler.folderResourceAliasIsNotE'),
                    variant: 'destructive'
                });
                return;
            }
        }
        setConfirmDelete({ isOpen: true, ids: [resource.fullName], names: [resource.alias] });
    };

    const handleDeleteConfirm = () => {
        data.handleDelete(confirmDelete.ids);
        setConfirmDelete({ isOpen: false, ids: [], names: [] });
    };

    return (
        <div className="h-full flex flex-col">
            {/* 删除确认模态框 */}
            <ConfirmModal
                show={confirmDelete.isOpen}
                title={t('dolphinScheduler.confirmDelete')}
                message={t('dolphinScheduler.deleteConfirmDeleteNamesJ', { names: confirmDelete.names.join(', ') })}
                confirmText={t('dolphinScheduler.delete')}
                cancelText={t('dolphinScheduler.cancel')}
                onConfirm={handleDeleteConfirm}
                onClose={() => setConfirmDelete({ isOpen: false, ids: [], names: [] })}
                type="danger"
            />

            <CreateResourceModal 
                isOpen={createModal.isOpen} 
                type={createModal.type} 
                onClose={() => setCreateModal({ isOpen: false, type: 'folder' })} 
                onCreateFolder={data.handleCreateFolder}
                onCreateFile={data.handleCreateFile}
            />

            <RenameResourceModal
                isOpen={renameModal.isOpen}
                resource={renameModal.resource}
                onClose={() => setRenameModal({ isOpen: false, resource: null })}
                onRename={data.handleRename}
            />

            <EditFileModal
                isOpen={editFileModal.isOpen}
                resource={editFileModal.resource}
                onClose={() => setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false })}
                onGetContent={data.handleGetFileContent}
                onSave={data.handleSaveFileContent}
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
                            <HardDrive className="mr-3 text-amber-500" />
                            {t('dolphinScheduler.resourceCenter')}
                        </h2>
                        <p className="text-xs text-slate-500">{connection.name}</p>
                    </div>
                </div>
                <Tooltip content={t('dolphinScheduler.refresh')} position="bottom">
                    <button onClick={data.fetchResources} disabled={data.loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
                        <RefreshCw size={18} className={`text-slate-600 dark:text-slate-400 ${data.loading ? 'animate-spin' : ''}`} />
                    </button>
                </Tooltip>
            </div>

            {/* 搜索栏和全局操作按钮 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('dolphinScheduler.searchResources')}
                            value={data.searchTerm}
                            onChange={e => data.setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && data.fetchResources()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {data.selectedIds.length > 0 ? (t('dolphinScheduler.SelectedIdsLengthSelected', { count: data.selectedIds.length })) : (t('dolphinScheduler.TotalItems', { count: data.total }))}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setCreateModal({ isOpen: true, type: 'folder' })}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                    >
                        <FolderPlus size={16} className="mr-1" />
                        {t('dolphinScheduler.newFolder')}
                    </button>
                    <button
                        onClick={() => setCreateModal({ isOpen: true, type: 'file' })}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                    >
                        <FilePlus size={16} className="mr-1" />
                        {t('dolphinScheduler.newFile')}
                    </button>
                    <button
                        onClick={data.handleUpload}
                        disabled={data.uploading}
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors disabled:opacity-50"
                    >
                        {data.uploading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
                        {t('dolphinScheduler.upload')}
                    </button>
                    {data.selectedIds.length > 0 && (
                        <>
                            <button
                                onClick={data.handleBatchDownload}
                                disabled={data.downloading}
                                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors disabled:opacity-50"
                            >
                                {data.downloading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Download size={16} className="mr-1" />}
                                {t('dolphinScheduler.download')}
                            </button>
                            <button
                                onClick={() => {
                                    const fileOnly = data.resources.filter(r => data.selectedIds.includes(r.fullName) && !r.directory);
                                    if (fileOnly.length === 0) {
                                        toast({ title: t('dolphinScheduler.foldersCannotBeBatchDelet'), variant: 'destructive' });
                                        return;
                                    }
                                    setConfirmDelete({ isOpen: true, ids: fileOnly.map(r => r.fullName), names: fileOnly.map(r => r.alias) });
                                }}
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                            >
                                <Trash2 size={16} className="mr-1" />
                                {t('dolphinScheduler.delete')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 面包屑导航 */}
            <div className="flex items-center space-x-1 mb-3 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                <Folder size={16} className="text-amber-500 mr-1" />
                {data.pathHistory.map((item, idx) => (
                    <React.Fragment key={item.fullName || 'root'}>
                        {idx > 0 && <ChevronRight size={16} className="text-slate-400" />}
                        <button
                            onClick={() => data.handlePathClick(item.fullName, idx)}
                            className={`px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded truncate max-w-[150px] ${idx === data.pathHistory.length - 1 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                            {item.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* 资源列表表格 */}
            <ResourceTable
                loading={data.loading}
                resources={data.resources}
                selectedIds={data.selectedIds}
                onSelectAll={data.handleSelectAll}
                onSelect={data.handleSelect}
                onNavigate={data.handleNavigate}
                onUploadSingle={data.handleUploadSingle}
                onEdit={(res, e) => { e.stopPropagation(); setEditFileModal({ isOpen: true, resource: res, content: '', loading: true, saving: false }); }}
                onDownloadSingle={(res, e) => { e.stopPropagation(); data.handleDownloadSingle(res); }}
                onRename={(res, e) => { e.stopPropagation(); setRenameModal({ isOpen: true, resource: res }); }}
                onDeleteSingle={handleDeleteSingleClick}
            />

            {/* 分页 */}
            {Math.ceil(data.total / data.pageSize) > 1 && (
                <div className="flex items-center justify-center space-x-4 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => data.setPageNo(p => Math.max(1, p - 1))}
                        disabled={data.pageNo === 1}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {t('dolphinScheduler.prev')}
                    </button>
                    <span className="text-sm text-slate-500">{data.pageNo} / {Math.ceil(data.total / data.pageSize)}</span>
                    <button
                        onClick={() => data.setPageNo(p => Math.min(Math.ceil(data.total / data.pageSize), p + 1))}
                        disabled={data.pageNo === Math.ceil(data.total / data.pageSize)}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {t('dolphinScheduler.next')}
                    </button>
                </div>
            )}
        </div>
    );
};
