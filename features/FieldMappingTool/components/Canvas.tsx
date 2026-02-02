import React, { useRef, useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Link as LinkIcon, Lock, Trash2 } from 'lucide-react';
import { useFieldMappingStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { CanvasNode, CanvasLink, Language, DbConnection, TableInfo, TableDetail } from '../../../types';
import { getTexts } from '../../../locales';

interface CanvasProps {
    lang: Language;
    connections: DbConnection[];
    onNodeClick?: (node: CanvasNode) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ lang, connections, onNodeClick }) => {
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

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'node' | 'link';
        targetId: string;
    } | null>(null);

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
            // 允许 source/transform 连接到 target/sink/transform
            const validSourceTypes = ['source', 'transform'];
            const validTargetTypes = ['target', 'sink', 'transform'];
            if (source && target && validSourceTypes.includes(source.type) && validTargetTypes.includes(target.type)) {
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

    // 双击连线打开映射编辑
    const handleLinkDoubleClick = (link: CanvasLink) => {
        // 追溯完整路径找到 source 和 sink 节点
        const sourceNode = findPathSource(link.sourceNodeId);
        const sinkNode = findPathSink(link.targetNodeId);
        
        if (sourceNode && sinkNode) {
            // 获取 source 和 sink 的列信息并设置到连线两端节点上
            const currentSourceNode = nodes.find(n => n.id === link.sourceNodeId);
            const currentTargetNode = nodes.find(n => n.id === link.targetNodeId);
            
            // 如果当前节点没有 columns（比如是 transform），使用路径上的 source/sink 的 columns
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

    // 追溯路径找到 source 节点（向上追溯）
    const findPathSource = (nodeId: string): CanvasNode | undefined => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return undefined;
        if (node.type === 'source') return node;
        
        // 查找指向当前节点的连线
        const incomingLink = links.find(l => l.targetNodeId === nodeId);
        if (incomingLink) {
            return findPathSource(incomingLink.sourceNodeId);
        }
        return undefined;
    };

    // 追溯路径找到 sink 节点（向下追溯）
    const findPathSink = (nodeId: string): CanvasNode | undefined => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return undefined;
        if (node.type === 'sink' || node.type === 'target') return node;
        
        // 查找从当前节点出发的连线
        const outgoingLink = links.find(l => l.sourceNodeId === nodeId);
        if (outgoingLink) {
            return findPathSink(outgoingLink.targetNodeId);
        }
        return undefined;
    };

    // 右键菜单处理
    const handleContextMenu = (e: React.MouseEvent, type: 'node' | 'link', targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type,
            targetId
        });
    };

    // 关闭右键菜单
    const closeContextMenu = () => {
        setContextMenu(null);
    };

    // 处理删除
    const handleDelete = () => {
        if (!contextMenu) return;
        if (contextMenu.type === 'node') {
            deleteNode(contextMenu.targetId);
        } else {
            deleteLink(contextMenu.targetId);
        }
        closeContextMenu();
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

    // HTML5 Drop handler for sidebar node types
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

    // Drop Handler (Mouse Up) - legacy for draggedItem from old sidebar
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

    // Node click handler
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
                {nodes.map(node => {
                    // 根据节点类型设置颜色
                    const nodeColors = {
                        source: { border: 'border-blue-500', header: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-200 border-blue-500' },
                        sink: { border: 'border-green-500', header: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-200 border-green-500' },
                        target: { border: 'border-green-500', header: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-200 border-green-500' },
                        transform: { border: 'border-amber-500', header: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-200 border-amber-500' }
                    };
                    const colors = nodeColors[node.type] || nodeColors.source;
                    const displayName = node.tableName || (node.type === 'source' ? 'Source' : node.type === 'sink' ? 'Sink' : 'Transform');

                    return (
                        <div
                            key={node.id}
                            className={`absolute w-[220px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 flex flex-col ${colors.border} cursor-pointer hover:shadow-xl transition-shadow`}
                            style={{ left: node.x, top: node.y }}
                            onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                            onDoubleClick={(e) => handleNodeClick(e, node)}
                            onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                        >
                            {/* Header */}
                            <div className={`p-2 ${colors.header} font-bold text-sm flex justify-between items-center rounded-t-lg handle cursor-grab`}>
                                <span className="truncate">{displayName}</span>
                                <div className="flex space-x-1">
                                    {(node.type === 'source' || node.type === 'transform') && (
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

                            {/* Node Content: Transform shows SQL, Source/Sink shows columns */}
                            <div className="p-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 max-h-[150px] overflow-hidden">
                                {node.type === 'transform' ? (
                                    // Transform 节点显示 SQL 片段
                                    node.sql ? (
                                        <pre className="font-mono text-amber-600 dark:text-amber-400 whitespace-pre-wrap overflow-hidden">
                                            {node.sql.slice(0, 100)}{node.sql.length > 100 ? '...' : ''}
                                        </pre>
                                    ) : (
                                        <div className="text-center text-slate-400 py-2">
                                            {lang === 'zh' ? '双击编写 SQL' : 'Double-click to write SQL'}
                                        </div>
                                    )
                                ) : (
                                    // Source/Sink 节点显示列信息
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
                                            {lang === 'zh' ? '双击配置数据源' : 'Double-click to configure'}
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Connect Point for Target/Sink */}
                            {(node.type === 'target' || node.type === 'sink' || node.type === 'transform') && (
                                <div
                                    className={`absolute -left-3 top-8 w-6 h-6 ${colors.dot} border-2 rounded-full flex items-center justify-center cursor-pointer hover:scale-110`}
                                    onMouseUp={(e) => handleLinkEnd(e, node.id)}
                                >
                                    <LinkIcon size={12} />
                                </div>
                            )}
                        </div>
                    );
                })}
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
                    {/* Backdrop to close menu */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={closeContextMenu}
                        onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
                    />
                    {/* Menu */}
                    <div 
                        className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 py-1 min-w-[120px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                            <Trash2 size={14} />
                            <span>{lang === 'zh' ? '删除' : 'Delete'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
