import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Database, Workflow, Users, Shield, BookOpen, Sparkles
} from 'lucide-react';
import { DataSourceManage } from './components/DataSourceManage';
import { ApiManage } from './components/ApiManage';
import { UserManage } from './components/UserManage';
import { PermissionManage } from './components/PermissionManage';
import { ApiDocAndTest } from './components/ApiDocAndTest';

export const DataService: React.FC = () => {
  const { t } = useTranslation(['common']);
  const [activeTab, setActiveTab] = useState<'dataSource' | 'api' | 'user' | 'permission' | 'doc'>('api');

  const tabs = [
    { id: 'dataSource', label: t('common:dataService.dataSource'), icon: Database },
    { id: 'api', label: t('common:dataService.apiManage'), icon: Workflow },
    { id: 'user', label: t('common:dataService.userManage'), icon: Users },
    { id: 'permission', label: t('common:dataService.permissionManage'), icon: Shield },
    { id: 'doc', label: t('common:dataService.docAndTest'), icon: BookOpen },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 overflow-hidden font-sans">
      
      {/* Premium Top Navigation */}
      <div className="flex-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 relative z-20 shadow-sm">
        
        {/* Modern Header decoration */}
        <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent dark:from-blue-500/10 dark:via-purple-500/5 z-0 pointer-events-none"></div>
        
        <div className="px-6 py-4 relative z-10 flex items-center justify-between gap-6">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white relative">
              <Sparkles size={20} />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20"></div>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight leading-none">
                {t('common:dataService.title')}
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1 leading-none">Data as a Service</div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center space-x-1 md:space-x-2 overflow-x-auto hide-scrollbar masks-edges">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 relative group whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/10' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon size={16} className={`mr-2 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  <span className="text-[13px] font-bold tracking-wide">{tab.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-t-full shadow-[0_-2px_8px_rgba(59,130,246,0.8)]"></div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center flex-shrink-0">
             <div className="bg-slate-100/80 dark:bg-slate-800/80 rounded-full px-3 py-1.5 flex items-center space-x-2 border border-slate-200/50 dark:border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Live</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 w-full relative overflow-y-auto overflow-x-hidden bg-slate-50/40 dark:bg-slate-900/10 custom-scrollbar">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 w-full min-h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'dataSource' && <DataSourceManage />}
          {activeTab === 'api' && <ApiManage />}
          {activeTab === 'user' && <UserManage />}
          {activeTab === 'permission' && <PermissionManage />}
          {activeTab === 'doc' && <ApiDocAndTest />}
        </div>
      </div>
    </div>
  );
};
