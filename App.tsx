import React, { useState, useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { Login } from './features/Login';
import { UserProfile } from './features/UserProfile';
import { DbViewer } from './features/DbViewer';
import { ExcelToSql } from './features/ExcelToSql';
import { SeatunnelGen } from './features/SeatunnelGen';
import { PdfTools } from './features/PdfTools';
import { TimeUtility } from './features/TimeUtility';
import { SystemMonitor } from './features/SystemMonitor';
import { Settings } from './features/Settings';
import { FieldMappingTool } from './features/FieldMappingTool';
import { InterviewQuestions } from './features/InterviewQuestions';
import { Notes } from './features/Notes';
import { DataSourceManager } from './features/DataSourceManager';
import { DataCompareTool } from './features/DataCompareTool';
import { Language, Theme, User, DbConnection } from './types';
import { NAV_ITEMS } from './constants';

/* --- Home Dashboard --- */
const Dashboard: React.FC<{ onNavigate: (id: string) => void, lang: Language }> = ({ onNavigate, lang }) => {

  const getDescription = (id: string, lang: Language) => {
    const descriptions: Record<string, Record<Language, string>> = {
      'data-source-manager': {
        en: 'Manage all your database connections in one place.',
        zh: '统一管理您的所有数据库连接'
      },
      'db-viewer': {
        en: 'View database table structures and generate create table statements.',
        zh: '查看数据库表结构并生成建表语句'
      },
      'data-compare': {
        en: 'Compare data between two tables with custom keys.',
        zh: '对比两张表的数据差异，支持自定义主键和过滤条件'
      },
      'excel-sql': {
        en: 'Convert Excel spreadsheets to MySQL/Doris DDL statements.',
        zh: '将Excel表格转换为Doris和MySQL建表语句'
      },
      'seatunnel': {
        en: 'Automatically generate data synchronization task scripts.',
        zh: '自动生成数据同步任务脚本'
      },
      'field-mapping': {
        en: 'Map source and target fields for data synchronization.',
        zh: '配置数据同步的源表和目标表字段映射关系'
      },
      'interview-questions': {
        en: 'Collection of Big Data interview questions (Flink, Spark, etc.).',
        zh: '大数据面试问题锦集 (Flink, Spark, Doris 等)'
      },
      'notes': {
        en: 'Developer notes with code block support.',
        zh: '支持代码格式的开发者笔记'
      },
      'pdf-tools': {
        en: 'Merge, split, and compress PDF files.',
        zh: '提供PDF合并、分割、压缩等功能'
      },
      'time-tools': {
        en: 'Timestamp conversion, clock, and timers.',
        zh: '时间戳转换、时钟和计时器'
      },
      'monitor': {
        en: 'Real-time system resource monitoring.',
        zh: '系统资源实时监控'
      },
      'profile': {
        en: 'Manage your personal account information.',
        zh: '管理个人账户信息'
      }
    };
    return descriptions[id]?.[lang] || '';
  };

  const tools = NAV_ITEMS.filter(item => item.id !== 'dashboard');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 py-8">
      <div className="space-y-4 text-center max-w-3xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          {lang === 'zh' ? '欢迎使用' : 'Welcome to'} <span className="text-blue-600">DevToolbox</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          {lang === 'zh'
            ? '一站式开发者工具箱，集成数据库管理、PDF处理、系统监控等核心功能。'
            : 'One-stop developer toolkit integrating database management, PDF processing, and system monitoring.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl px-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Shine effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>

            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${tool.category === 'db' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30' :
                tool.category === 'office' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 group-hover:bg-red-200 dark:group-hover:bg-red-500/30' :
                  tool.category === 'knowledge' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-500/30' :
                    tool.category === 'user' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30' :
                      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30'
                }`}>
                <tool.icon size={28} className="group-hover:scale-110 transition-transform duration-300" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {tool.label[lang]}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300">
                {getDescription(tool.id, lang)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  // Tabs State with persistence
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return saved || 'dashboard';
  });
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('openTabs');
    return saved ? JSON.parse(saved) : ['dashboard'];
  });
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('visitedTabs');
    return saved ? JSON.parse(saved) : ['dashboard'];
  });

  // App Settings with persistence
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'zh';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const [user, setUser] = useState<User | null>(null);

  // Centralized Data Source State
  const [connections, setConnections] = useState<DbConnection[]>(() => {
    const saved = localStorage.getItem('db_connections');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist activeTab
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist openTabs
  useEffect(() => {
    localStorage.setItem('openTabs', JSON.stringify(openTabs));
  }, [openTabs]);

  // Persist visitedTabs
  useEffect(() => {
    localStorage.setItem('visitedTabs', JSON.stringify(visitedTabs));
  }, [visitedTabs]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('language', lang);
  }, [lang]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist connections
  useEffect(() => {
    localStorage.setItem('db_connections', JSON.stringify(connections));
  }, [connections]);

  const handleAddConnection = (conn: Omit<DbConnection, 'id'>) => {
    setConnections(prev => [...prev, { ...conn, id: Date.now().toString() }]);
  };
  const handleUpdateConnection = (conn: DbConnection) => {
    setConnections(prev => prev.map(c => c.id === conn.id ? conn : c));
  };
  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('toolbox_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('toolbox_user');
      }
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const handleLogin = (username: string) => {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const newUser: User = {
      username,
      nickname: username,
      email: `${username}@devtoolbox.com`,
      role: 'admin',
      avatar: avatarUrl,
      bio: 'Full Stack Developer using DevToolbox.'
    };
    setUser(newUser);
    localStorage.setItem('toolbox_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('toolbox_user');
    setOpenTabs(['dashboard']);
    setVisitedTabs(['dashboard']);
    setActiveTab('dashboard');
  };

  const handleUserUpdate = (updated: User) => {
    setUser(updated);
    localStorage.setItem('toolbox_user', JSON.stringify(updated));
  };

  const handleNavigate = (id: string) => {
    if (!openTabs.includes(id)) setOpenTabs([...openTabs, id]);
    if (!visitedTabs.includes(id)) setVisitedTabs([...visitedTabs, id]);
    setActiveTab(id);
  };

  const handleCloseTab = (id: string) => {
    if (id === 'dashboard') return;
    const newTabs = openTabs.filter(t => t !== id);
    setOpenTabs(newTabs);

    if (activeTab === id) {
      const index = openTabs.indexOf(id);
      let nextId = 'dashboard';
      if (newTabs.length > 0) {
        const nextIndex = Math.max(0, index - 1);
        nextId = newTabs[nextIndex] || 'dashboard';
      }
      setActiveTab(nextId);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} lang={lang} />;
  }

  const renderView = (id: string) => {
    switch (id) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} lang={lang} />;
      case 'data-source-manager': return <DataSourceManager lang={lang} connections={connections} onAdd={handleAddConnection} onUpdate={handleUpdateConnection} onDelete={handleDeleteConnection} />;
      case 'db-viewer': return <DbViewer lang={lang} connections={connections} onNavigate={handleNavigate} />;
      case 'data-compare': return <DataCompareTool lang={lang} connections={connections} />; // New Route
      case 'excel-sql': return <ExcelToSql lang={lang} />;
      case 'seatunnel': return <SeatunnelGen lang={lang} connections={connections} onNavigate={handleNavigate} />;
      case 'field-mapping': return <FieldMappingTool lang={lang} connections={connections} onNavigate={handleNavigate} />;
      case 'interview-questions': return <InterviewQuestions lang={lang} />;
      case 'notes': return <Notes lang={lang} />;
      case 'pdf-tools': return <PdfTools lang={lang} />;
      case 'time-tools': return <TimeUtility lang={lang} />;
      case 'monitor': return <SystemMonitor lang={lang} />;
      case 'profile': return <UserProfile user={user} onUpdate={handleUserUpdate} lang={lang} />;
      case 'settings': return <Settings lang={lang} onLangChange={setLang} theme={theme} onThemeChange={setTheme} />;
      default: return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleNavigate}
      openTabs={openTabs}
      onCloseTab={handleCloseTab}
      lang={lang}
      onLangChange={setLang}
      theme={theme}
      onThemeChange={setTheme}
      user={user}
      onLogout={handleLogout}
    >
      {visitedTabs.map(tabId => (
        <div
          key={tabId}
          className={activeTab === tabId ? 'h-full flex flex-col' : 'hidden'}
        >
          {renderView(tabId)}
        </div>
      ))}
    </Layout>
  );
}