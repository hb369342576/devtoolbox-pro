import React from 'react';
import { useTranslation } from "react-i18next";
import { ContextMenu } from '../../common/ContextMenu';
import { ExportProgressModal } from './ExportProgressModal';
import { ConvertDdlModal } from './ConvertDdlModal';
import { TruncateModal } from './TruncateModal';
import { useSidebarActions } from '../hooks/useSidebarActions';
import { DatabaseSelector } from './DatabaseSelector';
import { TableList } from './TableList';

export const Sidebar: React.FC<{}> = ({ }) => {
    const { t } = useTranslation();
    const actions = useSidebarActions();

    return (
        <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
            <DatabaseSelector
                selectedConnection={actions.selectedConnection}
                setSelectedConnection={actions.setSelectedConnection}
                selectedDatabase={actions.selectedDatabase}
                setSelectedDatabase={actions.setSelectedDatabase}
                databases={actions.databases}
                dbLoading={actions.dbLoading}
                dbError={actions.dbError}
                handleDatabaseContextMenu={(e) => {
                    if (!actions.selectedDatabase || !actions.isTauri) return;
                    e.preventDefault();
                    e.stopPropagation();

                    actions.setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                            {
                                label: t('dbViewer.copyDatabaseName'),
                                onClick: async () => {
                                    await navigator.clipboard.writeText(actions.selectedDatabase!);
                                    actions.showToast(t('dbViewer.copiedSuccessfully'), 'success');
                                    actions.setContextMenu(null);
                                }
                            },
                            { divider: true },
                            {
                                label: t('dbViewer.exportDatabaseStructure'),
                                onClick: () => actions.openExportModal('db-structure')
                            },
                            {
                                label: t('dbViewer.exportDatabaseData'),
                                onClick: () => actions.openExportModal('db-data')
                            },
                            {
                                label: t('dbViewer.batchDDLConversion'),
                                onClick: () => actions.openConvertModal()
                            },
                            { divider: true },
                            {
                                label: t('dbViewer.truncateDatabase'),
                                onClick: () => {
                                    actions.setTruncateModal(true);
                                    actions.setContextMenu(null);
                                }
                            }
                        ]
                    });
                }}
            />

            <TableList
                tables={actions.tables}
                filteredTables={actions.filteredTables}
                tableSearch={actions.tableSearch}
                setTableSearch={actions.setTableSearch}
                tableLoading={actions.tableLoading}
                tableError={actions.tableError}
                selectedTable={actions.selectedTable}
                setSelectedTable={actions.setSelectedTable}
                selectedDatabase={actions.selectedDatabase}
                handleContextMenu={(e, tableName) => {
                    e.preventDefault();
                    e.stopPropagation();

                    actions.setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                            {
                                label: t('dbViewer.generateSELECT'),
                                onClick: () => actions.handleGenerateSql(tableName, 'SELECT')
                            },
                            {
                                label: t('dbViewer.generateINSERT'),
                                onClick: () => actions.handleGenerateSql(tableName, 'INSERT')
                            },
                            {
                                label: t('dbViewer.generateUPDATE'),
                                onClick: () => actions.handleGenerateSql(tableName, 'UPDATE')
                            },
                            {
                                label: t('dbViewer.generateDELETE'),
                                onClick: () => actions.handleGenerateSql(tableName, 'DELETE')
                            },
                            { divider: true },
                            {
                                label: t('dbViewer.copyTableName'),
                                onClick: async () => {
                                    await navigator.clipboard.writeText(tableName);
                                    actions.showToast(t('dbViewer.copiedSuccessfully'), 'success');
                                    actions.setContextMenu(null);
                                }
                            },
                            {
                                label: t('dbViewer.copyTRUNCATEStatement'),
                                onClick: async () => {
                                    const sql = `TRUNCATE TABLE \`${actions.selectedDatabase}\`.\`${tableName}\`;`;
                                    await navigator.clipboard.writeText(sql);
                                    actions.showToast(t('dbViewer.copiedSuccessfully'), 'success');
                                    actions.setContextMenu(null);
                                }
                            },
                            { divider: true },
                            {
                                label: t('dbViewer.exportTableStructure'),
                                onClick: () => actions.openExportModal('table-structure', tableName)
                            },
                            {
                                label: t('dbViewer.exportTableData'),
                                onClick: () => actions.openExportModal('table-data', tableName)
                            }
                        ]
                    });
                }}
            />

            {actions.contextMenu && (
                <ContextMenu
                    x={actions.contextMenu.x}
                    y={actions.contextMenu.y}
                    items={actions.contextMenu.items}
                    onClose={() => actions.setContextMenu(null)}
                />
            )}

            <ExportProgressModal
                isOpen={actions.exportModal.isOpen}
                onClose={() => actions.setExportModal({ isOpen: false, type: null })}
                onConfirm={actions.handleExport}
                title={
                    actions.exportModal.type === 'db-structure' ? t('dbViewer.exportDatabaseStructure') :
                        actions.exportModal.type === 'db-data' ? t('dbViewer.exportDatabaseData') :
                            actions.exportModal.type === 'table-structure' ? t('dbViewer.exportTableStructure') :
                                actions.exportModal.type === 'table-data' ? t('dbViewer.exportTableData') :
                                    ''
                }
                defaultFileName={
                    (() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hour = String(now.getHours()).padStart(2, '0');
                        const minute = String(now.getMinutes()).padStart(2, '0');
                        const second = String(now.getSeconds()).padStart(2, '0');
                        const timestamp = `${year}-${month}-${day}_${hour}-${minute}-${second}`;

                        if (actions.exportModal.type === 'db-structure') {
                            return `${actions.selectedDatabase}_ddl_${timestamp}.sql`;
                        } else if (actions.exportModal.type === 'db-data') {
                            return `${actions.selectedDatabase}_data_${timestamp}.sql`;
                        } else if (actions.exportModal.type === 'table-structure' && actions.exportModal.tableName) {
                            return `${actions.exportModal.tableName}_ddl_${timestamp}.sql`;
                        } else if (actions.exportModal.type === 'table-data' && actions.exportModal.tableName) {
                            return `${actions.exportModal.tableName}_data_${timestamp}.sql`;
                        }
                        return 'export.sql';
                    })()
                }
            />

            <ConvertDdlModal
                isOpen={actions.convertModal.isOpen}
                onClose={() => actions.setConvertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={actions.executeBatchConvert}
                sourceType={actions.convertModal.sourceType}
                defaultFileName={`${actions.selectedDatabase}_converted_${(() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hour = String(now.getHours()).padStart(2, '0');
                    const minute = String(now.getMinutes()).padStart(2, '0');
                    const second = String(now.getSeconds()).padStart(2, '0');
                    return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
                })()}.sql`}
                isConverting={actions.convertModal.isConverting}
                progress={actions.convertModal.progress}
            />

            <TruncateModal
                isOpen={actions.truncateModal}
                onClose={() => actions.setTruncateModal(false)}
                tables={actions.tables.map(t => t.name)}
                databaseName={actions.selectedDatabase || ''}
            />
        </div>
    );
};
