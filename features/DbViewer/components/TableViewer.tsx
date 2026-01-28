import React, { useState } from 'react';
import { Table as TableIcon, Code, Copy, Loader2, Columns, Key, RefreshCw } from 'lucide-react';
import { detectDbTypeFromDdl, convertMysqlToDoris, convertDorisToMysql, formatColumnType } from '../utils/ddlConverter';
import { Language } from '../../../types';
import { useDbViewerStore } from '../store';
import { getTexts } from '../../../locales';
import { useTableDetail } from '../hooks/useTableDetail';
import { ContextMenu } from '../../../components/ui/ContextMenu';
import { useToast } from '../../../components/ui/Toast';

export const TableViewer: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = getTexts(lang);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const columns = useDbViewerStore((state) => state.columns);
    const ddl = useDbViewerStore((state) => state.ddl);

    const { showToast } = useToast();

    // 触发数据加载
    const { loading, error } = useTableDetail();

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);

    // Resize Logic
    const [ddlHeight, setDdlHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);

    // DDL 转换状态
    const [isConvertedDdl, setIsConvertedDdl] = useState(false);
    const [convertedDdl, setConvertedDdl] = useState('');

    // 根据 DDL 内容检测实际的数据库类型（MySQL 还是 Doris）
    const detectedDbType = detectDbTypeFromDdl(ddl);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    // Actually, attaching to document is better for smooth dragging.
    // Using useEffect.
    React.useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const container = document.getElementById('table-viewer-split-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const newHeight = rect.bottom - e.clientY;
                if (newHeight > 50 && newHeight < rect.height - 100) {
                    setDdlHeight(newHeight);
                }
            }
        };

        const handleGlobalMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isResizing]);

    // Switch table: Reset conversion state
    React.useEffect(() => {
        setIsConvertedDdl(false);
        setConvertedDdl('');
    }, [selectedTable]);



    // DDL 转换函数：MySQL <-> Doris
    const handleConvertDdl = () => {
        if (isConvertedDdl) {
            setIsConvertedDdl(false);
            setConvertedDdl('');
            return;
        }

        if (!ddl || columns.length === 0) return;

        const tableName = selectedTable || 'unknown_table';
        const isMySQL = detectedDbType === 'mysql';

        let result = '';

        if (isMySQL) {
            // MySQL -> Doris: 使用共享的转换函数
            result = convertMysqlToDoris(tableName, columns, ddl);
        } else {
            // Doris -> MySQL: 使用共享的转换函数
            result = convertDorisToMysql(tableName, columns, ddl);
        }

        setConvertedDdl(result);
        setIsConvertedDdl(true);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(lang === 'zh' ? '复制成功' : 'Copied successfully', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast(lang === 'zh' ? '复制失败' : 'Failed to copy', 'error');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'column' | 'ddl', data?: any) => {
        e.preventDefault();

        let items = [];

        if (type === 'column') {
            const colName = data?.name;
            items = [
                {
                    label: lang === 'zh' ? '复制列名' : 'Copy Column Name',
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(colName)
                },
                {
                    label: lang === 'zh' ? '复制所有列 (逗号分隔)' : 'Copy All Columns (CSV)',
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join(', '))
                },
                {
                    label: lang === 'zh' ? '复制所有列 (列表)' : 'Copy All Columns (List)',
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join('\n'))
                }
            ];
        } else if (type === 'ddl') {
            items = [
                {
                    label: lang === 'zh' ? '复制 DDL' : 'Copy DDL',
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(isConvertedDdl ? convertedDdl : ddl)
                }
            ];

            // 添加转换选项
            if (detectedDbType === 'mysql' || detectedDbType === 'doris') {
                items.push({
                    label: isConvertedDdl
                        ? (lang === 'zh' ? '恢复原始 DDL' : 'Restore Original DDL')
                        : (lang === 'zh' ? `转换为 ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}` : `Convert to ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}`),
                    icon: <RefreshCw size={14} />,
                    onClick: handleConvertDdl
                });
            }
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items
        });
    };

    if (!selectedTable) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                <TableIcon size={64} className="mb-4 opacity-20" />
                <p className="text-lg">{t.dbViewer.selectDb}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                    <TableIcon className="mr-2 text-blue-600" size={20} />
                    {selectedTable}
                </h2>
                {loading && (
                    <div className="flex items-center text-slate-500 text-sm">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        {lang === 'zh' ? '加载中...' : 'Loading...'}
                    </div>
                )}
            </div>

            {/* Split View Container */}
            <div id="table-viewer-split-container" className="flex-1 flex flex-col min-h-0 relative">
                {/* Top: Columns List */}
                <div
                    className="flex-1 overflow-auto border-b border-slate-200 dark:border-slate-700"
                    onContextMenu={(e) => {
                        // prevent default only if clicking on empty space? 
                        // Better to only allow context menu on the list area
                    }}
                >
                    {/* Using a wrapper for context menu on the whole list area if needed, 
                         but request said "Right click column list". 
                         I'll put reference on the table body or rows. */}
                    <div onContextMenu={(e) => handleContextMenu(e, 'column', { name: columns.length > 0 ? columns[0].name : '' })}> {/* Fallback for empty area click? */}
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-center w-12">#</th>
                                    <th className="px-2 py-2 font-medium text-slate-600 dark:text-slate-300 text-center w-10" title="Primary Key">PK</th>
                                    <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Name</th>
                                    <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Type</th>
                                    <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-center">Nullable</th>
                                    <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-left">Comment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {columns.map((col, idx) => (
                                    <tr
                                        key={col.name}
                                        title={col.name}
                                        className="hover:bg-blue-50 dark:hover:bg-blue-900/20 group cursor-pointer"
                                        onContextMenu={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, 'column', col);
                                        }}
                                    >
                                        <td className="px-4 py-2 text-slate-400 text-xs text-center">{idx + 1}</td>
                                        <td className="px-2 py-2 text-center flex items-center justify-center">
                                            {col.isPrimaryKey && <Key size={14} className="text-yellow-500" />}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-slate-800 dark:text-white font-medium">
                                            {col.name}
                                        </td>
                                        <td className="px-4 py-2 text-blue-600 dark:text-blue-400 font-mono text-xs">{formatColumnType(col)}</td>
                                        <td className="px-4 py-2 text-center text-xs">
                                            {col.nullable ? <span className="text-slate-400">Yes</span> : <span className="font-bold text-slate-600 dark:text-slate-300">No</span>}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs truncate max-w-xs" title={col.comment}>
                                            {col.comment}
                                        </td>
                                    </tr>
                                ))}
                                {columns.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            {lang === 'zh' ? '暂无字段信息' : 'No columns found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Resizer Handle */}
                <div
                    className="h-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 cursor-row-resize flex items-center justify-center z-20 shrink-0 transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                {/* Bottom: DDL */}
                <div
                    className="flex flex-col bg-slate-50 dark:bg-slate-900 shrink-0"
                    style={{ height: ddlHeight }}
                    onContextMenu={(e) => handleContextMenu(e, 'ddl')}
                >
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-slate-100 dark:bg-slate-800">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                            <Code size={14} className="mr-2" />
                            DDL Statement
                            {isConvertedDdl && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">
                                    {detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}
                                </span>
                            )}
                        </span>
                        <div className="flex items-center space-x-1">
                            {(detectedDbType === 'mysql' || detectedDbType === 'doris') && ddl && (
                                <button
                                    onClick={handleConvertDdl}
                                    className={`p-1 rounded transition-colors flex items-center text-xs ${isConvertedDdl
                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900'
                                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                        }`}
                                    title={isConvertedDdl
                                        ? (lang === 'zh' ? '恢复原始 DDL' : 'Restore Original')
                                        : (lang === 'zh' ? `转换为 ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}` : `Convert to ${detectedDbType === 'mysql' ? 'Doris' : 'MySQL'}`)}
                                >
                                    <RefreshCw size={14} className={isConvertedDdl ? 'mr-1' : ''} />
                                    {isConvertedDdl && (lang === 'zh' ? '恢复' : 'Restore')}
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(isConvertedDdl ? convertedDdl : ddl);
                                }}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                                title={lang === 'zh' ? '复制' : 'Copy'}
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre">
                        {isConvertedDdl ? convertedDdl : (ddl || (loading ? (lang === 'zh' ? '加载中...' : 'Loading...') : (lang === 'zh' ? '无 DDL 信息' : 'No DDL available')))}
                    </div>
                </div>
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};
