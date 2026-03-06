import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Language } from '../../../types';
import { SeaTunnelEngineConfig, SubmitJobRequest } from '../types';
import { seaTunnelApi } from '../api';
import { useToast } from '../../common/Toast';
import { isHoconFormat, convertToJson } from '../../../utils/hoconParser';
import { useTranslation } from "react-i18next";

interface SubmitJobModalProps {
    show: boolean;
    engine: SeaTunnelEngineConfig;
    onClose: () => void;
    onSuccess: () => void;
}

export const SubmitJobModal: React.FC<SubmitJobModalProps> = ({
    show,
    engine,
    onClose,
    onSuccess
}) => {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const [jobName, setJobName] = useState('');
    const [config, setConfig] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isHocon, setIsHocon] = useState(false);

    // 检测配置格式
    const handleConfigChange = (value: string) => {
        setConfig(value);
        setIsHocon(isHoconFormat(value));
    };

    // 转换为 JSON
    const handleConvertToJson = () => {
        const result = convertToJson(config);
        if (result.json) {
            setConfig(result.json);
            setIsHocon(false);
            toast({ 
                title: t('seatunnel.cONFConvertedToJSON'), 
                variant: 'success' 
            });
        } else {
            toast({ 
                title: t('seatunnel.conversionFailed'), 
                description: result.error,
                variant: 'destructive' 
            });
        }
    };

    const handleSubmit = async () => {
        if (!config.trim()) {
            toast({ title: t('seatunnel.pleaseEnterConfig'), variant: 'destructive' });
            return;
        }

        // 如果是 HOCON 格式，先转换为 JSON
        let finalConfig = config;
        if (isHocon) {
            const result = convertToJson(config);
            if (result.json) {
                finalConfig = result.json;
            } else {
                toast({ 
                    title: t('seatunnel.cONFConversionFailed'), 
                    description: result.error,
                    variant: 'destructive' 
                });
                return;
            }
        }

        setSubmitting(true);
        try {
            const request: SubmitJobRequest = {
                jobName: jobName || undefined,
                config: finalConfig
            };
            const result = await seaTunnelApi.submitJob(engine, request);
            
            if (result.success) {
                toast({ title: t('seatunnel.jobSubmitted'), variant: 'success' });
                onSuccess();
                onClose();
                setJobName('');
                setConfig('');
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ title: t('seatunnel.submitFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileSelect = async () => {
        try {
            // 使用 Tauri 文件选择对话框
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                multiple: false,
                filters: [{ name: 'SeaTunnel Config', extensions: ['conf', 'hocon', 'json'] }]
            });
            
            if (selected && typeof selected === 'string') {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const content = await readTextFile(selected);
                handleConfigChange(content);
                
                // 从文件名提取作业名
                const fileName = selected.split(/[/\\]/).pop()?.replace(/\.(conf|hocon|json)$/, '') || '';
                if (!jobName && fileName) {
                    setJobName(fileName);
                }
            }
        } catch (err: any) {
            console.error('File select error:', err);
            toast({ title: t('seatunnel.failedToReadFile'), description: err.message, variant: 'destructive' });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Upload className="mr-2 text-cyan-600" size={20} />
                        {t('seatunnel.submitJob')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* 引擎信息和运行模式说明 */}
                    <div className="space-y-2">
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg flex items-start text-sm">
                            <AlertCircle size={16} className="text-cyan-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="text-cyan-700 dark:text-cyan-300">
                                    <strong>{t('seatunnel.clusterMode')}</strong> - {t('seatunnel.submitTo')}: {engine.name}
                                </div>
                                <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                                    {t('seatunnel.jobWillRunOnSeaTunnelZeta')
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                            💡 {t('seatunnel.forLocalModeUseCLIBinSeat')
                            }
                        </div>
                    </div>

                    {/* 作业名称 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('seatunnel.jobName')}
                            <span className="text-slate-400 ml-1">({t('seatunnel.optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={jobName}
                            onChange={e => setJobName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                            placeholder={t('seatunnel.eGMysqltodorissync')}
                        />
                    </div>

                    {/* 配置内容 */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('seatunnel.configContent')}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                {isHocon && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                                        CONF 格式
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                {isHocon && (
                                    <button
                                        onClick={handleConvertToJson}
                                        className="text-sm text-amber-600 hover:text-amber-700 flex items-center"
                                    >
                                        <RefreshCw size={14} className="mr-1" />
                                        {t('seatunnel.convertToJSON')}
                                    </button>
                                )}
                                <button
                                    onClick={handleFileSelect}
                                    className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                                >
                                    <FileText size={14} className="mr-1" />
                                    {t('seatunnel.loadFromFile')}
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={config}
                            onChange={e => handleConfigChange(e.target.value)}
                            className={`w-full h-64 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white font-mono text-sm resize-none ${isHocon ? 'border-amber-400' : 'border-slate-300 dark:border-slate-600'}`}
                            placeholder={`{
  "env": {
    "execution.parallelism": 1,
    "job.mode": "BATCH"
  },
  "source": [
    {
      "plugin_name": "Jdbc",
      "url": "jdbc:mysql://host:3306/db",
      "driver": "com.mysql.cj.jdbc.Driver",
      "user": "root",
      "password": "***",
      "query": "SELECT * FROM table"
    }
  ],
  "sink": [
    {
      "plugin_name": "Console"
    }
  ]
}`}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {t('seatunnel.jSONFormatByDefaultCONFHO')}
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {t('seatunnel.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !config.trim()}
                        className={`px-6 py-2 rounded-lg font-medium flex items-center transition-colors ${
                            submitting || !config.trim()
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" />
                                {t('seatunnel.submitting')}
                            </>
                        ) : (
                            <>
                                <Upload size={16} className="mr-2" />
                                {t('seatunnel.submitJob')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
