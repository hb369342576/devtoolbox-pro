import React, { useRef } from 'react';
import { ZoomIn, ZoomOut, Move, Trash2 } from 'lucide-react';
import { useFieldMappingStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { CanvasNode, CanvasLink, DbConnection, TableDetail } from '../../../types';
import { useTranslation } from "react-i18next";
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';
import { CanvasNodeItem } from './CanvasNodeItem';

interface CanvasProps {
    connections: DbConnection[];
    onNodeClick?: (node: CanvasNode) => void;
    lang?: string;
}

export const Canvas: React.FC<CanvasProps> = ({ connections, onNodeClick }) => {
    const { t } = useTranslation();
    const {
        nodes,
        links,
        updateNode,
        addLink,
        setActiveLink,
        setShowMappingModal,
        deleteNode,
        deleteLink
    } = useFieldMappingStore();

    const containerRef = useRef<HTMLDivElement>(null);

    const {
        scale, setScale,
        offset, setOffset,
        setDragNodeId,
        linkingSourceId, setLinkingSourceId,
        tempLinkEnd,
        contextMenu,
        handleWheel, handleMouseDown,
        toCanvasCoords,
        handleContextMenu, closeContextMenu
    } = useCanvasInteractions(containerRef);

    const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDragNodeId(id);
    };

    const handleLinkStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setLinkingSourceId(id);
    };

    const handleLinkEnd = (e: React.MouseEvent, targetId: string) => {
        e.stopPropagation();
        if (linkingSourceId && linkingSourceId !== targetId) {
            const source = nodes.find(n => n.id === linkingSourceId);
            const target = nodes.find(n => n.id === targetId);
            const validSourceTypes = ['source', 'transform'];
            const validTargetTypes = ['target', 'sink', 'transform'];
            if (source && target && validSourceTypes.includes(source.type) && validTargetTypes.includes(target.type)) {
                const exists = links.find(l => l.sourceNodeId === linkingSourceId && l.targetNodeId === targetId);
                if (!exists) {
                    addLink({
                        id: Date.now().toString(),
                        sourceNodeId: linkingSourceId,
                        targetNodeId: targetId,
                        mappings: []
                    });
                }
            }
        }
        setLinkingSourceId(null);
    };

    const findPathSource = (nodeId: string): CanvasNode | undefined => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return undefined;
        if (node.type === 'source') return node;
        const incomingLink = links.find(l => l.targetNodeId === nodeId);
        if (incomingLink) return findPathSource(incomingLink.sourceNodeId);
        return undefined;
    };

    const findPathSink = (nodeId: string): CanvasNode | undefined => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return undefined;
        if (node.type === 'sink' || node.type === 'target') return node;
        const outgoingLink = links.find(l => l.sourceNodeId === nodeId);
        if (outgoingLink) return findPathSink(outgoingLink.targetNodeId);
        return undefined;
    };

    const handleLinkDoubleClick = (link: CanvasLink) => {
        const sourceNode = findPathSource(link.sourceNodeId);
        const sinkNode = findPathSink(link.targetNodeId);
        
        if (sourceNode && sinkNode) {
            const currentSourceNode = nodes.find(n => n.id === link.sourceNodeId);
            const currentTargetNode = nodes.find(n => n.id === link.targetNodeId);
            
            if (currentSourceNode && !currentSourceNode.columns?.length && sourceNode.columns?.length) {
                updateNode(currentSourceNode.id, { columns: sourceNode.columns });
            }
            if (currentTargetNode && !currentTargetNode.columns?.length && sinkNode.columns?.length) {
                updateNode(currentTargetNode.id, { columns: sinkNode.columns });
            }
        }
        
        setActiveLink(link);
        setShowMappingModal(true);
    };

    const handleDelete = () => {
        if (!contextMenu) return;
        if (contextMenu.type === 'node') {
            deleteNode(contextMenu.targetId);
        } else {
            deleteLink(contextMenu.targetId);
        }
        closeContextMenu();
    };

    const getNodeCenter = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        return node ? { x: node.x + 200, y: node.y + 40 } : { x: 0, y: 0 };
    };

    const getTargetLeft = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        return node ? { x: node.x, y: node.y + 40 } : { x: 0, y: 0 };
    };

    const drawPath = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        const dx = Math.abs(p1.x - p2.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    };

    const draggedItem = useFieldMappingStore((state) => state.draggedItem);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (nodeType) {
            const pos = toCanvasCoords(e.clientX, e.clientY);
            useFieldMappingStore.getState().addNode({
                id: Date.now().toString(),
                type: nodeType as 'source' | 'sink' | 'transform',
                x: pos.x - 100,
                y: pos.y - 20,
            });
            useFieldMappingStore.getState().saveCurrentProfile();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleMouseUp = async (e: React.MouseEvent) => {
        if (draggedItem) {
            e.stopPropagation();
            const pos = toCanvasCoords(e.clientX, e.clientY);

            try {
                const { table, side, connId, db } = draggedItem;
                const conn = connections.find(c => c.id === connId);

                if (conn) {
                    const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
                    const detail = await invoke<TableDetail>('db_get_table_schema', {
                        id: connStr,
                        db,
                        table: table.name
                    });

                    useFieldMappingStore.getState().addNode({
                        id: Date.now().toString(),
                        type: side,
                        x: pos.x - 100,
                        y: pos.y - 20,
                        tableName: table.name,
                        dbType: conn.type,
                        columns: detail.columns
                    });

                    useFieldMappingStore.getState().saveCurrentProfile();
                }
            } catch (err) {
                console.error(err);
            }
            useFieldMappingStore.getState().setDraggedItem(null);
            return;
        }
    };

    const handleNodeClick = (e: React.MouseEvent, node: CanvasNode) => {
        e.stopPropagation();
        if (onNodeClick) {
            onNodeClick(node);
        }
    };

    return (
        <div
            ref={containerRef}
            className="h-full w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 overflow-hidden relative canvas-bg cursor-move"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)',
                    backgroundSize: `${20 * scale}px ${20 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`
                }}
            />

            <div
                className="absolute transform-origin-tl"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Links Layer */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none" style={{ overflow: 'visible' }}>
                    {links.map(link => {
                        const p1 = getNodeCenter(link.sourceNodeId);
                        const p2 = getTargetLeft(link.targetNodeId);
                        return (
                            <g 
                                key={link.id} 
                                onDoubleClick={(e) => { e.stopPropagation(); handleLinkDoubleClick(link); }} 
                                onContextMenu={(e) => handleContextMenu(e, 'link', link.id)}
                                className="cursor-pointer pointer-events-auto"
                            >
                                <path
                                    d={drawPath(p1, p2)}
                                    stroke="#94a3b8"
                                    strokeWidth="4"
                                    fill="none"
                                    className="hover:stroke-indigo-500 transition-colors"
                                />
                                <circle cx={(p1.x + p2.x) / 2} cy={(p1.y + p2.y) / 2} r="10" fill="white" stroke="#64748b" strokeWidth="2" />
                                <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2} dy="4" textAnchor="middle" fontSize="10" fill="#475569">{link.mappings.length}</text>
                            </g>
                        );
                    })}
                    {linkingSourceId && tempLinkEnd && (
                        <path
                            d={drawPath(getNodeCenter(linkingSourceId), tempLinkEnd)}
                            stroke="#6366f1"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                        />
                    )}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => (
                    <CanvasNodeItem
                        key={node.id}
                        node={node}
                        onNodeDragStart={handleNodeDragStart}
                        onNodeClick={handleNodeClick}
                        onContextMenu={handleContextMenu}
                        onLinkStart={handleLinkStart}
                        onLinkEnd={handleLinkEnd}
                        onDelete={deleteNode}
                    />
                ))}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
                <button onClick={() => setScale(s => s + 0.1)} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><ZoomIn size={20} /></button>
                <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><ZoomOut size={20} /></button>
                <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><Move size={20} /></button>
            </div>

            {/* Right-Click Context Menu */}
            {contextMenu && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={closeContextMenu}
                        onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
                    />
                    <div 
                        className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 py-1 min-w-[120px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                            <Trash2 size={14} />
                            <span>{t('mapping.delete')}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
