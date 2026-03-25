import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeFormProps } from './types';

export const SeaTunnelNodeForm: React.FC<NodeFormProps> = ({
    data,
    onChange,
    readOnly = false
}) => {
    const { t } = useTranslation();

    const STARTUP_SCRIPTS = [
        'seatunnel.sh',
        'start-seatunnel-flink-13-connector-v2.sh',
        'start-seatunnel-flink-15-connector-v2.sh',
        'start-seatunnel-flink-connector-v2.sh',
        'start-seatunnel-flink.sh',
        'start-seatunnel-spark-2-connector-v2.sh',
        'start-seatunnel-spark-3-connector-v2.sh',
        'start-seatunnel-spark-connector-v2.sh'
    ];

    const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
    const inputClass = "w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                {/* 部署方式 */}
                <div>
                    <label className={labelClass}>
                        {t('dolphinScheduler.editor.deployMode')}
                    </label>
                    <select
                        disabled={readOnly}
                        value={data?.deployMode || 'cluster'}
                        onChange={(e) => onChange({ ...data, deployMode: e.target.value })}
                        className={inputClass}
                    >
                        <option value="cluster">cluster</option>
                        <option value="local">local</option>
                    </select>
                </div>
                {/* 启动脚本 */}
                <div>
                    <label className={labelClass}>
                        {t('dolphinScheduler.editor.startupScript')} <span className="text-red-500">*</span>
                    </label>
                    <select
                        disabled={readOnly}
                        value={data?.startupScript || 'seatunnel.sh'}
                        onChange={(e) => onChange({ ...data, startupScript: e.target.value })}
                        className={inputClass}
                    >
                        {STARTUP_SCRIPTS.map(script => (
                            <option key={script} value={script}>{script}</option>
                        ))}
                    </select>
                </div>
            </div>
            {/* 配置文件路径 */}
            <div>
                <label className={labelClass}>
                    {t('dolphinScheduler.configPath')}
                </label>
                <input
                    disabled={readOnly}
                    type="text"
                    value={data?.configFile || ''}
                    onChange={(e) => onChange({ ...data, configFile: e.target.value })}
                    placeholder="e.g. config/seatunnel.conf"
                    className={inputClass}
                />
            </div>
            {/* 脚本内容 */}
            <div>
                <label className={labelClass}>
                    {t('dolphinScheduler.editor.scriptContent')}
                </label>
                <textarea
                    disabled={readOnly}
                    value={data?.rawScript || ''}
                    onChange={(e) => onChange({ ...data, rawScript: e.target.value })}
                    rows={8}
                    className={`${inputClass} font-mono`}
                    placeholder="-- Add custom SeaTunnel configurations here --"
                />
            </div>
        </div>
    );
};
