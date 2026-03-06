import React from 'react';
import { Database, ArrowDownToLine, Shuffle, GripVertical } from 'lucide-react';
import { Language } from '../../../types';
import { useFieldMappingStore } from '../store';
import { useTranslation } from "react-i18next";

interface SidebarProps {
}

// 节点类型定义
const NODE_TYPES = [
    { 
        id: 'source', 
        label: 'mapping.sourceNode',
        description: 'mapping.sourceNodeDesc',
        icon: Database,
        color: 'blue'
    },
    { 
        id: 'sink', 
        label: 'mapping.sinkNode',
        description: 'mapping.sinkNodeDesc',
        icon: ArrowDownToLine,
        color: 'green'
    },
    { 
        id: 'transform', 
        label: 'mapping.transformNode',
        description: 'mapping.transformNodeDesc',
        icon: Shuffle,
        color: 'amber'
    }
];

export const Sidebar: React.FC<SidebarProps> = ({}) => {
    const { t, i18n } = useTranslation();
    const setDraggedItem = useFieldMappingStore((state) => state.setDraggedItem);

    const handleDragStart = (e: React.DragEvent, nodeType: string) => {
        e.dataTransfer.setData('nodeType', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="w-64 bg-white dark:bg-slate-800 border-r dark:border-slate-700 flex flex-col h-full z-10 shadow-lg">
            {/* Header */}
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {t('mapping.nodeComponents')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {t('mapping.dragNodesToCanvas')}
                </p>
            </div>

            {/* Node Types */}
            <div className="flex-1 p-4 space-y-3">
                {NODE_TYPES.map((nodeType) => {
                    const Icon = nodeType.icon;
                    const colorClasses = {
                        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:shadow-blue-100',
                        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400 hover:shadow-green-100',
                        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:shadow-amber-100'
                    };
                    const iconColors = {
                        blue: 'text-blue-600',
                        green: 'text-green-600',
                        amber: 'text-amber-600'
                    };

                    return (
                        <div
                            key={nodeType.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, nodeType.id)}
                            className={`p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${colorClasses[nodeType.color as keyof typeof colorClasses]}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${iconColors[nodeType.color as keyof typeof iconColors]}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">
                                            {t(nodeType.label)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {t(nodeType.description)}
                                        </div>
                                    </div>
                                </div>
                                <GripVertical size={16} className="text-slate-400" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tips */}
            <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="text-xs text-slate-500 space-y-1">
                    <p>💡 {t('mapping.dragToCanvasToCreate')}</p>
                    <p>💡 {t('mapping.clickNodeToConfigure')}</p>
                    <p>💡 {t('mapping.dragLinksToMapFields')}</p>
                </div>
            </div>
        </div>
    );
};
