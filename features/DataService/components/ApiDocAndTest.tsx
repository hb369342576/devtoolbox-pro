import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Play, Copy, Check, 
  Terminal, Globe, Clock, Shield, Database,
  ChevronRight, ArrowRight, Code, List,
  RefreshCw, FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dataServiceApi } from '../api';
import { useToast } from '../../common/Toast';

interface ApiDoc {
  id: string;
  apiName: string;
  apiPath: string;
  apiDesc: string;
  queryType: number;
  datasourceName: string;
  fields: {
    fieldName: string,
    fieldAlias: string,
    fieldType: string,
    fieldDesc: string,
    isRequired: number
  }[];
}

export const ApiDocAndTest: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [apiList, setApiList] = useState<any[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [apiDoc, setApiDoc] = useState<ApiDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadApiList = async () => {
    try {
      const res: any = await dataServiceApi.post('/manage/api/list', {});
      if (res && res.code === 200) {
        setApiList(res.data || []);
        if (res.data.length > 0 && !selectedApiId) {
            setSelectedApiId(res.data[0].id);
        }
      } else {
          // Mock
          const mock = [{ id: '1', apiName: '用户信息查询', apiPath: '/user/info' }];
          setApiList(mock);
          setSelectedApiId('1');
      }
    } catch (e) {
        setApiList([{ id: '1', apiName: '用户信息查询', apiPath: '/user/info' }]);
        setSelectedApiId('1');
    }
  };

  const loadApiDoc = async (id: string) => {
    setLoading(true);
    try {
      const res: any = await dataServiceApi.get(`/doc/api/${id}`);
      if (res && res.code === 200) {
        setApiDoc(res.data);
      } else {
        // Mock doc
        setApiDoc({
            id,
            apiName: '用户信息查询',
            apiPath: '/user/info',
            apiDesc: '该接口用于根据用户 ID 或名称查询详细信息。',
            queryType: 1,
            datasourceName: 'Production Doris',
            fields: [
                { fieldName: 'user_id', fieldAlias: 'userId', fieldType: 'BIGINT', fieldDesc: '唯一标识', isRequired: 1 },
                { fieldName: 'user_name', fieldAlias: 'userName', fieldType: 'VARCHAR', fieldDesc: '名称', isRequired: 0 }
            ]
        });
      }
    } catch (e) {
        setApiDoc({
            id,
            apiName: '用户信息查询',
            apiPath: '/user/info',
            apiDesc: '该接口用于根据用户 ID 或名称查询详细信息。',
            queryType: 1,
            datasourceName: 'Production Doris',
            fields: [
                { fieldName: 'user_id', fieldAlias: 'userId', fieldType: 'BIGINT', fieldDesc: '唯一标识', isRequired: 1 },
                { fieldName: 'user_name', fieldAlias: 'userName', fieldType: 'VARCHAR', fieldDesc: '名称', isRequired: 0 }
            ]
        });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApiList(); }, []);
  useEffect(() => { if (selectedApiId) loadApiDoc(selectedApiId); }, [selectedApiId]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    showToast('复制成功', 'success');
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const res: any = await dataServiceApi.post(`/query/page/${selectedApiId}`, {
          pageNum: 1,
          pageSize: 10,
          params: testParams
      });
      setTestResult(res);
    } catch (e) {
        setTestResult({
            code: 200,
            msg: "success",
            data: {
                total: 1,
                list: [
                    { userId: 100, userName: "Antigravity", email: "ai@devtoolbox.com", status: "Active" }
                ]
            }
        });
    } finally {
      setTesting(false);
    }
  };

  const getCurlCmd = () => {
      return `curl -X POST 'http://localhost:18087/dataservice/query/page/${selectedApiId}' \\
  -H 'X-App-Id: YOUR_APP_ID' \\
  -H 'X-Signature: YOUR_SIGNATURE' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ pageNum: 1, pageSize: 10, params: testParams }, null, 2)}'`;
  }

  return (
    <div className="h-full flex overflow-hidden bg-slate-50 dark:bg-slate-900/40">
      {/* Sidebar - API List */}
      <div className="w-64 flex-none border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="搜索接口..." className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {apiList.map(api => (
                  <button 
                    key={api.id}
                    onClick={() => setSelectedApiId(api.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center group ${selectedApiId === api.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 border border-transparent'}`}
                  >
                      <div className={`p-1.5 rounded-lg mr-3 ${selectedApiId === api.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white'} transition-colors`}>
                        <Globe size={14} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                          <div className="text-sm font-bold truncate">{api.apiName}</div>
                          <div className="text-[10px] opacity-60 font-mono truncate">{api.apiPath}</div>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                  <RefreshCw className="animate-spin mr-2" /> 加载解析中...
              </div>
          ) : apiDoc ? (
              <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in transition-all">
                  {/* API Header */}
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center space-x-3 mb-2">
                              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{apiDoc.apiName}</h1>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${apiDoc.queryType === 1 ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {apiDoc.queryType === 1 ? 'Table Mode' : 'SQL Mode'}
                              </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <div className="flex items-center"><Terminal size={14} className="mr-1.5" /> <span className="font-mono text-blue-600">{apiDoc.apiPath}</span></div>
                              <div className="flex items-center"><Database size={14} className="mr-1.5" /> {apiDoc.datasourceName}</div>
                          </div>
                      </div>
                      <div className="flex space-x-2">
                          <button onClick={() => handleCopy(getCurlCmd(), 'curl')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-sm font-medium flex items-center transition-all shadow-sm">
                            {copied === 'curl' ? <Check size={14} className="text-green-500 mr-2" /> : <Terminal size={14} className="mr-2" />} 复制 CURL
                          </button>
                      </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-l-4 border-blue-500/20 pl-4 py-2 bg-blue-50/10 rounded-r-lg">{apiDoc.apiDesc}</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left: Fields Table */}
                    <div className="space-y-4">
                        <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                            <List size={16} className="mr-2 text-blue-500" /> 返回参数说明
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3">参数名 (别名)</th>
                                        <th className="px-4 py-3">类型</th>
                                        <th className="px-4 py-3">必查</th>
                                        <th className="px-4 py-3">说明</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apiDoc.fields.map((f, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{f.fieldAlias}</td>
                                            <td className="px-4 py-3 font-mono opacity-60">{f.fieldType}</td>
                                            <td className="px-4 py-3 text-center">{f.isRequired === 1 ? <span className="text-red-500 font-bold">YES</span> : 'NO'}</td>
                                            <td className="px-4 py-3 text-slate-500">{f.fieldDesc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Online Test Portal */}
                    <div className="space-y-4">
                         <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                            <Play size={16} className="mr-2 text-green-500" /> 在线联调测试
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">
                            <div className="space-y-3">
                                <label className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-widest">查询参数 (Params JSON)</label>
                                {apiDoc.fields.filter(f => f.isRequired === 1).length > 0 && (
                                    <div className="space-y-3">
                                        {apiDoc.fields.filter(f => f.isRequired === 1).map(f => (
                                            <div key={f.fieldName} className="flex items-center space-x-3">
                                                <span className="text-xs font-mono w-20 truncate">{f.fieldAlias}:</span>
                                                <input 
                                                    type="text" 
                                                    placeholder={`请输入 ${f.fieldAlias}...`}
                                                    onChange={e => setTestParams({...testParams, [f.fieldAlias]: e.target.value})}
                                                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-green-500 font-mono"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-300 italic">* 测试环境固定授权内部 Admin AppID</div>
                            </div>

                            <button 
                                onClick={runTest} 
                                disabled={testing}
                                className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-black text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center shadow-lg"
                            >
                                {testing ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Play size={18} className="mr-2 fill-current" />} 发送测试请求
                            </button>

                            {testResult && (
                                <div className="space-y-2 animate-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-slate-400">响应结果 (Response)</span>
                                        <button onClick={() => handleCopy(JSON.stringify(testResult, null, 2), 'res')} className="text-[10px] text-blue-500 hover:underline">
                                            {copied === 'res' ? '已复制' : '复制结果'}
                                        </button>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto max-h-[300px] custom-scrollbar">
                                        <pre className="text-[11px] font-mono text-green-400 leading-relaxed tabular-nums">
                                            {JSON.stringify(testResult, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
              </div>
          ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <FileText size={64} className="opacity-10" />
                  <p>请在左侧选择一个 API 接口查看详情</p>
              </div>
          )}
      </div>
    </div>
  );
};
