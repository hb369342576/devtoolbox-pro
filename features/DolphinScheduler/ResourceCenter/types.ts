import { DolphinSchedulerConnection, DSResource } from '../../../types';

export type { DolphinSchedulerConnection, DSResource };

export interface ResourceCenterProps {
    connection: DolphinSchedulerConnection;
    onBack: () => void;
}

export interface EditFileModalState {
    isOpen: boolean;
    resource: DSResource | null;
    content: string;
    loading: boolean;
    saving: boolean;
}

export interface CreateModalState {
    isOpen: boolean;
    type: 'folder' | 'file';
}

export interface RenameModalState {
    isOpen: boolean;
    resource: DSResource | null;
}

export interface ConfirmDeleteState {
    isOpen: boolean;
    ids: string[];
    names: string[];
}
