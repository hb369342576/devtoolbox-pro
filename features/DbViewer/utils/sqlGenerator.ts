import { ColumnInfo } from '../../../types';

/**
 * SQL 生成器工具类
 * 用于生成 INSERT, UPDATE, DELETE, SELECT 语句
 */

const formatValue = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('decimal') || t.includes('double') || t.includes('float')) {
        return '0';
    }
    if (t.includes('bool')) {
        return 'false';
    }
    return "''";
};

export const generateSelectSql = (tableName: string, columns: ColumnInfo[]): string => {
    const colNames = columns.map(c => `\`${c.name}\``).join(', ');
    return `SELECT ${colNames} FROM \`${tableName}\` LIMIT 100;`;
};

export const generateInsertSql = (tableName: string, columns: ColumnInfo[]): string => {
    const validCols = columns.filter(c => !c.isPrimaryKey || (c.isPrimaryKey && !c.name.toLowerCase().includes('auto'))); // 简单过滤自增主键
    const colNames = validCols.map(c => `\`${c.name}\``).join(', ');
    const values = validCols.map(() => '?').join(', ');
    return `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${values});`;
};

export const generateUpdateSql = (tableName: string, columns: ColumnInfo[]): string => {
    const validCols = columns.filter(c => !c.isPrimaryKey);
    const pkCol = columns.find(c => c.isPrimaryKey) || columns[0];
    const setClause = validCols.map(c => `\`${c.name}\` = ${formatValue(c.type)}`).join(', ');

    let whereClause = '1=1';
    if (pkCol) {
        whereClause = `\`${pkCol.name}\` = ${formatValue(pkCol.type)}`;
    }

    return `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause};`;
};

export const generateDeleteSql = (tableName: string, columns: ColumnInfo[]): string => {
    const pkCol = columns.find(c => c.isPrimaryKey) || columns[0];
    let whereClause = '1=1';
    if (pkCol) {
        whereClause = `\`${pkCol.name}\` = ${formatValue(pkCol.type)}`;
    }
    return `DELETE FROM \`${tableName}\` WHERE ${whereClause};`;
};
