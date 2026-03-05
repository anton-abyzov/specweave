import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.docusaurus', 'build'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@site/src': path.resolve(__dirname, 'src'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      '@theme-original': path.resolve(__dirname, 'src/theme'),
      '@docusaurus/Link': path.resolve(__dirname, 'src/__mocks__/docusaurus-link.tsx'),
      '@docusaurus/useBaseUrl': path.resolve(__dirname, 'src/__mocks__/docusaurus-useBaseUrl.ts'),
      '@theme/Layout': path.resolve(__dirname, 'src/__mocks__/docusaurus-layout.tsx'),
    },
  },
});
