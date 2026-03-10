import React, { useState, useRef, useEffect } from 'react';
import { useFieldMappingStore } from '../store';

export const useCanvasInteractions = (containerRef: React.RefObject<HTMLDivElement | null>) => {
    const { updateNode } = useFieldMappingStore();

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [dragNodeId, setDragNodeId] = useState<string | null>(null);
    const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
    const [tempLinkEnd, setTempLinkEnd] = useState<{ x: number, y: number } | null>(null);

    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'node' | 'link';
        targetId: string;
    } | null>(null);

    const toCanvasCoords = (cx: number, cy: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (cx - rect.left - offset.x) / scale,
            y: (cy - rect.top - offset.y) / scale
        };
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const newScale = Math.min(Math.max(scale - e.deltaY * 0.001, 0.1), 3);
            setScale(newScale);
        } else {
            setOffset(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains('canvas-bg')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            setContextMenu(null);
        }
    };

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
    }, [isDragging, dragNodeId, linkingSourceId, dragStart, offset, scale]);

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

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    return {
        scale, setScale,
        offset, setOffset,
        dragNodeId, setDragNodeId,
        linkingSourceId, setLinkingSourceId,
        tempLinkEnd, setTempLinkEnd,
        contextMenu, setContextMenu,
        handleWheel, handleMouseDown,
        toCanvasCoords,
        handleContextMenu, closeContextMenu
    };
};
