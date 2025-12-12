import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DbConnection } from '../../types';

interface DataSourceState {
    // 连接列表
    connections: DbConnection[];

    // 当前编辑的连接
    editingConnection: DbConnection | null;

    // UI状态
    viewMode: 'grid' | 'list';
    showAddModal: boolean;
    testingConnection: string | null; // connection id being tested

    // Actions
    setConnections: (connections: DbConnection[]) => void;
    addConnection: (connection: DbConnection) => void;
    updateConnection: (connection: DbConnection) => void;
    deleteConnection: (id: string) => void;

    setEditingConnection: (connection: DbConnection | null) => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    setShowAddModal: (show: boolean) => void;
    setTestingConnection: (id: string | null) => void;
}

export const useDataSourceStore = create<DataSourceState>()(
    persist(
        (set) => ({
            // 初始状态
            connections: [],
            editingConnection: null,
            viewMode: 'grid',
            showAddModal: false,
            testingConnection: null,

            // Actions
            setConnections: (connections) => set({ connections }),

            addConnection: (connection) => set((state) => ({
                connections: [...state.connections, connection]
            })),

            updateConnection: (connection) => set((state) => ({
                connections: state.connections.map(c =>
                    c.id === connection.id ? connection : c
                )
            })),

            deleteConnection: (id) => set((state) => ({
                connections: state.connections.filter(c => c.id !== id)
            })),

            setEditingConnection: (connection) => set({ editingConnection: connection }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setShowAddModal: (show) => set({ showAddModal: show }),
            setTestingConnection: (id) => set({ testingConnection: id }),
        }),
        {
            name: 'data-source-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ connections: state.connections }), // 只持久化connections
        }
    )
);

// Selectors
export const useConnections = () => useDataSourceStore((state) => state.connections);
export const useViewMode = () => useDataSourceStore((state) => state.viewMode);
