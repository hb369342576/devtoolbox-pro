import React from 'react';
import { Save, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { convertToJson } from '../../../utils/hoconParser';
import { useToast } from '../../common/Toast';

interface ConfigPreviewProps {
  configPanelHeight: number;
  setConfigPanelHeight: (height: number) => void;
  isConfigEditing: boolean;
  setIsConfigEditing: (editing: boolean) => void;
  generatedConfig: string;
  setGeneratedConfig: (config: string) => void;
  editingConfig: string;
  setEditingConfig: (config: string) => void;
}

export const ConfigPreview: React.FC<ConfigPreviewProps> = ({
  configPanelHeight, setConfigPanelHeight,
  isConfigEditing, setIsConfigEditing,
  generatedConfig, setGeneratedConfig,
  editingConfig, setEditingConfig
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = configPanelHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(150, Math.min(600, startHeight + delta));
      setConfigPanelHeight(newHeight);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleConvertToJson = () => {
    if (generatedConfig) {
      try {
        const convertResult = convertToJson(generatedConfig);
        if (convertResult.error) {
          throw new Error(convertResult.error);
        }
        setGeneratedConfig(convertResult.json);
        toast({
          title: t('common.converted'),
          description: t('common.convertedToJSONFormat'),
          variant: 'success'
        });
      } catch (err: any) {
        toast({
          title: t('common.convertFailed'),
          description: err.message,
          variant: 'destructive'
        });
      }
    }
  };

  const handleCopy = () => {
    if (generatedConfig) {
      navigator.clipboard.writeText(generatedConfig);
      toast({
        title: t('common.copied'),
        description: t('common.configurationCopiedToClip'),
        variant: 'success'
      });
    }
  };

  return (
    <>
      <div 
        className="h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-ns-resize hover:bg-purple-400 dark:hover:bg-purple-600 transition-colors flex items-center justify-center mt-2"
        onMouseDown={handleDrag}
      >
        <div className="w-8 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
      </div>

      <div className="bg-[#1e1e1e] rounded-xl border border-slate-800 overflow-hidden mt-2" style={{ height: configPanelHeight }}>
        <div className="h-9 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
          <span className="text-xs text-slate-400 font-mono">
            {t('common.configuration')}
            {isConfigEditing && <span className="ml-2 text-amber-400">({t('common.editing')})</span>}
          </span>
          <div className="flex items-center space-x-3">
            {isConfigEditing ? (
              <>
                <button
                  onClick={() => {
                    setGeneratedConfig(editingConfig);
                    setIsConfigEditing(false);
                  }}
                  className="text-xs text-green-400 hover:text-green-300 flex items-center"
                >
                  <Save size={14} className="mr-1" /> {t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setEditingConfig(generatedConfig);
                    setIsConfigEditing(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditingConfig(generatedConfig);
                    setIsConfigEditing(true);
                  }}
                  disabled={!generatedConfig}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={handleConvertToJson}
                  disabled={!generatedConfig}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <FileJson size={14} className="mr-1" /> JSON
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!generatedConfig}
                  className="text-xs text-slate-400 hover:text-white flex items-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Save size={14} className="mr-1" /> Copy
                </button>
              </>
            )}
          </div>
        </div>
        <div className="font-mono text-sm overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 36px)' }}>
          {isConfigEditing ? (
            <textarea
              value={editingConfig}
              onChange={(e) => setEditingConfig(e.target.value)}
              className="w-full h-full p-4 bg-transparent text-green-300 resize-none outline-none"
              spellCheck={false}
            />
          ) : generatedConfig ? (
            <pre className="p-4 whitespace-pre-wrap text-green-300">{generatedConfig}</pre>
          ) : (
            <span className="p-4 text-slate-500 block"># {t('common.clickGenerateToPreviewCon')}</span>
          )}
        </div>
      </div>
    </>
  );
};
