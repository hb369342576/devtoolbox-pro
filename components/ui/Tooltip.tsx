import React, { useState, useRef, useCallback, useEffect, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 400
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showTooltip = useCallback((e: React.MouseEvent) => {
        if (!content) return;
        setMousePos({ x: e.clientX, y: e.clientY });

        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }, [content, delay]);

    const hideTooltip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isVisible) {
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    }, [isVisible]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const getTooltipStyle = (): React.CSSProperties => {
        const offset = 12;
        let x = mousePos.x;
        let y = mousePos.y;
        let transform = '';

        switch (position) {
            case 'top':
                transform = 'translate(-50%, -100%)';
                y -= offset;
                break;
            case 'bottom':
                transform = 'translate(-50%, 0)';
                y += offset;
                break;
            case 'left':
                transform = 'translate(-100%, -50%)';
                x -= offset;
                break;
            case 'right':
                transform = 'translate(0, -50%)';
                x += offset;
                break;
        }

        return {
            position: 'fixed',
            left: x,
            top: y,
            transform,
            zIndex: 99999,
            pointerEvents: 'none' as const,
        };
    };

    const getArrowStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'inherit',
            transform: 'rotate(45deg)',
        };

        switch (position) {
            case 'top':
                return { ...base, bottom: '-4px', left: '50%', marginLeft: '-4px' };
            case 'bottom':
                return { ...base, top: '-4px', left: '50%', marginLeft: '-4px' };
            case 'left':
                return { ...base, right: '-4px', top: '50%', marginTop: '-4px' };
            case 'right':
                return { ...base, left: '-4px', top: '50%', marginTop: '-4px' };
        }
    };

    if (!content) {
        return <>{children}</>;
    }

    const tooltipElement = isVisible && (
        <div style={getTooltipStyle()}>
            <div
                className="relative px-3 py-2 rounded-lg text-white text-xs font-medium whitespace-nowrap max-w-xs shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                {content}
                <div
                    style={{
                        ...getArrowStyle(),
                        background: '#1e293b',
                        borderRight: position === 'top' || position === 'left' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        borderBottom: position === 'top' || position === 'left' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        borderLeft: position === 'bottom' || position === 'right' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        borderTop: position === 'bottom' || position === 'right' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    }}
                />
            </div>
        </div>
    );

    // Clone the child and add mouse event handlers directly
    if (isValidElement(children)) {
        const childWithEvents = cloneElement(children as React.ReactElement<any>, {
            onMouseEnter: (e: React.MouseEvent) => {
                showTooltip(e);
                // Call original handler if it exists
                const originalHandler = (children as React.ReactElement<any>).props.onMouseEnter;
                if (originalHandler) originalHandler(e);
            },
            onMouseLeave: (e: React.MouseEvent) => {
                hideTooltip();
                const originalHandler = (children as React.ReactElement<any>).props.onMouseLeave;
                if (originalHandler) originalHandler(e);
            },
            onMouseMove: (e: React.MouseEvent) => {
                handleMouseMove(e);
                const originalHandler = (children as React.ReactElement<any>).props.onMouseMove;
                if (originalHandler) originalHandler(e);
            },
        });

        return (
            <>
                {childWithEvents}
                {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
            </>
        );
    }

    // Fallback: wrap in a span
    return (
        <>
            <span
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onMouseMove={handleMouseMove}
            >
                {children}
            </span>
            {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
        </>
    );
};

export default Tooltip;
