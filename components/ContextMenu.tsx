import React, { useEffect, useRef } from 'react';
import { Copy, FileText, Edit3, Trash2 } from 'lucide-react';

interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    divider?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[200] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 py-2 min-w-[200px] animate-in fade-in zoom-in-95"
            style={{
                left: `${x}px`,
                top: `${y}px`,
            }}
        >
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {item.divider ? (
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                    ) : (
                        <button
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200"
                        >
                            {item.icon && <span className="text-slate-400">{item.icon}</span>}
                            <span>{item.label}</span>
                        </button>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
