/**
 * Storage Service - localStorage 封装
 * 提供类型安全的本地存储操作
 */
export class StorageService {
    /**
     * 保存数据到 localStorage
     */
    static save<T>(key: string, data: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to save ${key} to localStorage:`, error);
        }
    }

    /**
     * 从 localStorage 读取数据
     */
    static load<T>(key: string, defaultValue: T): T {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (error) {
            console.error(`Failed to load ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    /**
     * 删除数据
     */
    static remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove ${key} from localStorage:`, error);
        }
    }

    /**
     * 清空所有数据
     */
    static clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }

    /**
     * 检查键是否存在
     */
    static has(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }
}

/**
 * 预定义的存储键
 */
export const StorageKeys = {
    DB_CONNECTIONS: 'db_connections',
    COMPARE_CONFIGS: 'compare_configs',
    MAPPING_PROFILES: 'mapping_profiles',
    USER_SETTINGS: 'user_settings',
    ACTIVE_TAB: 'activeTab',
    OPEN_TABS: 'openTabs',
    VISITED_TABS: 'visitedTabs',
    LANGUAGE: 'language',
    THEME: 'theme',
    TOOLBOX_USER: 'toolbox_user',
    NOTES: 'notes_storage',
    INTERVIEW_QUESTIONS: 'interview_questions_storage'
} as const;
