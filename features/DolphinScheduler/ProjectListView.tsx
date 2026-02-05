import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Search, Folder, RefreshCw, Loader2,
    FolderKanban, HardDrive, ListTodo, FolderOpen, Database
} from 'lucide-react';
import { Language, DolphinSchedulerConnection, DSProject, DolphinSchedulerApiVersion } from '../../types';
import { httpFetch } from '../../utils/http';
import { useToast } from '../../components/ui/Toast';
import { Tooltip } from '../../components/ui/Tooltip';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

interface ProjectListViewProps {
    lang: Language;
    connection: DolphinSchedulerConnection;
    onBack: () => void;
    onSelectProject: (project: DSProject) => void;
    onOpenResourceCenter: () => void;
    onOpenDataSourceCenter: () => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
    lang,
    connection,
    onBack,
    onSelectProject,
    onOpenResourceCenter,
    onOpenDataSourceCenter
}) => {
    const { toast } = useToast();
    const viewMode = useViewMode();
    const [projects, setProjects] = useState<DSProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        fetchProjects();
    }, [connection, pageNo]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const searchVal = searchTerm ? `&searchVal=${encodeURIComponent(searchTerm)}` : '';
            const url = `${connection.baseUrl}/projects?pageNo=${pageNo}&pageSize=${pageSize}${searchVal}`;
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': connection.token }
            });
            const result = await response.json();
            
            if (result.code === 0) {
                setProjects(result.data?.totalList || []);
                setTotal(result.data?.total || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPageNo(1);
        fetchProjects();
    };

    const totalPages = Math.ceil(total / pageSize);
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col">
            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <Tooltip content={lang === 'zh' ? '返回连接列表' : 'Back to connections'} position="right">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>
                    </Tooltip>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                            <FolderKanban className="mr-3 text-blue-600" />
                            {connection.name}
                        </h2>
                        <p className="text-xs text-slate-500 font-mono">{connection.baseUrl}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <ViewModeToggle />
                    <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                        <button
                            onClick={fetchProjects}
                            disabled={loading}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={`text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* 搜索栏和操作按钮 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={lang === 'zh' ? '搜索项目...' : 'Search projects...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {lang === 'zh' ? `共 ${total} 个项目` : `${total} projects total`}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    {/* 数据源中心入口 */}
                    <button
                        onClick={onOpenDataSourceCenter}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
                    >
                        <Database size={18} className="mr-2" />
                        {lang === 'zh' ? '数据源中心' : 'DataSource'}
                    </button>
                    {/* 资源中心入口 */}
                    <button
                        onClick={onOpenResourceCenter}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
                    >
                        <HardDrive size={18} className="mr-2" />
                        {lang === 'zh' ? '资源中心' : 'Resource'}
                    </button>
                </div>
            </div>

            {/* 项目列表 */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                        {filteredProjects.map(project => (
                            <div
                                key={project.code}
                                className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[180px] w-72"
                                onClick={() => onSelectProject(project)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                        <Folder size={24} />
                                    </div>
                                    <ListTodo size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate">{project.name}</h3>
                                <div className="space-y-1">
                                    {project.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{project.description}</p>
                                    )}
                                    <div className="flex items-center text-xs text-slate-400">
                                        <span>{project.userName || '-'}</span>
                                        {project.updateTime && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <span>{project.updateTime}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                            </div>
                        ))}
                        {filteredProjects.length === 0 && !loading && (
                            <div className="w-full text-center py-20 text-slate-400">
                                {lang === 'zh' ? '暂无项目' : 'No projects found'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-4">{lang === 'zh' ? '项目名称' : 'Project Name'}</div>
                            <div className="col-span-4">{lang === 'zh' ? '描述' : 'Description'}</div>
                            <div className="col-span-2">{lang === 'zh' ? '负责人' : 'Owner'}</div>
                            <div className="col-span-2">{lang === 'zh' ? '更新时间' : 'Updated'}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredProjects.map(project => (
                                <div
                                    key={project.code}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => onSelectProject(project)}
                                >
                                    <div className="col-span-4 flex items-center space-x-3">
                                        <Folder size={18} className="text-indigo-500" />
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{project.name}</span>
                                    </div>
                                    <div className="col-span-4 text-sm text-slate-500 dark:text-slate-400 truncate">
                                        {project.description || '-'}
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-500 dark:text-slate-400">
                                        {project.userName || '-'}
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-400">
                                        {project.updateTime || '-'}
                                    </div>
                                </div>
                            ))}
                            {filteredProjects.length === 0 && !loading && (
                                <div className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                    {lang === 'zh' ? '暂无项目' : 'No projects found'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setPageNo(p => Math.max(1, p - 1))}
                        disabled={pageNo === 1}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '上一页' : 'Prev'}
                    </button>
                    <span className="text-sm text-slate-500">{pageNo} / {totalPages}</span>
                    <button
                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                        disabled={pageNo === totalPages}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '下一页' : 'Next'}
                    </button>
                </div>
            )}
        </div>
    );
};
