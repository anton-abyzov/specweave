import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave',
  tagline: 'AI That Remembers Everything You Build - Ship Features While You Sleep',
  // Use SpecWeave logo as favicon (SVG for modern browsers)
  favicon: 'img/logo.svg',

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

  themeConfig: {
    image: 'img/specweave-social-card.jpg',

    // Twitter/X Card meta tags (explicit for better compatibility)
    metadata: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@aabyzov' },
      { name: 'twitter:creator', content: '@aabyzov' },
      { name: 'twitter:title', content: 'SpecWeave - AI That Remembers Everything You Build' },
      { name: 'twitter:description', content: 'Ship features while you sleep. Spec-driven development with Claude Code.' },
      { name: 'twitter:image', content: 'https://spec-weave.com/img/specweave-social-card.jpg' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'SpecWeave - AI That Remembers Everything You Build' },
      { property: 'og:description', content: 'Ship features while you sleep. Spec-driven development with Claude Code.' },
      { property: 'og:image', content: 'https://spec-weave.com/img/specweave-social-card.jpg' },
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
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'academySidebar',
          position: 'left',
          label: 'Academy',
        },
        {
          type: 'docSidebar',
          sidebarId: 'glossarySidebar',
          position: 'left',
          label: 'Glossary',
        },
        // {
        //   type: 'docSidebar',
        //   sidebarId: 'apiSidebar',
        //   position: 'left',
        //   label: 'API',
        // },
        {
          type: 'docSidebar',
          sidebarId: 'commandsSidebar',
          position: 'left',
          label: 'Commands',
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
              label: 'Commands',
              to: '/docs/commands/status-management',
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
