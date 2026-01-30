import React, { useState, useEffect } from 'react';
import { PlayCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { Language, ProcessDefinition } from '../types';

interface BatchRunModalProps {
    show: boolean;
    lang: Language;
    processes: ProcessDefinition[];
    projectCode: string;
    baseUrl: string;
    token: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchRunModal: React.FC<BatchRunModalProps> = ({ show, lang, processes, projectCode, baseUrl, token, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [running, setRunning] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        if (show) {
            // 默认不选中，让用户手动选择
            setSelectedCodes([]);
            setSearchTerm('');
        }
    }, [show, processes]);
    
    if (!show) return null;
    
    const onlineProcesses = processes.filter(p => p.releaseState === 'ONLINE');
    const filteredProcesses = onlineProcesses.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleBatchRun = async () => {
        if (selectedCodes.length === 0) {
            toast({ title: lang === 'zh' ? '请选择要运行的工作流' : 'Please select workflows', variant: 'destructive' });
            return;
        }
        
        setRunning(true);
        let success = 0, failed = 0;
        
        for (const code of selectedCodes) {
            try {
                const url = `${baseUrl}/projects/${projectCode}/executors/start-process-instance`;
                const params = new URLSearchParams({
                    processDefinitionCode: String(code),
                    failureStrategy: 'CONTINUE',
                    warningType: 'NONE',
                    scheduleTime: '',
                    startNodeList: '',
                    taskDependType: 'TASK_POST',
                    execType: 'START_PROCESS',
                    runMode: 'RUN_MODE_SERIAL',
                    processInstancePriority: 'MEDIUM',
                    workerGroup: 'default',
                    environmentCode: '',
                    startParams: '',
                    expectedParallelismNumber: '',
                    dryRun: '0',
                    complementDependentMode: 'OFF_MODE'
                });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString()
                });
                const result = await response.json();
                if (result.code === 0) success++; else failed++;
            } catch { failed++; }
        }
        
        setRunning(false);
        toast({ title: `${lang === 'zh' ? '批量运行完成' : 'Batch Run Complete'}: ${success} ${lang === 'zh' ? '成功' : 'success'}, ${failed} ${lang === 'zh' ? '失败' : 'failed'}`, variant: failed > 0 ? 'destructive' : 'success' });
        onSuccess();
        onClose();
    };

    const handleSelectAll = () => {
        if (selectedCodes.length === filteredProcesses.length) {
            setSelectedCodes([]);
        } else {
            setSelectedCodes(filteredProcesses.map(p => p.code));
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <PlayCircle size={20} className="mr-2 text-orange-500" />
                        {lang === 'zh' ? '批量运行工作流' : 'Batch Run Workflows'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={lang === 'zh' ? '搜索工作流...' : 'Search workflows...'} 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-500">{lang === 'zh' ? `共 ${onlineProcesses.length} 个已上线` : `${onlineProcesses.length} online total`}</span>
                        <button onClick={handleSelectAll} className="text-xs text-orange-500 hover:text-orange-600">
                            {selectedCodes.length === filteredProcesses.length && filteredProcesses.length > 0 ? (lang === 'zh' ? '取消全选' : 'Deselect All') : (lang === 'zh' ? '全选' : 'Select All')}
                        </button>
                    </div>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto">
                    <div className="space-y-1">
                        {filteredProcesses.map(p => (
                            <label key={p.code} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={e => setSelectedCodes(e.target.checked ? [...selectedCodes, p.code] : selectedCodes.filter(c => c !== p.code))} className="mr-3 accent-orange-500" />
                                <span className="text-slate-700 dark:text-slate-300 text-sm">{p.name}</span>
                            </label>
                        ))}
                        {filteredProcesses.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">{searchTerm ? (lang === 'zh' ? '未找到匹配的工作流' : 'No matching workflows') : (lang === 'zh' ? '没有已上线的工作流' : 'No online workflows')}</p>}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{lang === 'zh' ? `已选 ${selectedCodes.length} 个` : `${selectedCodes.length} selected`}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                        <button onClick={handleBatchRun} disabled={running || selectedCodes.length === 0} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                            {running && <Loader2 size={16} className="animate-spin mr-2" />}
                            {lang === 'zh' ? '运行' : 'Run'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
