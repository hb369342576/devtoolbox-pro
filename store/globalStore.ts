import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

    // Actions
    setTheme: (theme: 'light' | 'dark') => void;
    setLanguage: (lang: 'zh' | 'en') => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    login: (username: string) => void;
    logout: () => void;
    setActiveTab: (tab: string) => void;
}

export const useGlobalStore = create<GlobalState>()(
    persist(
        (set) => ({
            // 初始状态
            theme: 'light',
            language: 'zh',
            viewMode: 'grid',
            isLoggedIn: false,
            currentUser: null,
            activeTab: 'dashboard',

            // Actions
            setTheme: (theme) => set({ theme }),
            setLanguage: (lang) => set({ language: lang }),
            setViewMode: (mode) => set({ viewMode: mode }),
            login: (username) => set({ isLoggedIn: true, currentUser: username }),
            logout: () => set({ isLoggedIn: false, currentUser: null }),
            setActiveTab: (tab) => set({ activeTab: tab }),
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
