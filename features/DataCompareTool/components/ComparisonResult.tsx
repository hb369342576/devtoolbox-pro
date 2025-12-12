import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Language, CompareResultRow, CompareKey } from '../../../types';
import { getTexts } from '../../../locales';

interface CompareStats {
    match: number;
    diff: number;
    sourceOnly: number;
    targetOnly: number;
}

interface ComparisonResultProps {
    lang: Language;
    results: CompareResultRow[];
    stats: CompareStats;
    primaryKeys: CompareKey[];
    onBack: () => void;
}

/**
 * 对比结果展示组件
 * 显示数据对比的详细结果
 */
export const ComparisonResult: React.FC<ComparisonResultProps> = ({
    lang,
    results,
    stats,
    primaryKeys,
    onBack
}) => {
    const t = getTexts(lang);
    const [hoverRow, setHoverRow] = useState<number | null>(null);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.dataCompare.step2}</h2>
                    <div className="flex space-x-2 text-xs font-medium">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center">
                            <CheckCircle size={12} className="mr-1" /> {stats.match} {t.dataCompare.statMatch}
                        </span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center">
                            <AlertCircle size={12} className="mr-1" /> {stats.diff} {t.dataCompare.statDiff}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {stats.sourceOnly} {t.dataCompare.statSourceOnly}
                        </span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                            {stats.targetOnly} {t.dataCompare.statTargetOnly}
                        </span>
                    </div>
                </div>
            </div>

            {/* Result Table (Div Grid) */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <div className="col-span-1">{t.dataCompare.rowStatus}</div>
                    <div className="col-span-3">
                        {t.dataCompare.keyVal} ({primaryKeys.map(k => k.field).join(',')})
                    </div>
                    <div className="col-span-4">{t.dataCompare.sourceSide}</div>
                    <div className="col-span-4">{t.dataCompare.targetSide}</div>
                </div>

                {/* Body Rows */}
                <div className="overflow-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700">
                    {results.map((row, idx) => (
                        <div
                            key={idx}
                            onMouseEnter={() => setHoverRow(idx)}
                            onMouseLeave={() => setHoverRow(null)}
                            className={`grid grid-cols-12 gap-4 px-6 py-3 items-center text-sm font-mono cursor-pointer transition-all duration-150 border-l-4
                ${row.status === 'diff' ? 'bg-red-50/50 dark:bg-red-900/10' :
                                    row.status === 'only_source' ? 'bg-blue-50/50 dark:bg-blue-900/10' :
                                        row.status === 'only_target' ? 'bg-orange-50/50 dark:bg-orange-900/10' :
                                            'bg-white dark:bg-slate-800'}
              `}
                            style={hoverRow === idx ? {
                                backgroundColor: '#f3e8ff', // purple-50
                                borderColor: '#a855f7', // purple-500
                                zIndex: 10,
                                transform: 'scale(1.002)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            } : {
                                borderColor: 'transparent'
                            }}
                        >
                            {/* Status Badge */}
                            <div className="col-span-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${row.status === 'match' ? 'bg-green-100 text-green-700' :
                                    row.status === 'diff' ? 'bg-red-100 text-red-700' :
                                        row.status === 'only_source' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {row.status}
                                </span>
                            </div>

                            {/* Primary Keys */}
                            <div className="col-span-3 font-bold text-slate-700 dark:text-slate-200 truncate" title={row.keyDisplay}>
                                {row.keyDisplay}
                            </div>

                            {/* Source Data */}
                            <div className="col-span-4 max-h-24 overflow-auto custom-scrollbar">
                                {row.sourceData ? (
                                    <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(row.sourceData, null, 2)}
                                    </pre>
                                ) : <span className="text-slate-300 italic">NULL</span>}
                            </div>

                            {/* Target Data (with Diff Highlighting) */}
                            <div className="col-span-4 max-h-24 overflow-auto custom-scrollbar">
                                {row.targetData ? (
                                    <pre className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400">
                                        {row.status === 'diff' ? Object.entries(row.targetData).map(([k, v], i) => (
                                            <span key={i} className={row.diffFields?.includes(k) ? 'bg-yellow-200 dark:bg-yellow-900/50 text-slate-900 dark:text-white font-bold px-1 rounded' : ''}>
                                                {`"${k}": ${JSON.stringify(v)}\n`}
                                            </span>
                                        )) : JSON.stringify(row.targetData, null, 2)}
                                    </pre>
                                ) : <span className="text-slate-300 italic">NULL</span>}
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic">
                            {t.common.noData || "No results"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
