---
sidebar_position: 2
title: "Lesson 1: Getting Started"
description: "Install SpecWeave and understand the core philosophy"
---

# Lesson 1: Getting Started with SpecWeave

**Duration**: 30 minutes
**Prerequisites**: Node.js 20+, Git, Claude Code CLI
**Outcome**: Understand SpecWeave's philosophy and have it installed

---

## The Problem SpecWeave Solves

### Before SpecWeave: The Knowledge Decay Problem

```
Monday:
  Developer: "Claude, design user authentication"
  Claude: "Here's a JWT-based system with refresh tokens..."
  → Brilliant conversation with architectural decisions
  → Session ends

Wednesday:
  New Developer: "How does our auth work?"
  Team: "Uh... check the code? Maybe there's a Slack thread?"
  → Knowledge lost
  → Inconsistent decisions
  → Onboarding nightmare
```

### After SpecWeave: Permanent Knowledge

```
Monday:
  /specweave:increment "user authentication"
  → spec.md created (requirements, acceptance criteria)
  → plan.md created (architecture, technical decisions)
  → tasks.md created (implementation steps, tests)

Wednesday:
  New Developer: "How does our auth work?"
  → cat .specweave/increments/0001-user-auth/spec.md
  → Complete understanding in 10 minutes
```

---

## Core Philosophy

### 1. Specs Are Source of Truth

```
NOT this:                      THIS:

Code → Maybe docs              Specs → Code → Auto-docs
(docs rot)                     (specs verified)
```

**Rule**: No code without spec. Every decision documented.

### 2. The Three-File Foundation

Every feature produces exactly three files:

```
.specweave/increments/0001-feature/
├── spec.md    # WHAT: Business requirements
├── plan.md    # HOW: Technical architecture
└── tasks.md   # DO: Implementation steps
```

### 3. Living Documentation

Documentation updates **automatically** via hooks:

```
Task Completed → Hook Fires → Docs Updated → External Tools Synced
```

---

## Installation

### Step 1: Install SpecWeave CLI

```bash
npm install -g specweave
```

### Step 2: Verify Installation

```bash
specweave --version
# Output: specweave v0.28.x
```

### Step 3: Navigate to Your Project

```bash
cd your-project
# Must be a git repository
git status  # Verify it's a git repo
```

### Step 4: Initialize SpecWeave

```bash
specweave init .
```

**The wizard asks**:
1. **Git provider**: GitHub, GitLab, or Azure DevOps?
2. **External tools**: Connect JIRA, GitHub Issues?
3. **Documentation approach**: Comprehensive or Incremental?

### Step 5: Verify Initialization

```bash
ls -la .specweave/
```

**Expected structure**:
```
.specweave/
├── config.json        # Project configuration
├── increments/        # Your work lives here
│   └── README.md
├── docs/              # Living documentation
│   ├── public/        # User-facing docs
│   └── internal/      # Team docs
├── cache/             # Performance optimization
├── state/             # Hook state
└── metrics/           # DORA metrics
```

---

## Your First Command

Let's verify everything works:

```bash
/specweave:status
```

**Expected output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECWEAVE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: your-project
Initialized: ✓
Config: .specweave/config.json

Active Increments: 0
Completed: 0
WIP Limit: 2/2 available

External Tools:
  GitHub: Not configured
  JIRA: Not configured
```

---

## Understanding the Workflow

Here's the complete SpecWeave workflow:

```
┌──────────────────────────────────────────────────────────────┐
│                    THE SPECWEAVE CYCLE                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PLAN                                                     │
│     /specweave:increment "feature"                           │
│     → PM Agent creates spec.md                               │
│     → Architect creates plan.md                              │
│     → Tech Lead creates tasks.md                             │
│                                                              │
│  2. EXECUTE                                                  │
│     /specweave:do                                            │
│     → Tasks executed sequentially                            │
│     → Tests run after each task                              │
│     → Hooks update living docs                               │
│                                                              │
│  3. MONITOR                                                  │
│     /specweave:progress                                      │
│     → See completion percentage                              │
│     → Track blockers                                         │
│                                                              │
│  4. COMPLETE                                                 │
│     /specweave:next                                          │
│     → Validate quality gates                                 │
│     → Auto-close if ready                                    │
│     → Suggest next work                                      │
│                                                              │
│  5. REPEAT                                                   │
│     → Next increment                                         │
│     → Continuous improvement                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Concepts Summary

| Concept | Description |
|---------|-------------|
| **Increment** | A unit of work (feature, bug fix, refactor) |
| **spec.md** | Business requirements (WHAT) |
| **plan.md** | Technical architecture (HOW) |
| **tasks.md** | Implementation steps (DO) |
| **Quality Gates** | 3 checks before closure (tasks, tests, docs) |
| **Living Docs** | Auto-updating documentation |
| **`:next`** | Smart workflow continuation command |

---

## Common Mistakes to Avoid

### Mistake 1: Starting Without Specs

```bash
# ❌ WRONG: Just start coding
vim src/auth.ts

# ✅ CORRECT: Create increment first
/specweave:increment "user authentication"
```

### Mistake 2: Ignoring Quality Gates

```bash
# ❌ WRONG: Force close with incomplete work
/specweave:done 0001 --force

# ✅ CORRECT: Complete the work
/specweave:next  # Validates and guides you
```

### Mistake 3: Manual Documentation

```bash
# ❌ WRONG: Manually edit living docs
vim .specweave/docs/public/FEATURES.md

# ✅ CORRECT: Let hooks handle it
# Update tasks.md → hooks sync docs automatically
```

---

## Practice Exercise

**Goal**: Initialize SpecWeave in a test project

```bash
# 1. Create a test project
mkdir specweave-test && cd specweave-test
npm init -y
git init

# 2. Initialize SpecWeave
specweave init .

# 3. Check status
/specweave:status

# 4. Explore the structure
ls -la .specweave/
cat .specweave/config.json
```

**Success criteria**:
- [ ] `.specweave/` directory created
- [ ] `config.json` exists
- [ ] `/specweave:status` shows "Initialized: ✓"

---

## What's Next?

You now understand:
- ✅ Why SpecWeave exists (knowledge preservation)
- ✅ Core philosophy (specs as source of truth)
- ✅ Basic installation and setup
- ✅ The workflow overview

**Next lesson**: Deep dive into the three-file structure with real examples.

:next → [Lesson 2: The Three-File Structure](./02-three-file-structure)
