import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // корневая папка проекта
  publicDir: 'public', // явно указываем папку с ассетами
  json: {
    namedExports: true,
    stringify: false,
  },
});
