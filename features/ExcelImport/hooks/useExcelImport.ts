import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from "react-i18next";
import { useToast } from '../../common/Toast';
import { DatabaseService } from '../../../services/database.service';
import { DbConnection, TableDetail } from '../../../types';
import { ImportProfile, ColumnMapping } from '../types';

export const useExcelImport = (connections: DbConnection[]) => {
    const { toast } = useToast();
    const { t } = useTranslation();

    // Global View State
    const [view, setView] = useState<'home' | 'editor'>('home');
    const [profiles, setProfiles] = useState<ImportProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [profileTitle, setProfileTitle] = useState('');

    // File State
    const [file, setFile] = useState<File | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[][]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Target State
    const [selectedConnId, setSelectedConnId] = useState<string>('');
    const [selectedDb, setSelectedDb] = useState<string>('');
    const [dbs, setDbs] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tables, setTables] = useState<string[]>([]);
    const [tableSchema, setTableSchema] = useState<{ name: string, type: string, comment?: string, pk?: boolean }[]>([]);

    // Mapping State
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [headerRowIdx, setHeaderRowIdx] = useState(1);
    const [generatedSql, setGeneratedSql] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    // UI State
    const [splitHeight, setSplitHeight] = useState(200);
    const isResizing = useRef(false);

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('toolbox_excel_import_profiles');
        if (saved) {
            try { setProfiles(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, []);

    const saveProfilesToLocal = useCallback((newProfiles: ImportProfile[]) => {
        localStorage.setItem('toolbox_excel_import_profiles', JSON.stringify(newProfiles));
    }, []);

    const handleSaveProfile = useCallback(() => {
        const now = Date.now();
        const profile: ImportProfile = {
            id: activeProfileId || now.toString(),
            title: profileTitle || t('excel_import.untitled'),
            targetTable: selectedTable,
            connId: selectedConnId,
            db: selectedDb,
            headerRowIdx,
            mappings,
            updatedAt: now
        };

        const updated = activeProfileId
            ? profiles.map(p => p.id === activeProfileId ? profile : p)
            : [profile, ...profiles];

        setProfiles(updated);
        saveProfilesToLocal(updated);
        setActiveProfileId(profile.id);
        toast({ message: t('common.success'), type: 'success' });
    }, [activeProfileId, selectedTable, selectedConnId, selectedDb, headerRowIdx, mappings, profiles, saveProfilesToLocal, t, toast, profileTitle]);

    const resetEditor = useCallback(() => {
        setFile(null);
        setWorkbook(null);
        setSheets([]);
        setSelectedSheet(null);
        setSheetHeaders([]);
        setSheetData([]);
        setSelectedConnId('');
        setSelectedDb('');
        setSelectedTable('');
        setTableSchema([]);
        setMappings([]);
        setGeneratedSql('');
    }, []);

    const handleNewImport = useCallback(() => {
        setActiveProfileId(null);
        setProfileTitle(t('excel_import.newImportTask'));
        resetEditor();
        setView('editor');
    }, [t, resetEditor]);

    const handleLoadProfile = useCallback((p: ImportProfile) => {
        setActiveProfileId(p.id);
        setProfileTitle(p.title);
        setSelectedConnId(p.connId || '');
        setSelectedDb(p.db || '');
        setSelectedTable(p.targetTable || '');
        setHeaderRowIdx(p.headerRowIdx);
        setMappings(p.mappings);
        setView('editor');
    }, []);

    const handleDeleteProfile = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        saveProfilesToLocal(updated);
    }, [profiles, saveProfilesToLocal]);

    // Resizer Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newHeight = window.innerHeight - e.clientY - 60;
            setSplitHeight(Math.max(100, Math.min(600, newHeight)));
        };
        const handleMouseUp = () => { isResizing.current = false; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // File Handling
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File) => {
        let uploadedFile: File | null = null;
        if (e instanceof File) uploadedFile = e;
        else if (e.target.files && e.target.files[0]) uploadedFile = e.target.files[0];

        if (uploadedFile) {
            setFile(uploadedFile);
            setSheets([]);
            setSelectedSheet(null);
            setWorkbook(null);
            setIsProcessing(true);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                if (bstr) {
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    setWorkbook(wb);
                    setSheets(wb.SheetNames);
                }
                setIsProcessing(false);
            };
            reader.readAsBinaryString(uploadedFile);
        }
    }, []);

    // Select Sheet & Parse Headers
    useEffect(() => {
        if (workbook && selectedSheet) {
            const ws = workbook.Sheets[selectedSheet];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            setSheetData(data);
            if (data && data.length >= headerRowIdx) {
                const headers = data[headerRowIdx - 1].map((cell: any) => String(cell));
                setSheetHeaders(headers);
            } else {
                setSheetHeaders([]);
            }
        }
    }, [workbook, selectedSheet, headerRowIdx]);

    // DB Handling
    useEffect(() => {
        if (selectedConnId) {
            const conn = connections.find(c => c.id === selectedConnId);
            if (!conn) return;
            setDbs([]);
            setSelectedDb('');
            setTables([]);
            setSelectedTable('');

            const fetchDbs = async () => {
                try {
                    const res = await DatabaseService.getDatabases(conn);
                    setDbs(res || []);
                } catch (e) {
                    toast({ title: t('common.loadFailed'), variant: 'error' });
                }
            };
            fetchDbs();
        }
    }, [selectedConnId, connections, t]);

    useEffect(() => {
        if (selectedConnId && selectedDb) {
            const conn = connections.find(c => c.id === selectedConnId);
            if (!conn) return;
            setTables([]);
            setSelectedTable('');

            const fetchTables = async () => {
                try {
                    const res = await DatabaseService.getTables(conn, selectedDb);
                    setTables(res.map(t => typeof t === 'string' ? t : t.name) || []);
                } catch (e) {
                    console.error(e);
                }
            };
            fetchTables();
        }
    }, [selectedConnId, selectedDb, connections]);

    useEffect(() => {
        if (selectedConnId && selectedDb && selectedTable) {
            const conn = connections.find(c => c.id === selectedConnId);
            if (!conn) return;

            const fetchColumns = async () => {
                setIsLoadingColumns(true);
                setTableSchema([]);
                setMappings([]);

                try {
                    const res: TableDetail = await DatabaseService.getTableSchema(conn, selectedDb, selectedTable);
                    if (!res || !res.columns) throw new Error('Invalid schema');

                    const schema = res.columns.map(c => ({
                        name: c.name,
                        type: (c as any).col_type || c.type, // Handle depending on exact backend type
                        comment: c.comment,
                        pk: (c as any).is_primary_key || (c as any).isPrimaryKey || false
                    }));
                    setTableSchema(schema);

                    const newMappings = schema.map(col => {
                        const match = sheetHeaders.find(h =>
                            h.toLowerCase() === col.name.toLowerCase() ||
                            h.toLowerCase().replace(/_/g, '') === col.name.toLowerCase().replace(/_/g, '')
                        );
                        return {
                            dbColumn: col.name,
                            dbType: col.type,
                            excelHeader: match || '',
                            isPk: !!col.pk,
                            comment: col.comment
                        };
                    });
                    setMappings(newMappings);
                } catch (e: any) {
                    toast({ message: t('excel_import.loadingSchemaFailed'), variant: 'error' });
                } finally {
                    setIsLoadingColumns(false);
                }
            };
            fetchColumns();
        } else {
            setTableSchema([]);
            setMappings([]);
        }
    }, [selectedConnId, selectedDb, selectedTable, sheetHeaders, connections, t]);

    const handleGenerate = useCallback(() => {
        if (!selectedTable || sheetData.length <= headerRowIdx) return;
        const rows = sheetData.slice(headerRowIdx);
        const keys = mappings.filter(m => m.excelHeader || m.customValue);

        if (keys.length === 0) {
            setGeneratedSql(`-- ${t('excel_import.noMappings')}`);
            return;
        }

        let sql = `-- Import to ${selectedTable}\n`;
        const columns = keys.map(k => `\`${k.dbColumn}\``).join(', ');
        let valuesBatch: string[] = [];

        rows.forEach(row => {
            if (row.length === 0) return;
            const values = keys.map(m => {
                if (m.customValue) return `'${m.customValue}'`;
                const colIdx = sheetHeaders.indexOf(m.excelHeader);
                if (colIdx === -1) return 'NULL';
                let val = row[colIdx];
                if (val === undefined || val === null) return 'NULL';
                val = String(val).replace(/'/g, "\\'");
                return `'${val}'`;
            });
            valuesBatch.push(`(${values.join(', ')})`);
        });

        if (valuesBatch.length > 0) {
            sql += `INSERT INTO \`${selectedTable}\` (${columns}) VALUES\n`;
            sql += valuesBatch.join(',\n') + ';';
        } else {
            sql += `-- ${t('common.noRecords')}`;
        }
        setGeneratedSql(sql);
    }, [selectedTable, sheetData, headerRowIdx, mappings, sheetHeaders, t]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }, [handleFileChange]);

    return {
        view, setView,
        profiles,
        isEditingTitle, setIsEditingTitle,
        profileTitle, setProfileTitle,
        file, sheets, selectedSheet, setSelectedSheet,
        isDragging, setIsDragging, fileInputRef,
        selectedConnId, setSelectedConnId,
        selectedDb, setSelectedDb, dbs,
        selectedTable, setSelectedTable, tables, tableSchema,
        mappings, setMappings,
        headerRowIdx, setHeaderRowIdx,
        generatedSql, isProcessing, isLoadingColumns,
        splitHeight, isResizing, sheetHeaders,
        
        handleSaveProfile, handleNewImport, handleLoadProfile, handleDeleteProfile,
        handleFileChange, onDrop, handleGenerate
    };
};
