/** 通用 Tooltip 文字提示组件 */
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = containerRect.top - tooltipRect.height - 8;
          left = containerRect.left + (containerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = containerRect.bottom + 8;
          left = containerRect.left + (containerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = containerRect.top + (containerRect.height - tooltipRect.height) / 2;
          left = containerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = containerRect.top + (containerRect.height - tooltipRect.height) / 2;
          left = containerRect.right + 8;
          break;
      }

      setCoords({ top, left });
    }
  };

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  return (
    <div 
      className="relative inline-block"
      ref={containerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && ReactDOM.createPortal(
        <div 
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-1.5 text-[11px] font-bold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl shadow-black/20 animate-in zoom-in-95 backdrop-blur-md border border-white/10"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border border-white/10 -z-10 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-0 border-l-0' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-b-0 border-r-0' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-b-0 border-l-0' :
              'left-[-4px] top-1/2 -translate-y-1/2 border-t-0 border-r-0'
            }`}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
