import React, { useState, useEffect } from 'react';
import {
    ArrowRightLeft, Plus, Save, Trash2, ChevronLeft,
    LayoutGrid, List, ZoomIn, ZoomOut, Move, LayoutTemplate
} from 'lucide-react';
import { Language, DbConnection } from '../../types';
import { useFieldMappingStore } from './store';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DataSourceSelectorModal } from './components/DataSourceSelectorModal';
import { TableCard } from './components/TableCard';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { MappingModal } from './components/MappingModal';

export const FieldMappingTool: React.FC<{
    lang: Language;
    connections: DbConnection[];
    onNavigate: (id: string) => void;
}> = ({ lang, connections, onNavigate }) => {
    // Zustand Store
    const {
        profiles,
        activeProfile,
        viewMode,
        setViewMode,
        setActiveProfile,
        addProfile,
        deleteProfile,
        saveCurrentProfile,
    } = useFieldMappingStore();

    // Local UI state
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; profileId: string }>({
        isOpen: false,
        profileId: ''
    });

    const handleNewProfile = () => {
        const newProfile = {
            id: Date.now().toString(),
            name: lang === 'zh' ? '新映射项目' : 'New Project',
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

    // Profile List View
    if (!activeProfile) {
        return (
            <div className="h-full flex flex-col">
                <ConfirmModal
                    isOpen={confirmDelete.isOpen}
                    title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                    message={lang === 'zh' ? '确定要删除这个映射项目吗？' : 'Are you sure?'}
                    confirmText={lang === 'zh' ? '删除' : 'Delete'}
                    cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                    onConfirm={() => {
                        deleteProfile(confirmDelete.profileId);
                        setConfirmDelete({ isOpen: false, profileId: '' });
                    }}
                    onCancel={() => setConfirmDelete({ isOpen: false, profileId: '' })}
                    type="danger"
                />

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white flex items-center">
                        <ArrowRightLeft className="mr-3 text-indigo-600" />
                        {lang === 'zh' ? '可视化数据映射' : 'Visual Mapping'}
                    </h2>
                    <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600' : 'text-slate-400'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600' : 'text-slate-400'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                        <button
                            onClick={handleNewProfile}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center shadow-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus size={18} className="mr-2" />
                            {lang === 'zh' ? '新建项目' : 'New Project'}
                        </button>
                    </div>
                </div>

                {/* Profile Grid/List */}
                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setActiveProfile(p)}
                                    className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md text-left relative group cursor-pointer transition-all"
                                >
                                    <div className="flex justify-between mb-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                                            <ArrowRightLeft size={24} />
                                        </div>
                                        <div
                                            onClick={(e) => handleDeleteProfile(p.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white mb-2">{p.name}</h3>
                                    <div className="flex items-center text-xs text-slate-500 space-x-2">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                            {p.nodes?.length || 0} Nodes
                                        </span>
                                        <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}

                            {/* New Card */}
                            <div
                                onClick={handleNewProfile}
                                className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:shadow-md text-center cursor-pointer transition-all hover:border-indigo-500 flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full mb-3">
                                    <Plus size={32} />
                                </div>
                                <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-300">
                                    {lang === 'zh' ? '新建项目' : 'New Project'}
                                </h3>
                            </div>
                        </div>
                    ) : (
                        // List view (similar structure, omitted for brevity)
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700">
                            {/* List implementation */}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Editor View
    return (
        <div className="flex h-full gap-0 overflow-hidden relative">
            <DataSourceSelectorModal
                lang={lang}
                connections={connections}
                onNavigate={onNavigate}
            />

            <Sidebar
                lang={lang}
                connections={connections}
                activeProfile={activeProfile}
                onBack={() => setActiveProfile(null)}
                onSave={saveCurrentProfile}
            />

            <Canvas lang={lang} />

            <MappingModal lang={lang} />
        </div>
    );
};
