import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * SpecWeave 3.0 documentation.
 *
 * Ordered the way a new reader needs it: what it is, install, the concepts,
 * the daily loop, switching tools, integrations, then reference. Pages that
 * described removed commands or the 2.x file layout were deleted; their old
 * URLs redirect from docusaurus.config.ts.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Start here',
      collapsed: false,
      items: [
        {type: 'doc', id: 'overview/introduction', label: 'What is SpecWeave?'},
        {type: 'doc', id: 'getting-started/index', label: 'Quick start'},
        {type: 'doc', id: 'getting-started/installation', label: 'Installation'},
        {type: 'doc', id: 'getting-started/first-increment', label: 'Your first increment'},
        {type: 'doc', id: 'guides/specweave-3', label: 'What changed in 3.0'},
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        {type: 'doc', id: 'overview/how-it-works', label: 'How it works'},
        {type: 'doc', id: 'guides/core-concepts/what-is-an-increment', label: 'Increments'},
        {type: 'doc', id: 'guides/increment-status-reference', label: 'Increment status'},
        {type: 'doc', id: 'overview/why-specweave', label: 'Why SpecWeave'},
      ],
    },
    {
      type: 'category',
      label: 'Switch tools and accounts',
      collapsed: false,
      items: [
        {type: 'doc', id: 'guides/cross-tool-handoff', label: 'Handoff and pickup'},
        {type: 'doc', id: 'guides/claude-code-projects', label: 'Claude Code Projects'},
        {type: 'doc', id: 'integrations/generic-ai-tools', label: 'Codex, Grok and others'},
        {type: 'doc', id: 'guides/claude-code-vs-codex', label: 'Claude Code vs Codex'},
        {type: 'doc', id: 'guides/agents-md-vs-claude-md', label: 'AGENTS.md vs CLAUDE.md'},
        {type: 'doc', id: 'guides/model-selection', label: 'Models and execution context'},
        {type: 'doc', id: 'guides/portable-projects', label: 'Project hub'},
      ],
    },
    {
      type: 'category',
      label: 'Working with SpecWeave',
      collapsed: false,
      items: [
        {type: 'doc', id: 'workflows/overview', label: 'The daily loop'},
        {type: 'doc', id: 'workflows/brownfield', label: 'Existing codebases'},
        {type: 'doc', id: 'guides/autonomous-execution', label: 'Autonomous mode'},
        {type: 'doc', id: 'guides/agent-teams-and-swarms', label: 'Agent teams'},
        {type: 'doc', id: 'guides/dashboard', label: 'Dashboard'},
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      collapsed: true,
      link: {type: 'doc', id: 'integrations/index'},
      items: [
        {type: 'doc', id: 'guides/github-sync', label: 'GitHub'},
        {type: 'doc', id: 'guides/jira-ado-sync', label: 'Jira and Azure DevOps'},
        {type: 'doc', id: 'guides/jev-system-one', label: 'Jev (System One)'},
        {type: 'doc', id: 'guides/lsp-integration', label: 'LSP code intelligence'},
      ],
    },
    {
      type: 'category',
      label: 'Skills and Verified Skill',
      collapsed: true,
      link: {type: 'doc', id: 'skills/index'},
      items: [
        {type: 'doc', id: 'skills/why-skills-matter', label: 'Why skills matter'},
        {type: 'doc', id: 'skills/fundamentals', label: 'Skills, plugins and marketplaces'},
        {type: 'doc', id: 'skills/installation', label: 'Installing skills'},
        {type: 'doc', id: 'skills/vskill-cli', label: 'vskill CLI'},
        {type: 'doc', id: 'skills/skill-studio', label: 'Skill Studio'},
        {type: 'doc', id: 'skills/skill-discovery-evaluation', label: 'Skill discovery'},
        {type: 'doc', id: 'skills/skill-contradiction-resolution', label: 'Contradiction resolution'},
        {
          type: 'category',
          label: 'Extensible skills',
          collapsed: true,
          link: {type: 'doc', id: 'skills/extensible/index'},
          items: [
            {type: 'doc', id: 'skills/extensible/extensible-skills-standard', label: 'Extensibility standard'},
            {type: 'doc', id: 'skills/extensible/extensible-skills', label: 'Open/closed skills'},
            {type: 'doc', id: 'skills/extensible/skill-development-guidelines', label: 'Development guidelines'},
          ],
        },
        {
          type: 'category',
          label: 'Verified skills standard',
          collapsed: true,
          link: {type: 'doc', id: 'skills/verified/index'},
          items: [
            {type: 'doc', id: 'skills/verified/verified-skills', label: 'The standard'},
            {type: 'doc', id: 'skills/verified/secure-skill-factory-standard', label: 'Skill factory RFC'},
            {type: 'doc', id: 'skills/verified/skills-ecosystem-security', label: 'Security landscape'},
          ],
        },
        {type: 'doc', id: 'guides/why-verified-skill-matters', label: 'Why verification matters'},
        {type: 'doc', id: 'guides/agent-security-best-practices', label: 'Agent security'},
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      link: {type: 'doc', id: 'reference/index'},
      items: [
        {type: 'doc', id: 'reference/commands', label: 'Commands'},
        {type: 'doc', id: 'reference/skills', label: 'Skills'},
        {type: 'doc', id: 'reference/sync-cli', label: 'specweave sync'},
        {type: 'doc', id: 'reference/configuration', label: 'Configuration'},
        {type: 'doc', id: 'reference/metadata-reference', label: 'metadata.json and ledger'},
        {type: 'doc', id: 'reference/cost-tracking', label: 'Cost tracking'},
        {type: 'doc', id: 'reference/changelog', label: 'Changelog'},
        {
          type: 'category',
          label: 'Glossary',
          collapsed: true,
          link: {type: 'doc', id: 'glossary/overview'},
          items: [{type: 'autogenerated', dirName: 'glossary/terms'}],
        },
      ],
    },
    {
      type: 'category',
      label: 'Help and more',
      collapsed: true,
      items: [
        {type: 'doc', id: 'guides/troubleshooting/index', label: 'Troubleshooting'},
        {type: 'doc', id: 'faq', label: 'FAQ'},
        {type: 'doc', id: 'overview/dogfooding', label: 'Built with SpecWeave'},
        {type: 'doc', id: 'examples/index', label: 'Examples'},
        {type: 'doc', id: 'guides/spec-driven-tools-compared', label: 'Compared: OpenSpec, Spec Kit, BMAD, Kiro'},
        {type: 'doc', id: 'guides/specweave-vs-speckit', label: 'SpecWeave vs Spec Kit'},
        {type: 'doc', id: 'enterprise/index', label: 'Enterprise'},
        {type: 'doc', id: 'metrics', label: 'DORA metrics'},
      ],
    },
  ],
};

export default sidebars;
