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

interface ApiDocInfo {
  basicInfo: {
    apiId: string;
    apiName: string;
    apiDesc: string;
    apiPath?: string;
    queryType: string;
    tableName: string;
    datasourceId: string;
    datasourceName: string;
    status: number;
    statusDesc: string;
  };
  endpoints: {
    page: string;
    list: string;
    one: string;
  };
  method: string;
  contentType: string;
  authInfo: {
    type: string;
    header: string;
    format: string;
    description: string;
    generateTokenUrl: string;
  };
  requestParams: {
    systemParams: any[];
    filterParams: any[];
  };
  responseFields: any[];
  examples: {
    request: any;
    response: any;
  };
  curlExamples: { desc: string; command: string }[];
  errorCodes: { code: number; msg: string; solution: string }[];
}

interface ApiDocAndTestProps {
  preSelectedId?: string | null;
  onIdChange?: (id: string | null) => void;
}

export const ApiDocAndTest: React.FC<ApiDocAndTestProps> = ({ preSelectedId, onIdChange }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [apiList, setApiList] = useState<any[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [apiDoc, setApiDoc] = useState<ApiDocInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testEndpoint, setTestEndpoint] = useState<'page' | 'list' | 'one'>('page');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadApiList = async () => {
    try {
      // Because /doc/apis doesn't return the custom apiPath configured by users,
      // we must fetch from /manage/api/page which contains real apiPath like '/ship-status-report'
      const res: any = await dataServiceApi.post('/manage/api/page', { pageNum: 1, pageSize: 500 });
      if (res && res.code === 200) {
        // Only show published APIs
        const published = (res.data?.rows || []).filter((a: any) => a.status === 1);
        // Ensure apiId vs id normalisation
        const normalized = published.map((a: any) => ({
            ...a,
            apiId: a.id || a.apiId,
        }));
        setApiList(normalized);
        const targetId = preSelectedId || (normalized.length > 0 ? normalized[0].apiId : null);
        if (targetId) setSelectedApiId(targetId);
      } else {
          // Mock
          const mock = [{ apiId: '2037470682316664833', apiName: '船舶状态报告查询', apiPath: '/ship-status-report', endpoints: { page: '/dataservice/query/page/2037470682316664833' }, status: 1 }];
          setApiList(mock);
          setSelectedApiId('2037470682316664833');
      }
    } catch (e) {
        const mock = [{ apiId: '2037470682316664833', apiName: '船舶状态报告查询', apiPath: '/ship-status-report', endpoints: { page: '/dataservice/query/page/2037470682316664833' }, status: 1 }];
        setApiList(mock);
        setSelectedApiId('2037470682316664833');
    }
  };

  const loadApiDoc = async (id: string) => {
    setLoading(true);
    setTestResult(null);
    try {
      const res: any = await dataServiceApi.get(`/doc/api/${id}`);
      if (res && res.code === 200) {
        // Try to enrich basicInfo with apiPath from apiList if backend didn't provide it
        const listMatch = apiList.find(a => (a.apiId || a.id) === id);
        if (listMatch && listMatch.apiPath && !res.data.basicInfo.apiPath) {
            res.data.basicInfo.apiPath = listMatch.apiPath;
        }
        setApiDoc(res.data);
      } else {
        throw new Error("mock fallback");
      }
    } catch (e) {
        setApiDoc({
            basicInfo: {
                apiId: id,
                apiName: "船舶状态报告查询",
                apiDesc: "查询船舶状态报告数据",
                apiPath: "/ship-status-report",
                queryType: "SQL模式",
                tableName: "ods_cii_ship_status_report_d",
                datasourceId: "2037439282750177282",
                datasourceName: "Doris测试库",
                status: 1,
                statusDesc: "已发布"
            },
            endpoints: {
                page: `/dataservice/query/page/${id}`,
                list: `/dataservice/query/list/${id}`,
                one: `/dataservice/query/one/${id}`
            },
            method: "POST",
            contentType: "application/json",
            authInfo: {
                type: "JWT Bearer Token",
                header: "Authorization",
                format: "Bearer <token>",
                description: "通过 /dataservice/token/generate 接口生成Token",
                generateTokenUrl: `/dataservice/token/generate?appId=<appId>&apiId=${id}`
            },
            requestParams: {
                systemParams: [
                    { name: "pageNum", type: "Integer", desc: "页码", defaultValue: "1", required: false, remark: "分页查询专用" },
                    { name: "pageSize", type: "Integer", desc: "每页数量", defaultValue: "10", required: false, remark: "分页查询专用" }
                ],
                filterParams: [
                    { name: "ship_code", type: "VARCHAR", desc: "船舶编码", defaultValue: null, required: false, remark: "params 对象内的过滤条件" },
                    { name: "report_date", type: "VARCHAR", desc: "报告日期", defaultValue: null, required: false, remark: "params 对象内的过滤条件" }
                ]
            },
            responseFields: [
                { field: "ship_code", originalField: "ship_code", type: "VARCHAR", desc: "船舶编码" },
                { field: "report_date", originalField: "report_date", type: "VARCHAR", desc: "报告日期" },
                { field: "voyage_no", originalField: "voyage_no", type: "VARCHAR", desc: "航次号" }
            ],
            examples: {
                request: { pageNum: 1, pageSize: 10, params: { ship_code: "示例值" } },
                response: { code: 200, msg: "操作成功", data: { total: 100, rows: [{ ship_code: "示例值", report_date: "2026-03-30", voyage_no: "V1" }] } }
            },
            curlExamples: [
                { desc: "分页查询", command: `curl -X POST 'http://localhost:18087/ship-status-report' -H 'Content-Type: application/json' -H 'Authorization: Bearer <your_token>' -d '{"pageNum": 1, "pageSize": 10, "params": {"ship_code": "示例值"}}'` },
                { desc: "列表查询", command: `curl -X POST 'http://localhost:18087/ship-status-report' -H 'Content-Type: application/json' -H 'Authorization: Bearer <your_token>' -d '{"params":{}}'` }
            ],
            errorCodes: [
                { code: 400, msg: "参数错误", solution: "请求参数格式不正确" },
                { code: 401, msg: "认证失败", solution: "Token无效或已过期" },
                { code: 500, msg: "服务器错误", solution: "服务器内部异常" }
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
    toast({ message: t('common.copySuccess'), type: 'success' });
  };

  const getDynamicRequestJson = () => {
    // 构建请求体
    const requestBody: any = {};
    if (testEndpoint === 'page') {
        requestBody.pageNum = parseInt(testParams.pageNum || '1');
        requestBody.pageSize = parseInt(testParams.pageSize || '10');
    }
    
    // 提取非系统参数放入 params
    const filterParams: Record<string, string> = {};
    Object.keys(testParams).forEach(k => {
        if (k !== 'pageNum' && k !== 'pageSize' && k !== 'sortField' && k !== 'sortOrder') {
            if (testParams[k]) filterParams[k] = testParams[k];
        }
    });

    if (apiDoc && apiDoc.examples && apiDoc.examples.request && apiDoc.examples.request.params) {
        // Deep merge with example params fallback
        requestBody.params = { ...apiDoc.examples.request.params, ...filterParams };
    } else {
        requestBody.params = filterParams;
    }
    
    // Keep outer keys from examples if any
    if (apiDoc && apiDoc.examples && apiDoc.examples.request) {
        Object.keys(apiDoc.examples.request).forEach(k => {
            if (k !== 'pageNum' && k !== 'pageSize' && k !== 'params') {
                requestBody[k] = apiDoc.examples.request[k];
            }
        });
    }

    return requestBody;
  };

  const runTest = async () => {
    setTesting(true);
    
    const requestBody = getDynamicRequestJson();

    // 实际调用始终走 endpoints[...], 因为 apiPath 是暴露给外部的 gateway path, 但在本地前端直接测 dataService API 最好还是走它的物理路由。
    const rawEndpoint = apiDoc?.endpoints[testEndpoint] || `/query/page/${selectedApiId}`;
    const testUrl = rawEndpoint.startsWith('/dataservice') ? rawEndpoint.replace('/dataservice', '') : rawEndpoint;

    try {
      const res: any = await dataServiceApi.post(testUrl, requestBody);
      setTestResult(res);
    } catch (e) {
        setTestResult({
            code: 200,
            msg: "success mock",
            data: {
                total: 1,
                list: [
                    { ship_code: requestBody.params?.ship_code || "TEST01", report_date: "2026-03-30", voyage_no: "V001" }
                ]
            }
        });
    } finally {
      setTesting(false);
    }
  };

  const getCurlCmd = () => {
      if (!apiDoc) return '';
      const example = apiDoc.curlExamples.find(c => c.desc.includes(testEndpoint === 'page' ? '分页' : testEndpoint === 'list' ? '列表' : '单条')) || apiDoc.curlExamples[0];
      if (!example) return '';
      
      let cmd = example.command;
      const targetEndpoint = apiDoc.endpoints[testEndpoint] || Object.values(apiDoc.endpoints)[0];
      if (apiDoc.basicInfo.apiPath && cmd.includes(targetEndpoint)) {
          cmd = cmd.replace(targetEndpoint, apiDoc.basicInfo.apiPath);
      } else if (apiDoc.basicInfo.apiPath) {
          // Fallback simple replace if exact targetEndpoint was not in the string (e.g. localhost:xxx/dataservice/query/...)
          cmd = cmd.replace(/\/dataservice\/query\/(page|list|one)\/\d+/, apiDoc.basicInfo.apiPath);
      }
      
      const dynamicJsonStr = JSON.stringify(getDynamicRequestJson());
      cmd = cmd.replace(/-d\s+'\{.*\}'/, `-d '${dynamicJsonStr}'`);
      
      return cmd;
  }

  return (
    <div className="h-full flex overflow-hidden bg-slate-50 dark:bg-slate-900/40">
      {/* Sidebar - API List */}
      <div className="w-64 flex-none border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder={t('common.searchApi')} className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {apiList.map(api => (
                  <button 
                    key={api.apiId || api.id}
                    onClick={() => {
                        setSelectedApiId(api.apiId || api.id);
                        if (onIdChange) onIdChange(api.apiId || api.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center group ${selectedApiId === (api.apiId || api.id) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 border border-transparent'}`}
                  >
                      <div className={`p-1.5 rounded-lg mr-3 ${selectedApiId === (api.apiId || api.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white'} transition-colors`}>
                        <Globe size={14} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                          <div className="text-sm font-bold truncate">{api.apiName}</div>
                          <div className="text-[10px] opacity-60 font-mono truncate">{api.endpoints?.page || api.apiPath}</div>
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
              <div className="w-full max-w-full space-y-10 px-4 animate-in fade-in transition-all pb-32">
                  {/* API Header */}
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center space-x-3 mb-2">
                              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{apiDoc.basicInfo.apiName}</h1>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  {apiDoc.basicInfo.statusDesc}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${apiDoc.basicInfo.queryType.includes('表') ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {apiDoc.basicInfo.queryType}
                              </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-500 mt-3">
                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                  <span className="font-black text-green-600 dark:text-green-500 mr-2">{apiDoc.method}</span>
                                  <span className="font-mono text-slate-600 dark:text-slate-300">
                                      {apiDoc.basicInfo.apiPath || apiDoc.endpoints[testEndpoint] || Object.values(apiDoc.endpoints)[0]}
                                  </span>
                              </div>
                              <div className="flex items-center"><Database size={14} className="mr-1.5" /> {apiDoc.basicInfo.datasourceName}</div>
                          </div>
                      </div>
                      <div className="flex space-x-2">
                          <button onClick={() => handleCopy(getCurlCmd(), 'curl')} className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center transition-all shadow-sm">
                            {copied === 'curl' ? <Check size={14} className="text-green-400 mr-2" /> : <Terminal size={14} className="mr-2" />} 复制 CURL
                          </button>
                      </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-l-4 border-blue-500/20 pl-4 py-2 bg-blue-50/10 rounded-r-lg">
                      {apiDoc.basicInfo.apiDesc || '暂无描述'}
                  </p>

                  <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800">
                      {Object.keys(apiDoc.endpoints).filter(ep => ep !== 'one').map(ep => (
                          <button 
                            key={ep}
                            onClick={() => setTestEndpoint(ep as any)}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${testEndpoint === ep ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                          >
                              {ep === 'page' ? '分页查询' : ep === 'list' ? '列表查询' : '单条查询'}
                          </button>
                      ))}
                  </div>

                  <div className="space-y-12 items-start w-full mt-6">

                        {/* Headers */}
                        <div className="space-y-4">
                            <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                <Shield size={16} className="mr-2 text-orange-500" /> 请求标头 (Headers)
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                        <tr><th className="px-4 py-3">参数名</th><th className="px-4 py-3">参数值/格式</th><th className="px-4 py-3">说明</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{apiDoc.authInfo.header}</td>
                                            <td className="px-4 py-3 font-mono text-blue-600">{apiDoc.authInfo.format}</td>
                                            <td className="px-4 py-3 text-slate-500">{apiDoc.authInfo.description}</td>
                                        </tr>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">Content-Type</td>
                                            <td className="px-4 py-3 font-mono text-blue-600">{apiDoc.contentType}</td>
                                            <td className="px-4 py-3 text-slate-500">-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                        {/* Request Params */}
                        <div className="space-y-4">
                            <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                <List size={16} className="mr-2 text-blue-500" /> 请求参数 (Body)
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3">参数名</th>
                                            <th className="px-4 py-3">类型</th>
                                            <th className="px-4 py-3 text-center">必填</th>
                                            <th className="px-4 py-3">说明</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...(apiDoc.requestParams.systemParams || []), ...(apiDoc.requestParams.filterParams || [])].map((f, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                                                <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{f.name}</td>
                                                <td className="px-4 py-3 font-mono opacity-60">{f.type}</td>
                                                <td className="px-4 py-3 text-center">{f.required ? <span className="text-red-500 font-bold">YES</span> : 'NO'}</td>
                                                <td className="px-4 py-3 text-slate-500">{f.desc} <span className="text-[10px] text-slate-400 ml-1">({f.remark})</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* Request Example */}
                        {apiDoc.examples?.request && (
                            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col transition-all">
                                <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center">
                                        请求参数示例 (Request)
                                        <span className="text-green-400 ml-2 animate-pulse text-[8px] px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">● 实时联动修改</span>
                                    </span>
                                    <button onClick={() => handleCopy(JSON.stringify(getDynamicRequestJson(), null, 2), 'req-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                        {copied === 'req-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                    </button>
                                </div>
                                <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                    <pre className="text-[11px] font-mono text-blue-300 leading-relaxed tabular-nums">
                                        {JSON.stringify(getDynamicRequestJson(), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                        </div>

<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                        {/* Response Fields */}
                        <div className="space-y-4">
                            <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                <Code size={16} className="mr-2 text-green-500" /> 响应字段 (Response)
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3">返回字段</th>
                                            <th className="px-4 py-3">类型</th>
                                            <th className="px-4 py-3">说明</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(apiDoc.responseFields || []).map((f, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-700">{f.field}</td>
                                                <td className="px-4 py-3 font-mono opacity-60">{f.type}</td>
                                                <td className="px-4 py-3 text-slate-500">{f.desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* Response Example */}
                        {apiDoc.examples?.response && (
                            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col">
                                <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">响应结果示例 (Response)</span>
                                    <button onClick={() => handleCopy(JSON.stringify(apiDoc.examples.response, null, 2), 'res-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                        {copied === 'res-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                    </button>
                                </div>
                                <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed tabular-nums">
                                        {JSON.stringify(apiDoc.examples.response, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Bottom: Online Test Portal */}
                    <div className="space-y-6 mt-16 pt-10 border-t-2 border-slate-200 dark:border-slate-800/80">
                         <div className="flex items-center text-xl font-black text-slate-800 dark:text-slate-100">
                            <Play size={24} className="mr-3 text-green-500" /> 在线联调测试
                        </div>
                        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8 items-start"><div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm 2xl:sticky 2xl:top-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-widest">查询参数 (Body JSON)</label>
                                <div className="space-y-3">
                                    {testEndpoint === 'page' && apiDoc.requestParams.systemParams?.filter((f: any) => f.name === 'pageNum' || f.name === 'pageSize').map((f: any) => (
                                        <div key={f.name} className="flex items-center space-x-3">
                                            <span className="text-xs font-mono w-20 truncate" title={f.name}>{f.name}:</span>
                                            <input 
                                                type="number" 
                                                placeholder={f.defaultValue}
                                                onChange={e => setTestParams({...testParams, [f.name]: e.target.value})}
                                                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-green-500 font-mono"
                                            />
                                        </div>
                                    ))}
                                    {(apiDoc.requestParams.filterParams || []).map((f: any) => (
                                        <div key={f.name} className="flex items-center space-x-3">
                                            <span className="text-xs font-mono w-20 truncate" title={f.name}>{f.name}:</span>
                                            <input 
                                                type="text" 
                                                placeholder={`请输入 ${f.desc}...`}
                                                onChange={e => setTestParams({...testParams, [f.name]: e.target.value})}
                                                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-green-500 font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[10px] text-slate-400 italic mt-3 flex items-center bg-slate-50 p-2 rounded">
                                    <Shield size={12} className="mr-1 inline-block text-slate-400" /> 测试默认使用内置 Admin Token 鉴权
                                </div>
                            </div>

                            <button 
                                onClick={runTest} 
                                disabled={testing}
                                className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-black text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center shadow-lg active:scale-95"
                            >
                                {testing ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Play size={18} className="mr-2 fill-current" />} 发送测试请求
                            </button>
                        </div>
                        <div className="2xl:col-span-2">
                            {testResult ? (
                                <div className="space-y-2 animate-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-slate-400">响应结果 (Response)</span>
                                        <button onClick={() => handleCopy(JSON.stringify(testResult, null, 2), 'res')} className="text-[10px] text-blue-500 hover:underline">
                                            {copied === 'res' ? '已复制' : '复制结果'}
                                        </button>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto max-h-[400px] custom-scrollbar">
                                        <pre className="text-[11px] font-mono text-green-400 leading-relaxed tabular-nums">
                                            {JSON.stringify(testResult, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 bg-slate-50 dark:bg-slate-800/50">
                                    <Terminal size={48} className="opacity-20 mb-4" />
                                    <p>参数填写完毕后，请点击发送请求即可查看返回值。</p>
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
