import React, { useState } from 'react';
import { GripHorizontal, Plus } from 'lucide-react';
import { TableInfo } from '../../../types';

interface TableCardProps {
    table: TableInfo;
    side: 'source' | 'target';
    onMouseDown?: (e: React.MouseEvent) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, side, onMouseDown }) => {

    // Determine styles based on side
    const sideStyles = side === 'source'
        ? 'border-l-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        : 'border-l-green-500 hover:bg-green-50 dark:hover:bg-green-900/20';

    const iconColor = side === 'source' ? 'text-blue-500' : 'text-green-500';

    return (
        <div
            onMouseDown={onMouseDown}
            className={`
                group relative p-3 rounded-lg border border-slate-200 dark:border-slate-700 
                bg-white dark:bg-slate-800 cursor-grab active:cursor-grabbing 
                transition-all duration-200 border-l-4 ${sideStyles}
                hover:shadow-md hover:-translate-y-0.5
            `}
        >
            <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-slate-700 dark:text-slate-200 flex items-center select-none truncate">
                    <GripHorizontal size={14} className="mr-2 text-slate-400 flex-shrink-0" />
                    <span className="truncate" title={table.name}>{table.name}</span>
                </div>

                {/* Hover Action */}
                <div className={`
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                    bg-white dark:bg-slate-700 shadow-sm rounded-full p-1
                    absolute right-2 top-1/2 -translate-y-1/2
                `}>
                    <Plus size={14} className={iconColor} />
                </div>
            </div>
        </div>
    );
};
