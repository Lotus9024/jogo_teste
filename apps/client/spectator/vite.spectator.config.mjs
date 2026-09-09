import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const clientRoot = resolve(import.meta.dirname, '..');

export default defineConfig({
  root: clientRoot,
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, 'spectator.html') }
  }
});
