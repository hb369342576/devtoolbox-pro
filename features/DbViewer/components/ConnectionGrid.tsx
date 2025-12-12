import React from 'react';
import { Database, Plus } from 'lucide-react';
import { Language, DbConnection } from '../../../types';

interface ConnectionGridProps {
    lang: Language;
    connections: DbConnection[];
    viewMode: 'grid' | 'list';
    onConnect: (conn: DbConnection) => void;
    onNavigate: (id: string) => void;
    onUpdate?: (conn: DbConnection) => void;
    onDelete?: (id: string) => void;
}

export const ConnectionGrid: React.FC<ConnectionGridProps> = ({
    lang,
    connections,
    viewMode,
    onConnect,
    onNavigate
}) => {
    if (connections.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <Database size={48} className="opacity-50" />
                </div>
                <p className="mb-4 text-lg">{lang === 'zh' ? '暂无数据源' : 'No Data Sources'}</p>
                <button
                    onClick={() => onNavigate('data-source-manager')}
                    className="text-blue-500 hover:underline"
                >
                    {lang === 'zh' ? '添加数据源' : 'Add Data Source'}
                </button>
            </div>
        );
    }

    return (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map(conn => (
                        <div
                            key={conn.id}
                            onClick={() => onConnect(conn)}
                            className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            {/* 渐变背景 */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                        <Database size={24} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {conn.name}
                                </h3>
                                <div className="text-sm text-slate-500 font-mono">{conn.host}:{conn.port}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                        <div className="col-span-4">{lang === 'zh' ? '连接名称' : 'Connection Name'}</div>
                        <div className="col-span-2">{lang === 'zh' ? '类型' : 'Type'}</div>
                        <div className="col-span-4">{lang === 'zh' ? '主机地址' : 'Host'}</div>
                        <div className="col-span-2">{lang === 'zh' ? '端口' : 'Port'}</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {connections.map(conn => (
                            <div
                                key={conn.id}
                                onClick={() => onConnect(conn)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                            >
                                <div className="col-span-4 flex items-center space-x-3">
                                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex-shrink-0">
                                        <Database size={16} />
                                    </div>
                                    <span className="font-medium text-slate-800 dark:text-white truncate">{conn.name}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{conn.type}</span>
                                </div>
                                <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                                    {conn.host}
                                </div>
                                <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                    {conn.port}
                                </div>
                            </div>
                        ))}
                        {connections.length === 0 && (
                            <div className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                {lang === 'zh' ? '暂无数据' : 'No data'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
