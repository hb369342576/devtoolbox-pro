import React from 'react';
import { DbConnection } from '../../../types';
import { Database, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DataSourceSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  connections: DbConnection[];
  onSelect: (conn: DbConnection) => void;
  onNavigate: (id: string) => void;
}> = ({ isOpen, onClose, connections, onSelect, onNavigate}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white">{t('common.selectDataSource')}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center mb-3">
                <Database className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm mb-4">{t('common.noDataSourcesFound')}</p>
              <button
                onClick={() => { onClose(); onNavigate('data-source-manager'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
              >
                {t('common.addDataSource')}
              </button>
            </div>
          ) : (
            connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => { onSelect(conn); onClose(); }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400`}>
                      <Database size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{conn.name}</p>
                      <p className="text-xs text-slate-500">{conn.type} &bull; {conn.host}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
