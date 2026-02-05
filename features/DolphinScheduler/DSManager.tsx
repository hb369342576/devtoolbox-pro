import React, { useState } from 'react';
import { Language, DolphinSchedulerConnection, DSProject, DolphinSchedulerConfig } from '../../types';
import { ConnectionManager } from './ConnectionManager';
import { ProjectListView } from './ProjectListView';
import { ResourceCenter } from './ResourceCenter';
import { DataSourceCenter } from './DataSourceCenter';
import { TaskManager } from './TaskManager';
import { useGlobalStore } from '../../store/globalStore';

interface DSManagerProps {
    lang: Language;
    onNavigate: (id: string) => void;
}

type ViewState = 
    | { type: 'connections' }
    | { type: 'projects', connection: DolphinSchedulerConnection }
    | { type: 'resources', connection: DolphinSchedulerConnection }
    | { type: 'datasources', connection: DolphinSchedulerConnection }
    | { type: 'workflows', connection: DolphinSchedulerConnection, project: DSProject };

export const DSManager: React.FC<DSManagerProps> = ({
    lang,
    onNavigate
}) => {
    const { 
        dsConnections, 
        addDsConnection, 
        updateDsConnection, 
        deleteDsConnection 
    } = useGlobalStore();
    
    const [viewState, setViewState] = useState<ViewState>({ type: 'connections' });

    // 连接管理操作
    const handleSelectConnection = (conn: DolphinSchedulerConnection) => {
        setViewState({ type: 'projects', connection: conn });
    };

    // 项目列表操作
    const handleBackToConnections = () => {
        setViewState({ type: 'connections' });
    };

    const handleSelectProject = (project: DSProject) => {
        if (viewState.type === 'projects') {
            setViewState({ 
                type: 'workflows', 
                connection: viewState.connection, 
                project 
            });
        }
    };

    const handleOpenResourceCenter = () => {
        if (viewState.type === 'projects') {
            setViewState({ 
                type: 'resources', 
                connection: viewState.connection 
            });
        }
    };

    const handleOpenDataSourceCenter = () => {
        if (viewState.type === 'projects') {
            setViewState({ 
                type: 'datasources', 
                connection: viewState.connection 
            });
        }
    };

    // 资源中心操作
    const handleBackFromResources = () => {
        if (viewState.type === 'resources') {
            setViewState({ type: 'projects', connection: viewState.connection });
        }
    };

    // 数据源中心操作
    const handleBackFromDataSources = () => {
        if (viewState.type === 'datasources') {
            setViewState({ type: 'projects', connection: viewState.connection });
        }
    };

    // 工作流管理操作
    const handleBackFromWorkflows = () => {
        if (viewState.type === 'workflows') {
            setViewState({ type: 'projects', connection: viewState.connection });
        }
    };

    // 将 DSProject 转换为 DolphinSchedulerConfig 用于 TaskManager
    const createConfigFromProject = (conn: DolphinSchedulerConnection, project: DSProject): DolphinSchedulerConfig => {
        return {
            id: `${conn.id}-${project.code}`,
            name: project.name,
            baseUrl: conn.baseUrl,
            token: conn.token,
            projectCode: String(project.code),
            projectName: project.name,
            apiVersion: conn.apiVersion
        };
    };

    // 渲染当前视图
    switch (viewState.type) {
        case 'connections':
            return (
                <ConnectionManager
                    lang={lang}
                    connections={dsConnections}
                    onAdd={addDsConnection}
                    onUpdate={updateDsConnection}
                    onDelete={deleteDsConnection}
                    onSelect={handleSelectConnection}
                />
            );
        
        case 'projects':
            return (
                <ProjectListView
                    lang={lang}
                    connection={viewState.connection}
                    onBack={handleBackToConnections}
                    onSelectProject={handleSelectProject}
                    onOpenResourceCenter={handleOpenResourceCenter}
                    onOpenDataSourceCenter={handleOpenDataSourceCenter}
                />
            );
        
        case 'resources':
            return (
                <ResourceCenter
                    lang={lang}
                    connection={viewState.connection}
                    onBack={handleBackFromResources}
                />
            );
        
        case 'datasources':
            return (
                <DataSourceCenter
                    lang={lang}
                    connection={viewState.connection}
                    onBack={handleBackFromDataSources}
                />
            );
        
        case 'workflows':
            const projectConfig = createConfigFromProject(viewState.connection, viewState.project);
            return (
                <div className="h-full flex flex-col">
                    <TaskManager
                        lang={lang}
                        currentProject={projectConfig}
                        configs={[projectConfig]}
                        onSelectProject={() => {}}
                        onNavigate={onNavigate}
                        onBack={handleBackFromWorkflows}
                    />
                </div>
            );
        
        default:
            return null;
    }
};

