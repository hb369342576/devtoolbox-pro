import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Database, Workflow, Users, Shield, BookOpen, Sparkles, ChevronLeft, Server,
  AlertCircle, RefreshCw, X, Globe
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { DataSourceManage } from './components/DataSourceManage';
import { ApiManage } from './components/ApiManage';
import { UserManage } from './components/UserManage';
import { PermissionManage } from './components/PermissionManage';
import { ApiDocAndTest } from './components/ApiDocAndTest';
import { ConnectionManager } from './components/ConnectionManager';
import { DataServiceConnection } from '../../types';
import { setupDataServiceApi, dataServiceApi } from './api';
import { PublishedManage } from './components/PublishedManage';

export const DataService: React.FC = () => {
  const { t } = useTranslation();
  const [activeConnection, setActiveConnection] = useState<DataServiceConnection | null>(null);
  const [activeTab, setActiveTab] = useState<'dataSource' | 'api' | 'user' | 'permission' | 'doc' | 'published'>('api');
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const checkConnection = async () => {
    if (!activeConnection) return;
    setStatus('connecting');
    const isOk = await dataServiceApi.ping();
    if (isOk) {
        setStatus('connected');
        setShowErrorModal(false);
    } else {
        setStatus('failed');
        setShowErrorModal(true);
    }
  };

  const tabs = [
    { id: 'dataSource', label: t('dataService.dataSourceManage'), icon: Database },
    { id: 'api', label: t('dataService.apiManage'), icon: Workflow },
    { id: 'published', label: t('dataService.api.publishedList'), icon: Globe },
    { id: 'user', label: t('dataService.userManage'), icon: Users },
    { id: 'permission', label: t('dataService.permissionManage'), icon: Shield },
    { id: 'doc', label: t('dataService.apiDocAndTest'), icon: BookOpen },
  ] as const;

  useEffect(() => {
     if (activeConnection) {
         setupDataServiceApi(activeConnection.baseUrl, activeConnection.token);
         checkConnection();
     }
  }, [activeConnection]);

  if (!activeConnection) {
      return <ConnectionManager onSelect={setActiveConnection} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 overflow-hidden font-sans">
      
      {/* 顶部导航层 */}
      <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-20 shadow-sm">
        
        {/* 第一层：返回区与引擎状态 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
           <div className="flex items-center space-x-4">
              <button 
                onClick={() => setActiveConnection(null)} 
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-all box-border group"
                title="返回服务列表"
              >
                  <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
                      <Sparkles size={20} />
                  </div>
                  <div className="flex flex-col">
                      <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                          {activeConnection.name}
                      </h1>
                      <div className="flex items-center text-[11px] text-slate-400 font-mono mt-1 font-bold">
                          <Server size={12} className="mr-1.5" /> {activeConnection.baseUrl}
                      </div>
                  </div>
              </div>
           </div>
           
           <div className="flex items-center">
               {status === 'connecting' && (
                  <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 rounded-full px-3 py-1.5 flex items-center shadow-sm">
                      <RefreshCw size={12} className="animate-spin mr-2 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 tracking-wider uppercase">
                        {t('dataService.connectionStatus.connecting')}
                      </span>
                  </div>
               )}
               {status === 'connected' && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-3 py-1.5 flex items-center shadow-sm animate-in fade-in zoom-in-95">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                        {t('dataService.connectionStatus.connected')}
                      </span>
                  </div>
               )}
               {status === 'failed' && (
                  <button 
                    onClick={() => setShowErrorModal(true)}
                    className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800/60 rounded-full px-3 py-1.5 flex items-center shadow-sm hover:bg-red-100 dark:hover:bg-red-800/60 transition-colors group animate-in animate-shake"
                  >
                      <AlertCircle size={14} className="mr-2 text-red-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 tracking-wider">
                        {t('dataService.connectionStatus.failed')}
                      </span>
                  </button>
               )}
           </div>
        </div>

        {/* 第二层：类似工作流风格的顶部横排菜单 */}
        <div className="px-6 flex space-x-2 pt-2 pb-0 overflow-x-auto custom-scrollbar relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-3 transition-all duration-200 relative group whitespace-nowrap ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-t-xl' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-xl'
                  }`}
                >
                  <tab.icon size={16} className={`mr-2.5 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  <span className="text-[13px] font-bold tracking-wide">{tab.label}</span>
                  
                  {/* 下方蓝色沉淀指示条 */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-md shadow-[0_-2px_8px_rgba(59,130,246,0.6)]"></div>
                  )}
                </button>
              )
            })}
        </div>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 w-full relative overflow-y-auto bg-slate-50/40 dark:bg-slate-900/10 custom-scrollbar">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 w-full h-full">
          {status === 'connected' ? (
            <>
              {activeTab === 'dataSource' && <DataSourceManage />}
              {activeTab === 'api' && <ApiManage onNavigateToDoc={(id) => { setSelectedApiId(id); setActiveTab('doc'); }} />}
              {activeTab === 'published' && <PublishedManage onNavigateToDoc={(id) => { setSelectedApiId(id); setActiveTab('doc'); }} />}
              {activeTab === 'user' && <UserManage onNavigateToDoc={(id) => { setSelectedApiId(id); setActiveTab('doc'); }} onNavigateToApi={() => setActiveTab('api')} />}
              {activeTab === 'permission' && <PermissionManage />}
              {activeTab === 'doc' && <ApiDocAndTest preSelectedId={selectedApiId} onIdChange={setSelectedApiId} />}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 sm:p-20">
                <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] flex flex-col items-center max-w-sm text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-6">
                        <Database size={32} className="opacity-20 text-slate-500" />
                    </div>
                    <p className="text-sm font-bold tracking-tight text-slate-400 dark:text-slate-500 italic">
                        {status === 'failed' 
                          ? t('dataService.connectionStatus.emptyState') 
                          : t('dataService.connectionStatus.initializing')}
                    </p>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 relative">
                <div className="px-8 pt-10 pb-4 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-6 animate-bounce-slow">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
                        {t('dataService.connectionStatus.errorTitle')}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm px-4">
                        {t('dataService.connectionStatus.errorDesc', { url: activeConnection.baseUrl })}
                    </p>
                </div>
                
                <div className="p-8 pt-4 flex flex-col space-y-3">
                    <button 
                        onClick={checkConnection}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center space-x-2 group"
                    >
                        <RefreshCw size={18} className={`group-hover:rotate-180 transition-transform duration-500 ${status === 'connecting' ? 'animate-spin' : ''}`} />
                        <span>{t('dataService.connectionStatus.retry')}</span>
                    </button>
                    <button 
                        onClick={() => { setActiveConnection(null); setShowErrorModal(false); }}
                        className="w-full py-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center space-x-2"
                    >
                        <ChevronLeft size={18} />
                        <span>{t('dataService.connectionStatus.back')}</span>
                    </button>
                </div>

                <button 
                  onClick={() => setShowErrorModal(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                >
                    <X size={20} />
                </button>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
