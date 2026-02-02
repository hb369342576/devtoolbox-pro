import { CanvasNode, CanvasLink, DbConnection, ColumnInfo } from '../../../types';

/**
 * 完整的 Source-Sink 路径
 */
export interface CompletePath {
    id: string;
    sourceNode: CanvasNode;
    sinkNode: CanvasNode;
    intermediateNodes: CanvasNode[]; // Transform 节点
    links: CanvasLink[];
    label: string; // 用于显示: "SourceTable → SinkTable"
}

/**
 * 路径检测结果
 */
export interface PathDetectionResult {
    paths: CompletePath[];
    errors: string[];
}

/**
 * 检测画布中的所有完整 Source-Sink 路径
 */
export function detectCompletePaths(nodes: CanvasNode[], links: CanvasLink[]): PathDetectionResult {
    const errors: string[] = [];
    const paths: CompletePath[] = [];
    
    const sourceNodes = nodes.filter(n => n.type === 'source');
    const sinkNodes = nodes.filter(n => n.type === 'sink' || n.type === 'target');
    
    // 验证：检查多对一、一对多连接
    for (const sink of sinkNodes) {
        const incomingLinks = links.filter(l => l.targetNodeId === sink.id);
        if (incomingLinks.length > 1) {
            errors.push(`不支持多个节点连接到同一个 Sink（${sink.tableName || 'Sink'}）`);
        }
    }
    
    for (const source of sourceNodes) {
        const outgoingLinks = links.filter(l => l.sourceNodeId === source.id);
        if (outgoingLinks.length > 1) {
            errors.push(`不支持一个 Source（${source.tableName || 'Source'}）连接到多个节点`);
        }
    }
    
    if (errors.length > 0) {
        return { paths, errors };
    }
    
    // 从每个 Source 开始遍历，找到完整路径
    for (const source of sourceNodes) {
        const path = tracePathFromSource(source, nodes, links);
        if (path) {
            paths.push(path);
        }
    }
    
    return { paths, errors };
}

/**
 * 从 Source 节点开始追溯完整路径
 */
function tracePathFromSource(
    sourceNode: CanvasNode, 
    nodes: CanvasNode[], 
    links: CanvasLink[]
): CompletePath | null {
    const pathLinks: CanvasLink[] = [];
    const intermediateNodes: CanvasNode[] = [];
    
    let currentNodeId = sourceNode.id;
    let sinkNode: CanvasNode | null = null;
    
    // 限制最大深度防止循环
    let depth = 0;
    const maxDepth = 20;
    
    while (depth < maxDepth) {
        const outgoingLink = links.find(l => l.sourceNodeId === currentNodeId);
        if (!outgoingLink) break;
        
        pathLinks.push(outgoingLink);
        
        const nextNode = nodes.find(n => n.id === outgoingLink.targetNodeId);
        if (!nextNode) break;
        
        if (nextNode.type === 'sink' || nextNode.type === 'target') {
            sinkNode = nextNode;
            break;
        } else if (nextNode.type === 'transform') {
            intermediateNodes.push(nextNode);
            currentNodeId = nextNode.id;
        } else {
            break; // 遇到非预期类型
        }
        
        depth++;
    }
    
    if (!sinkNode) return null;
    
    return {
        id: `${sourceNode.id}-${sinkNode.id}`,
        sourceNode,
        sinkNode,
        intermediateNodes,
        links: pathLinks,
        label: `${sourceNode.tableName || 'Source'} → ${sinkNode.tableName || 'Sink'}`
    };
}

/**
 * 收集路径上的所有字段映射（自动去重）
 */
export function collectPathMappings(path: CompletePath): { sourceFields: string[], targetFields: string[] } {
    const sourceFieldsSet = new Set<string>();
    const targetFieldsSet = new Set<string>();
    const mappingPairs: { source: string, target: string }[] = [];
    
    path.links.forEach(link => {
        if (link.mappings && link.mappings.length > 0) {
            link.mappings.forEach(m => {
                if (m.sourceField && m.targetField) {
                    // 使用 source-target 组合作为唯一键去重
                    const key = `${m.sourceField}::${m.targetField}`;
                    if (!mappingPairs.some(p => `${p.source}::${p.target}` === key)) {
                        mappingPairs.push({ source: m.sourceField, target: m.targetField });
                        sourceFieldsSet.add(m.sourceField);
                        targetFieldsSet.add(m.targetField);
                    }
                }
            });
        }
    });
    
    // 如果没有映射，使用 sourceNode 的列（同名映射）
    if (mappingPairs.length === 0 && path.sourceNode.columns?.length) {
        path.sourceNode.columns.forEach(c => {
            mappingPairs.push({ source: c.name, target: c.name });
        });
    }
    
    // 按照映射顺序返回字段
    return { 
        sourceFields: mappingPairs.map(p => p.source), 
        targetFields: mappingPairs.map(p => p.target) 
    };
}

/**
 * 根据指定路径生成 SeaTunnel 配置
 */
export function generateConfigForPath(
    path: CompletePath,
    connections: DbConnection[]
): string {
    const { sourceNode, sinkNode } = path;
    
    const sourceConn = connections.find(c => c.id === sourceNode.connId);
    const sinkConn = connections.find(c => c.id === sinkNode.connId);
    
    if (!sourceConn) {
        throw new Error(`未找到源端（${sourceNode.tableName || 'Source'}）的数据源连接信息`);
    }
    if (!sinkConn) {
        throw new Error(`未找到目标端（${sinkNode.tableName || 'Sink'}）的数据源连接信息`);
    }
    
    const sourceDb = sourceNode.database || '';
    const sinkDb = sinkNode.database || '';
    
    if (!sourceDb) {
        throw new Error(`未配置源端（${sourceNode.tableName || 'Source'}）的数据库`);
    }
    if (!sinkDb) {
        throw new Error(`未配置目标端（${sinkNode.tableName || 'Sink'}）的数据库`);
    }
    
    const sourceTable = sourceNode.tableName || 'source_table';
    const sinkTable = sinkNode.tableName || 'sink_table';
    
    // 收集字段映射
    const { sourceFields, targetFields } = collectPathMappings(path);
    
    // 生成 Source Query
    let sourceColsStr = '*';
    if (sourceFields.length > 0) {
        sourceColsStr = sourceFields.map(f => `\`${f}\``).join(', ');
    }
    const sourceQuery = `select ${sourceColsStr} from ${sourceTable}`;
    
    // 生成 Sink Query
    let sinkQuery = '';
    if (targetFields.length > 0) {
        const sinkColsNames = targetFields.map(f => `\`${f}\``).join(', ');
        const sinkPlaceholders = targetFields.map(() => '?').join(', ');
        sinkQuery = `INSERT INTO \`${sinkDb}\`.\`${sinkTable}\` (${sinkColsNames}) VALUES (${sinkPlaceholders})`;
    } else {
        sinkQuery = `INSERT INTO \`${sinkDb}\`.\`${sinkTable}\``;
    }
    
    const config = `env {
  execution.parallelism = 1
  job.mode = "BATCH"
}

source {
  Jdbc {
    url = "jdbc:mysql://${sourceConn.host}:${sourceConn.port}/${sourceDb}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${sourceConn.user}"
    password = "${sourceConn.password || ''}"
    query = "${sourceQuery}"
  }
}

sink {
  Jdbc {
    url = "jdbc:mysql://${sinkConn.host}:${sinkConn.port}/${sinkDb}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${sinkConn.user}"
    password = "${sinkConn.password || ''}"
    query = "${sinkQuery}"
  }
}`;

    return config;
}

/**
 * 兼容旧接口：生成映射配置
 * 如果有多条路径会抛出特殊错误，需要调用者处理
 */
export function generateMappingConfig(
    nodes: CanvasNode[],
    links: CanvasLink[],
    sideConfig: {
        source?: { connId: string; db: string };
        target?: { connId: string; db: string };
    },
    connections: DbConnection[]
): string {
    const result = detectCompletePaths(nodes, links);
    
    if (result.errors.length > 0) {
        throw new Error(result.errors.join('\n'));
    }
    
    if (result.paths.length === 0) {
        throw new Error('未找到完整的 Source → Sink 路径，请确保节点已正确连接');
    }
    
    if (result.paths.length > 1) {
        // 特殊错误标识，调用者需要处理多路径选择
        const pathLabels = result.paths.map(p => p.label).join(', ');
        throw new Error(`MULTIPLE_PATHS:${JSON.stringify(result.paths.map(p => ({ id: p.id, label: p.label })))}`);
    }
    
    return generateConfigForPath(result.paths[0], connections);
}
