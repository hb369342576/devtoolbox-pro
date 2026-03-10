import React from 'react';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { DSDataSource } from '../hooks/useDataSourceCenter';

interface DataSourceEditModalProps {
    isOpen: boolean;
    isEdit: boolean;
    formData: Partial<DSDataSource>;
    setFormData: (data: Partial<DSDataSource>) => void;
    saving: boolean;
    onClose: () => void;
    onSave: () => void;
}

const dbTypes = ['MYSQL', 'POSTGRESQL', 'ORACLE', 'SQLSERVER', 'CLICKHOUSE', 'DORIS', 'HIVE', 'SPARK', 'PRESTO'];

export const DataSourceEditModal: React.FC<DataSourceEditModalProps> = ({
    isOpen, isEdit, formData, setFormData, saving, onClose, onSave
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    {isEdit ? <Edit className="mr-2 text-blue-500" size={20} /> : <Plus className="mr-2 text-green-500" size={20} />}
                    {isEdit ? t('dolphinScheduler.editDataSource') : t('dolphinScheduler.createDataSource')}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.name')} *</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.type')}</label>
                        <select
                            value={formData.type || 'MYSQL'}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            {dbTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.host')}</label>
                            <input
                                type="text"
                                value={formData.host || ''}
                                onChange={e => setFormData({ ...formData, host: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.port')}</label>
                            <input
                                type="number"
                                value={formData.port || ''}
                                onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 3306 })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.database')}</label>
                        <input
                            type="text"
                            value={formData.database || ''}
                            onChange={e => setFormData({ ...formData, database: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.username')}</label>
                        <input
                            type="text"
                            value={formData.userName || ''}
                            onChange={e => setFormData({ ...formData, userName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('dolphinScheduler.note')}</label>
                        <textarea
                            value={formData.note || ''}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        {t('dolphinScheduler.cancel')}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                    >
                        {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                        {t('dolphinScheduler.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
