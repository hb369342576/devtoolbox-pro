import { create } from 'zustand';
import { DbConnection, TableInfo, ColumnInfo } from '../../types';

/**
 * DbViewer专用状态管理Store
 */

interface DbViewerState {
    // 连接状态
    selectedConnection: DbConnection | null;
    databases: string[];
    selectedDatabase: string | null;

    // 表列表
    tables: TableInfo[];
    selectedTable: string | null;
    tableSearch: string;

    // 表结构
    columns: ColumnInfo[];
    tableData: any[];
    ddl: string;

    // UI状态
    viewMode: 'tree' | 'list';
    isLoading: boolean;
    showSqlGenerator: boolean;

    // Actions - 连接管理
    setSelectedConnection: (conn: DbConnection | null) => void;
    setDatabases: (dbs: string[]) => void;
    setSelectedDatabase: (db: string | null) => void;

    // Actions - 表管理
    setTables: (tables: TableInfo[]) => void;
    setSelectedTable: (table: string | null) => void;
    setTableSearch: (search: string) => void;

    // Actions - 数据管理
    setColumns: (columns: ColumnInfo[]) => void;
    setDdl: (ddl: string) => void;
    setTableData: (data: any[]) => void;

    // Actions - UI
    setViewMode: (mode: 'tree' | 'list') => void;
    setIsLoading: (loading: boolean) => void;
    setShowSqlGenerator: (show: boolean) => void;

    // Actions - 复合操作
    reset: () => void;
    selectTableAndLoad: (table: string) => void;
}

export const useDbViewerStore = create<DbViewerState>()((set, get) => ({
    // 初始状态
    selectedConnection: null,
    databases: [],
    selectedDatabase: null,
    tables: [],
    selectedTable: null,
    tableSearch: '',
    columns: [],
    tableData: [],
    ddl: '',
    viewMode: 'tree',
    isLoading: false,
    showSqlGenerator: false,

    // 连接管理
    setSelectedConnection: (conn) => set({
        selectedConnection: conn,
        databases: [],
        selectedDatabase: null,
        tables: [],
        selectedTable: null
    }),

    setDatabases: (dbs) => set({ databases: dbs }),

    setSelectedDatabase: (db) => set({
        selectedDatabase: db,
        tables: [],
        selectedTable: null,
        tableSearch: ''
    }),

    // 表管理
    setTables: (tables) => set({ tables }),
    setSelectedTable: (table) => set({ selectedTable: table }),
    setTableSearch: (search) => set({ tableSearch: search }),

    // 数据管理
    setColumns: (columns) => set({ columns }),
    setDdl: (ddl) => set({ ddl }),
    setTableData: (data) => set({ tableData: data }),

    // UI
    setViewMode: (mode) => set({ viewMode: mode }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setShowSqlGenerator: (show) => set({ showSqlGenerator: show }),

    // 复合操作
    reset: () => set({
        selectedConnection: null,
        databases: [],
        selectedDatabase: null,
        tables: [],
        selectedTable: null,
        tableSearch: '',
        columns: [],
        tableData: [],
        ddl: '',
    }),

    selectTableAndLoad: (table) => {
        set({ selectedTable: table, isLoading: true });
        // 实际的数据加载会在组件中处理
    }
}));

/**
 * 选择器Hooks
 */
export const useSelectedConnection = () => useDbViewerStore((state) => state.selectedConnection);
export const useSelectedDatabase = () => useDbViewerStore((state) => state.selectedDatabase);
export const useSelectedTable = () => useDbViewerStore((state) => state.selectedTable);
export const useFilteredTables = () => useDbViewerStore((state) => {
    const { tables, tableSearch } = state;
    if (!tableSearch) return tables;
    return tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
});
