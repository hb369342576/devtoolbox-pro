import React, { useState, useEffect } from 'react';
import { FileText, Scissors, Minimize2, Layers, Trash2, Download, Eye, X, Edit, Save, FileType } from 'lucide-react';
import { Language, PdfFile } from '../types';

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

export const PdfTools: React.FC<{ lang: Language }> = ({ lang }) => {
  const [activeMode, setActiveMode] = useState<'merge' | 'split' | 'compress' | 'view' | 'edit'>('merge');
  const [files, setFiles] = useState<PdfFileWithBlob[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  // Clear files when switching modes to avoid confusion
  useEffect(() => {
    setFiles([]);
  }, [activeMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // FIX: Explicitly type 'f' as File to resolve type inference issues.
      const newFiles: PdfFileWithBlob[] = Array.from(e.target.files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
        file: f,
        previewUrl: activeMode === 'view' ? URL.createObjectURL(f) : undefined,
        metadata: {
           title: f.name.replace('.pdf', ''),
           author: 'Unknown',
           subject: '',
           keywords: ''
        }
      }));
      
      if (activeMode === 'view' || activeMode === 'edit') {
        // Replace existing for single file modes
        setFiles([newFiles[0]]);
      } else {
        setFiles(prev => [...prev, ...newFiles]);
      }
      
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const updateMetadata = (key: string, value: string) => {
    if (files.length > 0) {
      const updated = { ...files[0] };
      updated.metadata = { ...updated.metadata!, [key]: value };
      setFiles([updated]);
    }
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    setTimeout(() => {
       setIsSaving(false);
       alert(lang === 'zh' ? '保存成功 (模拟)' : 'Saved Successfully (Mock)');
    }, 1000);
  };

  const modes = [
    { id: 'merge', icon: Layers, label: { en: 'Merge', zh: '合并' } },
    { id: 'split', icon: Scissors, label: { en: 'Split', zh: '拆分' } },
    { id: 'compress', icon: Minimize2, label: { en: 'Compress', zh: '压缩' } },
    { id: 'view', icon: Eye, label: { en: 'View', zh: '浏览' } },
    { id: 'edit', icon: Edit, label: { en: 'Edit Props', zh: '编辑属性' } },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tool Navigation */}
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
        
        {/* PDF Viewer Mode */}
        {activeMode === 'view' && files.length > 0 ? (
           <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <div className="flex items-center space-x-3">
                    <FileText className="text-red-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{files[0].name}</span>
                 </div>
                 <button 
                   onClick={() => setFiles([])}
                   className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors flex items-center"
                 >
                    <X size={18} className="mr-1" />
                    {lang === 'zh' ? '关闭' : 'Close'}
                 </button>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                 <iframe 
                   src={files[0].previewUrl} 
                   className="w-full h-full" 
                   title="PDF Viewer"
                 />
              </div>
           </div>
        ) : activeMode === 'edit' && files.length > 0 ? (
           /* Metadata Editor Mode */
           <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                    <Edit className="mr-2 text-red-600" />
                    {lang === 'zh' ? '编辑元数据' : 'Edit Metadata'}
                 </h3>
                 <button 
                   onClick={() => setFiles([])}
                   className="text-slate-400 hover:text-slate-600"
                 >
                    <X size={20} />
                 </button>
              </div>
              
              <div className="flex-1 space-y-6">
                 <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center text-red-600 dark:text-red-400">
                       <FileText size={24} />
                    </div>
                    <div className="flex-1">
                       <p className="font-bold text-slate-800 dark:text-white text-lg truncate">{files[0].name}</p>
                       <p className="text-sm text-slate-500">{files[0].size}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '标题' : 'Title'}</label>
                       <input 
                         type="text" 
                         value={files[0].metadata?.title}
                         onChange={(e) => updateMetadata('title', e.target.value)}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '作者' : 'Author'}</label>
                       <input 
                         type="text" 
                         value={files[0].metadata?.author}
                         onChange={(e) => updateMetadata('author', e.target.value)}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '主题' : 'Subject'}</label>
                       <input 
                         type="text" 
                         value={files[0].metadata?.subject}
                         onChange={(e) => updateMetadata('subject', e.target.value)}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{lang === 'zh' ? '关键字' : 'Keywords'}</label>
                       <input 
                         type="text" 
                         value={files[0].metadata?.keywords}
                         onChange={(e) => updateMetadata('keywords', e.target.value)}
                         placeholder="tag1, tag2, tag3"
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                       />
                    </div>
                 </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-600/20 transition-all flex items-center"
                  >
                     {isSaving ? <Minimize2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                     {lang === 'zh' ? '保存更改' : 'Save Changes'}
                  </button>
              </div>
           </div>
        ) : (
          /* Standard Upload & List Mode */
          <>
            {/* Drop Zone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 mb-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center relative group hover:border-red-400 transition-colors shrink-0">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                 {activeMode === 'view' ? <Eye className="w-8 h-8 text-red-500" /> : 
                  activeMode === 'edit' ? <Edit className="w-8 h-8 text-red-500" /> :
                  <FileText className="w-8 h-8 text-red-500" />}
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '点击选择或拖拽PDF文件' : 'Click to select or drag PDF files'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                 {activeMode === 'merge' ? (lang === 'zh' ? '选择多个文件进行合并' : 'Select multiple files to combine') : 
                  activeMode === 'view' ? (lang === 'zh' ? '选择一个文件进行浏览' : 'Select a file to view') :
                  activeMode === 'edit' ? (lang === 'zh' ? '选择一个文件编辑属性' : 'Select a file to edit properties') :
                  (lang === 'zh' ? '选择文件进行处理' : 'Select a file to process')}
              </p>
              <input 
                type="file" 
                accept=".pdf" 
                multiple={activeMode === 'merge'} 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              />
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 min-h-0">
              {files.map((file, index) => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-red-500 shadow-sm flex-shrink-0">PDF</div>
                    <div className="min-w-0">
                       <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                       <p className="text-xs text-slate-500">{file.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 flex-shrink-0">
                     {activeMode === 'split' && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                           <span className="hidden sm:inline">Page Range:</span>
                           <input type="text" placeholder="1-5, 8" className="w-20 px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 outline-none focus:border-red-500" />
                        </div>
                     )}
                     <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              ))}
              
              {files.length === 0 && (
                 <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    {lang === 'zh' ? '暂无文件' : 'No files selected'}
                 </div>
              )}
            </div>

            {/* Action Bar */}
            {activeMode !== 'view' && activeMode !== 'edit' && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
                 <button 
                   disabled={files.length === 0}
                   className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-red-600/30 transition-all flex items-center"
                 >
                   <Download className="mr-2" size={20} />
                   {activeMode === 'merge' ? (lang === 'zh' ? '合并并下载' : 'Merge & Download') : 
                    activeMode === 'split' ? (lang === 'zh' ? '拆分并下载' : 'Split & Download') : 
                    (lang === 'zh' ? '压缩并下载' : 'Compress & Download')}
                 </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};