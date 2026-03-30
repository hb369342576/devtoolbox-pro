import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Plus, Edit, Trash2, RefreshCw, X, 
  Eye, EyeOff, Lock, Unlock, Filter, List,
  ArrowRight, Search, Zap, CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dataServiceApi } from '../api';
import { useToast } from '../../common/Toast';
import { ConfirmModal } from '../../common/ConfirmModal';

interface PermissionEntry {
  id: string;
  userName: string;
  apiName: string;
  apiPath: string;
  rateLimit: number;
  expireTime: string;
  status: number;
}

export const PermissionManage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
  const [activeStep, setActiveStep] = useState(1); // 1: 权限范围, 2: 字段多级控制

  const loadPermissions = async () => {
    setLoading(true);
    try {
        // Mock list
        setPermissions([
            {
                id: '1',
                userName: '内部数据分析系统',
                apiName: '用户信息查询',
                apiPath: '/user/info',
                rateLimit: 50,
                expireTime: '2025-12-31',
                status: 1
            }
        ]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  return (
    <div className="p-6 h-full flex flex-col">
       <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="收回访问权限"
        message="确定要收回该用户对此 API 的访问权限吗？操作将立即生效。"
        confirmText="立即收回"
        cancelText={t('common.cancel')}
        onConfirm={() => {
            setPermissions(prev => prev.filter(p => p.id !== confirmDelete.id));
            setConfirmDelete({ isOpen: false, id: '' });
            showToast('权限已收回', 'success');
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <ShieldAlert className="mr-3 text-red-500" />
          {t('dataService.permissionManage')}
        </h2>
        <div className="flex items-center space-x-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="按用户或 API 搜索..." 
                    className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>
            <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/20 transition-all flex items-center"
            >
                <Plus size={18} className="mr-2" />授权 API 访问
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">授权主体</th>
                      <th className="px-6 py-4">API 路径</th>
                      <th className="px-6 py-4">频控限制</th>
                      <th className="px-6 py-4">有效期至</th>
                      <th className="px-6 py-4">状态</th>
                      <th className="px-6 py-4 text-right">操作</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {permissions.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4">
                              <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-500 mr-3 mr-3 shadow-inner">
                                      <Zap size={14} />
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.userName}</div>
                                      <div className="text-[10px] text-slate-400">ID: PERM_98324</div>
                                  </div>
                              </div>
                          </td>
                          <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono italic">{p.apiPath}</span>
                                  <span className="text-xs text-slate-400">{p.apiName}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{p.rateLimit} <span className="text-xs font-normal text-slate-400">次/分</span></div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{p.expireTime}</td>
                          <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle size={10} className="mr-1" /> 已授权
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                              <div className="flex justify-end space-x-1">
                                  <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-white rounded-lg transition-all" title="策略配置"><Settings size={16} /></button>
                                  <button onClick={() => setConfirmDelete({ isOpen: true, id: p.id })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all" title="收回"><Trash2 size={16} /></button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {permissions.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">暂无有效的权限下发记录</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">API 权限授权引擎</h3>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${activeStep === 1 ? 'bg-red-500' : 'bg-red-200'}`}></div>
                        <div className="w-8 h-0.5 bg-slate-200"></div>
                        <div className={`w-2.5 h-2.5 rounded-full ${activeStep === 2 ? 'bg-red-500' : 'bg-red-200'}`}></div>
                    </div>
                </div>

                <div className="p-8 h-[400px]">
                    {activeStep === 1 ? (
                        <div className="grid grid-cols-2 gap-8 h-full animate-in slide-in-from-left-4">
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300">1. 选择授权主体与服务</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目标应用用户</label>
                                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500">
                                        <option>内部数据分析系统</option>
                                        <option>外部合作伙伴 A</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目标 API</label>
                                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500">
                                        <option>用户信息查询 (/user/info)</option>
                                        <option>订单统计数据 (/order/stats)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300">2. 访问控制参数</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">访问频率限制 (次/分钟)</label>
                                    <input type="number" defaultValue={100} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">每日调用配额</label>
                                    <input type="number" defaultValue={10000} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300">细粒度字段安全控制</h4>
                                <span className="text-[10px] text-slate-400 uppercase italic">Level 2 & 3: Content Filtering</span>
                            </div>
                            <div className="flex-1 overflow-auto border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                                        <tr>
                                            <th className="px-4 py-2">字段</th>
                                            <th className="px-4 py-2 flex items-center"><ShieldAlert size={12} className="mr-1" /> 访问级别</th>
                                            <th className="px-4 py-2"><Filter size={12} className="inline mr-1" /> 行级内容过滤 (黑/白名单)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                        <tr className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-mono">user_name</td>
                                            <td className="px-4 py-3">
                                                <select className="bg-transparent outline-none text-blue-500 font-bold">
                                                    <option>可见</option>
                                                    <option>脱敏 (****)</option>
                                                    <option>隐藏</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="text" placeholder="白名单：逗号分隔值..." className="w-full bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-xs border-b border-transparent focus:border-red-400 outline-none" />
                                            </td>
                                        </tr>
                                        <tr className="bg-slate-50/30 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-mono">mobile_phone</td>
                                            <td className="px-4 py-3">
                                                <select className="bg-transparent outline-none text-orange-500 font-bold" defaultValue="脱敏 (****)">
                                                    <option>可见</option>
                                                    <option>脱敏 (****)</option>
                                                    <option>隐藏</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-[10px] text-slate-400">非筛选字段不支持内容过滤</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 bg-white dark:bg-slate-900">
                    {activeStep === 1 ? (
                        <button onClick={() => setActiveStep(2)} className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg flex items-center font-bold">
                            下一步：细粒度控制 <ArrowRight size={16} className="ml-2" />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setActiveStep(1)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">上一步</button>
                            <button onClick={() => { setShowModal(false); showToast('授权成功', 'success'); }} className="px-8 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg shadow-lg shadow-red-500/20">下发权限</button>
                        </>
                    )}
                </div>
          </div>
        </div>
      )}
    </div>
  );
};
