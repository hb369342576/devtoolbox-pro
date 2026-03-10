import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PdfFileWithBlob } from '../hooks/usePdfTools';

interface PdfFileListProps {
    files: PdfFileWithBlob[];
    removeFile: (id: string) => void;
}

export const PdfFileList: React.FC<PdfFileListProps> = ({ files, removeFile }) => {
    const { t } = useTranslation();

    return (
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 min-h-0 custom-scrollbar">
            {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-4 overflow-hidden">
                        <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-red-500 shadow-sm flex-shrink-0">PDF</div>
                        <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.size}</p>
                        </div>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
            {files.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    {t('pdf.noFiles')}
                </div>
            )}
        </div>
    );
};
