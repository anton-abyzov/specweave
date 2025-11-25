---
sidebar_position: 3
title: "02.3 Branching"
description: "Parallel development with Git branches"
---

# Lesson 02.3: Branching

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Understand what branches are and why they matter
- Create, switch, and delete branches
- Merge branches together
- Resolve merge conflicts
- Follow enterprise branching strategies

---

## What is a Branch?

A branch is an independent line of development:

```
main ─────●─────●─────●─────●─────●───── (production)
                \           /
feature ─────────●─────●───●───────────── (your work)
```

**Think of it as**: A parallel universe where you can experiment without affecting the main timeline.

---

## Why Branching Matters

### Without Branches

```
Developer A: Working on Feature X
Developer B: Working on Bug Fix Y
Both: Editing the same files on main
Result: Constant conflicts, broken builds
```

### With Branches

```
Developer A: feature/x branch (isolated)
Developer B: fix/y branch (isolated)
Both: Work independently
Result: Merge when ready, no conflicts during work
```

---

## Branch Commands

### View Branches

```bash
# List local branches
git branch

# List all branches (including remote)
git branch -a

# Show current branch
git branch --show-current
```

### Create Branches

```bash
# Create new branch
git branch feature/user-auth

# Create AND switch to new branch
git checkout -b feature/user-auth

# Modern alternative
git switch -c feature/user-auth
```

### Switch Branches

```bash
# Switch to existing branch
git checkout main

# Modern alternative
git switch main
```

### Delete Branches

```bash
# Delete local branch (safe - won't delete unmerged)
git branch -d feature/user-auth

# Force delete (even if unmerged)
git branch -D feature/user-auth

# Delete remote branch
git push origin --delete feature/user-auth
```

---

## The Branch Workflow

### Step-by-Step

```bash
# 1. Start from main (always up to date)
git checkout main
git pull

# 2. Create feature branch
git checkout -b feature/add-payment

# 3. Do your work
# ... edit files ...
git add .
git commit -m "Add payment form component"

# ... more work ...
git add .
git commit -m "Add payment validation"

# 4. Push branch to remote
git push -u origin feature/add-payment

# 5. Create Pull Request (on GitHub/GitLab)

# 6. After approval, merge to main
git checkout main
git pull
git merge feature/add-payment

# 7. Clean up
git branch -d feature/add-payment
git push origin --delete feature/add-payment
```

---

## Merging Branches

### Fast-Forward Merge

When main hasn't changed since you branched:

```
Before:
main ─────●─────●
                 \
feature ──────────●─────●

After (fast-forward):
main ─────●─────●─────●─────●
                      ↑
               feature merged
```

```bash
git checkout main
git merge feature/user-auth
# Fast-forward merge
```

### Three-Way Merge

When main HAS changed since you branched:

```
Before:
main ─────●─────●─────●─────● (new commits)
                \
feature ─────────●─────●

After (merge commit):
main ─────●─────●─────●─────●─────●
                \             /
feature ─────────●─────●─────┘
```

```bash
git checkout main
git merge feature/user-auth
# Creates merge commit
```

---

## Handling Merge Conflicts

Conflicts happen when both branches change the same lines.

### Example Conflict

```bash
$ git merge feature/update-header
Auto-merging src/Header.tsx
CONFLICT (content): Merge conflict in src/Header.tsx
Automatic merge failed; fix conflicts and then commit.
```

### Conflict Markers

```tsx
<<<<<<< HEAD
<h1>Welcome to Our App</h1>
=======
<h1>Welcome to MyApp v2</h1>
>>>>>>> feature/update-header
```

- `<<<<<<< HEAD`: Your current branch version
- `=======`: Separator
- `>>>>>>> feature`: Incoming branch version

### Resolving Conflicts

1. **Edit the file** — choose or combine versions:

```tsx
// Resolved:
<h1>Welcome to MyApp</h1>
```

2. **Stage the resolution**:

```bash
git add src/Header.tsx
```

3. **Complete the merge**:

```bash
git commit -m "Merge feature/update-header, resolve header conflict"
```

### Pro Tip: Visual Merge Tools

```bash
# Use VS Code for conflicts
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# When conflict occurs
git mergetool
```

---

## Branching Strategies

### GitHub Flow (Simple)

Best for: Small teams, continuous deployment

```
main ────●────●────●────●────●────●────
          \    /    \    /    \    /
feature ───●──┘      │    \    │    \
                     │     │   │     │
fix ─────────────────●─────┘   │     │
                               │     │
feature ───────────────────────●─────┘
```

**Rules**:
1. `main` is always deployable
2. Create branch for any change
3. Open PR for review
4. Merge after approval
5. Deploy from main

### Git Flow (Enterprise)

Best for: Larger teams, scheduled releases

```
main ────●────────────────●────────────● (releases)
          \              /            /
develop ───●────●────●──●────●────●──● (integration)
            \    /        \    /
feature ─────●──┘          \  /
                            \/
feature ────────────────────●
```

**Branches**:
- `main`: Production releases only
- `develop`: Integration branch
- `feature/*`: New features
- `release/*`: Release preparation
- `hotfix/*`: Production fixes

### SpecWeave Recommended Flow

```
main ────●────────────────●────────────●
          \              /            /
develop ───●────●────●──●────●────●──●
            \    /        \    /
increment/0001 ●           \  /
   (with spec.md,           \/
    plan.md,         increment/0002
    tasks.md)
```

**Each increment branch includes**:
- Feature code
- spec.md (requirements)
- plan.md (architecture)
- tasks.md (implementation plan)

---

## Practice Exercise

```bash
# 1. Create a test repository
mkdir branch-practice
cd branch-practice
git init
echo "# Branch Practice" > README.md
git add .
git commit -m "Initial commit"

# 2. Create a feature branch
git checkout -b feature/add-description

# 3. Make changes
echo "## Description" >> README.md
echo "This is a practice repository." >> README.md
git add .
git commit -m "Add description section"

# 4. Switch back to main
git checkout main

# 5. Make a different change on main
echo "## License" >> README.md
echo "MIT" >> README.md
git add .
git commit -m "Add license section"

# 6. Merge feature branch
git merge feature/add-description

# 7. View the result
cat README.md
git log --oneline --graph

# 8. Clean up
git branch -d feature/add-description
```

---

## Branch Naming Conventions

### Common Patterns

```bash
# Features
feature/user-authentication
feature/payment-processing
feature/0001-user-auth          # With SpecWeave increment ID

# Bug fixes
fix/login-crash
bugfix/payment-calculation
hotfix/security-vulnerability

# Other
release/v1.2.0
docs/update-readme
refactor/user-service
test/add-auth-tests
```

### Enterprise Standards

Many companies require:
- Ticket reference: `feature/JIRA-123-user-auth`
- Increment reference: `feature/0001-user-auth`
- Team prefix: `team-a/feature/user-auth`

---

## Key Takeaways

1. **Branches enable parallel work** — isolate changes until ready
2. **Create branch for every change** — never work directly on main
3. **Keep branches short-lived** — merge frequently to avoid conflicts
4. **Merge conflicts are normal** — resolve them calmly
5. **Follow your team's strategy** — consistency matters

---

## Next Lesson

Now let's learn how to collaborate with others using Git.

→ [Continue to Lesson 02.4: Collaboration](./04-collaboration)
