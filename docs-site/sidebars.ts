import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * SpecWeave Documentation Sidebars
 *
 * Restructured with Diataxis hierarchy (increment 0567-verified-skill-docs-redesign).
 * Expanded with orphan surface + Dashboard section (increment 0585-docs-site-redesign).
 * Skills and Reference folded into docsSidebar. Academy remains as "Learn" top-nav.
 * All existing doc URLs preserved — sidebar-only restructure.
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar — Diataxis hierarchy
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        {type: 'doc', id: 'overview/introduction', label: 'What is SpecWeave?'},
        {type: 'doc', id: 'overview/skills-as-structured-expertise', label: 'Skills Are Structured Expertise'},
        {type: 'doc', id: 'overview/why-specweave', label: 'Why SpecWeave?'},
        {type: 'doc', id: 'overview/ai-revolution-context', label: 'The AI Revolution'},
        {type: 'doc', id: 'overview/no-docs-needed', label: 'Start Building in Minutes'},
        {type: 'doc', id: 'overview/claude-code-basics', label: 'Claude Code Basics'},
        {type: 'doc', id: 'overview/claude-code-architecture', label: 'Claude Code Architecture'},
        {type: 'doc', id: 'overview/features', label: 'Key Features'},
        {type: 'doc', id: 'overview/plugins-ecosystem', label: 'Skills & Capabilities'},
        {type: 'doc', id: 'overview/philosophy', label: 'Philosophy'},
        {type: 'doc', id: 'overview/dogfooding', label: 'Dogfooding'},
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
        {type: 'doc', id: 'guides/core-concepts/who-benefits-from-living-docs', label: 'Who Benefits from Living Docs?'},
        {type: 'doc', id: 'guides/core-concepts/skills-first-architecture', label: 'Skills-First Architecture'},
        {type: 'doc', id: 'guides/core-concepts/background-jobs', label: 'Background Jobs'},
        {type: 'doc', id: 'guides/core-concepts/deterministic-llm-hybrid', label: 'Deterministic Config + LLM Execution'},
      ],
    },
    {
      type: 'category',
      label: 'Skills',
      collapsed: true,
      items: [
        {type: 'doc', id: 'skills/index', label: 'Skills Overview'},
        {type: 'doc', id: 'skills/why-skills-matter', label: 'Why Skills Matter'},
        {type: 'doc', id: 'skills/fundamentals', label: 'Skills, Plugins & Marketplaces'},
        {type: 'doc', id: 'skills/installation', label: 'Installing Skills'},
        {type: 'doc', id: 'skills/skill-studio', label: 'Skill Studio'},
        {type: 'doc', id: 'skills/skill-discovery-evaluation', label: 'Skill Discovery'},
        {type: 'doc', id: 'skills/skill-contradiction-resolution', label: 'Contradiction Resolution'},
        {
          type: 'category',
          label: 'Extensible Skills',
          collapsed: true,
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
          collapsed: true,
          link: {type: 'doc', id: 'skills/verified/index'},
          items: [
            {type: 'doc', id: 'skills/verified/verified-skills', label: 'The Standard (3-Tier Trust)'},
            {type: 'doc', id: 'skills/verified/secure-skill-factory-standard', label: 'Skill Factory RFC'},
            {type: 'doc', id: 'skills/verified/skills-ecosystem-security', label: 'Security Landscape'},
          ],
        },
        {type: 'doc', id: 'skills/vskill-cli', label: 'vskill CLI Reference'},
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
        {type: 'doc', id: 'guides/deep-interview-mode', label: 'Deep Interview Mode'},
        {type: 'doc', id: 'workflows/implementation', label: 'Implementation'},
        {type: 'doc', id: 'workflows/validation', label: 'Validation'},
        {type: 'doc', id: 'workflows/deployment', label: 'Deployment'},
        {type: 'doc', id: 'workflows/brownfield', label: 'Brownfield Projects'},
        {type: 'doc', id: 'workflows/hotfix', label: 'Hotfix'},
        {type: 'doc', id: 'workflows/greenfield', label: 'Greenfield'},
        {type: 'doc', id: 'workflows/research', label: 'Research'},
        {type: 'doc', id: 'workflows/design', label: 'Design'},
      ],
    },
    {
      type: 'category',
      label: 'Dashboard & Observability',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/analytics-dashboard', label: 'Dashboard Overview'},
        {type: 'doc', id: 'guides/dashboard/errors', label: 'Error Tracing'},
        {type: 'doc', id: 'guides/dashboard/sync', label: 'Sync Audit'},
        {type: 'doc', id: 'guides/dashboard/activity', label: 'Activity Stream'},
        {type: 'doc', id: 'guides/dashboard/config', label: 'Config Editor'},
        {type: 'doc', id: 'guides/dashboard/services', label: 'Service Management'},
        {type: 'doc', id: 'guides/dashboard/notifications', label: 'Notifications'},
        {type: 'doc', id: 'guides/dashboard/marketplace', label: 'Marketplace Scanner'},
        {type: 'doc', id: 'guides/dashboard/plugins', label: 'Plugins'},
        {type: 'doc', id: 'guides/dashboard/agents', label: 'Agents'},
        {type: 'doc', id: 'guides/dashboard/hooks', label: 'Hooks'},
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
        {type: 'doc', id: 'integrations/generic-ai-tools', label: 'Other AI Tools'},
        {
          type: 'category',
          label: 'Sync Deep Dives',
          collapsed: true,
          items: [
            {type: 'doc', id: 'guides/sync-strategies', label: 'Sync Strategies'},
            {type: 'doc', id: 'guides/sync-configuration', label: 'Sync Configuration'},
            {type: 'doc', id: 'guides/spec-bidirectional-sync', label: 'Bidirectional Spec Sync'},
            {type: 'doc', id: 'guides/spec-commit-sync', label: 'Commit Traceability Sync'},
            {type: 'doc', id: 'guides/status-sync-guide', label: 'Status Sync'},
            {type: 'doc', id: 'guides/status-sync-migration', label: 'Status Sync Migration'},
            {type: 'doc', id: 'guides/multi-project-sync-architecture', label: 'Multi-Project Sync'},
            {type: 'doc', id: 'guides/umbrella-sync-routing', label: 'Umbrella Sync Routing'},
            {type: 'doc', id: 'guides/hierarchy-mapping', label: 'Hierarchy Mapping'},
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Agent Teams',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/agent-teams-and-swarms', label: 'Teams & Swarms'},
        {type: 'link', label: 'Team-Lead Orchestration', href: '/docs/guides/agent-teams-and-swarms#team-lead-orchestration'},
        {type: 'doc', id: 'guides/autonomous-execution', label: 'Autonomous Execution'},
        {type: 'doc', id: 'guides/multi-project-setup', label: 'Multi-Project Setup'},
        {type: 'doc', id: 'guides/openclaw-agent-setup', label: 'OpenClaw Agent Setup'},
        {type: 'doc', id: 'guides/agent-security-best-practices', label: 'Agent Security'},
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/best-practices', label: 'Best Practices'},
        {type: 'doc', id: 'guides/backlog-management', label: 'Backlog Management'},
        {type: 'doc', id: 'guides/model-selection', label: 'Model Selection'},
        {type: 'doc', id: 'guides/compliance-standards', label: 'Compliance Standards'},
        {type: 'doc', id: 'guides/strategic-init', label: 'Strategic Init'},
        {type: 'doc', id: 'guides/bidirectional-linking', label: 'Bidirectional Linking'},
        {type: 'doc', id: 'guides/lsp-integration', label: 'LSP Integration'},
        {type: 'doc', id: 'guides/multilingual-guide', label: 'Multilingual Support'},
        {
          type: 'category',
          label: 'Advanced Topics',
          collapsed: true,
          items: [
            {type: 'doc', id: 'guides/plugin-management', label: 'Plugin Management'},
            {type: 'doc', id: 'guides/lazy-plugin-loading', label: 'Lazy Plugin Loading'},
            {type: 'doc', id: 'guides/repository-selection', label: 'Repository Selection'},
            {type: 'doc', id: 'guides/scheduling-and-planning', label: 'Scheduling & Planning'},
            {type: 'doc', id: 'guides/specs-organization-guide', label: 'Specs Organization'},
            {type: 'doc', id: 'guides/increment-status-reference', label: 'Increment Status Reference'},
            {type: 'doc', id: 'guides/project-specific-tasks', label: 'Project-Specific Tasks'},
            {type: 'doc', id: 'guides/meta-capability', label: 'Meta-Capability'},
            {type: 'doc', id: 'guides/github-action-setup', label: 'GitHub Actions CI/CD'},
          ],
        },
        {
          type: 'category',
          label: 'Learning & Comparison',
          collapsed: true,
          items: [
            {type: 'doc', id: 'guides/specweave-learning-journey', label: 'Learning Journey'},
            {type: 'doc', id: 'guides/specweave-vs-speckit', label: 'SpecWeave vs SpecKit'},
            {type: 'doc', id: 'guides/ai-coding-benchmarks', label: 'AI Coding Benchmarks'},
            {type: 'doc', id: 'guides/why-verified-skill-matters', label: 'Why Verification Matters'},
          ],
        },
        {
          type: 'category',
          label: 'Platform-Specific',
          collapsed: true,
          items: [
            {type: 'doc', id: 'guides/mobile/react-native-setup-guide', label: 'React Native Setup'},
            {type: 'doc', id: 'guides/ado-multi-project-migration', label: 'ADO Multi-Project Migration'},
            {type: 'doc', id: 'guides/deployment-platforms', label: 'Deployment Platforms'},
          ],
        },
        {type: 'doc', id: 'guides/agent-skills-extensibility-analysis', label: 'Agent-Skills Extensibility'},
        {type: 'doc', id: 'guides/command-reference-by-priority', label: 'Commands by Priority'},
        {type: 'doc', id: 'guides/life-automation', label: 'Life Automation'},
        {
          type: 'category',
          label: 'Troubleshooting',
          collapsed: true,
          link: {type: 'doc', id: 'guides/troubleshooting/index'},
          items: [
            {type: 'doc', id: 'guides/troubleshooting/common-errors', label: 'Common Errors'},
            {type: 'doc', id: 'guides/troubleshooting/emergency-recovery', label: 'Emergency Recovery'},
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        {type: 'doc', id: 'reference/index', label: 'Reference Overview'},
        {
          type: 'category',
          label: 'Commands',
          collapsed: true,
          items: [
            {type: 'doc', id: 'commands/overview', label: 'Command Overview'},
            {type: 'doc', id: 'reference/command-decision-tree', label: 'Decision Tree'},
            {type: 'doc', id: 'reference/commands', label: 'Commands Reference'},
            {type: 'doc', id: 'commands/do', label: 'sw:do'},
            {type: 'doc', id: 'commands/auto', label: 'sw:auto'},
            {type: 'doc', id: 'commands/auto-status', label: 'sw:auto-status'},
            {type: 'doc', id: 'commands/cancel-auto', label: 'sw:cancel-auto'},
            {type: 'doc', id: 'commands/save', label: 'sw:save'},
            {type: 'doc', id: 'commands/jobs', label: 'sw:jobs'},
            {type: 'doc', id: 'commands/pause', label: 'sw:pause'},
            {type: 'doc', id: 'commands/resume', label: 'sw:resume'},
            {type: 'doc', id: 'commands/abandon', label: 'sw:abandon'},
            {type: 'doc', id: 'commands/status', label: 'sw:status'},
            {type: 'doc', id: 'commands/status-management', label: 'Status Management'},
          ],
        },
        {
          type: 'category',
          label: 'Skills & Cost',
          collapsed: true,
          items: [
            {type: 'doc', id: 'reference/skills', label: 'Skills Reference (~100+)'},
            {type: 'doc', id: 'reference/use-case-guide', label: 'Use Case Guide'},
            {type: 'doc', id: 'reference/cost-tracking', label: 'Cost Tracking'},
          ],
        },
        {type: 'doc', id: 'reference/configuration', label: 'Configuration'},
        {type: 'doc', id: 'reference/metadata-reference', label: 'Metadata Reference'},
        {type: 'doc', id: 'reference/changelog', label: 'Changelog'},
        {
          type: 'category',
          label: 'Migration Guides',
          collapsed: true,
          items: [
            {type: 'doc', id: 'guides/migration-v024', label: 'v0.23 to v0.24'},
            {type: 'doc', id: 'guides/migration-v031-project-fields', label: 'v0.31 Project Fields'},
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
    {
      type: 'doc',
      id: 'examples/index',
      label: 'Examples',
    },
  ],

  // Academy sidebar — "Learn" top-nav item
  academySidebar: [
    {type: 'doc', id: 'academy/index', label: 'Learning Center'},
    {
      type: 'category',
      label: 'Video Tutorials',
      collapsed: false,
      link: {type: 'doc', id: 'academy/videos/index'},
      items: [{type: 'autogenerated', dirName: 'academy/videos'}],
    },
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
        {type: 'doc', id: 'enterprise/knowledge-transfer-migration', label: 'Knowledge Transfer'},
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

  // Glossary sidebar (standalone for direct access)
  glossarySidebar: [
    {type: 'doc', id: 'glossary/overview', label: 'Glossary Overview'},
    {type: 'doc', id: 'glossary/index-by-category', label: 'By Category'},
    {
      type: 'category',
      label: 'All Terms (A-Z)',
      collapsed: false,
      items: [{type: 'autogenerated', dirName: 'glossary/terms'}],
    },
  ],
};

export default sidebars;
