import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { NodeFormProps } from './types';
import { httpFetch } from '../../../../utils/http';
import { getWorkflowApiPath } from '../../utils/common';

export const DependentNodeForm: React.FC<NodeFormProps> = ({ data, onChange, projectConfig, readOnly = false }) => {
    const { t } = useTranslation();

    // Init data structure
    const dependence = data.dependence || {
        relation: 'AND',
        dependTaskList: []
    };

    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        if (!projectConfig?.baseUrl || !projectConfig?.token) return;
        const fetchProjects = async () => {
            try {
                const resp = await httpFetch(`${projectConfig.baseUrl}/projects?pageSize=100&pageNo=1`, {
                    headers: { 'token': projectConfig.token }
                });
                const res = await resp.json();
                if (res.code === 0 && res.data?.totalList) {
                    setProjects(res.data.totalList);
                }
            } catch (err) { }
        };
        fetchProjects();
    }, [projectConfig]);

    const handleUpdate = (newDependence: any) => {
        onChange({ ...data, dependence: newDependence });
    };

    const addDependTaskGroup = () => {
        const newList = [...(dependence.dependTaskList || [])];
        newList.push({
            relation: 'AND',
            dependItemList: [{
                projectCode: projectConfig?.projectCode || '',
                definitionCode: '',
                depTaskCode: 'ALL',
                cycle: 'day',
                dateValue: 'today'
            }]
        });
        handleUpdate({ ...dependence, dependTaskList: newList });
    };

    const removeDependTaskGroup = (grpIndex: number) => {
        const newList = [...dependence.dependTaskList];
        newList.splice(grpIndex, 1);
        handleUpdate({ ...dependence, dependTaskList: newList });
    };

    const addDependItem = (grpIndex: number) => {
        const newList = [...dependence.dependTaskList];
        newList[grpIndex].dependItemList.push({
            projectCode: projectConfig?.projectCode || '',
            definitionCode: '',
            depTaskCode: 'ALL',
            cycle: 'day',
            dateValue: 'today'
        });
        handleUpdate({ ...dependence, dependTaskList: newList });
    };

    const removeDependItem = (grpIndex: number, itemIndex: number) => {
        const newList = [...dependence.dependTaskList];
        newList[grpIndex].dependItemList.splice(itemIndex, 1);
        handleUpdate({ ...dependence, dependTaskList: newList });
    };

    const updateDependItem = (grpIndex: number, itemIndex: number, field: string, val: any) => {
        const newList = [...dependence.dependTaskList];
        const currentIsWorkflow = newList[grpIndex].dependItemList[itemIndex].depTaskCode === 'ALL';
        newList[grpIndex].dependItemList[itemIndex][field] = val;
        // 级联重置
        if (field === 'projectCode') {
            newList[grpIndex].dependItemList[itemIndex].definitionCode = '';
            newList[grpIndex].dependItemList[itemIndex].depTaskCode = currentIsWorkflow ? 'ALL' : '';
        } else if (field === 'definitionCode') {
            newList[grpIndex].dependItemList[itemIndex].depTaskCode = currentIsWorkflow ? 'ALL' : '';
        }
        handleUpdate({ ...dependence, dependTaskList: newList });
    };

    // Cycle Options Config
    const cycleOptions = {
        month: [
            { label: t('dolphinScheduler.cycleThisMonth'), value: 'thisMonth' },
            { label: t('dolphinScheduler.cycleThisMonthBegin'), value: 'thisMonthBegin' },
            { label: t('dolphinScheduler.cycleLastMonth'), value: 'lastMonth' },
            { label: t('dolphinScheduler.cycleLastMonthBegin'), value: 'lastMonthBegin' },
            { label: t('dolphinScheduler.cycleLastMonthEnd'), value: 'lastMonthEnd' }
        ],
        week: [
            { label: t('dolphinScheduler.cycleThisWeek'), value: 'thisWeek' },
            { label: t('dolphinScheduler.cycleLastWeek'), value: 'lastWeek' },
            { label: t('dolphinScheduler.cycleLastMon'), value: 'lastMonday' },
            { label: t('dolphinScheduler.cycleLastTue'), value: 'lastTuesday' },
            { label: t('dolphinScheduler.cycleLastWed'), value: 'lastWednesday' },
            { label: t('dolphinScheduler.cycleLastThu'), value: 'lastThursday' },
            { label: t('dolphinScheduler.cycleLastFri'), value: 'lastFriday' },
            { label: t('dolphinScheduler.cycleLastSat'), value: 'lastSaturday' },
            { label: t('dolphinScheduler.cycleLastSun'), value: 'lastSunday' }
        ],
        day: [
            { label: t('dolphinScheduler.cycleDay'), value: 'today' },
            { label: t('dolphinScheduler.cycleYesterday'), value: 'yesterday' },
            { label: t('dolphinScheduler.cyclePrior2Days'), value: 'prior2Days' },
            { label: t('dolphinScheduler.cyclePrior3Days'), value: 'prior3Days' },
            { label: t('dolphinScheduler.cyclePrior7Days'), value: 'prior7Days' }
        ],
        hour: [
            { label: t('dolphinScheduler.cycleCurrentHour'), value: 'currentHour' },
            { label: t('dolphinScheduler.cyclePrior1Hour'), value: 'prior1Hour' },
            { label: t('dolphinScheduler.cyclePrior2Hours'), value: 'prior2Hours' },
            { label: t('dolphinScheduler.cyclePrior3Hours'), value: 'prior3Hours' },
            { label: t('dolphinScheduler.cyclePrior24Hours'), value: 'prior24Hours' }
        ]
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex h-full min-h-[300px]">
                {/* Left Line & Main Relation */}
                <div className="w-20 shrink-0 flex flex-col items-center mr-6 relative">
                    <div className="text-xs text-slate-500 font-medium mb-2">{t('dolphinScheduler.addDependency')}</div>
                    
                    {dependence.dependTaskList?.length > 0 && (
                        <div className="flex flex-col items-center flex-1 w-full relative">
                            {/* main line */}
                            <div className="absolute top-0 bottom-0 w-0 border-l-[3px] border-blue-400"></div>
                            
                            {dependence.dependTaskList.length > 1 && !readOnly && (
                                <button 
                                    onClick={() => handleUpdate({ ...dependence, relation: dependence.relation === 'AND' ? 'OR' : 'AND' })}
                                    className="z-10 bg-blue-500 text-white text-[10px] w-8 h-4 mt-16 rounded-sm shadow-sm hover:bg-blue-600 transition-colors"
                                >
                                    {dependence.relation}
                                </button>
                            )}

                            <button 
                                onClick={addDependTaskGroup}
                                disabled={readOnly}
                                className="z-10 mt-auto mb-4 bg-blue-500 text-white rounded-full p-1 shadow hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    )}
                    {(!dependence.dependTaskList || dependence.dependTaskList.length === 0) && !readOnly && (
                        <button 
                            onClick={addDependTaskGroup}
                            className="z-10 bg-blue-500 text-white rounded-full p-1 shadow hover:bg-blue-600 transition-colors mt-4"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {/* Right Form List */}
                <div className="flex-1 min-w-0 space-y-4 overflow-y-auto max-h-[500px] pr-2">
                    {dependence.dependTaskList?.map((grp: any, grpIndex: number) => (
                        <div key={grpIndex} className="relative p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                            {/* Inner Left Line */}
                            <div className="absolute left-6 top-16 bottom-12 w-0 border-l-2 border-blue-300"></div>

                            {/* Avoid overlap with group delete button */}
                            <div className="pt-8">
                                {grp.dependItemList?.map((item: any, itemIndex: number) => (
                                    <DependItemForm 
                                        key={itemIndex}
                                        item={item}
                                        projects={projects}
                                        projectConfig={projectConfig}
                                        onChange={(field, val) => updateDependItem(grpIndex, itemIndex, field, val)}
                                        onDelete={() => removeDependItem(grpIndex, itemIndex)}
                                        readOnly={readOnly}
                                        cycleOptions={cycleOptions}
                                    />
                                ))}
                            </div>

                            {/* inner relation btn */}
                            {grp.dependItemList?.length > 1 && !readOnly && (
                                <div className="absolute left-[13px] top-[40%]">
                                    <button 
                                        onClick={() => {
                                            const newList = [...dependence.dependTaskList];
                                            newList[grpIndex].relation = grp.relation === 'AND' ? 'OR' : 'AND';
                                            handleUpdate({ ...dependence, dependTaskList: newList });
                                        }}
                                        className="bg-blue-400 text-white text-[10px] px-1 py-0.5 rounded shadow-sm hover:bg-blue-500 transition-colors"
                                    >
                                        {grp.relation || 'AND'}
                                    </button>
                                </div>
                            )}

                            {/* Inner Add btn */}
                            {!readOnly && (
                                <div className="mt-3 ml-2 relative z-10">
                                    <button 
                                        onClick={() => addDependItem(grpIndex)}
                                        title={t('dolphinScheduler.addItem')}
                                        className="bg-blue-400 text-white rounded-full p-1 shadow hover:bg-blue-500 transition-colors"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Group Delete btn */}
                            {!readOnly && (
                                <button 
                                    onClick={() => removeDependTaskGroup(grpIndex)}
                                    title={t('common.delete')}
                                    className="absolute top-3 right-3 bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 rounded-md transition-colors z-20"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Sub-component for individual item
const DependItemForm = ({ item, projects, projectConfig, onChange, onDelete, readOnly, cycleOptions }: any) => {
    const { t } = useTranslation();
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const isDependWorkflow = item.depTaskCode === 'ALL';

    // Fetch Workflows
    useEffect(() => {
        if (!item.projectCode || !projectConfig?.baseUrl) {
            setWorkflows([]);
            return;
        }
        const apiPath = getWorkflowApiPath(projectConfig?.apiVersion);
        const url = `${projectConfig.baseUrl}/projects/${item.projectCode}/${apiPath}?pageSize=100&pageNo=1`;
        console.log('[DependentNode] Fetching workflows:', url);
        httpFetch(url, { headers: { 'token': projectConfig.token } })
            .then(res => res.json())
            .then(data => {
                console.log('[DependentNode] Workflows response:', data);
                if (data.code === 0) setWorkflows(data.data?.totalList || []);
            })
            .catch((err) => { console.error('[DependentNode] Workflow fetch error:', err); });
    }, [item.projectCode, projectConfig?.baseUrl, projectConfig?.token, projectConfig?.apiVersion]);

    // Fetch Tasks
    useEffect(() => {
        if (!item.definitionCode || !projectConfig?.baseUrl || isDependWorkflow) {
            setTasks([]);
            return;
        }
        const apiPath = getWorkflowApiPath(projectConfig?.apiVersion);
        const url = `${projectConfig.baseUrl}/projects/${item.projectCode}/${apiPath}/${item.definitionCode}`;
        console.log('[DependentNode] Fetching tasks:', url);
        httpFetch(url, { headers: { 'token': projectConfig.token } })
            .then(res => res.json())
            .then(data => {
                console.log('[DependentNode] Tasks response:', data);
                if (data.code === 0 && data.data) {
                    const wfData = data.data.processDefinition || data.data.workflowDefinition || data.data;
                    const taskList = data.data.taskDefinitionList
                                  || data.data.taskDefinitions
                                  || wfData?.taskDefinitionList
                                  || [];
                    console.log('[DependentNode] Task list:', taskList);
                    setTasks(taskList);
                }
            })
            .catch((err) => { console.error('[DependentNode] Task fetch error:', err); });
    }, [item.definitionCode, item.projectCode, isDependWorkflow, projectConfig?.baseUrl, projectConfig?.token, projectConfig?.apiVersion]);

    return (
        <div className="ml-8 mb-4 border border-slate-200 dark:border-slate-700 rounded-md p-3 pb-4 relative bg-white dark:bg-slate-950">
            <div className="flex flex-col space-y-4">
                {/* Dependent Type */}
                <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{t('dolphinScheduler.dependentType')} <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select
                            disabled={readOnly}
                            value={isDependWorkflow ? 'workflow' : 'task'}
                            onChange={(e) => {
                                if (e.target.value === 'workflow') onChange('depTaskCode', 'ALL');
                                else onChange('depTaskCode', '');
                            }}
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                        >
                            <option value="workflow">{t('dolphinScheduler.dependentOnWorkflow')}</option>
                            <option value="task">{t('dolphinScheduler.dependentOnTask')}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                
                {/* Project Name */}
                <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{t('dolphinScheduler.projectName')} <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select
                            disabled={readOnly}
                            value={item.projectCode || ''}
                            onChange={(e) => onChange('projectCode', e.target.value ? Number(e.target.value) : '')}
                            className={`w-full text-sm border bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none ${!item.projectCode ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`}
                        >
                            <option value="">{t('dolphinScheduler.pleaseSelectProject')}</option>
                            {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Workflow Name */}
                <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{t('dolphinScheduler.workflowNameReq')} <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select
                            disabled={readOnly || !item.projectCode}
                            value={item.definitionCode || ''}
                            onChange={(e) => onChange('definitionCode', e.target.value ? Number(e.target.value) : '')}
                            className={`w-full text-sm border bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none ${!item.definitionCode ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'} ${(!item.projectCode) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <option value="">{t('dolphinScheduler.pleaseSelectWorkflow')}</option>
                            {workflows.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Task Name (Conditional) */}
                {!isDependWorkflow && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{t('dolphinScheduler.taskNameReq')} <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select
                                disabled={readOnly || !item.definitionCode}
                                value={item.depTaskCode || ''}
                                onChange={(e) => onChange('depTaskCode', e.target.value ? Number(e.target.value) : '')}
                                className={`w-full text-sm border bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none ${!item.depTaskCode ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'} ${(!item.definitionCode) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <option value="">{t('dolphinScheduler.pleaseSelectTask')}</option>
                                {tasks.map((tInfo: any) => <option key={tInfo.code} value={tInfo.code}>{tInfo.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Time Cycle */}
                <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">{t('dolphinScheduler.timeCycle')} <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                        <div className="relative w-1/3 min-w-[100px]">
                            <select
                                disabled={readOnly}
                                value={item.cycle || 'day'}
                                onChange={(e) => {
                                    const c = e.target.value;
                                    onChange('cycle', c);
                                    onChange('dateValue', cycleOptions[c as keyof typeof cycleOptions]?.[0]?.value || '');
                                }}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                            >
                                <option value="month">{t('dolphinScheduler.month')}</option>
                                <option value="week">{t('dolphinScheduler.week')}</option>
                                <option value="day">{t('dolphinScheduler.day')}</option>
                                <option value="hour">{t('dolphinScheduler.hour')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        
                        <div className="relative flex-1">
                            <select
                                disabled={readOnly}
                                value={item.dateValue || ''}
                                onChange={(e) => onChange('dateValue', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                            >
                                {cycleOptions[item.cycle as keyof typeof cycleOptions]?.map((opt: any) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {!readOnly && (
                <button 
                    onClick={onDelete}
                    title={t('common.delete')}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-md transition-colors z-10"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
};
