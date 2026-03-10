import React from 'react';
import { ListTodo } from 'lucide-react';
import { SeaTunnelEngineConfig } from '../types';
import { useTranslation } from "react-i18next";

interface EngineListViewProps {
    configs: SeaTunnelEngineConfig[];
    onSelectEngine: (config: SeaTunnelEngineConfig | null) => void;
}

export const EngineListView: React.FC<EngineListViewProps> = ({ configs, onSelectEngine }) => {
    const { t } = useTranslation();

    const getEngineIcon = (type: string) => {
        switch (type) {
            case 'zeta': return '⚡';
            case 'flink': return '🔥';
            case 'spark': return '✨';
            default: return '🔧';
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 pt-1.5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <ListTodo className="mr-3 text-cyan-600" size={24} />
                    {t('seatunnel.jobManager')}
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                <div className="flex flex-wrap gap-6 pt-2">
                    {configs.map(config => (
                        <div
                            key={config.id}
                            onClick={() => onSelectEngine(config)}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden w-[288px] h-[200px] flex-shrink-0 flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-2xl">
                                    {getEngineIcon(config.engineType)}
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{config.name}</h3>
                            <div className="space-y-1.5">
                                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span className="w-16 text-xs font-bold uppercase opacity-70">Engine</span>
                                    <span className="truncate capitalize">{config.engineType}</span>
                                </div>
                                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span className="w-16 text-xs font-bold uppercase opacity-70">URL</span>
                                    <span className="truncate font-mono text-xs">{config.baseUrl}</span>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                        </div>
                    ))}
                </div>
            </div>
            
            {configs.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-8">
                    <ListTodo size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">{t('seatunnel.noEnginesConfiguredPlease')}</p>
                </div>
            )}
        </div>
    );
};
