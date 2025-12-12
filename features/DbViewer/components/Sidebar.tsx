import React from 'react';
import { Database, LogOut, Search } from 'lucide-react';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';

export const Sidebar: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = getTexts(lang);

    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const databases = useDbViewerStore((state) => state.databases);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const setSelectedConnection = useDbViewerStore((state) => state.setSelectedConnection);

    return (
        <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-800 dark:text-white truncate flex items-center">
                        <Database size={16} className="mr-2 text-blue-600" />
                        {selectedConnection?.name}
                    </h3>
                    <button
                        onClick={() => setSelectedConnection(null)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                {/* Database列表简化版 */}
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                    {databases.map(db => (
                        <button
                            key={db}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedDatabase === db
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            {db}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
