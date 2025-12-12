import React, { useState } from 'react';
import { GitCompare, Plus, Search } from 'lucide-react';
import { Language, DbConnection, CompareKey } from '../../types';
import { getTexts } from '../../locales';
import { SideConfig } from './types';
import { useConfigManager } from './hooks/useConfigManager';
import { useTableSelection } from './hooks/useTableSelection';
import { useComparison } from './hooks/useComparisonLogic';
import { ConfigList } from './components/ConfigList';
import { ConfigEditor } from './components/ConfigEditor';
import { ComparisonResult } from './components/ComparisonResult';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const DataCompareTool: React.FC<{
   lang: Language;
   connections?: DbConnection[];
}> = ({ lang, connections = [] }) => {
   // View state - DataCompareTool uses special 3-mode view (list|config|result)
   const [viewMode, setViewMode] = useState<'list' | 'config' | 'result'>('list');

   // Alert state
   const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });
   const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

   // Config state
   const [configName, setConfigName] = useState('');
   const [sourceConfig, setSourceConfig] = useState<SideConfig>({ connId: '', db: '', table: '' });
   const [targetConfig, setTargetConfig] = useState<SideConfig>({ connId: '', db: '', table: '' });
   const [primaryKeys, setPrimaryKeys] = useState<CompareKey[]>([]);
   const [filterCondition, setFilterCondition] = useState('');

   // Hooks
   const {
      savedConfigs,
      editingConfigId,
      createConfig,
      editConfig,
      saveConfig,
      deleteConfig
   } = useConfigManager();

   const {
      sourceDbs,
      targetDbs,
      filteredSourceTables,
      filteredTargetTables,
      sourceTableSearch,
      setSourceTableSearch,
      targetTableSearch,
      setTargetTableSearch
   } = useTableSelection(
      connections,
      sourceConfig,
      targetConfig,
      setSourceConfig,
      setTargetConfig
   );

   const {
      results,
      stats,
      isLoading,
      executeComparison
   } = useComparison();

   // Handlers
   const showAlert = (title: string, message: string) => {
      setAlertState({ isOpen: true, title, message });
   };

   const handleNewConfig = () => {
      setConfigName('');
      setSourceConfig({ connId: '', db: '', table: '' });
      setTargetConfig({ connId: '', db: '', table: '' });
      setPrimaryKeys([]);
      setFilterCondition('');
      createConfig();
      setViewMode('config');
   };

   const handleEditConfig = (config: any) => {
      setConfigName(config.name);
      setSourceConfig(config.sourceConfig);
      setTargetConfig(config.targetConfig);
      setPrimaryKeys(config.primaryKeys);
      setFilterCondition(config.filterCondition);
      editConfig(config);
      setViewMode('config');
   };

   const handleSaveConfig = () => {
      if (!configName.trim()) {
         showAlert(lang === 'zh' ? '错误' : 'Error', lang === 'zh' ? '请输入配置名称' : 'Please enter config name');
         return;
      }
      saveConfig({
         name: configName,
         sourceConfig,
         targetConfig,
         primaryKeys,
         filterCondition
      });
      setViewMode('list');
   };

   const handleCompare = async () => {
      if (!sourceConfig.table || !targetConfig.table || primaryKeys.length === 0 || !primaryKeys[0].field) {
         showAlert(lang === 'zh' ? '配置不完整' : 'Incomplete Config', lang === 'zh' ? '请选择源端表、目标端表并设置主键' : 'Please select source table, target table and set primary keys');
         return;
      }
      await executeComparison(sourceConfig.table, targetConfig.table, primaryKeys);
      setViewMode('result');
   };

   // Render views
   if (viewMode === 'list') {
      return (
         <>
            <ConfirmModal
               isOpen={alertState.isOpen}
               title={alertState.title}
               message={alertState.message}
               confirmText={lang === 'zh' ? '确定' : 'OK'}
               cancelText=""
               onConfirm={() => setAlertState({ isOpen: false, title: '', message: '' })}
               onCancel={() => setAlertState({ isOpen: false, title: '', message: '' })}
               type="danger"
            />
            <ConfigList
               lang={lang}
               configs={savedConfigs}
               onNew={handleNewConfig}
               onEdit={handleEditConfig}
               onDelete={deleteConfig}
               confirmDelete={confirmDelete}
               setConfirmDelete={setConfirmDelete}
            />
         </>
      );
   }

   if (viewMode === 'config') {
      return (
         <>
            <ConfirmModal
               isOpen={alertState.isOpen}
               title={alertState.title}
               message={alertState.message}
               confirmText={lang === 'zh' ? '确定' : 'OK'}
               cancelText=""
               onConfirm={() => setAlertState({ isOpen: false, title: '', message: '' })}
               onCancel={() => setAlertState({ isOpen: false, title: '', message: '' })}
               type="danger"
            />
            <ConfigEditor
               lang={lang}
               connections={connections}
               configName={configName}
               setConfigName={setConfigName}
               sourceConfig={sourceConfig}
               setSourceConfig={setSourceConfig}
               targetConfig={targetConfig}
               setTargetConfig={setTargetConfig}
               primaryKeys={primaryKeys}
               setPrimaryKeys={setPrimaryKeys}
               filterCondition={filterCondition}
               setFilterCondition={setFilterCondition}
               editingConfigId={editingConfigId}
               sourceDbs={sourceDbs}
               targetDbs={targetDbs}
               filteredSourceTables={filteredSourceTables}
               filteredTargetTables={filteredTargetTables}
               sourceTableSearch={sourceTableSearch}
               setSourceTableSearch={setSourceTableSearch}
               targetTableSearch={targetTableSearch}
               setTargetTableSearch={setTargetTableSearch}
               onSave={handleSaveConfig}
               onBack={() => setViewMode('list')}
               onCompare={handleCompare}
               isLoading={isLoading}
            />
         </>
      );
   }

   return (
      <ComparisonResult
         lang={lang}
         results={results}
         stats={stats}
         primaryKeys={primaryKeys}
         onBack={() => setViewMode('config')}
      />
   );
};