import React from 'react';
import { FileSpreadsheet, Upload, Layers, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileSourcePanelProps {
    file: File | null;
    isDragging: boolean;
    setIsDragging: (v: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
    onDrop: (e: React.DragEvent) => void;
    sheets: string[];
    selectedSheet: string | null;
    setSelectedSheet: (sheet: string | null) => void;
    headerRowIdx: number;
    setHeaderRowIdx: (v: number) => void;
}

export const FileSourcePanel: React.FC<FileSourcePanelProps> = ({
    file, isDragging, setIsDragging, fileInputRef, handleFileChange, onDrop,
    sheets, selectedSheet, setSelectedSheet,
    headerRowIdx, setHeaderRowIdx
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                {t('excel_import.sourceFile', { defaultValue: '源文件 (Excel)' })}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-4">
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isDragging ? 'border-green-500 bg-green-50' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}
                    `}
                >
                    <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                    {file ? (
                        <div className="text-center">
                            <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{file.name}</div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400">
                            <Upload className="w-6 h-6 mx-auto mb-2" />
                            <span className="text-xs">{t('common.uploadTip', { defaultValue: '点击或拖拽文件上传' })}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                        <Layers size={14} className="mr-2 text-slate-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">{t('common.sheets', { defaultValue: '工作表' })}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {sheets.map(sheet => (
                            <button
                                key={sheet}
                                onClick={() => setSelectedSheet(sheet)}
                                className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${selectedSheet === sheet
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="truncate">{sheet}</span>
                                {selectedSheet === sheet && <Check size={14} />}
                            </button>
                        ))}
                        {sheets.length === 0 && <div className="text-center py-4 text-xs text-slate-400 italic">{t('excel_import.noSheets', { defaultValue: '暂无工作表' })}</div>}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('excel_import.headerRow', { defaultValue: '标题行号' })}</label>
                    <input
                        type="number"
                        min="1"
                        value={headerRowIdx}
                        onChange={e => setHeaderRowIdx(parseInt(e.target.value) || 1)}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                    />
                </div>
            </div>
        </div>
    );
};
