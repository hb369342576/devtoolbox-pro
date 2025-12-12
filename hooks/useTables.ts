import { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database.service';
import { DbConnection, TableInfo } from '../types';

/**
 * 通用 Hook: 获取表列表
 */
export const useTables = (connection: DbConnection | null, database: string) => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTables = async () => {
        if (!connection || !database) {
            setTables([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const tableList = await DatabaseService.getTables(connection, database);
            setTables(tableList);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tables');
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connection && database) {
            fetchTables();
        }
    }, [connection?.id, database]);

    return { tables, loading, error, refetch: fetchTables };
};
