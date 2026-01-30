import React, { useMemo } from 'react';
import { Database, ArrowRight, Box, AlertCircle, Code } from 'lucide-react';

interface DagVertex {
    vertexId: number;
    type: string;
    vertexName?: string;
    connectorType?: string;
    tablePaths?: string[];
}

interface DagEdge {
    inputVertexId: number;
    targetVertexId: number;
}

interface JobDagData {
    jobId?: string | number;
    envOptions?: Record<string, any>;
    vertices?: DagVertex[];
    vertexInfoMap?: Record<string, DagVertex>;
    pipelineEdges?: Record<string, DagEdge[]>;
    edges?: DagEdge[];
}

interface DagVisualizerProps {
    dagData: string | object;
    lang?: 'zh' | 'en';
}

/**
 * SeaTunnel DAG 可视化组件
 * 将 jobDag JSON 解析为流程图形式展示
 */
export const DagVisualizer: React.FC<DagVisualizerProps> = ({ dagData, lang = 'zh' }) => {
    const parsedDag = useMemo(() => {
        try {
            if (typeof dagData === 'string') {
                return JSON.parse(dagData) as JobDagData;
            }
            return dagData as JobDagData;
        } catch {
            return null;
        }
    }, [dagData]);

    if (!parsedDag) {
        return (
            <div className="flex items-center justify-center p-4 text-slate-500">
                <AlertCircle size={16} className="mr-2" />
                {lang === 'zh' ? '无法解析 DAG 数据' : 'Unable to parse DAG data'}
            </div>
        );
    }

    // 从 vertices 数组或 vertexInfoMap 获取节点
    let vertices: DagVertex[] = [];
    if (parsedDag.vertices && Array.isArray(parsedDag.vertices)) {
        vertices = parsedDag.vertices;
    } else if (parsedDag.vertexInfoMap) {
        vertices = Object.values(parsedDag.vertexInfoMap);
    }
    
    // 收集所有边
    const allEdges: DagEdge[] = [];
    if (parsedDag.pipelineEdges) {
        Object.values(parsedDag.pipelineEdges).forEach((edges: DagEdge[]) => {
            allEdges.push(...edges);
        });
    }
    if (parsedDag.edges) {
        allEdges.push(...parsedDag.edges);
    }

    // 按类型分组节点（支持大小写）
    const sources = vertices.filter(v => v.type?.toUpperCase() === 'SOURCE');
    const transforms = vertices.filter(v => v.type?.toUpperCase() === 'TRANSFORM');
    const sinks = vertices.filter(v => v.type?.toUpperCase() === 'SINK');

    // 获取节点图标和颜色
    const getNodeStyle = (type: string) => {
        switch (type) {
            case 'source':
                return {
                    icon: <Database size={18} />,
                    bgColor: 'bg-green-100 dark:bg-green-900/30',
                    borderColor: 'border-green-500',
                    textColor: 'text-green-700 dark:text-green-400',
                    iconColor: 'text-green-600'
                };
            case 'transform':
                return {
                    icon: <Box size={18} />,
                    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                    borderColor: 'border-blue-500',
                    textColor: 'text-blue-700 dark:text-blue-400',
                    iconColor: 'text-blue-600'
                };
            case 'sink':
                return {
                    icon: <Database size={18} />,
                    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                    borderColor: 'border-purple-500',
                    textColor: 'text-purple-700 dark:text-purple-400',
                    iconColor: 'text-purple-600'
                };
            default:
                return {
                    icon: <Box size={18} />,
                    bgColor: 'bg-slate-100 dark:bg-slate-700',
                    borderColor: 'border-slate-400',
                    textColor: 'text-slate-700 dark:text-slate-300',
                    iconColor: 'text-slate-600'
                };
        }
    };

    // 渲染节点
    const renderNode = (vertex: DagVertex) => {
        const style = getNodeStyle(vertex.type);
        
        // 从 connectorType 或 vertexName 提取插件名称
        // connectorType 示例: "pipeline-1 [Source[0]-Jdbc]" -> "Jdbc"
        // connectorType 示例: "pipeline-1 [Sink[0]-jdbc-MultiTableSink]" -> "jdbc"
        // connectorType 示例: "pipeline-1 [TransformChain[Transform[0]-sql]]" -> "sql"
        let pluginType = vertex.type || 'Unknown';
        if (vertex.connectorType) {
            // 尝试从 connectorType 提取
            const match = vertex.connectorType.match(/\[(?:Source|Sink|Transform(?:Chain)?)\[\d+\]-([^\]\-]+)/);
            if (match) {
                pluginType = match[1];
            }
        } else if (vertex.vertexName) {
            const match = vertex.vertexName.match(/^(\w+)/);
            if (match) {
                pluginType = match[1];
            }
        }
        
        return (
            <div
                key={vertex.vertexId}
                className={`flex items-center px-3 py-2 rounded-lg border-2 ${style.bgColor} ${style.borderColor} shadow-sm min-w-[100px]`}
            >
                <span className={`mr-2 ${style.iconColor}`}>{style.icon}</span>
                <div className="flex flex-col">
                    <span className={`font-medium text-sm ${style.textColor} capitalize`}>{pluginType}</span>
                    {vertex.connectorType && (
                        <span className="text-xs text-slate-400 truncate max-w-[150px]" title={vertex.connectorType}>
                            {vertex.type}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // 渲染箭头
    const renderArrow = () => (
        <div className="flex items-center px-2">
            <ArrowRight size={20} className="text-slate-400" />
        </div>
    );

    // 如果没有顶点，显示提示
    if (vertices.length === 0) {
        // 尝试从其他字段解析简单的 source->sink 结构
        if (parsedDag.envOptions) {
            return (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-sm text-slate-500 mb-2">
                        {lang === 'zh' ? '环境配置' : 'Environment Options'}
                    </div>
                    <pre className="text-xs text-slate-600 dark:text-slate-400">
                        {JSON.stringify(parsedDag.envOptions, null, 2)}
                    </pre>
                </div>
            );
        }
        return (
            <div className="text-sm text-slate-500 p-4">
                {lang === 'zh' ? '暂无 DAG 节点数据' : 'No DAG vertices data'}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* DAG 流程图 */}
            <div className="flex items-center justify-center flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-x-auto">
                {/* Sources */}
                <div className="flex flex-col gap-2">
                    {sources.length > 0 && (
                        <div className="text-xs text-green-600 font-medium text-center mb-1">
                            {lang === 'zh' ? '数据源' : 'Source'}
                        </div>
                    )}
                    {sources.map(v => renderNode(v))}
                </div>

                {sources.length > 0 && (transforms.length > 0 || sinks.length > 0) && renderArrow()}

                {/* Transforms */}
                {transforms.length > 0 && (
                    <>
                        <div className="flex flex-col gap-2">
                            <div className="text-xs text-blue-600 font-medium text-center mb-1">
                                {lang === 'zh' ? '转换' : 'Transform'}
                            </div>
                            {transforms.map(v => renderNode(v))}
                        </div>
                        {sinks.length > 0 && renderArrow()}
                    </>
                )}

                {/* Sinks */}
                {sinks.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs text-purple-600 font-medium text-center mb-1">
                            {lang === 'zh' ? '目标' : 'Sink'}
                        </div>
                        {sinks.map(v => renderNode(v))}
                    </div>
                )}
            </div>

            {/* 环境配置摘要 */}
            {parsedDag.envOptions && Object.keys(parsedDag.envOptions).length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-xs text-amber-600 font-medium mb-1">
                        {lang === 'zh' ? '环境配置' : 'Env Options'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(parsedDag.envOptions).slice(0, 5).map(([key, value]) => (
                            <span key={key} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs rounded">
                                {key}: {String(value)}
                            </span>
                        ))}
                        {Object.keys(parsedDag.envOptions).length > 5 && (
                            <span className="text-xs text-amber-500">+{Object.keys(parsedDag.envOptions).length - 5} more</span>
                        )}
                    </div>
                </div>
            )}

            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{lang === 'zh' ? '节点' : 'Vertices'}: {vertices.length}</span>
                <span>{lang === 'zh' ? '边' : 'Edges'}: {allEdges.length}</span>
                {sources.length > 0 && <span>Source: {sources.length}</span>}
                {transforms.length > 0 && <span>Transform: {transforms.length}</span>}
                {sinks.length > 0 && <span>Sink: {sinks.length}</span>}
            </div>
        </div>
    );
};
