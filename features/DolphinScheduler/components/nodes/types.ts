import { DolphinSchedulerConfig } from '../../../../types';
import { TaskNode } from '../TaskEditor/types';

export interface DataSource {
    id: number;
    name: string;
    type: string;
}

export interface NodeFormProps<T = TaskNode['taskParams']> {
    data: T;
    onChange: (data: T) => void;
    projectConfig?: DolphinSchedulerConfig;
    datasources?: DataSource[];
    readOnly?: boolean;
}
