import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      nitroMock: false,
    },
    vite: {
      server: {
        // 开发时直连Java后端，不需要代理
        proxy: {},
      },
    },
  };
});
