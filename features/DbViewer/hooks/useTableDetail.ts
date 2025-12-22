import { useEffect, useState } from 'react';
import { DatabaseService } from '../../../services/database.service';
import { useDbViewerStore } from '../store';

/**
 * Hook: 获取表详情（字段 + DDL）
 */
export const useTableDetail = () => {
    const selectedConnection = useDbViewerStore((state) => state.selectedConnection);
    const selectedDatabase = useDbViewerStore((state) => state.selectedDatabase);
    const selectedTable = useDbViewerStore((state) => state.selectedTable);

    const setColumns = useDbViewerStore((state) => state.setColumns);
    const setDdl = useDbViewerStore((state) => state.setDdl);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = async () => {
        if (!selectedConnection || !selectedDatabase || !selectedTable) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const detail = await DatabaseService.getTableSchema(
                selectedConnection,
                selectedDatabase,
                selectedTable
            );

            setColumns(detail.columns);
            setDdl(detail.ddl);
        } catch (err) {
            console.error('Failed to fetch table detail:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch table details');
            setColumns([]);
            setDdl('');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTable) {
            fetchDetail();
        } else {
            // 清空数据
            setColumns([]);
            setDdl('');
        }
    }, [selectedConnection?.id, selectedDatabase, selectedTable]);

    return { loading, error, refetch: fetchDetail };
};
