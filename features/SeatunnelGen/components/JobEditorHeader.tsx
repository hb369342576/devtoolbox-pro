import React from 'react';
import { ScriptJob } from '../../../types';
import { SeaTunnelEngineConfig } from '../../SeaTunnelManager/types';
import { ChevronLeft, Play, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JobEditorHeaderProps {
  activeJob: ScriptJob;
  onJobNameChange: (name: string) => void;
  onBackClick: () => void;
  engines: SeaTunnelEngineConfig[];
  selectedEngineId: string;
  onEngineSelect: (id: string) => void;
  onGenerateConfig: () => void;
  onSubmit: () => void;
  isGenerating: boolean;
  isSubmitting: boolean;
  canGenerate: boolean;
  canSubmit: boolean;
}

export const JobEditorHeader: React.FC<JobEditorHeaderProps> = ({
  activeJob, onJobNameChange, onBackClick, engines, selectedEngineId, onEngineSelect,
  onGenerateConfig, onSubmit, isGenerating, isSubmitting, canGenerate, canSubmit
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center space-x-3">
        <button onClick={onBackClick} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <input
          value={activeJob.name}
          onChange={e => onJobNameChange(e.target.value)}
          className="font-bold text-lg text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors"
        />
      </div>
      <div className="flex items-center space-x-3">
        <select
          value={selectedEngineId}
          onChange={(e) => onEngineSelect(e.target.value)}
          className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">{t('common.SelectProject')}</option>
          {engines.filter(e => e.engineType === 'zeta').map(engine => (
            <option key={engine.id} value={engine.id}>{engine.name}</option>
          ))}
        </select>
        <button
          onClick={onGenerateConfig}
          disabled={isGenerating || !canGenerate}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium flex items-center shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={16} className="mr-2" />
          {isGenerating ? t('common.generating') : t('common.preview')}
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium flex items-center shadow-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={16} className="mr-2" />
          {isSubmitting ? t('common.submitting') : t('common.submit')}
        </button>
      </div>
    </div>
  );
};
