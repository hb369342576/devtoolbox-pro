import React, { useState } from 'react';
import {
   ArrowRightLeft, Plus, Save, Trash2, ChevronLeft, Play, Upload, FileJson
} from 'lucide-react';
import { Language, DbConnection, CanvasNode } from '../../types';
import { useFieldMappingStore } from './store';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ViewModeToggle } from '../../components/shared/ViewModeToggle';
import { useViewMode } from '../../store/globalStore';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { MappingModal } from './components/MappingModal';
import { NodeConfigModal } from './components/NodeConfigModal';
import { PathSelectModal } from './components/PathSelectModal';
import { ToastProvider, useToast } from '../../components/ui/Toast';
import { Tooltip } from '../../components/ui/Tooltip';
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
   lang: Language;
   connections: DbConnection[];
   onNavigate: (id: string) => void;
}> = ({ lang, connections, onNavigate }) => {
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
         name: lang === 'zh' ? '新映射项目' : 'New Project',
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
               title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
               message={lang === 'zh' ? '确定要删除这个映射项目吗？' : 'Are you sure you want to delete this mapping project?'}
               confirmText={lang === 'zh' ? '删除' : 'Delete'}
               cancelText={lang === 'zh' ? '取消' : 'Cancel'}
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
                  {lang === 'zh' ? '可视化数据映射' : 'Visual Mapping'}
               </h2>
               <div className="flex items-center space-x-3">
                  <ViewModeToggle />
                  <button
                     onClick={handleNewProfile}
                     className="min-w-[140px] px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
                  >
                     <Plus size={18} className="mr-2" />
                     {lang === 'zh' ? '新建项目' : 'New Project'}
                  </button>
               </div>
            </div>

            {/* Profile Grid */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
               {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                     {profiles.map((profile) => (
                        <Tooltip key={profile.id} content={profile.name} position="top">
                           <div
                              onClick={() => setActiveProfile(profile)}
                              className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px]"
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
                                    <span>{profile.nodes?.length || 0} {lang === 'zh' ? '个节点' : 'nodes'}</span>
                                    <span>{new Date(profile.updatedAt).toLocaleString()}</span>
                                 </div>
                              </div>
                           </div>
                        </Tooltip>
                     ))}

                     {/* New Card */}
                     <div
                        onClick={handleNewProfile}
                        className="group p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                     >
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                           <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                           {lang === 'zh' ? '新建项目' : 'New Project'}
                        </span>
                     </div>
                  </div>
               ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                     <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b dark:border-slate-700 font-bold text-xs text-slate-500 uppercase sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                        <div className="col-span-8">{lang === 'zh' ? '项目名称' : 'Name'}</div>
                        <div className="col-span-2">{lang === 'zh' ? '更新时间' : 'Updated'}</div>
                        <div className="col-span-2 text-right">{lang === 'zh' ? '操作' : 'Action'}</div>
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
               title: lang === 'zh' ? '生成成功' : 'Generated',
               description: lang === 'zh' ? '配置文件已生成' : 'Configuration generated',
               variant: 'success'
            });
         } catch (err: any) {
            toast({
               title: lang === 'zh' ? '生成失败' : 'Generate Failed',
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
                  title: lang === 'zh' ? '提交成功' : 'Submit Success',
                  description: `Job ID: ${result.data}`,
                  variant: 'success'
               });
            } else {
               toast({
                  title: lang === 'zh' ? '提交失败' : 'Submit Failed',
                  description: result.error,
                  variant: 'destructive'
               });
            }
         } catch (err: any) {
            toast({
               title: lang === 'zh' ? '提交失败' : 'Submit Failed',
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
                     placeholder={lang === 'zh' ? '任务名称' : 'Task Name'}
                  />
                  <button 
                     onClick={() => {
                        useFieldMappingStore.getState().saveCurrentProfile();
                        toast({ title: lang === 'zh' ? '保存成功' : 'Saved', variant: 'success' });
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
                     <option value="">{lang === 'zh' ? '-- 选择项目 --' : '-- Select Project --'}</option>
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
                     {isGenerating ? (lang === 'zh' ? '生成中...' : 'Generating...') : (lang === 'zh' ? '生成配置' : 'Generate')}
                  </button>
                  <button
                     onClick={handleSubmit}
                     disabled={!generatedConfig || !selectedEngineId || isSubmitting}
                     className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Upload size={14} className="mr-1.5" />
                     {isSubmitting ? (lang === 'zh' ? '提交中...' : 'Submitting...') : (lang === 'zh' ? '提交作业' : 'Submit')}
                  </button>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 min-h-[200px] overflow-hidden relative">
               <Canvas lang={lang} connections={connections} />
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
                  <span className="text-xs text-slate-400 font-mono">{lang === 'zh' ? '配置文件' : 'Configuration'}</span>
                  <div className="flex items-center space-x-3">
                     <button
                        onClick={() => {
                           if (generatedConfig) {
                              try {
                                 const convertResult = convertToJson(generatedConfig);
                                 if (convertResult.error) throw new Error(convertResult.error);
                                 setGeneratedConfig(convertResult.json);
                                 toast({ title: lang === 'zh' ? '已转换为 JSON' : 'Converted to JSON', variant: 'success' });
                              } catch (err: any) {
                                 toast({ title: lang === 'zh' ? '转换失败' : 'Convert Failed', description: err.message, variant: 'destructive' });
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
                              toast({ title: lang === 'zh' ? '已复制' : 'Copied', variant: 'success' });
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
                     <span className="text-slate-500"># {lang === 'zh' ? '点击"生成配置"按钮预览配置文件...' : 'Click "Generate" to preview configuration...'}</span>
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
                     placeholder={lang === 'zh' ? '任务名称' : 'Task Name'}
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
                     <option value="">{lang === 'zh' ? '-- 选择项目 --' : '-- Select Project --'}</option>
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
                              alert(lang === 'zh' 
                                 ? '未找到完整的 Source → Sink 路径，请确保节点已正确连接' 
                                 : 'No complete Source → Sink path found');
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
                     {lang === 'zh' ? '生成配置' : 'Generate'}
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
                     {isSubmitting ? (lang === 'zh' ? '提交中...' : 'Submitting...') : (lang === 'zh' ? '提交作业' : 'Submit')}
                  </button>
               </div>
            </div>

            {/* 下方内容区 */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
               {/* 左侧节点面板 */}
               <Sidebar lang={lang} />

               {/* 右侧画布 + 配置 */}
               <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* 画布 */}
                  <div className="flex-1 min-h-[200px] overflow-hidden relative">
                     <Canvas lang={lang} connections={connections} onNodeClick={(node) => setNodeConfigModal({ isOpen: true, node })} />
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
                           {lang === 'zh' ? '配置文件' : 'Configuration'}
                           {isConfigEditing && <span className="ml-2 text-amber-400">(编辑中)</span>}
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
                                    <Save size={12} className="mr-1" /> {lang === 'zh' ? '保存' : 'Save'}
                                 </button>
                                 <button
                                    onClick={() => {
                                       setEditingConfig(generatedConfig);
                                       setIsConfigEditing(false);
                                    }}
                                    className="text-xs text-slate-400 hover:text-white"
                                 >
                                    {lang === 'zh' ? '取消' : 'Cancel'}
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
                                    {lang === 'zh' ? '编辑' : 'Edit'}
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
                           <span className="p-3 text-slate-500 block">#{lang === 'zh' ? ' 点击"生成配置"按钮预览配置文件...' : ' Click "Generate" to preview...'}</span>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <MappingModal lang={lang} />

            <NodeConfigModal
               isOpen={nodeConfigModal.isOpen}
               onClose={() => setNodeConfigModal({ isOpen: false, node: null })}
               node={nodeConfigModal.node}
               lang={lang}
               connections={connections}
            />

            <PathSelectModal
               isOpen={pathSelectModal.isOpen}
               onClose={() => setPathSelectModal({ isOpen: false, paths: [] })}
               paths={pathSelectModal.paths}
               lang={lang}
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
               title={lang === 'zh' ? '退出确认' : 'Confirm Exit'}
               message={lang === 'zh' 
                  ? '是否保存当前项目后退出？' 
                  : 'Save current project before exit?'}
               confirmText={lang === 'zh' ? '保存并退出' : 'Save & Exit'}
               cancelText={lang === 'zh' ? '不保存' : 'Discard'}
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