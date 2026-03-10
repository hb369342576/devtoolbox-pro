import React from 'react';
import { X, Link as LinkIcon } from 'lucide-react';
import { CanvasNode } from '../../../types';
import { useTranslation } from "react-i18next";

interface CanvasNodeItemProps {
    node: CanvasNode;
    onNodeDragStart: (e: React.MouseEvent, id: string) => void;
    onNodeClick: (e: React.MouseEvent, node: CanvasNode) => void;
    onContextMenu: (e: React.MouseEvent, type: 'node' | 'link', id: string) => void;
    onLinkStart: (e: React.MouseEvent, id: string) => void;
    onLinkEnd: (e: React.MouseEvent, targetId: string) => void;
    onDelete: (id: string) => void;
}

export const CanvasNodeItem: React.FC<CanvasNodeItemProps> = ({
    node,
    onNodeDragStart,
    onNodeClick,
    onContextMenu,
    onLinkStart,
    onLinkEnd,
    onDelete
}) => {
    const { t } = useTranslation();

    const nodeColors = {
        source: { border: 'border-blue-500', header: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-200 border-blue-500' },
        sink: { border: 'border-green-500', header: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-200 border-green-500' },
        target: { border: 'border-green-500', header: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-200 border-green-500' },
        transform: { border: 'border-amber-500', header: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-200 border-amber-500' }
    };
    const colors = nodeColors[node.type as keyof typeof nodeColors] || nodeColors.source;
    const displayName = node.tableName || (node.type === 'source' ? 'Source' : node.type === 'sink' ? 'Sink' : 'Transform');

    return (
        <div
            className={`absolute w-[220px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 flex flex-col ${colors.border} cursor-pointer hover:shadow-xl transition-shadow`}
            style={{ left: node.x, top: node.y }}
            onMouseDown={(e) => onNodeDragStart(e, node.id)}
            onDoubleClick={(e) => onNodeClick(e, node)}
            onContextMenu={(e) => onContextMenu(e, 'node', node.id)}
        >
            {/* Header */}
            <div className={`p-2 ${colors.header} font-bold text-sm flex justify-between items-center rounded-t-lg handle cursor-grab`}>
                <span className="truncate">{displayName}</span>
                <div className="flex space-x-1">
                    {(node.type === 'source' || node.type === 'transform') && (
                        <button
                            onMouseDown={(e) => onLinkStart(e, node.id)}
                            className="p-1 hover:bg-white/50 rounded" title="拖拽连接"
                        >
                            <LinkIcon size={12} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                        className="p-1 hover:bg-red-200 text-red-500 rounded"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Node Content */}
            <div className="p-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 max-h-[150px] overflow-hidden">
                {node.type === 'transform' ? (
                    node.sql ? (
                        <pre className="font-mono text-amber-600 dark:text-amber-400 whitespace-pre-wrap overflow-hidden">
                            {node.sql.slice(0, 100)}{node.sql.length > 100 ? '...' : ''}
                        </pre>
                    ) : (
                        <div className="text-center text-slate-400 py-2">
                            {t('mapping.doubleClickToWriteSQL')}
                        </div>
                    )
                ) : (
                    node.columns && node.columns.length > 0 ? (
                        <>
                            {node.columns.slice(0, 5).map(c => (
                                <div key={c.name} className="flex justify-between">
                                    <span>{c.name}</span>
                                    <span className="text-slate-400">{c.type}</span>
                                </div>
                            ))}
                            {node.columns.length > 5 && (
                                <div className="text-center text-slate-400">...</div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-slate-400 py-2">
                            {t('mapping.doubleClickToConfigure')}
                        </div>
                    )
                )}
            </div>

            {/* Connect Point for Target/Sink */}
            {(node.type === 'target' || node.type === 'sink' || node.type === 'transform') && (
                <div
                    className={`absolute -left-3 top-8 w-6 h-6 ${colors.dot} border-2 rounded-full flex items-center justify-center cursor-pointer hover:scale-110`}
                    onMouseUp={(e) => onLinkEnd(e, node.id)}
                >
                    <LinkIcon size={12} />
                </div>
            )}
        </div>
    );
};
