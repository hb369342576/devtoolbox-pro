/** 卡片/表格视图切换组件 */
import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { Tooltip } from './Tooltip';
import { useTranslation } from "react-i18next";

export const ViewModeToggle: React.FC = () => {
    const { t } = useTranslation();
    const { viewMode, setViewMode } = useGlobalStore();
    const isGrid = viewMode === 'grid';

    return (
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <Tooltip content={t('common.cardView')} position="bottom">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                        isGrid
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <LayoutGrid size={16} />
                </button>
            </Tooltip>
            <Tooltip content={t('common.tableView')} position="bottom">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                        !isGrid
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <List size={16} />
                </button>
            </Tooltip>
        </div>
    );
};
