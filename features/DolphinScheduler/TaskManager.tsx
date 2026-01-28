import React from 'react';
import { ListTodo, ArrowLeft } from 'lucide-react';
import { Language, DolphinSchedulerConfig } from '../../types';
import { getTexts } from '../../locales';

interface TaskManagerProps {
    lang: Language;
    currentProject: DolphinSchedulerConfig | null;
    onNavigate: (id: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
    lang,
    currentProject,
    onNavigate
}) => {
    const t = getTexts(lang);

    if (!currentProject) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ListTodo size={64} className="mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">
                    {lang === 'zh' ? '未选择项目' : 'No Project Selected'}
                </h3>
                <p className="text-sm mb-6">
                    {lang === 'zh' ? '请先从项目管理页面选择一个项目' : 'Please select a project from the Project Manager first.'}
                </p>
                <button
                    onClick={() => onNavigate('dolphin-project')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
                >
                    {lang === 'zh' ? '前往项目管理' : 'Go to Project Manager'}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
                <button
                    onClick={() => onNavigate('dolphin-project')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                    title={lang === 'zh' ? '返回项目列表' : 'Back to Projects'}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <ListTodo className="mr-3 text-blue-600" />
                    {lang === 'zh' ? '任务管理' : 'Task Manager'}
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-base font-normal text-slate-600 dark:text-slate-300">
                        {currentProject.name}
                    </span>
                </h2>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <ListTodo size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{lang === 'zh' ? '任务列表功能开发中...' : 'Task list feature under construction...'}</p>
                    <p className="text-xs mt-2 font-mono opacity-70">
                        Project: {currentProject.projectName} ({currentProject.projectCode})
                    </p>
                    <p className="text-xs font-mono opacity-70">
                        API: {currentProject.baseUrl}
                    </p>
                </div>
            </div>
        </div>
    );
};
