import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mini-apps/language-vocab/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
