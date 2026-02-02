import React from 'react';
import { Database, ArrowDownToLine, Shuffle, GripVertical } from 'lucide-react';
import { Language } from '../../../types';
import { useFieldMappingStore } from '../store';

interface SidebarProps {
    lang: Language;
}

// 节点类型定义
const NODE_TYPES = [
    { 
        id: 'source', 
        label: { zh: '数据源', en: 'Source' },
        description: { zh: '读取源数据', en: 'Read source data' },
        icon: Database,
        color: 'blue'
    },
    { 
        id: 'sink', 
        label: { zh: '目标端', en: 'Sink' },
        description: { zh: '写入目标数据', en: 'Write to target' },
        icon: ArrowDownToLine,
        color: 'green'
    },
    { 
        id: 'transform', 
        label: { zh: '转换器', en: 'Transform' },
        description: { zh: '数据转换处理', en: 'Transform data' },
        icon: Shuffle,
        color: 'amber'
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ lang }) => {
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
                    {lang === 'zh' ? '节点组件' : 'Node Components'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {lang === 'zh' ? '将节点拖拽到画布上' : 'Drag nodes to canvas'}
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
                                            {nodeType.label[lang]}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {nodeType.description[lang]}
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
                    <p>💡 {lang === 'zh' ? '拖拽节点到画布创建' : 'Drag to canvas to create'}</p>
                    <p>💡 {lang === 'zh' ? '点击节点配置数据源' : 'Click node to configure'}</p>
                    <p>💡 {lang === 'zh' ? '拖拽连线建立映射' : 'Drag links to map fields'}</p>
                </div>
            </div>
        </div>
    );
};
