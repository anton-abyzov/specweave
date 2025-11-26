# Quick Start

**Get running in 30 seconds.**

## Install

```bash
npm install -g specweave
cd your-project
specweave init .
```

**That's it.** SpecWeave is ready.

---

## Your First Feature (2 minutes)

Open Claude Code and run:

```bash
/specweave:increment "Add dark mode toggle"
```

**SpecWeave creates:**
```
.specweave/increments/0001-dark-mode/
├── spec.md    <- WHAT: User stories + acceptance criteria
├── plan.md    <- HOW: Architecture + tech decisions
└── tasks.md   <- DO: Tasks with embedded tests
```

Then build it:
```bash
/specweave:do
```

When done, validate and close:
```bash
/specweave:done 0001
```

**Pro tip**: Use `/specweave:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

**Your specs, architecture, and tests are now permanent documentation.**

---

## Two Approaches

### Option A: Quick Build (Fastest)

Just describe what you want:
```
"build a calculator app with React"
```

SpecWeave's assistant guides you through features, tech stack, and approach. **Perfect for prototypes and learning.**

### Option B: Spec-First (Recommended)

Use explicit commands for full control:
```bash
/specweave:increment "payment processing with Stripe"  # Plan
/specweave:do                                          # Build
/specweave:done 0002                                   # Close
```

**Perfect for production features and team projects.**

---

## What You Get

After `specweave init .`:

| Component | Count | Purpose |
|-----------|-------|---------|
| **Skills** | 17 | Auto-activating capabilities (planning, TDD, quality) |
| **Agents** | 11 | Specialized roles (PM, Architect, Tech Lead, QA, Security) |
| **Commands** | 22 | Slash commands for workflow control |
| **Hooks** | 8 | Automation (doc updates, quality validation) |
| **CLAUDE.md** | 1 | Your project reference guide |

### Why This Architecture?

Anthropic's engineering research shows [code execution beats direct MCP tool calls](https://www.anthropic.com/engineering/code-execution-with-mcp) — achieving **98% token reduction**.

SpecWeave applies this insight:
- **Skills load on-demand** (not all tools upfront)
- **Code is deterministic** (no LLM in the middle of data flow)
- **Sub-agents isolate context** (no bloat accumulation)

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `/specweave:increment "..."` | Create new feature with AI agents |
| `/specweave:do` | Execute all tasks autonomously |
| `/specweave:done <id>` | Complete with quality gates |
| `/specweave:progress` | Check status |
| `/specweave:sync-progress` | Sync to GitHub/JIRA/ADO |

---

## Example: Build an Event Management SaaS

:::tip Keep Increments Small
**Best practice**: Split large projects into 5-15 task increments. This works better for both humans (easier tracking) and AI (better context retention).
:::

```bash
# Install
npm install -g specweave

# Create project
mkdir eventmgmt && cd eventmgmt
specweave init .
```

**Break it into focused increments:**

```bash
# Increment 1: Project Foundation (1 day)
/specweave:increment "Setup Next.js 14 with Prisma and basic layout"

# Increment 2: Authentication (2 days)
/specweave:increment "User auth with NextAuth.js"

# Increment 3: Event CRUD (2 days)
/specweave:increment "Create, read, update, delete events"

# Increment 4: Payments (2 days)
/specweave:increment "Stripe payment integration for tickets"

# Increment 5: Deployment (1 day)
/specweave:increment "Deploy to Hetzner with Terraform"
```

**Each increment completes with:**
- ✅ Working code
- ✅ Tests passing (60%+ coverage)
- ✅ Documentation updated
- ✅ Ready to ship

**Why split?** You ship working software after each increment. If priorities change after Increment 3, you have a deployable app!

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

## Requirements

- **Node.js 20+** (`node --version`)
- **npm 9+** (`npm --version`)
- **Claude Code** (recommended) or any AI tool
- **Git** (for version control)

---

## Troubleshooting

### Skills not activating?
```bash
ls -la .claude/skills/
# Should see 17 SpecWeave skills
```

If missing, safe reinstall:
```bash
specweave init .
# Select: "Continue working"
```

### Commands not found?
```bash
ls -la .claude/commands/
# Should see 22 command files
```

---

## Next Steps

- **[Installation Guide](installation)** - Detailed setup options
- **[Core Concepts](../../guides/core-concepts/specifications)** - Understanding specs
- **[Key Features](../../overview/features)** - Full capabilities
- **[Examples](../examples/)** - Real project walkthroughs

---

**Ready to build permanent knowledge instead of losing work to chat history?**

```bash
npm install -g specweave && specweave init .
```
