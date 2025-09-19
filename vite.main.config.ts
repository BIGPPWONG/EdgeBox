import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        // 只排除可选的原生依赖
        'cpu-features'
      ]
    }
  }
});
