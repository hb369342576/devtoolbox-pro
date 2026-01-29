import React, { useState } from 'react';
import {
    Plus, Edit, Trash2, CheckCircle, X,
    FolderKanban, AlertCircle, RefreshCw, Power, CalendarClock
} from 'lucide-react';
import { Language, DolphinSchedulerConfig } from '../../types';
import { getTexts } from '../../locales';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

interface ProjectManagerProps {
    lang: Language;
    configs: DolphinSchedulerConfig[];
    onAdd: (config: Omit<DolphinSchedulerConfig, 'id'>) => void;
    onUpdate: (config: DolphinSchedulerConfig) => void;
    onDelete: (id: string) => void;
    onNavigate: (id: string) => void;
    onSelectProject: (config: DolphinSchedulerConfig) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
    lang,
    configs,
    onAdd,
    onUpdate,
    onDelete,
    onNavigate,
    onSelectProject
}) => {
    const t = getTexts(lang);
    const viewMode = useViewMode();
    const [showModal, setShowModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<DolphinSchedulerConfig>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
    const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');

    const handleAddNew = () => {
        setEditingConfig({
            name: '',
            baseUrl: 'http://localhost:12345/dolphinscheduler',
            token: '',
            projectCode: '',
            projectName: ''
        });
        setTestStatus('none');
        setShowModal(true);
    };

    const handleEdit = (config: DolphinSchedulerConfig, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingConfig({ ...config });
        setTestStatus('none');
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
        if (editingConfig.name && editingConfig.baseUrl && editingConfig.token) {
            if (editingConfig.id) {
                onUpdate(editingConfig as DolphinSchedulerConfig);
            } else {
                onAdd(editingConfig as Omit<DolphinSchedulerConfig, 'id'>);
            }
            setShowModal(false);
        }
    };

    const handleCardClick = (config: DolphinSchedulerConfig) => {
        onSelectProject(config);
        onNavigate('dolphin-task');
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        // 模拟测试连接
        setTimeout(() => {
            if (Math.random() > 0.2) {
                setTestStatus('success');
            } else {
                setTestStatus('failed');
            }
            setTimeout(() => setTestStatus('none'), 3000);
        }, 1500);
    };

    const isFormValid = !!(editingConfig.name && editingConfig.baseUrl && editingConfig.token);

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                message={lang === 'zh' ? '确定要删除这个项目配置吗？' : 'Are you sure you want to delete this project configuration?'}
                confirmText={lang === 'zh' ? '删除' : 'Delete'}
                cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
                type="danger"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <FolderKanban className="mr-3 text-blue-600" />
                    {lang === 'zh' ? '项目管理' : 'Project Manager'}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleAddNew}
                        className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        {lang === 'zh' ? '新建项目' : 'New Project'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {configs.map(config => (
                            <Tooltip key={config.id} content={config.name} position="top">
                                <div
                                    className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px]"
                                    onClick={() => handleCardClick(config)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            <CalendarClock size={24} />
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEdit(config, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={18} /></button>
                                            <button onClick={(e) => handleDeleteClick(config.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{config.name}</h3>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-20 text-xs font-bold uppercase opacity-70">Project</span>
                                            <span className="truncate flex-1 font-medium">{config.projectName || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-20 text-xs font-bold uppercase opacity-70">Code</span>
                                            <span className="truncate flex-1 font-mono">{config.projectCode || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-20 text-xs font-bold uppercase opacity-70">URL</span>
                                            <span className="truncate flex-1 text-xs">{config.baseUrl}</span>
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        ))}
                        <button
                            onClick={handleAddNew}
                            className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[200px]"
                        >
                            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{lang === 'zh' ? '新建项目' : 'New Project'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-3">{lang === 'zh' ? '名称' : 'Name'}</div>
                            <div className="col-span-3">{lang === 'zh' ? '项目名称' : 'Project Name'}</div>
                            <div className="col-span-2">{lang === 'zh' ? '编码' : 'Project Code'}</div>
                            <div className="col-span-3">Base URL</div>
                            <div className="col-span-1 text-right">{t.common.actions}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {configs.map(config => (
                                <div
                                    key={config.id}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => handleCardClick(config)}
                                >
                                    <div className="col-span-3 flex items-center space-x-3">
                                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                            <CalendarClock size={16} />
                                        </div>
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{config.name}</span>
                                    </div>
                                    <div className="col-span-3 text-sm text-slate-600 dark:text-slate-300 truncate">
                                        {config.projectName || '-'}
                                    </div>
                                    <div className="col-span-2 text-sm font-mono text-slate-500 dark:text-slate-400">
                                        {config.projectCode || '-'}
                                    </div>
                                    <div className="col-span-3 text-sm text-slate-500 dark:text-slate-400 truncate text-xs">
                                        {config.baseUrl}
                                    </div>
                                    <div className="col-span-1 flex justify-end space-x-2">
                                        <button onClick={(e) => handleEdit(config, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => handleDeleteClick(config.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {configs.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{t.common.noData}</div>}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editingConfig.id ? (lang === 'zh' ? '编辑项目配置' : 'Edit Project Config') : (lang === 'zh' ? '新建项目配置' : 'New Project Config')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {lang === 'zh' ? '配置名称' : 'Config Name'} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.name || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    placeholder={lang === 'zh' ? '例如：生产环境' : 'e.g. Production Env'}
                                />
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    DolphinScheduler API Base URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.baseUrl || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    placeholder="http://localhost:12345/dolphinscheduler"
                                />
                            </div>

                            {/* Token */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Token <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.token || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, token: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    placeholder="API Token"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Project Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {lang === 'zh' ? 'DS 项目名称' : 'DS Project Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingConfig.projectName || ''}
                                        onChange={e => setEditingConfig({ ...editingConfig, projectName: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                        placeholder="project_name"
                                    />
                                </div>
                                {/* Project Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {lang === 'zh' ? 'DS 项目编码' : 'DS Project Code'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingConfig.projectCode || ''}
                                        onChange={e => setEditingConfig({ ...editingConfig, projectCode: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                        placeholder="123456789"
                                    />
                                </div>
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
                                            testStatus === 'failed' ? (lang === 'zh' ? '连接失败' : 'Failed') :
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
