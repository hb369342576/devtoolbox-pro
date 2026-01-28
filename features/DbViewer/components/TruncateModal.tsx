import React, { useState, useMemo } from 'react';
import { X, Trash2, Copy, Search, Filter } from 'lucide-react';
import { Language } from '../../../types';
import { useToast } from '../../../components/ui/Toast';

interface TruncateModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: string[];
    databaseName: string;
    lang: Language;
}

export const TruncateModal: React.FC<TruncateModalProps> = ({
    isOpen,
    onClose,
    tables,
    databaseName,
    lang
}) => {
    const [prefix, setPrefix] = useState('');
    const [suffix, setSuffix] = useState('');
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    // 过滤表列表
    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            const matchPrefix = !prefix || table.startsWith(prefix);
            const matchSuffix = !suffix || table.endsWith(suffix);
            const matchSearch = !search || table.toLowerCase().includes(search.toLowerCase());
            return matchPrefix && matchSuffix && matchSearch;
        });
    }, [tables, prefix, suffix, search]);

    // 生成 TRUNCATE 语句
    const truncateStatements = useMemo(() => {
        return filteredTables.map(table => `TRUNCATE TABLE \`${databaseName}\`.\`${table}\`;`).join('\n');
    }, [filteredTables, databaseName]);

    const handleCopy = async () => {
        if (!truncateStatements) {
            showToast(lang === 'zh' ? '没有可复制的语句' : 'No statements to copy', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(truncateStatements);
            showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast(lang === 'zh' ? '复制失败' : 'Failed to copy', 'error');
        }
    };

    const handleClear = () => {
        setPrefix('');
        setSuffix('');
        setSearch('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-[600px] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center space-x-2">
                        <Trash2 className="text-red-500" size={20} />
                        <h3 className="font-bold text-slate-800 dark:text-white">
                            {lang === 'zh' ? '清理数据库' : 'Truncate Database'}
                        </h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            - {databaseName}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filter Section */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        <Filter size={14} />
                        <span>{lang === 'zh' ? '过滤条件' : 'Filters'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 搜索框 */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={lang === 'zh' ? '搜索表名...' : 'Search tables...'}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 前缀过滤 */}
                        <div>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder={lang === 'zh' ? '前缀过滤...' : 'Prefix filter...'}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 后缀过滤 */}
                        <div>
                            <input
                                type="text"
                                value={suffix}
                                onChange={(e) => setSuffix(e.target.value)}
                                placeholder={lang === 'zh' ? '后缀过滤...' : 'Suffix filter...'}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                            {lang === 'zh'
                                ? `匹配 ${filteredTables.length} / ${tables.length} 个表`
                                : `Matching ${filteredTables.length} / ${tables.length} tables`}
                        </span>
                        {(prefix || suffix || search) && (
                            <button
                                onClick={handleClear}
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {lang === 'zh' ? '清除过滤' : 'Clear Filters'}
                            </button>
                        )}
                    </div>
                </div>

                {/* SQL Content */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-100 dark:bg-slate-800 shrink-0">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            TRUNCATE SQL
                        </span>
                        <button
                            onClick={handleCopy}
                            disabled={filteredTables.length === 0}
                            className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Copy size={12} />
                            <span>{lang === 'zh' ? '复制全部' : 'Copy All'}</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre custom-scrollbar">
                        {filteredTables.length === 0 ? (
                            <span className="text-slate-400 italic">
                                {lang === 'zh' ? '没有匹配的表' : 'No matching tables'}
                            </span>
                        ) : (
                            truncateStatements
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {lang === 'zh' ? '关闭' : 'Close'}
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={filteredTables.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <Copy size={16} />
                        <span>{lang === 'zh' ? '复制语句' : 'Copy Statements'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
