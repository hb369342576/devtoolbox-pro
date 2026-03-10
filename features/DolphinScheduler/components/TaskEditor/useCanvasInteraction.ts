import React, { useState, useCallback, useRef } from 'react';
import { TaskNode, TaskRelation, NODE_WIDTH, NODE_HEIGHT } from './types';

interface CanvasInteractionProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    isReadOnly: boolean;
    taskNodes: TaskNode[];
    setTaskNodes: React.Dispatch<React.SetStateAction<TaskNode[]>>;
    taskRelations: TaskRelation[];
    setTaskRelations: React.Dispatch<React.SetStateAction<TaskRelation[]>>;
    setSelectedNode: (node: TaskNode | null) => void;
}

export function useCanvasInteraction({
    canvasRef,
    isReadOnly,
    taskNodes,
    setTaskNodes,
    taskRelations,
    setTaskRelations,
    setSelectedNode
}: CanvasInteractionProps) {
    // 画布变换状态
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    
    // 拖拽状态
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    // 记录是否是右键/中键发起的拖拽（用于区分右键拖动与右键菜单）
    const panButtonRef = useRef<number>(0);
    
    // 连线拖拽状态
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectingFrom, setConnectingFrom] = useState<TaskNode | null>(null);
    const connectingFromRef = useRef<TaskNode | null>(null);
    const isConnectingRef = useRef(false);
    const [connectingMousePos, setConnectingMousePos] = useState({ x: 0, y: 0 });
    const [hoveredRelation, setHoveredRelation] = useState<number | null>(null);

    // 缩放控制
    const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
    const handleZoomReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(s => Math.max(0.3, Math.min(2, s + delta)));
    }, []);

    // 画布拖拽开始（右键或左键在空白处拖动画布）
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        const onBackground = e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg');
        // 右键(2)：只有点击空白处才拖动画布
        if (e.button === 2) {
            if (onBackground) {
                e.preventDefault();
                panButtonRef.current = 2;
                setIsPanning(true);
                setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            }
            return;
        }
        // 左键(0)：点击空白处拖动画布
        if (onBackground) {
            panButtonRef.current = 0;
            setIsPanning(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            setSelectedNode(null);
        }
    };

    // 节点拖拽开始
    const handleNodeMouseDown = (e: React.MouseEvent, node: TaskNode) => {
        e.stopPropagation();
        // 右键点击节点：仅阻止冒泡，不触发拖动也不选中
        if (e.button === 2) return;
        setSelectedNode(node);
        if (isReadOnly) return;
        setDraggingNode(node.id);
        setDragStart({ x: e.clientX / scale - node.x, y: e.clientY / scale - node.y });
    };

    // 鼠标移动
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        } else if (draggingNode) {
            const newX = e.clientX / scale - dragStart.x;
            const newY = e.clientY / scale - dragStart.y;
            setTaskNodes(nodes => nodes.map(n => 
                n.id === draggingNode ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
            ));
        } else if (isConnecting) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const cx = (e.clientX - rect.left - offset.x) / scale;
                const cy = (e.clientY - rect.top - offset.y) / scale;
                setConnectingMousePos({ x: cx, y: cy });
            }
        }
    }, [isPanning, draggingNode, isConnecting, dragStart, scale, offset, setTaskNodes, canvasRef]);

    // 鼠标释放
    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingNode(null);
        if (isConnecting) {
            setIsConnecting(false);
            setConnectingFrom(null);
        }
    };

    // 连线起始
    const handleOutputPortMouseDown = (e: React.MouseEvent, node: TaskNode) => {
        if (isReadOnly) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const cx = (e.clientX - rect.left - offset.x) / scale;
            const cy = (e.clientY - rect.top - offset.y) / scale;
            setConnectingMousePos({ x: cx, y: cy });
        }
        isConnectingRef.current = true;
        connectingFromRef.current = node;
        setIsConnecting(true);
        setConnectingFrom(node);
    };

    // 连线闭合（输入端口小圆圈）
    const handleInputPortMouseUp = (e: React.MouseEvent, targetNode: TaskNode) => {
        if (!isConnectingRef.current || !connectingFromRef.current) return;
        e.stopPropagation();
        const src = connectingFromRef.current;
        if (src.id === targetNode.id) {
            isConnectingRef.current = false;
            connectingFromRef.current = null;
            setIsConnecting(false);
            setConnectingFrom(null);
            return;
        }
        const exists = taskRelations.some(
            r => r.preTaskCode === src.code && r.postTaskCode === targetNode.code
        );
        if (!exists) {
            setTaskRelations(rels => [...rels, {
                preTaskCode: src.code,
                postTaskCode: targetNode.code
            }]);
        }
        isConnectingRef.current = false;
        connectingFromRef.current = null;
        setIsConnecting(false);
        setConnectingFrom(null);
    };

    // 鼠标松开在节点主体区域时也算连线成功（扩大命中区域）
    const handleNodeMouseUp = (e: React.MouseEvent, targetNode: TaskNode) => {
        if (!isConnectingRef.current || !connectingFromRef.current) return;
        e.stopPropagation();
        const src = connectingFromRef.current;
        if (src.id === targetNode.id) {
            isConnectingRef.current = false;
            connectingFromRef.current = null;
            setIsConnecting(false);
            setConnectingFrom(null);
            return;
        }
        const exists = taskRelations.some(
            r => r.preTaskCode === src.code && r.postTaskCode === targetNode.code
        );
        if (!exists) {
            setTaskRelations(rels => [...rels, {
                preTaskCode: src.code,
                postTaskCode: targetNode.code
            }]);
        }
        isConnectingRef.current = false;
        connectingFromRef.current = null;
        setIsConnecting(false);
        setConnectingFrom(null);
    };

    const handleDeleteRelation = (index: number) => {
        if (isReadOnly) return;
        setTaskRelations(rels => rels.filter((_, i) => i !== index));
        setHoveredRelation(null);
    };

    // 自动布局（拓扑排序 + 分层布局）
    const handleAutoLayout = () => {
        if (taskNodes.length === 0) return;
        
        const inDegree: Record<number, number> = {};
        const children: Record<number, number[]> = {};
        
        taskNodes.forEach(node => {
            inDegree[node.code] = 0;
            children[node.code] = [];
        });
        
        taskRelations.forEach(rel => {
            if (inDegree[rel.postTaskCode] !== undefined) {
                inDegree[rel.postTaskCode]++;
            }
            if (children[rel.preTaskCode]) {
                children[rel.preTaskCode].push(rel.postTaskCode);
            }
        });
        
        const levels: number[][] = [];
        const visited = new Set<number>();
        let queue = taskNodes.filter(n => inDegree[n.code] === 0).map(n => n.code);
        
        while (queue.length > 0) {
            levels.push([...queue]);
            queue.forEach(code => visited.add(code));
            
            const nextQueue: number[] = [];
            queue.forEach(code => {
                children[code]?.forEach(childCode => {
                    if (!visited.has(childCode)) {
                        inDegree[childCode]--;
                        if (inDegree[childCode] === 0) {
                            nextQueue.push(childCode);
                        }
                    }
                });
            });
            queue = nextQueue;
        }
        
        const unvisited = taskNodes.filter(n => !visited.has(n.code)).map(n => n.code);
        if (unvisited.length > 0) {
            levels.push(unvisited);
        }
        
        const horizontalGap = NODE_WIDTH + 80;
        const verticalGap = NODE_HEIGHT + 40;
        const startX = 100;
        const startY = 100;
        
        const newPositions: Record<number, { x: number; y: number }> = {};
        
        levels.forEach((levelCodes, levelIndex) => {
            const startYLevel = startY;
            
            levelCodes.forEach((code, nodeIndex) => {
                newPositions[code] = {
                    x: startX + levelIndex * horizontalGap,
                    y: startYLevel + nodeIndex * verticalGap
                };
            });
        });
        
        setTaskNodes(nodes => nodes.map(node => ({
            ...node,
            x: newPositions[node.code]?.x ?? node.x,
            y: newPositions[node.code]?.y ?? node.y
        })));
        
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // 计算连线路径（贝塞尔曲线）
    const getConnectionPath = (from: TaskNode, to: TaskNode) => {
        const startX = from.x + NODE_WIDTH;
        const startY = from.y + NODE_HEIGHT / 2;
        const endX = to.x;
        const endY = to.y + NODE_HEIGHT / 2;
        const midX = (startX + endX) / 2;
        
        return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    };

    return {
        scale, setScale,
        offset, setOffset,
        isConnecting,
        connectingFrom,
        connectingMousePos,
        hoveredRelation, setHoveredRelation,
        handleZoomIn, handleZoomOut, handleZoomReset, handleWheel,
        handleCanvasMouseDown,
        handleNodeMouseDown, handleNodeMouseUp, handleMouseMove, handleMouseUp,
        handleOutputPortMouseDown, handleInputPortMouseUp,
        handleDeleteRelation, handleAutoLayout, getConnectionPath
    };
}
