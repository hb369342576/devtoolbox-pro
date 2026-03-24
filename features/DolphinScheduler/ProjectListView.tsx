import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Search, Folder, RefreshCw, Loader2,
    FolderKanban, HardDrive, ListTodo, FolderOpen, Database,
    LayoutDashboard, List, Calendar, CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Language, DolphinSchedulerConnection, DSProject, DolphinSchedulerApiVersion } from '../../types';
import { httpFetch } from '../../utils/http';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { useViewMode } from '../../store/globalStore';
import { ViewModeToggle } from '../common/ViewModeToggle';

import { useTranslation } from "react-i18next";

interface ProjectListViewProps {
    connection: DolphinSchedulerConnection;
    onBack: () => void;
    onSelectProject: (project: DSProject) => void;
    onOpenResourceCenter: () => void;
    onOpenDataSourceCenter: () => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
    connection,
    onBack,
    onSelectProject,
    onOpenResourceCenter,
    onOpenDataSourceCenter
}) => {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const viewMode = useViewMode();
    const [projects, setProjects] = useState<DSProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    // Overview Stats States
    const [activeTab, setActiveTab] = useState<'overview' | 'list'>('overview');
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overviewStats, setOverviewStats] = useState<{success: number, failure: number, total: number}>({ success: 0, failure: 0, total: 0 });
    const [chartData, setChartData] = useState<{name: string, value: number, state: string}[]>([]);
    
    // State labels for charts
    const stateLabels: Record<string, string> = {
        'SUCCESS': t('dolphinScheduler.stateSuccess', '成功'),
        'SUBMITTED_SUCCESS': t('dolphinScheduler.stateSubmittedSuccess', '提交成功'),
        'RUNNING_EXECUTION': t('dolphinScheduler.stateRunningExecution', '正在运行'),
        'PAUSE': t('dolphinScheduler.statePause', '暂停'),
        'FAILURE': t('dolphinScheduler.stateFailure', '失败'),
        'NEED_FAULT_TOLERANCE': t('dolphinScheduler.stateNeedFaultTolerance', '需要容错'),
        'KILL': t('dolphinScheduler.stateKill', 'KILL'),
        'DELAY_EXECUTION': t('dolphinScheduler.stateDelayExecution', '延时执行'),
        'FORCED_SUCCESS': t('dolphinScheduler.stateForcedSuccess', '强制成功'),
        'DISPATCH': t('dolphinScheduler.stateDispatch', '派发')
    };

    const stateColors: Record<string, string> = {
        'SUCCESS': '#10b981',
        'SUBMITTED_SUCCESS': '#3b82f6',
        'RUNNING_EXECUTION': '#8b5cf6',
        'PAUSE': '#f59e0b',
        'FAILURE': '#ef4444',
        'NEED_FAULT_TOLERANCE': '#f97316',
        'KILL': '#dc2626',
        'DELAY_EXECUTION': '#a855f7',
        'FORCED_SUCCESS': '#059669',
        'DISPATCH': '#06b6d4'
    };
    
    // Default dates (today 00:00:00 to current time)
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const formatDateTimeStr = (d: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Replace 'T' with ' ' for DolphinScheduler API later
    const [startDate, setStartDate] = useState(formatDateTimeStr(todayStart));
    const [endDate, setEndDate] = useState(formatDateTimeStr(today));
    const [selectedProjectCode, setSelectedProjectCode] = useState<string>('');
    const [allProjectsList, setAllProjectsList] = useState<DSProject[]>([]);

    useEffect(() => {
        if (activeTab === 'list') {
            fetchProjects();
        }
    }, [connection, pageNo, activeTab]);

    useEffect(() => {
        if (activeTab === 'overview') {
            if (allProjectsList.length === 0) fetchAllProjects();
            fetchOverviewStats();
        }
    }, [activeTab, connection]);

    const handleQuery = () => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        if (isNaN(start) || isNaN(end)) {
            toast({ title: t('dolphinScheduler.invalidDate', '无效的日期格式'), variant: 'destructive' });
            return;
        }
        if (start > end) {
            toast({ title: t('dolphinScheduler.dateRangeError', '开始时间不能晚于结束时间'), variant: 'destructive' });
            return;
        }
        fetchOverviewStats();
    };

    const handleReset = () => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const newStart = formatDateTimeStr(start);
        const newEnd = formatDateTimeStr(now);
        
        setStartDate(newStart);
        setEndDate(newEnd);
        setSelectedProjectCode('');
        
        fetchOverviewStats(newStart, newEnd, '');
    };

    const fetchAllProjects = async () => {
        try {
            const url = `${connection.baseUrl}/projects?pageNo=1&pageSize=10000`;
            const response = await httpFetch(url, { headers: { 'token': connection.token } });
            const result = await response.json();
            if (result.code === 0) {
                setAllProjectsList(result.data?.totalList || []);
            }
        } catch(err) {}
    };

    const fetchOverviewStats = async (overrideStart?: string, overrideEnd?: string, overrideProject?: string) => {
        setOverviewLoading(true);
        try {
            // Transform 2024-01-01T12:00 to 2024-01-01 12:00:00
            const formatForApi = (dt: string) => {
                const parts = dt.replace('T', ' ').split(':');
                if (parts.length === 2) return dt.replace('T', ' ') + ':00';
                if (parts.length === 3) return dt.replace('T', ' ');
                return dt + ' 00:00:00';
            };
            
            const s = overrideStart !== undefined ? overrideStart : startDate;
            const e = overrideEnd !== undefined ? overrideEnd : endDate;
            const p = overrideProject !== undefined ? overrideProject : selectedProjectCode;
            
            const start = formatForApi(s);
            const end = formatForApi(e);

            let url = `${connection.baseUrl}/projects/analysis/task-state-count?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
            if (p) {
                url += `&projectCode=${p}`;
            }
            
            const response = await httpFetch(url, { headers: { 'token': connection.token } });
            const result = await response.json();
            console.log('Task state API response:', result); // for debugging why it's empty
            
            if (result.code === 0) {
                const dtos = result.data?.taskCountDtos || result.data?.taskInstanceStatusCounts || result.data || [];
                let successCount = 0;
                let failureCount = 0;
                let totalCount = 0;
                const items = Array.isArray(dtos) ? dtos : [];
                
                const newChartData: {name: string, value: number, state: string}[] = [];
                
                items.forEach((item: any) => {
                    const count = item.count || 0;
                    totalCount += count;
                    const state = item.taskStateType || item.state || 'UNKNOWN';
                    
                    if (state === 'SUCCESS') successCount += count;
                    else if (state === 'FAILURE') failureCount += count;
                    
                    if (count > 0) {
                        newChartData.push({
                            name: state, // Store raw state, translate on render
                            value: count,
                            state: state
                        });
                    }
                });
                setOverviewStats({ success: successCount, failure: failureCount, total: totalCount });
                setChartData(newChartData);
            } else {
                toast({ title: t('common.loadFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch(err: any) {
            console.error(err);
        } finally {
            setOverviewLoading(false);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const searchVal = searchTerm ? `&searchVal=${encodeURIComponent(searchTerm)}` : '';
            const url = `${connection.baseUrl}/projects?pageNo=${pageNo}&pageSize=${pageSize}${searchVal}`;
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': connection.token }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            
            if (result.code === 0) {
                setProjects(result.data?.totalList || []);
                setTotal(result.data?.total || 0);
            } else {
                toast({ title: t('common.loadFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('common.loadFailed'), description: err.message, variant: 'destructive' });
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
                    <Tooltip content={t('dolphinScheduler.backToConnections')} position="right">
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
                <div className="flex items-center space-x-2">
                    {activeTab === 'list' && <ViewModeToggle />}
                    {activeTab === 'overview' && (
                        <>
                            <Tooltip content={t('dolphinScheduler.reset', '重置')} position="bottom">
                                <button
                                    onClick={handleReset}
                                    disabled={overviewLoading}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw size={16} className="text-slate-500 dark:text-slate-400" />
                                </button>
                            </Tooltip>
                            <Tooltip content={t('dolphinScheduler.query', '查询')} position="bottom">
                                <button
                                    onClick={handleQuery}
                                    disabled={overviewLoading}
                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Search size={16} className="text-blue-500 dark:text-blue-400" />
                                </button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip content={t('common.refresh', '刷新')} position="bottom">
                        <button
                            onClick={activeTab === 'overview' ? () => fetchOverviewStats() : fetchProjects}
                            disabled={activeTab === 'overview' ? overviewLoading : loading}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={`text-slate-600 dark:text-slate-400 ${(activeTab === 'overview' ? overviewLoading : loading) ? 'animate-spin' : ''}`} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center space-x-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md transform scale-105' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <LayoutDashboard size={18} className="mr-2" />
                    {t('dolphinScheduler.projectOverview', '项目概览')}
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md transform scale-105' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <List size={18} className="mr-2" />
                    {t('dolphinScheduler.projectList', '项目列表')}
                </button>
            </div>

            {activeTab === 'overview' ? (
                <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar pr-2">
                    {/* Compact Filter Box */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('common.startDate', 'Start Date')}</label>
                                <input 
                                    type="datetime-local"
                                    step="1"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="pl-2 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[210px] [color-scheme:light] dark:[color-scheme:dark] text-blue-600 dark:text-blue-400 font-medium"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('common.endDate', 'End Date')}</label>
                                <input 
                                    type="datetime-local"
                                    step="1"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="pl-2 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[210px] [color-scheme:light] dark:[color-scheme:dark] text-blue-600 dark:text-blue-400 font-medium"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t('dolphinScheduler.selectProject', 'Select Project')}</label>
                                <select
                                    value={selectedProjectCode}
                                    onChange={e => setSelectedProjectCode(e.target.value)}
                                    className="pl-2 pr-6 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none text-blue-600 dark:text-blue-400 font-medium min-w-[160px]"
                                >
                                    <option value="">{t('common.allProjects', 'All Projects')}</option>
                                    {allProjectsList.map(p => (
                                        <option key={p.code} value={p.code}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Pie Chart */}
                        <div className="w-[500px] shrink-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 h-[360px] flex flex-col">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('dolphinScheduler.taskStatusDistribution', '任务状态分布')}</h3>
                            {chartData.length > 0 ? (
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData.map(d => ({ ...d, name: stateLabels[d.state] || d.state }))}
                                                cx="45%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={105}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={stateColors[entry.state] || '#94a3b8'} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value, name) => [value, name]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend 
                                                layout="vertical" 
                                                verticalAlign="middle" 
                                                align="right"
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
                                    {overviewLoading ? t('common.loading', '加载中...') : t('common.noData', '暂无数据')}
                                </div>
                            )}
                        </div>

                        {/* Right: Summary Cards */}
                        <div className="w-[320px] shrink-0 flex flex-col gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-xl shadow-md relative overflow-hidden group h-[110px] flex flex-col justify-center">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-white/20 transition-all duration-500" />
                                <h3 className="text-white/80 font-medium text-sm mb-1 z-10">{t('dolphinScheduler.totalTasks', '任务总数')}</h3>
                                <div className="flex items-end justify-between z-10">
                                    <span className="text-3xl font-bold text-white">{overviewStats.total}</span>
                                    <ListTodo size={24} className="text-white/40 mb-1" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-5 rounded-xl shadow-md relative overflow-hidden group h-[110px] flex flex-col justify-center">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-white/20 transition-all duration-500" />
                                <h3 className="text-white/80 font-medium text-sm mb-1 z-10">{t('dolphinScheduler.successTasks', '成功任务数')}</h3>
                                <div className="flex items-end justify-between z-10">
                                    <span className="text-3xl font-bold text-white">{overviewStats.success}</span>
                                    <CheckCircle2 size={24} className="text-white/40 mb-1" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-red-400 to-rose-600 p-5 rounded-xl shadow-md relative overflow-hidden group h-[110px] flex flex-col justify-center">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-white/20 transition-all duration-500" />
                                <h3 className="text-white/80 font-medium text-sm mb-1 z-10">{t('dolphinScheduler.failedTasks', '失败任务数')}</h3>
                                <div className="flex items-end justify-between z-10">
                                    <span className="text-3xl font-bold text-white">{overviewStats.failure}</span>
                                    <XCircle size={24} className="text-white/40 mb-1" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* 搜索栏和操作按钮 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('dolphinScheduler.searchProjects')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {t('dolphinScheduler.totalProjects', { count: total })}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    {/* 数据源中心入口 */}
                    <button
                        onClick={onOpenDataSourceCenter}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
                    >
                        <Database size={18} className="mr-2" />
                        {t('dolphinScheduler.dataSourceCenter')}
                    </button>
                    {/* 资源中心入口 */}
                    <button
                        onClick={onOpenResourceCenter}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
                    >
                        <HardDrive size={18} className="mr-2" />
                        {t('dolphinScheduler.resourceCenter')}
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
                                className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                                onClick={() => onSelectProject(project)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-[10px] rounded-lg border-2 border-indigo-200 dark:border-indigo-800/60 text-indigo-500 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-colors duration-300">
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
                                {t('dolphinScheduler.noProjectsFound')}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-4">{t('dolphinScheduler.projectName')}</div>
                            <div className="col-span-4">{t('dolphinScheduler.description')}</div>
                            <div className="col-span-2">{t('dolphinScheduler.owner')}</div>
                            <div className="col-span-2">{t('dolphinScheduler.updated')}</div>
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
                                    {t('dolphinScheduler.noProjectsFound')}
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
                        {t('dolphinScheduler.prev')}
                    </button>
                    <span className="text-sm text-slate-500">{pageNo} / {totalPages}</span>
                    <button
                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                        disabled={pageNo === totalPages}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {t('dolphinScheduler.next')}
                    </button>
                </div>
            )}
                </>
            )}
        </div>
    );
};
