import React, { useState, useEffect } from 'react';
import { FileText, Scissors, Minimize2, Layers, Trash2, Download, Eye, X, Edit, Save, FolderOpen } from 'lucide-react';
import { Language, PdfFile } from '../../types';

interface PdfFileWithBlob extends PdfFile {
  file: File;
  previewUrl?: string;
  metadata?: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
}

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { useToast } from '../../components/ui/Toast';

// Safe invoke wrapper
// Safe invoke wrapper
const invoke = (cmd: string, args: any) => {
  const tauri = (window as any).__TAURI__;
  if (tauri) {
    if (tauri.core && tauri.core.invoke) return tauri.core.invoke(cmd, args);
    if (tauri.invoke) return tauri.invoke(cmd, args);
  }
  return Promise.reject("Tauri API not found");
};

export const PdfTools: React.FC<{ lang: Language }> = ({ lang }) => {
  const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<'merge' | 'split' | 'compress' | 'view'>('merge');
  const [isSaving, setIsSaving] = useState(false);
  // State for all modes
  const [toolStates, setToolStates] = useState<{
    [key: string]: {
      files: PdfFileWithBlob[];
      outputName: string;
      outputDir: string;
      splitRange: { start: string; end: string };
      customPages: string;
      compressionLevel: 'low' | 'medium' | 'high';
    }
  }>({
    merge: { files: [], outputName: '', outputDir: '', splitRange: { start: '', end: '' }, customPages: '', compressionLevel: 'medium' },
    split: { files: [], outputName: '', outputDir: '', splitRange: { start: '', end: '' }, customPages: '', compressionLevel: 'medium' },
    compress: { files: [], outputName: '', outputDir: '', splitRange: { start: '', end: '' }, customPages: '', compressionLevel: 'medium' },
    view: { files: [], outputName: '', outputDir: '', splitRange: { start: '', end: '' }, customPages: '', compressionLevel: 'medium' },
  });

  const currentState = toolStates[activeMode];

  const updateCurrentState = (updates: Partial<typeof currentState>) => {
    setToolStates(prev => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], ...updates }
    }));
  };

  // Helper to set files specifically (common op)
  const setFiles = (files: PdfFileWithBlob[]) => updateCurrentState({ files });
  // Helper for callback updates
  const setFilesCallback = (cb: (prev: PdfFileWithBlob[]) => PdfFileWithBlob[]) => {
    setToolStates(prev => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], files: cb(prev[activeMode].files) }
    }));
  };

  const files = currentState.files;
  const outputName = currentState.outputName;
  const outputDir = currentState.outputDir;
  const splitRange = currentState.splitRange;
  const customPages = currentState.customPages;
  const compressionLevel = currentState.compressionLevel;

  const setOutputName = (val: string) => updateCurrentState({ outputName: val });
  const setOutputDir = (val: string) => updateCurrentState({ outputDir: val });
  const setSplitRange = (val: { start: string, end: string }) => updateCurrentState({ splitRange: val });
  const setCustomPages = (val: string) => updateCurrentState({ customPages: val });
  const setCompressionLevel = (val: 'low' | 'medium' | 'high') => updateCurrentState({ compressionLevel: val });

  // Clean up ALL blob URLs when component unmounts or files change deeply
  // Note: This effect is tricky with independent states. 
  // We should iterate all states to cleanup? Or just current?
  // Use a simpler approach: cleanup on unmount only, or when specific files are removed.
  // For now, let's keep it simple: cleanup current mode files if they change.
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: PdfFileWithBlob[] = Array.from(e.target.files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        file: f,
        previewUrl: activeMode === 'view' ? URL.createObjectURL(f) : undefined,
        metadata: { title: f.name.replace('.pdf', ''), author: '', subject: '', keywords: '' }
      }));

      if (activeMode === 'view') {
        const file = newFiles[0];
        setFiles([file]);
      } else {
        setFilesCallback(prev => [...prev, ...newFiles]);
      }
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  // 更新元数据
  const updateMetadata = (key: string, value: string) => {
    if (files.length > 0) {
      setFilesCallback(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = {
            ...updated[0],
            metadata: { ...updated[0].metadata!, [key]: value }
          };
        }
        return updated;
      });
    }
  };

  // Handle download/save
  const downloadBlob = async (blob: Blob, filename: string) => {
    // 1. If custom directory is set, try backend save
    if (isTauri && outputDir && outputDir.trim()) {
      try {
        const buffer = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(buffer));

        let targetDir = outputDir.replace(/[\\/]$/, '');
        const sep = targetDir.includes('\\') ? '\\' : '/';
        const fullPath = `${targetDir}${sep}${filename}`;

        await invoke('save_file', { path: fullPath, data });
        toast({
          title: lang === 'zh' ? '已保存' : 'Saved',
          description: fullPath,
          variant: 'success'
        });
        return;
      } catch (e) {
        console.error("Save failed, fallback to download", e);
        toast({ title: 'Backend Save Failed', description: String(e), variant: 'destructive' });
        // Fallback to default download
      }
    }

    // 2. Default Web/Fallback Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Select custom directory
  const handleSelectDir = async () => {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.dialog) {
        const selected = await tauri.dialog.open({ directory: true });
        if (selected && typeof selected === 'string') {
          setOutputDir(selected);
        }
      }
    } catch (e) {
      console.error("Dialog error", e);
    }
  };

  // Open directory (Custom or Default)
  const handleOpenDir = async () => {
    try {
      let path = outputDir;
      if (!path) {
        // Get default download dir
        const defaultPath = await invoke('get_download_dir', {});
        if (typeof defaultPath === 'string') path = defaultPath;
      }

      if (path) {
        await invoke('open_explorer', { path });
      } else {
        toast({ title: 'Error', description: 'Cannot determine directory path', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error opening folder', description: String(e), variant: 'destructive' });
    }
  };

  // 处理文件操作
  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsSaving(true);
    toast({
      title: lang === 'zh' ? '处理中...' : 'Processing...',
      description: lang === 'zh' ? '正在处理您的 PDF 文件' : 'Processing your PDF files',
      variant: 'default'
    });

    try {
      const baseName = outputName || files[0]?.name.replace('.pdf', '') || 'output';
      // Sanitize filename: remove directory usage from filename itself
      const finalName = baseName;

      if (activeMode === 'merge') {
        const mergedPdf = await PDFDocument.create();
        for (const pdfFile of files) {
          const arrayBuffer = await pdfFile.file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const pdfBytes = await mergedPdf.save();
        downloadBlob(new Blob([pdfBytes as any], { type: 'application/pdf' }), `${finalName.endsWith('.pdf') ? finalName : finalName + '.pdf'}`);
        toast({ title: lang === 'zh' ? '合并成功' : 'Merge Success', variant: 'success' });

      } else if (activeMode === 'split') {
        const pdfFile = files[0];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const zip = new JSZip();

        const pageCount = pdfDoc.getPageCount();
        const pagesToExport: number[] = [];

        if (customPages && customPages.trim()) {
          // Parse "1,3,5-7" style
          const parts = customPages.split(/[,，]/); // Support both Eng and CN comma
          parts.forEach(p => {
            p = p.trim();
            if (p.includes('-')) {
              const [startStr, endStr] = p.split('-');
              const start = parseInt(startStr);
              const end = parseInt(endStr);
              if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let k = start; k <= end; k++) {
                  if (k >= 1 && k <= pageCount) pagesToExport.push(k - 1);
                }
              }
            } else {
              const pageNum = parseInt(p);
              if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
                pagesToExport.push(pageNum - 1); // 0-based
              }
            }
          });
          // Unique sort
          const unique = Array.from(new Set(pagesToExport)).sort((a, b) => a - b);
          pagesToExport.length = 0;
          pagesToExport.push(...unique);

        } else {
          // Range fallback
          let start = parseInt(splitRange.start) || 1;
          let end = parseInt(splitRange.end) || pageCount;
          start = Math.max(1, start);
          end = Math.min(pageCount, end);
          if (start > end) start = end;

          for (let i = start - 1; i < end; i++) pagesToExport.push(i);
        }

        // Process unique sorted pages. Default to ALL if nothing selected?
        // If range keys are empty and logic defaults to 1-pageCount, it works.
        // My fallback code above handles the default cases effectively.
        const uniquePages = Array.from(new Set(pagesToExport)).sort((a, b) => a - b);

        // Safety check: if no pages selected (e.g. invalid input), export all? Or warn?
        // Let's default to all if empty to avoid empty zip
        const finalPages = uniquePages.length > 0 ? uniquePages : Array.from({ length: pageCount }, (_, i) => i);

        for (const i of finalPages) {
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [i]);
          newPdf.addPage(page);
          const pdfBytes = await newPdf.save();
          zip.file(`${pdfFile.name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
        }

        const content = await zip.generateAsync({ type: "blob" });
        downloadBlob(content, `${finalName.replace('.zip', '')}.zip`);
        toast({ title: lang === 'zh' ? '拆分成功' : 'Split Success', variant: 'success' });

      } else if (activeMode === 'compress') {
        const pdfFile = files[0];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pdfBytes = await pdfDoc.save();
        downloadBlob(new Blob([pdfBytes as any], { type: 'application/pdf' }), `compressed_${finalName.endsWith('.pdf') ? finalName : finalName + '.pdf'}`);
        toast({ title: lang === 'zh' ? '压缩成功' : 'Compression Success', variant: 'success' });

      }

    } catch (e) {
      console.error("PDF Processing Error", e);
      toast({
        title: lang === 'zh' ? '处理失败' : 'Failed',
        description: String(e),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 工具模式配置
  const modes = [
    { id: 'merge', icon: Layers, label: { en: 'Merge', zh: '合并' } },
    { id: 'split', icon: Scissors, label: { en: 'Split', zh: '拆分' } },
    { id: 'compress', icon: Minimize2, label: { en: 'Compress', zh: '压缩' } },
    { id: 'view', icon: Eye, label: { en: 'View', zh: '浏览' } },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 模式导航栏 */}
      <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
        {modes.map((mode: any) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`
              flex-1 py-4 px-4 rounded-xl border flex items-center justify-center space-x-2 transition-all min-w-[120px] whitespace-nowrap
              ${activeMode === mode.id
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}
            `}
          >
            <mode.icon size={18} />
            <span className="font-medium">{mode.label[lang]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col p-6 overflow-hidden">
        {activeMode === 'view' && files.length > 0 ? (
          /* 浏览模式 */
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <FileText className="text-red-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">{files[0].name}</span>
              </div>
              <button onClick={() => setFiles([])} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 flex items-center">
                <X size={18} className="mr-1" />
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
              <iframe src={files[0].previewUrl} className="w-full h-full" title="PDF Viewer" />
            </div>
          </div>
        ) : (
          <>
            {/* 上传区域 */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 mb-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center relative group hover:border-red-400 transition-colors shrink-0 h-32">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                {activeMode === 'view' ? <Eye className="w-5 h-5 text-red-500" /> : <FileText className="w-5 h-5 text-red-500" />}
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '点击选择或拖拽PDF文件' : 'Click to select or drag PDF files'}
              </p>
              <input type="file" accept=".pdf" multiple={activeMode === 'merge'} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>



            {/* 参数配置区域 */}
            {activeMode !== 'view' && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                {/* Common: Output Filename */}
                {/* Output Settings */}
                <div className="flex space-x-4">
                  {/* Directory Selection */}
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '输出目录' : 'Output Directory'}</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={outputDir || (lang === 'zh' ? '默认 (系统下载目录)' : 'Default (Downloads)')}
                        readOnly
                        className={`flex-1 px-3 py-1.5 border rounded text-sm outline-none ${outputDir ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 border-transparent'}`}
                      />
                      <button onClick={handleSelectDir} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-xs font-bold transition-colors whitespace-nowrap">
                        {lang === 'zh' ? '选择..' : 'Select..'}
                      </button>
                      <button
                        onClick={handleOpenDir}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs font-bold flex items-center transition-colors whitespace-nowrap"
                        title={lang === 'zh' ? '打开目录' : 'Open Directory'}
                      >
                        <FolderOpen size={14} className="mr-1" />
                        {lang === 'zh' ? '打开' : 'Open'}
                      </button>
                    </div>
                  </div>

                  {/* Filename */}
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '输出文件名 (可选)' : 'Output Filename (Optional)'}</label>
                    <input
                      type="text"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
                      placeholder={lang === 'zh' ? '默认' : 'Default'}
                    />
                  </div>
                </div>

                {/* Split Params */}
                {activeMode === 'split' && (
                  <div className="flex space-x-4">
                    <div className="w-24">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '起始页' : 'Start Page'}</label>
                      <input
                        type="number" min="1"
                        value={splitRange.start}
                        onChange={(e) => setSplitRange({ ...splitRange, start: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
                        disabled={!!customPages}
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '结束页' : 'End Page'}</label>
                      <input
                        type="number" min="1"
                        value={splitRange.end}
                        onChange={(e) => setSplitRange({ ...splitRange, end: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
                        disabled={!!customPages}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '或指定页面 (如 1,3,5)' : 'Or Specific Pages (e.g., 1,3,5)'}</label>
                      <input
                        type="text"
                        value={customPages}
                        onChange={(e) => setCustomPages(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
                        placeholder="1, 3, 5"
                      />
                    </div>
                  </div>
                )}

                {/* Compress Params */}
                {activeMode === 'compress' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{lang === 'zh' ? '压缩程度' : 'Compression Level'}</label>
                    <div className="flex space-x-2">
                      {(['low', 'medium', 'high'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setCompressionLevel(level)}
                          className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${compressionLevel === level
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      * {lang === 'zh' ? '注：浏览器端压缩能力有限，主要通过重组结构优化体积。' : 'Note: Browser-side compression is limited to structure optimization.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 文件列表 */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 min-h-0">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-red-500 shadow-sm flex-shrink-0">PDF</div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{file.size}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
              {files.length === 0 && <div className="h-full flex items-center justify-center text-slate-400 text-sm">{lang === 'zh' ? '暂无文件' : 'No files selected'}</div>}
            </div>

            {/* 底部操作栏 */}
            {activeMode !== 'view' && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
                <button onClick={handleProcess} disabled={files.length === 0 || isSaving} className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-bold shadow-lg transition-all flex items-center">
                  <Download className="mr-2" size={20} />
                  {activeMode === 'merge' ? (lang === 'zh' ? '合并' : 'Merge') :
                    activeMode === 'split' ? (lang === 'zh' ? '拆分' : 'Split') :
                      (lang === 'zh' ? '压缩' : 'Compress')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};