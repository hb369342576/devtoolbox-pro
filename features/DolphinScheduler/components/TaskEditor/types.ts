import { 
    Workflow, Database, GitBranch, Container, 
    Coffee, FileCode, Terminal
} from 'lucide-react';
import { DolphinSchedulerConfig } from '../../../../types';
import { ProcessDefinition } from '../../types';

// 节点类型定义
export const NODE_TYPES = [
    { id: 'seatunnel', name: 'SeaTunnel', icon: Workflow, color: '#3b82f6', bgColor: 'bg-blue-500' },
    { id: 'sql', name: 'SQL', icon: Database, color: '#22c55e', bgColor: 'bg-green-500' },
    { id: 'dependent', name: '依赖', icon: GitBranch, color: '#f59e0b', bgColor: 'bg-amber-500' },
    { id: 'k8s', name: 'K8S', icon: Container, color: '#a855f7', bgColor: 'bg-purple-500' },
    { id: 'java', name: 'Java', icon: Coffee, color: '#ef4444', bgColor: 'bg-red-500' },
    { id: 'python', name: 'Python', icon: FileCode, color: '#eab308', bgColor: 'bg-yellow-500' },
    { id: 'shell', name: 'Shell', icon: Terminal, color: '#64748b', bgColor: 'bg-slate-500' },
];

// 节点尺寸常量
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 70;

// 工作流节点
export interface TaskNode {
    id: string;
    code: number;
    name: string;
    taskType: string;
    x: number;
    y: number;
    _isNew?: boolean;
    // 任务参数
    taskParams: {
        // SQL 节点
        datasource?: number;
        datasourceName?: string;
        dbType?: string;        // MYSQL/DORIS/POSTGRESQL 等
        sql?: string;
        sqlType?: string;       // 0=查询, 1=非查询
        sqlFile?: string;       // SQL 文件路径
        // Java 节点
        mainJar?: { resourceName?: string };
        mainClass?: string;
        mainArgs?: string;
        jvmArgs?: string;
        // Shell 节点
        rawScript?: string;
        // Python 节点
        pythonPath?: string;
        pythonCommand?: string;
        // SeaTunnel 节点
        useCustom?: boolean;
        deployMode?: string;
        runMode?: string;
        startupScript?: string;
        configFile?: string;    // 配置文件路径
        // DEPENDENT 节点
        dependence?: {
            relation?: string;  // AND/OR
            checkInterval?: number;
            dependTaskList?: any[];
        };
        // K8S 节点
        namespace?: string;
        image?: string;
        imagePullPolicy?: string;
        command?: string;
        type?: string;
        kubeConfig?: string;
        customizedLabels?: any[];
        nodeSelectors?: any[];
        // 通用
        workerGroup?: string;
        environmentCode?: number;
        localParams?: any[];
        resourceList?: any[];
    };
    // 失败重试
    failRetryTimes?: number;
    failRetryInterval?: number;
    // 超时
    timeoutFlag?: 'OPEN' | 'CLOSE';
    timeout?: number;
    timeoutNotifyStrategy?: string;
    // 环境
    environmentCode?: number;
    // 描述
    description?: string;
    // 保存原始任务数据（用于保存时保留所有字段）
    rawTask?: any;
}

// 节点连线
export interface TaskRelation {
    preTaskCode: number;
    postTaskCode: number;
}

// TaskEditor 组件属性
export interface TaskEditorProps {
    process: ProcessDefinition;
    projectConfig: DolphinSchedulerConfig;
    onClose: () => void;
}

// 获取节点类型信息
export const getNodeType = (taskType: string) => {
    return NODE_TYPES.find(t => t.id.toLowerCase() === taskType.toLowerCase()) || NODE_TYPES[NODE_TYPES.length - 1];
};

// 重新导出外部类型，方便子模块引用
export type { DolphinSchedulerConfig, ProcessDefinition };
