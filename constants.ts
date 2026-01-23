import {
  Database,
  FileSpreadsheet,
  Cpu,
  Clock,
  FileText,
  LayoutDashboard,
  Workflow,
  UserCircle,
  ArrowRightLeft,

  DatabaseZap,
  GitCompare
} from 'lucide-react';
import { NavItem, Language } from './types';

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: { en: 'Dashboard', zh: '首页' },
    icon: LayoutDashboard,
    category: 'core',
    order: 1,
    visible: true
  },
  {
    id: 'pdf-tools',
    label: { en: 'PDF Tools', zh: 'PDF 工具箱' },
    icon: FileText,
    category: 'office',
    order: 3,
    visible: true
  },
  {
    id: 'data-source-manager',
    label: { en: 'Data Sources', zh: '数据中心' },
    icon: DatabaseZap,
    category: 'db',
    order: 4,
    visible: true
  },
  {
    id: 'data-dev',
    label: { en: 'Data Development', zh: '数据开发' },
    icon: Database, // Using Database icon for the group
    category: 'db',
    order: 5,
    visible: true,
    children: [
      {
        id: 'db-viewer',
        label: { en: 'Table Viewer', zh: '表结构器' },
        icon: Database,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'excel-import',
        label: { en: 'Excel Import', zh: '表格导入' },
        icon: FileSpreadsheet,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'data-compare',
        label: { en: 'Data Compare', zh: '数据对比' },
        icon: GitCompare,
        category: 'db',
        order: 2,
        visible: true
      },
      {
        id: 'excel-sql',
        label: { en: 'Excel Builder', zh: '表格建表' },
        icon: FileSpreadsheet,
        category: 'db',
        order: 3,
        visible: true
      },
      {
        id: 'seatunnel',
        label: { en: 'Seatunnel Gen', zh: '任务脚本' },
        icon: Workflow,
        category: 'db',
        order: 4,
        visible: true
      },
      {
        id: 'field-mapping',
        label: { en: 'Field Mapping', zh: '数据映射' },
        icon: ArrowRightLeft,
        category: 'db',
        order: 5,
        visible: true
      }
    ]
  },

  {
    id: 'time-tools',
    label: { en: 'Time Utilities', zh: '时间工具' },
    icon: Clock,
    category: 'system',
    order: 11,
    visible: true
  },
  {
    id: 'monitor',
    label: { en: 'System Monitor', zh: '系统监控' },
    icon: Cpu,
    category: 'system',
    order: 12,
    visible: true
  },
  {
    id: 'profile',
    label: { en: 'User Profile', zh: '用户中心' },
    icon: UserCircle,
    category: 'user',
    order: 13,
    visible: true
  }
];

export const MOCK_TABLES = [
  { name: 'users', rows: 12500, size: '2.5MB' },
  { name: 'orders', rows: 450000, size: '128MB' },
  { name: 'products', rows: 850, size: '150KB' },
  { name: 'transactions', rows: 1200000, size: '1.2GB' },
  { name: 'logs', rows: 5000, size: '1.2MB' },
];

export const SQL_TEMPLATES = {
  mysql: `CREATE TABLE IF NOT EXISTS \`{tableName}\` (
  \`id\` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update Time',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Generated from Excel ({sheetName})';`,
  doris: `CREATE TABLE IF NOT EXISTS \`{tableName}\` (
  \`id\` BIGINT COMMENT 'Primary Key',
  \`event_date\` DATE COMMENT 'Partition Key'
) ENGINE=OLAP
UNIQUE KEY(\`id\`)
PARTITION BY RANGE(\`event_date\`) ()
DISTRIBUTED BY HASH(\`id\`) BUCKETS 10
PROPERTIES (
  "replication_num" = "1",
  "comment" = "Generated from Excel ({sheetName})"
);`
};
