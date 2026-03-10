import React, { useState } from 'react';
import { X, Globe, Plus, Trash2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GlobalParamsModalProps {
    globalParams: string; // JSON string
    onSave: (params: string) => void;
    onClose: () => void;
}

export const GlobalParamsModal: React.FC<GlobalParamsModalProps> = ({ globalParams, onSave, onClose }) => {
    const { t } = useTranslation();
    const [params, setParams] = useState<{prop: string; direct: string; type: string; value: string}[]>(() => {
        try {
            const parsed: {prop: string; direct: string; type: string; value: string}[] = JSON.parse(globalParams || '[]');
            // 确保始终有 biz_date 默认参数
            if (!parsed.some(p => p.prop === 'biz_date')) {
                return [{ prop: 'biz_date', direct: 'IN', type: 'VARCHAR', value: '$[yyyy-MM-dd-1]' }, ...parsed];
            }
            return parsed;
        } catch {
            return [{ prop: 'biz_date', direct: 'IN', type: 'VARCHAR', value: '$[yyyy-MM-dd-1]' }];
        }
    });

    const handleAdd = () => {
        setParams([...params, { prop: '', direct: 'IN', type: 'VARCHAR', value: '' }]);
    };

    const handleSave = () => {
        onSave(JSON.stringify(params));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                        <Globe size={20} className="mr-2 text-blue-500" />
                        {t('dolphinScheduler.editor.globalParams')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        {params.map((param, index) => (
                            <div key={index} className="flex space-x-2 items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-150">
                                <div className="flex-1 grid grid-cols-4 gap-2">
                                    {/* 参数名 */}
                                    <input
                                        type="text"
                                        placeholder="prop"
                                        value={param.prop}
                                        onChange={e => {
                                            const newParams = [...params];
                                            newParams[index].prop = e.target.value;
                                            setParams(newParams);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md"
                                    />
                                    {/* 方向 IN/OUT */}
                                    <select
                                        value={param.direct}
                                        onChange={e => {
                                            const newParams = [...params];
                                            newParams[index].direct = e.target.value;
                                            setParams(newParams);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md"
                                    >
                                        <option value="IN">IN</option>
                                        <option value="OUT">OUT</option>
                                    </select>
                                    {/* 类型 */}
                                    <select
                                        value={param.type}
                                        onChange={e => {
                                            const newParams = [...params];
                                            newParams[index].type = e.target.value;
                                            setParams(newParams);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md"
                                    >
                                        <option value="VARCHAR">VARCHAR</option>
                                        <option value="INTEGER">INTEGER</option>
                                        <option value="LONG">LONG</option>
                                        <option value="FLOAT">FLOAT</option>
                                        <option value="DOUBLE">DOUBLE</option>
                                        <option value="DATE">DATE</option>
                                        <option value="TIME">TIME</option>
                                        <option value="TIMESTAMP">TIMESTAMP</option>
                                        <option value="BOOLEAN">BOOLEAN</option>
                                        <option value="LIST">LIST</option>
                                    </select>
                                    {/* 默认值 */}
                                    <input
                                        type="text"
                                        placeholder="value"
                                        value={param.value}
                                        onChange={e => {
                                            const newParams = [...params];
                                            newParams[index].value = e.target.value;
                                            setParams(newParams);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md"
                                    />
                                </div>
                                <button
                                    onClick={() => setParams(params.filter((_, i) => i !== index))}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        
                        <button
                            onClick={handleAdd}
                            className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center font-medium"
                        >
                            <Plus size={18} className="mr-2" />
                            {t('dolphinScheduler.editor.addParam')}
                        </button>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
};
