import { httpFetch } from '../../utils/http';

const BASE_URL = 'http://localhost:18087/dataservice';

export const dataServiceApi = {
  post: async (url: string, data?: any) => {
    try {
      const res = await httpFetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      return await res.json();
    } catch (e) {
      return Promise.reject(e);
    }
  },
  get: async (url: string) => {
    try {
      const res = await httpFetch(`${BASE_URL}${url}`, {
        method: 'GET',
      });
      return await res.json();
    } catch (e) {
      return Promise.reject(e);
    }
  }
};
