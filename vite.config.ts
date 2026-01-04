import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 的關鍵設定。
  // 如果您的網址是 https://username.github.io/repo-name/
  // 請將 './' 改為 '/repo-name/'。
  // 如果不確定，保留 './' 通常也能運作（相對路徑模式）。
  base: '/LIFEBILL/', 
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});