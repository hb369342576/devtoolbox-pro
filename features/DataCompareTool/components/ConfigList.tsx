import React from 'react';
import { GitCompare, Plus, Edit, Trash2 } from 'lucide-react';
import { Language } from '../../../types';
import { SavedCompareConfig } from '../types';
import { getTexts } from '../../../locales';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { ViewModeToggle } from '../../../components/shared/ViewModeToggle';
import { useViewMode } from '../../../store/globalStore';
import { Tooltip } from '../../../components/ui/Tooltip';

interface ConfigListProps {
    lang: Language;
    configs: SavedCompareConfig[];
    onNew: () => void;
    onEdit: (config: SavedCompareConfig) => void;
    onDelete: (id: string) => void;
    confirmDelete: { isOpen: boolean; id: string };
    setConfirmDelete: (state: { isOpen: boolean; id: string }) => void;
}

/**
 * 配置列表视图组件
 * 显示所有保存的对比配置
 */
export const ConfigList: React.FC<ConfigListProps> = ({
    lang,
    configs,
    onNew,
    onEdit,
    onDelete,
    confirmDelete,
    setConfirmDelete
}) => {
    const t = getTexts(lang);
    const viewMode = useViewMode();

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                message={lang === 'zh' ? '确定要删除这个对比配置吗？' : 'Are you sure you want to delete this config?'}
                confirmText={lang === 'zh' ? '删除' : 'Delete'}
                cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                onConfirm={() => {
                    onDelete(confirmDelete.id);
                    setConfirmDelete({ isOpen: false, id: '' });
                }}
                onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
                type="danger"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <GitCompare className="mr-3 text-indigo-600" size={24} />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.dataCompare.title}</h2>
                </div>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={onNew}
                        className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center space-x-2 shadow-lg transition-colors"
                    >
                        <Plus size={18} />
                        <span>{lang === 'zh' ? '新建对比' : 'New Compare'}</span>
                    </button>
                </div>
            </div>

            {/* Config Cards Grid/List */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Existing Configs */}
                    {configs.map(config => (
                        <Tooltip key={config.id} content={config.name} position="top">
                            <div
                                className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px]"
                                onDoubleClick={() => onEdit(config)}
                            >
                                {/* Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50/30 to-transparent dark:from-indigo-900/20 dark:via-purple-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{config.name}</h3>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(config);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete({ isOpen: true, id: config.id });
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-slate-600 dark:text-slate-400">
                                            <span className="font-medium mr-2">{lang === 'zh' ? '源端:' : 'Source:'}</span>
                                            <span className="truncate">{config.sourceConfig.table || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-slate-600 dark:text-slate-400">
                                            <span className="font-medium mr-2">{lang === 'zh' ? '目标:' : 'Target:'}</span>
                                            <span className="truncate">{config.targetConfig.table || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tooltip>
                    ))}

                    {/* Add New Card */}
                    <button
                        onClick={onNew}
                        className="group bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center"
                    >
                        <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {lang === 'zh' ? '新建对比配置' : 'New Compare Config'}
                        </span>
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4">{lang === 'zh' ? '配置名称' : 'Config Name'}</div>
                        <div className="col-span-3">{lang === 'zh' ? '源端表' : 'Source Table'}</div>
                        <div className="col-span-3">{lang === 'zh' ? '目标表' : 'Target Table'}</div>
                        <div className="col-span-2 text-right">{lang === 'zh' ? '操作' : 'Actions'}</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {configs.map(config => (
                            <div
                                key={config.id}
                                onDoubleClick={() => onEdit(config)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                            >
                                <div className="col-span-4">
                                    <span className="font-medium text-slate-800 dark:text-white truncate">{config.name}</span>
                                </div>
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 truncate">
                                    {config.sourceConfig.table || '-'}
                                </div>
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 truncate">
                                    {config.targetConfig.table || '-'}
                                </div>
                                <div className="col-span-2 flex justify-end space-x-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(config);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({ isOpen: true, id: config.id });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {configs.length === 0 && (
                            <div className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                {lang === 'zh' ? '暂无配置' : 'No configs'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
