import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Trash2 } from 'lucide-react';
import { useFieldMappingStore } from '../store';
import { FieldMapping, Language } from '../../../types';
import { getTexts } from '../../../locales';

interface MappingModalProps {
    lang: Language;
}

export const MappingModal: React.FC<MappingModalProps> = ({ lang }) => {
    // Zustand
    const showMappingModal = useFieldMappingStore((state) => state.showMappingModal);
    const activeLink = useFieldMappingStore((state) => state.activeLink);
    const nodes = useFieldMappingStore((state) => state.nodes);
    const setShowMappingModal = useFieldMappingStore((state) => state.setShowMappingModal);
    const syncPathMappings = useFieldMappingStore((state) => state.syncPathMappings);

    // Logic
    const [localMappings, setLocalMappings] = useState<FieldMapping[]>([]);
    const [originalMappings, setOriginalMappings] = useState<FieldMapping[]>([]); // 用于检测修改
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchText, setBatchText] = useState('');

    // Resize Logic (Moved up to fixes Hooks violation)
    const [modalSize, setModalSize] = useState({ width: 900, height: 600 });
    const resizeRef = React.useRef<{ w: number, h: number, x: number, y: number } | null>(null);

    // Find linked nodes
    const sourceNode = nodes.find(n => n.id === activeLink?.sourceNodeId);
    const targetNode = nodes.find(n => n.id === activeLink?.targetNodeId);

    useEffect(() => {
        if (activeLink) {
            setLocalMappings(activeLink.mappings || []);
            setOriginalMappings(activeLink.mappings || []); // 保存原始映射
        }
    }, [activeLink]);

    // 检测是否有修改（使用 JSON 序列化进行深层比较）
    const hasChanges = (): boolean => {
        const currentStr = JSON.stringify(localMappings.map(m => ({
            sourceField: m.sourceField,
            targetField: m.targetField
        })));
        const originalStr = JSON.stringify(originalMappings.map(m => ({
            sourceField: m.sourceField,
            targetField: m.targetField
        })));
        return currentStr !== originalStr;
    };

    const handleClose = () => {
        // 如果有修改，提示保存
        if (hasChanges()) {
            const confirmSave = window.confirm(
                lang === 'zh' 
                    ? '映射已修改，是否保存？' 
                    : 'Mappings have been modified. Save changes?'
            );
            if (confirmSave) {
                handleSave();
                return;
            }
        }
        setIsBatchMode(false);
        setBatchText('');
        setShowMappingModal(false);
    };



    const handleRemoveMapping = (index: number) => {
        setLocalMappings(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateField = (index: number, side: 'source' | 'target', value: string) => {
        const newMappings = [...localMappings];
        const mapping = newMappings[index];

        if (side === 'source') {
            const col = sourceNode?.columns?.find(c => c.name === value);
            if (col) {
                mapping.sourceField = col.name;
                mapping.sourceType = col.type;
            }
        } else {
            const col = targetNode?.columns?.find(c => c.name === value);
            if (col) {
                mapping.targetField = col.name;
                mapping.targetType = col.type;
            }
        }
        setLocalMappings(newMappings);
    };

    const parseBatchText = (text: string): FieldMapping[] => {
        const lines = text.trim().split('\n');
        const newMappings: FieldMapping[] = [];
        lines.forEach(line => {
            if (!line.trim()) return;
            // Support tab, comma, space as separators
            const parts = line.split(/[\t, ]+/);
            if (parts.length >= 2) {
                const sName = parts[0].trim();
                const tName = parts[1].trim();
                const sCol = sourceNode?.columns?.find(c => c.name === sName);
                const tCol = targetNode?.columns?.find(c => c.name === tName);
                if (sCol && tCol) {
                    newMappings.push({
                        id: Date.now() + Math.random().toString(),
                        sourceField: sCol.name,
                        sourceType: sCol.type,
                        targetField: tCol.name,
                        targetType: tCol.type
                    });
                }
            }
        });
        return newMappings;
    };

    const handleBatchEditToggle = () => {
        if (!isBatchMode) {
            // Enter batch mode: generate text from current mappings
            const text = localMappings.map(m => `${m.sourceField}\t${m.targetField}`).join('\n');
            setBatchText(text);
        } else {
            // Exit batch mode: parse text
            setLocalMappings(parseBatchText(batchText));
        }
        setIsBatchMode(!isBatchMode);
    };

    const handleSave = () => {
        let mappingsToSave = localMappings;
        if (isBatchMode) {
            mappingsToSave = parseBatchText(batchText);
        }

        if (activeLink) {
            // 使用 syncPathMappings 同步所有同路径连线
            syncPathMappings(activeLink.id, mappingsToSave);
        }
        setIsBatchMode(false);
        setBatchText('');
        setShowMappingModal(false);
    };

    if (!showMappingModal || !activeLink || !sourceNode || !targetNode) return null;

    const t = getTexts(lang);

    // Auto-map helpers
    const handleAutoMap = () => {
        const newMappings: FieldMapping[] = [...localMappings];
        (sourceNode?.columns || []).forEach(sCol => {
            const tCol = targetNode?.columns?.find(c => c.name.toLowerCase() === sCol.name.toLowerCase());
            if (tCol) {
                if (!newMappings.some(m => m.sourceField === sCol.name && m.targetField === tCol.name)) {
                    newMappings.push({
                        id: Date.now() + Math.random().toString(),
                        sourceField: sCol.name,
                        sourceType: sCol.type,
                        targetField: tCol.name,
                        targetType: tCol.type
                    });
                }
            }
        });
        setLocalMappings(newMappings);
    };

    const availableSourceCols = sourceNode.columns || [];
    const availableTargetCols = targetNode.columns || [];

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        resizeRef.current = {
            w: modalSize.width,
            h: modalSize.height,
            x: e.clientX,
            y: e.clientY
        };
        window.addEventListener('mousemove', doResize);
        window.addEventListener('mouseup', stopResize);
    };

    const doResize = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = e.clientX - resizeRef.current.x;
        const dy = e.clientY - resizeRef.current.y;

        // Multiplier 2 because of flex-center layout (resizing expands both ways)
        setModalSize({
            width: Math.max(600, resizeRef.current.w + dx * 2),
            height: Math.max(400, resizeRef.current.h + dy * 2)
        });
    };

    const stopResize = () => {
        window.removeEventListener('mousemove', doResize);
        window.removeEventListener('mouseup', stopResize);
        resizeRef.current = null;
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border dark:border-slate-700 relative"
                style={{ width: modalSize.width, height: modalSize.height, maxHeight: '95vh', maxWidth: '95vw' }}
            >
                {/* Header */}
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl select-none">
                    <div>
                        <h3 className="font-bold text-lg dark:text-white flex items-center">
                            {sourceNode.tableName} <ArrowRight className="mx-2 text-slate-400" size={16} /> {targetNode.tableName}
                        </h3>
                        {/* <p className="text-xs text-slate-500">字段映射配置</p> */}
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    <div className="flex justify-between mb-4 select-none">
                        <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300">
                            {isBatchMode ? '批量编辑 (格式: 源字段 目标字段)' : `已映射字段 (${localMappings.length})`}
                        </h4>
                        <div className="space-x-2">
                            <button
                                onClick={handleBatchEditToggle}
                                className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                            >
                                {isBatchMode ? '返回列表 (应用更改)' : '批量文本编辑'}
                            </button>
                            {!isBatchMode && (
                                <button
                                    onClick={handleAutoMap}
                                    className="text-xs px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                >
                                    按名称自动映射
                                </button>
                            )}
                        </div>
                    </div>

                    {isBatchMode ? (
                        <textarea
                            value={batchText}
                            onChange={(e) => setBatchText(e.target.value)}
                            className="flex-1 w-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200"
                            placeholder={"SourceField1 TargetField1\nSourceField2 TargetField2\n..."}
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto border rounded-lg dark:border-slate-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 w-[45%]">源字段 ({sourceNode.dbType})</th>
                                        <th className="px-4 py-3 text-center w-[10%]"><ArrowRight size={14} className="mx-auto" /></th>
                                        <th className="px-4 py-3 w-[45%]">目标字段 ({targetNode.dbType})</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {localMappings.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                                            <td className="px-2 py-2">
                                                <select
                                                    value={m.sourceField}
                                                    onChange={(e) => handleUpdateField(idx, 'source', e.target.value)}
                                                    className="w-full p-1.5 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded text-slate-700 dark:text-slate-200 font-mono text-sm focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none"
                                                >
                                                    {availableSourceCols.map(c => (
                                                        <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 text-center text-slate-300">
                                                <ArrowRight size={14} className="mx-auto" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={m.targetField}
                                                    onChange={(e) => handleUpdateField(idx, 'target', e.target.value)}
                                                    className="w-full p-1.5 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded text-slate-700 dark:text-slate-200 font-mono text-sm focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none"
                                                >
                                                    {availableTargetCols.map(c => (
                                                        <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <button onClick={() => handleRemoveMapping(idx)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {localMappings.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                                {lang === 'zh' ? '暂无映射，请添加' : 'No mappings yet.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!isBatchMode && (
                        /* Add Manual Mapping Section */
                        <div className="mt-4 pt-4 border-t dark:border-slate-700 grid grid-cols-7 gap-4 items-end">
                            <div className="col-span-3">
                                <label className="block text-xs font-bold text-slate-500 mb-1">源字段</label>
                                <select id="new-source" className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 text-sm">
                                    {availableSourceCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="block text-xs font-bold text-slate-500 mb-1">目标字段</label>
                                <select id="new-target" className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 text-sm">
                                    {availableTargetCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <button
                                    onClick={() => {
                                        const s = (document.getElementById('new-source') as HTMLSelectElement).value;
                                        const t = (document.getElementById('new-target') as HTMLSelectElement).value;
                                        if (s && t) {
                                            const sInfo = sourceNode.columns.find(c => c.name === s);
                                            const tInfo = targetNode.columns.find(c => c.name === t);
                                            setLocalMappings([...localMappings, {
                                                id: Date.now().toString(),
                                                sourceField: s,
                                                sourceType: sInfo?.type,
                                                targetField: t,
                                                targetType: tInfo?.type
                                            }]);
                                        }
                                    }}
                                    className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold"
                                >
                                    添加
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900 rounded-b-xl select-none">
                    <button onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">取消</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-lg">保存映射</button>
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={startResize}
                    className="absolute bottom-0 right-0 w-6 h-6 z-20 cursor-nwse-resize flex items-center justify-center text-slate-400 hover:text-indigo-600"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v6" />
                        <path d="M15 21h6" />
                        <path d="M21 9v2" />
                        <path d="M9 21h2" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
