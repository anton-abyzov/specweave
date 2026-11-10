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
      '@site/src/hooks/useUnprefixedPathname': path.resolve(__dirname, 'src/__mocks__/unprefixed-pathname.ts'),
      '@site/src': path.resolve(__dirname, 'src'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      '@theme-original/NavbarItem/DefaultNavbarItem': path.resolve(__dirname, 'src/__mocks__/default-navbar-item.tsx'),
      '@theme-original': path.resolve(__dirname, 'src/theme'),
      '@docusaurus/Link': path.resolve(__dirname, 'src/__mocks__/docusaurus-link.tsx'),
      '@docusaurus/Translate': path.resolve(__dirname, 'src/__mocks__/docusaurus-Translate.tsx'),
      '@docusaurus/useBaseUrl': path.resolve(__dirname, 'src/__mocks__/docusaurus-useBaseUrl.ts'),
      '@docusaurus/useBrokenLinks': path.resolve(__dirname, 'src/__mocks__/docusaurus-useBrokenLinks.ts'),
      '@theme/Layout': path.resolve(__dirname, 'src/__mocks__/docusaurus-layout.tsx'),
    },
  },
});
