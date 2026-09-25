import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SpecWeave',
  tagline: 'Change agents. Keep the thread.',
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
    // Cloudflare injects its same-origin analytics beacon at the production edge.
    // A second manual snippet sends duplicate reports to the cross-origin endpoint.
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
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,450;0,500;1,400&display=swap',
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

  onBrokenLinks: 'throw',
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
          // PR-only pages must link to the source revision that contains them.
          editUrl: `https://github.com/anton-abyzov/specweave/tree/${process.env.DOCS_SOURCE_REF || 'develop'}/docs-site/`,
          // Use docs/ folder as source (standard Docusaurus location)
          path: './docs',
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
          editUrl: `https://github.com/anton-abyzov/specweave/tree/${process.env.DOCS_SOURCE_REF || 'develop'}/docs-site/`,
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
    function preserveDocumentationExamples() {
      return {
        name: 'preserve-documentation-examples',
        injectHtmlTags() {
          // Keep email-like command examples intact at Cloudflare's edge.
          // https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
          return {
            preBodyTags: ['<!--email_off-->'],
            postBodyTags: ['<!--/email_off-->'],
          };
        },
      };
    },
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Pages removed or merged over time, pointed at the page that replaced them.
        redirects: [
          {from: '/docs', to: '/docs/overview/introduction'},
          {from: ['/docs/intro', '/docs/quick-start', '/docs/features', '/docs/overview/features', '/docs/guides/life-automation', '/docs/guides/meta-capability'], to: '/docs/overview/introduction'},
          {from: ['/docs/guides/programmable-skills', '/docs/guides/extensible-skills', '/docs/skills/extensible-skills', '/docs/guides/claude-skills-deep-dive', '/docs/guides/self-improving-skills', '/docs/skills/extensible/self-improving-skills', '/docs/skills/extensible/skill-generation', '/docs/skills/extensible/extensible-skills-guide', '/docs/guides/agent-skills-extensibility-analysis'], to: '/docs/skills/extensible/extensible-skills'},
          {from: ['/docs/guides/skill-development-guidelines', '/docs/skills/skill-development-guidelines'], to: '/docs/skills/extensible/skill-development-guidelines'},
          {from: ['/docs/guides/skills-ecosystem-security', '/docs/skills/skills-ecosystem-security'], to: '/docs/skills/verified/skills-ecosystem-security'},
          {from: ['/docs/guides/secure-skill-factory-standard', '/docs/skills/secure-skill-factory-standard'], to: '/docs/skills/verified/secure-skill-factory-standard'},
          {from: ['/docs/skills/verified-skills'], to: '/docs/skills/verified/verified-skills'},
          {from: ['/docs/overview/skills-as-programs', '/docs/overview/skills-as-structured-expertise', '/docs/overview/plugins-ecosystem', '/docs/overview/skills-and-capabilities'], to: '/docs/skills'},
          {from: ['/docs/guides/skill-discovery-evaluation'], to: '/docs/skills/skill-discovery-evaluation'},
          {from: ['/docs/guides/skill-contradiction-resolution'], to: '/docs/skills/skill-contradiction-resolution'},
          {from: ['/docs/enterprise/compliance-standards', '/docs/reference/compliance-standards', '/docs/guides/compliance-standards'], to: '/docs/enterprise'},
          {from: ['/docs/guides/cost-tracking', '/docs/guides/cost-optimization'], to: '/docs/reference/cost-tracking'},
          {from: ['/docs/guides/core-concepts/living-docs-sync-strategy', '/docs/guides/core-concepts/who-benefits-from-living-docs', '/docs/guides/core-concepts/living-documentation', '/docs/guides/intelligent-living-docs-sync', '/docs/guides/multilingual-guide', '/docs/guides/migration-v024', '/docs/guides/migration-v031-project-fields', '/docs/guides/specweave-2', '/docs/guides/core-concepts/background-jobs', '/docs/glossary/terms/living-docs'], to: '/docs/guides/specweave-3'},
          {from: ['/docs/commands/command-decision-tree', '/docs/commands/overview', '/docs/reference/command-decision-tree', '/docs/guides/command-reference-by-priority', '/docs/reference/use-case-guide'], to: '/docs/reference/commands'},
          {from: ['/docs/guides/github-integration', '/docs/guides/external-tool-sync', '/docs/enterprise/github-migration', '/docs/integrations/issue-trackers', '/docs/guides/integrations/issue-trackers', '/docs/guides/integrations/external-tools-overview', '/docs/guides/bidirectional-linking', '/docs/guides/github-action-setup', '/docs/academy/specweave-essentials/07-external-tools', '/docs/academy/specweave-essentials/external-tools'], to: '/docs/guides/github-sync'},
          {from: ['/docs/guides/sync-strategies', '/docs/guides/sync-configuration', '/docs/guides/spec-bidirectional-sync', '/docs/guides/spec-commit-sync', '/docs/guides/status-sync-guide', '/docs/guides/status-sync-migration'], to: '/docs/reference/sync-cli'},
          {from: ['/docs/guides/multi-project-sync-architecture', '/docs/guides/umbrella-sync-routing', '/docs/guides/hierarchy-mapping', '/docs/guides/ado-multi-project-migration', '/docs/enterprise/jira-migration', '/docs/enterprise/azure-devops-migration'], to: '/docs/guides/jira-ado-sync'},
          {from: ['/docs/guides/multi-project-setup', '/docs/guides/repository-selection'], to: '/docs/reference/configuration'},
          {from: ['/docs/guides/agent-teams-setup'], to: '/docs/guides/agent-teams-and-swarms'},
          {from: ['/docs/guides/getting-started/quickstart', '/docs/overview/no-docs-needed', '/docs/guides/specweave-learning-journey', '/docs/guides/mobile/react-native-setup-guide', '/docs/academy', '/docs/academy/specweave-essentials', '/docs/academy/fundamentals', '/docs/academy/talks', '/docs/academy/talks/skills-plugins-marketplaces', '/docs/academy/videos', '/docs/academy/videos/opencode-web-calculator', '/docs/academy/videos/005-opencode-web-calculator', '/docs/academy/fundamentals/ai-development-fundamentals', '/docs/academy/fundamentals/backend-fundamentals', '/docs/academy/fundamentals/enterprise-app-development', '/docs/academy/fundamentals/frontend-fundamentals', '/docs/academy/fundamentals/iac-fundamentals', '/docs/academy/fundamentals/ml-fundamentals', '/docs/academy/fundamentals/security-fundamentals', '/docs/academy/fundamentals/software-engineering-roles', '/docs/academy/fundamentals/testing-fundamentals', '/docs/learn/backend/backend-fundamentals', '/docs/learn/foundations/claude-code-basics', '/docs/learn/foundations/enterprise-app-development', '/docs/learn/foundations/software-engineering-roles', '/docs/learn/foundations/terminal-empowerment', '/docs/learn/frontend/frontend-fundamentals', '/docs/learn/infrastructure/iac-fundamentals', '/docs/learn/ml-ai/ml-fundamentals', '/docs/learn/testing/testing-fundamentals', '/docs/learn/testing/cli-integration-testing', '/docs/academy/specweave-essentials/01-getting-started', '/docs/academy/specweave-essentials/getting-started'], to: '/docs/getting-started'},
          {from: ['/docs/guides/getting-started/nvm-global-packages-fix', '/docs/guides/strategic-init', '/docs/glossary/terms/strategic-init', '/docs/academy/specweave-essentials/12-init-deep-dive', '/docs/academy/specweave-essentials/init-deep-dive'], to: '/docs/getting-started/installation'},
          {from: ['/docs/academy/specweave-essentials/02-three-file-structure', '/docs/academy/specweave-essentials/three-file-structure', '/docs/guides/project-specific-tasks', '/docs/guides/specs-organization-guide', '/docs/glossary/terms/project-specific-tasks'], to: '/docs/guides/core-concepts/what-is-an-increment'},
          {from: ['/docs/academy/specweave-essentials/03-your-first-increment', '/docs/academy/specweave-essentials/your-first-increment'], to: '/docs/getting-started/first-increment'},
          {from: ['/docs/academy/specweave-essentials/04-the-next-command', '/docs/academy/specweave-essentials/the-next-command', '/docs/academy/specweave-essentials/05-quality-gates', '/docs/academy/specweave-essentials/quality-gates', '/docs/academy/specweave-essentials/06-tdd-workflow', '/docs/academy/specweave-essentials/tdd-workflow', '/docs/academy/specweave-essentials/10-advanced-patterns', '/docs/academy/specweave-essentials/advanced-patterns', '/docs/guides/brainstorming', '/docs/guides/deep-interview-mode', '/docs/guides/best-practices', '/docs/guides/deployment-platforms', '/docs/workflows/deployment', '/docs/workflows/design', '/docs/workflows/greenfield', '/docs/workflows/hotfix', '/docs/workflows/implementation', '/docs/workflows/planning', '/docs/workflows/research', '/docs/workflows/validation'], to: '/docs/workflows/overview'},
          {from: ['/docs/academy/specweave-essentials/08-ai-model-selection', '/docs/academy/specweave-essentials/ai-model-selection'], to: '/docs/guides/model-selection'},
          {from: ['/docs/academy/specweave-essentials/09-troubleshooting', '/docs/academy/specweave-essentials/troubleshooting', '/docs/guides/troubleshooting/common-errors', '/docs/guides/troubleshooting/emergency-recovery'], to: '/docs/guides/troubleshooting'},
          {from: ['/docs/academy/specweave-essentials/11-vibe-coding-problem', '/docs/academy/specweave-essentials/vibe-coding-problem', '/docs/overview/philosophy', '/docs/overview/ai-revolution-context', '/docs/guides/ai-coding-benchmarks'], to: '/docs/overview/why-specweave'},
          {from: ['/docs/academy/specweave-essentials/13-increment-lifecycle', '/docs/academy/specweave-essentials/increment-lifecycle', '/docs/guides/backlog-management', '/docs/guides/scheduling-and-planning'], to: '/docs/guides/increment-status-reference'},
          {from: ['/docs/overview/claude-code-basics', '/docs/overview/claude-code-architecture'], to: '/docs/guides/claude-code-projects'},
          {from: ['/docs/guides/core-concepts/skills-first-architecture', '/docs/guides/lazy-plugin-loading', '/docs/guides/plugin-management', '/docs/glossary/terms/skills-vs-agents'], to: '/docs/reference/skills'},
          {from: ['/docs/guides/core-concepts/deterministic-llm-hybrid'], to: '/docs/guides/jev-system-one'},
          {from: ['/docs/guides/openclaw-agent-setup'], to: '/docs/integrations/generic-ai-tools'},
          {from: ['/docs/guides/analytics-dashboard', '/docs/guides/dashboard/activity', '/docs/guides/dashboard/agents', '/docs/guides/dashboard/config', '/docs/guides/dashboard/errors', '/docs/guides/dashboard/hooks', '/docs/guides/dashboard/marketplace', '/docs/guides/dashboard/notifications', '/docs/guides/dashboard/plugins', '/docs/guides/dashboard/services'], to: '/docs/guides/dashboard'},
          {from: ['/docs/glossary', '/docs/glossary/index-by-category', '/docs/glossary/terms/intelligent-model-selection', '/docs/glossary/terms/project-detection'], to: '/docs/glossary/overview'},
          {from: ['/docs/api'], to: '/docs/reference'},
        ],
      },
    ],
  ],

  themeConfig: {
    image: 'img/v3/og.jpg',

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
        {to: '/product', label: 'Product', position: 'left'},
        {type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs'},
        {to: '/docs/guides/cross-tool-handoff', label: 'Handoff', position: 'left'},
        {to: '/integrations', label: 'Integrations', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {href: 'https://verified-skill.com', label: 'Verified Skills', position: 'left'},
        {type: 'search', position: 'right'},
        {href: 'https://github.com/anton-abyzov/specweave', label: 'GitHub', position: 'right'},
      ],
    },

    // Footer configuration
    footer: {
      style: 'dark',
      // Columns live in src/theme/Footer/index.tsx (swizzled).
      copyright: `Copyright © ${new Date().getFullYear()} SpecWeave.`,
    },

    // Mermaid diagrams in the site's paper and burnt-orange palette
    mermaid: {
      theme: {light: 'base', dark: 'dark'},
      options: {
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
        themeVariables: {
          primaryColor: '#fbfcf8',
          primaryBorderColor: '#bd481f',
          primaryTextColor: '#252820',
          secondaryColor: '#eceee4',
          tertiaryColor: '#f6f4ee',
          lineColor: '#8a8f7c',
          noteBkgColor: '#f6f4ee',
          noteBorderColor: '#bd481f',
          actorBkg: '#fbfcf8',
          actorBorder: '#bd481f',
          signalColor: '#252820',
          signalTextColor: '#252820',
        },
      },
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

  } satisfies Preset.ThemeConfig,
};

export default config;
