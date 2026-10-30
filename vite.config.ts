import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rolldownOptions: {
      input: {
        reunion: resolve(import.meta.dirname, 'index.html'),
        manage: resolve(import.meta.dirname, 'manage/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
});
