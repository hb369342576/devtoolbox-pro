import React from 'react';
import { Table as TableIcon, RefreshCw, Search } from 'lucide-react';
import { DbConnection, Language } from '../../types';
import { useTables } from '../../hooks/useTables';

interface TableSelectorProps {
    connection: DbConnection | null;
    database: string;
    value: string;
    onChange: (table: string) => void;
    lang: Language;
    disabled?: boolean;
    showSearch?: boolean;
    className?: string;
}

/**
 * 通用表选择器组件
 * 支持搜索过滤功能
 */
export const TableSelector: React.FC<TableSelectorProps> = ({
    connection,
    database,
    value,
    onChange,
    lang,
    disabled = false,
    showSearch = true,
    className = ''
}) => {
    const { tables, loading, error, refetch } = useTables(connection, database);
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredTables = React.useMemo(() => {
        if (!searchTerm) return tables;
        return tables.filter((table) =>
            table.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tables, searchTerm]);

    return (
        <div className={className}>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                {lang === 'zh' ? '选择表' : 'Select Table'}
            </label>

            {/* 搜索框 */}
            {showSearch && tables.length > 5 && (
                <div className="relative mb-2">
                    <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={lang === 'zh' ? '搜索表...' : 'Search tables...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={disabled || !database}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none disabled:opacity-50"
                    />
                </div>
            )}

            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || !database || loading}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate pr-10"
                >
                    <option value="">-- {lang === 'zh' ? '选择表' : 'Select Table'} --</option>
                    {filteredTables.map((table) => (
                        <option key={table.name} value={table.name}>
                            {table.name}
                        </option>
                    ))}
                </select>

                {/* 加载指示器 */}
                {loading && (
                    <RefreshCw
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                    />
                )}

                {/* 表图标 */}
                {!loading && tables.length > 0 && (
                    <TableIcon
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}
            </div>

            {/* 表数量提示 */}
            {tables.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                    {filteredTables.length !== tables.length
                        ? `${filteredTables.length} / ${tables.length} ${lang === 'zh' ? '个表' : 'tables'}`
                        : `${tables.length} ${lang === 'zh' ? '个表' : 'tables'}`}
                </p>
            )}

            {/* 错误提示 */}
            {error && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
            )}
        </div>
    );
};
