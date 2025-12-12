import React, { useState } from 'react';
import { GripHorizontal, Plus } from 'lucide-react';
import { TableInfo } from '../../../types';

interface TableCardProps {
    table: TableInfo;
    side: 'source' | 'target';
    onMouseDown: (e: React.MouseEvent) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, side, onMouseDown }) => {
    const [isHovered, setIsHovered] = useState(false);

    const borderColor = side === 'source' ? 'border-blue-500' : 'border-green-500';

    const baseStyle: React.CSSProperties = {
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'grab',
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
    };

    const hoverStyle: React.CSSProperties = isHovered ? {
        transform: 'scale(1.04) translateX(4px)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        backgroundColor: side === 'source' ? '#eff6ff' : '#f0fdf4',
        zIndex: 10,
    } : {
        backgroundColor: 'transparent',
    };

    return (
        <div
            onMouseDown={onMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`p-3 rounded border dark:border-slate-700 bg-white dark:bg-slate-900 active:cursor-grabbing relative ${borderColor}`}
            style={{ ...baseStyle, ...hoverStyle }}
        >
            <div className="font-medium text-sm dark:text-slate-200 flex items-center" style={{ pointerEvents: 'none' }}>
                <GripHorizontal size={14} className="mr-2 text-slate-400" />
                {table.name}
            </div>
            {isHovered && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 animate-in fade-in slide-in-from-left-2 duration-200 fill-mode-forwards">
                    <div className={`p-1 rounded-full ${side === 'source' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        <Plus size={14} />
                    </div>
                </div>
            )}
        </div>
    );
};
