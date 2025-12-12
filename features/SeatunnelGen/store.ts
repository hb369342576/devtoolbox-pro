import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SeatunnelConfig {
    id: string;
    name: string;
    source: {
        type: string;
        config: Record<string, any>;
    };
    transform?: {
        type: string;
        config: Record<string, any>;
    }[];
    sink: {
        type: string;
        config: Record<string, any>;
    };
    createdAt: number;
    updatedAt: number;
}

interface SeatunnelGenState {
    // 配置列表
    configs: SeatunnelConfig[];

    // 当前编辑的配置
    currentConfig: SeatunnelConfig | null;

    // 配置步骤
    currentStep: 'source' | 'transform' | 'sink' | 'preview';

    // UI状态
    viewMode: 'list' | 'editor';

    // Actions - 配置管理
    setConfigs: (configs: SeatunnelConfig[]) => void;
    addConfig: (config: SeatunnelConfig) => void;
    updateConfig: (config: SeatunnelConfig) => void;
    deleteConfig: (id: string) => void;

    // Actions - 编辑
    setCurrentConfig: (config: SeatunnelConfig | null) => void;
    updateCurrentConfig: (updates: Partial<SeatunnelConfig>) => void;

    // Actions - UI
    setCurrentStep: (step: SeatunnelGenState['currentStep']) => void;
    setViewMode: (mode: 'list' | 'editor') => void;

    // Utilities
    createNewConfig: () => SeatunnelConfig;
    exportConfig: (config: SeatunnelConfig) => string;
}

export const useSeatunnelGenStore = create<SeatunnelGenState>()(
    persist(
        (set, get) => ({
            // 初始状态
            configs: [],
            currentConfig: null,
            currentStep: 'source',
            viewMode: 'list',

            // 配置管理
            setConfigs: (configs) => set({ configs }),

            addConfig: (config) => set((state) => ({
                configs: [config, ...state.configs]
            })),

            updateConfig: (config) => set((state) => ({
                configs: state.configs.map(c => c.id === config.id ? config : c)
            })),

            deleteConfig: (id) => set((state) => ({
                configs: state.configs.filter(c => c.id !== id),
                currentConfig: state.currentConfig?.id === id ? null : state.currentConfig
            })),

            // 编辑
            setCurrentConfig: (config) => set({ currentConfig: config }),

            updateCurrentConfig: (updates) => set((state) => ({
                currentConfig: state.currentConfig
                    ? { ...state.currentConfig, ...updates, updatedAt: Date.now() }
                    : null
            })),

            // UI
            setCurrentStep: (step) => set({ currentStep: step }),
            setViewMode: (mode) => set({ viewMode: mode }),

            // Utilities
            createNewConfig: () => ({
                id: Date.now().toString(),
                name: '新配置',
                source: { type: '', config: {} },
                sink: { type: '', config: {} },
                createdAt: Date.now(),
                updatedAt: Date.now()
            }),

            exportConfig: (config) => {
                return JSON.stringify({
                    env: {
                        'execution.parallelism': 1
                    },
                    source: [config.source],
                    transform: config.transform || [],
                    sink: [config.sink]
                }, null, 2);
            }
        }),
        {
            name: 'seatunnel-gen-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ configs: state.configs }),
        }
    )
);

// Selectors
export const useConfigs = () => useSeatunnelGenStore((state) => state.configs);
export const useCurrentConfig = () => useSeatunnelGenStore((state) => state.currentConfig);
