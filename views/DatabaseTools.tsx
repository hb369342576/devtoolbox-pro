import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Table as TableIcon,
  Code,
  Play,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Save,
  Plus,
  Trash2,
  Server,
  Search,
  MoreVertical,
  X,
  Check,
  ChevronDown,
  Key,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  Columns,
  Monitor,
  Globe,
  Settings,
  Link,
  Plug,
  Layers,
  FileCheck
} from 'lucide-react';
import { SQL_TEMPLATES } from '../constants';
import { Language, TableInfo, DbConnection, DatabaseType, TableDetail, ColumnInfo } from '../types';

/* --- TYPE DEFINITIONS FOR TAURI --- */
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
    };
  }
}

import { invoke } from '@tauri-apps/api/core';

const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

/* --- SERVICE INTERFACE --- */
interface IDatabaseService {
  testConnection(conn: Partial<DbConnection>): Promise<boolean>;
  getDatabases(conn: DbConnection): Promise<string[]>;
  getTables(conn: DbConnection, db: string): Promise<TableInfo[]>;
  getTableSchema(conn: DbConnection, db: string, tableName: string): Promise<TableDetail>;
}

/* --- 1. MOCK SERVICE (WEB) --- */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockDatabaseService implements IDatabaseService {
  async testConnection(conn: Partial<DbConnection>): Promise<boolean> {
    await delay(800);
    if (!conn.host || conn.host === 'error') return false;
    return true;
  }

  async getDatabases(conn: DbConnection): Promise<string[]> {
    await delay(400);
    if (conn.type === 'Doris') return ['example_db', 'audit_logs', 'data_warehouse'];
    return ['app_production', 'user_center', 'logs_archive', 'sys_config', 'information_schema'];
  }

  async getTables(conn: DbConnection, db: string): Promise<TableInfo[]> {
    await delay(300);
    if (db === 'user_center') {
      return [
        { name: 'users', rows: 15420, size: '2.4MB', comment: 'User profiles' },
        { name: 'user_logins', rows: 450000, size: '45MB', comment: 'Login history' },
        { name: 'permissions', rows: 12, size: '16KB', comment: 'RBAC permissions' },
        { name: 'roles', rows: 5, size: '16KB', comment: 'User roles' },
      ];
    }
    if (db === 'data_warehouse') {
      return [
        { name: 'fact_orders', rows: 12000000, size: '2.4GB', comment: 'Daily order facts' },
        { name: 'dim_products', rows: 5000, size: '1.2MB', comment: 'Product dimension' },
        { name: 'ads_sales_report', rows: 365, size: '120KB', comment: 'Daily sales aggregate' },
      ];
    }
    return [
      { name: 'app_logs', rows: 5000, size: '1.2MB', comment: 'Application logs' },
      { name: 'system_settings', rows: 24, size: '16KB', comment: 'Config key-values' },
      { name: 'jobs_queue', rows: 0, size: '16KB', comment: 'Async job queue' },
    ];
  }

  async getTableSchema(conn: DbConnection, db: string, tableName: string): Promise<TableDetail> {
    await delay(500);

    let columns: ColumnInfo[] = [
      { name: 'id', type: 'bigint', length: 20, nullable: false, isPrimaryKey: true, comment: 'Primary Key' },
    ];

    if (tableName.includes('user')) {
      columns.push(
        { name: 'username', type: 'varchar', length: 50, nullable: false, isPrimaryKey: false, comment: 'Login username' },
        { name: 'email', type: 'varchar', length: 100, nullable: true, isPrimaryKey: false, comment: 'Contact email' },
        { name: 'password_hash', type: 'varchar', length: 255, nullable: false, isPrimaryKey: false },
        { name: 'status', type: 'tinyint', length: 1, nullable: false, isPrimaryKey: false, defaultValue: '1', comment: '1:Active 0:Inactive' }
      );
    } else if (tableName.includes('order') || tableName.includes('fact')) {
      columns.push(
        { name: 'order_no', type: 'varchar', length: 32, nullable: false, isPrimaryKey: false, comment: 'Order Number' },
        { name: 'user_id', type: 'bigint', length: 20, nullable: false, isPrimaryKey: false },
        { name: 'amount', type: 'decimal', length: 10, scale: 2, nullable: false, isPrimaryKey: false, defaultValue: '0.00' },
        { name: 'payment_status', type: 'varchar', length: 20, nullable: false, isPrimaryKey: false, defaultValue: "'PENDING'" }
      );
    } else {
      columns.push(
        { name: 'name', type: 'varchar', length: 255, nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false }
      );
    }

    columns.push(
      { name: 'created_at', type: 'datetime', nullable: false, isPrimaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, isPrimaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' }
    );

    return {
      name: tableName,
      rows: 1000,
      size: '1MB',
      engine: 'InnoDB',
      collation: 'utf8mb4_general_ci',
      comment: `Table for ${tableName}`,
      columns
    };
  }
}

/* --- 2. TAURI SERVICE (REAL) --- */
class TauriDatabaseService implements IDatabaseService {
  async testConnection(conn: Partial<DbConnection>): Promise<boolean> {
    try {
      return await invoke('db_test_connection', { payload: conn });
    } catch (e) {
      console.error('Tauri connection failed:', e);
      return false;
    }
  }

  async getDatabases(conn: DbConnection): Promise<string[]> {
    return await invoke('db_get_databases', { id: conn.id });
  }

  async getTables(conn: DbConnection, db: string): Promise<TableInfo[]> {
    return await invoke('db_get_tables', { id: conn.id, db });
  }

  async getTableSchema(conn: DbConnection, db: string, tableName: string): Promise<TableDetail> {
    return await invoke('db_get_table_schema', { id: conn.id, db, table: tableName });
  }
}

// Factory to get correct service
const getDbService = (): IDatabaseService => {
  return isTauri ? new TauriDatabaseService() : new MockDatabaseService();
};

class SqlGenerator {
  static generateDDL(table: TableDetail, targetDbType: DatabaseType): string {
    const isMySQL = targetDbType === 'MySQL' || targetDbType === 'Doris';
    const isPG = targetDbType === 'PostgreSQL';
    const isOracle = targetDbType === 'Oracle';
    const isSQLServer = targetDbType === 'SQL Server';

    const quote = isMySQL ? '`' : '"';

    let sql = `CREATE TABLE ${quote}${table.name}${quote} (\n`;

    const colDefs = table.columns.map(col => {
      let type = col.type.toUpperCase();

      // Dialect Type conversion map
      if (isPG) {
        if (type.includes('INT') && col.isPrimaryKey) type = 'SERIAL';
        else if (type === 'DATETIME') type = 'TIMESTAMP';
        else if (type === 'TINYINT') type = 'SMALLINT';
      } else if (isOracle) {
        if (type === 'VARCHAR') type = 'VARCHAR2';
        else if (type === 'DATETIME') type = 'DATE';
        else if (type === 'BIGINT') type = 'NUMBER(19)';
        else if (type === 'INT') type = 'NUMBER(10)';
      } else if (isSQLServer) {
        if (type === 'DATETIME') type = 'DATETIME2';
      }

      let def = `  ${quote}${col.name}${quote} ${type}`;

      // Length handling
      if (col.length && !['datetime', 'text', 'date', 'timestamp', 'serial'].includes(col.type)) {
        if (isPG && type === 'VARCHAR') def += `(${col.length})`;
        else if (!isPG) def += `(${col.length}${col.scale ? ',' + col.scale : ''})`;
      }

      if (!col.nullable && !type.includes('SERIAL')) def += ' NOT NULL';

      // Auto Increment / Identity
      if (col.isPrimaryKey && targetDbType === 'MySQL') def += ' AUTO_INCREMENT';
      if (col.isPrimaryKey && targetDbType === 'SQL Server') def += ' IDENTITY(1,1)';

      // Default
      if (col.defaultValue && !type.includes('SERIAL')) {
        let defaultVal = col.defaultValue;
        if (isPG && defaultVal === 'CURRENT_TIMESTAMP') defaultVal = 'CURRENT_TIMESTAMP';
        else if (isOracle && defaultVal === 'CURRENT_TIMESTAMP') defaultVal = 'SYSDATE';
        def += ` DEFAULT ${defaultVal}`;
      }

      // Inline Comments (MySQL/Doris only usually support inline, others need separate statements)
      if ((isMySQL) && col.comment) def += ` COMMENT '${col.comment}'`;

      return def;
    });

    // Primary Keys
    const pks = table.columns.filter(c => c.isPrimaryKey).map(c => `${quote}${c.name}${quote}`);
    if (pks.length > 0) {
      colDefs.push(`  CONSTRAINT pk_${table.name} PRIMARY KEY (${pks.join(', ')})`);
    }

    sql += colDefs.join(',\n');
    sql += `\n)`;

    // Table Options
    if (targetDbType === 'MySQL') {
      sql += ` ENGINE=${table.engine || 'InnoDB'} DEFAULT CHARSET=utf8mb4`;
      if (table.comment) sql += ` COMMENT='${table.comment}'`;
    } else if (targetDbType === 'Doris') {
      sql += `\nENGINE=OLAP\nUNIQUE KEY(${quote}id${quote})\nDISTRIBUTED BY HASH(${quote}id${quote}) BUCKETS 10\nPROPERTIES (\n  "replication_num" = "1"\n)`;
    }

    sql += ';';

    // Post-create comments for non-MySQL DBs
    if (!isMySQL && table.columns.some(c => c.comment)) {
      sql += '\n\n';
      table.columns.forEach(col => {
        if (col.comment) {
          sql += `COMMENT ON COLUMN ${quote}${table.name}${quote}.${quote}${col.name}${quote} IS '${col.comment}';\n`;
        }
      });
      if (table.comment) {
        sql += `COMMENT ON TABLE ${quote}${table.name}${quote} IS '${table.comment}';\n`;
      }
    }

    return sql;
  }

  static generateSelect(table: TableDetail, dbType: DatabaseType): string {
    const quote = dbType === 'MySQL' || dbType === 'Doris' ? '`' : '"';
    const cols = table.columns.map(c => `${quote}${c.name}${quote}`).join(', ');
    return `SELECT \n  ${cols} \nFROM ${quote}${table.name}${quote} \nLIMIT 100;`;
  }

  static generateInsert(table: TableDetail, dbType: DatabaseType): string {
    const quote = dbType === 'MySQL' || dbType === 'Doris' ? '`' : '"';
    const cols = table.columns.filter(c => !c.isPrimaryKey || dbType !== 'MySQL').map(c => `${quote}${c.name}${quote}`);

    const values = table.columns.filter(c => !c.isPrimaryKey || dbType !== 'MySQL').map(c => {
      if (['int', 'bigint', 'tinyint', 'decimal', 'double'].includes(c.type)) return '0';
      if (['datetime', 'date'].includes(c.type)) return "'2024-01-01 12:00:00'";
      return "'test_value'";
    });

    return `INSERT INTO ${quote}${table.name}${quote} \n(${cols.join(', ')}) \nVALUES \n(${values.join(', ')});`;
  }

  static generateUpdate(table: TableDetail, dbType: DatabaseType): string {
    const quote = dbType === 'MySQL' || dbType === 'Doris' ? '`' : '"';
    const pk = table.columns.find(c => c.isPrimaryKey) || table.columns[0];
    const updateCols = table.columns
      .filter(c => c.name !== pk.name && c.name !== 'created_at')
      .slice(0, 3)
      .map(c => {
        let val = "'new_value'";
        if (['int', 'bigint', 'tinyint'].includes(c.type)) val = '1';
        if (['datetime'].includes(c.type)) val = 'NOW()';
        return `  ${quote}${c.name}${quote} = ${val}`;
      });

    return `UPDATE ${quote}${table.name}${quote} \nSET \n${updateCols.join(',\n')} \nWHERE ${quote}${pk.name}${quote} = 1;`;
  }

  static generateDelete(table: TableDetail, dbType: DatabaseType): string {
    const quote = dbType === 'MySQL' || dbType === 'Doris' ? '`' : '"';
    const pk = table.columns.find(c => c.isPrimaryKey) || table.columns[0];
    return `DELETE FROM ${quote}${table.name}${quote} \nWHERE ${quote}${pk.name}${quote} = 1;`;
  }
}

/* --- 1. MySQL Viewer Component --- */

const INITIAL_CONNECTIONS: DbConnection[] = [
  { id: '1', name: 'Local MySQL', type: 'MySQL', host: 'localhost', port: '3306', user: 'root', defaultDatabase: 'app_production' },
  { id: '2', name: 'Prod Doris', type: 'Doris', host: '192.168.1.100', port: '9030', user: 'admin', defaultDatabase: 'data_warehouse' },
];

export const DbViewer: React.FC<{ lang: Language }> = ({ lang }) => {
  const dbService = React.useMemo(() => getDbService(), []);

  const [connections, setConnections] = useState<DbConnection[]>(() => {
    const saved = localStorage.getItem('db_connections');
    return saved ? JSON.parse(saved) : INITIAL_CONNECTIONS;
  });

  useEffect(() => {
    localStorage.setItem('db_connections', JSON.stringify(connections));
  }, [connections]);

  const [activeConnection, setActiveConnection] = useState<DbConnection | null>(null);

  // Workbench State
  const [databases, setDatabases] = useState<string[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>('');

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [selectedTableSchema, setSelectedTableSchema] = useState<TableDetail | null>(null);

  const [sqlContent, setSqlContent] = useState<string>('');
  const [sqlMode, setSqlMode] = useState<'DDL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'>('DDL');
  const [convertTarget, setConvertTarget] = useState<DatabaseType>('MySQL');

  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; table: TableInfo | null }>({ x: 0, y: 0, table: null });

  // Form State
  const [newConn, setNewConn] = useState<Partial<DbConnection>>({
    type: 'MySQL', host: 'localhost', port: '3306', user: 'root', name: 'New Connection'
  });

  // Load databases when connection becomes active
  useEffect(() => {
    if (activeConnection) {
      setIsLoading(true);
      dbService.getDatabases(activeConnection).then(dbs => {
        setDatabases(dbs);
        const dbToSelect = activeConnection.defaultDatabase && dbs.includes(activeConnection.defaultDatabase)
          ? activeConnection.defaultDatabase
          : dbs[0];
        setActiveDatabase(dbToSelect || '');
        setIsLoading(false);
      });
      // Set default convert target same as connection type
      setConvertTarget(activeConnection.type);
    }
  }, [activeConnection, dbService]);

  // Load tables when active database changes
  useEffect(() => {
    if (activeConnection && activeDatabase) {
      setIsLoading(true);
      dbService.getTables(activeConnection, activeDatabase).then(tbls => {
        setTables(tbls);
        setIsLoading(false);
        setSelectedTable(null);
        setSelectedTableSchema(null);
        setSqlContent('');
      });
    }
  }, [activeDatabase, activeConnection, dbService]);

  const handleConnect = async (conn: DbConnection) => {
    setIsConnecting(true);
    // Add artificial delay for UX if mock
    if (!isTauri) await delay(600);
    setActiveConnection(conn);
    setIsConnecting(false);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const success = await dbService.testConnection(newConn);
      setTestStatus(success ? 'success' : 'failed');
    } catch (e) {
      setTestStatus('failed');
    }
  };

  const handleAddConnection = () => {
    if (newConn.name && newConn.host) {
      setConnections([...connections, { ...newConn, id: Date.now().toString() } as DbConnection]);
      setShowAddModal(false);
      setNewConn({ type: 'MySQL', host: 'localhost', port: '3306', user: 'root', name: 'New Connection' });
      setTestStatus('none');
    }
  };

  const handleDeleteConnection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(lang === 'zh' ? '确定要删除此连接吗？' : 'Are you sure you want to delete this connection?')) {
      setConnections(connections.filter(c => c.id !== id));
    }
  };

  const handleTableClick = async (table: TableInfo) => {
    setSelectedTable(table);
    if (!activeConnection) return;

    setIsLoading(true);
    const details = await dbService.getTableSchema(activeConnection, activeDatabase, table.name);
    setSelectedTableSchema(details);

    // Default to DDL view in the connection's native dialect
    const ddl = SqlGenerator.generateDDL(details, activeConnection.type);
    setSqlContent(ddl);
    setSqlMode('DDL');
    setConvertTarget(activeConnection.type); // Reset convert target to native
    setIsLoading(false);
  };

  // Convert DDL Logic
  const handleConvertDDL = () => {
    if (selectedTableSchema) {
      const ddl = SqlGenerator.generateDDL(selectedTableSchema, convertTarget);
      setSqlContent(ddl);
      setSqlMode('DDL');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, table: TableInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, table });
  };

  const closeContextMenu = () => setContextMenu({ x: 0, y: 0, table: null });

  const generateSql = async (type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') => {
    if (!contextMenu.table || !activeConnection) return;
    const tableName = contextMenu.table.name;

    const details = await dbService.getTableSchema(activeConnection, activeDatabase, tableName);
    setSelectedTableSchema(details); // Also show structure

    let sql = '';
    const dbType = activeConnection.type;

    switch (type) {
      case 'SELECT': sql = SqlGenerator.generateSelect(details, dbType); break;
      case 'INSERT': sql = SqlGenerator.generateInsert(details, dbType); break;
      case 'UPDATE': sql = SqlGenerator.generateUpdate(details, dbType); break;
      case 'DELETE': sql = SqlGenerator.generateDelete(details, dbType); break;
    }

    setSqlContent(sql);
    setSqlMode(type);
    setSelectedTable(contextMenu.table);
    closeContextMenu();
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{lang === 'zh' ? '正在连接数据库...' : 'Connecting to database...'}</p>
      </div>
    );
  }

  // View: Active Workbench
  if (activeConnection) {
    const filteredTables = tables.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

    return (
      <div className="flex h-full gap-4">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {/* Header with DB Select */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden" title={activeConnection.name}>
                <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Server size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-sm truncate dark:text-slate-200">{activeConnection.name}</span>
              </div>
              <button
                onClick={() => setActiveConnection(null)}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap"
              >
                {lang === 'zh' ? '断开' : 'Close'}
              </button>
            </div>

            <div className="relative">
              <Database className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <select
                value={activeDatabase}
                onChange={(e) => setActiveDatabase(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
              >
                {databases.map(db => <option key={db} value={db}>{db}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={lang === 'zh' ? '搜索表...' : 'Search tables...'}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Tables</span>
              <span>{filteredTables.length}</span>
            </div>

            {isLoading && tables.length === 0 && (
              <div className="flex justify-center py-4"><RefreshCw className="animate-spin text-slate-300" size={20} /></div>
            )}

            {filteredTables.map(table => (
              <div
                key={table.name}
                onClick={() => handleTableClick(table)}
                onContextMenu={(e) => handleContextMenu(e, table)}
                className={`
                   group w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 cursor-pointer select-none transition-colors
                   ${selectedTable?.name === table.name
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                 `}
              >
                <TableIcon size={15} className={`flex-shrink-0 ${selectedTable?.name === table.name ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className="truncate text-sm flex-1">{table.name}</span>
              </div>
            ))}
          </div>

          {/* Mode Indicator Sidebar */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
              {isTauri ? <Monitor size={12} /> : <Globe size={12} />}
              <span>{isTauri ? 'Desktop Mode' : 'Web Mock Mode'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area (Split View) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {selectedTableSchema ? (
            <div className="flex flex-col h-full">
              {/* 1. Top Section: Table Structure */}
              <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-700">
                <div className="h-10 px-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <Columns size={16} className="text-blue-500" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{lang === 'zh' ? '表结构' : 'Table Structure'}</span>
                    <span className="text-xs text-slate-400">({selectedTableSchema.engine} / {selectedTableSchema.collation})</span>
                  </div>
                  <span className="text-xs text-slate-500">{selectedTableSchema.comment}</span>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Name</th>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Type</th>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Key</th>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Nullable</th>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Default</th>
                        <th className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {selectedTableSchema.columns.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{col.name}</td>
                          <td className="px-4 py-2 text-blue-600 dark:text-blue-400">
                            {col.type}
                            {col.length ? <span className="text-slate-400">({col.length}{col.scale ? `,${col.scale}` : ''})</span> : ''}
                          </td>
                          <td className="px-4 py-2">
                            {col.isPrimaryKey && <Key size={14} className="text-yellow-500" />}
                          </td>
                          <td className="px-4 py-2">
                            {col.nullable ?
                              <span className="text-slate-400 text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">NULL</span> :
                              <span className="text-red-500 text-xs px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">NN</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-[100px]">{col.defaultValue || '-'}</td>
                          <td className="px-4 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{col.comment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Bottom Section: SQL */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                <div className="h-10 border-b border-slate-700 flex items-center justify-between px-4 bg-[#252526]">
                  <div className="flex items-center space-x-2">
                    <Code size={16} className="text-blue-400" />
                    <span className="font-semibold text-sm text-slate-300">
                      {sqlMode === 'DDL' ? (lang === 'zh' ? '建表语句' : 'Create Statement') : sqlMode}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {sqlMode === 'DDL' && (
                      <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-600">
                        <select
                          value={convertTarget}
                          onChange={(e) => {
                            setConvertTarget(e.target.value as DatabaseType);
                          }}
                          className="bg-transparent text-xs text-slate-300 px-2 py-1 outline-none border-r border-slate-600"
                        >
                          {['MySQL', 'PostgreSQL', 'Doris', 'Oracle', 'SQL Server'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleConvertDDL}
                          className="px-2 py-1 text-xs text-blue-400 hover:text-white flex items-center transition-colors"
                          title={lang === 'zh' ? '转换格式' : 'Convert Dialect'}
                        >
                          <ArrowRightLeft size={12} className="mr-1" />
                          {lang === 'zh' ? '转换' : 'Convert'}
                        </button>
                      </div>
                    )}
                    <div className="h-4 w-[1px] bg-slate-600 mx-1"></div>
                    <button
                      onClick={() => navigator.clipboard.writeText(sqlContent)}
                      className="text-slate-400 hover:text-white transition-colors flex items-center text-xs"
                      title="Copy SQL"
                    >
                      <Save size={14} className="mr-1" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative overflow-auto custom-scrollbar">
                  {isLoading && sqlContent === '' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="animate-spin text-slate-500" size={24} />
                    </div>
                  ) : (
                    <pre className="p-4 font-mono text-sm leading-relaxed text-blue-300">
                      {sqlContent}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <TableIcon size={32} className="opacity-50" />
              </div>
              <p className="text-sm">{lang === 'zh' ? '选择左侧表查看详情' : 'Select a table from the sidebar'}</p>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu.table && (
          <div
            className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate block">
                {contextMenu.table.name}
              </span>
            </div>
            <button onClick={() => generateSql('SELECT')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 flex items-center">
              <span className="w-16 opacity-50 text-xs">Generate</span> SELECT
            </button>
            <button onClick={() => generateSql('INSERT')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 flex items-center">
              <span className="w-16 opacity-50 text-xs">Generate</span> INSERT
            </button>
            <button onClick={() => generateSql('UPDATE')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 flex items-center">
              <span className="w-16 opacity-50 text-xs">Generate</span> UPDATE
            </button>
            <button onClick={() => generateSql('DELETE')} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center">
              <span className="w-16 opacity-50 text-xs text-slate-500">Generate</span> DELETE
            </button>
          </div>
        )}
      </div>
    );
  }

  // View: Connection Manager
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <Database className="mr-3 text-blue-600" />
          {lang === 'zh' ? '数据库连接' : 'Connections'}
        </h2>

        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-500 dark:text-slate-400">
            {isTauri ? <Monitor size={14} className="mr-1.5" /> : <Globe size={14} className="mr-1.5" />}
            <span>{isTauri ? 'Desktop Environment' : 'Web Preview (Mock Data)'}</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus size={18} className="mr-2" />
            {lang === 'zh' ? '新建连接' : 'New Connection'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
        {connections.map(conn => (
          <div
            key={conn.id}
            onClick={() => handleConnect(conn)}
            className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${['MySQL', 'Doris'].includes(conn.type) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                <Database size={24} />
              </div>
              <button
                onClick={(e) => handleDeleteConnection(e, conn.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate">{conn.name}</h3>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <span className="w-16 text-xs font-semibold uppercase opacity-70">Host</span>
                <span className="truncate">{conn.host}:{conn.port}</span>
              </div>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <span className="w-16 text-xs font-semibold uppercase opacity-70">User</span>
                <span className="truncate">{conn.user}</span>
              </div>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <span className="w-16 text-xs font-semibold uppercase opacity-70">Type</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium">{conn.type}</span>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-xl" />
          </div>
        ))}

        {/* Empty State Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Plus size={24} />
          </div>
          <span className="font-medium">{lang === 'zh' ? '添加新连接' : 'Add Connection'}</span>
        </button>
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{lang === 'zh' ? '新建连接' : 'New Connection'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Connection Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newConn.name}
                  onChange={e => setNewConn({ ...newConn, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Production DB"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={newConn.type}
                    onChange={e => setNewConn({ ...newConn, type: e.target.value as DatabaseType })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  >
                    {['MySQL', 'PostgreSQL', 'Doris', 'Oracle', 'SQL Server', 'SQLite'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Host</label>
                  <input
                    type="text"
                    value={newConn.host}
                    onChange={e => setNewConn({ ...newConn, host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Port</label>
                  <input
                    type="text"
                    value={newConn.port}
                    onChange={e => setNewConn({ ...newConn, port: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">User</label>
                  <input
                    type="text"
                    value={newConn.user}
                    onChange={e => setNewConn({ ...newConn, user: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={newConn.password || ''}
                  onChange={e => setNewConn({ ...newConn, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className={`flex items-center space-x-2 text-sm font-medium ${testStatus === 'success' ? 'text-green-600' :
                    testStatus === 'failed' ? 'text-red-500' :
                      'text-slate-600 dark:text-slate-400'
                  }`}
              >
                {testStatus === 'testing' && <RefreshCw className="animate-spin" size={16} />}
                {testStatus === 'success' && <CheckCircle size={16} />}
                {testStatus === 'failed' && <AlertCircle size={16} />}
                <span>
                  {testStatus === 'testing' ? (lang === 'zh' ? '测试中...' : 'Testing...') :
                    testStatus === 'success' ? (lang === 'zh' ? '连接成功' : 'Success') :
                      testStatus === 'failed' ? (lang === 'zh' ? '连接失败' : 'Failed') :
                        (lang === 'zh' ? '测试连接' : 'Test Connection')}
                </span>
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddConnection}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
                >
                  {lang === 'zh' ? '保存连接' : 'Save Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};