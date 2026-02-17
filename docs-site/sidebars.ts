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
          id: 'overview/skills-as-programs',
          label: 'Skills Are Programs in English',
        },
        {
          type: 'doc',
          id: 'overview/why-specweave',
          label: 'Why SpecWeave?',
        },
        {
          type: 'doc',
          id: 'overview/no-docs-needed',
          label: "You Don't Need Claude Code Docs",
        },
        {
          type: 'doc',
          id: 'overview/claude-code-basics',
          label: 'Claude Code Basics',
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
      type: 'doc',
      id: 'enterprise/index',
      label: 'Enterprise Overview',
    },
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
      type: 'doc',
      id: 'guides/ai-coding-benchmarks',
      label: 'AI Coding Benchmarks',
    },
    {
      type: 'doc',
      id: 'guides/life-automation',
      label: 'Life Automation',
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
    {
      type: 'category',
      label: 'Complete Reference',
      collapsed: true,
      items: [
        {
          type: 'link',
          label: 'All Skills (100+)',
          href: '/docs/reference/skills',
        },
        {
          type: 'link',
          label: 'All Commands',
          href: '/docs/reference/commands',
        },
        {
          type: 'link',
          label: 'Use Case Guide',
          href: '/docs/reference/use-case-guide',
        },
      ],
    },
  ],

  // Reference sidebar (includes commands, previously separate navbar item)
  referenceSidebar: [
    {
      type: 'doc',
      id: 'reference/index',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Commands',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'commands/overview',
          label: 'Command Overview',
        },
        {
          type: 'doc',
          id: 'commands/command-decision-tree',
          label: 'Command Decision Tree',
        },
      ],
    },
    {
      type: 'category',
      label: 'Skills & Catalog',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'reference/skills',
          label: 'Skills Reference (100+)',
        },
        {
          type: 'doc',
          id: 'reference/commands',
          label: 'Commands Reference',
        },
        {
          type: 'doc',
          id: 'reference/use-case-guide',
          label: 'Use Case Guide',
        },
        {
          type: 'doc',
          id: 'reference/command-decision-tree',
          label: 'Command Decision Tree',
        },
      ],
    },
    {
      type: 'category',
      label: 'Additional References',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'reference/compliance-standards',
          label: 'Compliance Standards',
        },
        {
          type: 'doc',
          id: 'reference/cost-tracking',
          label: 'Cost Tracking',
        },
      ],
    },
  ],

  // Skills sidebar — two standards: Extensible Skills + Verified Skills
  skillsSidebar: [
    {
      type: 'doc',
      id: 'skills/index',
      label: 'Skills Overview',
    },
    {
      type: 'category',
      label: 'Extensible Skills Standard',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'guides/extensible-skills',
          label: 'The Standard (Open/Closed)',
        },
        {
          type: 'doc',
          id: 'guides/claude-skills-deep-dive',
          label: 'Claude Skills Deep Dive',
        },
        {
          type: 'doc',
          id: 'guides/self-improving-skills',
          label: 'Self-Improving Skills (Reflect)',
        },
        {
          type: 'doc',
          id: 'guides/skill-development-guidelines',
          label: 'Development Guidelines',
        },
      ],
    },
    {
      type: 'category',
      label: 'Verified Skills Standard',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'skills/verified-skills',
          label: 'The Standard (3-Tier Trust)',
        },
        {
          type: 'doc',
          id: 'guides/secure-skill-factory-standard',
          label: 'Skill Factory RFC (Full Spec)',
        },
        {
          type: 'doc',
          id: 'guides/skills-ecosystem-security',
          label: 'Security Landscape',
        },
      ],
    },
    {
      type: 'category',
      label: 'Ecosystem',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'guides/skill-discovery-evaluation',
          label: 'Discovery & Evaluation',
        },
        {
          type: 'doc',
          id: 'guides/agent-skills-extensibility-analysis',
          label: 'Agent Compatibility (39 Agents)',
        },
        {
          type: 'doc',
          id: 'guides/skill-contradiction-resolution',
          label: 'Contradiction Resolution',
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'reference/skills',
          label: 'All Skills (100+)',
        },
        {
          type: 'link',
          label: 'verifiedskill.com',
          href: 'https://verifiedskill.com',
        },
      ],
    },
  ],

  // Learn sidebar (was Academy — consolidated learning)
  academySidebar: [
    {
      type: 'doc',
      id: 'academy/index',
      label: 'Learning Center',
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
