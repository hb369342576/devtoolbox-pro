import { ColumnInfo } from '../../../types';

/**
 * 根据 DDL 内容检测实际的数据库类型（MySQL 还是 Doris）
 * Doris 的 DDL 包含特有关键字如 ENGINE=OLAP, DISTRIBUTED BY HASH, UNIQUE KEY/DUPLICATE KEY/AGGREGATE KEY
 */
export const detectDbTypeFromDdl = (ddlContent: string): 'mysql' | 'doris' => {
    if (!ddlContent) return 'mysql';
    const upperDdl = ddlContent.toUpperCase();
    if (
        upperDdl.includes('ENGINE=OLAP') ||
        upperDdl.includes('ENGINE = OLAP') ||
        upperDdl.includes('DISTRIBUTED BY HASH') ||
        (upperDdl.includes('UNIQUE KEY') && !upperDdl.includes('ENGINE=INNODB')) ||
        upperDdl.includes('DUPLICATE KEY') ||
        upperDdl.includes('AGGREGATE KEY') ||
        upperDdl.includes('BUCKETS')
    ) {
        return 'doris';
    }
    return 'mysql';
};

/**
 * 将 MySQL DDL 转换为 Doris DDL
 */
export const convertMysqlToDoris = (
    tableName: string,
    columns: ColumnInfo[],
    ddl: string
): string => {
    const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);
    const pkList = primaryKeys.length > 0 ? primaryKeys.join(', ') : 'id';

    // 简单提取注释
    const commentMatch = ddl.match(/COMMENT\s*=\s*'([^']*)'/i);
    const tableComment = commentMatch ? commentMatch[1] : tableName;

    const fieldLines = columns.map(col => {
        const upperType = col.type.toUpperCase();
        let dorisType = upperType;

        // 类型映射逻辑
        if (/^TINYINT\s*\(1\)$/i.test(upperType)) dorisType = 'BOOLEAN';
        else if (/^(BIGINT|INT|TINYINT|SMALLINT|MEDIUMINT)\s*\(\d+\)/i.test(upperType)) dorisType = upperType.replace(/\s*\(\d+\)/, '');
        else if (/^(DOUBLE|FLOAT)\s*\(\d+,\d+\)/i.test(upperType)) dorisType = upperType.replace(/\s*\(\d+,\d+\)/, '');
        else if (/TEXT/i.test(upperType)) dorisType = 'STRING';
        else if (/^VARCHAR$/i.test(upperType)) {
            if (col.length && col.length > 0) {
                dorisType = `VARCHAR(${col.length})`;
            } else {
                dorisType = 'STRING';
            }
        }
        else if (/^DATETIME|TIMESTAMP/i.test(upperType)) dorisType = 'DATETIME';

        const comment = col.comment ? ` COMMENT '${col.comment}'` : '';
        return `    \`${col.name}\` ${dorisType}${comment}`;
    });

    return `CREATE TABLE \`${tableName}\` (
${fieldLines.join(',\n')}
) ENGINE = OLAP
UNIQUE KEY(${pkList}) COMMENT '${tableComment}'
DISTRIBUTED BY HASH(${pkList}) BUCKETS 10
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);`;
};

/**
 * 将 Doris DDL 转换为 MySQL DDL
 */
export const convertDorisToMysql = (
    tableName: string,
    columns: ColumnInfo[],
    ddl: string
): string => {
    // 尝试提取表注释，支持没有等号的情况，支持单引号和双引号，通常在 UNIQUE KEY 等之后
    // 匹配模式：COMMENT "xxx" 或 COMMENT 'xxx' 或 COMMENT="xxx"
    // 注意：列定义也有 COMMENT，这里需要匹配表级别的 COMMENT，通常在最后
    const commentMatch = ddl.match(/\)\s*(?:ENGINE\s*=\s*\w+)?.*COMMENT\s*(?:=)?\s*['"]([^'"]*)['"]/is);
    const tableComment = commentMatch ? commentMatch[1] : '';

    const fieldLines = columns.map(col => {
        let type = col.type.toUpperCase();
        if (type === 'STRING') type = 'TEXT';
        if (type === 'BOOLEAN') type = 'TINYINT(1)';
        const nullStr = col.nullable ? 'NULL' : 'NOT NULL';
        const comment = col.comment ? ` COMMENT '${col.comment}'` : '';
        return `    \`${col.name}\` ${type} ${nullStr}${comment}`;
    });

    const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);
    const pkStr = primaryKeys.length > 0 ? `,\n    PRIMARY KEY (${primaryKeys.map(k => `\`${k}\``).join(', ')})` : '';

    const commentSql = tableComment ? ` COMMENT='${tableComment}'` : '';

    return `CREATE TABLE \`${tableName}\` (
${fieldLines.join(',\n')}${pkStr}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4${commentSql};`;
};
