---
sidebar_position: 2
title: Quick Start
description: Get started with SpecWeave in 5 minutes
keywords: [quick start, getting started, installation, first increment, tutorial]
---

# Quick Start Guide

Get up and running with SpecWeave in **5 minutes**.

## Prerequisites

- **Node.js 20.12.0+** (we recommend Node.js 22 LTS)
- **Claude Code** (VSCode extension or CLI)
- **Git** (version control)

## Installation

```bash
# Install globally
npm install -g specweave

# Verify installation
specweave --version
```

:::tip First Time?
New to AI-assisted development? Check out our [Academy](/docs/academy/) for foundational concepts.
:::

---

## Your First Increment (3 Minutes)

### Step 1: Initialize Project

```bash
# Navigate to your project
cd my-project

# Initialize SpecWeave
specweave init .
```

**What this creates:**
```
.specweave/
├── config.json          # Project configuration
├── increments/          # Feature snapshots
│   └── 0001-project-setup/
└── docs/               # Living documentation
```

### Step 2: Create Your First Feature

Open Claude Code and run:

```bash
/sw:increment "Add a click counter button to homepage"
```

**Claude will create three files:**

```
.specweave/increments/0002-click-counter/
├── spec.md    # WHAT: User stories, acceptance criteria
├── plan.md    # HOW: Architecture decisions
└── tasks.md   # DO: Implementation checklist
```

### Step 3: Review the Spec

Open `.specweave/increments/0002-click-counter/spec.md`:

```markdown
## User Stories

### US-001: Click Counter Button
**As a** visitor
**I want** to click a button that increments a counter
**So that** I can see the count increase

## Acceptance Criteria

- [ ] **AC-US1-01**: Button displays "Click me!"
- [ ] **AC-US1-02**: Counter starts at 0
- [ ] **AC-US1-03**: Each click increments counter by 1
- [ ] **AC-US1-04**: Counter persists during page session
```

### Step 4: Execute Tasks

**Option A: Autonomous (Recommended)**
```bash
/sw:auto
```
Claude executes **all tasks automatically** - writes code, runs tests, fixes failures. Can run for hours!

**Option B: Manual (One task at a time)**
```bash
/sw:do
```
Execute one task, review, then continue.

### Step 5: Watch It Work

You'll see real-time labels showing progress:

```
╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  Why: Work incomplete, continuing...                         ║
║  Iteration: 5/2500                                          ║
║  🎯 WHEN WILL SESSION STOP?                                  ║
║  └─ Criteria: ALL tasks [x] completed + tests passing       ║
║  ✅ Tests: 3 passed, 0 failed                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 6: Grill and Complete

When all tasks are done, run the **code grill** first:

```bash
/sw:grill 0002
```

The grill acts as a demanding senior engineer, checking for:
- 🔍 Edge cases and error handling
- 🔒 Security vulnerabilities
- ⚡ Performance issues
- 🧹 Code maintainability

If issues are found, fix them and re-run `/sw:grill 0002`.

Once grill passes:

```bash
/sw:done 0002
```

SpecWeave validates:
- ✅ Grill passed (marker file exists)
- ✅ All tasks marked complete
- ✅ All tests passing
- ✅ Living docs updated

---

## What Just Happened?

You just experienced **spec-driven development**:

1. **Plan as Source of Truth** → The spec/plan/tasks drove implementation, not the other way around
2. **Spec First** → Defined WHAT before HOW
3. **Traceability** → Every line of code traces to a requirement
4. **Test Validated** → Tests embedded in tasks, run automatically
5. **Living Docs** → Documentation auto-updated as you worked
6. **Permanent Record** → Increment files stay forever (searchable)

**Six months from now**, you can search "click counter" and find:
- Why it was built
- How it was architected
- What tests validate it
- Who approved it

---

## Common Workflows

### Build a Feature

```bash
/sw:increment "Feature description"  # Create spec + plan + tasks
/sw:auto                              # Execute autonomously
/sw:grill XXXX                        # Code review before close
/sw:done XXXX                         # Validate and complete
```

### Fix a Bug

```bash
/sw:increment "Fix login redirect loop"
/sw:do                                # Manual execution for debugging
/sw:grill XXXX                        # Review fix quality
/sw:done XXXX
```

:::tip Plan First, Always
Even for bug fixes, SpecWeave creates a spec and plan before implementation. If you discover mid-implementation that the approach needs to change, **update the plan first** — then adjust the code. The plan is always the source of truth. See [Philosophy: Plan as Source of Truth](/docs/overview/philosophy#1-plan-as-source-of-truth).
:::

### Parallel Development (Multiple Agents)

Run multiple AI agents on the same repository — local Claude Code sessions, cloud instances, or [OpenClaw](https://openclaw.ai) agents. SpecWeave coordinates them through increment isolation:

```bash
# Terminal 1 (local Claude Code)
/sw:increment "User authentication"    # Creates 0002-auth
/sw:auto                               # Agent works on auth tasks only

# Terminal 2 (another session or OpenClaw)
/sw:increment "Payment processing"     # Creates 0003-payments
/sw:auto                               # Agent works on payments tasks only

# Terminal 3 (cloud/remote agent)
/sw:increment "Email notifications"    # Creates 0004-notifications
/sw:auto                               # Agent works on notifications tasks only
```

Each agent has its own spec, plan, and task list. No overlap, no conflicts. Check overall progress:

```bash
/sw:status                            # See all increments across agents
/sw:progress                          # Active increments only
```

### Multi-Repo Coordination

```bash
/sw:increment "Add payment webhook (backend + frontend)"
/sw:auto                              # Coordinates across repos
```

### Check Status

```bash
/sw:status                            # All increments
/sw:progress                          # Active increments only
/sw:auto-status                       # Running auto session
```

---

## Next Steps

### Learn the Core Concepts

- [Three-File Structure](./academy/specweave-essentials/02-three-file-structure) - spec.md, plan.md, tasks.md
- [What is an Increment?](./guides/core-concepts/what-is-an-increment) - Understanding increments
- [Auto Mode Deep Dive](./commands/auto) - Autonomous execution

### Explore Advanced Features

- [Multi-Project Setup](./guides/multi-project-setup) - Coordinate multiple repositories
- [External Tools](./academy/specweave-essentials/07-external-tools) - GitHub/JIRA/ADO sync
- [Hooks](/docs/glossary/terms/hooks) - Customize behavior
- [Skills vs Agents](/docs/glossary/terms/skills-vs-agents) - 100+ specialized skills

### Real-World Examples

- [Examples Overview](./examples/) - Real-world use cases
- [Brownfield Projects](./workflows/brownfield) - Document existing code

### Power Features to Explore Next

**🎛️ Extensible Skills (Open/Closed Principle)**

Skills aren't just prompts — they're **programs you can customize** without forking source code.

**Example: Teaching the Frontend Skill**
```bash
# During development
You: "Generate a Button component"
Claude: *creates component with inline styles*
You: "No, use our design system from @/components/ui"

# SpecWeave automatically learns this correction
# Saves to .specweave/skill-memories/frontend.md

# Next session (new conversation)
You: "Generate a Card component"
Claude: *automatically uses @/components/ui* ✓
```

**Your customizations live here:**
```bash
.specweave/skill-memories/
├── frontend.md      # Frontend skill customizations
├── pm.md           # Product management preferences
├── tdd.md          # Testing approach overrides
└── general.md      # Cross-cutting rules
```

**Why this matters:**
- ✅ **Transparent** — See exactly what skills do (SKILL.md)
- ✅ **Customizable** — Add YOUR rules (skill-memories/*.md)
- ✅ **Self-improving** — Corrections persist across sessions
- ✅ **No vendor lock-in** — You control the behavior

**Open/Closed Principle (SOLID):**
- **Closed for modification** — Don't edit SKILL.md
- **Open for extension** — Customize via skill-memories

Unlike Copilot or Cursor which you can't customize, SpecWeave skills are **programs you can reprogram**.

**Enable auto-learning:**
```bash
/sw:reflect-on      # Corrections become permanent knowledge
/sw:reflect-status  # See what Claude has learned
```

[Learn more →](./guides/self-improving-skills)

**Hooks System**
Customize behavior at every phase — session start, prompt submit, tool calls, and session end. Hooks enable autonomous validation and quality gates. [Learn more →](/docs/glossary/terms/hooks)

### Join the Community

- **Discord**: [Join our community](https://discord.gg/UYg4BGJ65V)
- **GitHub**: [Browse our increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments) (dogfooding!)
- **YouTube**: [Video tutorials](https://www.youtube.com/@antonabyzov)

---

## Troubleshooting

### Installation Issues

**Node version too old:**
```bash
node --version    # Must be 20.12.0+
nvm install 22    # Upgrade via nvm
```

**Permission errors:**
```bash
# Use sudo (Unix/Mac)
sudo npm install -g specweave

# Or configure npm to use user directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### First Increment Issues

**No increments directory created:**
```bash
# Ensure you're in project root
pwd

# Re-run init
specweave init .
```

**Claude doesn't recognize commands:**
```bash
# Full update (recommended) - fixes 98% of issues
specweave update

# Then restart Claude Code extension
```

If `specweave update` doesn't help, try `specweave refresh-marketplace` which fixes hook permissions and cleans up plugin state. See [Troubleshooting](#troubleshooting) for details.

### Auto Mode Issues

**Tests not running:**
- Ensure `npm test` works
- Check test files exist (`*.test.ts`)
- Install test framework (Vitest/Jest)

**Session stops early:**
- Check `.specweave/logs/auto-stop-reasons.log`
- Review stop conditions in [Auto Mode docs](./commands/auto.md)

**Session stuck in infinite loop (v1.0.131 fix):**
- Update to latest: `specweave update`
- Circuit breaker now prevents infinite loops after `auto.maxRetries` (default: 20)
- Session auto-approves when all tasks complete, even if increments still "active"

---

## Configuration Tips

### Recommended `.specweave/config.json`

```json
{
  "project": {
    "name": "my-app",
    "type": "fullstack"
  },
  "auto": {
    "maxIterations": 2500,
    "tddStrictMode": false
  },
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": {
      "enabled": true,
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

### Environment Variables

```bash
# .env file
GITHUB_TOKEN=ghp_xxxxx    # For GitHub sync
JIRA_TOKEN=xxxxx          # For JIRA sync (optional)
```

---

## What Makes SpecWeave Different?

| Capability | SpecWeave | BMAD Method | GitHub SpecKit |
|------------|-----------|-------------|----------------|
| **Parallel agent coordination** | Increment-scoped isolation | No | No |
| **Autonomous execution** | Hours of unattended `/sw:auto` | No | No |
| **Quality gates (Code Grill)** | Senior-level review before close | No | No |
| **Living documentation** | Auto-updated after every task | Manual | Manual |
| **Self-improving AI** | Learns from corrections | No | No |
| **External sync** | GitHub / JIRA / ADO bidirectional | No | No |
| **Specialized skills** | 100+ (PM, QA, DevOps, ML...) | 21 agents | None |
| **Traceability** | Every line traces to a requirement | Partial | Partial |
| **Agent-agnostic** | Claude Code + OpenClaw + Copilot + Codex | Multi-IDE | Multi-IDE |
| **Proven at scale** | Builds itself | Community projects | New |

---

## You're Ready!

You now know how to:
- ✅ Install and initialize SpecWeave
- ✅ Create your first increment
- ✅ Execute tasks autonomously or manually
- ✅ Validate and complete work
- ✅ Find help and resources

**Start building your first feature** and experience spec-driven development!

```bash
/sw:increment "Your amazing feature idea here"
```

Have questions? [Join our Discord](https://discord.gg/UYg4BGJ65V) - the community is here to help! 🚀
