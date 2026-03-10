import React from 'react';
import { Table as TableIcon, Clipboard, Download, Copy, Columns, RefreshCw } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useDbViewerStore } from '../store';
import { useTableDetail } from '../hooks/useTableDetail';
import { ContextMenu } from '../../common/ContextMenu';
import { useSqlTabs } from '../hooks/useSqlTabs';
import { useTableViewer } from '../hooks/useTableViewer';
import { TableViewerHeader } from './TableViewerHeader';
import { TableStructureTab } from './TableStructureTab';
import { SqlQueryTab } from './SqlQueryTab';

export const TableViewer: React.FC<{}> = ({}) => {
    const { t } = useTranslation();
    
    // Store States
    const selectedTable = useDbViewerStore((state) => state.selectedTable);
    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const columns = useDbViewerStore((state) => state.columns);
    const ddl = useDbViewerStore((state) => state.ddl);
    const tables = useDbViewerStore((state) => state.tables);

    const { loading } = useTableDetail();

    const {
        sqlTabs, activeSqlTabId, setActiveSqlTabId, activeTab_sql,
        sortedResults, paginatedResults, queryColumns, totalPages, pageSize,
        handleAddSqlTab, handleCloseSqlTab, updateSqlTab,
        handleExecuteQuery, handleExecuteSelected, handleSort, handleFormatSql
    } = useSqlTabs();

    const {
        activeTab, setActiveTab,
        contextMenu, setContextMenu,
        ddlHeight, setIsResizing,
        queryEditorHeight, setIsQueryResizing,
        isConvertedDdl, convertedDdl, detectedDbType,
        handleConvertDdl, handleCopy, handleExportData, handleCopyData
    } = useTableViewer(queryColumns, sortedResults, paginatedResults);

    const handleResultContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                {
                    label: t('db_viewer.copyCurrentPage'),
                    icon: <Clipboard size={14} />,
                    onClick: handleCopyData
                },
                {
                    label: t('db_viewer.exportAllCSV'),
                    icon: <Download size={14} />,
                    onClick: handleExportData
                }
            ]
        });
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'column' | 'ddl', data?: any) => {
        e.preventDefault();
        let items = [];

        if (type === 'column') {
            const colName = data?.name;
            items = [
                {
                    label: t('dbViewer.copyColumnName'),
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(colName)
                },
                {
                    label: t('dbViewer.copyAllColumnsCSV'),
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join(', '))
                },
                {
                    label: t('dbViewer.copyAllColumnsList'),
                    icon: <Columns size={14} />,
                    onClick: () => handleCopy(columns.map(c => c.name).join('\n'))
                }
            ];
        } else if (type === 'ddl') {
            items = [
                {
                    label: t('dbViewer.copyDDL'),
                    icon: <Copy size={14} />,
                    onClick: () => handleCopy(isConvertedDdl ? convertedDdl : ddl)
                }
            ];

            if (detectedDbType === 'mysql' || detectedDbType === 'doris') {
                items.push({
                    label: isConvertedDdl
                        ? (t('db_viewer.restoreOriginalDDL'))
                        : (t('db_viewer.convertToDetectedDbTypeMy', { dbType: detectedDbType === 'mysql' ? 'Doris' : 'MySQL' })),
                    icon: <RefreshCw size={14} />,
                    onClick: handleConvertDdl
                });
            }
        }
        setContextMenu({ x: e.clientX, y: e.clientY, items });
    };

    const showToast = (msg: string, type: 'success' | 'error') => {
        // useToast is already called inside Hooks but we need it here for SqlQueryTab prop if we want,
        // Actually, we can reuse the one from hook or just ignore it, 
        // passing showToast is needed for SqlQueryTab component which takes it as prop.
        // Let's create a proxy since we don't have direct access here.
        // Wait, the hook `useTableViewer` handles copying and has toast, `useSqlTabs` handles execution toast.
        // I will just use the one in useSqlTabs for this.
    };

    if (!selectedTable) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                <TableIcon size={64} className="mb-4 opacity-20" />
                <p className="text-lg">{t('dbViewer.selectDb')}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
            <TableViewerHeader 
                selectedTable={selectedTable}
                loading={loading}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onCopy={handleCopy}
            />

            {activeTab === 'structure' && (
                <TableStructureTab 
                    columns={columns}
                    loading={loading}
                    handleContextMenu={handleContextMenu}
                    handleMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
                    ddlHeight={ddlHeight}
                    detectedDbType={detectedDbType}
                    isConvertedDdl={isConvertedDdl}
                    convertedDdl={convertedDdl}
                    ddl={ddl}
                    handleConvertDdl={handleConvertDdl}
                    handleCopy={handleCopy}
                />
            )}

            {activeTab === 'query' && (
                <SqlQueryTab 
                    sqlTabs={sqlTabs}
                    activeSqlTabId={activeSqlTabId}
                    setActiveSqlTabId={setActiveSqlTabId}
                    handleAddSqlTab={handleAddSqlTab}
                    handleCloseSqlTab={handleCloseSqlTab}
                    activeTab_sql={activeTab_sql}
                    queryEditorHeight={queryEditorHeight}
                    setIsQueryResizing={setIsQueryResizing}
                    handleFormatSql={handleFormatSql}
                    handleExecuteSelected={handleExecuteSelected}
                    handleExecuteQuery={handleExecuteQuery}
                    updateSqlTab={updateSqlTab}
                    tables={tables}
                    selectedTable={selectedTable}
                    selectedDatabase={selectedDatabase}
                    selectedConnection={selectedConnection}
                    columns={columns}
                    sortedResults={sortedResults}
                    totalPages={totalPages}
                    handleResultContextMenu={handleResultContextMenu}
                    queryColumns={queryColumns}
                    handleSort={handleSort}
                    paginatedResults={paginatedResults}
                    pageSize={pageSize}
                    showToast={showToast}
                />
            )}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};
