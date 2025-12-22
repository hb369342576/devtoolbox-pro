import React, { useRef, useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Link as LinkIcon, Lock } from 'lucide-react';
import { useFieldMappingStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { CanvasNode, CanvasLink, Language, DbConnection, TableInfo, TableDetail } from '../../../types';
import { getTexts } from '../../../locales';

interface CanvasProps {
    lang: Language;
    connections: DbConnection[];
}

export const Canvas: React.FC<CanvasProps> = ({ lang, connections }) => {
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

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // for Panning or Node Drag

    const [dragNodeId, setDragNodeId] = useState<string | null>(null);
    const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
    const [tempLinkEnd, setTempLinkEnd] = useState<{ x: number, y: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Convert screen coords to canvas coords
    const toCanvasCoords = (cx: number, cy: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (cx - rect.left - offset.x) / scale,
            y: (cy - rect.top - offset.y) / scale
        };
    };

    // Handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const newScale = Math.min(Math.max(scale - e.deltaY * 0.001, 0.1), 3);
            setScale(newScale);
        } else {
            setOffset(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };



    // Global Event Handlers
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setOffset({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            }

            if (dragNodeId) {
                const pos = toCanvasCoords(e.clientX, e.clientY);
                updateNode(dragNodeId, { x: pos.x - 100, y: pos.y - 20 });
            }

            if (linkingSourceId) {
                const pos = toCanvasCoords(e.clientX, e.clientY);
                setTempLinkEnd({ x: pos.x, y: pos.y });
            }
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
            setDragNodeId(null);
            setLinkingSourceId(null);
            setTempLinkEnd(null);
        };

        if (isDragging || dragNodeId || linkingSourceId) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDragging, dragNodeId, linkingSourceId, dragStart, offset, scale]); // Dependencies matter for calculations!

    const handleMouseDown = (e: React.MouseEvent) => {
        // If clicking on background, start Pan
        if ((e.target as HTMLElement).classList.contains('canvas-bg')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }
    };

    // Node Interaction
    const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
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
            if (source?.type === 'source' && target?.type === 'target') {
                // Check exists
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
        // Cleanup happens in windowMouseUp usually, but good to have explicit here too if MouseUp happens on element
        setLinkingSourceId(null);
        setTempLinkEnd(null);
    };

    const handleLinkClick = (link: CanvasLink) => {
        setActiveLink(link);
        setShowMappingModal(true);
    };

    // Rendering Helpers
    const getNodeCenter = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        // Assuming node width=200, height=header+fields
        // We link from header mostly.
        return node ? { x: node.x + 200, y: node.y + 40 } : { x: 0, y: 0 };
    };

    const getTargetLeft = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        return node ? { x: node.x, y: node.y + 40 } : { x: 0, y: 0 };
    };

    // Draw Bezier
    const drawPath = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        const dx = Math.abs(p1.x - p2.x) * 0.5;
        return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    };

    // Global Store Drag Item
    const draggedItem = useFieldMappingStore((state) => state.draggedItem);

    // Drop Handler (Mouse Up)
    const handleMouseUp = async (e: React.MouseEvent) => {
        if (draggedItem) {
            e.stopPropagation(); // Stop global clear
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

                    // Trigger save
                    useFieldMappingStore.getState().saveCurrentProfile();
                }
            } catch (err) {
                console.error(err);
            }
            // Clear drag state is handled by GlobalMouseUp? 
            // If we stopPropagation, Global might not receive it?
            // Global listener is on container. 
            // We should manually clear here to be safe.
            useFieldMappingStore.getState().setDraggedItem(null);
            return;
        }

        // This part handles the case where the mouseup event is on the canvas
        // but not related to a draggedItem from the sidebar.
        // It should not interfere with the global window mouseup for panning/node dragging.
        // The global window mouseup will handle clearing isDragging, dragNodeId, linkingSourceId, tempLinkEnd.
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 overflow-hidden relative canvas-bg cursor-move"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Background Grid */}
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
                            <g key={link.id} onClick={(e) => { e.stopPropagation(); handleLinkClick(link); }} className="cursor-pointer pointer-events-auto">
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
                    <div
                        key={node.id}
                        className={`absolute w-[220px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 flex flex-col ${node.type === 'source' ? 'border-blue-500' : 'border-green-500'
                            }`}
                        style={{
                            left: node.x,
                            top: node.y,
                        }}
                        onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                    >
                        {/* Header */}
                        <div className={`p-2 ${node.type === 'source' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'} font-bold text-sm flex justify-between items-center rounded-t-lg handle cursor-grab`}>
                            <span className="truncate">{node.tableName}</span>
                            <div className="flex space-x-1">
                                {node.type === 'source' && (
                                    <button
                                        onMouseDown={(e) => handleLinkStart(e, node.id)}
                                        className="p-1 hover:bg-white/50 rounded" title="拖拽连接"
                                    >
                                        <LinkIcon size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                                    className="p-1 hover:bg-red-200 text-red-500 rounded"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Columns (Preview first 5) */}
                        <div className="p-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 max-h-[150px] overflow-hidden pointer-events-none">
                            {node.columns.map(c => (
                                <div key={c.name} className="flex justify-between">
                                    <span>{c.name}</span>
                                    <span className="text-slate-400">{c.type}</span>
                                </div>
                            ))}
                        </div>

                        {/* Connect Point Target */}
                        {node.type === 'target' && (
                            <div
                                className="absolute -left-3 top-8 w-6 h-6 bg-green-200 border-2 border-green-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110"
                                onMouseUp={(e) => handleLinkEnd(e, node.id)}
                            >
                                <LinkIcon size={12} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
                <button onClick={() => setScale(s => s + 0.1)} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><ZoomIn size={20} /></button>
                <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><ZoomOut size={20} /></button>
                <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="p-2 bg-white dark:bg-slate-800 rounded shadow"><Move size={20} /></button>
            </div>
        </div>
    );
};
