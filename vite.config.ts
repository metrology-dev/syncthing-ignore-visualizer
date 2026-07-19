import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built app works from file:// or any subdirectory.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
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
});
