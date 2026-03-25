import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeFormProps } from './types';

const DB_TYPES = [
    'MYSQL', 'DORIS', 'POSTGRESQL', 'ORACLE', 'SQLSERVER',
    'HIVE', 'SPARK', 'CLICKHOUSE', 'STARROCKS', 'PRESTO', 'TRINO'
];

export const SqlNodeForm: React.FC<NodeFormProps> = ({
    data,
    onChange,
    datasources = [],
    readOnly = false
}) => {
    const { t } = useTranslation();

    const selectedDbType = data?.dbType || '';

    // 按数据库类型过滤数据源实例
    const filteredDatasources = selectedDbType
        ? datasources.filter(ds => ds.type?.toUpperCase() === selectedDbType.toUpperCase())
        : datasources;

    const handleDbTypeChange = (dbType: string) => {
        onChange({ ...data, dbType, datasource: undefined, datasourceName: '' });
    };

    const handleDatasourceChange = (dsId: string) => {
        const id = parseInt(dsId);
        const ds = datasources.find(d => d.id === id);
        onChange({
            ...data,
            datasource: id,
            datasourceName: ds?.name || '',
            dbType: ds?.type || data?.dbType
        });
    };

    const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
    const selectClass = "w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="space-y-3">
            {/* 第一行：数据源类型 + 数据源实例（并排） */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>
                        {t('dolphinScheduler.editor.dbType')} <span className="text-red-500">*</span>
                    </label>
                    <select
                        disabled={readOnly}
                        value={selectedDbType}
                        onChange={e => handleDbTypeChange(e.target.value)}
                        className={selectClass}
                    >
                        <option value="">{t('dolphinScheduler.editor.selectDbType')}</option>
                        {DB_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>
                        {t('dolphinScheduler.editor.datasource')} <span className="text-red-300">*</span>
                    </label>
                    <select
                        disabled={readOnly}
                        value={data?.datasource || ''}
                        onChange={e => handleDatasourceChange(e.target.value)}
                        className={`${selectClass} ${!data?.datasource ? 'border-red-300' : ''}`}
                    >
                        <option value="">{t('dolphinScheduler.editor.pleaseSelect')}</option>
                        {filteredDatasources.map(ds => (
                            <option key={ds.id} value={ds.id}>{ds.name}</option>
                        ))}
                    </select>
                    {!data?.datasource && selectedDbType && filteredDatasources.length === 0 && (
                        <p className="text-red-300 text-xs mt-0.5">
                            {t('dolphinScheduler.editor.noDatasourceForType', { type: selectedDbType })}
                        </p>
                    )}
                    {!data?.datasource && filteredDatasources.length > 0 && (
                        <p className="text-red-300 text-xs mt-0.5">
                            {t('dolphinScheduler.editor.datasource')}
                        </p>
                    )}
                </div>
            </div>

            {/* 第二行：SQL类型 + 发送告警 toggle + 日志显示 */}
            <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                    <label className={labelClass}>
                        {t('dolphinScheduler.editor.sqlType')} <span className="text-red-300">*</span>
                    </label>
                    <select
                        disabled={readOnly}
                        value={data?.sqlType ?? '0'}
                        onChange={e => onChange({ ...data, sqlType: e.target.value })}
                        className={selectClass}
                    >
                        <option value="0">{t('dolphinScheduler.editor.query')}</option>
                        <option value="1">{t('dolphinScheduler.editor.nonQuery')}</option>
                    </select>
                </div>
                <div className="flex items-end gap-3 pb-0.5">
                    {/* 发送告警 */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                            {t('dolphinScheduler.editor.sendEmail')}
                        </span>
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onChange({ ...data, sendEmail: !data?.sendEmail })}
                            className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${data?.sendEmail ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${data?.sendEmail ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    {/* 日志显示 */}
                    {(data?.sqlType ?? '0') === '0' && (
                        <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {t('dolphinScheduler.editor.displayRows')}
                            </span>
                            <select
                                disabled={readOnly}
                                value={data?.limit ?? 10}
                                onChange={e => onChange({ ...data, limit: parseInt(e.target.value) })}
                                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none w-16"
                            >
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {t('dolphinScheduler.editor.rowsQueryResult')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* SQL 语句 */}
            <div>
                <label className={labelClass}>
                    SQL {t('dolphinScheduler.editor.sqlStatement')}
                </label>
                <textarea
                    disabled={readOnly}
                    value={data?.sql || ''}
                    onChange={e => onChange({ ...data, sql: e.target.value })}
                    placeholder="SELECT * FROM ..."
                    rows={8}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                />
            </div>
        </div>
    );
};
