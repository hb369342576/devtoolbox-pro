import React from 'react';
import { ArrowRight, Settings, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DbConnection } from '../../types';
import { useExcelImport } from './hooks/useExcelImport';
import { ImportHomeView } from './components/ImportHomeView';
import { FileSourcePanel } from './components/FileSourcePanel';
import { ConfigMappingPanel } from './components/ConfigMappingPanel';

interface ExcelImportProps {
    connections: DbConnection[];
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ connections }) => {
    const { t } = useTranslation();
    const excelImportState = useExcelImport(connections);

    if (excelImportState.view === 'home') {
        return (
            <ImportHomeView
                profiles={excelImportState.profiles}
                handleLoadProfile={excelImportState.handleLoadProfile}
                handleDeleteProfile={excelImportState.handleDeleteProfile}
                handleNewImport={excelImportState.handleNewImport}
            />
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-300">
            {/* Editor Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => excelImportState.setView('home')}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={t('excel_import.exit', { defaultValue: '退出' })}
                    >
                        <ArrowRight className="rotate-180" size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        {excelImportState.isEditingTitle ? (
                            <input
                                autoFocus
                                value={excelImportState.profileTitle}
                                onChange={e => excelImportState.setProfileTitle(e.target.value)}
                                onBlur={() => excelImportState.setIsEditingTitle(false)}
                                onKeyDown={e => e.key === 'Enter' && excelImportState.setIsEditingTitle(false)}
                                className="bg-white dark:bg-slate-900 border border-blue-500 rounded px-2 py-1 text-lg font-bold outline-none"
                            />
                        ) : (
                            <h2
                                onClick={() => excelImportState.setIsEditingTitle(true)}
                                className="text-lg font-bold text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center"
                            >
                                {excelImportState.profileTitle}
                                <Settings size={14} className="ml-2 opacity-30" />
                            </h2>
                        )}
                    </div>
                </div>
                <button
                    onClick={excelImportState.handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-md transition-all active:scale-95"
                >
                    <Save size={18} className="mr-2" />
                    {t('common.save', { defaultValue: '保存' })}
                </button>
            </div>

            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                <FileSourcePanel 
                    file={excelImportState.file}
                    isDragging={excelImportState.isDragging}
                    setIsDragging={excelImportState.setIsDragging}
                    fileInputRef={excelImportState.fileInputRef}
                    handleFileChange={excelImportState.handleFileChange}
                    onDrop={excelImportState.onDrop}
                    sheets={excelImportState.sheets}
                    selectedSheet={excelImportState.selectedSheet}
                    setSelectedSheet={excelImportState.setSelectedSheet}
                    headerRowIdx={excelImportState.headerRowIdx}
                    setHeaderRowIdx={excelImportState.setHeaderRowIdx}
                />

                <ConfigMappingPanel 
                    connections={connections}
                    selectedConnId={excelImportState.selectedConnId}
                    setSelectedConnId={excelImportState.setSelectedConnId}
                    dbs={excelImportState.dbs}
                    selectedDb={excelImportState.selectedDb}
                    setSelectedDb={excelImportState.setSelectedDb}
                    tables={excelImportState.tables}
                    selectedTable={excelImportState.selectedTable}
                    setSelectedTable={excelImportState.setSelectedTable}
                    handleGenerate={excelImportState.handleGenerate}
                    selectedSheet={excelImportState.selectedSheet}
                    isLoadingColumns={excelImportState.isLoadingColumns}
                    tableSchema={excelImportState.tableSchema}
                    mappings={excelImportState.mappings}
                    setMappings={excelImportState.setMappings}
                    sheetHeaders={excelImportState.sheetHeaders}
                    splitHeight={excelImportState.splitHeight}
                    isResizing={excelImportState.isResizing}
                    generatedSql={excelImportState.generatedSql}
                />
            </div>
        </div>
    );
};
