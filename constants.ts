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
  Activity,
  Fish,
  Droplet
} from 'lucide-react';
import { NavItem, Language } from './types';

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'nav.dashboard',
    tooltip: 'nav.dashboardTooltip',
    icon: LayoutDashboard,
    category: 'core',
    order: 1,
    visible: true
  },
  {
    id: 'data-source-manager',
    label: 'nav.dataSource',
    tooltip: 'nav.dataSourceTooltip',
    icon: DatabaseZap,
    category: 'db',
    order: 4,
    visible: true
  },
  {
    id: 'data-dev',
    label: 'nav.dataDev',
    tooltip: 'nav.dataDevTooltip',
    icon: Database,
    category: 'db',
    order: 5,
    visible: true,
    children: [
      {
        id: 'db-viewer',
        label: 'nav.dbViewer',
        tooltip: 'nav.dbViewerTooltip',
        icon: Database,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'excel-import',
        label: 'nav.excelImport',
        tooltip: 'nav.excelImportTooltip',
        icon: FileSpreadsheet,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'data-compare',
        label: 'nav.dataCompare',
        tooltip: 'nav.dataCompareTooltip',
        icon: GitCompare,
        category: 'db',
        order: 2,
        visible: true
      },
      {
        id: 'excel-sql',
        label: 'nav.excelSql',
        tooltip: 'nav.excelSqlTooltip',
        icon: FileSpreadsheet,
        category: 'db',
        order: 3,
        visible: true
      }
    ]
  },
  {
    id: 'task-dev',
    label: 'nav.taskDev',
    tooltip: 'nav.taskDevTooltip',
    icon: Fish,
    category: 'db',
    order: 6,
    visible: true,
    children: [
      {
        id: 'dolphin-project',
        label: 'nav.dolphinProject',
        tooltip: 'nav.dolphinProjectTooltip',
        icon: FolderKanban,
        category: 'db',
        order: 1,
        visible: true
      }
    ]
  },
  {
    id: 'seatunnel-manager',
    label: 'nav.seatunnelManager',
    tooltip: 'nav.seatunnelManagerTooltip',
    icon: Droplet,
    category: 'db',
    order: 7,
    visible: true,
    children: [
      {
        id: 'seatunnel-engine',
        label: 'nav.seatunnelEngine',
        tooltip: 'nav.seatunnelEngineTooltip',
        icon: Server,
        category: 'db',
        order: 1,
        visible: true
      },
      {
        id: 'seatunnel-job',
        label: 'nav.seatunnelJob',
        tooltip: 'nav.seatunnelJobTooltip',
        icon: Activity,
        category: 'db',
        order: 2,
        visible: true
      },
      {
        id: 'field-mapping',
        label: 'nav.fieldMapping',
        tooltip: 'nav.fieldMappingTooltip',
        icon: ArrowRightLeft,
        category: 'db',
        order: 3,
        visible: true
      },
      {
        id: 'seatunnel',
        label: 'nav.seatunnelConfig',
        tooltip: 'nav.seatunnelConfigTooltip',
        icon: Workflow,
        category: 'db',
        order: 4,
        visible: true
      }
    ]
  },
  {
    id: 'tools',
    label: 'nav.tools',
    tooltip: 'nav.toolsTooltip',
    icon: Wrench,
    category: 'system',
    order: 10,
    visible: true,
    children: [
      {
        id: 'pdf-tools',
        label: 'nav.pdfTools',
        tooltip: 'nav.pdfToolsTooltip',
        icon: FileText,
        category: 'system',
        order: 1,
        visible: true
      },
      {
        id: 'time-tools',
        label: 'nav.timeTools',
        tooltip: 'nav.timeToolsTooltip',
        icon: Clock,
        category: 'system',
        order: 2,
        visible: true
      },
      {
        id: 'monitor',
        label: 'nav.monitor',
        tooltip: 'nav.monitorTooltip',
        icon: Cpu,
        category: 'system',
        order: 3,
        visible: true
      }
    ]
  },
  {
    id: 'system-management',
    label: 'nav.systemManagement',
    tooltip: 'nav.systemManagementTooltip',
    icon: Settings,
    category: 'user',
    order: 13,
    visible: true,
    children: [
      {
        id: 'profile',
        label: 'nav.profile',
        tooltip: 'nav.profileTooltip',
        icon: UserCircle,
        category: 'user',
        order: 1,
        visible: true
      },
      {
        id: 'settings',
        label: 'nav.settings',
        tooltip: 'nav.settingsTooltip',
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
