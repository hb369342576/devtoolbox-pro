import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DolphinSchedulerConnection } from '../types';

/**
 * 全局应用状态Store
 * 使用Zustand管理跨组件状态
 */

interface GlobalState {
    // UI状态
    theme: 'light' | 'dark';
    language: 'zh' | 'en';
    viewMode: 'grid' | 'list'; // 全局视图模式

    // 用户状态
    isLoggedIn: boolean;
    currentUser: string | null;

    // 应用状态
    activeTab: string;

    // DS 连接管理
    dsConnections: DolphinSchedulerConnection[];
    
    // Actions
    setTheme: (theme: 'light' | 'dark') => void;
    setLanguage: (lang: 'zh' | 'en') => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    login: (username: string) => void;
    logout: () => void;
    setActiveTab: (tab: string) => void;
    
    // DS 连接操作
    addDsConnection: (conn: Omit<DolphinSchedulerConnection, 'id'>) => void;
    updateDsConnection: (conn: DolphinSchedulerConnection) => void;
    deleteDsConnection: (id: string) => void;
}

export const useGlobalStore = create<GlobalState>()(
    persist(
        (set, get) => ({
            // 初始状态
            theme: 'light',
            language: 'zh',
            viewMode: 'grid',
            isLoggedIn: false,
            currentUser: null,
            activeTab: 'dashboard',
            dsConnections: [],

            // Actions
            setTheme: (theme) => set({ theme }),
            setLanguage: (lang) => set({ language: lang }),
            setViewMode: (mode) => set({ viewMode: mode }),
            login: (username) => set({ isLoggedIn: true, currentUser: username }),
            logout: () => set({ isLoggedIn: false, currentUser: null }),
            setActiveTab: (tab) => set({ activeTab: tab }),
            
            // DS 连接操作
            addDsConnection: (conn) => set((state) => ({
                dsConnections: [...state.dsConnections, { ...conn, id: crypto.randomUUID() }]
            })),
            updateDsConnection: (conn) => set((state) => ({
                dsConnections: state.dsConnections.map(c => c.id === conn.id ? conn : c)
            })),
            deleteDsConnection: (id) => set((state) => ({
                dsConnections: state.dsConnections.filter(c => c.id !== id)
            })),
        }),
        {
            name: 'devtoolbox-global-state',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

/**
 * 选择器Hooks - 用于性能优化
 */
export const useTheme = () => useGlobalStore((state) => state.theme);
export const useLanguage = () => useGlobalStore((state) => state.language);
export const useViewMode = () => useGlobalStore((state) => state.viewMode);
export const useAuth = () => useGlobalStore((state) => ({
    isLoggedIn: state.isLoggedIn,
    currentUser: state.currentUser,
    login: state.login,
    logout: state.logout,
}));
