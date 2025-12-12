import React, { useState, useRef, useEffect } from 'react';
import { Menu, Moon, Sun, ChevronLeft, ChevronRight, Settings, Globe, LogOut, User as UserIcon, MoreHorizontal, UserCog, X } from 'lucide-react';
import { NAV_ITEMS } from '../../constants';
import { Language, Theme, User } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  openTabs: string[];
  onCloseTab: (id: string) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  openTabs,
  onCloseTab,
  lang,
  onLangChange,
  theme,
  onThemeChange,
  user,
  onLogout
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Top-right User Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Bottom-left More Menu State
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Top-right user menu
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      // Close Bottom-left more menu
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get tab info (label & icon)
  const getTabInfo = (id: string) => {
    const navItem = NAV_ITEMS.find(i => i.id === id);
    if (navItem) return navItem;

    if (id === 'settings') {
      return {
        label: { en: 'Settings', zh: '系统设置' },
        icon: Settings
      };
    }
    // Fallback
    return {
      label: { en: 'Unknown', zh: '未知页面' },
      icon: Settings
    };
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings className="text-white w-5 h-5" />
            </div>
            {!collapsed && (
              <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 whitespace-nowrap">
                DevToolbox
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS
            .filter(item => item.visible)
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`
                  w-full flex items-center px-3 py-3 rounded-lg transition-colors duration-200
                  ${isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                `}
                  title={collapsed ? item.label[lang] : ''}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  {!collapsed && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">
                      {item.label[lang]}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {/* More Menu Button */}
          <div className="relative" ref={moreMenuRef}>
            {showMoreMenu && (
              <div className={`
                  absolute bottom-full mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 w-48 z-50 animate-in fade-in zoom-in-95 duration-100
                  ${collapsed ? 'left-0' : 'left-0'}
               `}>
                <div className="py-1">
                  <button
                    onClick={() => { setShowMoreMenu(false); onTabChange('profile'); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                  >
                    <UserCog size={16} className="mr-2" />
                    {lang === 'zh' ? '个人中心' : 'User Profile'}
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); onTabChange('settings'); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    {lang === 'zh' ? '系统设置' : 'Settings'}
                  </button>
                </div>
                <div className="py-1 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => { setShowMoreMenu(false); onLogout(); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    {lang === 'zh' ? '退出登录' : 'Logout'}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`
                 w-full flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors
                 ${collapsed ? 'justify-center' : ''}
               `}
              title={lang === 'zh' ? '更多' : 'More'}
            >
              <MoreHorizontal size={20} />
              {!collapsed && <span className="ml-3 text-sm font-medium">{lang === 'zh' ? '更多' : 'More'}</span>}
            </button>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Header with Tabs */}
        <header className="h-14 flex items-end justify-between px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm relative z-10">

          {/* Tabs Container */}
          <div className="flex-1 flex items-end space-x-1 overflow-x-auto no-scrollbar h-full pt-2">
            {openTabs.map((tabId) => {
              const info = getTabInfo(tabId);
              const isActive = activeTab === tabId;

              return (
                <div
                  key={tabId}
                  onClick={() => onTabChange(tabId)}
                  className={`
                    group flex items-center space-x-2 px-4 py-2.5 rounded-t-lg border-t border-l border-r cursor-pointer transition-all select-none min-w-[120px] max-w-[200px]
                    ${isActive
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 border-b-transparent relative top-[1px] text-blue-600 dark:text-blue-400 font-medium z-10'
                      : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 mb-1 rounded-lg opacity-80 hover:opacity-100'}
                  `}
                >
                  <info.icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  <span className="text-xs truncate flex-1">{info.label[lang]}</span>

                  {/* Dashboard is not closable */}
                  {tabId !== 'dashboard' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tabId);
                      }}
                      className={`
                        p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-all 
                        ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                      `}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2 pb-2 pl-4 ml-2 border-l border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onLangChange(lang === 'en' ? 'zh' : 'en')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
              title="Switch Language"
            >
              <div className="flex items-center space-x-1">
                <Globe size={16} />
                <span className="text-xs font-medium uppercase">{lang}</span>
              </div>
            </button>

            <button
              onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
              title="Switch Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 pl-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold overflow-hidden border border-blue-200 dark:border-blue-800">
                    {user.avatar ? (
                      <img src={user.avatar} alt="U" className="w-full h-full object-cover" />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-in fade-in zoom-in-95 duration-100 z-50">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {user.nickname || user.username}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setShowUserMenu(false); onTabChange('profile'); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                      >
                        <UserIcon size={16} className="mr-2" />
                        {lang === 'zh' ? '个人中心' : 'Profile'}
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); onTabChange('settings'); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                      >
                        <Settings size={16} className="mr-2" />
                        {lang === 'zh' ? '系统设置' : 'Settings'}
                      </button>
                    </div>
                    <div className="py-1 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => { setShowUserMenu(false); onLogout(); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                      >
                        <LogOut size={16} className="mr-2" />
                        {lang === 'zh' ? '退出登录' : 'Logout'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};