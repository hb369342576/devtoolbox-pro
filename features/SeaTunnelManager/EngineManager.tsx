import React, { useState } from 'react';
import {
    Plus, Edit, Trash2, X, Server, CheckCircle,
    AlertCircle, RefreshCw, Power, Settings2, Zap, Flame, Sparkles, Wrench
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SeaTunnelEngineConfig, SeaTunnelEngineType, ZetaApiVersion } from './types';
import { seaTunnelApi } from './api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { ViewModeToggle } from '../common/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

interface EngineManagerProps {
    configs: SeaTunnelEngineConfig[];
    onAdd: (config: Omit<SeaTunnelEngineConfig, 'id'>) => void;
    onUpdate: (config: SeaTunnelEngineConfig) => void;
    onDelete: (id: string) => void;
    onSelect: (config: SeaTunnelEngineConfig) => void;
}

const ENGINE_TYPES: { value: SeaTunnelEngineType; label: string; defaultPort: number }[] = [
    { value: 'zeta', label: 'Zeta Engine', defaultPort: 5801 },
    { value: 'flink', label: 'Apache Flink', defaultPort: 8081 },
    { value: 'spark', label: 'Apache Spark', defaultPort: 4040 },
];

export const EngineManager: React.FC<EngineManagerProps> = ({ configs,
    onAdd,
    onUpdate,
    onDelete,
    onSelect
}) => {
    const { t } = useTranslation();
    const viewMode = useViewMode();
    const [showModal, setShowModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<SeaTunnelEngineConfig>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
    const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
    const [testErrorMsg, setTestErrorMsg] = useState<string>('');

    const handleAddNew = () => {
        setEditingConfig({
            name: '',
            engineType: 'zeta',
            baseUrl: 'http://localhost:5801',
            apiVersion: 'v1'
        });
        setTestStatus('none');
        setTestErrorMsg('');
        setShowModal(true);
    };

    const handleEdit = (config: SeaTunnelEngineConfig, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingConfig({ ...config });
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
        if (editingConfig.name && editingConfig.baseUrl && editingConfig.engineType) {
            if (editingConfig.id) {
                onUpdate(editingConfig as SeaTunnelEngineConfig);
            } else {
                onAdd(editingConfig as Omit<SeaTunnelEngineConfig, 'id'>);
            }
            setShowModal(false);
        }
    };

    const handleCardClick = (config: SeaTunnelEngineConfig) => {
        handleEdit(config);
    };

    const handleEngineTypeChange = (type: SeaTunnelEngineType) => {
        const engineInfo = ENGINE_TYPES.find(e => e.value === type);
        const defaultUrl = `http://localhost:${engineInfo?.defaultPort || 5801}`;
        setEditingConfig(prev => ({
            ...prev,
            engineType: type,
            baseUrl: prev.baseUrl?.includes('localhost') ? defaultUrl : prev.baseUrl,
            apiVersion: type === 'zeta' ? (prev.apiVersion || 'v1') : undefined
        }));
    };

    const handleTestConnection = async () => {
        if (!editingConfig.baseUrl || !editingConfig.engineType) return;
        
        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
        if (!isTauri) {
            setTestStatus('failed');
            setTestErrorMsg('需要安装后台');
            setTimeout(() => {
                setTestStatus('none');
                setTestErrorMsg('');
            }, 3000);
            return;
        }

        setTestStatus('testing');
        setTestErrorMsg('');
        
        try {
            const result = await seaTunnelApi.testConnection({
                id: 'test',
                name: 'test',
                engineType: editingConfig.engineType,
                baseUrl: editingConfig.baseUrl,
                apiVersion: editingConfig.apiVersion
            });
            
            if (result.success) {
                setTestStatus('success');
                setTestErrorMsg('');
            } else {
                setTestStatus('failed');
                setTestErrorMsg(result.error || t('engine.connFailed'));
            }
        } catch (err: any) {
            setTestStatus('failed');
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                setTestErrorMsg(t('engine.cannotConnect'));
            } else {
                setTestErrorMsg(err.message || t('engine.connFailed'));
            }
        }
        
        setTimeout(() => {
            setTestStatus('none');
            setTestErrorMsg('');
        }, 5000);
    };

    const isFormValid = !!(editingConfig.name && editingConfig.baseUrl && editingConfig.engineType);

    const getEngineIcon = (type: SeaTunnelEngineType) => {
        switch (type) {
            case 'zeta': return <Zap size={24} className="text-blue-500" />;
            case 'flink': return <Flame size={24} className="text-orange-500" />;
            case 'spark': return <Sparkles size={24} className="text-yellow-500" />;
            default: return <Wrench size={24} className="text-slate-500" />;
        }
    };

    const getEngineColor = (type: SeaTunnelEngineType) => {
        switch (type) {
            case 'zeta': return 'border-blue-200 dark:border-blue-800/60 group-hover:border-blue-400 dark:group-hover:border-blue-500';
            case 'flink': return 'border-orange-200 dark:border-orange-800/60 group-hover:border-orange-400 dark:group-hover:border-orange-500';
            case 'spark': return 'border-yellow-200 dark:border-yellow-800/60 group-hover:border-yellow-400 dark:group-hover:border-yellow-500';
            default: return 'border-slate-200 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500';
        }
    };

    return (
        <div className="h-full flex flex-col">
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={t('common.confirmDelete')}
                message={t('engine.deleteConfirm')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
                type="danger"
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <Server className="mr-3 text-cyan-600" />
                    {t('engine.title')}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleAddNew}
                        className="min-w-[140px] px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('engine.newEngine')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {configs.map(config => (
                            <Tooltip key={config.id} content={config.name} position="top">
                                <div
                                    className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden w-[288px] h-[200px] flex-shrink-0 flex flex-col"
                                    onClick={() => handleCardClick(config)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className={`p-2 rounded-lg border-2 bg-transparent transition-colors duration-300 ${getEngineColor(config.engineType)}`}>
                                            {getEngineIcon(config.engineType)}
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEdit(config, e)} className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"><Edit size={18} /></button>
                                            <button onClick={(e) => handleDeleteClick(config.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{config.name}</h3>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-16 text-xs font-bold uppercase opacity-70">Engine</span>
                                            <span className="truncate flex-1 font-medium capitalize">{config.engineType}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <span className="w-16 text-xs font-bold uppercase opacity-70">URL</span>
                                            <span className="truncate flex-1 text-xs font-mono">{config.baseUrl}</span>
                                        </div>
                                        {config.engineType === 'zeta' && (
                                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                                <span className="w-16 text-xs font-bold uppercase opacity-70">API</span>
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.apiVersion === 'v2' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {config.apiVersion || 'v1'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${getEngineColor(config.engineType)} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                                </div>
                            </Tooltip>
                        ))}
                        <button
                            onClick={handleAddNew}
                            className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-900/10 dark:to-blue-900/10 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer w-[288px] h-[200px] flex-shrink-0"
                        >
                            <div className="p-4 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{t('engine.newEngine')}</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-3">{t('common.name')}</div>
                            <div className="col-span-2">{t('engine.type')}</div>
                            <div className="col-span-4">Base URL</div>
                            <div className="col-span-1">API</div>
                            <div className="col-span-2 text-right">{t('common.actions')}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {configs.map(config => (
                                <div
                                    key={config.id}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => onSelect(config)}
                                >
                                    <div className="col-span-3 flex items-center space-x-3">
                                        <span className="flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-900 rounded">{React.cloneElement(getEngineIcon(config.engineType) as React.ReactElement, { size: 18 })}</span>
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{config.name}</span>
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-600 dark:text-slate-300 capitalize">
                                        {config.engineType}
                                    </div>
                                    <div className="col-span-4 text-sm text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
                                        {config.baseUrl}
                                    </div>
                                    <div className="col-span-1">
                                        {config.engineType === 'zeta' ? (
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.apiVersion === 'v2' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {config.apiVersion || 'v1'}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </div>
                                    <div className="col-span-2 flex justify-end space-x-2">
                                        <button onClick={(e) => handleEdit(config, e)} className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => handleDeleteClick(config.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {configs.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{t('common.noData')}</div>}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editingConfig.id ? t('engine.editEngine') : t('engine.newEngineConfig')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('engine.configName')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.name || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                                    placeholder={t('engine.placeholderName')}
                                />
                            </div>

                            {/* Engine Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('engine.type')} <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ENGINE_TYPES.map(engine => (
                                        <button
                                            key={engine.value}
                                            onClick={() => handleEngineTypeChange(engine.value)}
                                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                                editingConfig.engineType === engine.value
                                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                        >
                                            <span className="mr-1">{getEngineIcon(engine.value)}</span>
                                            {engine.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Base URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingConfig.baseUrl || ''}
                                    onChange={e => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                                    placeholder={`http://localhost:${ENGINE_TYPES.find(e => e.value === editingConfig.engineType)?.defaultPort || 5801}`}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    {editingConfig.engineType === 'zeta' && (editingConfig.apiVersion === 'v2' ? 'V2 API (Jetty REST: /overview, /running-jobs 等)' : 'V1 API (Hazelcast REST: /hazelcast/rest/*)')}
                                    {editingConfig.engineType === 'flink' && 'Flink REST API (Standalone: 8081, YARN: 8088)'}
                                    {editingConfig.engineType === 'spark' && 'Spark History Server (默认端口: 4040/18080)'}
                                </p>
                            </div>

                            {/* API Version (Only for Zeta) */}
                            {editingConfig.engineType === 'zeta' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        API {t('engine.version')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['v1', 'v2'] as ZetaApiVersion[]).map(version => (
                                            <button
                                                key={version}
                                                onClick={() => setEditingConfig(prev => ({ ...prev, apiVersion: version }))}
                                                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                                    editingConfig.apiVersion === version
                                                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                                                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                {version.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {editingConfig.apiVersion === 'v2' 
                                            ? t('engine.v2Tip')
                                            : t('engine.v1Tip')}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || !isFormValid}
                                className={`flex items-center space-x-2 text-sm font-medium ${testStatus === 'success' ? 'text-green-600' : testStatus === 'failed' ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={16} /> : <Power size={16} />}
                                <span className="ml-2">
                                    {testStatus === 'testing' ? t('engine.testing') :
                                        testStatus === 'success' ? t('engine.connSuccess') :
                                            testStatus === 'failed' ? (testErrorMsg || t('engine.connFailed')) :
                                                t('engine.testConn')}
                                </span>
                            </button>
                            <div className="flex space-x-3">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!isFormValid}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${isFormValid ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'}`}
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
