import React, { useState, useEffect } from 'react';
import { Download, XCircle, Search, Loader2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { open } from '@tauri-apps/plugin-dialog';
import { exportWorkflowsToLocal } from '../utils';
import { Language, ProcessDefinition } from '../types';

interface ExportModalProps {
    show: boolean;
    lang: Language;
    processes: ProcessDefinition[];
    projectCode: string;
    baseUrl: string;
    token: string;
    onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ show, lang, processes, projectCode, baseUrl, token, onClose }) => {
    const { toast } = useToast();
    const [exporting, setExporting] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [fileName, setFileName] = useState(`workflows_export_${new Date().toISOString().slice(0, 10)}`);
    
    useEffect(() => {
        if (show) {
            setSelectedCodes([]);
            setSearchTerm('');
            setFileName(`workflows_export_${new Date().toISOString().slice(0, 10)}`);
        }
    }, [show]);
    
    if (!show) return null;
    
    const filteredProcesses = processes.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleSelectAll = () => {
        if (selectedCodes.length === filteredProcesses.length) {
            setSelectedCodes([]);
        } else {
            setSelectedCodes(filteredProcesses.map(p => p.code));
        }
    };
    
    const handleExport = async () => {
        if (selectedCodes.length === 0) {
            toast({ title: lang === 'zh' ? '请选择要导出的工作流' : 'Please select workflows', variant: 'destructive' });
            return;
        }
        
        setExporting(true);
        try {
            // 选择保存目录
            const savePath = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择导出目录' : 'Select Export Directory'
            });
            
            if (!savePath) {
                setExporting(false);
                return;
            }
            
            const items = selectedCodes.map(code => {
                const process = processes.find(p => p.code === code);
                return { code, name: process?.name || `workflow_${code}` };
            });

            const count = await exportWorkflowsToLocal(
                items,
                projectCode,
                baseUrl,
                token,
                savePath as string,
                fileName,
                (current, total, name) => {
                    // 可以在这里添加进度提示，如果有进度条组件的话
                }
            );
            
            toast({ title: lang === 'zh' ? `导出成功，共 ${count} 个工作流` : `Exported ${count} workflows`, variant: 'success' });
            onClose();
        } catch (err: any) {
            console.error('[Export] Error:', err);
            toast({ title: lang === 'zh' ? '导出失败' : 'Export Failed', description: err.message, variant: 'destructive' });
        } finally {
            setExporting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Download size={20} className="mr-2 text-purple-500" />
                        {lang === 'zh' ? '导出工作流' : 'Export Workflows'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={lang === 'zh' ? '搜索工作流...' : 'Search workflows...'} 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">{lang === 'zh' ? '导出文件名' : 'Export File Name'}</label>
                        <div className="flex items-center">
                            <input 
                                type="text" 
                                value={fileName} 
                                onChange={e => setFileName(e.target.value)} 
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-l-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                            />
                            <span className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-lg text-sm text-slate-500">.json</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{lang === 'zh' ? `共 ${processes.length} 个工作流` : `${processes.length} workflows total`}</span>
                        <button onClick={handleSelectAll} className="text-xs text-purple-500 hover:text-purple-600">
                            {selectedCodes.length === filteredProcesses.length && filteredProcesses.length > 0 ? (lang === 'zh' ? '取消全选' : 'Deselect All') : (lang === 'zh' ? '全选' : 'Select All')}
                        </button>
                    </div>
                </div>
                <div className="p-4 max-h-[250px] overflow-y-auto">
                    <div className="space-y-1">
                        {filteredProcesses.map(p => (
                            <label key={p.code} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={e => setSelectedCodes(e.target.checked ? [...selectedCodes, p.code] : selectedCodes.filter(c => c !== p.code))} className="mr-3 accent-purple-500" />
                                <span className="text-slate-700 dark:text-slate-300 text-sm flex-1">{p.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${p.releaseState === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.releaseState}</span>
                            </label>
                        ))}
                        {filteredProcesses.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">{lang === 'zh' ? '未找到匹配的工作流' : 'No matching workflows'}</p>}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{lang === 'zh' ? `已选 ${selectedCodes.length} 个` : `${selectedCodes.length} selected`}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                        <button onClick={handleExport} disabled={exporting || selectedCodes.length === 0} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                            {exporting && <Loader2 size={16} className="animate-spin mr-2" />}
                            {lang === 'zh' ? '导出' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
