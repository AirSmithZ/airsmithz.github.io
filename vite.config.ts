import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 读的是这个仓库的 /docs，资源用相对路径，避免挂在用户站根路径时 404。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
