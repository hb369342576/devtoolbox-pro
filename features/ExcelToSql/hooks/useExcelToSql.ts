import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from "react-i18next";
import { ExcelTemplate } from '../../../types';

const DEFAULT_TEMPLATES: ExcelTemplate[] = [
    {
        id: 'tpl_default',
        name: 'Standard Data Dictionary',
        description: 'Row 1 Header, Data starts Row 2. Col A:Name, B:Type, C:Comment',
        dataStartRow: 2,
        nameCol: 'A',
        typeCol: 'B',
        commentCol: 'C'
    },
    {
        id: 'tpl_simple',
        name: 'Simple Key-Value',
        description: 'Col A: Field Name, Col B: Data Type',
        dataStartRow: 1,
        nameCol: 'A',
        typeCol: 'B',
        commentCol: '',
        pkCol: ''
    }
];

export const useExcelToSql = () => {
    const { t } = useTranslation();

    // State for Templates
    const [templates, setTemplates] = useState<ExcelTemplate[]>(() => {
        const saved = localStorage.getItem('excel_templates');
        return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    });
    const [activeTemplate, setActiveTemplateState] = useState<ExcelTemplate | null>(null);

    // Generator State
    const [file, setFile] = useState<File | null>(null);
    const [dbType, setDbType] = useState<'mysql' | 'doris'>('mysql');
    const [generatedSql, setGeneratedSql] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [sheets, setSheets] = useState<string[]>([]);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
    const [tableName, setTableName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save templates to localStorage
    useEffect(() => {
        localStorage.setItem('excel_templates', JSON.stringify(templates));
    }, [templates]);

    useEffect(() => {
        if (selectedSheet) {
            setTableName(selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
        } else {
            setTableName('');
        }
    }, [selectedSheet]);

    // Session Store
    const sessionsRef = useRef<Record<string, {
        file: File | null;
        workbook: XLSX.WorkBook | null;
        sheets: string[];
        selectedSheet: string | null;
        tableName: string;
        generatedSql: string;
    }>>({});

    const saveCurrentSession = () => {
        if (!activeTemplate) return;
        sessionsRef.current[activeTemplate.id] = {
            file,
            workbook,
            sheets,
            selectedSheet,
            tableName,
            generatedSql
        };
    };

    const loadSession = (tplId: string) => {
        const session = sessionsRef.current[tplId];
        if (session) {
            setFile(session.file);
            setWorkbook(session.workbook);
            setSheets(session.sheets);
            setSelectedSheet(session.selectedSheet);
            setTableName(session.tableName);
            setGeneratedSql(session.generatedSql);
        } else {
            setFile(null);
            setWorkbook(null);
            setSheets([]);
            setSelectedSheet(null);
            setTableName('');
            setGeneratedSql('');
        }
        setIsProcessing(false);
    };

    const handleSwitchTemplate = (tpl: ExcelTemplate | null) => {
        if (activeTemplate) {
            saveCurrentSession();
        }
        setActiveTemplateState(tpl);
        if (tpl) {
            loadSession(tpl.id);
        } else {
            setFile(null);
            setWorkbook(null);
            setSheets([]);
            setSelectedSheet(null);
            setTableName('');
            setGeneratedSql('');
        }
    };

    const updateActiveTemplate = (tpl: ExcelTemplate) => {
        setActiveTemplateState(tpl);
        setTemplates(prev => {
            const exists = prev.find(p => p.id === tpl.id);
            if (exists) {
                return prev.map(p => p.id === tpl.id ? tpl : p);
            }
            return [...prev, tpl];
        });
    };

    const handleAddNew = () => {
        if (activeTemplate) {
            saveCurrentSession();
        }
        const newTpl: ExcelTemplate = {
            id: Date.now().toString(),
            name: t('common.newSyncJob', { defaultValue: '新建任务' }),
            description: '',
            dataStartRow: 2,
            nameCol: 'A',
            typeCol: 'B',
            commentCol: 'C'
        };
        setActiveTemplateState(newTpl);
        setTemplates(prev => [...prev, newTpl]);
        loadSession(newTpl.id);
    };

    const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            setTemplates(prev => prev.filter(t => t.id !== deleteId));
            if (activeTemplate?.id === deleteId) {
                handleSwitchTemplate(null);
            }
            setDeleteId(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileLoad(e.target.files[0]);
        }
    };

    const handleFileLoad = (uploadedFile: File) => {
        setFile(uploadedFile);
        setSheets([]);
        setSelectedSheet(null);
        setGeneratedSql('');
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
    };

    const getColIndex = (col: string): number => {
        if (!col) return -1;
        let index = 0;
        for (let i = 0; i < col.length; i++) {
            index = index * 26 + col.charCodeAt(i) - 64;
        }
        return index - 1;
    };

    const generateSql = async () => {
        if (!workbook || !selectedSheet || !activeTemplate) return;
        setIsProcessing(true);

        try {
            const ws = workbook.Sheets[selectedSheet];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            const startRowIdx = Math.max(0, activeTemplate.dataStartRow - 1);
            const nameIdx = getColIndex(activeTemplate.nameCol);
            const typeIdx = getColIndex(activeTemplate.typeCol);
            const commentIdx = getColIndex(activeTemplate.commentCol);
            const pkIdx = getColIndex(activeTemplate.pkCol || '');

            let fields: { sql: string, isPk: boolean, name: string }[] = [];
            let pks: string[] = [];

            for (let i = startRowIdx; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const name = nameIdx >= 0 ? row[nameIdx] : null;
                const type = typeIdx >= 0 ? row[typeIdx] : null;

                if (name && type) {
                    const comment = commentIdx >= 0 ? row[commentIdx] : '';
                    const isPk = pkIdx >= 0 ? (['y', 'yes', '1', '是'].includes(String(row[pkIdx]).toLowerCase())) : false;

                    let fieldSql = `  \`${name}\` ${type}`;
                    if (dbType === 'mysql') {
                        if (comment) fieldSql += ` COMMENT '${comment}'`;
                    } else {
                        if (comment) fieldSql += ` COMMENT '${comment}'`;
                    }

                    fields.push({ sql: fieldSql, isPk, name: `\`${name}\`` });
                    if (isPk) pks.push(`\`${name}\``);
                }
            }

            if (dbType === 'doris') {
                fields.sort((a, b) => {
                    if (a.isPk && !b.isPk) return -1;
                    if (!a.isPk && b.isPk) return 1;
                    return 0;
                });
            }

            const fieldStrings = fields.map(f => f.sql);
            const finalTableName = tableName ? tableName.trim() : selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            let sql = '';

            if (dbType === 'mysql') {
                sql = `CREATE TABLE IF NOT EXISTS \`${finalTableName}\` (\n`;
                sql += fieldStrings.join(',\n');
                if (pks.length > 0) {
                    sql += `,\n  PRIMARY KEY (${pks.join(', ')})`;
                }
                sql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Generated from ${selectedSheet}';`;
            } else {
                sql = `CREATE TABLE IF NOT EXISTS \`${finalTableName}\` (\n`;
                sql += fieldStrings.join(',\n');
                sql += `\n) ENGINE=OLAP\n`;
                if (pks.length > 0) {
                    sql += `UNIQUE KEY(${pks.join(', ')})\n`;
                }
                sql += `DISTRIBUTED BY HASH(\`${pks[0] || 'id'}\`) BUCKETS 10\nPROPERTIES (\n  "replication_num" = "1"\n);`;
            }

            setGeneratedSql(sql);

        } catch (e) {
            console.error("SQL Gen Error", e);
            setGeneratedSql(`-- Error generating SQL: ${e}`);
        }

        setIsProcessing(false);
    };

    return {
        templates,
        activeTemplate,
        file,
        dbType,
        setDbType,
        generatedSql,
        isProcessing,
        sheets,
        selectedSheet,
        setSelectedSheet,
        tableName,
        setTableName,
        isDragging,
        setIsDragging,
        deleteId,
        setDeleteId,
        fileInputRef,
        handleSwitchTemplate,
        updateActiveTemplate,
        handleAddNew,
        handleDeleteTemplate,
        confirmDelete,
        handleFileChange,
        handleFileLoad,
        generateSql
    };
};
