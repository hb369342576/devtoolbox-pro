
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, ChevronRight, Edit, Trash2, 
  ChevronLeft, Save, Filter, FolderOpen, Bot, Send, User, Sparkles
} from 'lucide-react';
import { Language, InterviewQuestion, QuestionCategory } from '../types';
import { INTERVIEW_CATEGORIES } from '../constants';

const MOCK_QUESTIONS: InterviewQuestion[] = [
  {
    id: '1',
    title: 'Flink 的反压机制 (Backpressure) 是如何实现的？',
    answer: 'Flink 的反压机制基于 Credit-based Flow Control。下游 TaskManager 会告诉上游它有多少 Buffer credit。如果下游处理慢，Credit 耗尽，上游就会停止发送数据，从而逐层向前传递反压，最终降低 Source 的读取速度。这避免了 OOM 并保证了系统的稳定性。',
    category: 'Flink',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: '2',
    title: 'Spark RDD, DataFrame 和 DataSet 的区别？',
    answer: '1. RDD: 弹性分布式数据集，是 Spark 最基本的抽象，类型安全但序列化开销大。\n2. DataFrame: 基于 Row 的分布式数据集，有 Schema 信息，Catalyst 优化器可以优化执行计划。\n3. DataSet: 强类型的 DataFrame，结合了 RDD 的类型安全和 Spark SQL 的优化引擎。',
    category: 'Spark',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: '3',
    title: 'Doris 的数据模型有哪些？',
    answer: 'Apache Doris 支持三种数据模型：\n1. Aggregate 模型：导入数据时自动聚合。\n2. Unique 模型：保留主键唯一性，新数据覆盖旧数据（Upsert）。\n3. Duplicate 模型：保留所有行，适合明细数据查询。',
    category: 'Doris',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export const InterviewQuestions: React.FC<{ lang: Language }> = ({ lang }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(() => {
    const saved = localStorage.getItem('interview_questions');
    return saved ? JSON.parse(saved) : MOCK_QUESTIONS;
  });

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit' | 'ai'>('list');
  const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestion | null>(null);
  const [editForm, setEditForm] = useState<Partial<InterviewQuestion>>({});

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: lang === 'zh' ? '你好！我是面试助手。你可以问我关于大数据技术的问题，我会从你的知识库中检索答案。' : 'Hello! I am your interview assistant. Ask me anything about Big Data, and I will search your knowledge base.', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('interview_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    if (viewMode === 'ai') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, viewMode]);

  // Filter Logic
  const filteredQuestions = questions.filter(q => {
    const matchCat = activeCategory === 'All' || q.category === activeCategory;
    const matchSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        q.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Handlers
  const handleAddNew = () => {
    setEditForm({
      category: activeCategory === 'All' ? 'Java' : (activeCategory as QuestionCategory),
      title: '',
      answer: ''
    });
    setSelectedQuestion(null);
    setViewMode('edit');
  };

  const handleEdit = (q: InterviewQuestion) => {
    setEditForm({ ...q });
    setViewMode('edit');
  };

  const handleViewDetail = (q: InterviewQuestion) => {
    setSelectedQuestion(q);
    setViewMode('detail');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(lang === 'zh' ? '确定删除此问题吗？' : 'Delete this question?')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (selectedQuestion?.id === id) {
        setViewMode('list');
      }
    }
  };

  const handleSave = () => {
    if (!editForm.title || !editForm.answer || !editForm.category) {
      alert(lang === 'zh' ? '请填写标题、分类和答案' : 'Please fill title, category and answer');
      return;
    }

    if (editForm.id) {
      // Update
      const updated: InterviewQuestion = {
        ...editForm as InterviewQuestion,
        updatedAt: Date.now()
      };
      setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
      setSelectedQuestion(updated);
      setViewMode('detail');
    } else {
      // Create
      const newQ: InterviewQuestion = {
        id: Date.now().toString(),
        title: editForm.title!,
        answer: editForm.answer!,
        category: editForm.category!,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setQuestions(prev => [newQ, ...prev]);
      setSelectedQuestion(newQ);
      setViewMode('detail');
    }
  };

  // AI Chat Logic
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Simulate AI Processing
    setTimeout(() => {
      // Simple Retrieval Logic (Keyword Matching)
      const keywords = userMsg.text.toLowerCase().split(' ').filter(k => k.length > 1);
      const matches = questions.filter(q => 
        keywords.some(k => q.title.toLowerCase().includes(k) || q.answer.toLowerCase().includes(k))
      );

      let aiText = '';
      if (matches.length > 0) {
        // Find best match or list top 3
        const topMatch = matches[0];
        aiText = lang === 'zh' 
          ? `我在知识库中找到了相关内容：\n\n**${topMatch.title}**\n${topMatch.answer}`
          : `I found something relevant in your knowledge base:\n\n**${topMatch.title}**\n${topMatch.answer}`;
      } else {
        aiText = lang === 'zh'
          ? '抱歉，我的知识库中暂时没有关于这个问题的记录。您可以手动添加这个问题，我会记住的！'
          : 'Sorry, I couldn\'t find any answer in your knowledge base. Feel free to add this question manually!';
      }

      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'ai', text: aiText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    }, 600);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Flink': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'Spark': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Scala': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'Doris': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'Java': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Hive': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Hadoop': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Other': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    };
    return colors[cat] || colors['Other'];
  };

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar: Categories */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <h3 className="font-bold text-slate-800 dark:text-white px-2 mb-2 flex items-center">
             <Filter size={16} className="mr-2 text-indigo-500" />
             {lang === 'zh' ? '分类筛选' : 'Categories'}
           </h3>
           <div className="space-y-1">
             <button 
               onClick={() => { setActiveCategory('All'); setViewMode('list'); }}
               className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${activeCategory === 'All' && viewMode !== 'ai' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
             >
                <span>{lang === 'zh' ? '全部' : 'All'}</span>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 rounded-full text-slate-600 dark:text-slate-300">{questions.length}</span>
             </button>
             {INTERVIEW_CATEGORIES.map(cat => (
               <button 
                 key={cat}
                 onClick={() => { setActiveCategory(cat); setViewMode('list'); }}
                 className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${activeCategory === cat && viewMode !== 'ai' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
               >
                  <span>{cat}</span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full text-slate-500 dark:text-slate-400">
                    {questions.filter(q => q.category === cat).length}
                  </span>
               </button>
             ))}
           </div>
        </div>

        {/* AI Entry */}
        <button 
          onClick={() => setViewMode('ai')}
          className={`p-3 rounded-xl shadow-sm border transition-all flex items-center space-x-3 group ${viewMode === 'ai' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400'}`}
        >
           <div className={`p-2 rounded-lg ${viewMode === 'ai' ? 'bg-white/20 text-white' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 group-hover:scale-110 transition-transform'}`}>
              <Bot size={20} />
           </div>
           <div className="text-left">
              <div className="font-bold text-sm">{lang === 'zh' ? 'AI 助手' : 'AI Assistant'}</div>
              <div className={`text-xs ${viewMode === 'ai' ? 'text-violet-200' : 'text-slate-400'}`}>{lang === 'zh' ? '智能问答' : 'Ask me anything'}</div>
           </div>
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
           {viewMode === 'detail' || viewMode === 'edit' ? (
             <button onClick={() => setViewMode('list')} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors">
                <ChevronLeft size={20} className="mr-1" />
                {lang === 'zh' ? '返回列表' : 'Back to List'}
             </button>
           ) : viewMode === 'ai' ? (
             <div className="flex items-center space-x-2">
                <Sparkles className="text-violet-500" size={20} />
                <span className="font-bold text-slate-800 dark:text-white">{lang === 'zh' ? 'AI 面试助手' : 'AI Interview Assistant'}</span>
             </div>
           ) : (
             <div className="flex items-center space-x-2 w-full max-w-md">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder={lang === 'zh' ? '搜索问题关键词...' : 'Search questions...'} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200"
                />
             </div>
           )}
           
           {viewMode === 'list' && (
             <button onClick={handleAddNew} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center shadow-lg transition-colors">
               <Plus size={16} className="mr-2" />
               {lang === 'zh' ? '添加问题' : 'Add Question'}
             </button>
           )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 relative">
           {viewMode === 'ai' ? (
             /* AI Chat View */
             <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                   {messages.map(msg => (
                     <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600'}`}>
                              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                           </div>
                           <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-tl-none'}`}>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                   <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                   <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white h-8"
                        placeholder={lang === 'zh' ? '输入问题，回车发送...' : 'Type a question...'}
                      />
                      <button onClick={handleSendMessage} className={`p-2 rounded-lg transition-colors ${chatInput.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-400 cursor-not-allowed'}`}>
                         <Send size={16} />
                      </button>
                   </div>
                </div>
             </div>
           ) : viewMode === 'edit' ? (
             /* Edit Form */
             <div className="p-6 max-w-3xl mx-auto space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'zh' ? '问题标题' : 'Question Title'}</label>
                   <input 
                     type="text" 
                     value={editForm.title} 
                     onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     placeholder="e.g. What is the difference between map and flatMap?"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'zh' ? '分类' : 'Category'}</label>
                   <div className="flex flex-wrap gap-2">
                      {INTERVIEW_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setEditForm({...editForm, category: cat})}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${editForm.category === cat ? 'bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                        >
                          {cat}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="flex-1">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'zh' ? '详细答案' : 'Answer Details'}</label>
                   <textarea 
                     value={editForm.answer} 
                     onChange={(e) => setEditForm({...editForm, answer: e.target.value})}
                     className="w-full h-64 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none font-sans leading-relaxed"
                     placeholder="Type your answer here..."
                   />
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                   <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors">
                      <Save size={18} className="mr-2" />
                      {lang === 'zh' ? '保存' : 'Save'}
                   </button>
                </div>
             </div>
           ) : viewMode === 'detail' && selectedQuestion ? (
             /* Detail View */
             <div className="p-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                   <div className="space-y-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getCategoryColor(selectedQuestion.category)}`}>
                         {selectedQuestion.category}
                      </span>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                         {selectedQuestion.title}
                      </h2>
                      <p className="text-sm text-slate-400">
                         Last updated: {new Date(selectedQuestion.updatedAt).toLocaleString()}
                      </p>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => handleEdit(selectedQuestion)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                         <Edit size={20} />
                      </button>
                      <button onClick={(e) => handleDelete(selectedQuestion.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                         <Trash2 size={20} />
                      </button>
                   </div>
                </div>
                <div className="prose dark:prose-invert max-w-none p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                   <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                      {selectedQuestion.answer}
                   </p>
                </div>
             </div>
           ) : (
             /* List View */
             <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredQuestions.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <FolderOpen size={48} className="mb-4 opacity-50" />
                      <p>{lang === 'zh' ? '没有找到相关问题' : 'No questions found'}</p>
                   </div>
                ) : (
                   filteredQuestions.map(q => (
                     <div 
                       key={q.id} 
                       onClick={() => handleViewDetail(q)}
                       className="group p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors flex items-center justify-between"
                     >
                        <div className="flex-1 pr-4">
                           <div className="flex items-center space-x-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getCategoryColor(q.category)}`}>
                                 {q.category}
                              </span>
                              <span className="text-xs text-slate-400">
                                 {new Date(q.updatedAt).toLocaleDateString()}
                              </span>
                           </div>
                           <h4 className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {q.title}
                           </h4>
                           <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {q.answer}
                           </p>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                     </div>
                   ))
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
