import React from 'react';
import { DbConnection } from '../../types';
import { useSeatunnel } from './hooks/useSeatunnel';
import { DataSourceSelectorModal } from './components/DataSourceSelectorModal';
import { JobListView } from './components/JobListView';
import { JobEditorHeader } from './components/JobEditorHeader';
import { SourceSinkPanel } from './components/SourceSinkPanel';
import { ConfigPreview } from './components/ConfigPreview';
import { ConfirmModal } from '../common/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { seaTunnelApi } from '../SeaTunnelManager/api';
import { convertToJson } from '../../utils/hoconParser';
import { useToast } from '../common/Toast';

export const SeatunnelGen: React.FC<{
  connections: DbConnection[];
  onNavigate: (id: string) => void;
}> = ({ connections, onNavigate }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const seatunnel = useSeatunnel(connections);
  const {
    jobs, activeJob, generatedConfig, isGenerating,
    sourceDbs, sinkDbs, sourceTables, sinkTables,
    sourceTableSearch, setSourceTableSearch,
    sinkTableSearch, setSinkTableSearch,
    isSourceLoadingDbs, isSinkLoadingDbs,
    isSourceLoadingTables, isSinkLoadingTables,
    confirmDelete, engines, selectedEngineId, isSubmitting,
    configPanelHeight, setConfigPanelHeight,
    isConfigEditing, setIsConfigEditing,
    editingConfig, setEditingConfig,
    exitConfirmModal, setExitConfirmModal,
    showSelector, setShowSelector,
    
    updateJobDetails, handleSelectDataSource,
    handleCreateJob, handleDeleteJob, confirmDeleteJob,
    handleBackClick, handleGenerateConfig,
    setActiveJob, saveJobs
  } = seatunnel;

  const handleSubmit = async () => {
    if (!generatedConfig || !selectedEngineId) return;
    const engine = engines.find(e => e.id === selectedEngineId);
    if (!engine) return;
    
    seatunnel.setIsSubmitting(true);
    try {
      const convertResult = convertToJson(generatedConfig);
      if (convertResult.error) {
        throw new Error(convertResult.error);
      }
      const result = await seaTunnelApi.submitJob(engine, {
        jobName: activeJob!.name,
        config: convertResult.json
      });
      if (result.success) {
        toast({
          title: t('common.submitSuccess'),
          description: `Job ID: ${result.data}`,
          variant: 'success'
        });
      } else {
        toast({
          title: t('common.submitFailed'),
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({
        title: t('common.submitFailed'),
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      seatunnel.setIsSubmitting(false);
    }
  };

  if (!activeJob) {
    return (
      <JobListView
        jobs={jobs}
        onSelectJob={setActiveJob}
        onCreateJob={handleCreateJob}
        onDeleteJob={handleDeleteJob}
        confirmDelete={confirmDelete}
        onConfirmDelete={confirmDeleteJob}
        onCancelDelete={() => seatunnel.setConfirmDelete({ isOpen: false, jobId: '' })}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <DataSourceSelectorModal
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        connections={connections}
        onSelect={handleSelectDataSource}
        onNavigate={onNavigate}
      />

      <ConfirmModal
        isOpen={exitConfirmModal}
        title={t('common.confirmExit')}
        message={t('common.saveCurrentConfigurationB')}
        confirmText={t('common.saveExit')}
        cancelText={t('common.discard')}
        type="info"
        onConfirm={() => {
          const updatedJob = { ...activeJob, generatedConfig };
          saveJobs(jobs.map(j => j.id === activeJob.id ? updatedJob : j));
          setExitConfirmModal(false);
          setActiveJob(null);
        }}
        onCancel={() => {
          setExitConfirmModal(false);
          setActiveJob(null);
        }}
      />

      <JobEditorHeader
        activeJob={activeJob}
        onJobNameChange={(name) => {
          setActiveJob({ ...activeJob, name });
          saveJobs(jobs.map(j => j.id === activeJob.id ? { ...j, name } : j));
        }}
        onBackClick={handleBackClick}
        engines={engines}
        selectedEngineId={selectedEngineId}
        onEngineSelect={seatunnel.setSelectedEngineId}
        onGenerateConfig={handleGenerateConfig}
        onSubmit={handleSubmit}
        isGenerating={isGenerating}
        isSubmitting={isSubmitting}
        canGenerate={!!(activeJob.source.host && activeJob.sink.host)}
        canSubmit={!!generatedConfig && !!selectedEngineId}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <SourceSinkPanel
            type="source"
            activeJob={activeJob}
            connections={connections}
            dbs={sourceDbs}
            tables={sourceTables}
            tableSearch={sourceTableSearch}
            setTableSearch={setSourceTableSearch}
            isLoadingDbs={isSourceLoadingDbs}
            isLoadingTables={isSourceLoadingTables}
            onSelectConn={(id) => {
              const conn = connections.find(c => c.id === id);
              if (conn) {
                 handleSelectDataSource(conn, 'source');
                 setShowSelector(false); // Make sure modal state if used inside is handled, actually handleSelectDataSource handles setShowSelector(false);
                 // Wait, handleSelectDataSource handles `selectingFor` and uses modal.
                 // Actually the old code: `onChange={(e) => onSelectConn(...)}` triggers directly and passes connections!
                 // In the old code:
                 // onChange={(e) => { const conn = connections.find...; if(conn) handleSelectDataSource(conn, 'source'); }}
              }
            }}
            onChangeDb={(db) => {
              updateJobDetails('source', 'database', db);
              updateJobDetails('source', 'table', '');
              seatunnel.loadTables(activeJob.source, db, 'source');
            }}
            onSelectTable={(table) => updateJobDetails('source', 'table', table)}
          />

          <SourceSinkPanel
            type="sink"
            activeJob={activeJob}
            connections={connections}
            dbs={sinkDbs}
            tables={sinkTables}
            tableSearch={sinkTableSearch}
            setTableSearch={setSinkTableSearch}
            isLoadingDbs={isSinkLoadingDbs}
            isLoadingTables={isSinkLoadingTables}
            onSelectConn={(id) => {
              const conn = connections.find(c => c.id === id);
              if (conn) handleSelectDataSource(conn, 'sink');
            }}
            onChangeDb={(db) => {
              updateJobDetails('sink', 'database', db);
              updateJobDetails('sink', 'table', '');
              seatunnel.loadTables(activeJob.sink, db, 'sink');
            }}
            onSelectTable={(table) => updateJobDetails('sink', 'table', table)}
          />
        </div>

        <ConfigPreview
          configPanelHeight={configPanelHeight}
          setConfigPanelHeight={setConfigPanelHeight}
          isConfigEditing={isConfigEditing}
          setIsConfigEditing={setIsConfigEditing}
          generatedConfig={generatedConfig}
          setGeneratedConfig={seatunnel.setGeneratedConfig}
          editingConfig={editingConfig}
          setEditingConfig={setEditingConfig}
        />
      </div>
    </div>
  );
};