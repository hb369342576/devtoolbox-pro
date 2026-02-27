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
  Wrench,
  Settings,

  DatabaseZap,
  GitCompare,
  CalendarClock,
  FolderKanban,
  ListTodo,
  Server,
  Activity
} from 'lucide-react';
import { NavItem, Language } from './types';

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: { en: 'Dashboard', zh: '首页' },
    tooltip: { en: 'View overview and quick access to tools', zh: '查看概览和快速访问工具' },
    icon: LayoutDashboard,
    category: 'core',
    order: 1,
    visible: true
  },

  {
    id: 'data-source-manager',
    label: { en: 'Data Sources', zh: '数据中心' },
    tooltip: { en: 'Manage database connections', zh: '管理数据库连接' },
    icon: DatabaseZap,
    category: 'db',
    order: 4,
    visible: true
  },
  {
    id: 'data-dev',
    label: { en: 'Data Development', zh: '数据开发' },
    tooltip: { en: 'Database development and ETL tools', zh: '数据库开发和 ETL 工具集' },
    icon: Database,
    category: 'db',
    order: 5,
    visible: true,
    children: [
      {
        id: 'db-viewer',
        label: { en: 'Table Viewer', zh: '表结构器' },
        tooltip: { en: 'View and manage table schemas and DDL', zh: '查看和管理表结构与 DDL' },
        icon: Database,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'excel-import',
        label: { en: 'Excel Import', zh: '表格导入' },
        tooltip: { en: 'Import Excel data to database tables', zh: '将 Excel 数据导入数据库表' },
        icon: FileSpreadsheet,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'data-compare',
        label: { en: 'Data Compare', zh: '数据对比' },
        tooltip: { en: 'Compare data between two tables', zh: '对比两个表的数据差异' },
        icon: GitCompare,
        category: 'db',
        order: 2,
        visible: true
      },
      {
        id: 'excel-sql',
        label: { en: 'Excel Builder', zh: '表格建表' },
        tooltip: { en: 'Generate CREATE TABLE from Excel', zh: '从 Excel 生成建表语句' },
        icon: FileSpreadsheet,
        category: 'db',
        order: 3,
        visible: true
      }
    ]
  },

  {
    id: 'task-dev',
    label: { en: 'Task Development', zh: '任务开发' },
    tooltip: { en: 'DolphinScheduler workflow management', zh: 'DolphinScheduler 工作流管理' },
    icon: CalendarClock,
    category: 'db',
    order: 6,
    visible: true,
    children: [
      {
        id: 'dolphin-project',
        label: { en: 'Project Manager', zh: '项目管理' },
        tooltip: { en: 'Manage DolphinScheduler projects', zh: '管理 DolphinScheduler 项目' },
        icon: FolderKanban,
        category: 'db',
        order: 1,
        visible: true
      }
    ]
  },

  {
    id: 'seatunnel-manager',
    label: { en: 'SeaTunnel Manager', zh: '水滴管理' },
    tooltip: { en: 'SeaTunnel engine and job management', zh: 'SeaTunnel 引擎和作业管理' },
    icon: Server,
    category: 'db',
    order: 7,
    visible: true,
    children: [
      {
        id: 'seatunnel-engine',
        label: { en: 'Engine Manager', zh: '引擎管理' },
        tooltip: { en: 'Manage SeaTunnel engine configurations', zh: '管理 SeaTunnel 引擎配置' },
        icon: Server,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'seatunnel-job',
        label: { en: 'Job Manager', zh: '作业管理' },
        tooltip: { en: 'Monitor and manage SeaTunnel jobs', zh: '监控和管理 SeaTunnel 作业' },
        icon: Activity,
        category: 'db',
        order: 2,
        visible: true
      },
      {
        id: 'field-mapping',
        label: { en: 'Field Mapping', zh: '数据映射' },
        tooltip: { en: 'Configure field mappings between tables', zh: '配置表字段映射关系' },
        icon: ArrowRightLeft,
        category: 'db',
        order: 3,
        visible: true
      },
      {
        id: 'seatunnel',
        label: { en: 'Config Generator', zh: '配置生成' },
        tooltip: { en: 'Generate SeaTunnel sync configurations', zh: '生成 SeaTunnel 同步配置' },
        icon: Workflow,
        category: 'db',
        order: 4,
        visible: true
      }
    ]
  },

  {
    id: 'tools',
    label: { en: 'Toolbox', zh: '工具集合' },
    tooltip: { en: 'Utility tools collection', zh: '实用工具集合' },
    icon: Wrench,
    category: 'system',
    order: 10,
    visible: true,
    children: [
      {
        id: 'pdf-tools',
        label: { en: 'PDF Tools', zh: 'PDF 工具箱' },
        tooltip: { en: 'PDF merge, split and conversion tools', zh: 'PDF 合并、拆分和转换工具' },
        icon: FileText,
        category: 'system',
        order: 1,
        visible: true
      },
      {
        id: 'time-tools',
        label: { en: 'Time Utilities', zh: '时间工具' },
        tooltip: { en: 'Timestamp conversion and timezone tools', zh: '时间戳转换和时区工具' },
        icon: Clock,
        category: 'system',
        order: 2,
        visible: true
      },
      {
        id: 'monitor',
        label: { en: 'System Monitor', zh: '系统监控' },
        tooltip: { en: 'Monitor system performance and resources', zh: '监控系统性能和资源' },
        icon: Cpu,
        category: 'system',
        order: 3,
        visible: true
      }
    ]
  },
  {
    id: 'system-management',
    label: { en: 'System', zh: '系统管理' },
    tooltip: { en: 'System management and settings', zh: '系统管理和设置' },
    icon: Settings,
    category: 'user',
    order: 13,
    visible: true,
    children: [
      {
        id: 'profile',
        label: { en: 'User Profile', zh: '用户中心' },
        tooltip: { en: 'Manage your profile and preferences', zh: '管理个人资料和偏好设置' },
        icon: UserCircle,
        category: 'user',
        order: 1,
        visible: true
      },
      {
        id: 'settings',
        label: { en: 'Settings', zh: '系统设置' },
        tooltip: { en: 'System settings and preferences', zh: '系统设置和偏好' },
        icon: Settings,
        category: 'user',
        order: 2,
        visible: true
      }
    ]
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
