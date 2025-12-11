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
/sw:increment "Add dark mode toggle"
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
/sw:do
```

When done, validate and close:
```bash
/sw:done 0001
```

**Pro tip**: Use `/sw:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

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
/sw:increment "payment processing with Stripe"  # Plan
/sw:do                                          # Build
/sw:done 0002                                   # Close
```

**Perfect for production features and team projects.**

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

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "..."` | Create new feature with AI agents |
| `/sw:do` | Execute all tasks autonomously |
| `/sw:done <id>` | Complete with quality gates |
| `/sw:next` | Auto-close + suggest next (one-click flow) |
| `/sw:progress` | Check status |
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

SpecWeave is a **framework, not a locked product**. Customize workflows through your project's `CLAUDE.md`:

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

- **[Node.js](/docs/glossary/terms/nodejs) 20+** (`node --version`)
- **npm 9+** (`npm --version`)
- **Claude Code** (recommended) or any AI tool
- **[Git](/docs/glossary/terms/git)** (for version control)

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
