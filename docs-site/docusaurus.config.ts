import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave',
  tagline: 'The Development Loom — Weave Specs into Shipping Software',
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
    // Cloudflare Web Analytics
    {
      tagName: 'script',
      attributes: {
        defer: 'true',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': '{"token": "a08755392f8d4369acfb5775e954080c"}',
      },
      innerHTML: '',
    },
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
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap',
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

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Mermaid diagrams support
  markdown: {
    mermaid: true,
    format: 'mdx',
    hooks: {
      onBrokenMarkdownImages: () => {},
    },
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/docs',
        blogRouteBasePath: '/blog',
        searchBarShortcut: true,
        searchBarShortcutHint: true,
        searchBarPosition: 'right',
        highlightSearchTermsOnTargetPage: true,
        docsDir: 'docs',
        blogDir: 'blog',
      },
    ],
  ],

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
          // Extensible Skills — old paths → new pillar location
          {
            from: ['/docs/guides/programmable-skills', '/docs/guides/extensible-skills', '/docs/skills/extensible-skills'],
            to: '/docs/skills/extensible/extensible-skills',
          },
          {
            from: '/docs/guides/claude-skills-deep-dive',
            to: '/docs/skills/extensible/extensible-skills',
          },
          {
            from: '/docs/guides/self-improving-skills',
            to: '/docs/skills/extensible/self-improving-skills',
          },
          {
            from: ['/docs/guides/skill-development-guidelines', '/docs/skills/skill-development-guidelines'],
            to: '/docs/skills/extensible/skill-development-guidelines',
          },
          // Verified Skills Standard — old paths → new pillar location
          {
            from: ['/docs/guides/skills-ecosystem-security', '/docs/skills/skills-ecosystem-security'],
            to: '/docs/skills/verified/skills-ecosystem-security',
          },
          {
            from: ['/docs/guides/secure-skill-factory-standard', '/docs/skills/secure-skill-factory-standard'],
            to: '/docs/skills/verified/secure-skill-factory-standard',
          },
          {
            from: '/docs/skills/verified-skills',
            to: '/docs/skills/verified/verified-skills',
          },
          // Skills page rename (programs → structured expertise)
          {
            from: '/docs/overview/skills-as-programs',
            to: '/docs/overview/skills-as-structured-expertise',
          },
          // Ecosystem — unchanged locations
          {
            from: '/docs/guides/skill-discovery-evaluation',
            to: '/docs/skills/skill-discovery-evaluation',
          },
          {
            from: '/docs/guides/skill-contradiction-resolution',
            to: '/docs/skills/skill-contradiction-resolution',
          },
          // === Documentation Overhaul (0556) Redirects ===
          // Deleted root files
          {
            from: ['/docs/intro', '/docs/quick-start', '/docs/features'],
            to: '/docs/overview/introduction',
          },
          // learn/ → academy/ redirects
          {
            from: '/docs/learn/foundations/software-engineering-roles',
            to: '/docs/academy/fundamentals/software-engineering-roles',
          },
          {
            from: '/docs/learn/foundations/enterprise-app-development',
            to: '/docs/academy/fundamentals/enterprise-app-development',
          },
          {
            from: '/docs/learn/foundations/claude-code-basics',
            to: '/docs/overview/claude-code-basics',
          },
          {
            from: '/docs/learn/foundations/terminal-empowerment',
            to: '/docs/academy',
          },
          {
            from: '/docs/learn/frontend/frontend-fundamentals',
            to: '/docs/academy/fundamentals/frontend-fundamentals',
          },
          {
            from: '/docs/learn/backend/backend-fundamentals',
            to: '/docs/academy/fundamentals/backend-fundamentals',
          },
          {
            from: '/docs/learn/infrastructure/iac-fundamentals',
            to: '/docs/academy/fundamentals/iac-fundamentals',
          },
          {
            from: '/docs/learn/ml-ai/ml-fundamentals',
            to: '/docs/academy/fundamentals/ml-fundamentals',
          },
          {
            from: '/docs/learn/testing/testing-fundamentals',
            to: '/docs/academy/fundamentals/testing-fundamentals',
          },
          {
            from: '/docs/learn/testing/cli-integration-testing',
            to: '/docs/academy/fundamentals/testing-fundamentals',
          },
          // Merged duplicates
          {
            from: '/docs/enterprise/compliance-standards',
            to: '/docs/guides/compliance-standards',
          },
          {
            from: '/docs/reference/compliance-standards',
            to: '/docs/guides/compliance-standards',
          },
          {
            from: '/docs/guides/cost-tracking',
            to: '/docs/reference/cost-tracking',
          },
          {
            from: '/docs/guides/cost-optimization',
            to: '/docs/reference/cost-tracking',
          },
          {
            from: '/docs/guides/core-concepts/living-docs-sync-strategy',
            to: '/docs/guides/core-concepts/living-documentation',
          },
          {
            from: '/docs/guides/intelligent-living-docs-sync',
            to: '/docs/guides/core-concepts/living-documentation',
          },
          {
            from: '/docs/commands/command-decision-tree',
            to: '/docs/reference/command-decision-tree',
          },
          {
            from: '/docs/guides/agent-teams-setup',
            to: '/docs/guides/agent-teams-and-swarms',
          },
          {
            from: '/docs/integrations/issue-trackers',
            to: '/docs/guides/integrations/issue-trackers',
          },
          {
            from: '/docs/skills/extensible/extensible-skills-guide',
            to: '/docs/skills/extensible/extensible-skills',
          },
          // Deleted getting-started duplicates
          {
            from: '/docs/guides/getting-started/quickstart',
            to: '/docs/getting-started',
          },
          {
            from: '/docs/guides/getting-started/nvm-global-packages-fix',
            to: '/docs/getting-started/installation',
          },
          // Numbered video prefix redirect (living docs use 005- prefix)
          {
            from: '/docs/academy/videos/005-opencode-web-calculator',
            to: '/docs/academy/videos/opencode-web-calculator',
          },
          // Plugin Ecosystem → Skills & Capabilities rename
          {
            from: '/docs/overview/plugins-ecosystem',
            to: '/docs/overview/skills-and-capabilities',
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
      { name: 'twitter:image', content: 'https://spec-weave.com/img/specweave-social-card-v2.jpg' },
      { property: 'og:type', content: 'website' },
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
          sidebarId: 'enterpriseSidebar',
          position: 'left',
          label: 'Enterprise',
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
              label: 'Skills Reference (~48)',
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

    // Announcement bar (for important updates)
    announcementBar: {
      id: 'announcement-bar',
      content:
        'If you like SpecWeave, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/anton-abyzov/specweave">GitHub</a>!',
      backgroundColor: '#eeeafc',
      textColor: '#4a3d8f',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
