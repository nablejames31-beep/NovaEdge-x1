import { defineConfig } from 'vite';

// base: './' → the built site works from any folder or GitHub Pages sub-path
export default defineConfig({
  base: './',
  server: { host: true },
  build: { chunkSizeWarningLimit: 1600 },
});
