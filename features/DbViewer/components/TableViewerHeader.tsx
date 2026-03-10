import React from 'react';
import { Table as TableIcon, Loader2, Database, Columns, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TableViewerHeaderProps {
    selectedTable: string;
    loading: boolean;
    activeTab: 'structure' | 'query';
    setActiveTab: (tab: 'structure' | 'query') => void;
    onCopy: (text: string) => void;
}

export const TableViewerHeader: React.FC<TableViewerHeaderProps> = ({
    selectedTable,
    loading,
    activeTab,
    setActiveTab,
    onCopy
}) => {
    const { t } = useTranslation();

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                    <TableIcon className="mr-2 text-blue-600" size={20} />
                    {selectedTable}
                    <button
                        onClick={() => onCopy(selectedTable)}
                        className="ml-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title={t('db_viewer.copyTableName')}
                    >
                        <Copy size={16} />
                    </button>
                </h2>
                {loading && (
                    <div className="flex items-center text-slate-500 text-sm">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        {t('db_viewer.loading')}
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2">
                <button
                    onClick={() => setActiveTab('query')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'query'
                            ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-white dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Database size={16} />
                    <span>{t('dbViewer.query')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'structure'
                            ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-white dark:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <Columns size={16} />
                    <span>{t('db_viewer.structure')}</span>
                </button>
            </div>
        </>
    );
};
