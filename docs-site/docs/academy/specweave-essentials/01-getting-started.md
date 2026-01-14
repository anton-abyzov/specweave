---
sidebar_position: 2
slug: 01-getting-started
title: "Lesson 1: Getting Started"
description: "Install SpecWeave and run your first command in 15 minutes"
---

# Lesson 1: Getting Started

**Time**: 15 minutes
**Goal**: Install SpecWeave and understand why it exists

---

## The Problem: Where Did That Decision Go?

Picture this:

```
Monday morning:
  You: "Claude, help me design the user profile feature"
  Claude: "Sure! Let's use a flexible schema with avatar uploads..."
  → Great conversation, smart decisions made
  → Session ends

Thursday:
  Teammate: "Why did we use that schema for profiles?"
  You: "Uh... let me check Slack? Maybe there's a doc somewhere?"
  → Decision lost
  → Context missing
  → Knowledge evaporated
```

**This happens every day.** AI conversations are brilliant but ephemeral. When the session ends, the knowledge disappears.

---

## The Solution: Specs as [Source of Truth](/docs/glossary/terms/source-of-truth)

SpecWeave solves this by making specifications permanent:

```
Monday:
  /sw:increment "user profile feature"

  → Creates spec.md (requirements)
  → Creates plan.md (technical design)
  → Creates tasks.md (implementation steps)

Thursday:
  Teammate: "Why did we use that schema?"
  → cat .specweave/increments/0001-user-profile/plan.md
  → Complete context in 2 minutes
```

**The key insight**: Instead of code being the record, *specifications* become the record. Every decision is documented, every conversation preserved.

---

## Core Concepts

Before we install, let's understand three key ideas:

### 1. [Increments](/docs/glossary/terms/increments) = Units of Work

An **increment** is any focused piece of work:
- A new feature
- A bug fix
- A refactoring
- An experiment

Each increment creates its own folder with documentation.

### 2. Three Files = Complete Knowledge

Every increment produces exactly three files:

| File | Purpose | Question It Answers |
|------|---------|---------------------|
| **spec.md** | Business requirements | "What are we building?" |
| **plan.md** | Technical design | "How will we build it?" |
| **tasks.md** | Implementation steps | "What steps do we take?" |

### 3. [Living Docs](/docs/glossary/terms/living-docs) = Always Current

Documentation updates automatically as you work. No more stale docs.

---

## Installation

### Step 1: Install SpecWeave

```bash
npm install -g specweave
```

### Step 2: Verify It Worked

```bash
specweave --version
# Should show: specweave v0.28.x
```

### Step 3: Go to Your Project

```bash
cd your-project

# Must be a git repository
git status
```

:::tip No project yet?
Create a test project:
```bash
mkdir specweave-demo && cd specweave-demo
npm init -y
git init
```
:::

### Step 4: Initialize SpecWeave

```bash
specweave init .
```

The wizard will ask a few questions:
- **Git provider**: GitHub, GitLab, or Azure DevOps?
- **External tools**: Want to connect JIRA or GitHub Issues?
- **Documentation approach**: Start simple (recommended)

For this lesson, accept the defaults.

### Step 5: Check the Structure

```bash
ls -la .specweave/
```

You should see:
```
.specweave/
├── config.json      # Your settings
├── increments/      # Your work lives here
├── docs/            # Living documentation
├── cache/           # Performance optimization
└── state/           # Internal state
```

---

## Your First Command

Let's verify everything works:

```bash
/sw:status
```

You should see something like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECWEAVE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: your-project
Initialized: ✓
Config: .specweave/config.json

Active Increments: 0
Completed: 0
WIP Limit: 2/2 available
```

If you see this, you're ready!

---

## The 5-Command Workflow

Here's the entire SpecWeave workflow. You'll learn each command in the following lessons:

```
1. /sw:increment "feature"  → Plan the work
2. /sw:do                   → Execute tasks
3. /sw:progress             → Check status
4. /sw:next                 → Close or continue
5. (repeat)
```

That's it. Five commands cover 90% of daily use.

---

## Quick Exercise

**Goal**: Verify your installation works.

```bash
# 1. Check status
/sw:status

# 2. Explore the structure
ls .specweave/

# 3. View config
cat .specweave/config.json
```

**Success criteria**:
- [ ] Status shows "Initialized: ✓"
- [ ] `.specweave/` directory exists
- [ ] `config.json` is readable

---

## Key Takeaways

You now understand:

1. **The problem**: AI conversations are ephemeral; knowledge gets lost
2. **The solution**: Specs as permanent, living documentation
3. **The structure**: Three files per increment (spec, plan, tasks)
4. **The workflow**: Five commands for daily work

---

## Glossary Terms Used

- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[Source of Truth](/docs/glossary/terms/source-of-truth)** — Single authoritative data source
- **[Living Docs](/docs/glossary/terms/living-docs)** — Auto-synced documentation
- **[Specs](/docs/glossary/terms/specs)** — Specification files

---

## What's Next?

In the next lesson, you'll dive deep into the three-file structure with a simple, hands-on example.

**:next** → [Lesson 2: The Three-File Structure](./02-three-file-structure)
