import { invoke } from '@tauri-apps/api/core';
import { DbConnection, TableInfo, TableDetail, ColumnInfo } from '../types';

/**
 * Database Service - 数据库操作 API 封装
 * 统一处理数据库连接、查询等操作
 */
export class DatabaseService {
    /**
     * 构建连接字符串
     */
    private static getConnectionString(conn: DbConnection): string {
        return `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
    }

    /**
     * 获取数据库列表
     */
    static async getDatabases(conn: DbConnection): Promise<string[]> {
        const connStr = this.getConnectionString(conn);
        try {
            return await invoke<string[]>('db_get_databases', { id: connStr });
        } catch (error) {
            console.error('Failed to fetch databases:', error);
            throw error;
        }
    }

    /**
     * 获取表列表
     */
    static async getTables(conn: DbConnection, database: string): Promise<TableInfo[]> {
        const connStr = this.getConnectionString(conn);
        try {
            return await invoke<TableInfo[]>('db_get_tables', { id: connStr, db: database });
        } catch (error) {
            console.error('Failed to fetch tables:', error);
            throw error;
        }
    }

    /**
     * 获取表结构详情
     */
    static async getTableSchema(
        conn: DbConnection,
        database: string,
        table: string
    ): Promise<TableDetail> {
        const connStr = this.getConnectionString(conn);
        try {
            return await invoke<TableDetail>('db_get_table_schema', {
                id: connStr,
                db: database,
                table
            });
        } catch (error) {
            console.error('Failed to fetch table schema:', error);
            throw error;
        }
    }

    /**
     * 测试连接
     */
    static async testConnection(conn: DbConnection): Promise<boolean> {
        const connStr = this.getConnectionString(conn);
        try {
            await invoke('db_test_connection', { id: connStr });
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * 执行SQL查询（如果后端支持）
     */
    static async executeQuery(
        conn: DbConnection,
        database: string,
        query: string
    ): Promise<any> {
        const connStr = this.getConnectionString(conn);
        try {
            return await invoke('db_execute_query', {
                id: connStr,
                db: database,
                query
            });
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }
}
