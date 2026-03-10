import { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useDbViewerStore } from '../store';
import { useDatabase } from '../../../hooks/useDatabase';
import { useTables } from '../../../hooks/useTables';
import { DatabaseService } from '../../../services/database.service';
import { generateSelectSql, generateInsertSql, generateUpdateSql, generateDeleteSql } from '../utils/sqlGenerator';
import { useToast } from '../../common/Toast';
import { detectDbTypeFromDdl, convertMysqlToDoris, convertDorisToMysql } from '../utils/ddlConverter';

export const useSidebarActions = () => {
    const { t } = useTranslation();
    const { toast } = useToast();

    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const databases = useDbViewerStore((state) => state.databases);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const tables = useDbViewerStore((state) => state.tables);
    const tableSearch = useDbViewerStore((state) => state.tableSearch);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);

    const setSelectedConnection = useDbViewerStore((state) => state.setSelectedConnection);
    const setDatabases = useDbViewerStore((state) => state.setDatabases);
    const setSelectedDatabase = useDbViewerStore((state) => state.setSelectedDatabase);
    const setTables = useDbViewerStore((state) => state.setTables);
    const setTableSearch = useDbViewerStore((state) => state.setTableSearch);
    const setSelectedTable = useDbViewerStore((state) => state.setSelectedTable);

    const { databases: fetchedDbs, loading: dbLoading, error: dbError } = useDatabase(selectedConnection);
    const { tables: fetchedTables, loading: tableLoading, error: tableError } = useTables(
        selectedConnection,
        selectedDatabase || ''
    );

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);
    const [generatingSql, setGeneratingSql] = useState(false);

    const [exportModal, setExportModal] = useState<{
        isOpen: boolean;
        type: 'db-structure' | 'db-data' | 'table-structure' | 'table-data' | null;
        tableName?: string;
    }>({ isOpen: false, type: null });

    const [convertModal, setConvertModal] = useState<{
        isOpen: boolean;
        sourceType: 'mysql' | 'doris' | null;
        progress: string;
        isConverting: boolean;
    }>({ isOpen: false, sourceType: null, progress: '', isConverting: false });

    const [truncateModal, setTruncateModal] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        toast({
            title: type === 'error' ? t('dbViewer.error') : t('dbViewer.info'),
            description: message,
            variant: type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'default'
        });
    };

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

    useEffect(() => {
        if (fetchedDbs.length > 0) {
            setDatabases(fetchedDbs);
            if (selectedConnection?.defaultDatabase && !selectedDatabase) {
                const defaultDb = selectedConnection.defaultDatabase;
                if (fetchedDbs.includes(defaultDb)) {
                    setSelectedDatabase(defaultDb);
                }
            }
        }
    }, [fetchedDbs, setDatabases, selectedConnection, selectedDatabase, setSelectedDatabase]);

    useEffect(() => {
        if (fetchedTables.length > 0) {
            setTables(fetchedTables);
        }
    }, [fetchedTables, setTables]);

    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    const handleGenerateSql = async (tableName: string, type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') => {
        if (!selectedConnection || !selectedDatabase) return;
        setGeneratingSql(true);
        try {
            const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, tableName);
            const cols = detail.columns;
            let sql = '';
            switch (type) {
                case 'SELECT': sql = generateSelectSql(tableName, cols); break;
                case 'INSERT': sql = generateInsertSql(tableName, cols); break;
                case 'UPDATE': sql = generateUpdateSql(tableName, cols); break;
                case 'DELETE': sql = generateDeleteSql(tableName, cols); break;
            }
            await navigator.clipboard.writeText(sql);
            showToast(t('common.copied', { defaultValue: '已复制' }) || t('dbViewer.copiedSuccessfully'), 'success');
        } catch (e) {
            console.error('Failed to generate SQL', e);
            showToast(t('dbViewer.failedToGenerate'), 'error');
        } finally {
            setGeneratingSql(false);
        }
    };

    const openExportModal = (type: 'db-structure' | 'db-data' | 'table-structure' | 'table-data', tableName?: string) => {
        setExportModal({ isOpen: true, type, tableName });
    };

    const handleExport = async (filePath: string, onProgress: (message: string) => void) => {
        if (!selectedConnection || !selectedDatabase || !exportModal.type) return;
        const { type, tableName } = exportModal;

        if (type === 'db-structure') {
            onProgress(t('dbViewer.DatabaseSelectedDatabase'));
            onProgress(t('dbViewer.TotalTablesLengthTables'));
            let allDdl = `-- Database: ${selectedDatabase}\n-- Export Time: ${new Date().toLocaleString()}\n\n`;
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                onProgress(t('dbViewer.I1TablesLengthExportingTa'));
                const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, table.name);
                allDdl += `-- Table: ${table.name}\n${detail.ddl}\n\n`;
            }
            await writeTextFile(filePath, allDdl);
        } else if (type === 'db-data') {
            onProgress(t('dbViewer.DatabaseSelectedDatabase'));
            onProgress(t('dbViewer.TotalTablesLengthTables'));
            const connStr = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;
            let allData = `-- Database: ${selectedDatabase}\n-- Data Export Time: ${new Date().toLocaleString()}\n\n`;
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                onProgress(t('dbViewer.I1TablesLengthExportingDa'));
                const rows: any[] = await invoke('db_query', {
                    id: connStr,
                    sql: `SELECT * FROM \`${selectedDatabase}\`.\`${table.name}\` LIMIT 10000`
                });
                if (rows.length > 0) {
                    allData += `-- Table: ${table.name} (${rows.length} rows)\n`;
                    onProgress(t('dbViewer.TableNameRowsLengthRows'));
                    for (const row of rows) {
                        const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
                        const vals = Object.values(row).map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ');
                        allData += `INSERT INTO \`${table.name}\` (${cols}) VALUES (${vals});\n`;
                    }
                    allData += '\n';
                } else {
                    onProgress(t('dbViewer.TableNameNoData'));
                }
            }
            await writeTextFile(filePath, allData);
        } else if (type === 'table-structure' && tableName) {
            onProgress(t('dbViewer.TableTableName'));
            onProgress(t('dbViewer.FetchingTableStructure'));
            const detail = await DatabaseService.getTableSchema(selectedConnection, selectedDatabase, tableName);
            const content = `-- Table: ${tableName}\n-- Export Time: ${new Date().toLocaleString()}\n\n${detail.ddl}`;
            await writeTextFile(filePath, content);
        } else if (type === 'table-data' && tableName) {
            onProgress(t('dbViewer.TableTableName'));
            onProgress(t('dbViewer.QueryingData'));
            const connStr = `mysql://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;
            const rows: any[] = await invoke('db_query', {
                id: connStr,
                sql: `SELECT * FROM \`${selectedDatabase}\`.\`${tableName}\` LIMIT 10000`
            });
            onProgress(t('dbViewer.TotalRowsLengthRows'));
            let content = `-- Table: ${tableName}\n-- Data Export Time: ${new Date().toLocaleString()}\n-- Rows: ${rows.length}\n\n`;
            for (const row of rows) {
                const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
                const vals = Object.values(row).map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ');
                content += `INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals});\n`;
            }
            await writeTextFile(filePath, content);
        }
    };

    const openConvertModal = () => {
        setConvertModal({ isOpen: true, sourceType: 'mysql', progress: '', isConverting: false });
        setContextMenu(null);
    };

    const executeBatchConvert = async (filePath: string) => {
        if (!selectedConnection || !selectedDatabase) return;
        setConvertModal(prev => ({ ...prev, isConverting: true, progress: t('dbViewer.initializing') }));
        try {
            const dbId = `${selectedConnection.type}://${selectedConnection.user}:${selectedConnection.password || ''}@${selectedConnection.host}:${selectedConnection.port}`;
            let targetTables = tables;
            if (targetTables.length === 0) throw new Error(t('dbViewer.noTablesFoundInCurrentDat'));

            const tableNames = targetTables.map(t => t.name);
            let convertedContent = `-- Batch DDL Conversion\n-- Database: ${selectedDatabase}\n-- Time: ${new Date().toLocaleString()}\n\n`;
            let sourceType: 'mysql' | 'doris' = 'mysql';

            setConvertModal(prev => ({ ...prev, progress: t('dbViewer.foundTableNamesLengthTabl') }));

            for (let i = 0; i < tableNames.length; i++) {
                const tableName = tableNames[i];
                setConvertModal(prev => ({ ...prev, progress: t('dbViewer.processingI1TableNamesLen') }));

                const schema: any = await invoke('db_get_table_schema', { id: dbId, db: selectedDatabase, table: tableName });
                const columns = schema.columns || [];

                const ddlQuery = `SHOW CREATE TABLE \`${selectedDatabase}\`.\`${tableName}\``;
                const ddlResult = await invoke<any[]>('db_query', { id: dbId, sql: ddlQuery });
                let ddl = '';
                if (ddlResult && ddlResult.length > 0) ddl = ddlResult[0]['Create Table'] || ddlResult[0]['Create View'] || '';

                if (i === 0) {
                    sourceType = detectDbTypeFromDdl(ddl);
                    setConvertModal(prev => ({ ...prev, sourceType }));
                }

                let converted = sourceType === 'mysql' ? convertMysqlToDoris(tableName, columns, ddl) : convertDorisToMysql(tableName, columns, ddl);
                convertedContent += `-- Table: ${tableName}\n${converted}\n\n`;
            }

            setConvertModal(prev => ({ ...prev, progress: t('dbViewer.savingFile') }));
            await writeTextFile(filePath, convertedContent);

            setConvertModal(prev => ({ ...prev, isConverting: false, progress: t('dbViewer.conversionCompletedFileSa') }));
            showToast(t('dbViewer.conversionSuccessful'), 'success');
            setTimeout(() => setConvertModal(prev => ({ ...prev, isOpen: false })), 1000);
        } catch (err: any) {
            console.error('Batch convert failed:', err);
            setConvertModal(prev => ({ ...prev, isConverting: false, progress: t('dbViewer.errorErrMessageErr') }));
            showToast(err.toString(), 'error');
        }
    };

    return {
        // State
        selectedConnection, databases, selectedDatabase, tables, tableSearch, selectedTable,
        dbLoading, dbError, tableLoading, tableError, filteredTables,
        contextMenu, generatingSql, exportModal, convertModal, truncateModal, isTauri,
        // Setters
        setSelectedConnection, setSelectedDatabase, setTableSearch, setSelectedTable,
        setContextMenu, setExportModal, setConvertModal, setTruncateModal, showToast,
        // Actions
        handleGenerateSql, openExportModal, handleExport, openConvertModal, executeBatchConvert
    };
};
