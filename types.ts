import { LucideIcon } from 'lucide-react';

export type Language = 'en' | 'zh';

export type Theme = 'light' | 'dark';

export interface NavItem {
  id: string;
  label: Record<Language, string>;
  icon: LucideIcon;
  category: 'core' | 'db' | 'office' | 'system' | 'user' | 'knowledge';
}

export type DatabaseType = 'MySQL' | 'PostgreSQL' | 'Doris' | 'Oracle' | 'SQL Server' | 'SQLite';

export interface DbConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: string;
  user: string;
  password?: string;
  defaultDatabase?: string;
}

export interface TableInfo {
  name: string;
  rows: number;
  size: string;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  length?: number;
  scale?: number;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableDetail extends TableInfo {
  engine?: string;
  collation?: string;
  columns: ColumnInfo[];
  ddl: string;
}

export interface PdfFile {
  id: string;
  name: string;
  size: string;
}

export interface User {
  username: string;
  nickname?: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  bio?: string;
  // Extended Profile
  gender?: 'male' | 'female' | 'other';
  mobile?: string;
  occupation?: string;
  country?: string;
  city?: string;
  website?: string;
}

// --- Script Generator Types ---

export type ScriptType = 'seatunnel' | 'datax' | 'other';

export interface JobConfig {
  type: string;
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
  table: string;
}

export interface ScriptJob {
  id: string;
  name: string;
  scriptType: ScriptType;
  source: JobConfig;
  sink: JobConfig;
  createdAt: number;
}

// --- Excel Builder Types ---

export interface ExcelTemplate {
  id: string;
  name: string;
  description?: string;
  // Parsing Rules
  dataStartRow: number; // The row where field definitions begin (e.g., 2)
  nameCol: string;      // Column for Field Name (e.g., "A")
  typeCol: string;      // Column for Field Type (e.g., "B")
  commentCol: string;   // Column for Comment (e.g., "C")
}

// --- Field Mapping Tool Types ---

export interface FieldMapping {
  id: string;
  sourceField: string;
  sourceType?: string; // For type checking
  targetField: string;
  targetType?: string; // For type checking
  description?: string;
}

export interface CanvasNode {
  id: string;
  type: 'source' | 'target';
  x: number;
  y: number;
  tableName: string;
  dbType: DatabaseType;
  columns: ColumnInfo[];
}

export interface CanvasLink {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  mappings: FieldMapping[];
}

export interface MappingProfile {
  id: string;
  name: string;
  updatedAt: number;

  // Canvas Data
  sourceConn?: DbConnection;
  targetConn?: DbConnection;
  nodes: CanvasNode[];
  links: CanvasLink[];
  viewport?: { x: number; y: number; zoom: number }; // Added Viewport state
}

// --- Interview Questions Types ---

export type QuestionCategory = 'Flink' | 'Spark' | 'Scala' | 'Doris' | 'Java' | 'Hive' | 'Hadoop' | 'Other';

export interface InterviewQuestion {
  id: string;
  title: string;
  answer: string;
  category: QuestionCategory;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Notes Types ---

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown supported
  folder: 'General' | 'Snippets' | 'Ideas';
  createdAt: number;
  updatedAt: number;
}

// ... (existing imports)

// ... (existing types)

// --- Data Compare Tool Types ---

export interface CompareKey {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface CompareConfig {
  sourceConnId: string;
  targetConnId: string;
  sourceDb: string;
  targetDb: string;
  sourceTable: string;
  targetTable: string;
  primaryKeys: CompareKey[];
  filterCondition?: string;
}

export type CompareRowStatus = 'match' | 'diff' | 'only_source' | 'only_target';

export interface CompareResultRow {
  keyDisplay: string; // Combined PK value for display
  status: CompareRowStatus;
  sourceData: Record<string, any> | null;
  targetData: Record<string, any> | null;
  diffFields: string[]; // List of field names that differ
}