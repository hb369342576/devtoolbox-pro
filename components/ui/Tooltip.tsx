import React, { useState, useRef, useCallback, useEffect } from 'react';
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
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let x = 0, y = 0;

            switch (position) {
                case 'top':
                    x = rect.left + rect.width / 2;
                    y = rect.top - 8;
                    break;
                case 'bottom':
                    x = rect.left + rect.width / 2;
                    y = rect.bottom + 8;
                    break;
                case 'left':
                    x = rect.left - 8;
                    y = rect.top + rect.height / 2;
                    break;
                case 'right':
                    x = rect.right + 12;
                    y = rect.top + rect.height / 2;
                    break;
            }

            setCoords({ x, y });
        }
    }, [position]);

    const showTooltip = useCallback(() => {
        if (!content) return;

        timeoutRef.current = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, delay);
    }, [content, delay, updatePosition]);

    const hideTooltip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const getTransformStyle = () => {
        switch (position) {
            case 'top':
                return 'translate(-50%, -100%)';
            case 'bottom':
                return 'translate(-50%, 0)';
            case 'left':
                return 'translate(-100%, -50%)';
            case 'right':
                return 'translate(0, -50%)';
        }
    };

    const getArrowPosition = () => {
        switch (position) {
            case 'top':
                return { bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
            case 'bottom':
                return { top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
            case 'left':
                return { right: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
            case 'right':
                return { left: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
        }
    };

    if (!content) {
        return <>{children}</>;
    }

    const tooltipElement = isVisible && (
        <div
            style={{
                position: 'fixed',
                left: coords.x,
                top: coords.y,
                transform: getTransformStyle(),
                zIndex: 99999,
                pointerEvents: 'none',
            }}
            className="animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="relative">
                {/* Tooltip Content */}
                <div className="
          px-3 py-2 rounded-lg
          bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800
          text-white text-xs font-medium
          shadow-2xl shadow-black/40
          border border-white/10
          whitespace-nowrap
          max-w-xs
        ">
                    {content}
                </div>

                {/* Arrow */}
                <div
                    className="absolute w-3 h-3 bg-slate-800 dark:bg-slate-700 border-r border-b border-white/10"
                    style={getArrowPosition()}
                />
            </div>
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="contents"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
            >
                {children}
            </div>
            {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
        </>
    );
};

export default Tooltip;
