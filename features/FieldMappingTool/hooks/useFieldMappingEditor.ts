import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { useFieldMappingStore } from '../store';
import { CanvasNode, DbConnection } from '../../../types';
import { SeaTunnelEngineConfig } from '../../SeaTunnelManager/types';
import { seaTunnelApi } from '../../SeaTunnelManager/api';
import { convertToJson } from '../../../utils/hoconParser';
import { generateMappingConfig, detectCompletePaths, generateConfigForPath } from '../utils/configGenerator';

export const useFieldMappingEditor = (connections: DbConnection[]) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    // Zustand Store Access
    const activeProfile = useFieldMappingStore((state) => state.activeProfile);
    const setActiveProfile = useFieldMappingStore((state) => state.setActiveProfile);
    const nodes = useFieldMappingStore((state) => state.nodes);
    const links = useFieldMappingStore((state) => state.links);
    const updateActiveProfile = useFieldMappingStore((state) => state.updateActiveProfile);
    const saveCurrentProfile = useFieldMappingStore((state) => state.saveCurrentProfile);
    const hasUnsavedChanges = useFieldMappingStore((state) => state.hasUnsavedChanges);

    // SeaTunnel Engine State
    const [engines] = useState<SeaTunnelEngineConfig[]>(() => {
        const saved = localStorage.getItem('seatunnel_engine_configs');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedEngineId, setSelectedEngineId] = useState<string>(() => {
        return localStorage.getItem('field_mapping_selected_engine') || '';
    });

    // Config Generation & Editor State
    const [generatedConfig, setGeneratedConfig] = useState<string>(() => activeProfile?.generatedConfig || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [configPanelHeight, setConfigPanelHeight] = useState(200);
    const [isConfigEditing, setIsConfigEditing] = useState(false);
    const [editingConfig, setEditingConfig] = useState('');

    // Modal States
    const [nodeConfigModal, setNodeConfigModal] = useState<{ isOpen: boolean; node: CanvasNode | null }>({
        isOpen: false, node: null
    });
    const [pathSelectModal, setPathSelectModal] = useState<{ isOpen: boolean; paths: { id: string; label: string }[] }>({
        isOpen: false, paths: []
    });
    const [exitConfirmModal, setExitConfirmModal] = useState(false);

    // Sync Effects
    useEffect(() => {
        if (selectedEngineId) {
            localStorage.setItem('field_mapping_selected_engine', selectedEngineId);
        }
    }, [selectedEngineId]);

    useEffect(() => {
        if (activeProfile && generatedConfig !== activeProfile.generatedConfig) {
            updateActiveProfile({ generatedConfig });
        }
    }, [generatedConfig, activeProfile, updateActiveProfile]);

    useEffect(() => {
        setGeneratedConfig(activeProfile?.generatedConfig || '');
    }, [activeProfile?.id]);

    // Actions
    const handleGenerateConfig = useCallback(async () => {
        setIsGenerating(true);
        try {
            const result = detectCompletePaths(nodes, links);
            if (result.errors.length > 0) {
                toast({ title: t('fieldMapping.generateFailed'), description: result.errors.join('\n'), variant: 'destructive' });
                return;
            }
            if (result.paths.length === 0) {
                toast({ title: t('fieldMapping.noPathFound'), variant: 'destructive' });
                return;
            }
            if (result.paths.length > 1) {
                setPathSelectModal({ isOpen: true, paths: result.paths.map(p => ({ id: p.id, label: p.label })) });
                return;
            }
            const config = generateConfigForPath(result.paths[0], connections);
            setGeneratedConfig(config);
            toast({ title: t('fieldMapping.configGenerated'), variant: 'success' });
        } catch (err: any) {
            toast({ title: t('fieldMapping.generateFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    }, [nodes, links, connections, t, toast]);

    const handleSubmit = useCallback(async () => {
        if (!generatedConfig || !selectedEngineId) return;
        const engine = engines.find(e => e.id === selectedEngineId);
        if (!engine) return;

        setIsSubmitting(true);
        try {
            const convertResult = convertToJson(generatedConfig);
            if (convertResult.error) throw new Error(convertResult.error);
            const result = await seaTunnelApi.submitJob(engine, {
                jobName: activeProfile?.name || 'Mapping Job',
                config: convertResult.json
            });
            if (result.success) {
                toast({ title: t('fieldMapping.submitSuccess'), description: `Job ID: ${result.data}`, variant: 'success' });
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ title: t('fieldMapping.submitFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }, [generatedConfig, selectedEngineId, engines, activeProfile, t, toast]);

    const handleExit = useCallback(() => {
        if (hasUnsavedChanges()) {
            setExitConfirmModal(true);
        } else {
            setActiveProfile(null);
        }
    }, [hasUnsavedChanges, setActiveProfile]);

    const confirmExit = useCallback(() => {
        saveCurrentProfile();
        setExitConfirmModal(false);
        setActiveProfile(null);
    }, [saveCurrentProfile, setActiveProfile]);

    const discardExit = useCallback(() => {
        setExitConfirmModal(false);
        setActiveProfile(null);
    }, [setActiveProfile]);

    return {
        activeProfile,
        setActiveProfile,
        updateActiveProfile,
        saveCurrentProfile,
        
        engines,
        selectedEngineId,
        setSelectedEngineId,
        
        generatedConfig,
        setGeneratedConfig,
        isGenerating,
        isSubmitting,
        configPanelHeight,
        setConfigPanelHeight,
        isConfigEditing,
        setIsConfigEditing,
        editingConfig,
        setEditingConfig,
        
        nodeConfigModal,
        setNodeConfigModal,
        pathSelectModal,
        setPathSelectModal,
        exitConfirmModal,
        
        handleGenerateConfig,
        handleSubmit,
        handleExit,
        confirmExit,
        discardExit
    };
};
