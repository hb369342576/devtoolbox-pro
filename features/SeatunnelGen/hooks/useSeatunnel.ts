import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DbConnection, ScriptJob, JobConfig, TableInfo, ColumnInfo, TableDetail } from '../../../types';
import { SeaTunnelEngineConfig } from '../../SeaTunnelManager/types';
import { generateConfig } from '../utils/configGenerator';
import { useToast } from '../../common/Toast';
import { useTranslation } from 'react-i18next';

export function useSeatunnel(connections: DbConnection[]) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [jobs, setJobs] = useState<ScriptJob[]>(() => {
    const saved = localStorage.getItem('seatunnel_jobs');
    return saved ? JSON.parse(saved) : [];
  });

  const saveJobs = (newJobs: ScriptJob[]) => {
    setJobs(newJobs);
    localStorage.setItem('seatunnel_jobs', JSON.stringify(newJobs));
  };

  const [activeJob, setActiveJob] = useState<ScriptJob | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'source' | 'sink' | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [sourceDbs, setSourceDbs] = useState<string[]>([]);
  const [sinkDbs, setSinkDbs] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
  const [sinkTables, setSinkTables] = useState<TableInfo[]>([]);
  const [sourceTableSearch, setSourceTableSearch] = useState('');
  const [sinkTableSearch, setSinkTableSearch] = useState('');
  const [isSourceLoadingDbs, setIsSourceLoadingDbs] = useState(false);
  const [isSinkLoadingDbs, setIsSinkLoadingDbs] = useState(false);
  const [isSourceLoadingTables, setIsSourceLoadingTables] = useState(false);
  const [isSinkLoadingTables, setIsSinkLoadingTables] = useState(false);
  
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; jobId: string }>({ isOpen: false, jobId: '' });

  const [engines, setEngines] = useState<SeaTunnelEngineConfig[]>(() => {
    const saved = localStorage.getItem('seatunnel_engine_configs');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedEngineId, setSelectedEngineId] = useState<string>(() => {
    return localStorage.getItem('seatunnel_gen_selected_engine') || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configPanelHeight, setConfigPanelHeight] = useState(300);

  const [isConfigEditing, setIsConfigEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState('');
  const [exitConfirmModal, setExitConfirmModal] = useState(false);

  useEffect(() => {
    if (selectedEngineId) {
      localStorage.setItem('seatunnel_gen_selected_engine', selectedEngineId);
    }
  }, [selectedEngineId]);

  useEffect(() => {
    if (activeJob && generatedConfig) {
      const updatedJob = { ...activeJob, generatedConfig };
      const newJobs = jobs.map(j => j.id === activeJob.id ? updatedJob : j);
      localStorage.setItem('seatunnel_jobs', JSON.stringify(newJobs));
    }
  }, [generatedConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setGeneratedConfig((activeJob as any)?.generatedConfig || '');
    setIsConfigEditing(false);
  }, [activeJob?.id]);

  useEffect(() => {
    if (activeJob && connections.length > 0) {
      if (activeJob.source.host) {
        const conn = connections.find(c =>
          c.host === activeJob.source.host &&
          c.port === activeJob.source.port &&
          (c.user === activeJob.source.user)
        );
        if (conn) {
          loadDatabases(conn, 'source').then(() => {
            if (activeJob.source.database) {
              loadTables(activeJob.source, activeJob.source.database, 'source');
            }
          });
        }
      }

      if (activeJob.sink.host) {
        const conn = connections.find(c =>
          c.host === activeJob.sink.host &&
          c.port === activeJob.sink.port &&
          (c.user === activeJob.sink.user)
        );
        if (conn) {
          loadDatabases(conn, 'sink').then(() => {
            if (activeJob.sink.database) {
              loadTables(activeJob.sink, activeJob.sink.database, 'sink');
            }
          });
        }
      }
    }
  }, [activeJob?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUnsavedChanges = () => {
    if (!activeJob) return false;
    const savedJob = jobs.find(j => j.id === activeJob.id);
    if (!savedJob) return true;
    return generatedConfig !== ((savedJob as any).generatedConfig || '');
  };

  const loadDatabases = async (conn: DbConnection, side: 'source' | 'sink') => {
    if (side === 'source') setIsSourceLoadingDbs(true);
    else setIsSinkLoadingDbs(true);

    try {
      let dbs: string[] = [];
      if (isTauri) {
        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        dbs = await invoke('db_get_databases', { id: connStr });
      } else {
        dbs = ['demo_db_1', 'demo_db_2', 'test_schema'];
      }
      if (side === 'source') setSourceDbs(dbs);
      else setSinkDbs(dbs);
    } catch (e) {
      console.error('Failed to load databases:', e);
      if (side === 'source') setSourceDbs([]);
      else setSinkDbs([]);
    }

    if (side === 'source') setIsSourceLoadingDbs(false);
    else setIsSinkLoadingDbs(false);
  };

  const loadTables = async (conn: JobConfig, dbName: string, side: 'source' | 'sink') => {
    if (side === 'source') setIsSourceLoadingTables(true);
    else setIsSinkLoadingTables(true);

    try {
      let tables: TableInfo[] = [];
      if (isTauri) {
        const connStr = `mysql://${conn.user}:${conn.password || ''}@${conn.host}:${conn.port}`;
        tables = await invoke('db_get_tables', { id: connStr, db: dbName });
      } else {
        tables = [{ name: 'table_1', rows: 100, size: '1KB' }, { name: 'table_2', rows: 200, size: '2KB' }];
      }
      if (side === 'source') setSourceTables(tables);
      else setSinkTables(tables);
    } catch (e) {
      console.error('Failed to load tables:', e);
      if (side === 'source') setSourceTables([]);
      else setSinkTables([]);
    }

    if (side === 'source') setIsSourceLoadingTables(false);
    else setIsSinkLoadingTables(false);
  };

  const updateJobDetails = (part: 'source' | 'sink', key: keyof JobConfig, value: string) => {
    setActiveJob(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        [part]: { ...prev[part], [key]: value }
      };

      setJobs(currentJobs => {
        const newJobs = currentJobs.map(j => j.id === prev.id ? updated : j);
        localStorage.setItem('seatunnel_jobs', JSON.stringify(newJobs));
        return newJobs;
      });
      return updated;
    });
  };

  const handleSelectDataSource = async (conn: DbConnection, target?: 'source' | 'sink') => {
    const targetSide = target || selectingFor;

    if (activeJob && targetSide) {
      const jobConfig: JobConfig = {
        type: conn.type,
        host: conn.host,
        port: conn.port,
        user: conn.user,
        password: conn.password,
        database: conn.defaultDatabase || '',
        table: '',
        name: conn.name
      };

      const updatedJob = { ...activeJob, [targetSide]: jobConfig };
      setActiveJob(updatedJob);
      saveJobs(jobs.map(j => j.id === activeJob.id ? updatedJob : j));

      await loadDatabases(conn, targetSide);

      if (conn.defaultDatabase) {
        await loadTables(jobConfig, conn.defaultDatabase, targetSide);
      }
    }
    setShowSelector(false);
    setSelectingFor(null);
  };

  const handleCreateJob = () => {
    const newJob: ScriptJob = {
      id: Date.now().toString(),
      name: t('common.newSyncJob'),
      scriptType: 'seatunnel',
      source: {} as JobConfig,
      sink: {} as JobConfig,
      createdAt: Date.now()
    };
    saveJobs([newJob, ...jobs]);
    setActiveJob(newJob);
    setGeneratedConfig('');
  };

  const handleDeleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ isOpen: true, jobId: id });
  };

  const confirmDeleteJob = () => {
    saveJobs(jobs.filter(j => j.id !== confirmDelete.jobId));
    if (activeJob?.id === confirmDelete.jobId) setActiveJob(null);
    setConfirmDelete({ isOpen: false, jobId: '' });
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setExitConfirmModal(true);
    } else {
      setActiveJob(null);
    }
  };

  const handleGenerateConfig = async () => {
    if (!activeJob) return;

    if (!activeJob.source.host || !activeJob.source.database || !activeJob.source.table ||
      !activeJob.sink.host || !activeJob.sink.database || !activeJob.sink.table) {
      toast({
        title: t('common.incompleteConfiguration'),
        description: t('common.pleaseFullyConfigureSourc'),
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      let sourceColumns: ColumnInfo[] = [];
      let sinkColumns: ColumnInfo[] = [];

      if (isTauri) {
        try {
          const sourceConnStr = `mysql://${activeJob.source.user}:${activeJob.source.password || ''}@${activeJob.source.host}:${activeJob.source.port}`;
          const sourceTableDetail = await invoke<TableDetail>('db_get_table_schema', {
            id: sourceConnStr,
            db: activeJob.source.database,
            table: activeJob.source.table
          });
          sourceColumns = sourceTableDetail.columns;
        } catch (e) {
          console.error('Source Schema Error:', e);
          throw new Error(t('common.failedToFetchSourceSchema', { table: activeJob.source.table }));
        }

        try {
          const sinkConnStr = `mysql://${activeJob.sink.user}:${activeJob.sink.password || ''}@${activeJob.sink.host}:${activeJob.sink.port}`;
          const sinkTableDetail = await invoke<TableDetail>('db_get_table_schema', {
            id: sinkConnStr,
            db: activeJob.sink.database,
            table: activeJob.sink.table
          });
          sinkColumns = sinkTableDetail.columns;
        } catch (e) {
          console.error('Sink Schema Error:', e);
          throw new Error(t('common.failedToFetchSinkSchemaAc', { table: activeJob.sink.table }));
        }
      } else {
        sourceColumns = [
          { name: 'id', type: 'int', isPrimaryKey: true, nullable: false, comment: '' },
          { name: 'name', type: 'varchar', isPrimaryKey: false, nullable: true, comment: '' }
        ];
        sinkColumns = [
          { name: 'id', type: 'int', isPrimaryKey: true, nullable: false, comment: '' },
          { name: 'name', type: 'varchar', isPrimaryKey: false, nullable: true, comment: '' }
        ];
      }

      const config = generateConfig(activeJob.source, activeJob.sink, sourceColumns, sinkColumns);
      setGeneratedConfig(config);

    } catch (error: any) {
      toast({
        title: t('common.generationFailed'),
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
      console.error('Generate config error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    jobs, setJobs, saveJobs,
    activeJob, setActiveJob,
    showSelector, setShowSelector,
    selectingFor, setSelectingFor,
    generatedConfig, setGeneratedConfig,
    isGenerating, setIsGenerating,
    sourceDbs, setSourceDbs,
    sinkDbs, setSinkDbs,
    sourceTables, setSourceTables,
    sinkTables, setSinkTables,
    sourceTableSearch, setSourceTableSearch,
    sinkTableSearch, setSinkTableSearch,
    isSourceLoadingDbs, setIsSourceLoadingDbs,
    isSinkLoadingDbs, setIsSinkLoadingDbs,
    isSourceLoadingTables, setIsSourceLoadingTables,
    isSinkLoadingTables, setIsSinkLoadingTables,
    confirmDelete, setConfirmDelete,
    engines, setEngines,
    selectedEngineId, setSelectedEngineId,
    isSubmitting, setIsSubmitting,
    configPanelHeight, setConfigPanelHeight,
    isConfigEditing, setIsConfigEditing,
    editingConfig, setEditingConfig,
    exitConfirmModal, setExitConfirmModal,
    
    // Actions
    loadDatabases, loadTables, updateJobDetails,
    handleSelectDataSource, handleCreateJob, handleDeleteJob,
    confirmDeleteJob, handleBackClick, handleGenerateConfig
  };
}
