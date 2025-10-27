---
name: sync-github
description: Sync SpecWeave increment to GitHub issues with checkable subtasks
---

# Sync Increment to GitHub

You are syncing a SpecWeave increment to GitHub issues.

## Steps:

1. **Detect current increment** or ask user which to sync:
   - Look in `.specweave/increments/` for most recent or in-progress increment
   - Or ask: "Which increment would you like to sync? (001, 002, etc.)"

2. **Read increment files**:
   - spec.md (user stories, acceptance tests)
   - tasks.md (implementation tasks)
   - Optional: pm-analysis.md, architecture.md, etc.

3. **Use github-sync skill** to:
   - Create GitHub issue with title: `[Increment ###] [Title]`
   - Add overview from spec.md
   - Add user stories as checkable subtasks (GitHub task list)
   - Add tasks as nested checklist
   - Add labels: `specweave`, `priority:P1/P2/P3`, `status:planned/in-progress/completed`
   - Add links back to `.specweave/increments/` files

4. **Store GitHub issue number**:
   - Update increment frontmatter with `github_issue: #123`
   - This enables bidirectional sync

## GitHub Issue Format:

```markdown
# [Increment ###] Title

## Overview
[From spec.md]

## Business Value
[From spec.md if exists]

## User Stories

- [ ] **US1**: [Title] (P1)
  - Acceptance test 1
  - Acceptance test 2
- [ ] **US2**: [Title] (P2)
  - Acceptance test 1

## Implementation Tasks

### Phase 1: [Phase Name]
- [ ] **T001**: [Task description]
- [ ] **T002**: [Task description]

### Phase 2: [Phase Name]
- [ ] **T010**: [Task description]

## Documentation

- [Specification](.specweave/increments/####-name/spec.md)
- [Tasks](.specweave/increments/####-name/tasks.md)
- [Architecture](.specweave/docs/architecture/) (if applicable)

## Dependencies

- Depends on: #[issue-number] (if applicable)

## Success Criteria

[From spec.md]

---
*Created by SpecWeave - [Learn more](https://github.com/specweave/specweave)*
```

## Output to User:

After syncing, tell user:

```
✅ Synced increment 002-role-based-agents to GitHub

   Issue: #15
   URL: https://github.com/[user]/[repo]/issues/15

   📋 Contains:
   - 6 user stories
   - 17 tasks
   - Links to all documentation

   The issue will automatically update when you mark tasks complete.

   To update manually: /sync-github
```

## Bidirectional Sync

If the increment already has `github_issue` in frontmatter:
- Update existing issue instead of creating new one
- Sync status changes (completed tasks, etc.)
- Add comment with updates

## Error Handling

- If not in a git repository: "Error: Not a git repository. Initialize git first."
- If no GitHub credentials: "Error: GitHub credentials not configured. Set GITHUB_TOKEN."
- If increment not found: "Error: Increment not found. Use /create-increment first."

---

**Important**: This command requires the `github-sync` skill to be installed.
If not found, suggest: `npx specweave install github-sync`
