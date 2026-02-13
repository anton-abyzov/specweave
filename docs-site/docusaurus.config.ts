import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave',
  tagline: 'Program Your AI in English — Skills, Agent Swarms, Enterprise Ready',
  // Use proper favicon.ico for broad compatibility (Teams, etc.)
  favicon: 'favicon.ico',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Production URL
  url: 'https://spec-weave.com',
  baseUrl: '/',

  // SEO: Schema.org structured data for search engines
  headTags: [
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'SpecWeave',
        url: 'https://spec-weave.com',
        logo: 'https://spec-weave.com/img/logo.svg',
        sameAs: [
          'https://github.com/anton-abyzov/specweave',
          'https://www.npmjs.com/package/specweave',
        ],
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'SpecWeave',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Linux, macOS, Windows',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          bestRating: '5',
          ratingCount: '100',
        },
      }),
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'dns-prefetch',
        href: 'https://fonts.gstatic.com',
      },
    },
    // Additional favicon links for broad compatibility (Apple, Android, etc.)
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '192x192',
        href: '/img/favicon-192x192.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
    },
  ],

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
          editUrl: 'https://github.com/anton-abyzov/specweave/tree/develop/docs-site/',
          // Use docs/ folder as source (standard Docusaurus location)
          path: './docs',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          // CRITICAL: Override default exclude to include _ folders (_archive, _orphans, etc.)
          // Docusaurus default excludes: ['**/_*.{js,jsx,ts,tsx,md,mdx}', '**/_*/**', '**/__tests__/**']
          // We want ALL folders and files visible, so we set exclude to empty array
          exclude: [],
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/anton-abyzov/specweave/tree/develop/docs-site/',
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

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/docs/guides/programmable-skills',
            to: '/docs/guides/extensible-skills',
          },
        ],
      },
    ],
  ],

  themeConfig: {
    image: 'img/specweave-social-card-v2.jpg',

    // Twitter/X Card meta tags (explicit for better compatibility)
    metadata: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@aabyzov' },
      { name: 'twitter:creator', content: '@aabyzov' },
      { name: 'twitter:title', content: 'SpecWeave - Program Your AI in English' },
      { name: 'twitter:description', content: 'Skills are programs in English. Describe what you want, AI interviews you, builds it while you sleep. 100+ reusable skills for Claude Code.' },
      { name: 'twitter:image', content: 'https://spec-weave.com/img/specweave-social-card-v2.jpg' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'SpecWeave - Program Your AI in English' },
      { property: 'og:description', content: 'Skills are programs in English. Describe what you want, AI interviews you, builds it while you sleep. 100+ reusable skills for Claude Code.' },
      { property: 'og:image', content: 'https://spec-weave.com/img/specweave-social-card-v2.jpg' },
    ],

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
          sidebarId: 'academySidebar',
          position: 'left',
          label: 'Learn',
        },
        {
          type: 'docSidebar',
          sidebarId: 'skillsSidebar',
          position: 'left',
          label: 'Skills',
        },
        {
          type: 'docSidebar',
          sidebarId: 'enterpriseSidebar',
          position: 'left',
          label: 'Enterprise',
        },
        {
          type: 'docSidebar',
          sidebarId: 'referenceSidebar',
          position: 'left',
          label: 'Reference',
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
              to: '/docs/getting-started',
            },
            {
              label: 'Skills Reference (100+)',
              to: '/docs/reference/skills',
            },
            {
              label: 'Commands Reference',
              to: '/docs/reference/commands',
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
      copyright: `Copyright © ${new Date().getFullYear()} SpecWeave.`,
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
