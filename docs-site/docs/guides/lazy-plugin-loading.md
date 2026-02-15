# Lazy Plugin Loading (Upcoming v1.1)

**99% token reduction** for non-SpecWeave work through conditional plugin activation.

:::info Status
This feature is **planned for v1.1**. The specification is complete and approved. Track progress in [increment 0171](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0171-lazy-plugin-loading).
:::

## The Problem

Currently, SpecWeave installs **all 24 plugins** (~251 skills) at startup, consuming ~60,000 tokens even when you're doing non-SpecWeave work. This creates several issues:

| Problem | Impact |
|---------|--------|
| **Context bloat** | Only 108 of 251 skills (43%) are shown due to token limits |
| **Wasted tokens** | ~60,000 tokens consumed even when SpecWeave isn't needed |
| **Slower startup** | All plugins loaded regardless of user intent |
| **Reduced quality** | Important skills get truncated from context |

**Evidence**: `<!-- Showing 108 of 251 skills due to token limits -->` appears in system prompts.

## The Solution

A **lazy loading architecture** that:

1. Installs only a lightweight **router skill** (~500 tokens) by default
2. **Detects SpecWeave intent** from user prompts using keyword matching
3. **Hot-reloads full plugins** only when needed (leveraging Claude Code 2.1.0+ features)
4. Uses **context forking** for heavy skills to isolate their context
5. Provides **migration path** for existing installations

## Token Savings

| Scenario | Current | After v1.1 | Savings |
|----------|---------|------------|---------|
| Non-SpecWeave work | ~60,000 tokens | ~500 tokens | **99%** |
| SpecWeave work | ~60,000 tokens | ~60,000 (loaded on demand) | 0% |
| Mixed session | ~60,000 tokens | ~30,000 avg | **50%** |

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAZY LOADING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐ │
│  │  Router Skill    │     │  Skills Cache                         │ │
│  │  (~500 tokens)   │     │  ~/.specweave/skills-cache/           │ │
│  │                  │     │                                        │ │
│  │  - Keyword       │────▶│  ├── specweave/                       │ │
│  │    detection     │     │  │   ├── increment/                   │ │
│  │  - Install       │     │  │   ├── architect/                   │ │
│  │    trigger       │     │  │   └── ... (50+ skills)             │ │
│  │  - State track   │     │  ├── specweave-github/                │ │
│  └──────────────────┘     │  ├── specweave-jira/                  │ │
│           │               │  └── ... (24 plugins)                  │ │
│           │               └──────────────────────────────────────┘ │
│           │                              │                          │
│           ▼                              ▼                          │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐ │
│  │  Active Skills   │◀────│  Hot-Reload Copy                      │ │
│  │  ~/.claude/      │     │  (on detection)                       │ │
│  │  skills/         │     │                                        │ │
│  │                  │     │  cp -r cache/* ~/.claude/skills/      │ │
│  │  Loaded on       │     │  → Activates immediately              │ │
│  │  demand only     │     │  → No restart needed                  │ │
│  └──────────────────┘     └──────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Keyword Detection

The router skill detects SpecWeave intent using these keywords:

**Commands:**
- `/sw:`, `specweave`, `increment`

**Files:**
- `spec.md`, `tasks.md`, `plan.md`, `metadata.json`

**Concepts:**
- `living docs`, `living documentation`
- `feature planning`, `sprint planning`
- `acceptance criteria`, `user story`

**Workflow:**
- `backlog`, `kanban`, `scrum`

**Integrations:**
- `jira sync`, `github sync`, `ado sync`

**Advanced:**
- `auto mode`, `parallel auto`, `tdd mode`

Detection is **case-insensitive** and takes **under 50ms**.

### Claude Code Features Used

| Feature | Version | How We Use It |
|---------|---------|---------------|
| **Skill Hot-Reload** | 2.1.0 | Skills in `~/.claude/skills/` activate immediately without restart |
| **Context Forking** | 2.1.0 | `context: fork` runs heavy skills in isolated sub-agent |
| **Setup Hook** | 2.1.10 | Runs on `--init` for conditional plugin setup |
| **MCP list_changed** | 2.1.0 | Alternative: MCP server can dynamically update tools |
| **Nested Discovery** | 2.1.0 | Auto-discovers skills from `.claude/skills/` subdirectories |

## User Experience

### For New Users

After v1.1, `specweave init` will:

1. Install only the router skill (~500 tokens)
2. Cache full plugins at `~/.specweave/skills-cache/`
3. Inform user about lazy loading behavior
4. Full install option: `specweave init --full`

### For Existing Users

Lazy loading is now enabled by default. To force a full refresh:

```bash
specweave refresh-marketplace --force
```

### Manual Control

Power users can manually manage plugin loading using Claude's native plugin commands:

```bash
# Install plugins using SHORT names (RECOMMENDED)
claude plugin install sw@specweave           # Core Skill Fabric
claude plugin install sw-frontend@specweave  # Frontend development
claude plugin install sw-github@specweave    # GitHub integration
claude plugin install sw-jira@specweave      # JIRA integration

# Manage installed plugins
claude plugin list                           # Show all installed
claude plugin enable sw-frontend@specweave   # Enable plugin
claude plugin disable sw-frontend@specweave  # Disable plugin
claude plugin uninstall sw-testing@specweave # Remove plugin

# Update marketplace cache (if install fails)
claude plugin marketplace update specweave
```

**Available plugins:**

| Short Name | Install Command | Description |
|------------|-----------------|-------------|
| `sw` | `claude plugin install sw@specweave` | Core SpecWeave functionality |
| `sw-router` | `claude plugin install sw-router@specweave` | Agent routing |
| `sw-github` | `claude plugin install sw-github@specweave` | GitHub integration |
| `sw-jira` | `claude plugin install sw-jira@specweave` | JIRA integration |
| `sw-ado` | `claude plugin install sw-ado@specweave` | Azure DevOps integration |
| `sw-frontend` | `claude plugin install sw-frontend@specweave` | Frontend development |
| `sw-backend` | `claude plugin install sw-backend@specweave` | Backend development |
| `sw-infra` | `claude plugin install sw-infra@specweave` | Infrastructure/DevOps |
| `sw-ml` | `claude plugin install sw-ml@specweave` | Machine learning |
| `sw-testing` | `claude plugin install sw-testing@specweave` | Testing/QA |

## Context Forking for Heavy Skills

Skills larger than 200 lines will use `context: fork` in their frontmatter:

```yaml
---
name: pm
description: Product Manager expertise...
context: fork
model: opus
---
```

This runs the skill in an isolated sub-agent, preventing context bloat in the main conversation. Results return to the main conversation when the forked skill completes.

**Skills that will use forking:**
- PM Agent
- Architect Agent
- QA Lead Agent
- Tech Lead Agent
- TDD Orchestrator
- And 10+ more heavy skills

## State Tracking

Loading state is tracked at `~/.specweave/state/plugins-loaded.json`:

```json
{
  "version": "1.0.0",
  "lazyMode": true,
  "loadedAt": "2026-01-18T12:00:00Z",
  "loadedPlugins": [
    {
      "name": "sw",
      "loadedAt": "2026-01-18T12:00:00Z",
      "trigger": "User mentioned 'increment'",
      "skillCount": 50
    }
  ],
  "cachedPlugins": ["sw", "sw-github", "sw-jira", ...],
  "analytics": {
    "totalLoads": 42,
    "avgLoadTimeMs": 850,
    "tokensSaved": 2500000
  }
}
```

## Graceful Degradation

If hot-reload fails:

1. Clear error message shown to user
2. "Restart Claude Code" option offered
3. Failure logged to `~/.specweave/logs/lazy-loading.log`
4. Retry mechanism attempts up to 3 times
5. Fallback: `claude plugin install sw@specweave`

## Cross-Platform Support

**macOS/Linux:** Bash scripts (default)

**Windows:** PowerShell alternative with:
- Auto-detection of available shell
- Long path support (>260 chars)
- Same functionality as Bash version

## Related Features

- **[MCP Tool Search](/docs/guides/getting-started/quickstart#what-you-get)** - Current built-in Claude Code feature for tool deferred loading
- **[Context Forking](/docs/overview/features#-ai-agents--skills)** - Claude Code 2.1.0+ feature for isolated sub-agents
- **[Token Efficiency](/docs/overview/features#-context-precision-70-token-reduction)** - Current progressive disclosure approach

## Timeline

- **Planning**: Complete (January 2026)
- **Implementation**: Planned for v1.1
- **Target**: 12-20 days development time

## Feedback

Have suggestions for the lazy loading feature? [Open an issue](https://github.com/anton-abyzov/specweave/issues) or [join our Discord](https://discord.gg/UYg4BGJ65V).
