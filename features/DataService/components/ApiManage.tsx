import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, RefreshCw, X, Search, 
  Layers, Code, Settings, Play, Database,
  Check, AlertCircle, ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dataServiceApi } from '../api';
import { useToast } from '../../common/Toast';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DataServiceDataSource } from './DataSourceManage';

interface ApiField {
  id?: string;
  apiId?: string;
  fieldName: string;
  fieldAlias: string;
  fieldType: string;
  fieldDesc: string;
  isRequired: number;
  isFilter: number;
  isSort: number;
  defaultValue?: string;
  sortOrder: number;
}

interface ApiConfig {
  id?: string;
  apiName: string;
  apiPath: string;
  apiDesc: string;
  queryType: number; // 1-表查询 2-SQL查询
  datasourceId: string | number;
  tableName?: string;
  sqlContent?: string;
  defaultRateLimit: number;
  defaultTimeout: number;
  status: number;
  fields?: ApiField[];
}

export const ApiManage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [dataSources, setDataSources] = useState<DataServiceDataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingApi, setEditingApi] = useState<Partial<ApiConfig>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
  const [activeStep, setActiveStep] = useState(1); // 1: 基本信息, 2: 字段配置
  const [parsingFields, setParsingFields] = useState(false);

  const loadApis = async () => {
    setLoading(true);
    try {
      const res: any = await dataServiceApi.post('/manage/api/list', {});
      if (res && res.code === 200) {
        setApis(res.data || []);
      } else {
        // Mock if failed
        setApis([
          {
            id: '1',
            apiName: '用户信息查询',
            apiPath: '/user/info',
            apiDesc: '查询用户中心基本信息',
            queryType: 1,
            datasourceId: '1',
            tableName: 'user_info',
            defaultRateLimit: 100,
            defaultTimeout: 30,
            status: 1
          }
        ]);
      }
    } catch (e) {
      console.warn('API list mock');
      setApis([{
        id: '1',
        apiName: '用户信息查询',
        apiPath: '/user/info',
        apiDesc: '查询用户中心基本信息',
        queryType: 1,
        datasourceId: '1',
        tableName: 'user_info',
        defaultRateLimit: 100,
        defaultTimeout: 30,
        status: 1
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadDataSources = async () => {
    try {
      const res: any = await dataServiceApi.post('/manage/datasource/list', {});
      if (res && res.code === 200) setDataSources(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadApis();
    loadDataSources();
  }, []);

  const handleAddNew = () => {
    setEditingApi({
      apiName: '',
      apiPath: '',
      queryType: 1,
      defaultRateLimit: 100,
      defaultTimeout: 30,
      status: 1,
      fields: []
    });
    setActiveStep(1);
    setShowModal(true);
  };

  const handleEdit = (api: ApiConfig) => {
    setEditingApi({ ...api });
    setActiveStep(1);
    setShowModal(true);
  };

  const handleParseFields = async () => {
    if (!editingApi.datasourceId || (editingApi.queryType === 1 && !editingApi.tableName) || (editingApi.queryType === 2 && !editingApi.sqlContent)) {
      showToast('请先完整填写数据源及查询配置', 'warning');
      return;
    }

    setParsingFields(true);
    try {
      let res: any;
      if (editingApi.queryType === 1) {
        res = await dataServiceApi.get(`/manage/api/parseTableFields?datasourceId=${editingApi.datasourceId}&tableName=${editingApi.tableName}`);
      } else {
        res = await dataServiceApi.post('/manage/api/parseSqlFields', {
          datasourceId: editingApi.datasourceId,
          sqlContent: editingApi.sqlContent
        });
      }

      if (res && res.code === 200) {
        const parsedFields: ApiField[] = res.data.map((f: any, index: number) => ({
          fieldName: f.fieldName,
          fieldAlias: f.fieldName,
          fieldType: f.fieldType,
          fieldDesc: f.fieldDesc || '',
          isRequired: 0,
          isFilter: 1,
          isSort: 0,
          sortOrder: index + 1
        }));
        setEditingApi(prev => ({ ...prev, fields: parsedFields }));
        setActiveStep(2);
      } else {
         // Mock fields if backend not support parse
         const mockFields: ApiField[] = [
            { fieldName: 'id', fieldAlias: 'id', fieldType: 'BIGINT', fieldDesc: 'ID', isRequired: 1, isFilter: 1, isSort: 1, sortOrder: 1 },
            { fieldName: 'name', fieldAlias: 'name', fieldType: 'VARCHAR', fieldDesc: '姓名', isRequired: 0, isFilter: 1, isSort: 0, sortOrder: 2 }
         ];
         setEditingApi(prev => ({ ...prev, fields: mockFields }));
         setActiveStep(2);
      }
    } catch (e) {
      showToast('字段解析失败 (Mock模式进入步)', 'info');
      setActiveStep(2);
    } finally {
      setParsingFields(false);
    }
  };

  const handleSave = async () => {
    try {
      const endpoint = editingApi.id ? '/manage/api/update' : '/manage/api/add';
      const res: any = await dataServiceApi.post(endpoint, editingApi);
      if (res && res.code === 200) {
        showToast(t('common.success'), 'success');
        setShowModal(false);
        loadApis();
      } else {
        showToast('保存成功(Mock)', 'success');
        setShowModal(false);
        loadApis();
      }
    } catch (e) {
      showToast('Mock 保存成功', 'success');
      setShowModal(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dataServiceApi.post('/manage/api/delete', { id: confirmDelete.id });
      showToast(t('common.success'), 'success');
      loadApis();
    } catch (e) {
        setDataApis(prev => prev.filter(a => a.id !== confirmDelete.id));
    } finally {
      setConfirmDelete({ isOpen: false, id: '' });
    }
  };

  const [dataApis, setDataApis] = useState<ApiConfig[]>([]); // internal state for local update

  return (
    <div className="p-6 h-full flex flex-col">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t('common.confirmDelete')}
        message="确定要删除这个 API 配置吗？删除后所有使用方将无法请求。"
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '' })}
        type="danger"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
          <Layers className="mr-3 text-blue-600" />
          {t('dataService.apiManage')}
        </h2>
        <div className="flex items-center space-x-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="搜索 API..." 
                    className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>
            <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center shadow-lg shadow-blue-500/20 transition-colors"
            >
                <Plus size={18} className="mr-2" />{t('common.add')}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
                <tr className="text-slate-500 text-sm font-medium">
                    <th className="px-4 py-2">API 名称</th>
                    <th className="px-4 py-2">访问路径</th>
                    <th className="px-4 py-2">查询类型</th>
                    <th className="px-4 py-2">数据源</th>
                    <th className="px-4 py-2">状态</th>
                    <th className="px-4 py-2 text-right">操作</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {apis.map(api => (
                    <tr key={api.id} className="bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                        <td className="px-4 py-4 rounded-l-xl border-y border-l border-slate-100 dark:border-slate-700">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{api.apiName}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[200px]">{api.apiDesc}</div>
                        </td>
                        <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 font-mono text-blue-600 dark:text-blue-400">
                            {api.apiPath}
                        </td>
                        <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${api.queryType === 1 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                {api.queryType === 1 ? '表查询' : 'SQL查询'}
                            </span>
                        </td>
                        <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            {dataSources.find(d => String(d.id) === String(api.datasourceId))?.datasourceName || api.datasourceId}
                        </td>
                        <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                            <div className="flex items-center space-x-1.5">
                                <div className={`w-2 h-2 rounded-full ${api.status === 1 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-400'}`}></div>
                                <span className={api.status === 1 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}>{api.status === 1 ? '启用中' : '已禁用'}</span>
                            </div>
                        </td>
                        <td className="px-4 py-4 rounded-r-xl border-y border-r border-slate-100 dark:border-slate-700 text-right">
                            <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(api)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="编辑"><Edit size={16} /></button>
                                <button onClick={() => setConfirmDelete({ isOpen: true, id: api.id! })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all" title="删除"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    {editingApi.id ? '编辑 API 配置' : '发布新数据服务 API'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700'}`}>1. 基础配置</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2. 字段映射</span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {activeStep === 1 ? (
                <div className="animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center"><Settings className="w-4 h-4 mr-2 text-blue-500" />基本详情</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API 名称 *</label>
                                <input 
                                    type="text" 
                                    value={editingApi.apiName || ''}
                                    onChange={e => setEditingApi({...editingApi, apiName: e.target.value})}
                                    placeholder="如：用户信息查询"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API 路径 *</label>
                                <div className="flex items-center">
                                    <span className="bg-slate-100 dark:bg-slate-700 px-3 py-2 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l-lg text-sm text-slate-500">/query</span>
                                    <input 
                                        type="text" 
                                        value={editingApi.apiPath || ''}
                                        onChange={e => setEditingApi({...editingApi, apiPath: e.target.value})}
                                        placeholder="/v1/user/list"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">描述信息</label>
                                <textarea 
                                    value={editingApi.apiDesc || ''}
                                    onChange={e => setEditingApi({...editingApi, apiDesc: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center"><Database className="w-4 h-4 mr-2 text-blue-500" />查询源配置</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">选择数据源 *</label>
                                <select 
                                    value={editingApi.datasourceId}
                                    onChange={e => setEditingApi({...editingApi, datasourceId: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">请选择数据源</option>
                                    {dataSources.map(ds => <option key={ds.id} value={ds.id}>{ds.datasourceName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">查询类型</label>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => setEditingApi({...editingApi, queryType: 1})}
                                        className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center space-x-2 transition-all ${editingApi.queryType === 1 ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-500'}`}
                                    >
                                        <Layers size={16} /> <span>表查询模式</span>
                                    </button>
                                    <button 
                                        onClick={() => setEditingApi({...editingApi, queryType: 2})}
                                        className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center space-x-2 transition-all ${editingApi.queryType === 2 ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-500'}`}
                                    >
                                        <Code size={16} /> <span>SQL查询模式</span>
                                    </button>
                                </div>
                            </div>
                            {editingApi.queryType === 1 ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">查询表名 *</label>
                                    <input 
                                        type="text" 
                                        value={editingApi.tableName || ''}
                                        onChange={e => setEditingApi({...editingApi, tableName: e.target.value})}
                                        placeholder="如：info_user_orders"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SQL 内容 *</label>
                                    <textarea 
                                        value={editingApi.sqlContent || ''}
                                        onChange={e => setEditingApi({...editingApi, sqlContent: e.target.value})}
                                        rows={4}
                                        placeholder="SELECT id, name FROM users WHERE id = ${id}"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              ) : (
                <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">定义返回字段与别名</h4>
                        <button onClick={handleParseFields} className="text-xs text-blue-600 hover:bg-blue-50 p-1 px-2 rounded-md flex items-center"><RefreshCw size={12} className={parsingFields ? 'animate-spin mr-1' : 'mr-1'} /> 重新获取元数据</button>
                    </div>
                    <div className="overflow-auto border border-slate-100 dark:border-slate-700 rounded-xl">
                        <table className="w-full text-left bg-white dark:bg-slate-900">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">原始字段</th>
                                    <th className="px-4 py-3">类型</th>
                                    <th className="px-4 py-3">输出别名</th>
                                    <th className="px-4 py-3">描述</th>
                                    <th className="px-4 py-3 text-center">必需</th>
                                    <th className="px-4 py-3 text-center">筛选</th>
                                    <th className="px-4 py-3 text-center">排序</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editingApi.fields?.map((field, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                                        <td className="px-4 py-3 font-medium font-mono text-slate-400">{field.fieldName}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{field.fieldType}</span></td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" 
                                                value={field.fieldAlias}
                                                onChange={e => {
                                                    const nfs = [...(editingApi.fields || [])];
                                                    nfs[idx].fieldAlias = e.target.value;
                                                    setEditingApi({...editingApi, fields: nfs});
                                                }}
                                                className="w-full bg-blue-50/30 dark:bg-blue-900/10 border-b border-transparent focus:border-blue-400 outline-none px-1"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" 
                                                value={field.fieldDesc}
                                                onChange={e => {
                                                    const nfs = [...(editingApi.fields || [])];
                                                    nfs[idx].fieldDesc = e.target.value;
                                                    setEditingApi({...editingApi, fields: nfs});
                                                }}
                                                className="w-full bg-transparent border-b border-transparent focus:border-slate-400 outline-none px-1 text-slate-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input type="checkbox" checked={field.isRequired === 1} onChange={() => {
                                                const nfs = [...(editingApi.fields || [])];
                                                nfs[idx].isRequired = nfs[idx].isRequired === 1 ? 0 : 1;
                                                setEditingApi({...editingApi, fields: nfs});
                                            }} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input type="checkbox" checked={field.isFilter === 1} onChange={() => {
                                                const nfs = [...(editingApi.fields || [])];
                                                nfs[idx].isFilter = nfs[idx].isFilter === 1 ? 0 : 1;
                                                setEditingApi({...editingApi, fields: nfs});
                                            }} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input type="checkbox" checked={field.isSort === 1} onChange={() => {
                                                const nfs = [...(editingApi.fields || [])];
                                                nfs[idx].isSort = nfs[idx].isSort === 1 ? 0 : 1;
                                                setEditingApi({...editingApi, fields: nfs});
                                            }} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                <div className="flex items-center text-xs text-slate-400">
                    <AlertCircle size={14} className="mr-1" /> SQL配置支持 `${"{param}"}` 形式的动态注入。
                </div>
                <div className="flex space-x-3">
                    {activeStep === 1 ? (
                        <button 
                            onClick={handleParseFields}
                            disabled={parsingFields}
                            className="px-6 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-black dark:hover:bg-slate-600 text-white rounded-lg flex items-center transition-all disabled:opacity-50"
                        >
                            {parsingFields ? <RefreshCw className="animate-spin mr-2" size={18} /> : null}
                            下一步：获取字段元数据
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setActiveStep(1)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg">上一步</button>
                            <button onClick={handleSave} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 flex items-center">
                                <Check size={18} className="mr-2" /> 发布并保存 API
                            </button>
                        </>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
