import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 61022,
    host: true,
  },
  resolve: {
    alias: {
      'tiny-cpp-for-contest-core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  base: './', // 适配 GitHub Pages 相对路径部署
});
