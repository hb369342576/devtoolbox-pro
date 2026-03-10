import React, { useState } from 'react';
import { ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../common/ConfirmModal';
import { Tooltip } from '../../common/Tooltip';
import { ViewModeToggle } from '../../common/ViewModeToggle';
import { useViewMode } from '../../../store/globalStore';
import { MappingProfile } from '../../../types';

interface MappingProjectListProps {
    profiles: MappingProfile[];
    setActiveProfile: (profile: MappingProfile) => void;
    addProfile: (profile: MappingProfile) => void;
    deleteProfile: (id: string) => void;
}

export const MappingProjectList: React.FC<MappingProjectListProps> = ({
    profiles, setActiveProfile, addProfile, deleteProfile
}) => {
    const { t } = useTranslation();
    const viewMode = useViewMode();
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; profileId: string }>({
        isOpen: false,
        profileId: ''
    });

    const handleNewProfile = () => {
        const newProfile: MappingProfile = {
            id: Date.now().toString(),
            name: t('fieldMapping.newProject', { defaultValue: '新建项目' }),
            updatedAt: Date.now(),
            nodes: [],
            links: []
        };
        addProfile(newProfile);
        setActiveProfile(newProfile);
    };

    const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete({ isOpen: true, profileId: id });
    };

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={t('common.confirmDelete', { defaultValue: '确认删除' })}
                message={t('fieldMapping.deleteConfirm', { defaultValue: '确认删除这个项目吗？' })}
                confirmText={t('common.delete', { defaultValue: '删除' })}
                cancelText={t('common.cancel', { defaultValue: '取消' })}
                onConfirm={() => {
                    deleteProfile(confirmDelete.profileId);
                    setConfirmDelete({ isOpen: false, profileId: '' });
                }}
                onCancel={() => setConfirmDelete({ isOpen: false, profileId: '' })}
                type="danger"
            />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold dark:text-white flex items-center text-slate-800">
                    <ArrowRightLeft className="mr-3 text-indigo-600" />
                    {t('fieldMapping.title', { defaultValue: '字段映射工具' })}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleNewProfile}
                        className="min-w-[140px] px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('fieldMapping.newProject', { defaultValue: '新建项目' })}
                    </button>
                </div>
            </div>

            {/* Profile Grid */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {profiles.map((profile) => (
                            <Tooltip key={profile.id} content={profile.name} position="top">
                                <div
                                    onClick={() => setActiveProfile(profile)}
                                    className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/30 to-transparent dark:from-purple-900/20 dark:via-pink-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10 box-border h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 group-hover:scale-110 transition-transform duration-300">
                                                <ArrowRightLeft size={24} />
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteProfile(profile.id, e)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                            {profile.name}
                                        </h3>
                                        <div className="mt-auto flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                            <span>{profile.nodes?.length || 0} {t('fieldMapping.nodesCount', { defaultValue: '个节点' })}</span>
                                            <span>{new Date(profile.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        ))}

                        <div
                            onClick={handleNewProfile}
                            className="w-[288px] h-[200px] flex-shrink-0 group p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center"
                        >
                            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {t('fieldMapping.newProject', { defaultValue: '新建项目' })}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-500 uppercase sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shrink-0">
                            <div className="col-span-8">{t('fieldMapping.projectName', { defaultValue: '项目名称' })}</div>
                            <div className="col-span-2">{t('fieldMapping.updateTime', { defaultValue: '更新时间' })}</div>
                            <div className="col-span-2 text-right">{t('common.actions', { defaultValue: '操作' })}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setActiveProfile(p)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer items-center"
                                >
                                    <div className="col-span-8 font-medium text-slate-800 dark:text-white flex items-center">
                                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mr-3 flex-shrink-0">
                                            <ArrowRightLeft size={16} />
                                        </div>
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    <div className="col-span-2 text-xs text-slate-500 font-mono">
                                        {new Date(p.updatedAt).toLocaleDateString()}
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <button
                                            onClick={(e) => handleDeleteProfile(p.id, e)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
