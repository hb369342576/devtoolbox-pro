import React from 'react';
import { Eye, XCircle } from 'lucide-react';
import { Language, ProcessDefinition } from '../types';

interface DetailModalProps {
    process: ProcessDefinition | null;
    lang: Language;
    onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ process, lang, onClose }) => {
    if (!process) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Eye size={20} className="mr-2 text-blue-500" />
                        {lang === 'zh' ? '工作流详情' : 'Workflow Details'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <XCircle size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '名称' : 'Name'}</label>
                                <p className="text-slate-800 dark:text-white font-medium">{process.name}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '版本' : 'Version'}</label>
                                <p className="text-slate-800 dark:text-white">v{process.version}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '上线状态' : 'Release State'}</label>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${process.releaseState === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {process.releaseState}
                                </span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '调度状态' : 'Schedule'}</label>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${process.scheduleReleaseState === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {process.scheduleReleaseState || 'NONE'}
                                </span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '修改人' : 'Modified By'}</label>
                                <p className="text-slate-600 dark:text-slate-300">{process.userName || process.modifyBy || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '修改时间' : 'Update Time'}</label>
                                <p className="text-slate-600 dark:text-slate-300">{new Date(process.updateTime).toLocaleString()}</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '描述' : 'Description'}</label>
                            <p className="text-slate-600 dark:text-slate-300 mt-1">{process.description || (lang === 'zh' ? '暂无描述' : 'No description')}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Code</label>
                            <p className="text-slate-500 font-mono text-sm">{process.code}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                        {lang === 'zh' ? '关闭' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};
