import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, RefreshCw, X, 
  Key, ShieldCheck, Mail, Phone, Calendar,
  MoreVertical, Copy, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dataServiceApi } from '../api';
import { useToast } from '../../common/Toast';
import { ConfirmModal } from '../../common/ConfirmModal';

interface ApiUser {
  id?: string;
  userName: string;
  appId: string;
  secretKey: string;
  email: string;
  phone: string;
  status: number;
  expireTime: string;
  remark?: string;
}

export const UserManage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<ApiUser>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res: any = await dataServiceApi.post('/manage/user/list', {});
      if (res && res.code === 200) {
        setUsers(res.data || []);
      } else {
        // Mock
        setUsers([
          {
            id: '1',
            userName: '内部数据分析系统',
            appId: 'ds_app_77283941',
            secretKey: 'sk_test_51PxMzK...',
            email: 'admin@company.com',
            phone: '13800138000',
            status: 1,
            expireTime: '2025-12-31 23:59:59'
          }
        ]);
      }
    } catch (e) {
      setUsers([{
            id: '1',
            userName: '内部数据分析系统',
            appId: 'ds_app_77283941',
            secretKey: 'sk_test_51PxMzK...',
            email: 'admin@company.com',
            phone: '13800138000',
            status: 1,
            expireTime: '2025-12-31 23:59:59'
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddNew = () => {
    setEditingUser({
      userName: '',
      appId: 'ds_app_' + Math.random().toString(36).substring(2, 10),
      secretKey: 'sk_' + Math.random().toString(36).substring(2, 15),
      status: 1,
      expireTime: '2026-12-31 23:59:59'
    });
    setShowModal(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('已复制到剪贴板', 'success');
  };

  const handleSave = async () => {
    try {
      const endpoint = editingUser.id ? '/manage/user/update' : '/manage/user/add';
      await dataServiceApi.post(endpoint, editingUser);
      showToast(t('common.success'), 'success');
      setShowModal(false);
      loadUsers();
    } catch (e) {
      showToast('Mock 保存成功', 'success');
      setShowModal(false);
      loadUsers();
    }
  };

  const handleResetSecret = async (id: string) => {
      try {
          await dataServiceApi.post(`/manage/user/resetSecret/${id}`);
          showToast('密钥已重置', 'success');
          loadUsers();
      } catch (e) {
          showToast('Mock 密钥重置成功', 'success');
      }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t('common.confirmDelete')}
        message="确定要移除这个应用凭证吗？对应的 AppID 将无法再访问 API 服务。"
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
            setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
            setConfirmDelete({ isOpen: false, id: '' });
            showToast('已移除 (Mock)', 'success');
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <Users className="mr-3 text-blue-600" />
          {t('dataService.userManage')}
        </h2>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-lg transition-colors"
        >
          <Plus size={18} className="mr-2" />新增应用用户
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto">
          {users.map(user => (
              <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                          <ShieldCheck size={28} />
                      </div>
                      <div className="flex space-x-1">
                          <button onClick={() => { setEditingUser(user); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition-colors"><Edit size={16}/></button>
                          <button onClick={() => setConfirmDelete({ isOpen: true, id: user.id! })} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"><Trash2 size={16}/></button>
                      </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{user.userName}</h3>
                  <div className="mt-3 flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 group">
                      <Key size={14} className="text-slate-400" />
                      <div className="flex-1 overflow-hidden">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">AppID</div>
                          <div className="text-xs font-mono truncate">{user.appId}</div>
                      </div>
                      <button onClick={() => handleCopy(user.appId, user.appId)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 rounded transition-all">
                        {copiedId === user.appId ? <Check size={14}/> : <Copy size={14} />}
                      </button>
                  </div>

                  <div className="mt-4 space-y-2">
                      <div className="flex items-center text-xs text-slate-500">
                          <Mail size={12} className="mr-2" /> {user.email}
                      </div>
                      <div className="flex items-center text-xs text-slate-500">
                          <Calendar size={12} className="mr-2" /> 过期时间: {user.expireTime.split(' ')[0]}
                      </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${user.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-xs text-slate-500">{user.status === 1 ? '正常状态' : '已冻结'}</span>
                      </div>
                      <button onClick={() => handleResetSecret(user.id!)} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 px-2 py-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors">重置 SecretKey</button>
                  </div>
              </div>
          ))}
          
          <button onClick={handleAddNew} className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-8 hover:border-blue-500 group transition-all h-[260px]">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Plus size={32} />
              </div>
              <div className="mt-4 font-bold text-slate-400 group-hover:text-blue-500">新增应用用户</div>
          </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingUser.id ? '编辑用户信息' : '创建新应用用户'}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">用户/系统名称 *</label>
                    <input 
                        type="text" 
                        value={editingUser.userName || ''}
                        onChange={e => setEditingUser({...editingUser, userName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">联系邮箱</label>
                        <input 
                            type="email" 
                            value={editingUser.email || ''}
                            onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">手机号</label>
                        <input 
                            type="text" 
                            value={editingUser.phone || ''}
                            onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">凭证有效期</label>
                    <input 
                        type="datetime-local" 
                        defaultValue="2026-12-31T23:59"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                    <div className="flex items-start">
                        <AlertCircle size={14} className="text-amber-500 mt-0.5 mr-2" />
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            AppID 与 SecretKey 将在创建后可见。SecretKey 采取不可逆加密，重置操作将导致旧签名鉴权失效。
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-white dark:bg-slate-900">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20">保存设置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
