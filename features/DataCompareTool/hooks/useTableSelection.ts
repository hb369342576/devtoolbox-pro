import { useState, useEffect } from 'react';
import { DbConnection, TableInfo } from '../../../types';
import { invoke } from '@tauri-apps/api/core';
import { SideConfig } from '../types';

/**
 * Hook: 管理源端和目标端的数据库、表选择
 */
export const useTableSelection = (
    connections: DbConnection[],
    sourceConfig: SideConfig,
    targetConfig: SideConfig,
    setSourceConfig: (config: SideConfig) => void,
    setTargetConfig: (config: SideConfig) => void
) => {
    const [sourceDbs, setSourceDbs] = useState<string[]>([]);
    const [targetDbs, setTargetDbs] = useState<string[]>([]);
    const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
    const [targetTables, setTargetTables] = useState<TableInfo[]>([]);
    const [sourceTableSearch, setSourceTableSearch] = useState('');
    const [targetTableSearch, setTargetTableSearch] = useState('');

    // 获取数据库列表
    const fetchDatabases = async (connId: string, side: 'source' | 'target') => {
        const conn = connections.find(c => c.id === connId);
        if (!conn) return;

        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        try {
            const dbs = await invoke<string[]>('db_get_databases', { id: connStr });
            side === 'source' ? setSourceDbs(dbs) : setTargetDbs(dbs);
        } catch (e) {
            console.error('Failed to fetch databases:', e);
        }
    };

    // 获取表列表
    const fetchTables = async (connId: string, db: string, side: 'source' | 'target') => {
        const conn = connections.find(c => c.id === connId);
        if (!conn) return;

        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        try {
            const tables = await invoke<TableInfo[]>('db_get_tables', { id: connStr, db });
            side === 'source' ? setSourceTables(tables) : setTargetTables(tables);
        } catch (e) {
            console.error('Failed to fetch tables:', e);
        }
    };

    // Effects: 当连接改变时加载数据库
    useEffect(() => {
        if (sourceConfig.connId) fetchDatabases(sourceConfig.connId, 'source');
    }, [sourceConfig.connId]);

    useEffect(() => {
        if (targetConfig.connId) fetchDatabases(targetConfig.connId, 'target');
    }, [targetConfig.connId]);

    // Effects: 当数据库改变时加载表
    useEffect(() => {
        if (sourceConfig.connId && sourceConfig.db) fetchTables(sourceConfig.connId, sourceConfig.db, 'source');
    }, [sourceConfig.db]);

    useEffect(() => {
        if (targetConfig.connId && targetConfig.db) fetchTables(targetConfig.connId, targetConfig.db, 'target');
    }, [targetConfig.db]);

    // 过滤后的表列表
    const filteredSourceTables = sourceTables.filter(t =>
        t.name.toLowerCase().includes(sourceTableSearch.toLowerCase())
    );

    const filteredTargetTables = targetTables.filter(t =>
        t.name.toLowerCase().includes(targetTableSearch.toLowerCase())
    );

    return {
        sourceDbs,
        targetDbs,
        filteredSourceTables,
        filteredTargetTables,
        sourceTableSearch,
        setSourceTableSearch,
        targetTableSearch,
        setTargetTableSearch
    };
};
