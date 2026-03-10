import React from 'react';
import { FileSpreadsheet, Plus, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../common/Tooltip';
import { ViewModeToggle } from '../../common/ViewModeToggle';
import { useGlobalStore } from '../../../store/globalStore';
import { ImportProfile } from '../types';

interface ImportHomeViewProps {
    profiles: ImportProfile[];
    handleLoadProfile: (p: ImportProfile) => void;
    handleDeleteProfile: (e: React.MouseEvent, id: string) => void;
    handleNewImport: () => void;
}

const X = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

export const ImportHomeView: React.FC<ImportHomeViewProps> = ({ profiles, handleLoadProfile, handleDeleteProfile, handleNewImport }) => {
    const { t } = useTranslation();
    const viewMode = useGlobalStore(state => state.viewMode);

    return (
        <div className="h-full flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <FileSpreadsheet className="mr-3 text-green-600" />
                    {t('excel_import.title', { defaultValue: 'Excel 导入配置' })}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button
                        onClick={handleNewImport}
                        className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        {t('excel_import.newImportTask', { defaultValue: '新建导入任务' })}
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="flex flex-wrap gap-6 pt-2 overflow-y-auto custom-scrollbar">
                    {profiles.map(p => (
                        <Tooltip key={p.id} content={p.title} position="top">
                            <div
                                onClick={() => handleLoadProfile(p)}
                                className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/30 to-transparent dark:from-green-900/20 dark:via-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDeleteProfile(e, p.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 group-hover:scale-110 transition-transform duration-300">
                                            <FileSpreadsheet size={24} />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                        {p.title}
                                    </h3>
                                    <div className="text-sm text-slate-500 font-mono mb-auto truncate">
                                        {p.targetTable ? `-> ${p.targetTable}` : t('excel_import.noTarget', { defaultValue: '未配置目标' })}
                                    </div>
                                    <div className="flex items-center text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-4">
                                        <Settings size={12} className="mr-1" />
                                        {new Date(p.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </Tooltip>
                    ))}

                    <div
                        onClick={handleNewImport}
                        className="w-[288px] h-[200px] flex-shrink-0 flex flex-col items-center justify-center group p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {t('excel_import.newImportTask', { defaultValue: '新建导入任务' })}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shrink-0">
                        <div className="col-span-4">{t('excel_import.profileName', { defaultValue: '配置名称' })}</div>
                        <div className="col-span-4">{t('common.selectTable', { defaultValue: '选择表' })}</div>
                        <div className="col-span-3">{t('common.updated', { defaultValue: '更新时间' })}</div>
                        <div className="col-span-1 text-center">{t('common.actions', { defaultValue: '操作' })}</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 flex-1 overflow-y-auto custom-scrollbar">
                        {profiles.length === 0 && (
                            <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                                {t('common.noRecords', { defaultValue: '暂无记录' })}
                            </div>
                        )}
                        {profiles.map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleLoadProfile(p)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                            >
                                <div className="col-span-4 flex items-center space-x-3">
                                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex-shrink-0">
                                        <FileSpreadsheet size={16} />
                                    </div>
                                    <span className="font-medium text-slate-800 dark:text-white truncate">{p.title}</span>
                                </div>
                                <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                                    {p.targetTable || '-'}
                                </div>
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                    {new Date(p.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDeleteProfile(e, p.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
