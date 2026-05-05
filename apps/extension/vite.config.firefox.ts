/**
 * Firefox build — standard Vite bundle (no @crxjs/vite-plugin).
 * Outputs flat JS bundles that are referenced from manifest.firefox.json.
 * Run: vite build --config vite.config.firefox.ts
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@calipers/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist-ff',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      // Multi-entry: background + content scripts
      entry: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content:    resolve(__dirname, 'src/content/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
      // chrome.* is a global provided by the browser — don't bundle it
      external: [],
    },
  },
});
