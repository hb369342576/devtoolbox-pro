import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import { SeaTunnelEngineConfig } from './types';
import { EngineManager } from './EngineManager';
import { JobManager } from './JobManager';
import { SubmitJobModal } from './components';

interface SeaTunnelManagerProps {
    lang: Language;
    activeSubPage: 'engine' | 'job';
    onNavigate: (id: string) => void;
}

const STORAGE_KEY = 'seatunnel_engine_configs';

export const SeaTunnelManager: React.FC<SeaTunnelManagerProps> = ({
    lang,
    activeSubPage,
    onNavigate
}) => {
    const [configs, setConfigs] = useState<SeaTunnelEngineConfig[]>([]);
    const [currentEngine, setCurrentEngine] = useState<SeaTunnelEngineConfig | null>(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    // 加载配置
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setConfigs(JSON.parse(saved));
            }
        } catch (e) {
            console.error('[SeaTunnelManager] Failed to load configs:', e);
        }
    }, []);

    // 保存配置
    const saveConfigs = (newConfigs: SeaTunnelEngineConfig[]) => {
        setConfigs(newConfigs);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
        } catch (e) {
            console.error('[SeaTunnelManager] Failed to save configs:', e);
        }
    };

    // 添加配置
    const handleAddConfig = (config: Omit<SeaTunnelEngineConfig, 'id'>) => {
        const newConfig: SeaTunnelEngineConfig = {
            ...config,
            id: `seatunnel_${Date.now()}`
        };
        saveConfigs([...configs, newConfig]);
    };

    // 更新配置
    const handleUpdateConfig = (config: SeaTunnelEngineConfig) => {
        saveConfigs(configs.map(c => c.id === config.id ? config : c));
    };

    // 删除配置
    const handleDeleteConfig = (id: string) => {
        saveConfigs(configs.filter(c => c.id !== id));
        if (currentEngine?.id === id) {
            setCurrentEngine(null);
        }
    };

    // 选择引擎
    const handleSelectEngine = (config: SeaTunnelEngineConfig | null) => {
        setCurrentEngine(config);
    };

    // 打开提交作业弹窗
    const handleOpenSubmitModal = () => {
        setShowSubmitModal(true);
    };

    // 刷新作业列表（用于提交成功后）
    const handleRefreshJobs = () => {
        // JobManager 内部会自动刷新
    };

    if (activeSubPage === 'engine') {
        return (
            <EngineManager
                lang={lang}
                configs={configs}
                onAdd={handleAddConfig}
                onUpdate={handleUpdateConfig}
                onDelete={handleDeleteConfig}
                onSelect={(config) => {
                    setCurrentEngine(config);
                    onNavigate('seatunnel-job');
                }}
            />
        );
    }

    return (
        <>
            <JobManager
                lang={lang}
                currentEngine={currentEngine}
                configs={configs}
                onSelectEngine={handleSelectEngine}
                onNavigate={onNavigate}
                onOpenSubmitModal={handleOpenSubmitModal}
            />
            {currentEngine && (
                <SubmitJobModal
                    show={showSubmitModal}
                    lang={lang}
                    engine={currentEngine}
                    onClose={() => setShowSubmitModal(false)}
                    onSuccess={handleRefreshJobs}
                />
            )}
        </>
    );
};

export default SeaTunnelManager;
