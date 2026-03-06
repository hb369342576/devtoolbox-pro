import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Save, Camera, Key, Lock, CheckCircle, Smartphone, Briefcase, MapPin, Globe, Flag } from 'lucide-react';
import { Language, User as UserType } from '../../types';
import { useTranslation } from "react-i18next";

interface UserProfileProps {
  user: UserType;
  onUpdate: (updatedUser: UserType) => void;
}

const COUNTRIES = [
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'OT', name: 'Other', flag: '🌍' },
];

export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate}) => {
    const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<UserType>({
    ...user,
    gender: user.gender || 'male',
    country: user.country || 'CN'
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdate(formData);
      setIsSaving(false);
      setMessage({ type: 'success', text: t('common.profileUpdatedSuccessfull') });
      setTimeout(() => setMessage(null), 3000);
    }, 800);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: t('common.newPasswordsDoNotMatch') });
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setPasswords({ current: '', new: '', confirm: '' });
      setMessage({ type: 'success', text: t('common.passwordChangedSuccessful') });
      setTimeout(() => setMessage(null), 3000);
    }, 1000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center space-x-6 mb-8">
         <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-slate-700">
                {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                    formData.username.charAt(0).toUpperCase()
                )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={24} />
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                {formData.nickname || formData.username}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">@{formData.username}</p>
            <div className="flex items-center mt-2 space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase flex items-center">
                   <Shield size={10} className="mr-1" />
                   {formData.role}
                </span>
                {formData.country && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center">
                     {COUNTRIES.find(c => c.code === formData.country)?.flag} {formData.city}
                  </span>
                )}
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
           <button 
             onClick={() => setActiveTab('info')}
             className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${
               activeTab === 'info' 
                 ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                 : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
             }`}
           >
             {t('common.basicInfo')}
           </button>
           <button 
             onClick={() => setActiveTab('security')}
             className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${
               activeTab === 'security' 
                 ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                 : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
             }`}
           >
             {t('common.security')}
           </button>
        </div>

        <div className="p-8">
           {message && (
             <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {message.type === 'success' && <CheckCircle className="mr-2" size={20} />}
                {message.text}
             </div>
           )}

           {activeTab === 'info' ? (
             <form onSubmit={handleInfoSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.usernameReadOnly')}
                      </label>
                      <div className="relative">
                         <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.username}
                           disabled
                           className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.nickname')}
                      </label>
                      <div className="relative">
                         <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.nickname || ''}
                           onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                         />
                      </div>
                   </div>
                </div>

                {/* Second Row: Gender & Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.gender')}
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      >
                         <option value="male">{t('common.male')}</option>
                         <option value="female">{t('common.female')}</option>
                         <option value="other">{t('common.other')}</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.mobile')}
                      </label>
                      <div className="relative">
                         <Smartphone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.mobile || ''}
                           onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                           placeholder="+86 123 4567 8901"
                         />
                      </div>
                   </div>
                </div>

                {/* Third Row: Occupation & Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.occupation')}
                      </label>
                      <div className="relative">
                         <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.occupation || ''}
                           onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                           placeholder="Software Engineer"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.countryRegion')}
                      </label>
                      <div className="relative">
                         <Flag className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <select
                           value={formData.country}
                           onChange={(e) => setFormData({...formData, country: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white appearance-none"
                         >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                </div>

                {/* Fourth Row: City & Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.city')}
                      </label>
                      <div className="relative">
                         <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.city || ''}
                           onChange={(e) => setFormData({...formData, city: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('common.website')}
                      </label>
                      <div className="relative">
                         <Globe className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="text" 
                           value={formData.website || ''}
                           onChange={(e) => setFormData({...formData, website: e.target.value})}
                           className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                           placeholder="https://example.com"
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     {t('common.email')}
                   </label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     {t('common.bio')}
                   </label>
                   <textarea 
                     rows={3}
                     value={formData.bio || ''}
                     onChange={(e) => setFormData({...formData, bio: e.target.value})}
                     className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white resize-none"
                     placeholder={t('common.tellUsAboutYourself')}
                   />
                </div>

                <div className="flex justify-end pt-4">
                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center shadow-lg shadow-blue-600/20 disabled:opacity-70"
                   >
                     {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                     ) : (
                        <Save size={18} className="mr-2" />
                     )}
                     {t('common.saveChanges')}
                   </button>
                </div>
             </form>
           ) : (
             <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     {t('common.currentPassword')}
                   </label>
                   <div className="relative">
                      <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        value={passwords.current}
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     {t('common.newPassword')}
                   </label>
                   <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                     {t('common.confirmNewPassword')}
                   </label>
                   <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      />
                   </div>
                </div>

                <div className="flex justify-end pt-4">
                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center shadow-lg shadow-blue-600/20 disabled:opacity-70"
                   >
                     {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                     ) : (
                        <Key size={18} className="mr-2" />
                     )}
                     {t('common.changePassword')}
                   </button>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};