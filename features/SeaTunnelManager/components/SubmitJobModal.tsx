import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Language } from '../../../types';
import { SeaTunnelEngineConfig, SubmitJobRequest } from '../types';
import { seaTunnelApi } from '../api';
import { useToast } from '../../common/Toast';
import { isHoconFormat, convertToJson } from '../../../utils/hoconParser';

interface SubmitJobModalProps {
    show: boolean;
    lang: Language;
    engine: SeaTunnelEngineConfig;
    onClose: () => void;
    onSuccess: () => void;
}

export const SubmitJobModal: React.FC<SubmitJobModalProps> = ({
    show,
    lang,
    engine,
    onClose,
    onSuccess
}) => {
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
                title: lang === 'zh' ? 'CONF 已转换为 JSON' : 'CONF converted to JSON', 
                variant: 'success' 
            });
        } else {
            toast({ 
                title: lang === 'zh' ? '转换失败' : 'Conversion failed', 
                description: result.error,
                variant: 'destructive' 
            });
        }
    };

    const handleSubmit = async () => {
        if (!config.trim()) {
            toast({ title: lang === 'zh' ? '请输入配置内容' : 'Please enter config', variant: 'destructive' });
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
                    title: lang === 'zh' ? 'CONF 转换失败' : 'CONF conversion failed', 
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
                toast({ title: lang === 'zh' ? '作业提交成功' : 'Job submitted', variant: 'success' });
                onSuccess();
                onClose();
                setJobName('');
                setConfig('');
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '提交失败' : 'Submit failed', description: err.message, variant: 'destructive' });
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
            toast({ title: lang === 'zh' ? '读取文件失败' : 'Failed to read file', description: err.message, variant: 'destructive' });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Upload className="mr-2 text-cyan-600" size={20} />
                        {lang === 'zh' ? '提交作业' : 'Submit Job'}
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
                                    <strong>{lang === 'zh' ? '集群模式' : 'Cluster Mode'}</strong> - {lang === 'zh' ? '提交到' : 'Submit to'}: {engine.name}
                                </div>
                                <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                                    {lang === 'zh' 
                                        ? `作业将在 SeaTunnel Zeta 集群上运行 (${engine.baseUrl})`
                                        : `Job will run on SeaTunnel Zeta cluster (${engine.baseUrl})`
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                            💡 {lang === 'zh' 
                                ? '本地模式请使用命令行: ./bin/seatunnel.sh -c config.conf'
                                : 'For local mode, use CLI: ./bin/seatunnel.sh -c config.conf'
                            }
                        </div>
                    </div>

                    {/* 作业名称 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {lang === 'zh' ? '作业名称' : 'Job Name'}
                            <span className="text-slate-400 ml-1">({lang === 'zh' ? '可选' : 'optional'})</span>
                        </label>
                        <input
                            type="text"
                            value={jobName}
                            onChange={e => setJobName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                            placeholder={lang === 'zh' ? '例如: mysql_to_doris_sync' : 'e.g. mysql_to_doris_sync'}
                        />
                    </div>

                    {/* 配置内容 */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {lang === 'zh' ? '配置内容' : 'Config Content'}
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
                                        {lang === 'zh' ? '转换为 JSON' : 'Convert to JSON'}
                                    </button>
                                )}
                                <button
                                    onClick={handleFileSelect}
                                    className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                                >
                                    <FileText size={14} className="mr-1" />
                                    {lang === 'zh' ? '从文件加载' : 'Load from file'}
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
                            {lang === 'zh' 
                                ? '默认支持 JSON 格式，也支持 CONF/HOCON 格式（会自动转换）' 
                                : 'JSON format by default. CONF/HOCON format is also supported (auto-converted)'}
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {lang === 'zh' ? '取消' : 'Cancel'}
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
                                {lang === 'zh' ? '提交中...' : 'Submitting...'}
                            </>
                        ) : (
                            <>
                                <Upload size={16} className="mr-2" />
                                {lang === 'zh' ? '提交作业' : 'Submit Job'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
