import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FileSourcePanel } from './FileSourcePanel';
import { ConfigPanel } from './ConfigPanel';

interface TemplateEditorViewProps {
    editorState: any; // We will pass the whole returned object from useExcelToSql for convenience
}

export const TemplateEditorView: React.FC<TemplateEditorViewProps> = ({ editorState }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center space-x-3 w-full">
                    <button onClick={() => editorState.handleSwitchTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors shrink-0">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
                        {/* Name Input */}
                        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block">{t('common.templateName', { defaultValue: '模板名称' })}</label>
                            <input
                                type="text"
                                value={editorState.activeTemplate.name}
                                onChange={(e) => editorState.updateActiveTemplate({ ...editorState.activeTemplate, name: e.target.value })}
                                className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none text-sm pb-1"
                                placeholder="Template Name"
                            />
                        </div>

                        {/* Description Input */}
                        <div className="flex-[2] w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block">{t('common.description', { defaultValue: '描述' })}</label>
                            <input
                                type="text"
                                value={editorState.activeTemplate.description || ''}
                                onChange={(e) => editorState.updateActiveTemplate({ ...editorState.activeTemplate, description: e.target.value })}
                                className="w-full bg-transparent text-slate-600 dark:text-slate-300 outline-none text-sm pb-1"
                                placeholder="Description"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                <FileSourcePanel
                    file={editorState.file}
                    isDragging={editorState.isDragging}
                    setIsDragging={editorState.setIsDragging}
                    fileInputRef={editorState.fileInputRef}
                    handleFileChange={editorState.handleFileChange}
                    handleFileLoad={editorState.handleFileLoad}
                    sheets={editorState.sheets}
                    selectedSheet={editorState.selectedSheet}
                    setSelectedSheet={editorState.setSelectedSheet}
                    isProcessing={editorState.isProcessing}
                />
                
                <ConfigPanel
                    activeTemplate={editorState.activeTemplate}
                    updateActiveTemplate={editorState.updateActiveTemplate}
                    tableName={editorState.tableName}
                    setTableName={editorState.setTableName}
                    dbType={editorState.dbType}
                    setDbType={editorState.setDbType}
                    generateSql={editorState.generateSql}
                    selectedSheet={editorState.selectedSheet}
                    isProcessing={editorState.isProcessing}
                    generatedSql={editorState.generatedSql}
                />
            </div>
        </div>
    );
};
