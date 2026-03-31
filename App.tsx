import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Layout } from './features/common/Layout';
import { ToastProvider } from './features/common/Toast';
import { UpdateChecker } from './features/common/UpdateChecker';
import { Tooltip } from './features/common/Tooltip';
import { Login } from './features/Login';
import { UserProfile } from './features/UserProfile';
import { DbViewer } from './features/DbViewer';
import { ExcelImport } from './features/ExcelImport';
import { ExcelToSql } from './features/ExcelToSql';
import { SeatunnelGen } from './features/SeatunnelGen';
import { PdfTools } from './features/PdfTools';
import { TimeUtility } from './features/TimeUtility';
import { SystemMonitor } from './features/SystemMonitor';
import { Settings } from './features/Settings';
import { FieldMappingTool } from './features/FieldMappingTool';
import { DataService } from './features/DataService';

import { DataSourceManager } from './features/DataSourceManager';
import { DataCompareTool } from './features/DataCompareTool';
import { ProjectManager } from './features/DolphinScheduler/ProjectManager';
import { TaskManager } from './features/DolphinScheduler/TaskManager';
import { DSManager } from './features/DolphinScheduler/DSManager';
import { SeaTunnelManager } from './features/SeaTunnelManager';
import { Language, Theme, User, DbConnection, DolphinSchedulerConfig } from './types';
import { NAV_ITEMS } from './constants';
import i18n from './i18n';
import { useTranslation } from "react-i18next";

/* --- Home Dashboard --- */
const Dashboard: React.FC<{ onNavigate: (id: string) => void, navItems: any[] }> = ({ onNavigate, navItems }) => {
    const { t, i18n } = useTranslation();
    const [appName, setAppName] = useState(() => localStorage.getItem('app_custom_name') || 'DevToolbox');

    useEffect(() => {
        const handleNameChange = (e: any) => {
            setAppName(e.detail);
        };
        window.addEventListener('app_custom_name_changed', handleNameChange);
        return () => window.removeEventListener('app_custom_name_changed', handleNameChange);
    }, []);

  // Get all leaf nodes from navItems recursively, excluding dashboard
  const getTools = (items: any[]): any[] => {
    let tools: any[] = [];
    items.forEach(item => {
      if (item.id === 'dashboard') return;
      if (item.children) {
        tools = [...tools, ...getTools(item.children)];
      } else if (item.visible) {
        tools.push(item);
      }
    });
    return tools;
  };

  const tools = getTools(navItems);

  return (
    <div className="flex flex-col items-center space-y-12 pt-8 pb-8">
      <div className="space-y-4 text-center max-w-3xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('common.welcome')} <span className="text-blue-600">{appName}</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400">
          {t('common.appDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl px-4">
        {tools.map((tool) => (
          <Tooltip key={tool.id} content={tool.tooltip ? t(tool.tooltip) : ''} position="top">
            <button
              onClick={() => onNavigate(tool.id)}
              className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden w-full h-[220px]"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${tool.category === 'db' ? 'bg-gradient-to-br from-cyan-50 to-sky-100 dark:from-cyan-500/10 dark:to-sky-500/20 text-cyan-600 dark:text-cyan-400 group-hover:from-cyan-100 group-hover:to-sky-200 dark:group-hover:from-cyan-500/20 dark:group-hover:to-sky-500/30' :
                  tool.category === 'office' ? 'bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-500/10 dark:to-pink-500/20 text-rose-600 dark:text-rose-400 group-hover:from-rose-100 group-hover:to-pink-200 dark:group-hover:from-rose-500/20 dark:group-hover:to-pink-500/30' :
                    tool.category === 'knowledge' ? 'bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-500/10 dark:to-orange-500/20 text-amber-600 dark:text-amber-400 group-hover:from-amber-100 group-hover:to-orange-200 dark:group-hover:from-amber-500/20 dark:group-hover:to-orange-500/30' :
                      tool.category === 'user' ? 'bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-500/10 dark:to-purple-500/20 text-violet-600 dark:text-violet-400 group-hover:from-violet-100 group-hover:to-purple-200 dark:group-hover:from-violet-500/20 dark:group-hover:to-purple-500/30' :
                        'bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-500/10 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 group-hover:from-emerald-100 group-hover:to-teal-200 dark:group-hover:from-emerald-500/20 dark:group-hover:to-teal-500/30'
                  }`}>
                  <tool.icon size={28} className="group-hover:scale-110 transition-transform duration-300" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-1">
                  {t(tool.label)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300 line-clamp-2 min-h-[44px]">
                  {tool.tooltip ? t(tool.tooltip) : ''}
                </p>
              </div>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default function App() {
    const { i18n } = useTranslation();
  // Tabs State with persistence
  const [activeTab, setActiveTab] = useState(() => {
    const savedMenu = localStorage.getItem('menu_config');
    const menuCfg: Record<string, boolean> = savedMenu ? JSON.parse(savedMenu) : {};
    const isAllowed = (id: string): boolean => {
      if (id === 'dashboard' || id === 'settings') return true;
      if (menuCfg[id]) return true;
      // Check if it's a child of an enabled parent
      for (const item of NAV_ITEMS) {
        if (item.children?.some((c) => c.id === id)) {
          return !!menuCfg[item.id] && !!menuCfg[id];
        }
      }
      return false;
    };
    const saved = localStorage.getItem('activeTab');
    const id = saved || 'dashboard';
    return isAllowed(id) ? id : 'dashboard';
  });
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const savedMenu = localStorage.getItem('menu_config');
    const menuCfg: Record<string, boolean> = savedMenu ? JSON.parse(savedMenu) : {};
    const savedTabs = localStorage.getItem('openTabs');
    const tabs: string[] = savedTabs ? JSON.parse(savedTabs) : ['dashboard'];
    return tabs.filter(id => {
      if (id === 'dashboard' || id === 'settings') return true;
      return menuCfg[id] === true;
    });
  });
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    const savedMenu = localStorage.getItem('menu_config');
    const menuCfg: Record<string, boolean> = savedMenu ? JSON.parse(savedMenu) : {};
    const savedTabs = localStorage.getItem('visitedTabs');
    const tabs: string[] = savedTabs ? JSON.parse(savedTabs) : ['dashboard'];
    return tabs.filter(id => {
      if (id === 'dashboard' || id === 'settings') return true;
      return menuCfg[id] === true;
    });
  });

  // App Settings with persistence
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'zh';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  
  // 主题切换函数：同时更新状态、localStorage、DOM 和窗口标题栏
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // 同步更新 Tauri 窗口标题栏主题
    invoke('set_window_theme', { theme: newTheme }).catch((e: any) =>
      console.warn('Failed to set window theme:', e)
    );
  };
  const [monitorEnabled, setMonitorEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('monitorEnabled');
    return saved !== null ? JSON.parse(saved) : false; // 默认关闭
  });
  const [user, setUser] = useState<User | null>(null);

  // Centralized Data Source State
  const [connections, setConnections] = useState<DbConnection[]>(() => {
    const saved = localStorage.getItem('db_connections');
    return saved ? JSON.parse(saved) : [];
  });

  // Menu Configuration State
  const [menuConfig, setMenuConfig] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('menu_config');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleMenu = (id: string, enabled: boolean) => {
    const navItem = NAV_ITEMS.find(item => item.id === id);

    // Build all changes in a single config object to avoid stale closure issues
    const newConfig = { ...menuConfig, [id]: enabled };

    // If disabling a parent, also disable all its children in one shot
    if (!enabled && navItem?.children) {
      navItem.children.forEach(c => {
        if (c.id !== 'settings') {
          newConfig[c.id] = false;
        }
      });
    }

    setMenuConfig(newConfig);
    localStorage.setItem('menu_config', JSON.stringify(newConfig));

    // Close any related open tabs
    if (!enabled) {
      const idsToClose = new Set<string>([id]);
      if (navItem?.children) {
        navItem.children.forEach(c => idsToClose.add(c.id));
      }
      setOpenTabs(prev => prev.filter(t => !idsToClose.has(t)));
      setVisitedTabs(prev => prev.filter(t => !idsToClose.has(t)));
      setActiveTab(prev => idsToClose.has(prev) ? 'dashboard' : prev);
    }
  };
  // DolphinScheduler State
  const [dolphinConfigs, setDolphinConfigs] = useState<DolphinSchedulerConfig[]>(() => {
    const saved = localStorage.getItem('dolphin_configs');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProject, setCurrentProject] = useState<DolphinSchedulerConfig | null>(null);

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

  // 初始化时同步窗口标题栏主题
  useEffect(() => {
    invoke('set_window_theme', { theme }).catch((e: any) =>
      console.warn('Failed to set initial window theme:', e)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist language
  useEffect(() => {
    localStorage.setItem('language', i18n.language);
  }, [i18n.language]);


  // Persist monitor enabled
  useEffect(() => {
    localStorage.setItem('monitorEnabled', JSON.stringify(monitorEnabled));
  }, [monitorEnabled]);

  // Persist connections
  useEffect(() => {
    localStorage.setItem('db_connections', JSON.stringify(connections));
  }, [connections]);

  // Persist dolphin configs
  useEffect(() => {
    localStorage.setItem('dolphin_configs', JSON.stringify(dolphinConfigs));
  }, [dolphinConfigs]);

  const handleAddConnection = (conn: Omit<DbConnection, 'id'>) => {
    setConnections(prev => [...prev, { ...conn, id: Date.now().toString() }]);
  };
  const handleUpdateConnection = (conn: DbConnection) => {
    setConnections(prev => prev.map(c => c.id === conn.id ? conn : c));
  };
  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  // Dolphin Config Handlers
  const handleAddDolphinConfig = (config: Omit<DolphinSchedulerConfig, 'id'>) => {
    setDolphinConfigs(prev => [...prev, { ...config, id: Date.now().toString() }]);
  };
  const handleUpdateDolphinConfig = (config: DolphinSchedulerConfig) => {
    setDolphinConfigs(prev => prev.map(c => c.id === config.id ? config : c));
  };
  const handleDeleteDolphinConfig = (id: string) => {
    setDolphinConfigs(prev => prev.filter(c => c.id !== id));
    if (currentProject?.id === id) setCurrentProject(null);
  };
  const handleSelectProject = (config: DolphinSchedulerConfig) => {
    setCurrentProject(config);
    // 导航到任务管理页面
    if (!openTabs.includes('dolphin-task')) {
      setOpenTabs([...openTabs, 'dolphin-task']);
    }
    setActiveTab('dolphin-task');
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

  // Navigation Logic - 只展开当前激活页面的父菜单
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // 获取当前 activeTab 的父菜单ID
    const saved = localStorage.getItem('activeTab') || 'dashboard';
    const parentOfActive = NAV_ITEMS.find(item => item.children?.some(child => child.id === saved));
    return parentOfActive ? [parentOfActive.id] : [];
  });

  const handleToggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleNavigate = (id: string) => {
    // Check if it's a parent item
    const parentItem = NAV_ITEMS.find(item => item.id === id && item.children && item.children.length > 0);

    if (parentItem && parentItem.children) {
      // It's a parent, redirect to first child
      const firstChild = parentItem.children[0];

      // Expand the parent
      if (!expandedMenus.includes(id)) {
        setExpandedMenus(prev => [...prev, id]);
      }

      // Navigate to child
      handleNavigate(firstChild.id);
      return;
    }

    // Check if it's a child item, ensure parent is expanded
    const parentOfChild = NAV_ITEMS.find(item => item.children?.some(child => child.id === id));
    if (parentOfChild && !expandedMenus.includes(parentOfChild.id)) {
      setExpandedMenus(prev => [...prev, parentOfChild.id]);
    }

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
    return <Login onLogin={handleLogin} />;
  }

  // Visibility Helper
  const isMenuVisible = (item: any): boolean => {
    if (item.id === 'dashboard' || item.id === 'settings') return true;
    // Check local config
    return menuConfig[item.id] === true;
  };

  const renderView = (id: string) => {
    switch (id) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} navItems={filteredNavItems} />;
      case 'data-source-manager': return <DataSourceManager connections={connections} onAdd={handleAddConnection} onUpdate={handleUpdateConnection} onDelete={handleDeleteConnection} />;
      case 'db-viewer': return <DbViewer connections={connections} onNavigate={handleNavigate} />;
      case 'excel-import': return <ExcelImport connections={connections} />; // New Tool
      case 'data-compare': return <DataCompareTool connections={connections} />; // New Route
      case 'excel-sql': return <ExcelToSql />;
      case 'seatunnel': return <SeatunnelGen connections={connections} onNavigate={handleNavigate} />;

      case 'field-mapping': return <FieldMappingTool connections={connections} onNavigate={handleNavigate} />;
      case 'data-service': return <DataService />;

      // DolphinScheduler Routes
      case 'dolphin-project': return <DSManager onNavigate={handleNavigate} />;
      case 'dolphin-task': return <TaskManager currentProject={currentProject} configs={dolphinConfigs} onSelectProject={handleSelectProject} onNavigate={handleNavigate} />;

      // SeaTunnel Routes
      case 'seatunnel-engine': return <SeaTunnelManager activeSubPage="engine" onNavigate={handleNavigate} />;
      case 'seatunnel-job': return <SeaTunnelManager activeSubPage="job" onNavigate={handleNavigate} />;

      case 'pdf-tools': return <PdfTools />;
      case 'time-tools': return <TimeUtility />;
      case 'monitor': return <SystemMonitor enabled={monitorEnabled} />;
      case 'profile': return <UserProfile user={user} onUpdate={handleUserUpdate} />;
      case 'settings': return <Settings onLangChange={(l: Language) => { setLang(l); i18n.changeLanguage(l); }} lang={lang} theme={theme} onThemeChange={setTheme} monitorEnabled={monitorEnabled} onMonitorToggle={setMonitorEnabled} menuConfig={menuConfig} onToggleMenuConfig={toggleMenu} />;
      default: return null;
    }
  };

  // Filter NAV_ITEMS recursively
  const getFilteredNavItems = (items: typeof NAV_ITEMS): any[] => {
    return items.map(item => {
      const visible = isMenuVisible(item);
      if (item.children) {
        const filteredChildren = getFilteredNavItems(item.children);
        // A parent is visible if it's explicitly enabled OR if it has a mandatory child like 'settings'
        // But for simplicity, we respect isMenuVisible(item) for top levels, 
        // and ensure mandatory ones are always visible.
        const hasMandatoryChild = item.children.some(c => c.id === 'settings');
        return {
          ...item,
          visible: visible || hasMandatoryChild,
          children: filteredChildren
        };
      }
      return { ...item, visible };
    }).filter(item => {
        if (item.id === 'dashboard') return true;
        if (item.children && item.children.length > 0) {
            // Parent with visible children
            return item.visible || item.children.some(c => c.visible);
        }
        return item.visible;
    });
  };

  const filteredNavItems = getFilteredNavItems(NAV_ITEMS);

  return (
    <ToastProvider>
      <Layout
        activeTab={activeTab}
        onTabChange={handleNavigate}
        openTabs={openTabs}
        onCloseTab={handleCloseTab}
        onLangChange={(l: Language) => { setLang(l); i18n.changeLanguage(l); }}
        theme={theme}
        onThemeChange={setTheme}
        user={user}
        onLogout={handleLogout}
        expandedMenus={expandedMenus}
        onToggleMenu={handleToggleMenu}
        navItems={filteredNavItems}
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
      {/* 自动更新检查 */}
      <UpdateChecker />
    </ToastProvider>
  );
}