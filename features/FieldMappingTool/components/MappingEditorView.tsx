import React from 'react';
import { useTranslation } from 'react-i18next';
import { DbConnection } from '../../../types';
import { useFieldMappingStore } from '../store';
import { ConfirmModal } from '../../common/ConfirmModal';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { MappingModal } from './MappingModal';
import { NodeConfigModal } from './NodeConfigModal';
import { PathSelectModal } from './PathSelectModal';
import { MappingEditorToolbar } from './MappingEditorToolbar';
import { ConfigPreviewPanel } from './ConfigPreviewPanel';
import { useFieldMappingEditor } from '../hooks/useFieldMappingEditor';

interface MappingEditorViewProps {
    connections: DbConnection[];
}

export const MappingEditorView: React.FC<MappingEditorViewProps> = ({ connections }) => {
    const { t } = useTranslation();
    const nodesCount = useFieldMappingStore(state => state.nodes.length);
    
    const editorState = useFieldMappingEditor(connections);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar */}
            <MappingEditorToolbar
                activeProfile={editorState.activeProfile}
                updateActiveProfile={editorState.updateActiveProfile}
                saveCurrentProfile={editorState.saveCurrentProfile}
                engines={editorState.engines}
                selectedEngineId={editorState.selectedEngineId}
                setSelectedEngineId={editorState.setSelectedEngineId}
                isGenerating={editorState.isGenerating}
                handleGenerateConfig={editorState.handleGenerateConfig}
                isSubmitting={editorState.isSubmitting}
                handleSubmit={editorState.handleSubmit}
                nodesCount={nodesCount}
                handleExit={editorState.handleExit}
                generatedConfig={editorState.generatedConfig}
            />

            {/* 下方内容区 */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* 左侧节点面板 */}
                <Sidebar />

                {/* 右侧画布 + 配置 */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* 画布 */}
                    <div className="flex-1 min-h-[200px] overflow-hidden relative border-l border-slate-200 dark:border-slate-700">
                        <Canvas 
                            connections={connections} 
                            onNodeClick={(node) => editorState.setNodeConfigModal({ isOpen: true, node })} 
                        />
                    </div>

                    {/* 配置面板 */}
                    <ConfigPreviewPanel
                        configPanelHeight={editorState.configPanelHeight}
                        setConfigPanelHeight={editorState.setConfigPanelHeight}
                        generatedConfig={editorState.generatedConfig}
                        setGeneratedConfig={editorState.setGeneratedConfig}
                        isConfigEditing={editorState.isConfigEditing}
                        setIsConfigEditing={editorState.setIsConfigEditing}
                        editingConfig={editorState.editingConfig}
                        setEditingConfig={editorState.setEditingConfig}
                    />
                </div>
            </div>

            <MappingModal />

            <NodeConfigModal
                isOpen={editorState.nodeConfigModal.isOpen}
                onClose={() => editorState.setNodeConfigModal({ isOpen: false, node: null })}
                node={editorState.nodeConfigModal.node}
                connections={connections}
            />

            <PathSelectModal
                isOpen={editorState.pathSelectModal.isOpen}
                onClose={() => editorState.setPathSelectModal({ isOpen: false, paths: [] })}
                paths={editorState.pathSelectModal.paths}
                onSelect={(pathId) => {
                    const { detectCompletePaths, generateConfigForPath } = require('../utils/configGenerator');
                    try {
                        const nodes = useFieldMappingStore.getState().nodes;
                        const links = useFieldMappingStore.getState().links;
                        const result = detectCompletePaths(nodes, links);
                        const selectedPath = result.paths.find((p: any) => p.id === pathId);
                        if (selectedPath) {
                            const config = generateConfigForPath(selectedPath, connections);
                            editorState.setGeneratedConfig(config);
                        }
                        editorState.setPathSelectModal({ isOpen: false, paths: [] });
                    } catch (err: any) {
                        console.error(err);
                        alert(err.message);
                    }
                }}
            />

            {/* 退出确认弹窗 */}
            <ConfirmModal
                isOpen={editorState.exitConfirmModal}
                title={t('fieldMapping.exitConfirm', { defaultValue: '确认退出' })}
                message={t('fieldMapping.saveAndExit', { defaultValue: '是否保存当前修改后退出？' })}
                confirmText={t('fieldMapping.saveThenExit', { defaultValue: '保存并退出' })}
                cancelText={t('fieldMapping.discard', { defaultValue: '放弃修改' })}
                type="info"
                onConfirm={editorState.confirmExit}
                onCancel={editorState.discardExit}
            />
        </div>
    );
};
