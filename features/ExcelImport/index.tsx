import React, { useState, useRef, useEffect } from 'react';
import {
    FileSpreadsheet, Upload, RefreshCw, Layers, FileCheck, Check,
    Play, Save, Database, ArrowRight, Table, Settings, Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Language, DbConnection, TableInfo, TableDetail } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { Tooltip } from '../../components/ui/Tooltip';
import { DatabaseService } from '../../services/database.service';
import { invoke } from '@tauri-apps/api/core';
import { getTexts } from '../../locales';
import { useGlobalStore } from '../../store/globalStore';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';

interface ImportProfile {
    id: string;
    title: string;
    targetTable?: string;
    connId?: string;
    db?: string;
    headerRowIdx: number;
    mappings: ColumnMapping[];
    updatedAt: number;
}

interface ExcelImportProps {
    lang: Language;
    connections: DbConnection[];
}

interface ColumnMapping {
    dbColumn: string;
    dbType: string;
    excelHeader: string; // 'A', 'B' or Header Name if header row exists
    isPk: boolean;
    comment?: string;
    customValue?: string; // For fixed values
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ lang, connections }) => {
    const { toast } = useToast();
    const t = getTexts(lang);
    const viewMode = useGlobalStore(state => state.viewMode);

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
    const [headerRowIdx, setHeaderRowIdx] = useState(1); // Default 1st row is header
    const [generatedSql, setGeneratedSql] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    // UI State
    const [splitHeight, setSplitHeight] = useState(200);
    const isResizing = useRef(false);

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('toolbox_excel_import_profiles');
        if (saved) {
            try {
                setProfiles(JSON.parse(saved));
            } catch (e) { console.error(e); }
        }
    }, []);

    const saveProfilesToLocal = (newProfiles: ImportProfile[]) => {
        localStorage.setItem('toolbox_excel_import_profiles', JSON.stringify(newProfiles));
    };

    const handleSaveProfile = () => {
        const now = Date.now();
        const profile: ImportProfile = {
            id: activeProfileId || now.toString(),
            title: profileTitle || (lang === 'zh' ? '未命名导入' : 'Untitled Import'),
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
        toast({ title: t.common.success });
    };

    const handleNewImport = () => {
        setActiveProfileId(null);
        setProfileTitle(lang === 'zh' ? '新建导入任务' : 'New Import Task');
        resetEditor();
        setView('editor');
    };

    const handleLoadProfile = (p: ImportProfile) => {
        setActiveProfileId(p.id);
        setProfileTitle(p.title);
        setSelectedConnId(p.connId || '');
        setSelectedDb(p.db || '');
        setSelectedTable(p.targetTable || '');
        setHeaderRowIdx(p.headerRowIdx);
        setMappings(p.mappings);
        setView('editor');
    };

    const handleDeleteProfile = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        saveProfilesToLocal(updated);
    };

    const resetEditor = () => {
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
    };

    // --- Resizer Logic ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newHeight = window.innerHeight - e.clientY - 60; // Adjust for some padding
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

    // --- File Handling ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
        let uploadedFile: File | null = null;
        if (e instanceof File) {
            uploadedFile = e;
        } else if (e.target.files && e.target.files[0]) {
            uploadedFile = e.target.files[0];
        }

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
    };

    // Select Sheet & Parse Headers
    useEffect(() => {
        if (workbook && selectedSheet) {
            const ws = workbook.Sheets[selectedSheet];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            setSheetData(data);

            // Extract headers from the specified row
            if (data && data.length >= headerRowIdx) {
                const headers = data[headerRowIdx - 1].map((cell: any) => String(cell));
                setSheetHeaders(headers);
            } else {
                setSheetHeaders([]);
            }
        }
    }, [workbook, selectedSheet, headerRowIdx]);

    // --- DB Handling ---
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
                    console.error(e);
                    toast({
                        title: lang === 'zh' ? '加载失败' : 'Load Failed',
                        description: lang === 'zh' ? '无法获取数据库列表' : 'Could not fetch databases',
                        variant: 'destructive'
                    });
                }
            };
            fetchDbs();
        }
    }, [selectedConnId, connections]);

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
                setMappings([]); // Clear previous mappings immediately

                try {
                    const res: TableDetail = await DatabaseService.getTableSchema(conn, selectedDb, selectedTable);
                    if (!res || !res.columns) throw new Error('Invalid table schema returned');

                    const schema = res.columns.map(c => ({
                        name: c.name,
                        type: c.type,
                        comment: c.comment,
                        pk: c.isPrimaryKey
                    }));
                    setTableSchema(schema);

                    // Auto-Map
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
                    console.error('Failed to fetch columns:', e);
                    toast({
                        title: lang === 'zh' ? '加载结构失败' : 'Failed to load schema',
                        description: e.message || (lang === 'zh' ? '无法获取表结构信息' : 'Could not fetch table schema'),
                        variant: 'destructive'
                    });
                } finally {
                    setIsLoadingColumns(false);
                }
            };
            fetchColumns();
        } else {
            setTableSchema([]);
            setMappings([]);
        }
    }, [selectedConnId, selectedDb, selectedTable, sheetHeaders, connections, lang, toast]);


    // --- Logic ---
    const handleGenerate = () => {
        if (!selectedTable || sheetData.length <= headerRowIdx) return;

        const rows = sheetData.slice(headerRowIdx); // Skip header
        const keys = mappings.filter(m => m.excelHeader || m.customValue);

        if (keys.length === 0) {
            setGeneratedSql('-- No mappings configured');
            return;
        }

        let sql = `-- Import to ${selectedTable}\n`;
        // Batch INSERT? Or Multi-Value? 
        // Let's do batches of 100 for display

        const columns = keys.map(k => `\`${k.dbColumn}\``).join(', ');
        let valuesBatch: string[] = [];

        rows.forEach((row, idx) => {
            if (row.length === 0) return;

            const values = keys.map(m => {
                if (m.customValue) return `'${m.customValue}'`;

                // Find index of header
                const colIdx = sheetHeaders.indexOf(m.excelHeader);
                if (colIdx === -1) return 'NULL';

                let val = row[colIdx];
                if (val === undefined || val === null) return 'NULL';

                // Simple escaping
                val = String(val).replace(/'/g, "\\'");
                return `'${val}'`;
            });

            valuesBatch.push(`(${values.join(', ')})`);
        });

        if (valuesBatch.length > 0) {
            sql += `INSERT INTO \`${selectedTable}\` (${columns}) VALUES\n`;
            sql += valuesBatch.join(',\n') + ';';
        } else {
            sql += '-- No data found';
        }

        setGeneratedSql(sql);
    };

    // Drag & Drop
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    if (view === 'home') {
        return (
            <div className="h-full flex flex-col animate-in fade-in">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <FileSpreadsheet className="mr-3 text-green-600" />
                        {t.excelImport.title}
                    </h2>
                    <div className="flex items-center space-x-3">
                        <ViewModeToggle />
                        <button
                            onClick={handleNewImport}
                            className="min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors"
                        >
                            <Plus size={18} className="mr-2" />
                            {lang === 'zh' ? '新建导入任务' : 'New Import Task'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {profiles.map(p => (
                            <Tooltip key={p.id} content={p.title} position="top">
                                <div
                                    onClick={() => handleLoadProfile(p)}
                                    className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] flex flex-col"
                                >
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/30 to-transparent dark:from-green-900/20 dark:via-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDeleteProfile(e, p.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="relative z-10 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 group-hover:scale-110 transition-transform duration-300">
                                                <FileSpreadsheet size={24} />
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                            {p.title}
                                        </h3>
                                        <div className="text-sm text-slate-500 font-mono mb-auto truncate">
                                            {p.targetTable ? `-> ${p.targetTable}` : 'No target'}
                                        </div>
                                        <div className="flex items-center text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-4">
                                            <Settings size={12} className="mr-1" />
                                            {new Date(p.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        ))}

                        {/* New Import Card - 放在最后 */}
                        <div
                            onClick={handleNewImport}
                            className="group p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[200px] flex flex-col items-center justify-center"
                        >
                            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                {lang === 'zh' ? '新建导入任务' : 'New Import Task'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                            <div className="col-span-4">{lang === 'zh' ? '任务名称' : 'Profile Name'}</div>
                            <div className="col-span-4">{lang === 'zh' ? '目标表' : 'Target Table'}</div>
                            <div className="col-span-3">{lang === 'zh' ? '更新时间' : 'Last Updated'}</div>
                            <div className="col-span-1 text-center">{lang === 'zh' ? '操作' : 'Actions'}</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {profiles.length === 0 && (
                                <div className="px-6 py-8 text-center text-slate-400 italic text-sm">
                                    {lang === 'zh' ? '暂无记录，请点击右上角新建' : 'No profiles found'}
                                </div>
                            )}
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleLoadProfile(p)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                                >
                                    <div className="col-span-4 flex items-center space-x-3">
                                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex-shrink-0">
                                            <FileSpreadsheet size={16} />
                                        </div>
                                        <span className="font-medium text-slate-800 dark:text-white truncate">{p.title}</span>
                                    </div>
                                    <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                                        {p.targetTable || '-'}
                                    </div>
                                    <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                        {new Date(p.updatedAt).toLocaleDateString()}
                                    </div>
                                    <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDeleteProfile(e, p.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-300">
            {/* Editor Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('home')}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={t.excelImport.exit}
                    >
                        <ArrowRight className="rotate-180" size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                value={profileTitle}
                                onChange={e => setProfileTitle(e.target.value)}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                                className="bg-white dark:bg-slate-900 border border-blue-500 rounded px-2 py-1 text-lg font-bold outline-none"
                            />
                        ) : (
                            <h2
                                onClick={() => setIsEditingTitle(true)}
                                className="text-lg font-bold text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors flex items-center"
                            >
                                {profileTitle}
                                <Settings size={14} className="ml-2 opacity-30" />
                            </h2>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-md transition-all active:scale-95"
                >
                    <Save size={18} className="mr-2" />
                    {t.common.save}
                </button>
            </div>

            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                {/* LEFT: File Source */}
                <div className="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                        {lang === 'zh' ? '源文件 (Excel)' : 'Source File'}
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-4">
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                                ${isDragging ? 'border-green-500 bg-green-50' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}
                            `}
                        >
                            <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                            {file ? (
                                <div className="text-center">
                                    <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{file.name}</div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400">
                                    <Upload className="w-6 h-6 mx-auto mb-2" />
                                    <span className="text-xs">{lang === 'zh' ? '点击或拖拽上传' : 'Click/Drag to Upload'}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                <Layers size={14} className="mr-2 text-slate-500" />
                                <span className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '工作表' : 'Sheets'}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {sheets.map(sheet => (
                                    <button
                                        key={sheet}
                                        onClick={() => setSelectedSheet(sheet)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${selectedSheet === sheet
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <span className="truncate">{sheet}</span>
                                        {selectedSheet === sheet && <Check size={14} />}
                                    </button>
                                ))}
                                {sheets.length === 0 && <div className="text-center py-4 text-xs text-slate-400 italic">No sheets</div>}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">{lang === 'zh' ? '标题行号' : 'Header Row'}</label>
                            <input
                                type="number"
                                min="1"
                                value={headerRowIdx}
                                onChange={e => setHeaderRowIdx(parseInt(e.target.value) || 1)}
                                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Config & Mapping */}
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.dataCompare.selectConn}</label>
                                <select
                                    value={selectedConnId}
                                    onChange={e => setSelectedConnId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="" className="text-slate-400">Select Connection</option>
                                    {connections.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800">{c.name} ({c.type})</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.dataCompare.selectDb}</label>
                                <select
                                    value={selectedDb}
                                    onChange={e => setSelectedDb(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                    disabled={!selectedConnId}
                                >
                                    <option value="" className="text-slate-400">Select Database</option>
                                    {dbs.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800">{d}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.dataCompare.selectTable}</label>
                                <select
                                    value={selectedTable}
                                    onChange={e => setSelectedTable(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                    disabled={!selectedDb}
                                >
                                    <option value="" className="text-slate-400">Select Table</option>
                                    {tables.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-800">{t}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedTable || !selectedSheet}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                <Play size={16} className="mr-2" />
                                {t.common.generate}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{t.excelImport.title}</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {isLoadingColumns ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <RefreshCw className="w-10 h-10 mb-2 animate-spin opacity-20" />
                                    <p>{t.common.loading}</p>
                                </div>
                            ) : tableSchema.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Settings className="w-10 h-10 mb-2 opacity-20" />
                                    <p>{lang === 'zh' ? '请先选择目标表' : 'Please select a target table'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-12 gap-x-4 gap-y-2 items-center text-sm">
                                    <div className="col-span-4 font-bold text-slate-500 text-[10px] uppercase mb-2">{t.excelImport.targetCol}</div>
                                    <div className="col-span-1 text-center font-bold text-slate-500 text-[10px] uppercase mb-2">{t.excelImport.arrow}</div>
                                    <div className="col-span-4 font-bold text-slate-500 text-[10px] uppercase mb-2">{t.excelImport.sourceHeader}</div>
                                    <div className="col-span-3 font-bold text-slate-500 text-[10px] uppercase mb-2">{t.excelImport.defaultValue}</div>

                                    {mappings.map((m, idx) => (
                                        <React.Fragment key={m.dbColumn}>
                                            <div className="col-span-4 flex items-center">
                                                <span className={`font-mono mr-2 truncate ${m.isPk ? 'text-blue-600 font-bold underline' : 'text-slate-700 dark:text-slate-300'}`} title={m.comment}>{m.dbColumn}</span>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">{m.dbType}</span>
                                            </div>
                                            <div className="col-span-1 flex justify-center text-slate-300">
                                                <ArrowRight size={14} />
                                            </div>
                                            <div className="col-span-4">
                                                <select
                                                    value={m.excelHeader}
                                                    onChange={e => {
                                                        const newMappings = [...mappings];
                                                        newMappings[idx].excelHeader = e.target.value;
                                                        newMappings[idx].customValue = '';
                                                        setMappings(newMappings);
                                                    }}
                                                    className={`w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded text-xs text-slate-800 dark:text-white outline-none ${m.excelHeader ? 'border-green-300 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'}`}
                                                >
                                                    <option value="">(Ignore)</option>
                                                    {sheetHeaders.map(h => <option key={h} value={h} className="bg-white dark:bg-slate-800">{h}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder="Fixed Val"
                                                    value={m.customValue || ''}
                                                    onChange={e => {
                                                        const newMappings = [...mappings];
                                                        newMappings[idx].customValue = e.target.value;
                                                        newMappings[idx].excelHeader = '';
                                                        setMappings(newMappings);
                                                    }}
                                                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/30"
                                                />
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resizer */}
                        <div
                            onMouseDown={() => { isResizing.current = true; }}
                            className="h-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-ns-resize transition-colors"
                        />

                        {/* Bottom: SQL Preview */}
                        <div style={{ height: splitHeight }} className="bg-slate-900 flex flex-col shrink-0 overflow-hidden relative group">
                            <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                                <span className="font-bold text-[10px] text-slate-500 uppercase">SQL Preview</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedSql);
                                        toast({ title: t.common.copied });
                                    }}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center bg-blue-900/20 px-2 py-0.5 rounded"
                                    disabled={!generatedSql}
                                >
                                    <Save size={10} className="mr-1" /> Copy
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-3 text-green-400 font-mono text-xs whitespace-pre-wrap select-text">
                                {generatedSql || '// generated sql result here...'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const X = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);
