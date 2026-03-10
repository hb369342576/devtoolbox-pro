import React from 'react';
import { Play, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExcelTemplate } from '../../../types';
import { useToast } from '../../common/Toast';

interface ConfigPanelProps {
    activeTemplate: ExcelTemplate;
    updateActiveTemplate: (tpl: ExcelTemplate) => void;
    tableName: string;
    setTableName: (name: string) => void;
    dbType: 'mysql' | 'doris';
    setDbType: (type: 'mysql' | 'doris') => void;
    generateSql: () => void;
    selectedSheet: string | null;
    isProcessing: boolean;
    generatedSql: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    activeTemplate, updateActiveTemplate, tableName, setTableName,
    dbType, setDbType, generateSql, selectedSheet, isProcessing, generatedSql
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    return (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Right Top: Configuration */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                    {t('common.parsingConfiguration', { defaultValue: '解析配置' })}
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-5 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.startRow', { defaultValue: '起始行' })}</label>
                            <input
                                type="number"
                                min="1"
                                value={activeTemplate.dataStartRow}
                                onChange={(e) => updateActiveTemplate({ ...activeTemplate, dataStartRow: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.nameCol', { defaultValue: '名称列' })}</label>
                            <input
                                type="text"
                                value={activeTemplate.nameCol}
                                onChange={(e) => updateActiveTemplate({ ...activeTemplate, nameCol: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.typeCol', { defaultValue: '类型列' })}</label>
                            <input
                                type="text"
                                value={activeTemplate.typeCol}
                                onChange={(e) => updateActiveTemplate({ ...activeTemplate, typeCol: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.commentCol', { defaultValue: '注释列' })}</label>
                            <input
                                type="text"
                                value={activeTemplate.commentCol}
                                onChange={(e) => updateActiveTemplate({ ...activeTemplate, commentCol: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.pkCol', { defaultValue: '主键标识列' })}</label>
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.tableNameNoSuffix', { defaultValue: '表名称' })}</label>
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
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('common.targetDatabase', { defaultValue: '目标类型' })}</label>
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
                            {t('common.generateSql', { defaultValue: '生成 SQL' })}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Bottom: SQL Preview */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{t('common.sqlPreview', { defaultValue: 'SQL 预览' })}</span>
                    <button onClick={() => {
                        navigator.clipboard.writeText(generatedSql);
                        toast({
                            title: t('common.copySuccess', { defaultValue: '复制成功' }),
                            description: t('common.configurationCopiedToClip', { defaultValue: '已复制到剪贴板！' }),
                            variant: 'success'
                        });
                    }} disabled={!generatedSql} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium disabled:opacity-50 flex items-center">
                        <Save size={14} className="mr-1" /> {t('common.copy', { defaultValue: '复制' })}
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-auto bg-[#1e1e1e]">
                    <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap leading-relaxed">{generatedSql || t('common.selectSheetPlaceholder', { defaultValue: '-- 请选择工作表以开始 --' })}</pre>
                </div>
            </div>
        </div>
    );
};
