import { useState, useEffect } from 'react';

/**
 * 通用 Hook: LocalStorage 状态管理
 * 自动同步状态到 localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    // 初始化状态
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return initialValue;
        }
    });

    // 更新 localStorage 的副作用
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue] as const;
}
