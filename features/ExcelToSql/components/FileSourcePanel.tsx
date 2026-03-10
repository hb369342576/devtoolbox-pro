import React, { RefObject } from 'react';
import { FileSpreadsheet, Layers, RefreshCw, FileCheck, Check, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileSourcePanelProps {
    file: File | null;
    isDragging: boolean;
    setIsDragging: (val: boolean) => void;
    fileInputRef: RefObject<HTMLInputElement>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileLoad: (file: File) => void;
    sheets: string[];
    selectedSheet: string | null;
    setSelectedSheet: (sheet: string) => void;
    isProcessing: boolean;
}

export const FileSourcePanel: React.FC<FileSourcePanelProps> = ({
    file, isDragging, setIsDragging, fileInputRef,
    handleFileChange, handleFileLoad,
    sheets, selectedSheet, setSelectedSheet, isProcessing
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                {t('common.excelSource', { defaultValue: '数据源 (Excel)' })}
            </div>

            <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileLoad(e.dataTransfer.files[0]);
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed transition-all duration-300 rounded-xl p-6 flex flex-col items-center justify-center shrink-0 mb-4 overflow-hidden group cursor-pointer h-40
                        ${isDragging
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02] shadow-lg'
                            : file
                                ? 'border-green-400 bg-green-50/50 dark:bg-slate-800'
                                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                    `}
                >
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                        ref={fileInputRef}
                    />
                    {file ? (
                        <div className="flex flex-col items-center z-10 pointer-events-none">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-600/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-2 shadow-sm">
                                <FileSpreadsheet size={24} />
                            </div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 text-center px-2 line-clamp-1 break-all">
                                {file.name}
                            </p>
                            <span className="mt-2 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {t('common.selected', { defaultValue: '已选取' })}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pointer-events-none">
                            <Upload className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-green-500 scale-110' : 'text-slate-400 group-hover:text-slate-500'}`} />
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center break-all">
                                {t('common.clickOrDragExcelHere', { defaultValue: '点击或拖拽文件到此处' })}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center shrink-0">
                        <Layers size={14} className="mr-2 text-slate-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.worksheets', { defaultValue: '工作表列表' })}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-900/50 space-y-1">
                        {isProcessing && sheets.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-slate-400">
                                <RefreshCw className="animate-spin mr-2" size={16} />
                                <span className="text-sm">{t('common.parsing', { defaultValue: '解析中...' })}</span>
                            </div>
                        ) : sheets.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 italic">
                                {t('common.noSheets', { defaultValue: '无可用工作表' })}
                            </div>
                        ) : (
                            sheets.map(sheet => (
                                <button
                                    key={sheet}
                                    onClick={() => setSelectedSheet(sheet)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${selectedSheet === sheet
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="flex items-center truncate">
                                        <FileCheck size={14} className={`mr-2 flex-shrink-0 ${selectedSheet === sheet ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                                        <span className="truncate">{sheet}</span>
                                    </span>
                                    {selectedSheet === sheet && <Check size={14} className="flex-shrink-0 ml-2" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
