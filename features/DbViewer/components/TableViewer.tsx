import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';

export const TableViewer: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = getTexts(lang);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const columns = useDbViewerStore((state) => state.columns);

    if (!selectedTable) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                <TableIcon size={64} className="mb-4 opacity-20" />
                <p className="text-lg">{t.dbViewer.selectDb}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center mb-6">
                <TableIcon className="mr-3 text-blue-600" />
                {selectedTable}
            </h2>

            {/* Columns Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-left">Name</th>
                            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-left">Type</th>
                            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-center">Nullable</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {columns.map(col => (
                            <tr key={col.name} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <td className="px-4 py-2.5 font-mono text-slate-800 dark:text-white">{col.name}</td>
                                <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-mono">{col.type}</td>
                                <td className="px-4 py-2.5 text-center text-xs">
                                    {col.isNullable ? 'Yes' : <span className="font-bold">No</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
