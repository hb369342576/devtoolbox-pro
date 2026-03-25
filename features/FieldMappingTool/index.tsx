import React, { useState } from 'react';
import { DbConnection } from '../../types';
import { useFieldMappingStore } from './store';
import { ToastProvider } from '../common/Toast';
import { MappingProjectList } from './components/MappingProjectList';
import { MappingEditorView } from './components/MappingEditorView';

export const FieldMappingTool: React.FC<{
   connections: DbConnection[];
   onNavigate: (id: string) => void;
}> = ({ connections, onNavigate }) => {
   // Zustand Store
   const activeProfile = useFieldMappingStore((state) => state.activeProfile);
   const profiles = useFieldMappingStore((state) => state.profiles);
   const setActiveProfile = useFieldMappingStore((state) => state.setActiveProfile);
   const addProfile = useFieldMappingStore((state) => state.addProfile);
   const deleteProfile = useFieldMappingStore((state) => state.deleteProfile);
   
   const draggedItem = useFieldMappingStore((state) => state.draggedItem);
   const setDraggedItem = useFieldMappingStore((state) => state.setDraggedItem);
   const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

   const handleGlobalMouseMove = (e: React.MouseEvent) => {
      if (draggedItem) {
         setMousePos({ x: e.clientX, y: e.clientY });
      }
   };

   const handleGlobalMouseUp = () => {
      if (draggedItem) {
         setDraggedItem(null);
      }
   };

   return (
      <ToastProvider>
         <div
            className="flex flex-col h-full overflow-hidden relative"
            onMouseMove={handleGlobalMouseMove}
            onMouseUp={handleGlobalMouseUp}
         >
            {!activeProfile ? (
               <div className="h-full"> 
                   <MappingProjectList 
                      profiles={profiles}
                      setActiveProfile={setActiveProfile}
                      addProfile={addProfile}
                      deleteProfile={deleteProfile}
                   />
               </div>
            ) : (
               <MappingEditorView connections={connections} />
            )}

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