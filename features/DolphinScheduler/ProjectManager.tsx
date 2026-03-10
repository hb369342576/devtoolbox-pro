import React, { useState } from 'react';
import {
    Plus, Edit, Trash2, CheckCircle, X,
    FolderKanban, AlertCircle, RefreshCw, Power, CalendarClock, LogIn, Activity
} from 'lucide-react';
import { Language, DolphinSchedulerConfig } from '../../types';
import { useTranslation } from "react-i18next";
import { useToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import { httpFetch } from '../../utils/http';
import { Tooltip } from '../common/Tooltip';
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
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<DolphinSchedulerConfig>>({});
    const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
    const [testErrorMsg, setTestErrorMsg] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAddNew = () => {
        setEditingConfig({
            name: '',
            baseUrl: '',
            token: '',
            projectName: '',
            projectCode: '',
            apiVersion: '3.0.0'
        });
        setIsEditing(true);
        setTestStatus('none');
        setTestErrorMsg('');
    };

    const handleEdit = (config: DolphinSchedulerConfig, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingConfig({ ...config });
        setIsEditing(true);
        setTestStatus('none');
        setTestErrorMsg('');
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteId) {
            onDelete(deleteId);
            setDeleteId(null);
        }
    };

    const handleSave = () => {
        if (!editingConfig.name || !editingConfig.baseUrl || !editingConfig.token) {
            toast({ title: t('common.pleaseFillRequiredFields'), variant: 'destructive' });
            return;
        }

        if (editingConfig.id) {
            onUpdate(editingConfig as DolphinSchedulerConfig);
        } else {
            onAdd(editingConfig as Omit<DolphinSchedulerConfig, 'id'>);
        }
        setIsEditing(false);
    };

    const handleCardClick = (config: DolphinSchedulerConfig) => {
        onSelectProject(config);
        onNavigate('tasks');
    };

    const handleTestConnection = async () => {
        if (!editingConfig.baseUrl || !editingConfig.token || !editingConfig.projectName) {
            toast({ title: t('common.pleaseFillRequiredFields'), variant: 'destructive' });
            return;
        }

        setTestStatus('testing');
        setTestErrorMsg('');

        try {
            // Test connection by fetching project info
            const url = `${editingConfig.baseUrl}/projects/analysis?projectName=${encodeURIComponent(editingConfig.projectName || '')}`;
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': editingConfig.token || '' }
            });
            const result = await response.json();

            if (result.code === 0) {
                // If project name matches or is found
                setTestStatus('success');
                toast({ title: t('dolphinScheduler.connectSuccess'), variant: 'success' });
            } else if (result.code === 10018) {
                setTestStatus('failed');
                setTestErrorMsg(t('dolphinScheduler.projectNotFound').replace('{{projectName}}', editingConfig.projectName || ''));
            } else {
                setTestStatus('failed');
                setTestErrorMsg(result.msg || t('dolphinScheduler.connectFailed'));
            }
        } catch (err: any) {
            console.error('Connection test failed:', err);
            setTestStatus('failed');
            if (err.message?.includes('Failed to fetch')) {
                setTestErrorMsg(t('dolphinScheduler.cannotConnect'));
            } else {
                setTestErrorMsg(err.message || t('dolphinScheduler.connectFailed'));
            }
        }
    };

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title={t('dolphinScheduler.confirmDeleteTitle')}
                message={t('dolphinScheduler.confirmDeleteMsg')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FolderKanban size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {t('dolphinScheduler.projectManager')}
                    </h2>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                    <Plus size={20} />
                    <span>{t('dolphinScheduler.newProject')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map(config => (
                    <div
                        key={config.id}
                        onClick={() => handleCardClick(config)}
                        className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-blue-500">
                                <Activity size={24} />
                            </div>
                            <div className="flex space-x-1">
                                <Tooltip content={t('common.edit')}>
                                    <button
                                        onClick={(e) => handleEdit(config, e)}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('common.delete')}>
                                    <button
                                        onClick={(e) => handleDeleteClick(config.id, e)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {config.name}
                        </h3>
                        
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                <Power size={14} className="mr-2" />
                                <span className="truncate">{config.baseUrl}</span>
                            </div>
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                <FolderKanban size={14} className="mr-2" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">{config.projectName}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-xs font-mono px-2 py-1 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded text-center">
                                v{config.apiVersion}
                            </span>
                            <div className="flex items-center text-blue-500 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                <span>{t('dolphinScheduler.enterProject')}</span>
                                <LogIn size={16} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Create New Card */}
                <button
                    onClick={handleAddNew}
                    className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-300 group"
                >
                    <div className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300 mb-4">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t('dolphinScheduler.newProject')}
                    </span>
                </button>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editingConfig.id ? t('dolphinScheduler.editProject') : t('dolphinScheduler.newProjectConfig')}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {t('dolphinScheduler.configName')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.name}
                                    onChange={e => setEditingConfig({ ...editingConfig, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder={t('dolphinScheduler.placeholderConfigName')}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">API Gateway <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editingConfig.baseUrl}
                                    onChange={e => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="http://ds-host:12345/dolphinscheduler"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Token <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    value={editingConfig.token}
                                    onChange={e => setEditingConfig({ ...editingConfig, token: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {t('dolphinScheduler.projectName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingConfig.projectName}
                                        onChange={e => setEditingConfig({ ...editingConfig, projectName: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {t('dolphinScheduler.projectCode')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingConfig.projectCode}
                                        onChange={e => setEditingConfig({ ...editingConfig, projectCode: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {t('dolphinScheduler.apiVersion')}
                                </label>
                                <select
                                    value={editingConfig.apiVersion}
                                    onChange={e => setEditingConfig({ ...editingConfig, apiVersion: e.target.value as any })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="2.0.0">2.0.x</option>
                                    <option value="3.0.0">3.0.x / 3.1.x / 3.2.x</option>
                                    <option value="3.4.0">3.4.x</option>
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    <AlertCircle size={10} className="inline mr-1" />
                                    {t('dolphinScheduler.apiVersionNote')}
                                </p>
                            </div>

                            {/* Test Connection Result */}
                            {testStatus !== 'none' && (
                                <div className={`p-3 rounded-lg flex items-start space-x-2 text-sm ${
                                    testStatus === 'testing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                                    testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                                    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                }`}>
                                    {testStatus === 'testing' ? <RefreshCw size={16} className="animate-spin mt-0.5" /> :
                                     testStatus === 'success' ? <CheckCircle size={16} className="mt-0.5" /> :
                                     <AlertCircle size={16} className="mt-0.5" />}
                                    <span className="font-medium">{testErrorMsg || (testStatus === 'testing' ? t('dolphinScheduler.testing') : testStatus === 'success' ? t('dolphinScheduler.connectSuccess') : t('dolphinScheduler.connectFailed'))}</span>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between space-x-3">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing'}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center space-x-2 disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={testStatus === 'testing' ? 'animate-spin' : ''} />
                                <span>{t('dolphinScheduler.testConnection')}</span>
                            </button>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
