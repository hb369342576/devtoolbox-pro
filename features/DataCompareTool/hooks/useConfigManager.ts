import { useState, useEffect, useCallback } from 'react';
import { SavedCompareConfig } from '../types';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

/**
 * 配置管理 Hook
 * 处理配置的增删改查和持久化
 */
export const useConfigManager = () => {
    const [savedConfigs, setSavedConfigs] = useLocalStorage<SavedCompareConfig[]>(
        'compare_configs',
        []
    );
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    const createConfig = useCallback(() => {
        setEditingConfigId(null);
    }, []);

    const editConfig = useCallback((config: SavedCompareConfig) => {
        setEditingConfigId(config.id);
    }, []);

    const saveConfig = useCallback(
        (config: Omit<SavedCompareConfig, 'id' | 'createdAt'>) => {
            const newConfig: SavedCompareConfig = {
                ...config,
                id: editingConfigId || Date.now().toString(),
                createdAt: Date.now()
            };

            if (editingConfigId) {
                setSavedConfigs(prev =>
                    prev.map(c => (c.id === editingConfigId ? newConfig : c))
                );
            } else {
                setSavedConfigs(prev => [newConfig, ...prev]);
            }

            setEditingConfigId(null);
            return newConfig;
        },
        [editingConfigId, setSavedConfigs]
    );

    const deleteConfig = useCallback(
        (id: string) => {
            setSavedConfigs(prev => prev.filter(c => c.id !== id));
        },
        [setSavedConfigs]
    );

    const getConfigById = useCallback(
        (id: string) => {
            return savedConfigs.find(c => c.id === id);
        },
        [savedConfigs]
    );

    return {
        savedConfigs,
        editingConfigId,
        createConfig,
        editConfig,
        saveConfig,
        deleteConfig,
        getConfigById
    };
};
