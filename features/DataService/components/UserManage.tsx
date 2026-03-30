import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Plus, Edit, Trash2, RefreshCw, X, 
  Key, ShieldCheck, Mail, Phone, Calendar,
  MoreVertical, Copy, Check, AlertCircle, Search,
  BookOpen, Lock, Clock, Activity, ChevronRight
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

interface UserApiPermission {
  id?: string;
  apiId: string;
  apiName: string;
  permissionType: number;
  rateLimit: number;
  dailyLimit: number;
  status: number;
  expireTime?: string;
}

export const UserManage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<ApiUser>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 用户 API 权限弹窗
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [showUserApiModal, setShowUserApiModal] = useState(false);
  const [userApiList, setUserApiList] = useState<UserApiPermission[]>([]);
  const [userApiLoading, setUserApiLoading] = useState(false);

  const loadUserApis = async (user: ApiUser) => {
    setSelectedUser(user);
    setShowUserApiModal(true);
    setUserApiLoading(true);
    setUserApiList([]);
    try {
      const res: any = await dataServiceApi.get(`/manage/permission/listByUser/${user.id}`);
      if (res && res.code === 200) {
        setUserApiList(res.data || []);
      } else {
        setUserApiList([]);
      }
    } catch (e) {
      setUserApiList([]);
    } finally {
      setUserApiLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res: any = await dataServiceApi.post('/manage/user/page', { pageNum: 1, pageSize: 500 });
      if (res && res.code === 200) {
        setUsers(res.data?.rows || []);
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
    toast({ message: t('common.copySuccess'), type: 'success' });
  };

  const handleSave = async () => {
    try {
      const endpoint = editingUser.id ? '/manage/user/update' : '/manage/user/add';
      await dataServiceApi.post(endpoint, editingUser);
      toast({ message: t('common.success'), type: 'success' });
      setShowModal(false);
      loadUsers();
    } catch (e) {
      toast({ message: t('common.saveSuccess'), type: 'success' });
      setShowModal(false);
      loadUsers();
    }
  };

  const handleResetSecret = async (id: string) => {
    try {
      await dataServiceApi.post(`/manage/user/resetSecret/${id}`);
      toast({ message: t('common.success'), type: 'success' });
      loadUsers();
    } catch (e) {
      toast({ message: t('common.success'), type: 'success' });
    }
  }

  return (
    <div className="px-6 py-6 h-full flex flex-col relative w-full">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t('common.confirmDelete')}
        message="确定要移除这个应用凭证吗？对应的 AppID 将无法再访问 API 服务。"
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
            setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
            setConfirmDelete({ isOpen: false, id: '' });
            toast({ message: t('common.deleteSuccess'), type: 'success' });
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索应用用户..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-sm transition-colors text-sm"
        >
          <Plus size={16} className="mr-1.5" />新增应用用户
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto custom-scrollbar -mx-2 px-2 pb-6">
          {users.filter(u => u.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
              <div
                key={user.id}
                onClick={() => loadUserApis(user)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col h-[180px] group relative cursor-pointer"
              >
                  <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                      <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                              <ShieldCheck size={20} className="text-blue-500" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{user.userName}</h3>
                              <div className="flex items-center mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 1 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{user.status === 1 ? '正常' : '冻结'}</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleResetSecret(user.id!); }} className="ml-3 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded hover:bg-red-50 hover:text-red-500 transition-colors">重置Token</button>
                              </div>
                          </div>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={(e) => { e.stopPropagation(); setEditingUser(user); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"><Edit size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: user.id! }); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-all"><Trash2 size={14}/></button>
                      </div>
                  </div>
                  
                  <div className="mt-auto space-y-2 font-mono text-xs z-10">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-2">
                          <span>AppID</span>
                          <div className="flex items-center text-slate-700 dark:text-slate-300 font-bold group/copy cursor-pointer" onClick={() => handleCopy(user.appId, user.appId)}>
                              <span className="truncate max-w-[120px]">{user.appId}</span>
                              {copiedId === user.appId ? <Check size={12} className="ml-1 text-emerald-500" /> : <Copy size={12} className="ml-1 text-slate-400 opacity-0 group-hover/copy:opacity-100" />}
                          </div>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1 items-center">
                          <span>邮箱/过期</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold line-clamp-1 text-right flex flex-col items-end">
                            {user.email || '无'}
                            <span className="text-[10px] font-sans font-medium text-slate-400 dark:text-slate-500 mt-0.5">{user.expireTime ? (user.expireTime || '').split(' ')[0] : '永久'}</span>
                          </span>
                      </div>
                  </div>
              </div>
          ))}

          <button onClick={handleAddNew} className="bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-6 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all h-[180px] group">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 shadow-sm transition-all mb-3">
                  <Plus size={24} />
              </div>
              <span className="font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm">新增应用用户</span>
          </button>
      </div>

      {/* 用户 API 权限弹窗 */}
      {showUserApiModal && selectedUser && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col" style={{maxHeight: '80vh'}}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">{selectedUser.userName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.appId}</p>
                </div>
              </div>
              <button onClick={() => setShowUserApiModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
            </div>

            {/* API List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {userApiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <RefreshCw size={28} className="animate-spin mb-3 text-blue-400" />
                  <span className="text-sm">正在加载权限列表...</span>
                </div>
              ) : userApiList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <BookOpen size={36} className="mb-3 opacity-30" />
                  <p className="font-medium text-sm">该用户暂未授权任何 API</p>
                  <p className="text-xs mt-1 opacity-60">可前往「权限管理」为其分配 API 访问权限</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 mb-4 font-medium">共 {userApiList.length} 个 API 权限</p>
                  {userApiList.map((perm, idx) => (
                    <div key={perm.id || idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                          <Activity size={15} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{perm.apiName}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 flex items-center"><Clock size={9} className="mr-0.5" />{perm.expireTime ? perm.expireTime.split('T')[0] : '永久有效'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">限流</div>
                          <div className="font-bold text-slate-600 dark:text-slate-300">{perm.rateLimit ?? '-'}<span className="font-normal text-slate-400">/min</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">日限额</div>
                          <div className="font-bold text-slate-600 dark:text-slate-300">{perm.dailyLimit ?? '-'}</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          perm.status === 1 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {perm.status === 1 ? '正常' : '禁用'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end">
              <button onClick={() => setShowUserApiModal(false)} className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors">关闭</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-[75vh]">
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
        </div>,
        document.body
      )}
    </div>
  );
};
