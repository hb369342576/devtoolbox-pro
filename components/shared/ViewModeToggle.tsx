import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';

/**
 * 全局视图模式切换组件
 * 可在Layout、工具页面、设置中使用
 */
export const ViewModeToggle: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
    const viewMode = useGlobalStore((state) => state.viewMode);
    const setViewMode = useGlobalStore((state) => state.setViewMode);

    const iconSize = size === 'sm' ? 14 : 16;
    const padding = size === 'sm' ? 'p-1' : 'p-1.5';

    return (
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
            <button
                onClick={() => setViewMode('grid')}
                className={`${padding} rounded-md transition-all ${viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                title="卡片视图"
            >
                <LayoutGrid size={iconSize} />
            </button>
            <button
                onClick={() => setViewMode('list')}
                className={`${padding} rounded-md transition-all ${viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                title="列表视图"
            >
                <List size={iconSize} />
            </button>
        </div>
    );
};
