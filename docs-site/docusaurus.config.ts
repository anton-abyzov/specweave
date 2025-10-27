import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave',
  tagline: 'Spec-Driven Development Framework - Build Production Software with AI',
  favicon: 'img/logo.svg',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Production URL
  url: 'https://spec-weave.com',
  baseUrl: '/',

  // GitHub pages config (for edit links)
  organizationName: 'anton-abyzov',
  projectName: 'specweave',

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
          editUrl: 'https://github.com/anton-abyzov/specweave/tree/main/docs-site/',
          // Point to .specweave/docs/public/ as source
          path: '../.specweave/docs/public',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/anton-abyzov/specweave/tree/main/docs-site/',
          blogTitle: 'SpecWeave Blog',
          blogDescription: 'Spec-Driven Development insights, tutorials, and updates',
          postsPerPage: 10,
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 5,
        },
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

    // Navbar configuration (inspired by react-native.dev)
    navbar: {
      title: 'SpecWeave',
      logo: {
        alt: 'SpecWeave Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          type: 'search',
          position: 'right',
        },
        {
          href: 'https://github.com/anton-abyzov/specweave',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },

    // Footer configuration
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Introduction',
              to: '/docs/overview/introduction',
            },
            {
              label: 'Getting Started',
              to: '/docs/guides/getting-started/quickstart',
            },
            {
              label: 'API Reference',
              to: '/docs/api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/anton-abyzov/specweave/discussions',
            },
            {
              label: 'GitHub Issues',
              href: 'https://github.com/anton-abyzov/specweave/issues',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/specweave',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/anton-abyzov/specweave',
            },
            {
              label: 'Features',
              to: '/docs/overview/features',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SpecWeave. Built with Docusaurus.`,
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

    // Algolia search (configure later)
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'specweave',
    //   contextualSearch: true,
    // },

    // Announcement bar (for important updates)
    announcementBar: {
      id: 'announcement-bar',
      content:
        '⭐️ If you like SpecWeave, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/anton-abyzov/specweave">GitHub</a>! ⭐️',
      backgroundColor: '#ede9fe',
      textColor: '#5b21b6',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
