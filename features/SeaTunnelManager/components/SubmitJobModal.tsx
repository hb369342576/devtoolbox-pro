import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Language } from '../../../types';
import { SeaTunnelEngineConfig, SubmitJobRequest } from '../types';
import { seaTunnelApi } from '../api';
import { useToast } from '../../../components/ui/Toast';

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

    const handleSubmit = async () => {
        if (!config.trim()) {
            toast({ title: lang === 'zh' ? '请输入配置内容' : 'Please enter config', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            const request: SubmitJobRequest = {
                jobName: jobName || undefined,
                config: config
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
                setConfig(content);
                
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
                    {/* 引擎信息 */}
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg flex items-center text-sm">
                        <AlertCircle size={16} className="text-cyan-600 mr-2" />
                        <span className="text-cyan-700 dark:text-cyan-300">
                            {lang === 'zh' ? '提交到: ' : 'Submit to: '}
                            <strong>{engine.name}</strong> ({engine.baseUrl})
                        </span>
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
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {lang === 'zh' ? '配置内容' : 'Config Content'}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <button
                                onClick={handleFileSelect}
                                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                            >
                                <FileText size={14} className="mr-1" />
                                {lang === 'zh' ? '从文件加载' : 'Load from file'}
                            </button>
                        </div>
                        <textarea
                            value={config}
                            onChange={e => setConfig(e.target.value)}
                            className="w-full h-64 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white font-mono text-sm resize-none"
                            placeholder={`env {
  parallelism = 2
  job.mode = "BATCH"
}

source {
  MySQL {
    ...
  }
}

sink {
  Console {}
}`}
                        />
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
