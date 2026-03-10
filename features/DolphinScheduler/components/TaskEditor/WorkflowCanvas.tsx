import React from 'react';
import { Search, Plus, Minus, Maximize, MousePointer2, Move, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskNode, TaskRelation, NODE_TYPES, NODE_WIDTH, NODE_HEIGHT, getNodeType } from './types';

interface WorkflowCanvasProps {
    taskNodes: TaskNode[];
    taskRelations: TaskRelation[];
    scale: number;
    offset: { x: number; y: number };
    canvasRef: React.RefObject<HTMLDivElement>;
    isReadOnly: boolean;
    selectedNode: TaskNode | null;
    isConnecting: boolean;
    connectingMousePos: { x: number; y: number };
    connectingFrom: TaskNode | null;
    hoveredRelation: number | null;
    setHoveredRelation: (index: number | null) => void;
    
    // Handlers
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    onNodeMouseDown: (e: React.MouseEvent, node: TaskNode) => void;
    onNodeMouseUp: (e: React.MouseEvent, node: TaskNode) => void;
    onNodeDoubleClick: (node: TaskNode) => void;
    onOutputPortMouseDown: (e: React.MouseEvent, node: TaskNode) => void;
    onInputPortMouseUp: (e: React.MouseEvent, node: TaskNode) => void;
    onDeleteRelation: (index: number) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onDragStart: (e: React.DragEvent, type: string) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    getConnectionPath: (from: TaskNode, to: TaskNode) => string;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onNodeContextMenu: (e: React.MouseEvent, node: TaskNode) => void;
    onRelationContextMenu: (e: React.MouseEvent, index: number) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
    const { t } = useTranslation();
    const {
        taskNodes, taskRelations, scale, offset, canvasRef, isReadOnly, selectedNode,
        isConnecting, connectingMousePos, connectingFrom, hoveredRelation, setHoveredRelation,
        onCanvasMouseDown, onNodeMouseDown, onNodeMouseUp, onNodeDoubleClick,
        onOutputPortMouseDown, onInputPortMouseUp, onDeleteRelation,
        onZoomIn, onZoomOut, onZoomReset,
        onDragStart, onDrop, onDragOver, getConnectionPath,
        onMouseMove, onMouseUp, onWheel,
        onNodeContextMenu, onRelationContextMenu
    } = props;

    return (
        <div className="flex-1 flex overflow-hidden relative">
            {/* 左侧节点列表 */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                        {t('dolphinScheduler.editor.nodeLibrary')}
                    </h3>
                    <div className="space-y-2">
                        {NODE_TYPES.map(type => (
                            <div
                                key={type.id}
                                draggable={!isReadOnly}
                                onDragStart={(e) => onDragStart(e, type.id.toUpperCase())}
                                className={`flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing group hover:shadow-md'}`}
                            >
                                <div className={`p-2 rounded-lg ${type.bgColor} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                                    <type.icon size={18} />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{type.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase">{type.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {t('dolphinScheduler.editor.activeNodes')}
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-slate-500">
                            {taskNodes.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {taskNodes.map(node => {
                            const typeInfo = getNodeType(node.taskType);
                            return (
                                <div 
                                    key={node.id}
                                    onClick={() => onNodeDoubleClick(node)}
                                    className={`flex items-center p-2 rounded-lg text-sm cursor-pointer transition-colors ${selectedNode?.id === node.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-2 ${typeInfo.bgColor}`} />
                                    <span className="truncate flex-1">{node.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 画布区域 */}
            <div 
                ref={canvasRef}
                className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden cursor-crosshair group"
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
                onContextMenu={(e) => e.preventDefault()}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                {/* 网格背景 */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] canvas-bg"
                    style={{
                        backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                        backgroundSize: `${20 * scale}px ${20 * scale}px`,
                        backgroundPosition: `${offset.x}px ${offset.y}px`
                    }}
                />
                
                {/* 缩放控制 */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1 flex flex-col">
                        <button onClick={onZoomIn} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title={t('dolphinScheduler.editor.zoomIn')}><Plus size={18} /></button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                        <button onClick={onZoomReset} className="p-2 text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors py-2">{Math.round(scale * 100)}%</button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                        <button onClick={onZoomOut} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title={t('dolphinScheduler.editor.zoomOut')}><Minus size={18} /></button>
                    </div>
                    <button onClick={onZoomReset} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors"><Maximize size={18} /></button>
                </div>
                
                {/* 内容容器 */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
                >
                    <svg className="absolute inset-0 w-[10000px] h-[100000px] overflow-visible pointer-events-none">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                            </marker>
                            <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                            </marker>
                        </defs>
                        
                        {/* 渲染现有连线 */}
                        {taskRelations.map((rel, index) => {
                            const from = taskNodes.find(n => n.code === rel.preTaskCode);
                            const to = taskNodes.find(n => n.code === rel.postTaskCode);
                            if (!from || !to) return null;
                            
                            const isHovered = hoveredRelation === index;
                            
                            return (
                                <g key={`rel-${index}`} className="group/rel">
                                    <path
                                        d={getConnectionPath(from, to)}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth="20"
                                        className="cursor-pointer pointer-events-auto"
                                         onMouseEnter={() => setHoveredRelation(index)}
                                         onMouseLeave={() => setHoveredRelation(null)}
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             if (!isReadOnly) onDeleteRelation(index);
                                         }}
                                         onContextMenu={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             if (!isReadOnly) onRelationContextMenu(e, index);
                                         }}
                                     />
                                    <path
                                        d={getConnectionPath(from, to)}
                                        fill="none"
                                        stroke={isHovered ? '#ef4444' : '#cbd5e1'}
                                        strokeWidth={isHovered ? "3" : "2"}
                                        strokeDasharray={isHovered ? "none" : "none"}
                                        markerEnd={isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
                                        className="transition-all duration-200"
                                    />
                                    {isHovered && !isReadOnly && (
                                        <g 
                                            transform={`translate(${(from.x + to.x + NODE_WIDTH) / 2}, ${(from.y + to.y + NODE_HEIGHT) / 2})`}
                                            className="pointer-events-none"
                                        >
                                            <circle r="10" className="fill-red-500 shadow-lg" />
                                            <text y="4" textAnchor="middle" className="fill-white text-[10px] font-bold">×</text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                        
                        {/* 正在创建的新连线 */}
                        {isConnecting && connectingFrom && (
                            <path
                                d={`M ${connectingFrom.x + NODE_WIDTH} ${connectingFrom.y + NODE_HEIGHT / 2} C ${(connectingFrom.x + NODE_WIDTH + connectingMousePos.x) / 2} ${connectingFrom.y + NODE_HEIGHT / 2}, ${(connectingFrom.x + NODE_WIDTH + connectingMousePos.x) / 2} ${connectingMousePos.y}, ${connectingMousePos.x} ${connectingMousePos.y}`}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                markerEnd="url(#arrowhead)"
                                className="animate-[dash_10s_linear_infinite] pointer-events-none"
                            />
                        )}
                    </svg>
                    
                    {/* 节点渲染 */}
                    {taskNodes.map((node) => {
                        const typeInfo = getNodeType(node.taskType);
                        const isSelected = selectedNode?.id === node.id;
                        
                        return (
                            <div
                                key={node.id}
                                className={`absolute bg-white dark:bg-slate-900 rounded-xl shadow-lg border-2 transition-all duration-200 pointer-events-auto group/node
                                    ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/10 z-20 scale-[1.02]' : 'border-white dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl z-10'}`}
                                style={{
                                    left: node.x,
                                    top: node.y,
                                    width: NODE_WIDTH,
                                    height: NODE_HEIGHT
                                }}
                                onMouseDown={(e) => onNodeMouseDown(e, node)}
                                onMouseUp={(e) => onNodeMouseUp(e, node)}
                                onDoubleClick={(e) => { e.stopPropagation(); onNodeDoubleClick(node); }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onNodeContextMenu(e, node);
                                }}
                            >
                                <div className="flex h-full items-center px-4 relative">
                                    {/* 输入端口 */}
                                    <div 
                                        className={`absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-all
                                            ${isConnecting ? 'bg-blue-400 scale-150 ring-4 ring-blue-400/20' : 'bg-slate-300 dark:bg-slate-700 group-hover/node:bg-blue-400'}`}
                                        onMouseUp={(e) => onInputPortMouseUp(e, node)}
                                    />
                                    
                                    <div className={`p-2 rounded-lg ${typeInfo.bgColor} text-white shadow-sm mr-3`}>
                                        {React.createElement(typeInfo.icon, { size: 18 })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{node.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{node.taskType}</p>
                                    </div>
                                    
                                    {/* 输出端口 */}
                                    {!isReadOnly && (
                                        <div 
                                            className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded-full border-2 border-white dark:border-slate-900 group-hover/node:bg-blue-500 group-hover/node:scale-125 transition-all cursor-crosshair"
                                            onMouseDown={(e) => onOutputPortMouseDown(e, node)}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 操作说明 */}
                <div className="absolute bottom-4 left-4 flex space-x-4 pointer-events-none">
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 flex items-center space-x-2">
                        <MousePointer2 size={12} className="text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-medium">{t('dolphinScheduler.editor.selectTip')}</span>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 flex items-center space-x-2">
                        <Move size={12} className="text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-medium">{t('dolphinScheduler.editor.panTip')}</span>
                    </div>
                    {!isReadOnly && (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 flex items-center space-x-2">
                            <Trash2 size={12} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">{t('dolphinScheduler.editor.deleteRelTip')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
