import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * SpecWeave Documentation Sidebars
 *
 * 6 sidebars, 9 top-level categories in docsSidebar, max 2 depth levels.
 * Restructured 2026-03-17 (increment 0556-docs-overhaul).
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar — 9 top-level categories
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        {type: 'doc', id: 'overview/introduction', label: 'What is SpecWeave?'},
        {type: 'doc', id: 'overview/skills-as-structured-expertise', label: 'Skills Are Structured Expertise'},
        {type: 'doc', id: 'overview/why-specweave', label: 'Why SpecWeave?'},
        {type: 'doc', id: 'overview/no-docs-needed', label: "You Don't Need Claude Code Docs"},
        {type: 'doc', id: 'overview/claude-code-basics', label: 'Claude Code Basics'},
        {type: 'doc', id: 'overview/claude-code-architecture', label: 'Claude Code Architecture'},
        {type: 'doc', id: 'overview/features', label: 'Key Features'},
        {type: 'doc', id: 'overview/plugins-ecosystem', label: 'Plugin Ecosystem'},
        {type: 'doc', id: 'overview/philosophy', label: 'Philosophy'},
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        {type: 'doc', id: 'getting-started/index', label: 'Quick Start'},
        {type: 'doc', id: 'getting-started/installation', label: 'Installation'},
        {type: 'doc', id: 'getting-started/first-increment', label: 'Your First Increment'},
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        {type: 'doc', id: 'guides/core-concepts/what-is-an-increment', label: 'What is an Increment?'},
        {type: 'doc', id: 'guides/core-concepts/living-documentation', label: 'Living Documentation'},
        {type: 'doc', id: 'guides/core-concepts/skills-first-architecture', label: 'Skills-First Architecture'},
        {type: 'doc', id: 'guides/core-concepts/background-jobs', label: 'Background Jobs'},
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        {type: 'doc', id: 'workflows/overview', label: 'Complete Journey'},
        {type: 'doc', id: 'guides/brainstorming', label: 'Brainstorming'},
        {type: 'doc', id: 'workflows/planning', label: 'Planning'},
        {type: 'doc', id: 'workflows/implementation', label: 'Implementation'},
        {type: 'doc', id: 'workflows/validation', label: 'Validation'},
        {type: 'doc', id: 'workflows/deployment', label: 'Deployment'},
        {type: 'doc', id: 'workflows/brownfield', label: 'Brownfield Projects'},
        {type: 'doc', id: 'workflows/hotfix', label: 'Hotfix'},
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/integrations/external-tools-overview', label: 'External Tools Overview'},
        {type: 'doc', id: 'guides/integrations/issue-trackers', label: 'Issue Trackers'},
        {type: 'doc', id: 'guides/github-integration', label: 'GitHub Integration'},
        {type: 'doc', id: 'guides/external-tool-sync', label: 'External Tool Sync'},
      ],
    },
    {
      type: 'category',
      label: 'Agent Teams',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/agent-teams-and-swarms', label: 'Teams & Swarms'},
        {type: 'doc', id: 'guides/autonomous-execution', label: 'Autonomous Execution'},
        {type: 'doc', id: 'guides/multi-project-setup', label: 'Multi-Project Setup'},
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/best-practices', label: 'Best Practices'},
        {type: 'doc', id: 'guides/model-selection', label: 'Model Selection'},
        {type: 'doc', id: 'guides/compliance-standards', label: 'Compliance Standards'},
        {type: 'doc', id: 'guides/strategic-init', label: 'Strategic Init'},
        {type: 'doc', id: 'guides/bidirectional-linking', label: 'Bidirectional Linking'},
        {type: 'doc', id: 'guides/lsp-integration', label: 'LSP Integration'},
        {type: 'doc', id: 'guides/troubleshooting/index', label: 'Troubleshooting'},
      ],
    },
    {
      type: 'doc',
      id: 'metrics',
      label: 'DORA Metrics',
    },
    {
      type: 'doc',
      id: 'faq',
      label: 'FAQ',
    },
  ],

  // Skills sidebar
  skillsSidebar: [
    {type: 'doc', id: 'skills/index', label: 'Skills Overview'},
    {type: 'doc', id: 'skills/why-skills-matter', label: 'Why Skills Matter'},
    {type: 'doc', id: 'skills/fundamentals', label: 'Skills, Plugins & Marketplaces'},
    {type: 'doc', id: 'skills/installation', label: 'Installing Skills'},
    {type: 'doc', id: 'skills/skill-studio', label: 'Skill Studio'},
    {
      type: 'category',
      label: 'Extensible Skills',
      collapsed: false,
      link: {type: 'doc', id: 'skills/extensible/index'},
      items: [
        {type: 'doc', id: 'skills/extensible/extensible-skills-standard', label: 'Extensibility Standard'},
        {type: 'doc', id: 'skills/extensible/extensible-skills', label: 'Overview (Open/Closed)'},
        {type: 'doc', id: 'skills/extensible/self-improving-skills', label: 'Self-Improving Skills (Reflect)'},
        {type: 'doc', id: 'skills/extensible/skill-development-guidelines', label: 'Development Guidelines'},
        {type: 'doc', id: 'skills/extensible/skill-generation', label: 'Skill Generation'},
      ],
    },
    {
      type: 'category',
      label: 'Verified Skills Standard',
      collapsed: false,
      link: {type: 'doc', id: 'skills/verified/index'},
      items: [
        {type: 'doc', id: 'skills/verified/verified-skills', label: 'The Standard (3-Tier Trust)'},
        {type: 'doc', id: 'skills/verified/secure-skill-factory-standard', label: 'Skill Factory RFC'},
        {type: 'doc', id: 'skills/verified/skills-ecosystem-security', label: 'Security Landscape'},
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        {type: 'doc', id: 'reference/skills', label: 'All Skills (~48)'},
        {type: 'doc', id: 'skills/vskill-cli', label: 'vskill CLI Reference'},
        {type: 'link', label: 'verified-skill.com', href: 'https://verified-skill.com'},
      ],
    },
  ],

  // Academy sidebar
  academySidebar: [
    {type: 'doc', id: 'academy/index', label: 'Learning Center'},
    {
      type: 'category',
      label: 'SpecWeave Essentials',
      collapsed: false,
      items: [{type: 'autogenerated', dirName: 'academy/specweave-essentials'}],
    },
    {
      type: 'category',
      label: 'Public Talks',
      collapsed: true,
      items: [{type: 'autogenerated', dirName: 'academy/talks'}],
    },
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: true,
      items: [
        {type: 'doc', id: 'academy/fundamentals/index', label: 'Overview'},
        {type: 'doc', id: 'academy/fundamentals/software-engineering-roles', label: 'Software Engineering Roles'},
        {type: 'doc', id: 'academy/fundamentals/ai-development-fundamentals', label: 'AI Development'},
        {type: 'doc', id: 'academy/fundamentals/enterprise-app-development', label: 'Enterprise App Development'},
        {type: 'doc', id: 'academy/fundamentals/backend-fundamentals', label: 'Backend'},
        {type: 'doc', id: 'academy/fundamentals/frontend-fundamentals', label: 'Frontend'},
        {type: 'doc', id: 'academy/fundamentals/testing-fundamentals', label: 'Testing'},
        {type: 'doc', id: 'academy/fundamentals/iac-fundamentals', label: 'Infrastructure as Code'},
        {type: 'doc', id: 'academy/fundamentals/ml-fundamentals', label: 'ML/AI'},
        {type: 'doc', id: 'academy/fundamentals/security-fundamentals', label: 'Security'},
      ],
    },
  ],

  // Enterprise sidebar
  enterpriseSidebar: [
    {type: 'doc', id: 'enterprise/index', label: 'Enterprise Overview'},
    {
      type: 'category',
      label: 'Migration',
      collapsed: false,
      items: [
        {type: 'doc', id: 'enterprise/github-migration', label: 'GitHub Enterprise'},
        {type: 'doc', id: 'enterprise/jira-migration', label: 'JIRA Enterprise'},
        {type: 'doc', id: 'enterprise/azure-devops-migration', label: 'Azure DevOps'},
        {type: 'doc', id: 'enterprise/case-study-migration', label: 'Case Study'},
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: false,
      items: [
        {type: 'doc', id: 'enterprise/multi-environment-deployment', label: 'Multi-Environment'},
        {type: 'doc', id: 'enterprise/release-management', label: 'Release Management'},
        {type: 'doc', id: 'enterprise/monolith-to-microservices', label: 'Monolith to Microservices'},
      ],
    },
  ],

  // Reference sidebar
  referenceSidebar: [
    {type: 'doc', id: 'reference/index', label: 'Reference Overview'},
    {
      type: 'category',
      label: 'Commands',
      collapsed: false,
      items: [
        {type: 'doc', id: 'commands/overview', label: 'Command Overview'},
        {type: 'doc', id: 'reference/command-decision-tree', label: 'Decision Tree'},
        {type: 'doc', id: 'reference/commands', label: 'Commands Reference'},
      ],
    },
    {
      type: 'category',
      label: 'Skills & Cost',
      collapsed: false,
      items: [
        {type: 'doc', id: 'reference/skills', label: 'Skills Reference (~48)'},
        {type: 'doc', id: 'reference/use-case-guide', label: 'Use Case Guide'},
        {type: 'doc', id: 'reference/cost-tracking', label: 'Cost Tracking'},
      ],
    },
    {
      type: 'category',
      label: 'Glossary',
      collapsed: true,
      items: [
        {type: 'doc', id: 'glossary/overview', label: 'Glossary Overview'},
        {type: 'autogenerated', dirName: 'glossary/terms'},
      ],
    },
  ],

  // Glossary sidebar (standalone for direct access)
  glossarySidebar: [
    {type: 'doc', id: 'glossary/overview', label: 'Glossary Overview'},
    {
      type: 'category',
      label: 'Categories',
      collapsed: false,
      items: [{type: 'autogenerated', dirName: 'glossary/categories'}],
    },
    {
      type: 'category',
      label: 'All Terms (A-Z)',
      collapsed: true,
      items: [{type: 'autogenerated', dirName: 'glossary/terms'}],
    },
  ],
};

export default sidebars;
