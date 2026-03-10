import React, { useState, useEffect } from 'react';
import { PdfFile } from '../../../types';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { useToast } from '../../common/Toast';
import { useTranslation } from 'react-i18next';

export interface PdfFileWithBlob extends PdfFile {
  file: File;
  previewUrl?: string;
  metadata?: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
}

const invoke = (cmd: string, args: any) => {
  const tauri = (window as any).__TAURI__;
  if (tauri) {
    if (tauri.core && tauri.core.invoke) return tauri.core.invoke(cmd, args);
    if (tauri.invoke) return tauri.invoke(cmd, args);
  }
  return Promise.reject("Tauri API not found");
};

export const usePdfTools = () => {
  const { t } = useTranslation();
  const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
  const { toast } = useToast();
  
  const [activeMode, setActiveMode] = useState<'merge' | 'split' | 'compress' | 'view'>('merge');
  const [isSaving, setIsSaving] = useState(false);
  
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

  const setFiles = (files: PdfFileWithBlob[]) => updateCurrentState({ files });
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

  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

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
        setFiles([newFiles[0]]);
      } else {
        setFilesCallback(prev => [...prev, ...newFiles]);
      }
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const downloadBlob = async (blob: Blob, filename: string) => {
    if (isTauri && outputDir && outputDir.trim()) {
      try {
        const buffer = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(buffer));

        let targetDir = outputDir.replace(/[\\/]$/, '');
        const sep = targetDir.includes('\\') ? '\\' : '/';
        const fullPath = `${targetDir}${sep}${filename}`;

        await invoke('save_file', { path: fullPath, data });
        toast({
          title: t('pdf.saved'),
          description: fullPath,
          variant: 'success'
        });
        return;
      } catch (e) {
        console.error("Save failed, fallback to download", e);
        toast({ title: 'Backend Save Failed', description: String(e), variant: 'destructive' });
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  const handleOpenDir = async () => {
    try {
      let path = outputDir;
      if (!path) {
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

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsSaving(true);
    toast({
      title: t('pdf.processing'),
      description: t('pdf.processingDesc'),
      variant: 'default'
    });

    try {
      const baseName = outputName || files[0]?.name.replace('.pdf', '') || 'output';
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
        toast({ title: t('pdf.mergeSuccess'), variant: 'success' });

      } else if (activeMode === 'split') {
        const pdfFile = files[0];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const zip = new JSZip();

        const pageCount = pdfDoc.getPageCount();
        const pagesToExport: number[] = [];

        if (customPages && customPages.trim()) {
          const parts = customPages.split(/[,，]/);
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
                pagesToExport.push(pageNum - 1);
              }
            }
          });
          const unique = Array.from(new Set(pagesToExport)).sort((a, b) => a - b);
          pagesToExport.length = 0;
          pagesToExport.push(...unique);
        } else {
          let start = parseInt(splitRange.start) || 1;
          let end = parseInt(splitRange.end) || pageCount;
          start = Math.max(1, start);
          end = Math.min(pageCount, end);
          if (start > end) start = end;

          for (let i = start - 1; i < end; i++) pagesToExport.push(i);
        }

        const uniquePages = Array.from(new Set(pagesToExport)).sort((a, b) => a - b);
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
        toast({ title: t('pdf.splitSuccess'), variant: 'success' });

      } else if (activeMode === 'compress') {
        const pdfFile = files[0];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pdfBytes = await pdfDoc.save();
        downloadBlob(new Blob([pdfBytes as any], { type: 'application/pdf' }), `compressed_${finalName.endsWith('.pdf') ? finalName : finalName + '.pdf'}`);
        toast({ title: t('pdf.compressSuccess'), variant: 'success' });
      }

    } catch (e) {
      console.error("PDF Processing Error", e);
      toast({
        title: t('common.failed'),
        description: String(e),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    activeMode, setActiveMode,
    isSaving,
    files, setFiles,
    outputName, setOutputName,
    outputDir, setOutputDir,
    splitRange, setSplitRange,
    customPages, setCustomPages,
    compressionLevel, setCompressionLevel,
    handleFileUpload,
    removeFile,
    handleSelectDir,
    handleOpenDir,
    handleProcess
  };
};
