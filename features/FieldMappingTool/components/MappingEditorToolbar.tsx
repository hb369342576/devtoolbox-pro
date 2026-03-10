import React from 'react';
import { ChevronLeft, Save, Play, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { MappingProfile } from '../../../types';
import { SeaTunnelEngineConfig } from '../../SeaTunnelManager/types';

interface MappingEditorToolbarProps {
    activeProfile: MappingProfile | null;
    updateActiveProfile: (p: Partial<MappingProfile>) => void;
    saveCurrentProfile: () => void;
    engines: SeaTunnelEngineConfig[];
    selectedEngineId: string;
    setSelectedEngineId: (id: string) => void;
    isGenerating: boolean;
    handleGenerateConfig: () => void;
    isSubmitting: boolean;
    handleSubmit: () => void;
    nodesCount: number;
    handleExit: () => void;
    generatedConfig: string;
}

export const MappingEditorToolbar: React.FC<MappingEditorToolbarProps> = ({
    activeProfile, updateActiveProfile, saveCurrentProfile,
    engines, selectedEngineId, setSelectedEngineId,
    isGenerating, handleGenerateConfig,
    isSubmitting, handleSubmit,
    nodesCount, handleExit, generatedConfig
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    return (
        <div className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
            {/* Left: Back, Name, Save */}
            <div className="flex items-center space-x-2">
                <button 
                    onClick={handleExit}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                    title={t('common.back', { defaultValue: '返回' })}
                >
                    <ChevronLeft size={18} />
                </button>
                <input
                    value={activeProfile?.name || ''}
                    onChange={e => {
                        if (activeProfile) {
                            updateActiveProfile({ name: e.target.value });
                        }
                    }}
                    className="font-medium text-sm text-slate-700 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors max-w-[150px]"
                    placeholder={t('fieldMapping.taskName', { defaultValue: '任务名称' })}
                />
                <button 
                    onClick={() => {
                        saveCurrentProfile();
                        toast({ title: t('common.saveSuccess', { defaultValue: '保存成功' }), variant: 'success' });
                    }} 
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    title={t('common.save', { defaultValue: '保存' })}
                >
                    <Save size={16} />
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
                <select
                    value={selectedEngineId}
                    onChange={(e) => setSelectedEngineId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-purple-500"
                >
                    <option value="">{t('fieldMapping.selectProject', { defaultValue: '选择目标引擎 (SeaTunnel Zeta)' })}</option>
                    {engines.filter(e => e.engineType === 'zeta').map(engine => (
                        <option key={engine.id} value={engine.id}>{engine.name}</option>
                    ))}
                </select>
            </div>
            
            {/* Right: Generate, Submit */}
            <div className="flex items-center space-x-2">
                <button
                    onClick={handleGenerateConfig}
                    disabled={isGenerating || nodesCount === 0}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Play size={14} className="mr-1.5" />
                    {isGenerating ? t('fieldMapping.generating', { defaultValue: '生成中...' }) : t('fieldMapping.generateConfig', { defaultValue: '生成配置' })}
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!generatedConfig || !selectedEngineId || isSubmitting}
                    className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Upload size={14} className="mr-1.5" />
                    {isSubmitting ? t('fieldMapping.submitting', { defaultValue: '提交中...' }) : t('fieldMapping.submitJob', { defaultValue: '提交任务' })}
                </button>
            </div>
        </div>
    );
};
