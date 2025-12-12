import { useState } from 'react';
import { CompareKey, CompareResultRow } from '../../../types';

interface CompareStats {
    match: number;
    diff: number;
    sourceOnly: number;
    targetOnly: number;
}

/**
 * Hook: 管理数据对比逻辑
 */
export const useComparison = () => {
    const [results, setResults] = useState<CompareResultRow[]>([]);
    const [stats, setStats] = useState<CompareStats>({ match: 0, diff: 0, sourceOnly: 0, targetOnly: 0 });
    const [isLoading, setIsLoading] = useState(false);

    const executeComparison = (
        sourceTable: string,
        targetTable: string,
        primaryKeys: CompareKey[]
    ): Promise<void> => {
        return new Promise((resolve) => {
            setIsLoading(true);

            // 模拟对比过程
            setTimeout(() => {
                const mockResults: CompareResultRow[] = [];

                // 生成20行模拟数据
                for (let i = 1; i <= 20; i++) {
                    const r = Math.random();
                    const pk = `100${i}`;

                    if (r > 0.8) {
                        mockResults.push({
                            keyDisplay: pk,
                            status: 'diff',
                            sourceData: { id: pk, username: `User_${i}`, status: 1 },
                            targetData: { id: pk, username: `User_${i}_Modified`, status: 1 },
                            diffFields: ['username']
                        });
                    } else if (r > 0.7) {
                        mockResults.push({
                            keyDisplay: pk,
                            status: 'only_source',
                            sourceData: { id: pk, username: `User_${i}`, status: 1 },
                            targetData: null,
                            diffFields: []
                        });
                    } else if (r > 0.6) {
                        mockResults.push({
                            keyDisplay: pk,
                            status: 'only_target',
                            sourceData: null,
                            targetData: { id: pk, username: `User_${i}`, status: 0 },
                            diffFields: []
                        });
                    } else {
                        mockResults.push({
                            keyDisplay: pk,
                            status: 'match',
                            sourceData: { id: pk, username: `User_${i}`, status: 1 },
                            targetData: { id: pk, username: `User_${i}`, status: 1 },
                            diffFields: []
                        });
                    }
                }

                setResults(mockResults);
                setStats({
                    match: mockResults.filter(r => r.status === 'match').length,
                    diff: mockResults.filter(r => r.status === 'diff').length,
                    sourceOnly: mockResults.filter(r => r.status === 'only_source').length,
                    targetOnly: mockResults.filter(r => r.status === 'only_target').length,
                });

                setIsLoading(false);
                resolve();
            }, 1500);
        });
    };

    return {
        results,
        stats,
        isLoading,
        executeComparison
    };
};
