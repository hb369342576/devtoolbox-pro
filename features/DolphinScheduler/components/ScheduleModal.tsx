import React, { useState } from 'react';
import { Timer, XCircle, Loader2 } from 'lucide-react';
import { httpFetch } from '../../../utils/http';
import { useToast } from '../../../components/ui/Toast';
import { Language, ProcessDefinition } from '../types';

interface ScheduleModalProps {
    process: ProcessDefinition | null;
    lang: Language;
    projectCode: string;
    baseUrl: string;
    token: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ process, lang, projectCode, baseUrl, token, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [crontab, setCrontab] = useState('0 0 * * * ?');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    if (!process) return null;
    
    const handleSave = async () => {
        setLoading(true);
        try {
            // DolphinScheduler API: POST /projects/{projectCode}/schedules
            const url = `${baseUrl}/projects/${projectCode}/schedules`;
            
            const params = new URLSearchParams({
                processDefinitionCode: String(process.code),
                schedule: JSON.stringify({
                    startTime: startTime || new Date().toISOString(),
                    endTime: endTime || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    crontab,
                    timezoneId: 'Asia/Shanghai'
                }),
                failureStrategy: 'CONTINUE',
                warningType: 'NONE',
                processInstancePriority: 'MEDIUM',
                workerGroup: 'default',
                warningGroupId: '0',
                environmentCode: ''
            });
            
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (result.code !== 0) throw new Error(result.msg);
            
            toast({ title: lang === 'zh' ? '调度设置成功' : 'Schedule Set', variant: 'success' });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('[DolphinScheduler] Schedule error:', err);
            toast({ title: lang === 'zh' ? '设置失败' : 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Timer size={20} className="mr-2 text-blue-500" />
                        {lang === 'zh' ? '调度设置' : 'Schedule Settings'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{lang === 'zh' ? '工作流名称' : 'Workflow'}</label>
                        <p className="text-slate-800 dark:text-white font-bold">{process.name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Cron {lang === 'zh' ? '表达式' : 'Expression'}</label>
                        <input type="text" value={crontab} onChange={e => setCrontab(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm" placeholder="0 0 * * * ?" />
                        <p className="text-xs text-slate-400 mt-1">{lang === 'zh' ? '例如: 0 0 2 * * ? (每天凌晨2点)' : 'e.g. 0 0 2 * * ? (daily at 2am)'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">{lang === 'zh' ? '开始时间' : 'Start Time'}</label>
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">{lang === 'zh' ? '结束时间' : 'End Time'}</label>
                            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                    <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                        {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                        {lang === 'zh' ? '保存' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
