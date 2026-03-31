import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            // 为本地 Web 端联调专门配置的数据服务反向代理，解决跨域问题。客户端拦截 localhost:18087 转发到这里。
            '/dataservice-proxy': {
                target: 'http://localhost:18087/dataservice',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dataservice-proxy/, '')
            }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
