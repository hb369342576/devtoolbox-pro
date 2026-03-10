import React from 'react';
import { ScriptJob } from '../../../types';
import { Workflow, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Tooltip } from '../../common/Tooltip';
import { ViewModeToggle } from '../../common/ViewModeToggle';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../common/ConfirmModal';
import { useViewMode } from '../../../store/globalStore';

interface JobListViewProps {
  jobs: ScriptJob[];
  onSelectJob: (job: ScriptJob) => void;
  onCreateJob: () => void;
  onDeleteJob: (id: string, e: React.MouseEvent) => void;
  confirmDelete: { isOpen: boolean; jobId: string };
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const JobListView: React.FC<JobListViewProps> = ({
  jobs, onSelectJob, onCreateJob, onDeleteJob,
  confirmDelete, onConfirmDelete, onCancelDelete
}) => {
  const { t, i18n } = useTranslation();
  const viewMode = useViewMode();

  return (
    <div className="h-full flex flex-col">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t('common.confirmDelete')}
        message={t('common.areYouSureYouWantToDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
        type="danger"
      />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <Workflow className="mr-3 text-purple-600" />
          {t('common.scriptGenerator')}
        </h2>
        <div className="flex items-center space-x-3">
          <ViewModeToggle />
          <button onClick={onCreateJob} className="min-w-[140px] px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors">
            <Plus size={18} className="mr-2" />
            {t('common.newJob')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {viewMode === 'grid' ? (
          <div className="flex flex-wrap gap-6 pt-2">
            {jobs.map(job => (
              <Tooltip key={job.id} content={job.name} position="top">
                <div
                  onClick={() => onSelectJob(job)}
                  className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/30 to-transparent dark:from-purple-900/20 dark:via-pink-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                        <Workflow size={24} />
                      </div>
                      <button onClick={(e) => onDeleteJob(job.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10 opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{job.name}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className="font-bold uppercase truncate max-w-[45%]">{job.source.type || '?'}</span>
                      <ArrowRight size={12} className="text-slate-300" />
                      <span className="font-bold uppercase truncate max-w-[45%]">{job.sink.type || '?'}</span>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-400 text-right">
                      {new Date(job.createdAt).toLocaleDateString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US')}
                    </div>
                  </div>
                </div>
              </Tooltip>
            ))}

            <button onClick={onCreateJob} className="w-[288px] h-[200px] flex-shrink-0 group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                <Plus size={32} />
              </div>
              <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{t('common.createNewJob')}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <div className="col-span-4">{t('common.jobName')}</div>
              <div className="col-span-4">{t('common.sourceSink')}</div>
              <div className="col-span-2">{t('common.created')}</div>
              <div className="col-span-2 text-right">{t('common.actions')}</div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <div className="col-span-4 flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex-shrink-0">
                      <Workflow size={16} />
                    </div>
                    <span className="font-medium text-slate-800 dark:text-white truncate">{job.name}</span>
                  </div>
                  <div className="col-span-4 text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex items-center">
                    <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{job.source.type || 'Source'}</span>
                    <ArrowRight size={10} className="mx-2 text-slate-300" />
                    <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{job.sink.type || 'Sink'}</span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US')}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={(e) => onDeleteJob(job.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{t('common.noJobsFound')}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
