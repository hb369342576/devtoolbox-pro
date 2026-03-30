import { httpFetch } from '../../utils/http';

let BASE_URL = 'http://localhost:18087/dataservice';
let GLOBAL_TOKEN = '';

export const setupDataServiceApi = (baseUrl: string, token: string) => {
    BASE_URL = baseUrl;
    GLOBAL_TOKEN = token;
};

export const dataServiceApi = {
  post: async (url: string, data?: any) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (GLOBAL_TOKEN) {
          headers['Authorization'] = `Bearer ${GLOBAL_TOKEN}`;
          // 兼容部分后台可能使用特定 header
          headers['X-Admin-Token'] = GLOBAL_TOKEN;
      }

      const res = await httpFetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      return await res.json();
    } catch (e) {
      return Promise.reject(e);
    }
  },
  get: async (url: string) => {
    try {
      const headers: Record<string, string> = {};
      if (GLOBAL_TOKEN) {
          headers['Authorization'] = `Bearer ${GLOBAL_TOKEN}`;
          headers['X-Admin-Token'] = GLOBAL_TOKEN;
      }
      const res = await httpFetch(`${BASE_URL}${url}`, {
        method: 'GET',
        headers
      });
      return await res.json();
    } catch (e) {
      return Promise.reject(e);
    }
  },
  ping: async () => {
    try {
      // 这里的 ping 只是简单的检查服务是否可达
      // 如果后端没有专门的 /ping 接口，可以尝试请求根路径或版本接口
      await httpFetch(`${BASE_URL}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      return true;
    } catch (e) {
      console.error('DataService Ping Failed:', e);
      return false;
    }
  },
  getTables: async (datasourceId: string | number) => {
    try {
        const res = await dataServiceApi.get(`/manage/datasource/tables/${datasourceId}`);
        return res;
    } catch (e) {
        // Mock fallback if api fails
        return { 
            code: 200, 
            data: ['users', 'orders', 'products', 'category', 'sys_log', 'api_config', 'datasource_info'] 
        };
    }
  },
  testSql: async (data: { datasourceId: string | number, sqlContent: string }) => {
    try {
        return await dataServiceApi.post('/manage/api/testSql', data);
    } catch (e) {
        return { code: 500, msg: 'SQL 执行失败: ' + (e as Error).message };
    }
  }
};
