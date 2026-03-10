import { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useDbViewerStore } from '../store';
import { useToast } from '../../common/Toast';

export interface SqlTab {
    id: string;
    name: string;
    sql: string;
    results: any[];
    loading: boolean;
    error: string;
    currentPage: number;
    sortColumn: string | null;
    sortDirection: 'asc' | 'desc';
}

export const useSqlTabs = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const showToast = (message: string, variant: 'success' | 'error') => toast({ message, type: variant === 'error' ? 'error' : 'success' });

    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);

    const [sqlTabs, setSqlTabs] = useState<SqlTab[]>([]);
    const [activeSqlTabId, setActiveSqlTabId] = useState<string | null>(null);
    const [tabCounter, setTabCounter] = useState(1);
    const [pageSize] = useState(20);

    const activeTab_sql = sqlTabs.find(t => t.id === activeSqlTabId);

    const currentResults = activeTab_sql?.results || [];
    const currentSortColumn = activeTab_sql?.sortColumn || null;
    const currentSortDirection = activeTab_sql?.sortDirection || 'asc';

    const sortedResults = useMemo(() => {
        if (!currentSortColumn) return currentResults;
        return [...currentResults].sort((a, b) => {
            const aVal = a[currentSortColumn];
            const bVal = b[currentSortColumn];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const strA = String(aVal).toLowerCase();
            const strB = String(bVal).toLowerCase();
            if (currentSortDirection === 'asc') {
                return strA.localeCompare(strB);
            } else {
                return strB.localeCompare(strA);
            }
        });
    }, [currentResults, currentSortColumn, currentSortDirection]);

    const totalPages = Math.ceil(sortedResults.length / pageSize);
    const paginatedResults = sortedResults.slice(
        ((activeTab_sql?.currentPage || 1) - 1) * pageSize,
        (activeTab_sql?.currentPage || 1) * pageSize
    );
    const queryColumns = sortedResults.length > 0 ? Object.keys(sortedResults[0]) : [];

    const handleAddSqlTab = () => {
        const newId = `sql-${Date.now()}`;
        const newTab: SqlTab = {
            id: newId,
            name: `SQL ${tabCounter}`,
            sql: selectedTable && selectedDatabase ? `SELECT * FROM ${selectedDatabase}.${selectedTable} LIMIT 100` : '',
            results: [],
            loading: false,
            error: '',
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc'
        };
        setSqlTabs(prev => [...prev, newTab]);
        setActiveSqlTabId(newId);
        setTabCounter(prev => prev + 1);
    };

    const handleCloseSqlTab = (tabId: string) => {
        setSqlTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeSqlTabId === tabId && newTabs.length > 0) {
                setActiveSqlTabId(newTabs[newTabs.length - 1].id);
            } else if (newTabs.length === 0) {
                setActiveSqlTabId(null);
            }
            return newTabs;
        });
    };

    const updateSqlTab = (tabId: string, updates: Partial<SqlTab>) => {
        setSqlTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
    };

    const handleExecuteQuery = async () => {
        if (!activeTab_sql) return;
        const sql = activeTab_sql.sql;
        
        if (!sql.trim()) {
            showToast(t('db_viewer.pleaseEnterSQLStatement'), 'error');
            return;
        }

        if (!selectedConnection) {
            showToast(t('dbViewer.pleaseSelectADatabaseConn'), 'error');
            return;
        }

        updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });

        try {
            const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
            const results = await invoke<any[]>('db_query', { id: connectionId, sql: sql.trim() });
            updateSqlTab(activeTab_sql.id, { results, loading: false });
            showToast(t('db_viewer.querySuccessfulResultsLen', { count: results.length }), 'success');
        } catch (error: any) {
            updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
            showToast(`${t('dbViewer.queryFailed')}: ${error}`, 'error');
        }
    };

    const handleExecuteSelected = async () => {
        if (!activeTab_sql) return;
        const getSelectedText = (window as any).__sqlEditorGetSelectedText;
        const selectedText = getSelectedText ? getSelectedText() : '';
        
        if (!selectedText.trim()) {
            showToast(t('db_viewer.pleaseSelectSQLStatementF'), 'error');
            return;
        }

        if (!selectedConnection) {
            showToast(t('dbViewer.pleaseSelectADatabaseConn'), 'error');
            return;
        }

        updateSqlTab(activeTab_sql.id, { loading: true, error: '', currentPage: 1 });

        try {
            const connectionId = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}/${selectedDatabase || ''}`;
            const results = await invoke<any[]>('db_query', { id: connectionId, sql: selectedText.trim() });
            updateSqlTab(activeTab_sql.id, { results, loading: false });
            showToast(t('db_viewer.querySuccessfulResultsLen', { count: results.length }), 'success');
        } catch (error: any) {
            updateSqlTab(activeTab_sql.id, { error: error.toString(), loading: false });
            showToast(`${t('db_viewer.queryFailed')}: ${error}`, 'error');
        }
    };

    const handleSort = (column: string) => {
        if (!activeTab_sql) return;
        if (activeTab_sql.sortColumn === column) {
            updateSqlTab(activeTab_sql.id, {
                sortDirection: activeTab_sql.sortDirection === 'asc' ? 'desc' : 'asc'
            });
        } else {
            updateSqlTab(activeTab_sql.id, { sortColumn: column, sortDirection: 'asc' });
        }
    };

    const handleFormatSql = () => {
        if (!activeTab_sql) return;
        const sql = activeTab_sql.sql;
        if (!sql.trim()) return;
        
        let formatted = sql;
        formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        formatted = formatted.replace(/\s+/g, ' ').trim();
        
        const lineBreakKeywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'JOIN'];
        lineBreakKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            formatted = formatted.replace(regex, `\n${kw}`);
        });
        
        formatted = formatted.replace(/\b(AND|OR)\b/gi, '\n    $1');
        formatted = formatted.replace(/^\n+/, '');
        
        updateSqlTab(activeTab_sql.id, { sql: formatted });
        showToast(t('db_viewer.sQLFormatted'), 'success');
    };

    return {
        sqlTabs,
        activeSqlTabId,
        setActiveSqlTabId,
        activeTab_sql,
        sortedResults,
        paginatedResults,
        queryColumns,
        totalPages,
        pageSize,
        handleAddSqlTab,
        handleCloseSqlTab,
        updateSqlTab,
        handleExecuteQuery,
        handleExecuteSelected,
        handleSort,
        handleFormatSql
    };
};
