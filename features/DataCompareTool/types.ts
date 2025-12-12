import { CompareKey } from '../../types';

/**
 * 数据对比工具相关类型定义
 */

export interface SideConfig {
    connId: string;
    db: string;
    table: string;
}

export interface SavedCompareConfig {
    id: string;
    name: string;
    sourceConfig: SideConfig;
    targetConfig: SideConfig;
    primaryKeys: CompareKey[];
    filterCondition: string;
    createdAt: number;
}

export interface CompareStats {
    match: number;
    diff: number;
    sourceOnly: number;
    targetOnly: number;
}

export type ViewMode = 'list' | 'config' | 'result';
