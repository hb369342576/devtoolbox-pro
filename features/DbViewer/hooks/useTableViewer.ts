import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDbViewerStore } from '../store';
import { useToast } from '../../common/Toast';
import { convertDorisToMysql, convertMysqlToDoris, detectDbTypeFromDdl } from '../utils/ddlConverter';

export const useTableViewer = (queryColumns: string[], sortedResults: any[], paginatedResults: any[]) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const showToast = (message: string, variant: 'success' | 'error') => toast({ message, type: variant === 'error' ? 'error' : 'success' });
    
    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const columns = useDbViewerStore((state) => state.columns);
    const ddl = useDbViewerStore((state) => state.ddl);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'structure' | 'query'>('query');

    const [ddlHeight, setDdlHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    
    const [queryEditorHeight, setQueryEditorHeight] = useState(200);
    const [isQueryResizing, setIsQueryResizing] = useState(false);

    const [isConvertedDdl, setIsConvertedDdl] = useState(false);
    const [convertedDdl, setConvertedDdl] = useState('');

    const detectedDbType = detectDbTypeFromDdl(ddl);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const container = document.getElementById('table-viewer-split-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const newHeight = rect.bottom - e.clientY;
                if (newHeight > 50 && newHeight < rect.height - 100) {
                    setDdlHeight(newHeight);
                }
            }
        };

        const handleGlobalMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const handleQueryMouseMove = (e: MouseEvent) => {
            if (!isQueryResizing) return;
            const container = document.getElementById('query-split-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const newHeight = e.clientY - rect.top;
                if (newHeight > 80 && newHeight < rect.height - 100) {
                    setQueryEditorHeight(newHeight);
                }
            }
        };

        const handleQueryMouseUp = () => setIsQueryResizing(false);

        if (isQueryResizing) {
            document.addEventListener('mousemove', handleQueryMouseMove);
            document.addEventListener('mouseup', handleQueryMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleQueryMouseMove);
            document.removeEventListener('mouseup', handleQueryMouseUp);
        };
    }, [isQueryResizing]);

    useEffect(() => {
        setIsConvertedDdl(false);
        setConvertedDdl('');
    }, [selectedTable, selectedDatabase]);

    const handleConvertDdl = () => {
        if (isConvertedDdl) {
            setIsConvertedDdl(false);
            setConvertedDdl('');
            return;
        }

        if (!ddl || columns.length === 0) return;

        const tableName = selectedTable || 'unknown_table';
        const isMySQL = detectedDbType === 'mysql';

        let result = isMySQL 
            ? convertMysqlToDoris(tableName, columns, ddl)
            : convertDorisToMysql(tableName, columns, ddl);

        setConvertedDdl(result);
        setIsConvertedDdl(true);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(t('db_viewer.copiedSuccessfully'), 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast(t('db_viewer.failedToCopy'), 'error');
        }
    };

    const handleExportData = async () => {
        if (!sortedResults.length) return;
        
        const headers = queryColumns.join(',');
        const rows = sortedResults.map(row => 
            queryColumns.map(col => {
                const val = row[col];
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        
        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const filePath = await save({
                defaultPath: `query_result_${Date.now()}.csv`,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            
            if (filePath) {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(filePath, csv);
                showToast(t('db_viewer.exportSuccessful'), 'success');
            }
        } catch (err: any) {
            showToast(`${t('db_viewer.exportFailed')}: ${err}`, 'error');
        }
    };

    const handleCopyData = async () => {
        if (!paginatedResults.length) return;
        
        const headers = queryColumns.join('\t');
        const rows = paginatedResults.map(row => 
            queryColumns.map(col => row[col] ?? '').join('\t')
        );
        
        const text = [headers, ...rows].join('\n');
        
        try {
            await navigator.clipboard.writeText(text);
            showToast(t('db_viewer.copiedPaginatedResultsLen'), 'success');
        } catch (err) {
            showToast(t('db_viewer.copyFailed'), 'error');
        }
    };

    return {
        activeTab,
        setActiveTab,
        contextMenu,
        setContextMenu,
        ddlHeight,
        setIsResizing,
        queryEditorHeight,
        setIsQueryResizing,
        isConvertedDdl,
        convertedDdl,
        detectedDbType,
        handleConvertDdl,
        handleCopy,
        handleExportData,
        handleCopyData
    };
};
