import React, { useState } from 'react';
import { User, Lock, ArrowRight, ArrowLeft, Mail, UserCircle } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from "react-i18next";

interface RegisterProps {
    onRegisterSuccess: (username: string) => void;
    onBack: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onBack}) => {
    const { t, i18n } = useTranslation();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        email: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validation
        if (!formData.username || !formData.password) {
            setError(t('common.usernameAndPasswordAreReq'));
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t('common.passwordsDoNotMatch'));
            setIsLoading(false);
            return;
        }

        // Simulate API delay
        setTimeout(() => {
            try {
                // Get existing users
                const usersJson = localStorage.getItem('toolbox_users');
                const users = usersJson ? JSON.parse(usersJson) : [];

                // Check if username exists
                if (users.some((u: any) => u.username === formData.username)) {
                    setError(t('common.usernameAlreadyExists'));
                    setIsLoading(false);
                    return;
                }

                // Create new user
                const newUser = {
                    username: formData.username,
                    password: formData.password, // In a real app, hash this!
                    nickname: formData.nickname || formData.username,
                    email: formData.email,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
                    role: 'user',
                    createdAt: Date.now()
                };

                // Save
                users.push(newUser);
                localStorage.setItem('toolbox_users', JSON.stringify(users));

                setIsLoading(false);
                onRegisterSuccess(formData.username);
            } catch (e) {
                setError(t('common.registrationFailed'));
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 relative z-10 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {t('common.createAccount')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {t('common.joinDevToolboxPro')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div className="space-y-1">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder={t('common.username')}
                            />
                        </div>
                    </div>

                    {/* Nickname */}
                    <div className="space-y-1">
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={formData.nickname}
                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder={t('common.nicknameOptional')}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder={t('common.emailOptional')}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder={t('common.password')}
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder={t('common.confirmPassword')}
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>{t('common.signUp')}</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
