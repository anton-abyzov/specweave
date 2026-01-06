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

### Step 5: Watch It Work (NEW in v2.9!)

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

### Step 6: Complete the Increment

When all tasks are done:

```bash
/sw:done 0002
```

SpecWeave validates:
- ✅ All tasks marked complete
- ✅ All tests passing
- ✅ Living docs updated

---

## What Just Happened?

You just experienced **spec-driven development**:

1. **Spec First** → Defined WHAT before HOW
2. **Traceability** → Every line of code traces to a requirement
3. **Test Validated** → Tests embedded in tasks, run automatically
4. **Living Docs** → Documentation auto-updated as you worked
5. **Permanent Record** → Increment files stay forever (searchable)

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
/sw:done XXXX                         # Validate and complete
```

### Fix a Bug

```bash
/sw:increment "Fix login redirect loop"
/sw:do                                # Manual execution for debugging
/sw:done XXXX
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

- [Three-File Structure](./guides/lessons/02-three-file-structure.md) - spec.md, plan.md, tasks.md
- [What is an Increment?](./guides/core-concepts/what-is-an-increment.md)
- [Auto Mode Deep Dive](./commands/auto.md) - Autonomous execution

### Explore Advanced Features

- [Multi-Repo Projects](./guides/multi-repo.md) - Coordinate multiple repositories
- [GitHub/JIRA Sync](./integrations/issue-trackers.md) - Bidirectional integration
- [Hooks System](./guides/hooks.md) - Customize behavior
- [Skills Auto-Routing](./guides/claude-skills-deep-dive.md) - 136 specialized skills

### Real-World Examples

- [Mobile App Development](./examples/mobile-app.md) - React Native + Expo
- [Microservices Architecture](./examples/microservices.md) - Multi-repo coordination
- [Brownfield Documentation](./examples/brownfield.md) - Document existing code

### Join the Community

- **Discord**: [Join our community](https://discord.gg/UYg4BGJ65V)
- **GitHub**: [Browse 155+ increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)
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
# Restart Claude Code extension
# Or refresh marketplace
specweave refresh-marketplace
```

### Auto Mode Issues

**Tests not running:**
- Ensure `npm test` works
- Check test files exist (`*.test.ts`)
- Install test framework (Vitest/Jest)

**Session stops early:**
- Check `.specweave/logs/auto-stop-reasons.log`
- Review stop conditions in [Auto Mode docs](./commands/auto.md)

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

| Feature | SpecWeave | Other Tools |
|---------|-----------|-------------|
| **Autonomous Execution** | Hours of work autonomously | Manual or one-shot |
| **Traceability** | Every line → requirement | Chat history only |
| **Test Validation** | Embedded + auto-run | Maybe later |
| **Living Docs** | Auto-updated | Manual or none |
| **Multi-Repo** | Native support | Single repo only |
| **External Sync** | GitHub/JIRA bidirectional | Manual updates |
| **Proven at Scale** | 155+ features self-built | Unknown |

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
