import React from 'react';
import { Database, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { DbConnection } from '../../../types';

interface DatabaseSelectorProps {
    selectedConnection: DbConnection | null;
    setSelectedConnection: (conn: DbConnection | null) => void;
    selectedDatabase: string | null;
    setSelectedDatabase: (db: string) => void;
    databases: string[];
    dbLoading: boolean;
    dbError: string | null;
    handleDatabaseContextMenu: (e: React.MouseEvent) => void;
}

export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
    selectedConnection, setSelectedConnection, selectedDatabase,
    setSelectedDatabase, databases, dbLoading, dbError,
    handleDatabaseContextMenu
}) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white truncate flex items-center">
                    <Database size={16} className="mr-2 text-blue-600" />
                    {selectedConnection?.name}
                </h3>
                <button
                    onClick={() => setSelectedConnection(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title={t('dbViewer.disconnect', { defaultValue: '断开连接' })}
                >
                    <LogOut size={16} />
                </button>
            </div>

            <div className="mb-4" onContextMenu={handleDatabaseContextMenu}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    {t('dbViewer.selectDatabase', { defaultValue: '选择数据库' })}
                </label>
                <div className="relative">
                    <select
                        value={selectedDatabase || ''}
                        onChange={(e) => setSelectedDatabase(e.target.value)}
                        disabled={dbLoading || databases.length === 0}
                        className="w-full px-3 py-2 pr-8 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    >
                        <option value="">
                            {dbLoading
                                ? t('dbViewer.loading', { defaultValue: '加载中...' })
                                : t('dbViewer.selectADatabase', { defaultValue: '请选择数据库' })}
                        </option>
                        {databases.map(db => (
                            <option key={db} value={db}>
                                {db}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                {dbError && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{dbError}</p>
                )}
            </div>
        </div>
    );
};
