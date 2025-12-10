import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';
import { Language } from '../types';

interface LoginProps {
  onLogin: (username: string) => void;
  lang: Language;
}

export const Login: React.FC<LoginProps> = ({ onLogin, lang }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(`https://api.dicebear.com/7.x/avataaars/svg?seed=admin`);

  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;

  // Update avatar preview when username changes
  useEffect(() => {
    const seed = username || 'guest';
    setAvatarPreview(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay or Tauri invoke
    setTimeout(() => {
      if (username && password) {
        if (password === '123456') {
             onLogin(username);
        } else {
             setError(lang === 'zh' ? '密码错误 (默认: 123456)' : 'Invalid password (Default: 123456)');
             setIsLoading(false);
        }
      } else {
        setError(lang === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-3xl"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-400/20 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 relative z-10 overflow-hidden">
        <div className="p-8">
           <div className="text-center mb-8">
              <div className="w-24 h-24 bg-blue-50 dark:bg-slate-700 rounded-full mx-auto flex items-center justify-center mb-4 shadow-inner border-4 border-white dark:border-slate-600 overflow-hidden transition-all duration-300">
                 <img 
                   src={avatarPreview} 
                   alt="Avatar Preview" 
                   className="w-full h-full object-cover"
                 />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">DevToolbox Pro</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {lang === 'zh' ? '开发者全能工具箱' : 'All-in-one Developer Utilities'}
              </p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                    {lang === 'zh' ? '用户名' : 'Username'}
                 </label>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      placeholder="admin"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                    {lang === 'zh' ? '密码' : 'Password'}
                 </label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      placeholder="••••••"
                    />
                 </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                   {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                   <>
                     <span>{lang === 'zh' ? '登录' : 'Sign In'}</span>
                     <ArrowRight size={18} />
                   </>
                )}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};