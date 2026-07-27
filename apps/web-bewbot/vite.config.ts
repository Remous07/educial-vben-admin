import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // 代理到 Python FastAPI 后端
            target: 'http://localhost:8000',
            ws: true,
          },
        },
      },
    },
  };
});
