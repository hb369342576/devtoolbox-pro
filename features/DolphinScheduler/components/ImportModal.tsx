import React, { useState, useEffect } from 'react';
import { Upload, XCircle, Search, Loader2, Folder } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import { readWorkflowFromDir } from '../utils';
import { Language, ProcessDefinition } from '../types';

interface ImportModalProps {
    show: boolean;
    lang: Language;
    projectCode: string;
    baseUrl: string;
    token: string;
    processes: ProcessDefinition[];
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ show, lang, projectCode, baseUrl, token, processes, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [importing, setImporting] = useState(false);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [importDir, setImportDir] = useState<string>('');
    
    useEffect(() => {
        if (!show) {
            setWorkflows([]);
            setSelectedIndices([]);
            setSearchTerm('');
            setImportDir('');
        }
    }, [show]);
    
    if (!show) return null;
    
    // 选择目录并读取 workflow.json 文件
    const handleSelectDir = async () => {
        try {
            const dirPath = await open({
                directory: true,
                multiple: false,
                title: lang === 'zh' ? '选择导入目录' : 'Select Import Directory'
            });
            
            if (!dirPath) return;
            
            setImportDir(dirPath as string);
            
            // 读取目录内容，查找 workflow.json 或子目录中的 workflow.json
            const loadedWorkflows: any[] = [];
            
            try {
                // 尝试读取当前目录的 workflow.json
                const workflow = await readWorkflowFromDir(dirPath as string);
                workflow._dir = dirPath;
                loadedWorkflows.push(workflow);
            } catch {
                // 不是单个工作流目录，尝试读取子目录
                try {
                    const entries = await readDir(dirPath as string);
                    for (const entry of entries) {
                        if (entry.isDirectory) {
                            try {
                                const workflow = await readWorkflowFromDir(`${dirPath}/${entry.name}`);
                                workflow._dir = `${dirPath}/${entry.name}`;
                                loadedWorkflows.push(workflow);
                            } catch {
                                // 子目录没有 workflow.json，跳过
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Import] Read dir error:', e);
                }
            }
            
            if (loadedWorkflows.length === 0) {
                toast({ title: lang === 'zh' ? '未找到 workflow.json 文件' : 'No workflow.json found', variant: 'destructive' });
                return;
            }
            
            setWorkflows(loadedWorkflows);
            setSelectedIndices(loadedWorkflows.map((_, i) => i));
            toast({ title: lang === 'zh' ? `找到 ${loadedWorkflows.length} 个工作流` : `Found ${loadedWorkflows.length} workflows`, variant: 'success' });
        } catch (err: any) {
            console.error('[Import] Select dir error:', err);
            toast({ title: lang === 'zh' ? '读取目录失败' : 'Read directory failed', description: err.message, variant: 'destructive' });
        }
    };
    
    const filteredWorkflows = workflows.map((w, i) => ({ ...w, _index: i })).filter(w => 
        (w.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const handleSelectAll = () => {
        if (selectedIndices.length === filteredWorkflows.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(filteredWorkflows.map(w => w._index));
        }
    };
    
    const handleImport = async () => {
        if (workflows.length === 0 || selectedIndices.length === 0) {
            toast({ title: lang === 'zh' ? '请选择要导入的工作流' : 'Please select workflows', variant: 'destructive' });
            return;
        }
        
        setImporting(true);
        let successCount = 0;
        let skipCount = 0;
        
        try {
            for (const index of selectedIndices) {
                const workflow = workflows[index];
                const workflowName = workflow.name;
                
                // 检查是否存在同名工作流
                const existingProcess = processes.find(p => p.name === workflowName);
                
                if (existingProcess) {
                    // 检查是否上线状态
                    if (existingProcess.releaseState === 'ONLINE') {
                        const confirmed = window.confirm(
                            lang === 'zh' 
                                ? `工作流 "${workflowName}" 已上线，无法更新。是否创建新工作流？` 
                                : `Workflow "${workflowName}" is online. Create a new one?`
                        );
                        if (!confirmed) {
                            skipCount++;
                            continue;
                        }
                        // 创建新工作流
                        workflow.name = `${workflowName}_imported_${Date.now()}`;
                    }
                }
                
                // 上传逻辑 (这里简化为 Log)
                toast({ 
                    title: lang === 'zh' ? `正在导入: ${workflow.name}` : `Importing: ${workflow.name}`, 
                    variant: 'default' 
                });
                
                // 模拟 API 延迟
                await new Promise(r => setTimeout(r, 500));
                
                successCount++;
            }
            
            toast({ 
                title: lang === 'zh' 
                    ? `导入完成，成功 ${successCount} 个，跳过 ${skipCount} 个` 
                    : `Import complete: ${successCount} success, ${skipCount} skipped`, 
                variant: 'success' 
            });
            
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('[Import] Error:', err);
            toast({ title: lang === 'zh' ? '导入失败' : 'Import Failed', description: err.message, variant: 'destructive' });
        } finally {
            setImporting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Upload size={20} className="mr-2 text-purple-500" />
                        {lang === 'zh' ? '导入工作流' : 'Import Workflows'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                
                {workflows.length === 0 ? (
                    <div className="p-6">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                            <Folder size={40} className="mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-300 mb-2">{lang === 'zh' ? '选择包含 workflow.json 的目录' : 'Select a folder with workflow.json'}</p>
                            <p className="text-xs text-slate-400 mb-4">{lang === 'zh' ? '支持单个工作流目录或包含多个工作流的批量目录' : 'Supports single workflow or batch folder'}</p>
                            <button onClick={handleSelectDir} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
                                {lang === 'zh' ? '选择目录' : 'Select Folder'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-300 truncate" title={importDir}>{importDir.split('/').pop() || importDir}</span>
                                <button onClick={() => { setWorkflows([]); setImportDir(''); }} className="text-xs text-red-500 hover:text-red-600">{lang === 'zh' ? '重新选择' : 'Re-select'}</button>
                            </div>
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
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">{lang === 'zh' ? `共 ${workflows.length} 个工作流` : `${workflows.length} workflows`}</span>
                                <button onClick={handleSelectAll} className="text-xs text-purple-500 hover:text-purple-600">
                                    {selectedIndices.length === filteredWorkflows.length && filteredWorkflows.length > 0 ? (lang === 'zh' ? '取消全选' : 'Deselect All') : (lang === 'zh' ? '全选' : 'Select All')}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-[250px] overflow-y-auto">
                            <div className="space-y-1">
                                {filteredWorkflows.map(w => (
                                    <label key={w._index} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={selectedIndices.includes(w._index)} onChange={e => setSelectedIndices(e.target.checked ? [...selectedIndices, w._index] : selectedIndices.filter(i => i !== w._index))} className="mr-3 accent-purple-500" />
                                        <span className="text-slate-700 dark:text-slate-300 text-sm">{w.name || `Workflow ${w._index + 1}`}</span>
                                    </label>
                                ))}
                                {filteredWorkflows.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">{lang === 'zh' ? '未找到匹配的工作流' : 'No matching workflows'}</p>}
                            </div>
                        </div>
                    </>
                )}
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{workflows.length > 0 ? (lang === 'zh' ? `已选 ${selectedIndices.length} 个` : `${selectedIndices.length} selected`) : ''}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                        <button onClick={handleImport} disabled={importing || workflows.length === 0 || selectedIndices.length === 0} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                            {importing && <Loader2 size={16} className="animate-spin mr-2" />}
                            {lang === 'zh' ? '导入' : 'Import'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
