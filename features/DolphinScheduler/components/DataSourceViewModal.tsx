import React from 'react';
import { Eye, X } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { DSDataSource } from '../hooks/useDataSourceCenter';

interface DataSourceViewModalProps {
    isOpen: boolean;
    dataSource: DSDataSource | null;
    onClose: () => void;
}

export const DataSourceViewModal: React.FC<DataSourceViewModalProps> = ({ isOpen, dataSource, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen || !dataSource) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                        <Eye className="mr-2 text-blue-500" size={20} />
                        {t('dolphinScheduler.dataSourceDetails', { defaultValue: '数据源详情' })}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.name')}:</span>
                        <span className="col-span-2 font-medium text-slate-800 dark:text-white">{dataSource.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.type')}:</span>
                        <span className="col-span-2 font-medium text-slate-800 dark:text-white">{dataSource.type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.host')}:</span>
                        <span className="col-span-2 font-mono text-slate-800 dark:text-white">{dataSource.host || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.port')}:</span>
                        <span className="col-span-2 font-mono text-slate-800 dark:text-white">{dataSource.port || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.database')}:</span>
                        <span className="col-span-2 font-mono text-slate-800 dark:text-white">{dataSource.database || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.username')}:</span>
                        <span className="col-span-2 font-mono text-slate-800 dark:text-white">{dataSource.userName || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.note')}:</span>
                        <span className="col-span-2 text-slate-800 dark:text-white">{dataSource.note || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.created')}:</span>
                        <span className="col-span-2 text-slate-600 dark:text-slate-400">{dataSource.createTime || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <span className="text-slate-500">{t('dolphinScheduler.updated')}:</span>
                        <span className="col-span-2 text-slate-600 dark:text-slate-400">{dataSource.updateTime || '-'}</span>
                    </div>
                    {dataSource.connectionParams && (
                        <div>
                            <span className="text-slate-500 block mb-1">{t('dolphinScheduler.connectionParams')}:</span>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs font-mono overflow-x-auto">{dataSource.connectionParams}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
