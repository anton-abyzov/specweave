# Best Practices for SpecWeave with Claude Code

This guide combines SpecWeave's spec-driven methodology with Claude Code's best practices to maximize your productivity.

> **Reference**: Many practices here are adapted from [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices).

## Core Principle: Verification Over Trust

**The single highest-leverage practice**: Always provide verification criteria so Claude can check its own work.

```markdown
# Instead of:
"Implement a payment processor"

# Use:
"Implement a Stripe payment processor. Test criteria:
- process($100) returns success with transaction_id
- process($0) returns error 'invalid_amount'
- process(-$50) returns error 'invalid_amount'
Run the tests after implementing."
```

SpecWeave's task format enforces this naturally:

```markdown
### T-001: Implement Payment Processor
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Test**: Given valid amount $100 → When process() called → Then returns success with transaction_id
```

## The SpecWeave Workflow (Aligned with Claude Code's Explore → Plan → Code → Commit)

| Claude Code Phase | SpecWeave Equivalent | Command |
|-------------------|----------------------|---------|
| **Explore** | Research/brownfield analysis | `/sw:docs`, `/sw:discrepancies` |
| **Plan** | Increment planning | `/sw:increment "feature"` |
| **Code** | Task execution | `/sw:do` |
| **Commit** | Validation + closure | `/sw:validate`, `/sw:done` |

### When to Skip Planning

Small, clear tasks don't need full increments:
- Typo fixes
- Single-line changes
- Rename variables
- Add a comment

For these, just ask Claude directly.

## Context Management (Critical!)

**Claude's context window fills fast.** SpecWeave helps manage this through increments, but you should still:

### 1. Clear Between Unrelated Tasks

```bash
# In Claude Code
/clear

# Then start fresh with SpecWeave
/sw:status  # See where you are
/sw:do      # Continue or start new work
```

### 2. Use `/compact` Wisely

```bash
# Keep only relevant context
/compact Focus on the payment integration

# SpecWeave equivalent: close completed increments
/sw:done 0015  # Clear completed work from context
```

### 3. After 2+ Failed Corrections

Don't keep trying in a polluted context:

```bash
/clear
# Rewrite your prompt with lessons learned
/sw:do  # Fresh start with the same increment
```

### 4. Leverage Subagents

SpecWeave automatically spawns subagents for specialized tasks:

```markdown
# When you run /sw:do, SpecWeave may spawn:
- sw-frontend:frontend-architect → For React/Vue/Next.js
- sw-backend:database-optimizer → For API/database work
- sw-testing:qa-engineer → For E2E tests
```

These run in **isolated context**, keeping your main conversation clean.

## CLAUDE.md Best Practices

SpecWeave generates comprehensive `CLAUDE.md` via `specweave update` (or `/sw:update-instructions` skill). Keep it lean:

### Include

```markdown
# Bash commands Claude can't guess
npm run build:prod  # NOT npm build

# Code style differing from defaults
- Use ES modules (import/export), not CommonJS
- Prefer const over let

# Testing instructions
- Run `npm test` after code changes
- E2E tests require `npm run dev` running

# Developer environment quirks
- API tokens in .env.local (not .env)
- Database on port 5433 (not default 5432)
```

### Exclude

- Standard language conventions (Claude knows TypeScript)
- Detailed API documentation (link instead: `See @docs/api.md`)
- Self-evident practices
- Frequently-changing information

**Rule**: Remove lines that wouldn't cause mistakes if deleted.

## Plugin Management

### Plugin Installation (The Correct Way)

Use Claude's native plugin commands with **short names** from marketplace.json:

```bash
# Install SpecWeave plugins (use short names: sw, sw-frontend, etc.)
claude plugin install sw@specweave
claude plugin install sw-frontend@specweave
claude plugin install sw-github@specweave

# List all installed plugins
claude plugin list

# Enable/disable plugins
claude plugin enable sw-frontend@specweave
claude plugin disable sw-frontend@specweave

# Install from official marketplace
claude plugin install commit-commands@claude-plugins-official
```

### Plugin Name Reference

| Plugin | Install Command | Description |
|--------|-----------------|-------------|
| `sw` | `claude plugin install sw@specweave` | Core framework |
| `sw-frontend` | `claude plugin install sw-frontend@specweave` | React, Next.js, Vue |
| `sw-backend` | `claude plugin install sw-backend@specweave` | Node.js, Python, APIs |
| `sw-testing` | `claude plugin install sw-testing@specweave` | Playwright, Vitest |
| `sw-github` | `claude plugin install sw-github@specweave` | GitHub integration |
| `sw-k8s` | `claude plugin install sw-k8s@specweave` | Kubernetes |

### Troubleshooting Plugin Installation

If `claude plugin install` fails with "Source path does not exist":

```bash
# The marketplace needs the plugins folder checked out
cd ~/.claude/plugins/marketplaces/specweave
git checkout HEAD -- plugins

# Then retry installation
claude plugin install sw-frontend@specweave
```

### Lazy Loading (Automatic)

SpecWeave auto-loads plugins when you need them:

```markdown
You type: "Add Stripe checkout"
→ sw-payments plugin loads automatically

You type: "Deploy to Kubernetes"
→ sw-k8s plugin loads automatically
```

To disable: `export SPECWEAVE_DISABLE_AUTO_LOAD=1`

## Session Management

### Use Descriptive Session Names

```bash
# Name your sessions for easy resumption
/rename payment-integration
/rename debugging-auth-flow
```

### Resume Previous Work

```bash
# Continue most recent
claude --continue

# Select from recent sessions
claude --resume
```

### Checkpoints and Rewinding

Claude auto-checkpoints before changes:

```bash
/rewind  # Restore conversation, code, or both
```

**SpecWeave equivalent**: Increment metadata tracks all changes. You can always see what was done via `/sw:progress`.

## Effective Prompting with SpecWeave

### Provide Specific Context

```markdown
# Scope the task
"Fix the login validation in src/auth/login.ts, lines 45-60"

# Point to sources
"Follow the pattern in src/utils/validators.ts"

# Reference existing code
"Make it consistent with the existing UserService class"

# Describe symptoms
"Error: TypeError: Cannot read property 'id' of undefined
Repro: Call /api/users without auth header"
```

### Interview Mode for Complex Features

```markdown
I want to build [brief description]. Interview me in detail
using the AskUserQuestion tool.

Ask about:
- Technical implementation details
- UI/UX requirements
- Edge cases and error handling
- Performance concerns
- Security implications

Keep interviewing until you have comprehensive understanding,
then create the increment via /sw:increment.
```

## Hooks: Guaranteed vs. Advisory Behavior

| Type | Use For | Example |
|------|---------|---------|
| **CLAUDE.md** | Advisory guidance | "Prefer async/await over callbacks" |
| **Hooks** | Guaranteed behavior | Auto-format, lint, block writes |

### Common Hook Patterns

```bash
# Auto-format after edits
/hooks  # Configure PostFileEdit → prettier

# Block writes to sensitive files
/hooks  # Configure PreFileWrite → block .env files

# Log commands for compliance
/hooks  # Configure PostBash → audit log
```

SpecWeave provides built-in hooks for:
- Auto-updating task status
- Syncing to external tools (GitHub/JIRA)
- Living docs maintenance

## Skills: Your AI Expert Panel

**Skills SHOULD be used extensively!** They provide specialized expertise and are designed to work together.

### LSP: Automatic Code Intelligence (100x Faster)

**⚠️ LSP plugins are NOT skills!** They work AUTOMATICALLY when editing code files:

| File Extension | LSP Activates | What You Get |
|----------------|---------------|--------------|
| `.cs` | csharp-lsp | C# type checking, references |
| `.ts`, `.tsx` | typescript-lsp | TypeScript intelligence |
| `.py` | pyright-lsp | Python type hints |
| `.go` | gopls-lsp | Go code intelligence |

**To trigger LSP operations** (vs text search), explicitly request them:
```
✅ "Use findReferences to find all usages of AppDbContext"
✅ "Use goToDefinition to find where PaymentService is defined"
❌ "Find where this is used" (may use Grep instead)
```

**Why LSP matters for large codebases** (100+ repos, living docs):
- findReferences: ~500 tokens vs ~15K tokens with Grep (30x savings)
- goToDefinition: ~200 tokens vs ~8K tokens (40x savings)
- Semantic accuracy: catches aliased imports, re-exports

### Skills Work Together

```markdown
# Planning chain
/sw:increment → pm skill → architect skill

# Implementation chain
Spec complete → sw-frontend/backend skills → LSP automatic

# Payment integration
Stripe work → sw-payments:stripe-integration (auto-activates)

# Kubernetes deployment
K8s work → sw-k8s:kubernetes-architect (auto-activates)
```

### When Skills Auto-Activate

Skills trigger on keywords in their descriptions:
- "React dashboard" → `sw-frontend:frontend-architect`
- ".NET API" → `sw-backend:dotnet-backend`
- "Stripe checkout" → `sw-payments:stripe-integration`
- "database optimization" → `sw-backend:database-optimizer`

**If a skill doesn't auto-activate**, invoke it explicitly with `Skill()` tool.

## Common Failure Patterns (Avoid These!)

| Problem | Cause | Fix |
|---------|-------|-----|
| **Kitchen sink session** | Start task, do unrelated thing, resume | `/clear` between tasks |
| **Correction loop** | Wrong 2+ times, context polluted | After 2 fails: `/clear` + rewrite |
| **Over-specified CLAUDE.md** | Too long, rules get lost | Ruthlessly prune |
| **Trust-verify gap** | Plausible but untested code | Always provide verification |
| **Infinite exploration** | "Investigate X" without scope | Scope narrowly or use subagents |
| **Multiple increments** | 3 increments in progress | Complete one, then next |

## Quick Reference

### Essential Commands

```bash
# SpecWeave
/sw:increment "feature"   # Plan new work
/sw:do                    # Execute tasks
/sw:progress              # Check status
/sw:validate              # Quality check
/sw:done                  # Close increment

# Claude Code Context
/clear                    # Reset context
/compact <focus>          # Selective compression
/rewind                   # Restore checkpoint
/rename <name>            # Name session

# Plugin Management
/plugin                   # Browse marketplace
claude plugin list        # Show installed
claude plugin enable X    # Enable plugin
```

### Workflow Decision Tree

```
Is this a small, clear task?
├── Yes → Just ask Claude directly
└── No → Is there existing code?
    ├── Yes → /sw:docs first, then /sw:increment
    └── No → /sw:increment directly
```

## Further Reading

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) - Original source
- [SpecWeave Workflows](/docs/workflows/overview) - Complete workflow guide
- [Increment Lifecycle](/docs/guides/core-concepts/what-is-an-increment) - Core concepts
- [Plugin Index](/plugins/PLUGINS-INDEX.md) - All available plugins
