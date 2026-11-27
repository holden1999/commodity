import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webDist = new URL('./internal/web/dist/', import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'preserve-go-embed-placeholder',
      apply: 'build',
      async writeBundle() {
        await writeFile(new URL('.gitkeep', webDist), '');
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5178,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8090',
    },
  },
  build: {
    outDir: 'internal/web/dist',
    emptyOutDir: true,
  },
});
