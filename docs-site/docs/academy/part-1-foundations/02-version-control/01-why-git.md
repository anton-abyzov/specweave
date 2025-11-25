---
sidebar_position: 1
title: "02.1 Why Git?"
description: "Understanding the problem Git solves"
---

# Lesson 02.1: Why Git?

**Duration**: 30 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will understand:
- The problems that existed before version control
- How Git solves these problems
- Why Git became the industry standard
- How Git fits into modern development workflows

---

## The Problems Before Git

### Problem 1: "Which version is current?"

```
project/
├── index_backup.js
├── index_old.js
├── index_v2.js
├── index_v2_fixed.js
├── index_v3_john.js
├── index_v3_sarah.js
├── index_FINAL.js
├── index_FINAL_v2.js
└── index.js          ← Is this even the latest?
```

**Reality**: Nobody knows which file is current. Everyone is afraid to delete anything.

### Problem 2: "Who changed this and why?"

```javascript
// Someone changed this function last week
// Now the app is broken
// Who? Why? What was it before?
function processPayment(amount) {
  // ???
}
```

**Reality**: No history of changes. Debugging is archaeology.

### Problem 3: "My changes broke your changes"

```
Sarah: "I'll work on the header"
John: "I'll work on the footer"
Both: *edit index.html*
Result: One person's work is lost
```

**Reality**: Team collaboration is a minefield.

### Problem 4: "Oops, I need yesterday's version"

```
Monday: Working perfectly
Tuesday: "Minor improvement"
Wednesday: Everything is broken

Developer: "I wish I could go back to Monday"
Reality: No way to undo. Start over.
```

---

## How Git Solves Everything

### Solution 1: Single Source of Truth

```
project/
├── .git/              ← Git tracks ALL history
├── src/
│   └── index.js       ← Always the latest
├── package.json
└── README.md
```

**Git knows**:
- What the current version is
- What every previous version was
- How to get any version back

### Solution 2: Complete History

```bash
git log --oneline
# a1b2c3d (HEAD) Fix payment calculation
# d4e5f6g Add payment validation
# g7h8i9j Implement processPayment
# j1k2l3m Initial commit
```

**Every change recorded**:
- Who made it
- When they made it
- What they changed
- Why (commit message)

### Solution 3: Parallel Work (Branching)

```
main ─────●─────●─────●─────●───── (stable)
           \         /
feature ────●───●───●───────────── (Sarah's work)
             \     /
bugfix ───────●───●──────────────── (John's work)
```

**Teams can work simultaneously** without conflicts.

### Solution 4: Time Machine (Revert)

```bash
# Go back to Monday's version
git checkout a1b2c3d

# Or revert a specific change
git revert d4e5f6g
```

**Any version recoverable** — nothing is ever lost.

---

## Git: The Industry Standard

### Before Git (2000-2005)

| Tool | Problem |
|------|---------|
| CVS | Centralized, slow, limited |
| SVN | Better, but still centralized |
| Perforce | Expensive, complex |

### Git Revolution (2005)

Linus Torvalds (creator of Linux) built Git because existing tools couldn't handle:
- Linux kernel development (millions of lines)
- Distributed team (thousands of contributors)
- Speed requirements (instant operations)

### Today (2024+)

```
Git market share: ~95%+
GitHub users: 100M+
Companies using Git: Essentially all
```

**Git isn't just popular — it's required.**

---

## How Git Works (Conceptually)

### Snapshots, Not Differences

Most version control stores *changes*. Git stores *snapshots*:

```
Traditional VCS:
File: [v1] → [+10 lines] → [-3 lines] → [+5 lines]

Git:
File: [v1 snapshot] → [v2 snapshot] → [v3 snapshot]
```

**Benefits**: Faster, more reliable, easier branching.

### The Three States

```
Working Directory    Staging Area      Repository
     (edit)      →    (prepare)    →    (save)

  [your files]   →   [git add]    →   [git commit]
```

1. **Working Directory**: Your actual files
2. **Staging Area**: Changes ready to commit
3. **Repository**: Permanent history

### Distributed System

```
┌─────────────────┐    ┌─────────────────┐
│  Your Computer  │    │  Their Computer │
│  [Full History] │    │  [Full History] │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │   Remote (GitHub)    │
         │   [Full History]     │
         └─────────────────────┘
```

**Everyone has full history** — no single point of failure.

---

## Git + SpecWeave Integration

SpecWeave leverages Git for:

### 1. Spec History

```bash
git log -- .specweave/increments/0001-auth/spec.md
# See every change to your requirements
```

### 2. Decision Tracking

```bash
git blame .specweave/docs/internal/adr/0001-jwt-auth.md
# See who decided to use JWT and when
```

### 3. Branch-Based Features

```bash
# Create feature branch
git checkout -b feature/0002-payments

# Work on specs
/specweave:increment "Payment processing"

# All specs isolated until merged
```

### 4. PR-Based Reviews

```bash
# Create PR with spec changes
gh pr create

# Team reviews spec.md, plan.md before implementation
# Catch issues BEFORE code is written
```

---

## Real-World Git Usage

### Individual Developer

```
Morning: git pull (get latest)
During day: git add, git commit (save work)
Evening: git push (share work)
```

### Team Developer

```
1. git checkout -b feature/my-feature
2. Work, commit, work, commit
3. git push origin feature/my-feature
4. Create Pull Request
5. Team reviews
6. git merge (after approval)
```

### Enterprise Developer

```
1. Check JIRA ticket
2. Create branch from develop
3. Implement with SpecWeave
4. Push, create PR
5. Automated tests run
6. Code review required
7. Merge after 2+ approvals
8. Automated deploy to staging
```

---

## Key Takeaways

1. **Git solves fundamental problems** — version chaos, lost history, collaboration conflicts
2. **Git is the industry standard** — 95%+ market share, required everywhere
3. **Git stores snapshots** — complete versions, not just changes
4. **Git is distributed** — everyone has full history
5. **SpecWeave uses Git** — specs are version controlled too

---

## Practice Exercise

**Setup**: If you haven't already, configure Git:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Reflection**:
1. Have you ever lost work because you overwrote a file?
2. Have you struggled to collaborate on documents with others?
3. How would complete history have helped in past projects?

---

## Next Lesson

Now let's learn the Git commands you'll use daily.

→ [Continue to Lesson 02.2: Git Basics](./02-git-basics)
