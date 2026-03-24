import React, { useState, useEffect } from 'react';
import { Upload, XCircle, Search, Loader2, Folder } from 'lucide-react';
import { useToast } from '../../common/Toast';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import { readWorkflowFromDir, importWorkflowToDS } from '../utils';
import { Language, ProcessDefinition } from '../types';
import { DolphinSchedulerApiVersion } from '../../../types';
import { useTranslation } from "react-i18next";

interface ImportModalProps {
    show: boolean;
    projectCode: string;
    baseUrl: string;
    token: string;
    processes: ProcessDefinition[];
    apiVersion?: DolphinSchedulerApiVersion;
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({show, projectCode, baseUrl, token, processes, apiVersion, onClose, onSuccess }) => {
    const { t, i18n } = useTranslation();
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
        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

        if (isTauri) {
            try {
                const dirPath = await open({
                    directory: true,
                    multiple: false,
                    title: t('dolphinScheduler.selectImportDir')
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
                    toast({ title: t('dolphinScheduler.noWorkflowJsonFound'), variant: 'destructive' });
                    return;
                }
                
                setWorkflows(loadedWorkflows);
                setSelectedIndices(loadedWorkflows.map((_, i) => i));
                toast({ title: t('dolphinScheduler.foundWorkflows', { count: loadedWorkflows.length }), variant: 'success' });
            } catch (err: any) {
                console.error('[Import] Select dir error:', err);
                toast({ title: t('dolphinScheduler.readDirFailed'), description: err.message, variant: 'destructive' });
            }
        } else {
            // Web 模式：使用原生 input 选择文件夹或多选文件
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.webkitdirectory = true;
            (input as any).directory = true;

            input.onchange = async (e: any) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;

                const loadedWorkflows: any[] = [];
                let commonDir = '';
                
                if (files[0].webkitRelativePath) {
                    const parts = files[0].webkitRelativePath.split('/');
                    if (parts.length > 0) commonDir = parts[0];
                } else {
                    commonDir = 'Web Upload';
                }
                setImportDir(commonDir);

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.name === 'workflow.json') {
                        try {
                            const text = await file.text();
                            const workflow = JSON.parse(text);
                            // 用相对路径来区分不同子目录的工作流
                            let dirName = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : 'unknown';
                            workflow._dir = dirName;
                            loadedWorkflows.push(workflow);
                        } catch (err) {
                            console.error('[Import] Parse JSON error:', err);
                        }
                    }
                }

                if (loadedWorkflows.length === 0) {
                    toast({ title: t('dolphinScheduler.noWorkflowJsonFound'), variant: 'destructive' });
                    return;
                }

                setWorkflows(loadedWorkflows);
                setSelectedIndices(loadedWorkflows.map((_, i) => i));
                toast({ title: t('dolphinScheduler.foundWorkflows', { count: loadedWorkflows.length }), variant: 'success' });
            };
            input.click();
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
            toast({ title: t('dolphinScheduler.pleaseSelectWorkflows'), variant: 'destructive' });
            return;
        }
        
        setImporting(true);
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;
        
        try {
            for (const index of selectedIndices) {
                const workflow = { ...workflows[index] };
                const workflowName = workflow.name;
                
                // 检查是否存在同名工作流
                const existingProcess = processes.find(p => p.name === workflowName);
                
                let existingCode: number | undefined;
                
                if (existingProcess) {
                    existingCode = existingProcess.code;
                }
                
                toast({ 
                    title: t('dolphinScheduler.importingWorkflow', { name: workflow.name }), 
                    variant: 'default' 
                });
                
                try {
                    const result = await importWorkflowToDS(
                        workflow,
                        projectCode,
                        baseUrl,
                        token,
                        apiVersion,
                        existingCode
                    );
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                        console.error(`[Import] Failed: ${workflow.name}:`, result.msg);
                        toast({
                            title: t('dolphinScheduler.importFailedWithName', { name: workflow.name }),
                            description: result.msg,
                            variant: 'destructive'
                        });
                    }
                } catch (err: any) {
                    failCount++;
                    console.error(`[Import] Error for ${workflow.name}:`, err);
                    toast({
                        title: t('dolphinScheduler.importErrorWithName', { name: workflow.name }),
                        description: err.message,
                        variant: 'destructive'
                    });
                }
            }
            
            const summary = t('dolphinScheduler.importDone', {
                success: successCount,
                skip: skipCount,
                fail: failCount
            });
            
            toast({ 
                title: summary, 
                variant: failCount > 0 ? 'destructive' : 'success' 
            });
            
            if (successCount > 0) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            console.error('[Import] Error:', err);
            toast({ title: t('common.failed'), description: err.message, variant: 'destructive' });
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
                        {t('dolphinScheduler.importWorkflow')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><XCircle size={20} /></button>
                </div>
                
                {workflows.length === 0 ? (
                    <div className="p-6">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                            <Folder size={40} className="mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-300 mb-2">{t('dolphinScheduler.selectImportFolder')}</p>
                            <p className="text-xs text-slate-400 mb-4">{t('dolphinScheduler.supportSingleOrBatch')}</p>
                            <button onClick={handleSelectDir} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
                                {t('dolphinScheduler.selectFolder')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-300 truncate" title={importDir}>{importDir.split('/').pop() || importDir}</span>
                                <button onClick={() => { setWorkflows([]); setImportDir(''); }} className="text-xs text-red-500 hover:text-red-600">{t('dolphinScheduler.reSelect')}</button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={t('dolphinScheduler.searchWorkflows')} 
                                    value={searchTerm} 
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setSelectedIndices([]);
                                    }} 
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">{t('dolphinScheduler.foundWorkflows', { count: workflows.length })}</span>
                                <button onClick={handleSelectAll} className="text-xs text-purple-500 hover:text-purple-600">
                                    {selectedIndices.length === filteredWorkflows.length && filteredWorkflows.length > 0 ? t('dolphinScheduler.deselectAll') : t('dolphinScheduler.selectAll')}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 h-[250px] overflow-y-auto">
                            <div className="space-y-1">
                                {filteredWorkflows.map(w => (
                                    <label key={w._index} className="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={selectedIndices.includes(w._index)} onChange={e => setSelectedIndices(e.target.checked ? [...selectedIndices, w._index] : selectedIndices.filter(i => i !== w._index))} className="mr-3 accent-purple-500" />
                                        <span className="text-slate-700 dark:text-slate-300 text-sm">{w.name || `Workflow ${w._index + 1}`}</span>
                                    </label>
                                ))}
                                {filteredWorkflows.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">{t('dolphinScheduler.noMatchingWorkflows')}</p>}
                            </div>
                        </div>
                    </>
                )}
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">{workflows.length > 0 ? t('dolphinScheduler.selectedCount', { count: selectedIndices.length }) : ''}</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                        <button onClick={handleImport} disabled={importing || workflows.length === 0 || selectedIndices.length === 0} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                            {importing && <Loader2 size={16} className="animate-spin mr-2" />}
                            {t('common.import')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
