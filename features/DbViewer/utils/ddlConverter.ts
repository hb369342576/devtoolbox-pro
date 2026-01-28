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
 * 从 DDL 中提取表注释
 * 支持多种格式：COMMENT = 'xxx', COMMENT 'xxx', COMMENT "xxx"
 */
const extractTableComment = (ddl: string): string => {
    if (!ddl) return '';

    // Doris 格式：在 UNIQUE KEY(...) COMMENT 'xxx' 后面
    // MySQL 格式：在 ) ENGINE=... COMMENT='xxx' 后面
    // 需要匹配表级别的 COMMENT，而非字段级别的

    // 先尝试匹配 Doris 格式：UNIQUE KEY(...) COMMENT 'xxx'
    let match = ddl.match(/(?:UNIQUE\s+KEY|DUPLICATE\s+KEY|AGGREGATE\s+KEY)\s*\([^)]*\)\s*COMMENT\s*['"]([^'"]*)['"]/i);
    if (match) return match[1];

    // 尝试匹配 MySQL 格式：) ... COMMENT='xxx'
    match = ddl.match(/\)\s*(?:[^;]*?)COMMENT\s*=\s*['"]([^'"]*)['"]/i);
    if (match) return match[1];

    // 备用匹配：最后出现的 COMMENT 'xxx'（可能是表注释）
    const allComments = [...ddl.matchAll(/COMMENT\s*(?:=)?\s*['"]([^'"]*)['"]/gi)];
    if (allComments.length > 0) {
        // 返回最后一个，通常是表注释
        return allComments[allComments.length - 1][1];
    }

    return '';
};

/**
 * 格式化列类型，包含长度和精度信息
 * 例如：varchar + length=50 => VARCHAR(50)
 *       decimal + length=10 + scale=2 => DECIMAL(10,2)
 */
export const formatColumnType = (col: ColumnInfo): string => {
    const upperType = col.type.toUpperCase();

    // 如果类型已经包含括号，直接返回
    if (/\(.*\)/.test(upperType)) {
        return upperType;
    }

    // 对于需要长度的类型
    if (/^(VARCHAR|CHAR|VARBINARY|BINARY)$/i.test(upperType)) {
        if (col.length && col.length > 0) {
            return `${upperType}(${col.length})`;
        }
        // VARCHAR 没有长度时，保持原样（后续转换会处理）
        return upperType;
    }

    // 对于需要精度和小数位的类型
    if (/^(DECIMAL|NUMERIC)$/i.test(upperType)) {
        if (col.length && col.length > 0) {
            if (col.scale !== undefined && col.scale > 0) {
                return `${upperType}(${col.length},${col.scale})`;
            }
            return `${upperType}(${col.length})`;
        }
        return upperType;
    }

    // INT 类型不需要显示宽度（MySQL 8.0+ 已废弃）
    // DATETIME/TIMESTAMP 可能有精度
    if (/^(DATETIME|TIMESTAMP|TIME)$/i.test(upperType)) {
        if (col.scale !== undefined && col.scale > 0) {
            return `${upperType}(${col.scale})`;
        }
        return upperType;
    }

    return upperType;
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

    // 提取表注释
    const tableComment = extractTableComment(ddl) || tableName;

    const fieldLines = columns.map(col => {
        // 先格式化完整类型（包含长度）
        const formattedType = formatColumnType(col);
        let dorisType = formattedType;

        // 类型映射逻辑 - 只对特定类型进行转换
        // TINYINT(1) -> BOOLEAN
        if (/^TINYINT\s*\(1\)$/i.test(formattedType)) {
            dorisType = 'BOOLEAN';
        }
        // INT类型去掉显示宽度 (Doris不支持)：BIGINT(20) -> BIGINT, INT(11) -> INT
        else if (/^(BIGINT|INT|TINYINT|SMALLINT|MEDIUMINT)\s*\(\d+\)$/i.test(formattedType)) {
            dorisType = formattedType.replace(/\s*\(\d+\)/, '');
        }
        // DOUBLE/FLOAT 去掉精度 (Doris 使用 DECIMAL 来指定精度)
        else if (/^(DOUBLE|FLOAT)\s*\(\d+,\s*\d+\)$/i.test(formattedType)) {
            dorisType = formattedType.replace(/\s*\(\d+,\s*\d+\)/, '');
        }
        // TEXT 类型 -> STRING
        else if (/^(TEXT|LONGTEXT|MEDIUMTEXT|TINYTEXT)$/i.test(formattedType)) {
            dorisType = 'STRING';
        }
        // DATETIME/TIMESTAMP 统一为 DATETIME
        else if (/^(DATETIME|TIMESTAMP)(\(\d+\))?$/i.test(formattedType)) {
            dorisType = 'DATETIME';
        }
        // VARCHAR 没有长度时转为 STRING
        else if (/^VARCHAR$/i.test(formattedType)) {
            dorisType = 'STRING';
        }
        // VARCHAR(N), CHAR(N), DECIMAL(P,S) 等保持原样不变

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
    // 提取表注释
    const tableComment = extractTableComment(ddl);

    const fieldLines = columns.map(col => {
        // 先格式化完整类型（包含长度）
        let type = formatColumnType(col);

        // STRING -> TEXT (Doris STRING 对应 MySQL TEXT)
        if (/^STRING$/i.test(type)) {
            type = 'TEXT';
        }
        // BOOLEAN -> TINYINT(1)
        else if (/^BOOLEAN$/i.test(type)) {
            type = 'TINYINT(1)';
        }
        // VARCHAR(N), CHAR(N), DECIMAL(P,S) 等保持原样（包括长度/精度）

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
