import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave Internal Docs',
  tagline: 'Internal documentation for SpecWeave framework developers',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'http://localhost:3015',
  baseUrl: '/',

  // Static files (logos, images)
  staticDirectories: ['static'],

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Mermaid diagrams support + use standard markdown (not MDX)
  markdown: {
    mermaid: true,
    format: 'md',  // Use standard markdown, not MDX (avoids JSX parsing errors)
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.internal.ts',
          path: '../.specweave/docs/internal',
          routeBasePath: '/',
          showLastUpdateTime: true,
          // Disable auto category index from README.md
          sidebarCollapsible: true,
          sidebarCollapsed: true,
          // CRITICAL: Override default exclude to include _ folders (_archive, _orphans, etc.)
          // Docusaurus default excludes: ['**/_*.{js,jsx,ts,tsx,md,mdx}', '**/_*/**', '**/__tests__/**']
          // We want ALL folders and files visible, so we set exclude to empty array
          exclude: [],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/specweave-social-card.jpg',

    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    navbar: {
      title: 'SpecWeave Internal',
      logo: {
        alt: 'SpecWeave Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {to: '/', label: 'Home', position: 'left'},
        {to: '/strategy', label: 'Strategy', position: 'left'},
        {to: '/specs', label: 'Specs', position: 'left'},
        {to: '/architecture', label: 'Architecture', position: 'left'},
        {to: '/delivery', label: 'Delivery', position: 'left'},
        {to: '/operations', label: 'Operations', position: 'left'},
        {to: '/governance', label: 'Governance', position: 'left'},
        {type: 'search', position: 'right'},
      ],
    },

    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} SpecWeave Contributors - Internal Documentation`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'yaml', 'json', 'markdown'],
    },

    // Mermaid theme
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
