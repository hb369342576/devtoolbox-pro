import React from 'react';
import { FileSpreadsheet, Plus, Table, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExcelTemplate } from '../../../types';
import { useViewMode } from '../../../store/globalStore';
import { ConfirmModal } from '../../common/ConfirmModal';
import { Tooltip } from '../../common/Tooltip';
import { ViewModeToggle } from '../../common/ViewModeToggle';

interface TemplateListViewProps {
    templates: ExcelTemplate[];
    viewMode: 'grid' | 'list';
    handleSwitchTemplate: (tpl: ExcelTemplate | null) => void;
    handleAddNew: () => void;
    handleDeleteTemplate: (id: string, e: React.MouseEvent) => void;
    deleteId: string | null;
    confirmDelete: () => void;
    setDeleteId: (id: string | null) => void;
}

export const TemplateListView: React.FC<TemplateListViewProps> = ({
    templates,
    viewMode,
    handleSwitchTemplate,
    handleAddNew,
    handleDeleteTemplate,
    deleteId,
    confirmDelete,
    setDeleteId
}) => {
    const { t } = useTranslation();

    return (
        <div className="h-full flex flex-col pt-2 md:pt-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <FileSpreadsheet className="mr-3 text-green-600" />
                    {t('common.excelToSqlTemplate', { defaultValue: 'Excel 转 SQL 模板' })}
                </h2>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <button onClick={handleAddNew} className="min-w-[140px] px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors">
                        <Plus size={18} className="mr-2" />
                        {t('common.newTemplate', { defaultValue: '新建模板' })}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {templates.map(tpl => (
                            <Tooltip key={tpl.id} content={tpl.name} position="top">
                                <div
                                    onClick={() => handleSwitchTemplate(tpl)}
                                    className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/30 to-transparent dark:from-green-900/20 dark:via-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="relative z-10 box-border h-full flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                                                <Table size={24} />
                                            </div>
                                            <div className="flex space-x-1">
                                                <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10 opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{tpl.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-auto line-clamp-2">{tpl.description || t('common.noDescription', { defaultValue: '暂无描述' })}</p>

                                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded">
                                            <span title="Start Row">Row:{tpl.dataStartRow}</span>
                                            <span className="text-slate-300">|</span>
                                            <span title="Name Column">N:{tpl.nameCol}</span>
                                            <span className="text-slate-300">|</span>
                                            <span title="Type Column">T:{tpl.typeCol}</span>
                                            <span className="text-slate-300">|</span>
                                            <span title="Comment Column">C:{tpl.commentCol || '-'}</span>
                                            {tpl.pkCol && (
                                                <>
                                                    <span className="text-slate-300">|</span>
                                                    <span title="PK Column" className="text-blue-500 font-bold">PK:{tpl.pkCol}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        ))}

                        <button onClick={handleAddNew} className="w-[288px] h-[200px] flex-shrink-0 group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{t('common.addNewRule', { defaultValue: '新建规则' })}</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <div className="col-span-4">{t('common.templateName', { defaultValue: '模板名称' })}</div>
                            <div className="col-span-4">{t('common.description', { defaultValue: '描述' })}</div>
                            <div className="col-span-3">{t('common.rulesRowCols', { defaultValue: '规则配置' })}</div>
                            <div className="col-span-1 text-right">{t('common.actions', { defaultValue: '操作' })}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {templates.map(tpl => (
                                <div
                                    key={tpl.id}
                                    onClick={() => handleSwitchTemplate(tpl)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                                >
                                    <div className="col-span-4 flex items-center space-x-3">
                                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                                            <Table size={16} />
                                        </div>
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{tpl.name}</span>
                                    </div>
                                    <div className="col-span-4 text-sm text-slate-500 dark:text-slate-400 truncate">
                                        {tpl.description}
                                    </div>
                                    <div className="col-span-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                                        Start: {tpl.dataStartRow} | Cols: N:{tpl.nameCol}, T:{tpl.typeCol}, C:{tpl.commentCol || '-'} {tpl.pkCol ? `, PK:${tpl.pkCol}` : ''}
                                    </div>
                                    <div className="col-span-1 flex justify-end space-x-2">
                                        <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{t('common.noTemplatesFound', { defaultValue: '未找到模板列表...' })}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                title={t('common.deleteTemplate', { defaultValue: '删除模板' })}
                message={t('common.areYouSureYouWantToDeleteTemplate', { defaultValue: '确认想要删除该模板吗？这个步骤是不可逆的。' })}
                confirmText={t('common.delete', { defaultValue: '删除' })}
                cancelText={t('common.cancel', { defaultValue: '取消' })}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
                type="danger"
            />
        </div>
    );
};
