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

### Option C: Deep Interview Mode (v1.0.195+)

For complex features, enable **Deep Interview Mode** during `specweave init`:

```
Deep Interview Mode

Claude asks 5-40 questions (scaled to complexity) about architecture,
integrations, UI/UX, and tradeoffs before creating specifications.

Enable Deep Interview Mode? [y/N]
```

When enabled, Claude assesses feature complexity and asks the right number of questions:
- **Trivial** (0-3): Config changes, typo fixes
- **Small** (4-8): Single component features
- **Medium** (9-18): Multiple components with integrations
- **Large** (19-40): Architectural, cross-cutting, high-risk

Questions cover:
- Architecture & system design patterns
- External integrations (APIs, databases, auth)
- UI/UX concerns and tradeoffs
- Performance & scalability requirements
- Security considerations
- Edge cases & error handling

**Perfect for complex features where upfront planning saves time.**

See [Deep Interview Mode Guide](../deep-interview-mode.md) for details.

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
| **LSP** | 6 languages | Semantic code intelligence (TypeScript, Python, Go, Rust, Java, C#) |

---

## LSP Code Intelligence (Recommended)

SpecWeave includes LSP integration that replaces grep-based code search with **semantic analysis** — 198x faster with zero false positives.

Instead of grep matching every occurrence of "read" (254 hits including `readFile`, `readdir`, comments), LSP resolves only the 32 actual `MetadataManager.read()` references.

```bash
specweave lsp refs src/file.ts SymbolName    # Find all references
specweave lsp def src/file.ts SymbolName     # Go to definition
specweave lsp hover src/file.ts SymbolName   # Type information
```

LSP activates automatically for supported languages. No configuration needed.

**[Full LSP documentation](https://spec-weave.com/docs/guides/lsp-code-intelligence)**

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `/specweave:increment "..."` | Create new feature with AI agents |
| `/specweave:do` | Execute all tasks autonomously |
| `/specweave:done <id>` | Complete with quality gates |
| `/specweave:next` | Auto-close + suggest next (one-click flow) |
| `/specweave:progress` | Check status |
| `/specweave:sync-progress` | Sync to GitHub/JIRA/ADO |
| `/specweave:sync-monitor` | Dashboard: jobs, notifications |
| `/specweave:discrepancies` | View code-to-spec drift |

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
/specweave:discrepancies                    # View all documentation gaps
/specweave:discrepancies --module auth      # Filter by module
/specweave:discrepancy-to-increment DISC-0001 DISC-0002  # Create increment
```

The background analysis runs while you continue working. Check progress with:
```bash
/specweave:jobs
```

---

## Sync Monitoring (NEW)

SpecWeave provides **sync monitoring** for external tools (GitHub/JIRA/ADO):

```bash
/specweave:sync-progress    # Push updates to external tools
/specweave:sync-monitor     # See sync status dashboard
/specweave:notifications    # View/dismiss sync alerts
```

**Code is the source of truth.** When docs drift from reality, you get notified:
```bash
/specweave:discrepancies    # See code-to-spec drift
/specweave:discrepancies accept DISC-0001  # Update specs from code
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

## Staying Updated

AI tooling moves fast. Claude Code ships updates constantly. Here's how to stay on top of it:

| Resource | URL | Why It Matters |
|----------|-----|----------------|
| **Boris Cherny (Twitter)** | [x.com/bcherny](https://x.com/bcherny) | Creator of Claude Code at Anthropic. Follow for early insights on new features before they hit the changelog. |
| **Claude Code Changelog** | [CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) | Source of truth for what's shipping. Check daily for new features, changes, and deprecations. |
| **Anthropic Engineering Blog** | [anthropic.com/engineering](https://www.anthropic.com/engineering) | Deep dives into Claude capabilities. New articles are rare but invaluable when they drop. |

**Bookmark these. Check them regularly.** The AI landscape changes weekly.

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
