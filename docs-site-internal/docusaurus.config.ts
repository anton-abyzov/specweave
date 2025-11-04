import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// ⚠️ WARNING: This is the INTERNAL docs site for SpecWeave.
// It contains engineering documentation and MUST NOT be deployed publicly.
// Only run locally for development.

const config: Config = {
  title: 'SpecWeave Internal Docs',
  tagline: 'Engineering Playbook & Architecture',
  // Use SpecWeave logo as favicon (SVG for modern browsers)
  favicon: 'img/logo.svg',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // NO PUBLIC DEPLOYMENT! Local only
  url: 'http://localhost',
  baseUrl: '/',

  // NO GitHub pages config (internal only)
  organizationName: undefined,
  projectName: undefined,

  onBrokenLinks: 'warn', // TODO: Change to 'throw' once all links are fixed
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Mermaid diagrams support
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Point to internal docs
          path: '../.specweave/docs/internal',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          // NO EDIT LINKS (internal only)
          editUrl: undefined,
        },
        // NO BLOG for internal docs
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/specweave-social-card.jpg',

    // Color mode configuration
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    // Navbar configuration
    navbar: {
      title: 'SpecWeave Internal',
      logo: {
        alt: 'SpecWeave Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'strategySidebar',
          position: 'left',
          label: 'Strategy',
        },
        {
          type: 'docSidebar',
          sidebarId: 'specsSidebar',
          position: 'left',
          label: 'Specs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'architectureSidebar',
          position: 'left',
          label: 'Architecture',
        },
        {
          type: 'docSidebar',
          sidebarId: 'deliverySidebar',
          position: 'left',
          label: 'Delivery',
        },
        {
          type: 'docSidebar',
          sidebarId: 'operationsSidebar',
          position: 'left',
          label: 'Operations',
        },
        {
          type: 'docSidebar',
          sidebarId: 'governanceSidebar',
          position: 'left',
          label: 'Governance',
        },
        {
          type: 'search',
          position: 'right',
        },
      ],
    },

    // Footer configuration (minimal for internal docs)
    footer: {
      style: 'dark',
      copyright: `SpecWeave Internal Documentation - Not for public distribution | Copyright © ${new Date().getFullYear()} SpecWeave`,
    },

    // Prism syntax highlighting
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        'bash',
        'typescript',
        'javascript',
        'yaml',
        'json',
        'markdown',
        'python',
        'go',
        'rust',
        'java',
        'csharp',
      ],
    },

    // Announcement bar (warning about internal docs)
    announcementBar: {
      id: 'internal-docs-warning',
      content:
        '⚠️ INTERNAL DOCUMENTATION - Not for public distribution. Contains proprietary engineering information.',
      backgroundColor: '#ef4444',
      textColor: '#ffffff',
      isCloseable: false,
    },
  } satisfies Preset.ThemeConfig,

  // Local search plugin (no Algolia for internal docs)
  plugins: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
};

export default config;
