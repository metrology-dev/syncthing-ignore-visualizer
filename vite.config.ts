import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `standalone` mode (npm run build:standalone) inlines JS/CSS into a single
// index.html — a self-contained release asset that opens via double-click,
// no server required. Regular `build` keeps separate chunks for normal
// static hosting (GitHub Pages, etc.).
export default defineConfig(({ mode }) => ({
  // Relative base so the built app works from file:// or any subdirectory.
  base: './',
  plugins: mode === 'standalone' ? [viteSingleFile()] : [],
  build: {
    target: 'es2022',
    sourcemap: mode !== 'standalone',
    // Separate outDir so `build` and `build:standalone` can run back-to-back
    // (e.g. in the release workflow) without clobbering each other's output.
    outDir: mode === 'standalone' ? 'dist-standalone' : 'dist',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // DOM-bound modules are exercised manually in the browser; the core
      // engine (parser, matcher, tree, history, timeline) is unit tested.
      exclude: [
        'src/app.ts',
        'src/ui.ts',
        'src/editor.ts',
        'src/renderer.ts',
        'src/detailPane.ts',
        'src/importDialog.ts',
      ],
    },
  },
}));
