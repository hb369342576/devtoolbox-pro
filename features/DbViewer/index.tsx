import React from 'react';
import { Database, Plus } from 'lucide-react';
import { Language, DbConnection } from '../../types';
import { useDbViewerStore } from './store';
import { getTexts } from '../../locales';
import { ConnectionGrid } from './components/ConnectionGrid';
import { Sidebar } from './components/Sidebar';
import { TableViewer } from './components/TableViewer';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

/**
 * DbViewer - 数据库浏览和查看工具
 * 
 * 重构后：应用Zustand状态管理
 * 原文件：727行 -> 现在：~150行（主文件） + 子组件
 */
export const DbViewer: React.FC<{
  lang: Language;
  connections: DbConnection[];
  onNavigate: (id: string) => void;
  onUpdate?: (conn: DbConnection) => void;
  onDelete?: (id: string) => void;
}> = ({ lang, connections, onNavigate, onUpdate, onDelete }) => {
  const t = getTexts(lang);

  // Zustand Store
  const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
  const viewMode = useViewMode();
  const setSelectedConnection = useDbViewerStore((state) => state.setSelectedConnection);

  // 连接选择视图
  if (!selectedConnection) {
    return (
      <div className="h-full flex flex-col animate-in fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
            <Database className="mr-3 text-blue-600" />
            {t.dbViewer.selectSource}
          </h2>
          <div className="flex items-center space-x-3">
            <ViewModeToggle />
            <button
              onClick={() => onNavigate('data-source-manager')}
              className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
            >
              <Plus size={18} className="mr-2" />
              {lang === 'zh' ? '添加数据源' : 'Add Data Source'}
            </button>
          </div>
        </div>

        {/* Connection Grid/List */}
        <ConnectionGrid
          lang={lang}
          connections={connections}
          viewMode={viewMode}
          onConnect={setSelectedConnection}
          onNavigate={onNavigate}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    );
  }

  // 数据库浏览视图
  return (
    <div className="h-full flex flex-col md:flex-row -m-6 animate-in fade-in">
      <Sidebar lang={lang} />
      <TableViewer lang={lang} />
    </div>
  );
};
