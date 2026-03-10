import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PdfConfigPanelProps {
  activeMode: string;
  outputDir: string;
  outputName: string;
  splitRange: { start: string; end: string };
  customPages: string;
  compressionLevel: 'low' | 'medium' | 'high';
  setOutputName: (val: string) => void;
  setSplitRange: (val: { start: string; end: string }) => void;
  setCustomPages: (val: string) => void;
  setCompressionLevel: (val: 'low' | 'medium' | 'high') => void;
  handleSelectDir: () => void;
  handleOpenDir: () => void;
}

export const PdfConfigPanel: React.FC<PdfConfigPanelProps> = ({
  activeMode,
  outputDir,
  outputName,
  splitRange,
  customPages,
  compressionLevel,
  setOutputName,
  setSplitRange,
  setCustomPages,
  setCompressionLevel,
  handleSelectDir,
  handleOpenDir
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
      {/* Output Settings */}
      <div className="flex space-x-4">
        {/* Directory Selection */}
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.outputDir')}</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={outputDir || t('pdf.defaultDir')}
              readOnly
              className={`flex-1 px-3 py-1.5 border rounded text-sm outline-none ${outputDir ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 border-transparent'}`}
            />
            <button onClick={handleSelectDir} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-xs font-bold transition-colors whitespace-nowrap">
              {t('pdf.selectDir')}
            </button>
            <button
              onClick={handleOpenDir}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs font-bold flex items-center transition-colors whitespace-nowrap"
              title={t('pdf.openDir')}
            >
              <FolderOpen size={14} className="mr-1" />
              {t('pdf.open')}
            </button>
          </div>
        </div>

        {/* Filename */}
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.outputFilename')}</label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
            placeholder={t('pdf.default')}
          />
        </div>
      </div>

      {/* Split Params */}
      {activeMode === 'split' && (
        <div className="flex space-x-4">
          <div className="w-24">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.startPage')}</label>
            <input
              type="number" min="1"
              value={splitRange.start}
              onChange={(e) => setSplitRange({ ...splitRange, start: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
              disabled={!!customPages}
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.endPage')}</label>
            <input
              type="number" min="1"
              value={splitRange.end}
              onChange={(e) => setSplitRange({ ...splitRange, end: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-red-500"
              disabled={!!customPages}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.specificPages')}</label>
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pdf.compressLevel')}</label>
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
            * {t('pdf.compressTip')}
          </p>
        </div>
      )}
    </div>
  );
};
