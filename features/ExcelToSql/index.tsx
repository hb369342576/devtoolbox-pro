import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Upload, RefreshCw, Layers, FileCheck, Check,
  Play, Plus, Settings, Trash2, Edit, ChevronLeft, Save, X, Table, FileText
} from 'lucide-react';
import { Language, ExcelTemplate } from '../../types';
import { SQL_TEMPLATES } from '../../constants';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';

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
    commentCol: ''
  }
];

// --- Template Editor Modal ---
const TemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: Partial<ExcelTemplate>;
  onSave: (tpl: ExcelTemplate) => void;
  lang: Language;
}> = ({ isOpen, onClose, template, onSave, lang }) => {
  const [formData, setFormData] = useState<Partial<ExcelTemplate>>(template);

  useEffect(() => {
    setFormData(template);
  }, [template]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (formData.name && formData.dataStartRow && formData.nameCol) {
      onSave({
        ...formData,
        id: formData.id || Date.now().toString(),
        dataStartRow: Number(formData.dataStartRow),
      } as ExcelTemplate);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {template.id ? (lang === 'zh' ? '编辑模板' : 'Edit Template') : (lang === 'zh' ? '新建模板' : 'New Template')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '模板名称' : 'Template Name'} <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" placeholder="e.g. Company Standard" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '描述' : 'Description'}</label>
            <input type="text" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">{lang === 'zh' ? '解析规则' : 'Parsing Rules'}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{lang === 'zh' ? '数据起始行' : 'Data Start Row'}</label>
                <input type="number" min="1" value={formData.dataStartRow || ''} onChange={e => setFormData({ ...formData, dataStartRow: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" placeholder="2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{lang === 'zh' ? '字段名列号' : 'Name Column'}</label>
                <input type="text" value={formData.nameCol || ''} onChange={e => setFormData({ ...formData, nameCol: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" placeholder="A" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{lang === 'zh' ? '类型列号' : 'Type Column'}</label>
                <input type="text" value={formData.typeCol || ''} onChange={e => setFormData({ ...formData, typeCol: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" placeholder="B" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{lang === 'zh' ? '注释列号' : 'Comment Column'}</label>
                <input type="text" value={formData.commentCol || ''} onChange={e => setFormData({ ...formData, commentCol: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" placeholder="C" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">{lang === 'zh' ? '取消' : 'Cancel'}</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg">{lang === 'zh' ? '保存' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

import { invoke } from '@tauri-apps/api/core';

export const ExcelToSql: React.FC<{ lang: Language }> = ({ lang }) => {
  // Reliable check for Tauri v2
  const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

  // State for View Switching - use global viewMode
  const activeTemplate = useState<ExcelTemplate | null>(null)[0];
  const setActiveTemplate = useState<ExcelTemplate | null>(null)[1];
  const viewMode = useViewMode();

  // State for Templates
  const [templates, setTemplates] = useState<ExcelTemplate[]>(() => {
    const saved = localStorage.getItem('excel_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  // State for Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ExcelTemplate>>({});

  // Generator State
  const [file, setFile] = useState<File | null>(null);
  const [dbType, setDbType] = useState<'mysql' | 'doris'>('mysql');
  const [generatedSql, setGeneratedSql] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('excel_templates', JSON.stringify(templates));
  }, [templates]);

  // --- Handlers for Templates ---
  const handleSaveTemplate = (tpl: ExcelTemplate) => {
    if (templates.find(t => t.id === tpl.id)) {
      setTemplates(templates.map(t => t.id === tpl.id ? tpl : t));
    } else {
      setTemplates([...templates, tpl]);
    }
    setShowModal(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(lang === 'zh' ? '确定删除此模板吗？' : 'Delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTemplate = (tpl: ExcelTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(tpl);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingTemplate({ dataStartRow: 2, nameCol: 'A', typeCol: 'B', commentCol: 'C' });
    setShowModal(true);
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

      if (isTauri) {
        try {
          const sheetNames = await invoke('parse_excel_sheets', {
            fileName: uploadedFile.name
          }) as string[];
          setSheets(sheetNames);
        } catch (err) {
          console.error("Failed to parse excel", err);
          setSheets(['Sheet1']);
        }
      } else {
        setTimeout(() => setSheets(['Sheet1', 'Data_Dict']), 600);
      }
      setIsProcessing(false);
    }
  };

  const generateSql = async () => {
    if (!file || !selectedSheet || !activeTemplate) return;
    setIsProcessing(true);

    // Construct config payload to send to backend
    const parseConfig = {
      startRow: activeTemplate.dataStartRow,
      cols: {
        name: activeTemplate.nameCol,
        type: activeTemplate.typeCol,
        comment: activeTemplate.commentCol
      }
    };

    if (isTauri) {
      try {
        const sql = await invoke('generate_excel_sql', {
          sheetName: selectedSheet,
          dbType: dbType,
          config: parseConfig // Hypothetical backend param
        }) as string;
        setGeneratedSql(sql);
      } catch (e) {
        const tableName = selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const template = SQL_TEMPLATES[dbType].replace('{tableName}', tableName).replace('{sheetName}', selectedSheet);
        setGeneratedSql(`-- Using Template: ${activeTemplate.name}\n-- Rules: Start Row ${activeTemplate.dataStartRow}, Cols [${activeTemplate.nameCol}, ${activeTemplate.typeCol}]\n\n${template}`);
      }
    } else {
      const tableName = selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const template = SQL_TEMPLATES[dbType].replace('{tableName}', tableName).replace('{sheetName}', selectedSheet);
      setGeneratedSql(`-- Using Template: ${activeTemplate.name}\n-- Rules: Start Row ${activeTemplate.dataStartRow}, Cols [${activeTemplate.nameCol}, ${activeTemplate.typeCol}]\n\n${template}`);
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
                  onClick={() => { setActiveTemplate(tpl); setGeneratedSql(''); setFile(null); }}
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
                        <button onClick={(e) => handleEditTemplate(tpl, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors relative z-10">
                          <Edit size={18} />
                        </button>
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
                      <span title="Name Column">Name:{tpl.nameCol}</span>
                      <span className="text-slate-300">|</span>
                      <span title="Type Column">Type:{tpl.typeCol}</span>
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
                    onClick={() => { setActiveTemplate(tpl); setGeneratedSql(''); setFile(null); }}
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
                      Start: {tpl.dataStartRow} | Cols: {tpl.nameCol}, {tpl.typeCol}, {tpl.commentCol || '-'}
                    </div>
                    <div className="col-span-1 flex justify-end space-x-2">
                      <button onClick={(e) => handleEditTemplate(tpl, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors relative z-10">
                        <Edit size={16} />
                      </button>
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

        <TemplateModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          template={editingTemplate}
          onSave={handleSaveTemplate}
          lang={lang}
        />
      </div>
    );
  }

  // --- RENDER: Generator View ---
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <button onClick={() => setActiveTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
              {activeTemplate.name}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'zh' ? '规则: ' : 'Rule: '} Row {activeTemplate.dataStartRow}, Name [{activeTemplate.nameCol}], Type [{activeTemplate.typeCol}]
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
        {/* Left: Config */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col relative overflow-y-auto">
          <div className="flex-1 flex flex-col space-y-6">
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative shrink-0">
              <Upload className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                {file ? file.name : (lang === 'zh' ? '点击或拖拽Excel文件到此处' : 'Click or Drag Excel file here')}
              </p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
              {file && !isProcessing && sheets.length === 0 && <span className="text-xs text-green-500 font-medium">Loaded</span>}
            </div>

            {(sheets.length > 0 || isProcessing) && (
              <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-[150px]">
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                  <Layers size={14} className="mr-2 text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lang === 'zh' ? '选择工作表' : 'Select Worksheet'}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-900/50 space-y-1">
                  {isProcessing && sheets.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <RefreshCw className="animate-spin mr-2" size={16} />
                      <span className="text-sm">{lang === 'zh' ? '正在解析...' : 'Parsing file...'}</span>
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
                        <span className="flex items-center">
                          <FileCheck size={14} className={`mr-2 ${selectedSheet === sheet ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                          {sheet}
                        </span>
                        {selectedSheet === sheet && <Check size={14} />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="relative shrink-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{lang === 'zh' ? '目标数据库类型' : 'Target Database Type'}</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDbType('mysql')} className={`py-2 px-4 rounded-lg border font-medium transition-all ${dbType === 'mysql' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>MySQL</button>
                <button onClick={() => setDbType('doris')} className={`py-2 px-4 rounded-lg border font-medium transition-all ${dbType === 'doris' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Apache Doris</button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button onClick={generateSql} disabled={!selectedSheet || isProcessing} className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center transition-all ${!selectedSheet || isProcessing ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}>
              {isProcessing ? <RefreshCw className="animate-spin mr-2" /> : <Play className="mr-2" />}
              {lang === 'zh' ? '生成建表语句' : 'Generate SQL'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="bg-white dark:bg-slate-800 p-0 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{lang === 'zh' ? 'SQL 预览' : 'SQL Preview'}</span>
            <button onClick={() => navigator.clipboard.writeText(generatedSql)} disabled={!generatedSql} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium disabled:opacity-50 flex items-center">
              <Save size={14} className="mr-1" /> {lang === 'zh' ? '复制' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto bg-[#1e1e1e]">
            <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap leading-relaxed">{generatedSql || (lang === 'zh' ? '-- 等待生成...' : '// Waiting for generation...')}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};