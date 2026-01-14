import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * SpecWeave Documentation Sidebars
 *
 * Structure follows Diátaxis framework:
 * - Tutorials (getting-started, academy)
 * - How-to Guides (guides, workflows, enterprise)
 * - Explanation (overview)
 * - Reference (commands, glossary, api)
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'overview/introduction',
          label: 'What is SpecWeave?',
        },
        {
          type: 'doc',
          id: 'overview/claude-code-architecture',
          label: 'Claude Code Architecture',
        },
        {
          type: 'doc',
          id: 'overview/features',
          label: 'Key Features',
        },
        {
          type: 'doc',
          id: 'overview/plugins-ecosystem',
          label: 'Plugin Ecosystem',
        },
        {
          type: 'doc',
          id: 'overview/philosophy',
          label: 'Philosophy',
        },
        {
          type: 'doc',
          id: 'metrics',
          label: 'DORA Metrics',
        },
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'getting-started/index',
          label: 'Quick Start',
        },
        {
          type: 'doc',
          id: 'getting-started/first-increment',
          label: 'Your First Increment',
        },
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'guides/core-concepts/what-is-an-increment',
          label: 'What is an Increment?',
        },
        {
          type: 'doc',
          id: 'guides/core-concepts/living-documentation',
          label: 'Living Documentation',
        },
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'workflows/overview',
          label: 'Complete Journey',
        },
        {
          type: 'doc',
          id: 'workflows/planning',
          label: 'Planning',
        },
        {
          type: 'doc',
          id: 'workflows/implementation',
          label: 'Implementation',
        },
        {
          type: 'doc',
          id: 'workflows/brownfield',
          label: 'Brownfield Projects',
        },
      ],
    },
    {
      type: 'doc',
      id: 'faq',
      label: 'FAQ',
    },
  ],

  // Getting Started sidebar (linked from navbar)
  gettingStartedSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'getting-started/index',
          label: 'Quick Start',
        },
        {
          type: 'doc',
          id: 'getting-started/first-increment',
          label: 'Your First Increment',
        },
      ],
    },
    {
      type: 'category',
      label: 'Next Steps',
      collapsed: false,
      items: [
        {
          type: 'link',
          label: 'SpecWeave Essentials',
          href: '/docs/academy/specweave-essentials/',
        },
        {
          type: 'link',
          label: 'Command Reference',
          href: '/docs/commands/overview',
        },
        {
          type: 'link',
          label: 'External Integrations',
          href: '/docs/academy/specweave-essentials/07-external-tools',
        },
      ],
    },
  ],

  // Integrations sidebar
  integrationsSidebar: [
    {
      type: 'category',
      label: 'External Tools',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'guides/integrations/external-tools-overview',
          label: 'Overview',
        },
        {
          type: 'link',
          label: 'GitHub Integration',
          href: '/docs/guides/lessons/14-github-integration',
        },
        {
          type: 'link',
          label: 'JIRA Integration',
          href: '/docs/guides/lessons/15-jira-integration',
        },
        {
          type: 'link',
          label: 'Azure DevOps Integration',
          href: '/docs/guides/lessons/16-ado-integration',
        },
      ],
    },
    {
      type: 'category',
      label: 'Issue Trackers',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'guides/integrations/issue-trackers',
          label: 'Overview',
        },
      ],
    },
  ],

  // Enterprise sidebar
  enterpriseSidebar: [
    {
      type: 'category',
      label: 'Enterprise Migration',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'enterprise/github-migration',
          label: 'GitHub Enterprise',
        },
        {
          type: 'doc',
          id: 'enterprise/jira-migration',
          label: 'JIRA Enterprise',
        },
        {
          type: 'doc',
          id: 'enterprise/azure-devops-migration',
          label: 'Azure DevOps',
        },
      ],
    },
    {
      type: 'category',
      label: 'Deployment & Release',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'enterprise/multi-environment-deployment',
          label: 'Multi-Environment Deployment',
        },
        {
          type: 'doc',
          id: 'enterprise/release-management',
          label: 'Release Management',
        },
        {
          type: 'doc',
          id: 'enterprise/compliance-standards',
          label: 'Compliance Standards',
        },
      ],
    },
  ],

  // Guides sidebar
  guidesSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'getting-started/index',
          label: 'Quick Start',
        },
        {
          type: 'doc',
          id: 'getting-started/first-increment',
          label: 'Your First Increment',
        },
        {
          type: 'doc',
          id: 'faq',
          label: 'FAQ',
        },
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'guides/core-concepts/what-is-an-increment',
          label: 'What is an Increment?',
        },
        {
          type: 'doc',
          id: 'guides/core-concepts/living-documentation',
          label: 'Living Documentation',
        },
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'workflows/overview',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'workflows/planning',
          label: 'Planning',
        },
        {
          type: 'doc',
          id: 'workflows/implementation',
          label: 'Implementation',
        },
        {
          type: 'doc',
          id: 'workflows/brownfield',
          label: 'Brownfield Projects',
        },
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'guides/integrations/external-tools-overview',
          label: 'External Tools Overview',
        },
        {
          type: 'doc',
          id: 'guides/integrations/issue-trackers',
          label: 'Issue Trackers',
        },
      ],
    },
  ],

  // API sidebar
  apiSidebar: [{type: 'autogenerated', dirName: 'api'}],

  // Commands sidebar
  commandsSidebar: [
    {
      type: 'doc',
      id: 'commands/overview',
      label: 'Overview',
    },
    {
      type: 'doc',
      id: 'commands/command-decision-tree',
      label: 'Command Decision Tree',
    },
    {
      type: 'category',
      label: 'Essential Commands',
      collapsed: false,
      items: [
        {
          type: 'link',
          label: '/sw:increment',
          href: '/docs/commands/overview#1-planning',
        },
        {
          type: 'link',
          label: '/sw:auto',
          href: '/docs/commands/overview#2-execution',
        },
        {
          type: 'link',
          label: '/sw:do',
          href: '/docs/commands/overview#2-execution',
        },
        {
          type: 'link',
          label: '/sw:progress',
          href: '/docs/commands/overview#3-monitoring',
        },
        {
          type: 'link',
          label: '/sw:validate',
          href: '/docs/commands/overview#4-quality-assurance',
        },
        {
          type: 'link',
          label: '/sw:done',
          href: '/docs/commands/overview#5-completion',
        },
      ],
    },
  ],

  // Academy sidebar (consolidated learning)
  academySidebar: [
    {
      type: 'doc',
      id: 'academy/index',
      label: 'Academy Overview',
    },
    {
      type: 'category',
      label: 'SpecWeave Essentials',
      collapsed: false,
      items: [
        {type: 'autogenerated', dirName: 'academy/specweave-essentials'},
      ],
    },
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'academy/fundamentals/index',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/enterprise-app-development',
          label: 'Enterprise App Development',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/software-engineering-roles',
          label: 'Software Engineering Roles',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/backend-fundamentals',
          label: 'Backend Fundamentals',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/frontend-fundamentals',
          label: 'Frontend Fundamentals',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/testing-fundamentals',
          label: 'Testing Fundamentals',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/iac-fundamentals',
          label: 'IaC Fundamentals',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/ml-fundamentals',
          label: 'ML/AI Fundamentals',
        },
        {
          type: 'doc',
          id: 'academy/fundamentals/security-fundamentals',
          label: 'Security Fundamentals',
        },
      ],
    },
    {
      type: 'category',
      label: 'Full Curriculum',
      collapsed: true,
      items: [
        {type: 'autogenerated', dirName: 'academy/part-1-foundations'},
        {type: 'autogenerated', dirName: 'academy/part-2-first-application'},
      ],
    },
  ],

  // Legacy learnSidebar - redirects to academy
  learnSidebar: [
    {
      type: 'category',
      label: 'SpecWeave Academy',
      collapsed: false,
      items: [
        {
          type: 'link',
          label: 'Go to Academy',
          href: '/docs/academy/specweave-essentials/',
        },
      ],
    },
  ],

  // Glossary sidebar
  glossarySidebar: [
    {
      type: 'doc',
      id: 'glossary/index-by-category',
      label: 'Glossary by Category',
    },
    {
      type: 'category',
      label: 'Categories',
      collapsed: false,
      items: [
        {
          type: 'autogenerated',
          dirName: 'glossary/categories',
        },
      ],
    },
    {
      type: 'category',
      label: 'All Terms (A-Z)',
      collapsed: true,
      items: [
        {type: 'autogenerated', dirName: 'glossary/terms'},
      ],
    },
  ],
};

export default sidebars;
