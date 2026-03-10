import { DolphinSchedulerConfig, DolphinSchedulerApiVersion } from '../../../types';
import { ProcessDefinition } from '../types';

export type { ProcessDefinition };
export type { DolphinSchedulerConfig, DolphinSchedulerApiVersion };

export interface TaskManagerProps {
    currentProject: DolphinSchedulerConfig | null;
    configs: DolphinSchedulerConfig[];
    onSelectProject: (config: DolphinSchedulerConfig) => void;
    onNavigate: (id: string) => void;
    onBack?: () => void;
}

export type TabType = 'workflow-definition' | 'workflow-instance' | 'workflow-schedule' | 'task-instance';

export interface ColumnWidths {
    name: number;
    version: number;
    state: number;
    schedule: number;
    updatedTime: number;
    actions: number;
}
