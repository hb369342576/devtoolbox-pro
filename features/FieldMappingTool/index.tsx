import React, { useState } from 'react';
import {
   ArrowRightLeft, Plus, Save, Trash2, ChevronLeft, Play, Upload, FileJson
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DbConnection, CanvasNode } from '../../types';
import { useFieldMappingStore } from './store';
import { ConfirmModal } from '../common/ConfirmModal';
import { useViewMode } from '../../store/globalStore';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { MappingModal } from './components/MappingModal';
import { NodeConfigModal } from './components/NodeConfigModal';
import { PathSelectModal } from './components/PathSelectModal';
import { ToastProvider, useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { ViewModeToggle } from '../common/ViewModeToggle';
import { SeaTunnelEngineConfig } from '../SeaTunnelManager/types';
import { seaTunnelApi } from '../SeaTunnelManager/api';
import { convertToJson } from '../../utils/hoconParser';
import { generateMappingConfig, detectCompletePaths, generateConfigForPath } from './utils/configGenerator';

/**
 * FieldMappingTool - 可视化字段映射工具
 * 
 * 重构后：应用Zustand状态管理
 * 原文件：667行 -> 现在：~200行（主文件） + 子组件
 */
export const FieldMappingTool: React.FC<{
   connections: DbConnection[];
   onNavigate: (id: string) => void;
}> = ({ connections, onNavigate }) => {
   const { t } = useTranslation();
   // Zustand Store（状态管理）
   const profiles = useFieldMappingStore((state) => state.profiles);
   const activeProfile = useFieldMappingStore((state) => state.activeProfile);
   const viewMode = useViewMode(); // 使用全局viewMode
   const setActiveProfile = useFieldMappingStore((state) => state.setActiveProfile);
   const addProfile = useFieldMappingStore((state) => state.addProfile);
   const deleteProfile = useFieldMappingStore((state) => state.deleteProfile);

   // Custom Drag-and-Drop Hooks
   const draggedItem = useFieldMappingStore((state) => state.draggedItem);
   const setDraggedItem = useFieldMappingStore((state) => state.setDraggedItem);
   const addNode = useFieldMappingStore((state) => state.addNode);
   const nodes = useFieldMappingStore((state) => state.nodes);
   const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

   // 本地UI状态
   const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; profileId: string }>({
      isOpen: false,
      profileId: ''
   });

   // SeaTunnel 引擎和配置状态
   const [engines] = useState<SeaTunnelEngineConfig[]>(() => {
      const saved = localStorage.getItem('seatunnel_engine_configs');
      return saved ? JSON.parse(saved) : [];
   });
   const [selectedEngineId, setSelectedEngineId] = useState<string>(() => {
      return localStorage.getItem('field_mapping_selected_engine') || '';
   });
   const [generatedConfig, setGeneratedConfig] = useState<string>(() => {
      // 从 activeProfile 恢复配置（如果有）
      return activeProfile?.generatedConfig || '';
   });
   const [isGenerating, setIsGenerating] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [configPanelHeight, setConfigPanelHeight] = useState(200);
   const links = useFieldMappingStore((state) => state.links);

   // 节点配置弹窗状态
   const [nodeConfigModal, setNodeConfigModal] = useState<{ isOpen: boolean; node: CanvasNode | null }>({
      isOpen: false,
      node: null
   });

   // 路径选择弹窗状态
   const [pathSelectModal, setPathSelectModal] = useState<{
      isOpen: boolean;
      paths: { id: string; label: string }[];
   }>({
      isOpen: false,
      paths: []
   });

   // 退出确认弹窗状态
   const [exitConfirmModal, setExitConfirmModal] = useState(false);

   // 配置文件编辑模式
   const [isConfigEditing, setIsConfigEditing] = useState(false);
   const [editingConfig, setEditingConfig] = useState('');

   // 同步 selectedEngineId 到 localStorage
   React.useEffect(() => {
      if (selectedEngineId) {
         localStorage.setItem('field_mapping_selected_engine', selectedEngineId);
      }
   }, [selectedEngineId]);

   // 同步 generatedConfig 到 activeProfile
   React.useEffect(() => {
      if (activeProfile && generatedConfig !== activeProfile.generatedConfig) {
         useFieldMappingStore.getState().updateActiveProfile({ generatedConfig });
      }
   }, [generatedConfig, activeProfile]);

   // 切换 activeProfile 时恢复 generatedConfig
   React.useEffect(() => {
      setGeneratedConfig(activeProfile?.generatedConfig || '');
   }, [activeProfile?.id]);

   // 处理函数
   const handleNewProfile = () => {
      const newProfile = {
         id: Date.now().toString(),
         name: t('fieldMapping.newProject'),
         updatedAt: Date.now(),
         nodes: [],
         links: []
      };
      addProfile(newProfile);
      setActiveProfile(newProfile);
   };

   const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmDelete({ isOpen: true, profileId: id });
   };

   // Custom Drag-and-Drop Handlers
   const handleGlobalMouseMove = (e: React.MouseEvent) => {
      if (draggedItem) {
         setMousePos({ x: e.clientX, y: e.clientY });
      }
   };

   const handleGlobalMouseUp = async () => {
      if (draggedItem) {
         setDraggedItem(null);
      }
   };

   // 项目列表视图
   if (!activeProfile) {
      return (
         <div className="h-full flex flex-col">
            <ConfirmModal
               isOpen={confirmDelete.isOpen}
               title={t('common.confirmDelete')}
               message={t('fieldMapping.deleteConfirm')}
               confirmText={t('common.delete')}
               cancelText={t('common.cancel')}
               onConfirm={() => {
                  deleteProfile(confirmDelete.profileId);
                  setConfirmDelete({ isOpen: false, profileId: '' });
               }}
               onCancel={() => setConfirmDelete({ isOpen: false, profileId: '' })}
               type="danger"
            />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold dark:text-white flex items-center">
                  <ArrowRightLeft className="mr-3 text-indigo-600" />
                  {t('fieldMapping.title')}
               </h2>
               <div className="flex items-center space-x-3">
                  <ViewModeToggle />
                  <button
                     onClick={handleNewProfile}
                     className="min-w-[140px] px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
                  >
                     <Plus size={18} className="mr-2" />
                     {t('fieldMapping.newProject')}
                  </button>
               </div>
            </div>

            {/* Profile Grid */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
               {viewMode === 'grid' ? (
                  <div className="flex flex-wrap gap-6 pt-2">
                     {profiles.map((profile) => (
                        <Tooltip key={profile.id} content={profile.name} position="top">
                           <div
                              onClick={() => setActiveProfile(profile)}
                              className="w-[288px] h-[200px] flex-shrink-0 flex flex-col group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                           >
                              {/* Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/30 to-transparent dark:from-purple-900/20 dark:via-pink-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                              <div className="relative z-10">
                                 <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 group-hover:scale-110 transition-transform duration-300">
                                       <ArrowRightLeft size={24} />
                                    </div>
                                    <button
                                       onClick={(e) => handleDeleteProfile(profile.id, e)}
                                       className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                                 <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {profile.name}
                                 </h3>
                                 <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{profile.nodes?.length || 0} {t('fieldMapping.nodesCount')}</span>
                                    <span>{new Date(profile.updatedAt).toLocaleString()}</span>
                                 </div>
                              </div>
                           </div>
                        </Tooltip>
                     ))}

                     {/* New Card */}
                     <div
                        onClick={handleNewProfile}
                        className="w-[288px] h-[200px] flex-shrink-0 group p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center"
                     >
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                           <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                           {t('fieldMapping.newProject')}
                        </span>
                     </div>
                  </div>
               ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                     <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b dark:border-slate-700 font-bold text-xs text-slate-500 uppercase sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                        <div className="col-span-8">{t('fieldMapping.projectName')}</div>
                        <div className="col-span-2">{t('fieldMapping.updateTime')}</div>
                        <div className="col-span-2 text-right">{t('common.actions')}</div>
                     </div>
                     <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {profiles.map(p => (
                           <div
                              key={p.id}
                              onClick={() => setActiveProfile(p)}
                              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer items-center"
                           >
                              <div className="col-span-8 font-medium dark:text-white flex items-center">
                                 <ArrowRightLeft size={16} className="mr-3 text-indigo-500" />
                                 {p.name}
                              </div>
                              <div className="col-span-2 text-xs text-slate-500">
                                 {new Date(p.updatedAt).toLocaleDateString()}
                              </div>
                              <div className="col-span-2 text-right">
                                 <button
                                    onClick={(e) => handleDeleteProfile(p.id, e)}
                                    className="text-slate-400 hover:text-red-500"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }


   // 内部组件：EditorView
   const EditorView = () => {
      const { toast } = useToast();

      const handleGenerateConfig = async () => {
         setIsGenerating(true);
         try {
            const config = generateMappingConfig(
               nodes,
               links,
               activeProfile?.sideConfig || {},
               connections
            );
            setGeneratedConfig(config);
            toast({
               title: t('fieldMapping.configGenerated'),
               description: t('fieldMapping.configGenerated'),
               variant: 'success'
            });
         } catch (err: any) {
            toast({
               title: t('fieldMapping.generateFailed'),
               description: err.message,
               variant: 'destructive'
            });
         } finally {
            setIsGenerating(false);
         }
      };

      const handleSubmit = async () => {
         if (!generatedConfig || !selectedEngineId) return;
         const engine = engines.find(e => e.id === selectedEngineId);
         if (!engine) return;

         setIsSubmitting(true);
         try {
            const convertResult = convertToJson(generatedConfig);
            if (convertResult.error) {
               throw new Error(convertResult.error);
            }
            const result = await seaTunnelApi.submitJob(engine, {
               jobName: activeProfile?.name || 'Mapping Job',
               config: convertResult.json
            });
            if (result.success) {
               toast({
                  title: t('fieldMapping.submitSuccess'),
                  description: `Job ID: ${result.data}`,
                  variant: 'success'
               });
            } else {
               toast({
                  title: t('fieldMapping.submitFailed'),
                  description: result.error,
                  variant: 'destructive'
               });
            }
         } catch (err: any) {
            toast({
               title: t('fieldMapping.submitFailed'),
               description: err.message,
               variant: 'destructive'
            });
         } finally {
            setIsSubmitting(false);
         }
      };

      return (
         <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar */}
            <div className="h-12 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
               {/* Left: Back, Name, Save */}
               <div className="flex items-center space-x-2">
                  <button 
                     onClick={() => setActiveProfile(null)} 
                     className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                  >
                     <ChevronLeft size={18} />
                  </button>
                  <input
                     value={activeProfile?.name || ''}
                     onChange={e => {
                        if (activeProfile) {
                           useFieldMappingStore.getState().updateActiveProfile({ name: e.target.value });
                        }
                     }}
                     className="font-medium text-sm text-slate-700 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors max-w-[150px]"
                     placeholder={t('fieldMapping.taskName')}
                  />
                  <button 
                     onClick={() => {
                        useFieldMappingStore.getState().saveCurrentProfile();
                        toast({ title: t('common.saveSuccess'), variant: 'success' });
                     }} 
                     className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                     <Save size={16} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
                  <select
                     value={selectedEngineId}
                     onChange={(e) => setSelectedEngineId(e.target.value)}
                     className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none"
                  >
                     <option value="">{t('fieldMapping.selectProject')}</option>
                     {engines.filter(e => e.engineType === 'zeta').map(engine => (
                        <option key={engine.id} value={engine.id}>{engine.name}</option>
                     ))}
                  </select>
               </div>
               {/* Right: Generate, Submit */}
               <div className="flex items-center space-x-2">
                  <button
                     onClick={handleGenerateConfig}
                     disabled={isGenerating || nodes.length === 0}
                     className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Play size={14} className="mr-1.5" />
                     {isGenerating ? t('fieldMapping.generating') : t('fieldMapping.generateConfig')}
                  </button>
                  <button
                     onClick={handleSubmit}
                     disabled={!generatedConfig || !selectedEngineId || isSubmitting}
                     className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Upload size={14} className="mr-1.5" />
                     {isSubmitting ? t('fieldMapping.submitting') : t('fieldMapping.submitJob')}
                  </button>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 min-h-[200px] overflow-hidden relative">
               <Canvas connections={connections} />
            </div>

            {/* Draggable Divider */}
            <div
               className="h-2 bg-slate-200 dark:bg-slate-700 cursor-ns-resize hover:bg-purple-400 dark:hover:bg-purple-600 transition-colors flex items-center justify-center flex-shrink-0"
               onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startHeight = configPanelHeight;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                     const delta = startY - moveEvent.clientY;
                     const newHeight = Math.max(100, Math.min(400, startHeight + delta));
                     setConfigPanelHeight(newHeight);
                  };
                  const onMouseUp = () => {
                     document.removeEventListener('mousemove', onMouseMove);
                     document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
               }}
            >
               <div className="w-8 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
            </div>

            {/* Config Panel */}
            <div className="bg-[#1e1e1e] rounded-t-lg overflow-hidden flex-shrink-0" style={{ height: configPanelHeight }}>
               <div className="h-8 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
                  <span className="text-xs text-slate-400 font-mono">{t('fieldMapping.configuration')}</span>
                  <div className="flex items-center space-x-3">
                     <button
                        onClick={() => {
                           if (generatedConfig) {
                              try {
                                 const convertResult = convertToJson(generatedConfig);
                                 if (convertResult.error) throw new Error(convertResult.error);
                                 setGeneratedConfig(convertResult.json);
                                 toast({ title: t('fieldMapping.convertedToJson'), variant: 'success' });
                              } catch (err: any) {
                                 toast({ title: t('fieldMapping.convertFailed'), description: err.message, variant: 'destructive' });
                              }
                           }
                        }}
                        disabled={!generatedConfig}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center disabled:opacity-30"
                     >
                        <FileJson size={12} className="mr-1" /> JSON
                     </button>
                     <button
                        onClick={() => {
                           if (generatedConfig) {
                              navigator.clipboard.writeText(generatedConfig);
                              toast({ title: t('common.copySuccess'), variant: 'success' });
                           }
                        }}
                        disabled={!generatedConfig}
                        className="text-xs text-slate-400 hover:text-white flex items-center disabled:opacity-30"
                     >
                        <Save size={12} className="mr-1" /> Copy
                     </button>
                  </div>
               </div>
               <div className="p-3 font-mono text-xs text-green-300 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 32px)' }}>
                  {generatedConfig ? (
                     <pre className="whitespace-pre-wrap">{generatedConfig}</pre>
                  ) : (
                     <span className="text-slate-500"># {t('fieldMapping.clickToPreview')}</span>
                  )}
               </div>
            </div>
         </div>
      );
   };

   // Listen for global mouse move for Ghost
   return (
      <ToastProvider>
         <div
            className="flex flex-col h-full overflow-hidden relative"
            onMouseMove={handleGlobalMouseMove}
            onMouseUp={handleGlobalMouseUp}
         >
            {/* 顶部工具栏 - 通长 */}
            <div className="h-12 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
               {/* Left: Back, Name, Save */}
               <div className="flex items-center space-x-2">
                  <button 
                     onClick={() => {
                        // 只有在有未保存的更改时才弹窗
                        if (useFieldMappingStore.getState().hasUnsavedChanges()) {
                           setExitConfirmModal(true);
                        } else {
                           setActiveProfile(null);
                        }
                     }} 
                     className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                  >
                     <ChevronLeft size={18} />
                  </button>
                  <input
                     value={activeProfile?.name || ''}
                     onChange={e => {
                        if (activeProfile) {
                           useFieldMappingStore.getState().updateActiveProfile({ name: e.target.value });
                        }
                     }}
                     className="font-medium text-sm text-slate-700 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 transition-colors max-w-[150px]"
                     placeholder={t('fieldMapping.taskName')}
                  />
                  <button 
                     onClick={() => {
                        useFieldMappingStore.getState().saveCurrentProfile();
                     }} 
                     className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                     <Save size={16} />
                  </button>
               </div>
               {/* Right: Project Select, Generate, Submit */}
               <div className="flex items-center space-x-2">
                  <select
                     value={selectedEngineId}
                     onChange={(e) => setSelectedEngineId(e.target.value)}
                     className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none"
                  >
                     <option value="">{t('fieldMapping.selectProject')}</option>
                     {engines.filter(e => e.engineType === 'zeta').map(engine => (
                        <option key={engine.id} value={engine.id}>{engine.name}</option>
                     ))}
                  </select>
                  <button
                     onClick={() => {
                        try {
                           // 先检测完整路径
                           const result = detectCompletePaths(nodes, links);
                           
                           if (result.errors.length > 0) {
                              alert(result.errors.join('\n'));
                              return;
                           }
                           
                           if (result.paths.length === 0) {
                              alert(t('fieldMapping.noPathFound'));
                              return;
                           }
                           
                           if (result.paths.length > 1) {
                              // 多条路径，弹出选择弹窗
                              setPathSelectModal({
                                 isOpen: true,
                                 paths: result.paths.map(p => ({ id: p.id, label: p.label }))
                              });
                              return;
                           }
                           
                           // 单条路径，直接生成
                           const config = generateConfigForPath(result.paths[0], connections);
                           setGeneratedConfig(config);
                        } catch (err: any) {
                           console.error(err);
                           alert(err.message);
                        }
                     }}
                     disabled={isGenerating || nodes.length === 0}
                     className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Play size={14} className="mr-1.5" />
                     {t('fieldMapping.generateConfig')}
                  </button>
                  <button
                     onClick={async () => {
                        if (!generatedConfig || !selectedEngineId) return;
                        const engine = engines.find(e => e.id === selectedEngineId);
                        if (!engine) return;
                        setIsSubmitting(true);
                        try {
                           const convertResult = convertToJson(generatedConfig);
                           if (convertResult.error) throw new Error(convertResult.error);
                           await seaTunnelApi.submitJob(engine, { jobName: activeProfile?.name || 'Job', config: convertResult.json });
                        } catch (err) {
                           console.error(err);
                        } finally {
                           setIsSubmitting(false);
                        }
                     }}
                     disabled={!generatedConfig || !selectedEngineId || isSubmitting}
                     className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Upload size={14} className="mr-1.5" />
                     {isSubmitting ? t('fieldMapping.submitting') : t('fieldMapping.submitJob')}
                  </button>
               </div>
            </div>

            {/* 下方内容区 */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
               {/* 左侧节点面板 */}
               <Sidebar />

               {/* 右侧画布 + 配置 */}
               <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* 画布 */}
                  <div className="flex-1 min-h-[200px] overflow-hidden relative">
                     <Canvas connections={connections} onNodeClick={(node) => setNodeConfigModal({ isOpen: true, node })} />
                  </div>

                  {/* 拖动分隔线 */}
                  <div
                     className="h-2 bg-slate-200 dark:bg-slate-700 cursor-ns-resize hover:bg-purple-400 dark:hover:bg-purple-600 transition-colors flex items-center justify-center flex-shrink-0"
                     onMouseDown={(e) => {
                        e.preventDefault();
                        const startY = e.clientY;
                        const startHeight = configPanelHeight;
                        const onMouseMove = (moveEvent: MouseEvent) => {
                           const delta = startY - moveEvent.clientY;
                           const newHeight = Math.max(100, Math.min(400, startHeight + delta));
                           setConfigPanelHeight(newHeight);
                        };
                        const onMouseUp = () => {
                           document.removeEventListener('mousemove', onMouseMove);
                           document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                     }}
                  >
                     <div className="w-8 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
                  </div>

                  {/* 配置面板 */}
                  <div className="bg-[#1e1e1e] rounded-t-lg overflow-hidden flex-shrink-0" style={{ height: configPanelHeight }}>
                     <div className="h-8 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4">
                        <span className="text-xs text-slate-400 font-mono">
                           {t('fieldMapping.configuration')}
                           {isConfigEditing && <span className="ml-2 text-amber-400">({t('fieldMapping.editing')})</span>}
                        </span>
                        <div className="flex items-center space-x-3">
                           {isConfigEditing ? (
                              <>
                                 <button
                                    onClick={() => {
                                       setGeneratedConfig(editingConfig);
                                       setIsConfigEditing(false);
                                    }}
                                    className="text-xs text-green-400 hover:text-green-300 flex items-center"
                                 >
                                    <Save size={12} className="mr-1" /> {t('common.save')}
                                 </button>
                                 <button
                                    onClick={() => {
                                       setEditingConfig(generatedConfig);
                                       setIsConfigEditing(false);
                                    }}
                                    className="text-xs text-slate-400 hover:text-white"
                                 >
                                    {t('common.cancel')}
                                 </button>
                              </>
                           ) : (
                              <>
                                 <button
                                    onClick={() => {
                                       setEditingConfig(generatedConfig);
                                       setIsConfigEditing(true);
                                    }}
                                    disabled={!generatedConfig}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center disabled:opacity-30"
                                 >
                                    {t('common.edit')}
                                 </button>
                                 <button
                                    onClick={() => {
                                       if (generatedConfig) {
                                          const r = convertToJson(generatedConfig);
                                          if (!r.error) setGeneratedConfig(r.json);
                                       }
                                    }}
                                    disabled={!generatedConfig}
                                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center disabled:opacity-30"
                                 >
                                    <FileJson size={12} className="mr-1" /> JSON
                                 </button>
                                 <button
                                    onClick={() => generatedConfig && navigator.clipboard.writeText(generatedConfig)}
                                    disabled={!generatedConfig}
                                    className="text-xs text-slate-400 hover:text-white flex items-center disabled:opacity-30"
                                 >
                                    <Save size={12} className="mr-1" /> Copy
                                 </button>
                              </>
                           )}
                        </div>
                     </div>
                     <div className="font-mono text-xs overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 32px)' }}>
                        {isConfigEditing ? (
                           <textarea
                              value={editingConfig}
                              onChange={(e) => setEditingConfig(e.target.value)}
                              className="w-full h-full p-3 bg-transparent text-green-300 resize-none outline-none"
                              spellCheck={false}
                           />
                        ) : generatedConfig ? (
                           <pre className="p-3 text-green-300 whitespace-pre-wrap">{generatedConfig}</pre>
                        ) : (
                           <span className="p-3 text-slate-500 block">#{t('fieldMapping.clickToPreview')}</span>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <MappingModal />

            <NodeConfigModal
               isOpen={nodeConfigModal.isOpen}
               onClose={() => setNodeConfigModal({ isOpen: false, node: null })}
               node={nodeConfigModal.node}

               connections={connections}
            />

            <PathSelectModal
               isOpen={pathSelectModal.isOpen}
               onClose={() => setPathSelectModal({ isOpen: false, paths: [] })}
               paths={pathSelectModal.paths}

               onSelect={(pathId) => {
                  try {
                     const result = detectCompletePaths(nodes, links);
                     const selectedPath = result.paths.find(p => p.id === pathId);
                     if (selectedPath) {
                        const config = generateConfigForPath(selectedPath, connections);
                        setGeneratedConfig(config);
                     }
                     setPathSelectModal({ isOpen: false, paths: [] });
                  } catch (err: any) {
                     console.error(err);
                     alert(err.message);
                  }
               }}
            />

            {/* 退出确认弹窗 */}
            <ConfirmModal
               isOpen={exitConfirmModal}
               title={t('fieldMapping.exitConfirm')}
               message={t('fieldMapping.saveAndExit')}
               confirmText={t('fieldMapping.saveThenExit')}
               cancelText={t('fieldMapping.discard')}
               type="info"
               onConfirm={() => {
                  useFieldMappingStore.getState().saveCurrentProfile();
                  setExitConfirmModal(false);
                  setActiveProfile(null);
               }}
               onCancel={() => {
                  setExitConfirmModal(false);
                  setActiveProfile(null);
               }}
            />

            {/* Ghost Drag Element */}
            {draggedItem && (
               <div
                  className="fixed pointer-events-none z-50 p-2 bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded shadow-2xl opacity-80 flex items-center"
                  style={{ left: mousePos.x + 10, top: mousePos.y + 10 }}
               >
                  <span className="font-bold text-sm dark:text-white">{draggedItem.table?.name || draggedItem.side}</span>
               </div>
            )}
         </div>
      </ToastProvider>
   );
};