---
title: "Skills, Plugins & Marketplaces Explained"
description: "The definitive guide to Claude Code skills, plugins, and marketplaces — what they are, how they relate, and how SpecWeave uses them at scale"
keywords: [skills, plugins, marketplace, SKILL.md, plugin.json, marketplace.json, claude code, fundamentals]
---

# Skills, Plugins & Marketplaces Explained

There's a lot of confusion around skills, plugins, and marketplaces in Claude Code. This guide clears it up with a practical lens — including how SpecWeave uses all three at scale.

:::tip TL;DR
**Skill** = a markdown file with instructions for Claude. **Plugin** = a package of skills + agents + hooks. **Marketplace** = a catalog of plugins. **Command** = the old name for skills. Every skill can be invoked three ways: **natural language**, **slash command** (`sw:name`), or **CLI keyword** (`name`).
:::

---

## The 4 Concepts

| Concept | What It Is | File | Analogy |
|---------|-----------|------|---------|
| **Skill** | A `SKILL.md` file with instructions | `SKILL.md` | An app |
| **Plugin** | A directory bundling skills + agents + hooks + MCP | `plugin.json` | An app bundle |
| **Marketplace** | A JSON catalog listing available plugins | `marketplace.json` | An app store |
| **Command** | Legacy name for skills (`.claude/commands/*.md`) | `*.md` | Same as skill |

**The hierarchy**: Marketplace contains Plugins, each Plugin contains Skills.

```mermaid
flowchart LR
    MP["Marketplace<br/>(marketplace.json)"] --> P1["Plugin A<br/>(plugin.json)"]
    MP --> P2["Plugin B<br/>(plugin.json)"]
    P1 --> S1["Skill 1<br/>(SKILL.md)"]
    P1 --> S2["Skill 2<br/>(SKILL.md)"]
    P1 --> A1["Agent<br/>(agent.md)"]
    P2 --> S3["Skill 3<br/>(SKILL.md)"]
    P2 --> H1["Hooks<br/>(hooks.json)"]
```

---

## Skills — The Building Block

**A skill is a `SKILL.md` file with instructions — Claude adds it to its toolkit, uses it automatically when relevant, or you invoke it directly with `/skill-name`.** It's a detailed playbook written in markdown.

### Where Skills Live

Where you store a skill determines who can use it:

| Location | Path | Scope |
|----------|------|-------|
| **Personal** | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| **Project** | `.claude/skills/<name>/SKILL.md` | This repo only |
| **Plugin** | `<plugin>/skills/<name>/SKILL.md` | Where plugin is installed |
| **Enterprise** | Managed settings | Entire organization |

Higher-priority locations win: Enterprise > Personal > Project. Plugin skills use namespacing (`/plugin:skill`), so they never conflict with other levels.

### Anatomy of a SKILL.md

Every skill has two parts: **YAML frontmatter** (configuration) and **markdown body** (instructions).

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
allowed-tools: Bash, Read
model: opus
context: fork
agent: Explore
argument-hint: "[environment]"
hooks:
  PostToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: echo "Deploy completed"
---

Deploy $ARGUMENTS to production:

1. Run the test suite
2. Build the application
3. Push to the deployment target
4. Verify the deployment succeeded
```

### Frontmatter Fields

| Field | What It Does |
|-------|-------------|
| `name` | Display name, becomes the `/slash-command` |
| `description` | Tells Claude when to auto-activate this skill |
| `disable-model-invocation` | `true` = only YOU can invoke (Claude cannot auto-trigger) |
| `user-invocable` | `false` = hidden from `/` menu (background knowledge only) |
| `allowed-tools` | Restrict which tools Claude can use |
| `model` | Which model to use (`opus`, `sonnet`, `haiku`) |
| `context` | `fork` = runs in an isolated subagent |
| `agent` | Which agent type for the fork (`Explore`, `Plan`, etc.) |
| `argument-hint` | Autocomplete hint shown in UI |
| `hooks` | Lifecycle hooks scoped to this skill |

### Three Invocation Methods

Skills can be triggered three ways:

**1. Natural language** (easiest) -- just describe what you want:

```
"Let's design the authentication architecture"
         ↓
Claude matches "architecture" → sw:architect skill activates
```

**2. Slash command** (precise) -- type `/skill-name` in Claude Code:

```
sw:architect
/deploy staging
```

**3. CLI keyword** (cross-tool) -- type the skill name in Cursor, Copilot, and other AI tools:

```
architect
deploy staging
```

### Controlling Who Can Invoke

| Frontmatter | You Can Invoke | Claude Can Invoke | Use Case |
|-------------|---------------|-------------------|----------|
| (default) | Yes | Yes | Most skills |
| `disable-model-invocation: true` | Yes | No | Dangerous ops (deploy, commit) |
| `user-invocable: false` | No | Yes | Background knowledge |

### Arguments and Dynamic Context

**Arguments** — use `$ARGUMENTS` (or `$0`, `$1` for positional):

```yaml
---
name: fix-issue
description: Fix a GitHub issue
---

Fix GitHub issue $ARGUMENTS following our coding standards.
```

Running `/fix-issue 123` sends "Fix GitHub issue 123..."

**Dynamic context injection** — Claude Code's built-in `` !`command` `` syntax runs shell commands before Claude sees the content:

```yaml
---
name: pr-summary
description: Summarize a pull request
---

PR diff: !`gh pr diff`
Changed files: !`gh pr diff --name-only`

Summarize this pull request.
```

The shell output replaces the placeholder. Claude only sees the final rendered prompt.

### Supporting Files

Skills can include a directory of files, not just `SKILL.md`:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output
└── scripts/
    └── validate.sh    # Script Claude can execute
```

Reference them from `SKILL.md` so Claude knows when to load them.

### Commands = Legacy Skills

Files in `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work the same way. Commands are the old format — skills are recommended because they support directories with supporting files and additional frontmatter features.

---

## Plugins — The Distribution Package

A plugin bundles **multiple skills + agents + hooks + MCP servers** into one installable package.

### Plugin Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Manifest (required)
├── skills/                  # Skills (SKILL.md files)
│   ├── code-review/
│   │   └── SKILL.md
│   └── deploy/
│       └── SKILL.md
├── agents/                  # Custom subagent definitions
├── hooks/                   # Event handlers
│   └── hooks.json
├── .mcp.json                # MCP server configs
├── .lsp.json                # LSP server configs
└── settings.json            # Default settings
```

:::warning Common Mistake
Don't put `skills/`, `agents/`, `hooks/` inside `.claude-plugin/`. Only `plugin.json` goes there. Everything else lives at the plugin root.
:::

### Plugin Manifest

The manifest at `.claude-plugin/plugin.json` defines your plugin's identity:

```json
{
  "name": "my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### Namespacing

Plugin skills are always prefixed with the plugin name to prevent conflicts:

```
/my-plugin:code-review     ← skill "code-review" from plugin "my-plugin"
/my-plugin:deploy           ← skill "deploy" from plugin "my-plugin"
```

If two plugins both have a "deploy" skill, they become `/plugin-a:deploy` and `/plugin-b:deploy`. No collision.

### Testing Locally

Use `--plugin-dir` to load a plugin during development without installing it:

```bash
claude --plugin-dir ./my-plugin
```

---

## Marketplaces — The Distribution Channel

A marketplace is a **JSON catalog** that lists plugins and tells Claude Code where to download them.

### Marketplace File

Create `.claude-plugin/marketplace.json` in your repository root:

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "review-plugin",
      "source": "./plugins/review-plugin",
      "description": "Code review tools",
      "version": "1.0.0",
      "category": "development"
    },
    {
      "name": "deploy-tools",
      "source": {
        "source": "github",
        "repo": "company/deploy-plugin"
      },
      "description": "Deployment automation"
    }
  ]
}
```

### Plugin Sources

Each plugin entry specifies where to fetch it from:

| Source Type | Format | Example |
|------------|--------|---------|
| **Relative path** | `"./plugins/my-plugin"` | Plugin in same repo |
| **GitHub** | `{ "source": "github", "repo": "owner/repo" }` | Any GitHub repo |
| **Git URL** | `{ "source": "url", "url": "https://gitlab.com/...git" }` | Any Git host |
| **npm** | `{ "source": "npm", "package": "pkg-name" }` | npm registry |

### The User Flow

**Claude Code native plugins** (Claude Code only):
```bash
# Step 1: Add the marketplace (registers the catalog)
/plugin marketplace add owner/repo

# Step 2: Browse what's available
/plugin                          # opens interactive UI

# Step 3: Install a plugin
/plugin install plugin-name@marketplace-name

# Step 4: Use the skills
/plugin-name:skill-name
```

**vskill** (works across 49 AI agents — Claude Code, Cursor, Copilot, etc.):
```bash
# Install a plugin from a marketplace repo
npx vskill install --repo anton-abyzov/vskill --plugin mobile

# Install a standalone skill from GitHub
npx vskill install anton-abyzov/vskill
```

:::tip
The Claude Code native plugin system and `vskill` serve complementary roles. Native plugins integrate deeply with Claude Code's UI. `vskill` provides cross-agent installation with security scanning. See the **[Installing Skills](/docs/skills/installation)** guide for the full walkthrough, and the **[vskill CLI Reference](/docs/skills/vskill-cli)** for all commands.
:::

### Official Marketplace

The official Anthropic marketplace (`claude-plugins-official`) comes pre-configured. It includes:

- **Code intelligence** — LSP plugins for TypeScript, Python, Rust, Go, etc.
- **External integrations** — GitHub, Slack, Jira, Figma, Vercel, Sentry
- **Workflow tools** — commit commands, PR review toolkit

### Where Installed Plugins Live

```
~/.claude/plugins/
├── installed_plugins.json     # Registry of what's installed
└── cache/                     # Cached plugin files
    └── marketplace-name/
        └── plugin-name/
            └── version/
                ├── .claude-plugin/plugin.json
                └── skills/...
```

---

## Real-World Example: SpecWeave

SpecWeave is delivered as Claude Code plugins through two marketplaces. Here's what that looks like at scale.

### The Marketplaces

**SpecWeave marketplace** (`anton-abyzov/specweave`) ships **1 unified plugin** with **44 skills**:

| Plugin | Skills | Domain |
|--------|--------|--------|
| `sw` (unified) | 44 | Core lifecycle, PM, Architect, TDD, team orchestration, GitHub/JIRA/ADO sync, release management, diagrams, AI media |

**vskill marketplace** (`anton-abyzov/vskill`) provides **5 additional domain plugins**:

| Plugin | Skills | Domain |
|--------|--------|--------|
| `mobile` | 1 | App Store Connect automation |
| `skills` | 1 | Skill discovery and evaluation (scout) |
| `marketing` | 3 | Social media posting, Slack messaging, Chrome automation |
| `productivity` | 1 | Expert network survey automation |
| `google-workspace` | 3 | Google Workspace CLI (Gmail, Drive, Sheets, Docs, Calendar) |

Beyond these bundled plugins, **100,000+ community skills** are available via the [verified-skill.com](https://verified-skill.com) registry.

### Simple vs Complex Skills

**A simple domain skill** has minimal frontmatter — just description and tools:

```yaml
---
description: Node.js/TypeScript backend developer for Express, Fastify, NestJS...
allowed-tools: Read, Write, Edit, Bash
model: opus
---

When building Node.js APIs, follow these patterns:
[detailed instructions...]
```

**A complex workflow skill** uses hooks, dynamic context, and subagent forking:

```yaml
---
description: Plan and create SpecWeave increments
argument-hint: "<feature-description>"
context: fork
model: opus
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash hooks/guards/template-enforcement.sh
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash hooks/guards/duplicate-guard.sh
---
```

### Skill Chaining

Skills invoke other skills for multi-step workflows:

```
sw:increment "user auth"
    → sw:pm skill activates (Product Manager writes spec)
        → sw:architect skill activates (designs the system)
            → backend:nodejs activates (implements)
```

### Dynamic Context Injection

SpecWeave skills inject project-specific overrides at load time using dynamic context injection blocks:

```yaml
## Your Project's Customizations
!`for d in .specweave/skill-memories .claude/skill-memories; do
  [ -f "$d/pm.md" ] && cat "$d/pm.md"
done`
```

This loads "skill memories" — corrections you've made that persist across sessions. You tell Claude "use React Hook Form" once, and it remembers next time the PM skill activates.

### Plugins Load On-Demand

Domain plugins load based on what you're working on:

- Say "mobile app" → `mobile` activates
- Say "post on social media" → `marketing` activates
- Say "Google Drive" → `google-workspace` activates

---

## Key Takeaways

1. **Skill = just a SKILL.md file** -- instructions for Claude in markdown
2. **Plugin = a package** -- bundles skills + agents + hooks with a `plugin.json` manifest
3. **Marketplace = a catalog** -- lists plugins and where to download them via `marketplace.json`
4. **Commands = old name for skills** -- `.claude/commands/` still works, but skills are the current standard
5. **Namespacing prevents conflicts** -- plugin skills become `/plugin:skill`
6. **Three invocation methods** -- natural language (auto-trigger), slash command (`sw:name`), or CLI keyword (`name` in other AI tools)
7. **Real scale** -- SpecWeave ships 44 skills in 1 unified plugin, plus 5 domain plugins via vskill and 100,000+ community skills

---

## Next Steps

- [Extensible Skills](/docs/skills/extensible/) — How to customize skills for your project
- [Verified Skills](/docs/skills/verified/) — How to evaluate skill security and trust
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) — Official Anthropic documentation
- [Claude Code Plugins Docs](https://code.claude.com/docs/en/plugins) — Creating and distributing plugins
- [All 100+ SpecWeave Skills](/docs/reference/skills) — Browse the complete catalog
- [verified-skill.com](https://verified-skill.com) — The trusted skill registry
