# Quick Start

**Get running in 30 seconds.**

## Install

```bash
npm install -g specweave
```

---

## Starting a New Project (Greenfield)

The simplest way to start — just describe what you want to build:

```bash
mkdir my-app && cd my-app
specweave init .
```

Then in Claude Code, simply say:
```
"Build a calculator app with React"
```

SpecWeave guides you through features, tech stack, and approach — then creates your first increment automatically.

**Perfect for prototypes, learning, and weekend MVPs.**

---

## Adding Features to Existing Projects

For existing codebases, use explicit commands:

```bash
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode toggle"
```

**SpecWeave creates:**
```
.specweave/increments/0001-dark-mode/
├── spec.md    <- WHAT: User stories + acceptance criteria
├── plan.md    <- HOW: Architecture + tech decisions
└── tasks.md   <- DO: Tasks with embedded tests
```

---

## Execution Options

### Ship While You Sleep (Auto Mode)

For autonomous execution that can run for **hours**:
```bash
/sw:auto
```

Auto mode executes tasks, runs tests, fixes failures, and syncs to GitHub/JIRA — completely hands-off. Check progress with `/sw:auto-status` or stop with `/sw:cancel-auto`.

### Step-by-Step Control

For manual control:
```bash
/sw:do           # Execute one task
/sw:done 0001    # Quality-validated completion
```

**Pro tip**: Use `/sw:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

**Your specs, architecture, and tests are now permanent documentation.**

:::tip 💡 VSCode Users: Use Compact Mode!
Claude Code now supports **compact mode** — keep the AI assistant inside your editor window instead of a separate terminal.

```
Just type: compact
```

This lets you work **continuously for hours** in the same VSCode window without context switching. Combined with `/sw:auto`, you can ship entire features while focusing on other work.

**Bonus**: Stop hooks now work with subagents, so SpecWeave's quality gates validate every level of autonomous execution automatically.
:::

---

## When to Use Increments

Not every change needs an increment. **The rule of thumb:**

| Change Type | Use Increment? | Why |
|-------------|----------------|-----|
| **Typo fix, version bump** | No | Zero learning, purely mechanical |
| **Bug fix that taught you something** | **Yes** | Capture the knowledge for future devs |
| **Any user-facing change** | **Yes** | Track delivery, enable DORA metrics |
| **Architecture decision** | **Yes** | Needs ADR for future understanding |

**The principle**: *If you'd explain this change to a colleague, document it in an increment.*

Increments capture **knowledge**. Ad-hoc work is **ephemeral**. Quick check before doing ad-hoc work: *"Will I remember why I made this change in 6 months?"* If no → create an increment.

---

## What You Get

After `specweave init .`:

| Component | Count | Purpose |
|-----------|-------|---------|
| **Skills** | 136 | Auto-activating capabilities (planning, TDD, brownfield, sync) |
| **Agents** | 68 | Specialized roles (PM, Architect, DevOps, QA, Security, SRE) |
| **Commands** | 53 | Slash commands for workflow control |
| **Hooks** | 3+ | Event-driven automation (lifecycle, sync, status) |
| **CLAUDE.md** | 1 | Your project reference guide |

:::tip Context Efficiency with MCP Tool Search
Claude Code 2.1.7+ includes **MCP Tool Search** (lazy loading) — SpecWeave's 24 plugins load on-demand instead of all at once.

**Result**: 85%+ context reduction (~100k → ~5-10k tokens at startup), enabling longer `/sw:auto` sessions and more complex increments.

No configuration needed — enabled by default when MCP tools exceed 10% of context.

**Coming in v1.1**: [Native Lazy Plugin Loading](/docs/guides/lazy-plugin-loading) — 99% token savings for non-SpecWeave work via router-based architecture.
:::

:::info Optional MCP Servers
Two optional MCP servers that can enhance SpecWeave (not auto-installed):

**Context7** — Real-time docs for any library (no more hallucinated APIs):
```bash
claude mcp add context7 -- npx -y @anthropic-ai/context7-mcp
```

**Playwright** — Browser automation for E2E testing (Claude sees your app):
```bash
claude mcp add playwright -- npx -y @anthropic-ai/playwright-mcp
```

These are **optional** and user-installed. SpecWeave works without them, but they add capabilities like current documentation lookup and visual verification when needed.
:::

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "..."` | Create new feature with AI agents |
| `/sw:auto` | 🚀 **Ship while you sleep** - hours of autonomous work |
| `/sw:do` | Execute one task at a time |
| `/sw:done <id>` | Complete with quality gates |
| `/sw:next` | Auto-close + suggest next (one-click flow) |
| `/sw:progress` | Check status |
| `/sw:auto-status` | Check autonomous session progress |
| `/sw:cancel-auto` | Stop autonomous session |
| `/sw:sync-progress` | Sync to GitHub/JIRA/ADO |
| `/sw:sync-monitor` | Dashboard: jobs, notifications |
| `/sw:discrepancies` | View code-to-spec drift |

---

## Example: Build an Event Management SaaS

```bash
# Install
npm install -g specweave

# Create project
mkdir eventmgmt && cd eventmgmt
specweave init .

# Open Claude Code and describe:
"Build an event management SaaS with Next.js 14, Prisma, NextAuth.js,
Stripe payments, deployed on Hetzner Cloud"

# SpecWeave autonomously creates:
# - PRD with market research
# - Architecture with C4 diagrams
# - Database schema (Prisma)
# - Auth system (NextAuth.js)
# - Payment integration (Stripe)
# - Infrastructure (Terraform for Hetzner)
# - Deployment pipeline ([GitHub Actions](/docs/glossary/terms/github-actions))
# - Tests ([Playwright](/docs/glossary/terms/playwright) [E2E](/docs/glossary/terms/e2e) + Jest)
# - Living documentation (auto-updates)

# Then say: "Implement the MVP"
# SpecWeave builds the entire application!
```

---

## Joining an Existing Project (Brownfield)

If you're working with legacy code, SpecWeave can analyze your codebase for documentation gaps:

```bash
specweave init .
# During init, select "Run brownfield analysis"
```

After analysis completes:
```bash
/sw:discrepancies                    # View all documentation gaps
/sw:discrepancies --module auth      # Filter by module
/sw:discrepancy-to-increment DISC-0001 DISC-0002  # Create increment
```

The background analysis runs while you continue working. Check progress with:
```bash
/sw:jobs
```

---

## Sync Monitoring (NEW)

SpecWeave provides **sync monitoring** for external tools (GitHub/JIRA/ADO):

```bash
/sw:sync-progress    # Push updates to external tools
/sw:sync-monitor     # See sync status dashboard
/sw:notifications    # View/dismiss sync alerts
```

**Code is the source of truth.** When docs drift from reality, you get notified:
```bash
/sw:discrepancies    # See code-to-spec drift
/sw:discrepancies accept DISC-0001  # Update specs from code
```

---

## Configuration (Optional)

Edit `.specweave/config.yaml`:

```yaml
project:
  name: "your-project"
  type: "greenfield"  # or "brownfield"

hooks:
  enabled: true
  post_task_completion:
    enabled: true

testing:
  e2e_playwright_mandatory_for_ui: true
  min_coverage: 80

integrations:
  github:
    enabled: true
  jira:
    enabled: false
```

---

## Customization (CLAUDE.md)

SpecWeave is an **open Skill Fabric, not a locked product**. Customize workflows through your project's `CLAUDE.md`:

```markdown
# In your CLAUDE.md:

## Custom Sync Rules
When syncing to JIRA, always:
- Add custom field "Team: Backend" for backend increments
- Map "paused" status to "Blocked" instead of "On Hold"

## Custom Quality Gates
Before closing any increment:
- Run `npm run lint:strict` in addition to tests
- Verify changelog entry exists

## Custom Workflow
After completing a task:
- Post to #dev-updates Slack channel
```

**What you can customize:**
- **External sync** — Add fields, transform statuses, integrate with internal tools
- **Quality gates** — Add custom validation, linting, security scans
- **Lifecycle hooks** — Trigger actions on increment events
- **Agent behavior** — Override agent prompts for your domain
- **Naming conventions** — Enforce team-specific formats

---

## Requirements

:::caution Node.js Version Required
SpecWeave requires **Node.js 20.12.0 or higher** (we recommend Node.js 22 LTS).

Check your version: `node --version`

If you see an error like `SyntaxError: Unexpected token 'with'`, your Node.js is too old. See [how to upgrade](/docs/guides/troubleshooting/common-errors#node-version-error).
:::

- **[Node.js](/docs/glossary/terms/nodejs) 20.12.0+** (`node --version`) — [upgrade instructions](/docs/guides/troubleshooting/common-errors#node-version-error)
- **npm 9+** (`npm --version`)
- **Claude Code** (recommended) or any AI tool
- **[Git](/docs/glossary/terms/git)** (for version control)

---

## Troubleshooting

### Quick Recovery (Most Issues)

If commands, skills, or hooks stop working:
```bash
specweave update      # Full update: CLI + plugins + instructions
```

This fixes 98% of issues. It updates everything: CLI version, plugins, instruction files.

### Auto Mode Issues

Session stuck or not completing?
```bash
/sw:auto-status   # Check what's happening
/sw:cancel-auto   # Cancel if needed
/sw:auto          # Resume with fresh session
```

### Skills or Hooks Not Working?

First, try the full update:
```bash
specweave update
```

If that doesn't help, use the plugin-only refresh:
```bash
specweave refresh-marketplace
```

**Why this exists:** Claude Code's native marketplace auto-update doesn't:
- Fix hook permissions (`chmod +x`) — hooks may silently fail
- Clean up orphaned cache/skills directories
- Update instruction files (CLAUDE.md, AGENTS.md)

### Enable Marketplace Auto-Update (Optional)

You can enable Claude Code's native auto-update for the specweave marketplace:
```bash
/plugin → Marketplaces tab → Select specweave → Enable auto-update
```

This keeps marketplace.json and installed plugins updated automatically. However, you may still need `specweave refresh-marketplace` occasionally for hook permissions and instruction file updates.

---

## Next Steps

- **[Installation Guide](installation)** - Detailed setup options
- **[Core Concepts](/docs/overview/introduction)** - Understanding specs
- **[Key Features](../../overview/features)** - Full capabilities
- **[Examples](/docs/examples/)** - Real project walkthroughs

---

**Ready to build permanent knowledge instead of losing work to chat history?**

```bash
npm install -g specweave && specweave init .
```
