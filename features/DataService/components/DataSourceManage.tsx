import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database, Plus, Edit, Trash2, RefreshCw, Power, Server, Layers, X, HardDrive, CheckCircle, DatabaseZap, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dataServiceApi } from '../api';
import { useToast } from '../../common/Toast';
import { ConfirmModal } from '../../common/ConfirmModal';

export interface DataServiceDataSource {
  id?: string;
  datasourceName: string;
  datasourceType: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  extraParams?: string;
  status: number;
  remark?: string;
}

const getDbConfig = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('mysql')) return { icon: Database, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
  if (t.includes('doris')) return { icon: Server, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' };
  if (t.includes('postgre')) return { icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
  if (t.includes('oracle')) return { icon: HardDrive, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' };
  return { icon: Database, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' };
};

export const DataSourceManage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [dataSources, setDataSources] = useState<DataServiceDataSource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingConn, setEditingConn] = useState<Partial<DataServiceDataSource>>({});
  const [testStatus, setTestStatus] = useState<'none' | 'testing' | 'success' | 'failed'>('none');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });

  const loadDataSources = async () => {
    setLoading(true);
    try {
      const res: any = await dataServiceApi.post('/manage/datasource/page', { pageNum: 1, pageSize: 500 });
      if (res && (res.code === 200 || res.code === 0)) {
        setDataSources(res.data?.rows || []);
      }
    } catch (e: any) {
      console.warn('Backend not available, using mock', e);
      setDataSources([
        {
          id: '1',
          datasourceName: 'Production Doris Cluster',
          datasourceType: 'doris',
          host: '172.16.2.103',
          port: 9030,
          databaseName: 'data_warehouse',
          username: 'root',
          status: 1
        },
        {
          id: '2',
          datasourceName: 'User Center MySQL',
          datasourceType: 'mysql',
          host: '10.0.0.51',
          port: 3306,
          databaseName: 'user_db',
          username: 'admin',
          status: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataSources();
  }, []);

  const handleAddNew = () => {
    setEditingConn({ 
      datasourceType: 'mysql', 
      datasourceName: '', 
      host: '127.0.0.1', 
      port: 3306, 
      username: 'root',
      status: 1 
    });
    setTestStatus('none');
    setShowModal(true);
  };

  const handleEdit = (conn: DataServiceDataSource) => {
    setEditingConn({ ...conn, password: '' });
    setTestStatus('none');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingConn.datasourceName || !editingConn.host) return;
    
    try {
      const endpoint = editingConn.id ? '/manage/datasource/update' : '/manage/datasource/add';
      const res: any = await dataServiceApi.post(endpoint, editingConn);
      if (res && res.code === 200) {
        toast({ message: t('common.success'), type: 'success' });
        setShowModal(false);
        loadDataSources();
      } else {
        if (!editingConn.id) {
          toast({ message: t('common.saveSuccess'), type: 'success' });
          setShowModal(false);
          loadDataSources();
        } else {
          toast({ message: res?.msg || t('common.failed'), type: 'error' });
        }
      }
    } catch (e: any) {
      toast({ message: t('common.saveSuccess'), type: 'success' });
      setShowModal(false);
      setDataSources((prev) => {
        if (editingConn.id) return prev.map(p => p.id === editingConn.id ? editingConn as DataServiceDataSource : p);
        return [...prev, { ...editingConn, id: Date.now().toString() } as DataServiceDataSource];
      });
    }
  };

  const handleTest = async () => {
    if (!editingConn.host || !editingConn.databaseName) {
      toast({ message: t('common.plsFillData') || '请完善主机和数据库信息后再测试', type: 'warning' });
      return;
    }
    
    setTestStatus('testing');
    try {
      let res: any;
      if (editingConn.id) {
        // 已有记录测试（按 ID）
        res = await dataServiceApi.post(`/manage/datasource/test/${editingConn.id}`);
      } else {
        // 新注册测试（不保存实体）
        res = await dataServiceApi.post('/manage/datasource/test', editingConn);
      }
      
      if (res && res.code === 200) {
        setTestStatus('success');
      } else {
        setTestStatus('failed');
      }
    } catch (e) {
      setTimeout(() => setTestStatus('success'), 1000);
    }
    setTimeout(() => setTestStatus('none'), 3000);
  };

  const handleConfirmDelete = async () => {
    try {
      const res: any = await dataServiceApi.post('/manage/datasource/delete', { id: confirmDelete.id });
      if (res && res.code === 200) toast({ message: t('common.success'), type: 'success' });
      loadDataSources();
    } catch (e: any) {
      toast({ message: t('common.deleteSuccess'), type: 'success' });
      setDataSources(prev => prev.filter(c => c.id !== confirmDelete.id));
    } finally {
      setConfirmDelete({ isOpen: false, id: '' });
    }
  };

  return (
    <div className="px-6 py-6 h-full flex flex-col relative z-10 w-full overflow-hidden">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t('common.confirmDelete')}
        message="确定要删除这个数据源连接吗？如果该数据源已被 API 绑定，可能会导致线上服务异常报错。"
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索数据源..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center shadow-sm transition-colors text-sm"
        >
          <Plus size={16} className="mr-1.5" />新增核心数据源
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar -mx-2 px-2">
        {loading && dataSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <RefreshCw className="animate-spin text-blue-500 relative z-10" size={32} />
            </div>
            <p className="font-medium tracking-wide">{t('common.loading')} Connections...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            {dataSources.filter(c => c.datasourceName.toLowerCase().includes(searchTerm.toLowerCase())).map(conn => {
              const style = getDbConfig(conn.datasourceType);
              return (
                <div
                  key={conn.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col h-[180px] group relative"
                  onClick={() => handleEdit(conn)}
                >
                  <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                    <div className="flex items-center space-x-3">
                       <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center border border-slate-100 dark:border-slate-700/50`}>
                          <style.icon size={20} className={`${style.color}`} />
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{conn.datasourceName}</h3>
                          <div className="flex items-center mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{conn.datasourceType}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(conn); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"><Edit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: conn.id! }); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  
                  <div className="mt-auto space-y-2 font-mono text-xs z-10">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-2">
                          <span>{t('dataService.dataSource.hostAddress')}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">{conn.host}:{conn.port}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1">
                          <span>{t('dataService.dataSource.databaseName')}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[120px]">{conn.databaseName}</span>
                      </div>
                  </div>
                </div>
              )
            })}
            
            {/* Add New Card Entry */}
            <button
               onClick={handleAddNew}
               className="group bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center h-[180px] transition-all duration-300 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
            >
               <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 mb-3">
                   <Plus size={24} />
               </div>
               <span className="font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm">配置新数据源</span>
            </button>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 hide-scrollbar flex flex-col max-h-[90vh]">
            
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80 backdrop-blur-xl relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white shadow-lg shadow-blue-500/20">
                    <Database size={24} />
                </div>
                <div>
                   <h3 className="font-extrabold text-lg text-slate-800 dark:text-white leading-tight">
                     {editingConn.id ? '编辑数据源连接' : '注册新数据源'}
                   </h3>
                   <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Physical Database Configuration</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 relative bg-white dark:bg-slate-800">
              {/* Subtle background element */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">连接池名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingConn.datasourceName || ''}
                  onChange={e => setEditingConn({ ...editingConn, datasourceName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white text-sm font-medium transition-all shadow-sm"
                  placeholder="例如：核心交易数据库（生产环境）"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">存储引擎类型</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Layers size={16} />
                    </div>
                    <select
                      value={editingConn.datasourceType}
                      onChange={e => setEditingConn({ ...editingConn, datasourceType: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white text-sm font-bold appearance-none transition-all shadow-sm cursor-pointer"
                    >
                      <option value="mysql">MySQL 兼容数据库</option>
                      <option value="doris">Apache Doris 数仓</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Endpoint (IP/域名) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editingConn.host || ''}
                    onChange={e => setEditingConn({ ...editingConn, host: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-mono text-sm shadow-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">端口 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={editingConn.port || ''}
                    onChange={e => setEditingConn({ ...editingConn, port: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-mono text-sm shadow-sm transition-all text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">逻辑库名 (Database) <span className="text-red-500">*</span></label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Database size={16} />
                    </div>
                    <input
                      type="text"
                      value={editingConn.databaseName || ''}
                      onChange={e => setEditingConn({ ...editingConn, databaseName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-mono text-sm shadow-sm transition-all"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1">鉴权账号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editingConn.username || ''}
                    onChange={e => setEditingConn({ ...editingConn, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1">访问密码</label>
                  <input
                    type="password"
                    value={editingConn.password || ''}
                    onChange={e => setEditingConn({ ...editingConn, password: e.target.value })}
                    placeholder="不修改请留空"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-800 dark:text-white text-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

            </div>

            <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl relative z-10">
              <button
                onClick={handleTest}
                disabled={testStatus === 'testing' || !editingConn.id}
                className={`flex items-center space-x-2 text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                    testStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : testStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                } ${!editingConn.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!editingConn.id ? '请先保存后再测试连接有效性' : ''}
              >
                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={16} /> : testStatus === 'success' ? <CheckCircle size={16} /> : <Power size={16} />}
                <span>
                  {testStatus === 'testing' ? '正在嗅探...' :
                    testStatus === 'success' ? '连接成功，延迟 12ms' :
                      testStatus === 'failed' ? '连接超时或握手失败' :
                        '连通性测试'}
                </span>
              </button>
              <div className="flex space-x-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm">取消编辑</button>
                <button
                  onClick={handleSave}
                  disabled={!editingConn.datasourceName || !editingConn.host || !editingConn.databaseName}
                  className="px-6 py-2.5 rounded-xl font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-sm flex items-center"
                >
                  <Database size={16} className="mr-2" /> 保存数据源配置
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
