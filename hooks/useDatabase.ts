import { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database.service';
import { DbConnection } from '../types';

/**
 * 通用 Hook: 获取数据库列表
 */
export const useDatabase = (connection: DbConnection | null) => {
    const [databases, setDatabases] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDatabases = async () => {
        if (!connection) {
            setDatabases([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const dbs = await DatabaseService.getDatabases(connection);
            setDatabases(dbs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch databases');
            setDatabases([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connection) {
            fetchDatabases();
        }
    }, [connection?.id]); // 仅当连接ID变化时重新获取

    return { databases, loading, error, refetch: fetchDatabases };
};
