import React from 'react';
import { Save, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { convertToJson } from '../../../utils/hoconParser';

interface ConfigPreviewPanelProps {
    configPanelHeight: number;
    setConfigPanelHeight: (height: number) => void;
    generatedConfig: string;
    setGeneratedConfig: (config: string) => void;
    isConfigEditing: boolean;
    setIsConfigEditing: (editing: boolean) => void;
    editingConfig: string;
    setEditingConfig: (config: string) => void;
}

export const ConfigPreviewPanel: React.FC<ConfigPreviewPanelProps> = ({
    configPanelHeight, setConfigPanelHeight,
    generatedConfig, setGeneratedConfig,
    isConfigEditing, setIsConfigEditing,
    editingConfig, setEditingConfig
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    return (
        <>
            {/* Draggable Divider */}
            <div
                className="h-2 bg-slate-200 dark:bg-slate-700 cursor-ns-resize hover:bg-purple-400 dark:hover:bg-purple-600 transition-colors flex items-center justify-center flex-shrink-0"
                onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = configPanelHeight;
                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const delta = startY - moveEvent.clientY;
                        const newHeight = Math.max(100, Math.min(400, startHeight + delta));
                        setConfigPanelHeight(newHeight);
                    };
                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }}
            >
                <div className="w-8 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
            </div>

            {/* Config Panel */}
            <div className="bg-[#1e1e1e] rounded-t-lg overflow-hidden flex-shrink-0" style={{ height: configPanelHeight }}>
                <div className="h-8 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
                    <span className="text-xs text-slate-400 font-mono">
                        {t('fieldMapping.configuration', { defaultValue: '配置文件' })}
                        {isConfigEditing && <span className="ml-2 text-amber-400">({t('fieldMapping.editing', { defaultValue: '编辑中' })})</span>}
                    </span>
                    <div className="flex items-center space-x-3">
                        {isConfigEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setGeneratedConfig(editingConfig);
                                        setIsConfigEditing(false);
                                    }}
                                    className="text-xs text-green-400 hover:text-green-300 flex items-center transition-colors"
                                >
                                    <Save size={12} className="mr-1" /> {t('common.save', { defaultValue: '保存' })}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingConfig(generatedConfig);
                                        setIsConfigEditing(false);
                                    }}
                                    className="text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                    {t('common.cancel', { defaultValue: '取消' })}
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
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center disabled:opacity-30 transition-colors"
                                >
                                    {t('common.edit', { defaultValue: '编辑' })}
                                </button>
                                <button
                                    onClick={() => {
                                        if (generatedConfig) {
                                            const r = convertToJson(generatedConfig);
                                            if (!r.error) {
                                                setGeneratedConfig(r.json);
                                                toast({ title: t('fieldMapping.convertedToJson', { defaultValue: '已转换为 JSON' }), variant: 'success' });
                                            } else {
                                                toast({ title: t('fieldMapping.convertFailed', { defaultValue: '转换失败' }), description: r.error, variant: 'destructive' });
                                            }
                                        }
                                    }}
                                    disabled={!generatedConfig}
                                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center disabled:opacity-30 transition-colors"
                                >
                                    <FileJson size={12} className="mr-1" /> JSON
                                </button>
                                <button
                                    onClick={() => {
                                        if (generatedConfig) {
                                            navigator.clipboard.writeText(generatedConfig);
                                            toast({ title: t('common.copySuccess', { defaultValue: '复制成功' }), variant: 'success' });
                                        }
                                    }}
                                    disabled={!generatedConfig}
                                    className="text-xs text-slate-400 hover:text-white flex items-center disabled:opacity-30 transition-colors"
                                >
                                    <Save size={12} className="mr-1" /> Copy
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="font-mono text-xs overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 32px)' }}>
                    {isConfigEditing ? (
                        <textarea
                            value={editingConfig}
                            onChange={(e) => setEditingConfig(e.target.value)}
                            className="w-full h-full p-3 bg-transparent text-green-300 resize-none outline-none"
                            spellCheck={false}
                        />
                    ) : generatedConfig ? (
                        <pre className="p-3 text-green-300 whitespace-pre-wrap">{generatedConfig}</pre>
                    ) : (
                        <span className="p-3 text-slate-500 block"># {t('fieldMapping.clickToPreview', { defaultValue: '点击上方生成按钮预览配置' })}</span>
                    )}
                </div>
            </div>
        </>
    );
};
