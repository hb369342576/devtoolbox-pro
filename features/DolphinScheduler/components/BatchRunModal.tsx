import React, { useState, useEffect } from 'react';
import { PlayCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { httpFetch } from '../../../utils/http';
import { getExecutorStartPath, getWorkflowCodeParamName, getWorkflowApiPath } from '../utils';
import { useToast } from '../../common/Toast';
import { Language, ProcessDefinition } from '../types';
import { DolphinSchedulerApiVersion } from '../../../types';
import { useTranslation } from "react-i18next";

interface BatchRunModalProps {
    show: boolean;
    processes: ProcessDefinition[];
    projectCode: string;
    baseUrl: string;
    token: string;
    apiVersion?: DolphinSchedulerApiVersion;
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchRunModal: React.FC<BatchRunModalProps> = ({show, processes, projectCode, baseUrl, token, apiVersion, onClose, onSuccess }) => {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const [running, setRunning] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [allProcesses, setAllProcesses] = useState<ProcessDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (show) {
            // 默认不选中，让用户手动选择
            setSelectedCodes([]);
            setSearchTerm('');
            
            const fetchAll = async () => {
                setLoading(true);
                try {
                    const apiPath = getWorkflowApiPath(apiVersion);
                    const url = `${baseUrl}/projects/${projectCode}/${apiPath}?pageNo=1&pageSize=9999`;
                    const response = await httpFetch(url, { headers: { token } });
                    const json = await response.json();
                    if (json.code === 0) {
                        const list = json.data?.totalList || (Array.isArray(json.data) ? json.data : []);
                        setAllProcesses(list);
                    }
                } catch (e) {
                    console.error('Fetch all processes failed:', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchAll();
        }
    }, [show, baseUrl, projectCode, token, apiVersion]);
    
    if (!show) return null;
    
    const onlineProcesses = allProcesses.filter(p => p.releaseState === 'ONLINE');
    const filteredProcesses = onlineProcesses.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleBatchRun = async () => {
        if (selectedCodes.length === 0) {
            toast({ title: t('dolphinScheduler.pleaseSelectWorkflows'), variant: 'destructive' });
            return;
        }
        
        setRunning(true);
        let success = 0, failed = 0;
        
        for (const code of selectedCodes) {
            try {
                const url = `${baseUrl}/projects/${projectCode}/executors/${getExecutorStartPath(apiVersion)}`;
                const params = new URLSearchParams();
                params.append(getWorkflowCodeParamName(apiVersion), String(code));
                params.append('scheduleTime', '');
                params.append('startNodeList', '');
                params.append('startParams', '');
                params.append('failureStrategy', 'CONTINUE');
                params.append('warningType', 'NONE');
                params.append('warningGroupId', '0');
                params.append('taskDependType', 'TASK_POST');
                params.append('runMode', 'RUN_MODE_SERIAL');
                params.append('processInstancePriority', 'MEDIUM');
                params.append('workerGroup', 'default');
                params.append('tenantCode', 'default');
                params.append('dryRun', '0');
                params.append('testFlag', '0');
                params.append('complementDependentMode', 'OFF_MODE');
                const response = await httpFetch(url, {
                    method: 'POST',
                    headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString()
                });
                const result = await response.json();
                if (result.code === 0) success++; else failed++;
            } catch { failed++; }
        }
        
        setRunning(false);
        const summary = t('dolphinScheduler.batchRunComplete', {
            success,
            fail: failed
        });
            
        toast({ title: summary, variant: failed > 0 ? 'destructive' : 'success' });
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
                        {t('dolphinScheduler.batchRunWorkflows')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={t('dolphinScheduler.searchWorkflows')} 
                            value={searchTerm} 
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setSelectedCodes([]);
                            }} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-500">{t('dolphinScheduler.onlineWorkflowsCount', { count: onlineProcesses.length })}</span>
                        <button onClick={handleSelectAll} className="text-xs text-orange-500 hover:text-orange-600">
                            {selectedCodes.length === filteredProcesses.length && filteredProcesses.length > 0 ? t('dolphinScheduler.deselectAll') : t('dolphinScheduler.selectAll')}
                        </button>
                    </div>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto">
                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
                        ) : filteredProcesses.length === 0 ? (
                            <p className="text-slate-400 text-center py-4 text-sm">{searchTerm ? t('dolphinScheduler.noMatchingWorkflows') : t('dolphinScheduler.noOnlineWorkflows')}</p>
                        ) : (
                            filteredProcesses.map(p => (
                                <label key={p.code} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={e => setSelectedCodes(e.target.checked ? [...selectedCodes, p.code] : selectedCodes.filter(c => c !== p.code))} className="mr-3 accent-orange-500" />
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">{p.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{t('dolphinScheduler.selectedCount', { count: selectedCodes.length })}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                        <button onClick={handleBatchRun} disabled={running || selectedCodes.length === 0} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                            {running && <Loader2 size={16} className="animate-spin mr-2" />}
                            {t('dolphinScheduler.run')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
