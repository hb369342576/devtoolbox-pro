import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeFormProps } from './types';
import { Trash2, Plus, X, FolderOpen } from 'lucide-react';
import { ResourceSelector } from './ResourceSelector';

export const JavaNodeForm: React.FC<NodeFormProps> = ({
    data,
    onChange,
    projectConfig,
    readOnly = false
}) => {
    const { t } = useTranslation();
    const [activeSelector, setActiveSelector] = useState<'main' | 'resource' | null>(null);

    const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
    const inputClass = "w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-all";

    const localParams = data?.localParams || [];
    const selectedResources = data?.resourceList || [];
    const runType = data?.runType || 'FAT_JAR';
    const isNormalJar = runType === 'NORMAL_JAR';

    const handleSelectMainJar = (file: { id: number; fullName: string }) => {
        onChange({ ...data, mainJar: { id: file.id, resourceName: file.fullName } });
        setActiveSelector(null);
    };

    const handleSelectResource = (file: { id: number; fullName: string }) => {
        if (!selectedResources.some((r: any) => r.id === file.id)) {
            onChange({ ...data, resourceList: [...selectedResources, { id: file.id, resourceName: file.fullName }] });
        }
        setActiveSelector(null);
    };

    const handleRemoveResource = (id: number) => {
        onChange({ ...data, resourceList: selectedResources.filter((r: any) => r.id !== id) });
    };

    const handleAddParam = () => {
        onChange({ ...data, localParams: [...localParams, { prop: '', direct: 'IN', type: 'VARCHAR', value: '' }] });
    };

    const handleRemoveParam = (index: number) => {
        const p = [...localParams]; p.splice(index, 1);
        onChange({ ...data, localParams: p });
    };

    const handleUpdateParam = (index: number, field: string, val: any) => {
        const p = [...localParams]; p[index] = { ...p[index], [field]: val };
        onChange({ ...data, localParams: p });
    };

    return (
        <div className="space-y-4">
            {/* 运行类型 */}
            <div>
                <label className={labelClass}>{t('dolphinScheduler.editor.runType')}</label>
                <select
                    disabled={readOnly}
                    value={runType}
                    onChange={(e) => onChange({ ...data, runType: e.target.value })}
                    className={inputClass}
                >
                    <option value="FAT_JAR">FAT_JAR</option>
                    <option value="NORMAL_JAR">NORMAL_JAR</option>
                </select>
            </div>

            {/* NORMAL_JAR 额外字段 */}
            {isNormalJar && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <label className={`${labelClass} mb-0`}>{t('dolphinScheduler.editor.isModulePath')}</label>
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onChange({ ...data, isModulePath: !data?.isModulePath })}
                            className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${data?.isModulePath ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${data?.isModulePath ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    <div>
                        <label className={labelClass}>{t('dolphinScheduler.editor.mainClass')}</label>
                        <input
                            disabled={readOnly}
                            type="text"
                            value={data?.mainClass || ''}
                            onChange={(e) => onChange({ ...data, mainClass: e.target.value })}
                            placeholder="com.example.Main"
                            className={inputClass}
                        />
                    </div>
                </div>
            )}

            {/* 主程序包 - 使用ResourceSelector */}
            <div className="relative">
                <label className={labelClass}>
                    {t('dolphinScheduler.editor.mainJar')} <span className="text-red-500">*</span>
                </label>
                <div
                    onClick={() => !readOnly && setActiveSelector(activeSelector === 'main' ? null : 'main')}
                    className={`${inputClass} flex items-center justify-between cursor-pointer group`}
                >
                    <span className={`truncate text-sm ${!data?.mainJar?.resourceName ? 'text-slate-400' : ''}`}>
                        {data?.mainJar?.resourceName
                            ? data.mainJar.resourceName.split('/').pop()
                            : t('dolphinScheduler.editor.pleaseSelectMainJar')}
                    </span>
                    <FolderOpen size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
                </div>
                {activeSelector === 'main' && (
                    <ResourceSelector
                        projectConfig={projectConfig}
                        onClose={() => setActiveSelector(null)}
                        onSelect={handleSelectMainJar}
                        title={t('dolphinScheduler.editor.mainJar')}
                        initialPath={projectConfig?.projectName}
                    />
                )}
            </div>

            {/* 主程序参数 */}
            <div>
                <label className={labelClass}>{t('dolphinScheduler.editor.mainArgs')}</label>
                <textarea
                    disabled={readOnly}
                    value={data?.mainArgs || ''}
                    onChange={(e) => onChange({ ...data, mainArgs: e.target.value })}
                    rows={2}
                    placeholder={t('dolphinScheduler.editor.pleaseInputMainArgs')}
                    className={inputClass}
                />
            </div>

            {/* 虚拟机参数 */}
            <div>
                <label className={labelClass}>{t('dolphinScheduler.editor.jvmArgs')}</label>
                <textarea
                    disabled={readOnly}
                    value={data?.jvmArgs || ''}
                    onChange={(e) => onChange({ ...data, jvmArgs: e.target.value })}
                    rows={2}
                    placeholder={t('dolphinScheduler.editor.pleaseInputJvmArgs')}
                    className={inputClass}
                />
            </div>

            {/* 资源 - 使用ResourceSelector */}
            <div className="relative">
                <label className={labelClass}>{t('dolphinScheduler.editor.resources')}</label>
                <div
                    onClick={() => !readOnly && setActiveSelector(activeSelector === 'resource' ? null : 'resource')}
                    className={`${inputClass} flex items-center justify-between cursor-pointer group`}
                >
                    <span className="text-slate-400 text-sm">{t('dolphinScheduler.editor.pleaseSelectResources')}</span>
                    <FolderOpen size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
                </div>
                {activeSelector === 'resource' && (
                    <ResourceSelector
                        projectConfig={projectConfig}
                        onClose={() => setActiveSelector(null)}
                        onSelect={handleSelectResource}
                        title={t('dolphinScheduler.editor.resources')}
                        initialPath={projectConfig?.projectName}
                    />
                )}
                {selectedResources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                        {selectedResources.map((res: any) => (
                            <div key={res.id} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-xs text-slate-700 dark:text-slate-200 hover:border-red-200 dark:hover:border-red-900/30 transition-all">
                                <span className="truncate max-w-[180px]" title={res.resourceName}>
                                    {res.resourceName?.split('/').pop()}
                                </span>
                                {!readOnly && (
                                    <button onClick={() => handleRemoveResource(res.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 自定义参数 */}
            <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
                    {t('dolphinScheduler.editor.customParams')}
                </label>
                <div className="space-y-2">
                    {localParams.map((param: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 group p-2 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 rounded-lg transition-all">
                            <input disabled={readOnly} type="text" placeholder={t('dolphinScheduler.editor.pleaseInputProp')} value={param.prop}
                                onChange={e => handleUpdateParam(index, 'prop', e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500" />
                            <select disabled={readOnly} value={param.direct || 'IN'} onChange={e => handleUpdateParam(index, 'direct', e.target.value)}
                                className="w-16 px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 outline-none">
                                <option value="IN">IN</option><option value="OUT">OUT</option>
                            </select>
                            <select disabled={readOnly} value={param.type || 'VARCHAR'} onChange={e => handleUpdateParam(index, 'type', e.target.value)}
                                className="w-24 px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 outline-none">
                                {['VARCHAR','INTEGER','LONG','FLOAT','DOUBLE','DATE','TIME','TIMESTAMP','BOOLEAN'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <input disabled={readOnly} type="text" placeholder={t('dolphinScheduler.editor.pleaseInputValue')} value={param.value}
                                onChange={e => handleUpdateParam(index, 'value', e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500" />
                            {!readOnly && (
                                <button onClick={() => handleRemoveParam(index)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    {!readOnly && (
                        <button onClick={handleAddParam} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded transition-colors mt-1">
                            <Plus size={14} /><span>{t('dolphinScheduler.editor.addParam')}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
