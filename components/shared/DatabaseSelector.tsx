import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { DbConnection, Language } from '../../types';
import { useDatabase } from '../../hooks/useDatabase';

interface DatabaseSelectorProps {
    connection: DbConnection | null;
    value: string;
    onChange: (database: string) => void;
    lang: Language;
    disabled?: boolean;
    className?: string;
}

/**
 * 通用数据库选择器组件
 * 可在多个功能模块中复用
 */
export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
    connection,
    value,
    onChange,
    lang,
    disabled = false,
    className = ''
}) => {
    const { databases, loading, error, refetch } = useDatabase(connection);

    return (
        <div className={className}>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                {lang === 'zh' ? '选择数据库' : 'Select Database'}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || !connection || loading}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white disabled:opacity-50 truncate pr-10"
                >
                    <option value="">-- {lang === 'zh' ? '选择数据库' : 'Select DB'} --</option>
                    {databases.map((db) => (
                        <option key={db} value={db}>
                            {db}
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

                {/* 数据库图标 */}
                {!loading && databases.length > 0 && (
                    <Database
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}
            </div>

            {/* 错误提示 */}
            {error && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
            )}

            {/* 重试按钮 */}
            {error && (
                <button
                    onClick={refetch}
                    className="mt-1 text-xs text-blue-500 hover:underline"
                >
                    {lang === 'zh' ? '重试' : 'Retry'}
                </button>
            )}
        </div>
    );
};
