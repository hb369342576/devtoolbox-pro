import React from 'react';
import { FileText, Scissors, Minimize2, Layers, Download, Eye, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePdfTools } from './hooks/usePdfTools';
import { PdfConfigPanel } from './components/PdfConfigPanel';
import { PdfFileList } from './components/PdfFileList';

export const PdfTools: React.FC = () => {
  const { t } = useTranslation();
  const {
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
  } = usePdfTools();

  const modes = [
    { id: 'merge', icon: Layers, label: t('pdf.merge') },
    { id: 'split', icon: Scissors, label: t('pdf.split') },
    { id: 'compress', icon: Minimize2, label: t('pdf.compress') },
    { id: 'view', icon: Eye, label: t('pdf.view') },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 模式导航栏 */}
      <div className="flex space-x-4 mb-6 overflow-x-auto pb-2 custom-scrollbar">
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
            <span className="font-medium">{mode.label}</span>
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
              <button onClick={() => setFiles([])} className="p-2 hover:bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 flex items-center transition-colors">
                <X size={18} className="mr-1" />
                {t('common.close')}
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
                {t('pdf.clickOrDrag')}
              </p>
              <input type="file" accept=".pdf" multiple={activeMode === 'merge'} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>

            {/* 参数配置区域 */}
            {activeMode !== 'view' && (
              <PdfConfigPanel
                activeMode={activeMode}
                outputDir={outputDir}
                outputName={outputName}
                splitRange={splitRange}
                customPages={customPages}
                compressionLevel={compressionLevel}
                setOutputName={setOutputName}
                setSplitRange={setSplitRange}
                setCustomPages={setCustomPages}
                setCompressionLevel={setCompressionLevel}
                handleSelectDir={handleSelectDir}
                handleOpenDir={handleOpenDir}
              />
            )}

            {/* 文件列表 */}
            <PdfFileList files={files} removeFile={removeFile} />

            {/* 底部操作栏 */}
            {activeMode !== 'view' && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
                <button
                  onClick={handleProcess}
                  disabled={files.length === 0 || isSaving}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-bold shadow-lg transition-all flex items-center"
                >
                  <Download className="mr-2" size={20} />
                  {activeMode === 'merge' ? t('pdf.merge') :
                    activeMode === 'split' ? t('pdf.split') :
                      t('pdf.compress')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};