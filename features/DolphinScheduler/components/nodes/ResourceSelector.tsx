import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Folder, File, Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { httpFetch } from '../../../../utils/http';

interface ResourceSelectorProps {
    projectConfig: any;
    onSelect: (file: { id: number; fullName: string }) => void;
    onClose: () => void;
    title?: string;
    filter?: (file: any) => boolean;
    initialPath?: string; // 打开时默认定位到的目录，如项目名
}

export const ResourceSelector: React.FC<ResourceSelectorProps> = ({
    projectConfig,
    onSelect,
    onClose,
    title,
    filter,
    initialPath
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [pathHistory, setPathHistory] = useState<{ name: string; path: string }[]>([
        { name: t('dolphinScheduler.editor.resourceCenter'), path: '' }
    ]);
    const [searchVal, setSearchVal] = useState('');
    const [initialized, setInitialized] = useState(false);

    const currentPath = pathHistory[pathHistory.length - 1].path;

    const fetchFiles = async (path: string = '') => {
        if (!projectConfig?.baseUrl || !projectConfig?.token) return;
        setLoading(true);
        try {
            const url = `${projectConfig.baseUrl}/resources?fullName=${encodeURIComponent(path)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=1000`;
            const resp = await httpFetch(url, { method: 'GET', headers: { 'token': projectConfig.token } });
            const result = await resp.json();
            if (result.code === 0) {
                return result.data?.totalList || result.data || [];
            }
        } catch (err) {
            console.error('Failed to fetch resources', err);
        } finally {
            setLoading(false);
        }
        return [];
    };

    // 初始化：尝试打开 initialPath 目录，若失败回退到根目录
    useEffect(() => {
        if (initialized) return;
        setInitialized(true);

        const init = async () => {
            if (initialPath) {
                // 先查根目录，看是否有匹配的文件夹
                const rootFiles = await fetchFiles('');
                const matchDir = rootFiles.find(
                    (f: any) => f.directory && (f.alias === initialPath || f.fileName === initialPath)
                );
                if (matchDir) {
                    // 进入对应目录
                    setPathHistory([
                        { name: t('dolphinScheduler.editor.resourceCenter'), path: '' },
                        { name: matchDir.alias || matchDir.fileName, path: matchDir.fullName }
                    ]);
                    const subFiles = await fetchFiles(matchDir.fullName);
                    setFiles(subFiles);
                    return;
                }
            }
            // 回退到根目录
            const rootFiles = await fetchFiles('');
            setFiles(rootFiles);
        };

        init();
    }, []);

    // 路径切换时重新加载 (初始化后才响应)
    useEffect(() => {
        if (!initialized) return;
        fetchFiles(currentPath).then(f => setFiles(f));
    }, [currentPath]);

    const handleFolderClick = (f: any) => {
        setPathHistory(prev => [...prev, { name: f.alias || f.fileName, path: f.fullName }]);
        setSearchVal('');
    };

    const filteredFiles = files.filter(f =>
        (f.alias || f.fileName || '').toLowerCase().includes(searchVal.toLowerCase()) &&
        (f.directory || !filter || filter(f))
    );

    return (
        <div className="absolute z-50 mt-1 w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[400px]">
            {/* Header */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Folder size={14} className="text-blue-500" />
                    <span>{title || t('dolphinScheduler.editor.resources')}</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Breadcrumbs & Search */}
            <div className="p-2 space-y-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {pathHistory.map((h, i) => (
                        <React.Fragment key={i}>
                            <button
                                onClick={() => { setPathHistory(pathHistory.slice(0, i + 1)); setSearchVal(''); }}
                                className={`hover:text-blue-500 transition-colors ${i === pathHistory.length - 1 ? 'font-bold text-slate-700 dark:text-slate-200' : ''}`}
                            >
                                {h.name}
                            </button>
                            {i < pathHistory.length - 1 && <ChevronRight size={10} className="opacity-50" />}
                        </React.Fragment>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
                    <input
                        type="text"
                        placeholder={t('dolphinScheduler.editor.searchFiles')}
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 min-h-[200px] p-1">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-blue-500 opacity-50" /></div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredFiles.map((f: any) => (
                            <button
                                key={f.id ?? f.fullName}
                                onClick={() => f.directory ? handleFolderClick(f) : onSelect({ id: f.id, fullName: f.fullName })}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                            >
                                {f.directory ? (
                                    <Folder size={14} className="text-amber-500 shrink-0" />
                                ) : (
                                    <File size={14} className="text-slate-400 shrink-0" />
                                )}
                                <span className="flex-1 truncate dark:text-slate-300 group-hover:text-blue-500 transition-colors" title={f.alias || f.fileName}>
                                    {f.alias || f.fileName}
                                </span>
                                {f.directory && <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />}
                            </button>
                        ))}
                        {filteredFiles.length === 0 && !loading && (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {t('dolphinScheduler.editor.noMatchingResults')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
