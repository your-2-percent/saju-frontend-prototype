
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // GitHub Pages에서 gh-pages 브랜치로 호스팅 시 저장소명을 base로 설정해야 경로가 깨지지 않습니다.
  base: '/frontend-hwarim/'
});
