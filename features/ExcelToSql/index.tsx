import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, Upload, RefreshCw, Layers, FileCheck, Check,
  Play, Plus, Trash2, ChevronLeft, Save, Table
} from 'lucide-react';
import { Language, ExcelTemplate } from '../../types';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import * as XLSX from 'xlsx';
import { useToast, ToastProvider } from '../../components/ui/Toast';

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

export const ExcelToSql: React.FC<{ lang: Language }> = ({ lang }) => {
  return (
    <ToastProvider>
      <ExcelToSqlContent lang={lang} />
    </ToastProvider>
  );
};

const ExcelToSqlContent: React.FC<{ lang: Language }> = ({ lang }) => {
  const { toast } = useToast();

  // State for View Switching - use global viewMode
  // const activeTemplate = useState<ExcelTemplate | null>(null)[0];  <-- BUG WAS HERE
  // const setActiveTemplate = useState<ExcelTemplate | null>(null)[1]; <-- BUG WAS HERE
  const [activeTemplate, setActiveTemplateState] = useState<ExcelTemplate | null>(null);

  // This is now purely for syncing lists, NOT for switching ID
  // Renamed or we just remove it and use updateActiveTemplate? 
  // The original one is still needed for list sync? 
  // Let's comment this out or repurpose.
  // We'll replace it entirely with updateActiveTemplate logic above.

  // const setActiveTemplate = ... (REMOVED)

  const viewMode = useViewMode();

  // State for Templates
  const [templates, setTemplates] = useState<ExcelTemplate[]>(() => {
    const saved = localStorage.getItem('excel_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  // Generator State
  const [file, setFile] = useState<File | null>(null);
  const [dbType, setDbType] = useState<'mysql' | 'doris'>('mysql');
  const [generatedSql, setGeneratedSql] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    if (selectedSheet) {
      // Default table name: lowercase, special chars to underscore
      setTableName(selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    } else {
      setTableName('');
    }
  }, [selectedSheet]);


  const [isDragging, setIsDragging] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('excel_templates', JSON.stringify(templates));
  }, [templates]);

  // --- Handlers for Templates ---

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      setTemplates(prev => prev.filter(t => t.id !== deleteId));
      if (activeTemplate?.id === deleteId) {
        setActiveTemplate(null);
      }
      setDeleteId(null);
    }
  };

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
    // 1. Save current if exists
    if (activeTemplate) {
      saveCurrentSession();
    }

    // 2. Set new template
    setActiveTemplateState(tpl);

    // 3. Load new session or clear
    if (tpl) {
      loadSession(tpl.id);
    } else {
      // Back to list, clear visible state (optional, but good for cleanliness)
      setFile(null);
      setWorkbook(null);
      setSheets([]);
      setSelectedSheet(null);
      setTableName('');
      setGeneratedSql('');
    }
  };

  const wrapSetActiveTemplate = (tpl: ExcelTemplate | null) => {
    // Logic moved to handleSwitchTemplate, but we also need to sync the list update logic
    // The original setActiveTemplate did two things: update active state AND update list
    // We will keep the original 'setActiveTemplate' ONLY for list syncing (renaming it),
    // and use handleSwitchTemplate for navigation.

    // ACTUALLY: The original setActiveTemplate was doing double duty.
    // Let's split it:
    // 1. 'updateTemplateInList' -> syncs changes (name/desc) to list
    // 2. 'handleSwitchTemplate' -> navigation + session sync

    // For now, to minimize diff, let's just make handleSwitchTemplate call the original setActiveTemplate
    // BUT WAIT: The original setActiveTemplate calls setActiveTemplateState immediately.
    handleSwitchTemplate(tpl);
  };

  // Re-define the original to just be the list-syncer if tpl is not null
  // But wait, the Inputs call setActiveTemplate to update name/desc. 
  // We need to differentiate "Switching" vs "Editing".

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
    // Save current if any
    if (activeTemplate) {
      saveCurrentSession();
    }

    const newTpl: ExcelTemplate = {
      id: Date.now().toString(),
      name: lang === 'zh' ? '新解析模板' : 'New Template',
      description: '',
      dataStartRow: 2,
      nameCol: 'A',
      typeCol: 'B',
      commentCol: 'C'
    };

    // updateActiveTemplate handles the state/list update, but we need to init the session
    setActiveTemplateState(newTpl);
    setTemplates(prev => [...prev, newTpl]);

    // Clear for new
    loadSession(newTpl.id); // Will be empty
  };

  // --- Handlers for Generator ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
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
    }
  };

  const getColIndex = (col: string): number => {
    if (!col) return -1;
    // Convert A -> 0, B -> 1, AA -> 26
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

      // For Doris, PK columns must be defined first
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

  // --- RENDER: List View ---
  if (!activeTemplate) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
            <FileSpreadsheet className="mr-3 text-green-600" />
            {lang === 'zh' ? 'Excel 建表器 - 模板选择' : 'Excel Builder - Select Template'}
          </h2>
          <div className="flex items-center space-x-3">
            <ViewModeToggle />
            <button onClick={handleAddNew} className="min-w-[140px] px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg transition-colors">
              <Plus size={18} className="mr-2" />
              {lang === 'zh' ? '新建模板' : 'New Template'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleSwitchTemplate(tpl)}
                  className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/30 to-transparent dark:from-green-900/20 dark:via-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                        <Table size={24} />
                      </div>
                      <div className="flex space-x-1">
                        {/* Edit button is redundant now, clicking the card does the same, but could specific editing? No, same view. */}
                        <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{tpl.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-10">{tpl.description || (lang === 'zh' ? '无描述' : 'No description')}</p>

                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                      <span title="Start Row">Row:{tpl.dataStartRow}</span>
                      <span className="text-slate-300">|</span>
                      <span title="Name Column">N:{tpl.nameCol}</span>
                      <span className="text-slate-300">|</span>
                      <span title="Type Column">T:{tpl.typeCol}</span>
                      <span className="text-slate-300">|</span>
                      <span title="Comment Column">C:{tpl.commentCol || '-'}</span>
                      {tpl.pkCol && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span title="PK Column" className="text-blue-500 font-bold">PK:{tpl.pkCol}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={handleAddNew} className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-green-500 hover:border-green-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[200px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><Plus size={24} /></div>
                <span className="font-medium">{lang === 'zh' ? '添加新解析规则' : 'Add New Rule'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">{lang === 'zh' ? '模板名称' : 'Template Name'}</div>
                <div className="col-span-4">{lang === 'zh' ? '描述' : 'Description'}</div>
                <div className="col-span-3">{lang === 'zh' ? '规则(行|列)' : 'Rules (Row | Cols)'}</div>
                <div className="col-span-1 text-right">{lang === 'zh' ? '操作' : 'Actions'}</div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSwitchTemplate(tpl)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                        <Table size={16} />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white truncate">{tpl.name}</span>
                    </div>
                    <div className="col-span-4 text-sm text-slate-500 dark:text-slate-400 truncate">
                      {tpl.description}
                    </div>
                    <div className="col-span-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                      Start: {tpl.dataStartRow} | Cols: N:{tpl.nameCol}, T:{tpl.typeCol}, C:{tpl.commentCol || '-'} {tpl.pkCol ? `, PK:${tpl.pkCol}` : ''}
                    </div>
                    <div className="col-span-1 flex justify-end space-x-2">
                      <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="px-6 py-8 text-center text-slate-400 text-sm italic">{lang === 'zh' ? '暂无模板' : 'No templates found'}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Removed - but we need ConfirmModal here now */}
        <ConfirmModal
          isOpen={!!deleteId}
          title={lang === 'zh' ? '删除模板' : 'Delete Template'}
          message={lang === 'zh' ? '您确定要删除此解析模板吗？此操作无法撤销。' : 'Are you sure you want to delete this parsing template? This action cannot be undone.'}
          confirmText={lang === 'zh' ? '删除' : 'Delete'}
          cancelText={lang === 'zh' ? '取消' : 'Cancel'}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          type="danger"
        />
      </div>
    );
  }

  // --- RENDER: Generator View ---
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center space-x-3 w-full">
          <button onClick={() => handleSwitchTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors shrink-0">
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
            {/* Name Input */}
            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">{lang === 'zh' ? '模板名称' : 'Template Name'}</label>
              <input
                type="text"
                value={activeTemplate.name}
                onChange={(e) => updateActiveTemplate({ ...activeTemplate, name: e.target.value })}
                className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none text-sm pb-1"
                placeholder="Template Name"
              />
            </div>

            {/* Description Input */}
            <div className="flex-[2] w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">{lang === 'zh' ? '描述' : 'Description'}</label>
              <input
                type="text"
                value={activeTemplate.description || ''}
                onChange={(e) => updateActiveTemplate({ ...activeTemplate, description: e.target.value })}
                className="w-full bg-transparent text-slate-600 dark:text-slate-300 outline-none text-sm pb-1"
                placeholder="Description"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left: Excel File & Sheets */}
        <div className="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
            {lang === 'zh' ? 'Excel 文件' : 'Excel Source'}
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const droppedFile = e.dataTransfer.files[0];
                  // Reuse logic
                  setFile(droppedFile);
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
                  reader.readAsBinaryString(droppedFile);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed transition-all duration-300 rounded-xl p-6 flex flex-col items-center justify-center shrink-0 mb-4 overflow-hidden group cursor-pointer h-40
                ${isDragging
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02] shadow-lg'
                  : file
                    ? 'border-green-400 bg-green-50/50 dark:bg-slate-800'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              {file ? (
                <div className="flex flex-col items-center z-10 pointer-events-none">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-600/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-2 shadow-sm">
                    <FileSpreadsheet size={24} />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200 text-center px-2 line-clamp-1 break-all">
                    {file.name}
                  </p>
                  <span className="mt-2 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {lang === 'zh' ? '已选择' : 'Selected'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center pointer-events-none">
                  <Upload className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-green-500 scale-110' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center break-all">
                    {lang === 'zh' ? '点击或拖拽上传 Excel' : 'Click or Drag Excel here'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center shrink-0">
                <Layers size={14} className="mr-2 text-slate-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lang === 'zh' ? '工作表' : 'Worksheets'}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-900/50 space-y-1">
                {isProcessing && sheets.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    <span className="text-sm">{lang === 'zh' ? '解析中...' : 'Parsing...'}</span>
                  </div>
                ) : sheets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    {lang === 'zh' ? '暂无工作表' : 'No sheets'}
                  </div>
                ) : (
                  sheets.map(sheet => (
                    <button
                      key={sheet}
                      onClick={() => setSelectedSheet(sheet)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${selectedSheet === sheet
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span className="flex items-center truncate">
                        <FileCheck size={14} className={`mr-2 flex-shrink-0 ${selectedSheet === sheet ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                        <span className="truncate">{sheet}</span>
                      </span>
                      {selectedSheet === sheet && <Check size={14} className="flex-shrink-0 ml-2" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          {/* Right Top: Configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
              {lang === 'zh' ? '解析规则配置' : 'Parsing Configuration'}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '数据起始行' : 'Start Row'}</label>
                  <input
                    type="number"
                    min="1"
                    value={activeTemplate.dataStartRow}
                    onChange={(e) => updateActiveTemplate({ ...activeTemplate, dataStartRow: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '字段名列' : 'Name Col'}</label>
                  <input
                    type="text"
                    value={activeTemplate.nameCol}
                    onChange={(e) => updateActiveTemplate({ ...activeTemplate, nameCol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '类型列' : 'Type Col'}</label>
                  <input
                    type="text"
                    value={activeTemplate.typeCol}
                    onChange={(e) => updateActiveTemplate({ ...activeTemplate, typeCol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '注释列' : 'Comment Col'}</label>
                  <input
                    type="text"
                    value={activeTemplate.commentCol}
                    onChange={(e) => updateActiveTemplate({ ...activeTemplate, commentCol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '主键标识列' : 'PK Col'}</label>
                  <input
                    type="text"
                    value={activeTemplate.pkCol || ''}
                    onChange={(e) => updateActiveTemplate({ ...activeTemplate, pkCol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                    placeholder="D"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '表名 (无需后缀)' : 'Table Name'}</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono text-blue-600 dark:text-blue-400"
                  placeholder="target_table_name"
                />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{lang === 'zh' ? '目标数据库' : 'Target Database'}</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setDbType('mysql')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dbType === 'mysql' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>MySQL</button>
                    <button onClick={() => setDbType('doris')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dbType === 'doris' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>Doris</button>
                  </div>
                </div>

                <button
                  onClick={generateSql}
                  disabled={!selectedSheet || isProcessing}
                  className={`px-6 py-2.5 rounded-lg font-bold text-white flex items-center shadow-lg transition-all ${!selectedSheet || isProcessing ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isProcessing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                  {lang === 'zh' ? '生成 SQL' : 'Generate SQL'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Bottom: SQL Preview */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{lang === 'zh' ? 'SQL 预览' : 'SQL Preview'}</span>
              <button onClick={() => {
                navigator.clipboard.writeText(generatedSql);
                toast({
                  title: lang === 'zh' ? '复制成功' : 'Copied',
                  description: lang === 'zh' ? 'SQL 已复制到剪贴板' : 'SQL copied to clipboard',
                  variant: 'success'
                });
              }} disabled={!generatedSql} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium disabled:opacity-50 flex items-center">
                <Save size={14} className="mr-1" /> {lang === 'zh' ? '复制' : 'Copy'}
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-[#1e1e1e]">
              <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap leading-relaxed">{generatedSql || (lang === 'zh' ? '-- 请选择工作表并点击生成...' : '// Select sheet and click Generate...')}</pre>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        title={lang === 'zh' ? '删除模板' : 'Delete Template'}
        message={lang === 'zh' ? '您确定要删除此解析模板吗？此操作无法撤销。' : 'Are you sure you want to delete this parsing template? This action cannot be undone.'}
        confirmText={lang === 'zh' ? '删除' : 'Delete'}
        cancelText={lang === 'zh' ? '取消' : 'Cancel'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        type="danger"
      />
    </div>
  );
};