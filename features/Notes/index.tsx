
import React, { useState, useEffect } from 'react';
import { 
  StickyNote, Plus, Search, Trash2, Edit, Save, 
  Eye, FileCode, Folder, Hash, Calendar, X 
} from 'lucide-react';
import { Language, Note } from '../../types';

/* --- Simple Markdown Renderer --- */
// Renders text with basic markdown support: **bold**, # Header, and ```code``` blocks
const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <div className="text-slate-400 italic">Empty note...</div>;

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code Block
          const rawCode = part.slice(3, -3).trim(); // Remove backticks
          // Extract language if present (e.g., ```java)
          let lang = 'text';
          let code = rawCode;
          const firstLineBreak = rawCode.indexOf('\n');
          if (firstLineBreak > -1 && firstLineBreak < 20) {
             const potentialLang = rawCode.substring(0, firstLineBreak).trim();
             if (/^[a-zA-Z0-9]+$/.test(potentialLang)) {
                lang = potentialLang;
                code = rawCode.substring(firstLineBreak + 1);
             }
          }

          return (
            <div key={idx} className="relative group rounded-lg overflow-hidden my-4 border border-slate-200 dark:border-slate-700 bg-slate-900">
               <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-400 select-none">
                  <span className="uppercase font-bold">{lang}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="hover:text-white transition-colors"
                  >
                    Copy
                  </button>
               </div>
               <pre className="p-4 overflow-x-auto text-slate-300 font-mono text-sm">
                 <code>{code}</code>
               </pre>
            </div>
          );
        } else {
          // Regular Text (support Headers and Bold)
          return (
            <div key={idx} className="whitespace-pre-wrap">
               {part.split('\n').map((line, lineIdx) => {
                  if (line.startsWith('# ')) return <h1 key={lineIdx} className="text-2xl font-bold mb-2 mt-4 text-slate-900 dark:text-white">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={lineIdx} className="text-xl font-bold mb-2 mt-3 text-slate-800 dark:text-slate-100">{line.slice(3)}</h2>;
                  if (line.startsWith('- ')) return <li key={lineIdx} className="ml-4 list-disc">{line.slice(2)}</li>;
                  return <p key={lineIdx} className="mb-1">{line}</p>;
               })}
            </div>
          );
        }
      })}
    </div>
  );
};

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'SQL Snippets for Data Cleaning',
    content: "Here are some useful SQL snippets.\n\n# Remove Duplicates\n```sql\nDELETE t1 FROM users t1\nINNER JOIN users t2 \nWHERE \n    t1.id < t2.id AND \n    t1.email = t2.email;\n```\n\n# Timestamp Conversion\n```sql\nSELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date_str \nFROM orders;\n```",
    folder: 'Snippets',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: '2',
    title: 'Project Ideas 2024',
    content: "# DevToolbox Features\n- [x] Database Viewer\n- [x] Excel to SQL\n- [ ] Kafka Client\n\nNeed to look into Tauri v2 update migration guide.",
    folder: 'Ideas',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  }
];

export const Notes: React.FC<{ lang: Language }> = ({ lang }) => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('user_notes');
    return saved ? JSON.parse(saved) : MOCK_NOTES;
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFolder, setEditFolder] = useState<'General'|'Snippets'|'Ideas'>('General');

  useEffect(() => {
    localStorage.setItem('user_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (activeNoteId) {
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditFolder(note.folder);
        // If it's a new empty note, go to edit mode automatically
        if (note.title === '' && note.content === '') {
            setEditMode(true);
        } else {
            setEditMode(false);
        }
      }
    }
  }, [activeNoteId]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      folder: 'General',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setEditMode(true);
  };

  const handleSave = () => {
    if (!activeNoteId) return;
    const titleToSave = editTitle.trim() || (lang === 'zh' ? '未命名笔记' : 'Untitled Note');
    
    setNotes(prev => prev.map(n => 
      n.id === activeNoteId 
        ? { ...n, title: titleToSave, content: editContent, folder: editFolder, updatedAt: Date.now() } 
        : n
    ));
    setEditMode(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(lang === 'zh' ? '确定删除此笔记吗？' : 'Delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar List */}
      <div className="w-64 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shrink-0">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                  <StickyNote className="mr-2 text-amber-500" size={18} />
                  {lang === 'zh' ? '我的笔记' : 'My Notes'}
               </h3>
               <button onClick={handleCreate} className="p-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg transition-colors">
                  <Plus size={18} />
               </button>
            </div>
            <div className="relative">
               <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors dark:text-white"
                 placeholder={lang === 'zh' ? '搜索笔记...' : 'Search...'}
               />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.length === 0 ? (
               <div className="text-center py-8 text-slate-400 text-xs">{lang === 'zh' ? '无笔记' : 'No notes'}</div>
            ) : (
               filteredNotes.map(note => (
                 <div 
                   key={note.id} 
                   onClick={() => setActiveNoteId(note.id)}
                   className={`group relative p-3 rounded-lg cursor-pointer transition-all ${activeNoteId === note.id ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'}`}
                 >
                    <h4 className={`text-sm font-bold mb-1 truncate ${activeNoteId === note.id ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                       {note.title || (lang === 'zh' ? '未命名笔记' : 'Untitled')}
                    </h4>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                       <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                       <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px]">{note.folder}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(note.id, e)}
                      className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                       <Trash2 size={14} />
                    </button>
                 </div>
               ))
            )}
         </div>
      </div>

      {/* Main Editor/Preview */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
         {activeNote ? (
           <>
             {/* Toolbar */}
             <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center px-6 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center space-x-3 text-sm text-slate-500">
                   <Folder size={16} />
                   {editMode ? (
                      <select 
                        value={editFolder} 
                        onChange={(e) => setEditFolder(e.target.value as any)}
                        className="bg-transparent border-none outline-none font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-2 py-1"
                      >
                         <option value="General">General</option>
                         <option value="Snippets">Snippets</option>
                         <option value="Ideas">Ideas</option>
                      </select>
                   ) : (
                      <span className="font-medium text-slate-700 dark:text-slate-300">{activeNote.folder}</span>
                   )}
                   <span className="text-slate-300">|</span>
                   <span className="text-xs">Last edited: {new Date(activeNote.updatedAt).toLocaleString()}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                   {editMode ? (
                     <>
                       <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                       <button onClick={handleSave} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center shadow-lg shadow-amber-500/20 transition-colors">
                          <Save size={16} className="mr-1.5" />
                          {lang === 'zh' ? '保存' : 'Save'}
                       </button>
                     </>
                   ) : (
                     <button onClick={() => setEditMode(true)} className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-amber-400 dark:hover:border-amber-500 rounded-lg text-sm font-medium flex items-center transition-all">
                        <Edit size={16} className="mr-1.5" />
                        {lang === 'zh' ? '编辑' : 'Edit'}
                     </button>
                   )}
                </div>
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-8">
                   {editMode ? (
                     <div className="space-y-6">
                        <input 
                          type="text" 
                          value={editTitle} 
                          onChange={(e) => setEditTitle(e.target.value)} 
                          className="w-full text-3xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-amber-500 placeholder-slate-300 dark:placeholder-slate-600 text-slate-900 dark:text-white pb-2 transition-colors"
                          placeholder={lang === 'zh' ? '笔记标题' : 'Note Title'}
                        />
                        <div className="relative">
                           <textarea 
                             value={editContent}
                             onChange={(e) => setEditContent(e.target.value)}
                             className="w-full h-[calc(100vh-300px)] resize-none bg-slate-50 dark:bg-slate-900 rounded-xl p-6 font-mono text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500/50 border border-transparent focus:border-amber-500 transition-all leading-relaxed"
                             placeholder="# Markdown Supported\n\n```sql\nSELECT * FROM table;\n```"
                           />
                           <div className="absolute top-4 right-4 flex items-center space-x-2 pointer-events-none opacity-50">
                              <FileCode size={16} className="text-slate-400" />
                              <span className="text-xs text-slate-400">Markdown</span>
                           </div>
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700">
                           {activeNote.title || (lang === 'zh' ? '未命名笔记' : 'Untitled Note')}
                        </h1>
                        <MarkdownPreview content={activeNote.content} />
                     </div>
                   )}
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                 <StickyNote size={40} className="opacity-50" />
              </div>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                 {lang === 'zh' ? '选择或创建一个笔记' : 'Select or create a note'}
              </p>
              <button onClick={handleCreate} className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-amber-500/20">
                 {lang === 'zh' ? '创建笔记' : 'Create Note'}
              </button>
           </div>
         )}
      </div>
    </div>
  );
};
