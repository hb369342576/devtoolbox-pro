import React, { useState, useEffect } from 'react';
import { Power, XCircle, Search, Loader2 } from 'lucide-react';
import { httpFetch } from '../../../utils/http';
import { useToast } from '../../../components/ui/Toast';
import { Language, ProcessDefinition } from '../types';
import { DolphinSchedulerApiVersion } from '../../../types';
import { getWorkflowApiPath } from '../utils';

interface BatchPublishModalProps {
    show: boolean;
    lang: Language;
    processes: ProcessDefinition[];
    projectCode: string;
    baseUrl: string;
    token: string;
    apiVersion?: DolphinSchedulerApiVersion;
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchPublishModal: React.FC<BatchPublishModalProps> = ({ show, lang, processes, projectCode, baseUrl, token, apiVersion, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [processing, setProcessing] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [action, setAction] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
    
    useEffect(() => {
        if (show) {
            setSelectedCodes([]);
            setSearchTerm('');
            setAction('ONLINE');
        }
    }, [show, processes]);
    
    if (!show) return null;
    
    // 根据操作类型过滤工作流
    const targetProcesses = action === 'ONLINE' 
        ? processes.filter(p => p.releaseState === 'OFFLINE')
        : processes.filter(p => p.releaseState === 'ONLINE');
    const filteredProcesses = targetProcesses.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleSelectAll = () => {
        if (selectedCodes.length === filteredProcesses.length) {
            setSelectedCodes([]);
        } else {
            setSelectedCodes(filteredProcesses.map(p => p.code));
        }
    };
    
    const handleBatchPublish = async () => {
        if (selectedCodes.length === 0) {
            toast({ title: lang === 'zh' ? '请选择工作流' : 'Please select workflows', variant: 'destructive' });
            return;
        }
        
        setProcessing(true);
        let success = 0, failed = 0;
        
        for (const code of selectedCodes) {
            try {
                const apiPath = getWorkflowApiPath(apiVersion);
                const url = `${baseUrl}/projects/${projectCode}/${apiPath}/${code}/release`;
                const response = await httpFetch(url, {
                    method: 'POST',
                    headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `releaseState=${action}`
                });
                const result = await response.json();
                if (result.code === 0) success++; else failed++;
            } catch { failed++; }
        }
        
        setProcessing(false);
        const actionText = action === 'ONLINE' ? (lang === 'zh' ? '上线' : 'Publish') : (lang === 'zh' ? '下线' : 'Unpublish');
        toast({ title: `${actionText}${lang === 'zh' ? '完成' : ' Complete'}: ${success} ${lang === 'zh' ? '成功' : 'success'}, ${failed} ${lang === 'zh' ? '失败' : 'failed'}`, variant: failed > 0 ? 'destructive' : 'success' });
        onSuccess();
        onClose();
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Power size={20} className="mr-2 text-green-500" />
                        {lang === 'zh' ? '批量上下线' : 'Batch Publish/Unpublish'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    {/* 操作类型切换 */}
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                        <button 
                            onClick={() => { setAction('ONLINE'); setSelectedCodes([]); }} 
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${action === 'ONLINE' ? 'bg-green-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}
                        >
                            {lang === 'zh' ? '上线' : 'Publish'}
                        </button>
                        <button 
                            onClick={() => { setAction('OFFLINE'); setSelectedCodes([]); }} 
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${action === 'OFFLINE' ? 'bg-red-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}
                        >
                            {lang === 'zh' ? '下线' : 'Unpublish'}
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={lang === 'zh' ? '搜索工作流...' : 'Search workflows...'} 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                            {action === 'ONLINE' 
                                ? (lang === 'zh' ? `共 ${targetProcesses.length} 个可上线` : `${targetProcesses.length} offline`)
                                : (lang === 'zh' ? `共 ${targetProcesses.length} 个可下线` : `${targetProcesses.length} online`)}
                        </span>
                        <button onClick={handleSelectAll} className="text-xs text-green-500 hover:text-green-600">
                            {selectedCodes.length === filteredProcesses.length && filteredProcesses.length > 0 ? (lang === 'zh' ? '取消全选' : 'Deselect All') : (lang === 'zh' ? '全选' : 'Select All')}
                        </button>
                    </div>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto">
                    <div className="space-y-1">
                        {filteredProcesses.map(p => (
                            <label key={p.code} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={e => setSelectedCodes(e.target.checked ? [...selectedCodes, p.code] : selectedCodes.filter(c => c !== p.code))} className="mr-3 accent-green-500" />
                                <span className="text-slate-700 dark:text-slate-300 text-sm flex-1">{p.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${p.releaseState === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.releaseState}</span>
                            </label>
                        ))}
                        {filteredProcesses.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">{searchTerm ? (lang === 'zh' ? '未找到匹配的工作流' : 'No matching workflows') : (action === 'ONLINE' ? (lang === 'zh' ? '没有可上线的工作流' : 'No offline workflows') : (lang === 'zh' ? '没有可下线的工作流' : 'No online workflows'))}</p>}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{lang === 'zh' ? `已选 ${selectedCodes.length} 个` : `${selectedCodes.length} selected`}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                        <button onClick={handleBatchPublish} disabled={processing || selectedCodes.length === 0} className={`px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50 flex items-center ${action === 'ONLINE' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                            {processing && <Loader2 size={16} className="animate-spin mr-2" />}
                            {action === 'ONLINE' ? (lang === 'zh' ? '上线' : 'Publish') : (lang === 'zh' ? '下线' : 'Unpublish')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
