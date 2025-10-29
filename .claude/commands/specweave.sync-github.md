---
name: specweave.sync-github
description: Sync SpecWeave increments with GitHub issues. Supports import, export, bidirectional sync, and granular issue operations
---

# Sync GitHub Command

You are a GitHub synchronization expert. Help the user sync between GitHub and SpecWeave with granular control.

## Available Operations

### Milestone-Level Operations

**1. Import GitHub Milestone as SpecWeave Increment**
```
/specweave.sync-github import milestone-1
```

**2. Sync existing linked Increment with GitHub**
```
/specweave.sync-github sync 0003
```

**3. Export SpecWeave Increment to GitHub**
```
/specweave.sync-github export 0001
```

### Granular Issue Operations

**4. Add specific Issue to existing Increment**
```
/specweave.sync-github add #42 to 0003
/specweave.sync-github add #42              # Adds to current increment
```

**5. Create Increment from specific issues (cherry-pick)**
```
/specweave.sync-github create "User Authentication" from #42 #45 #47
/specweave.sync-github create "Bug Fixes Sprint 1" from #10 #15 #20
```

**6. Show sync status**
```
/specweave.sync-github status
/specweave.sync-github status 0003          # Status of specific increment
```

## Your Task

When the user runs this command:

1. **Parse the command arguments**:
   - Operation: import, sync, export, add, create, or status
   - ID: GitHub issue number (e.g., #123) or Increment ID (e.g., 0001)

2. **Execute the operation**:

   **For import Milestone**:
   ```typescript
   import { GitHubClient } from './src/integrations/github/github-client';
   import { GitHubMapper } from './src/integrations/github/github-mapper';

   const client = new GitHubClient();
   const mapper = new GitHubMapper(client);
   const result = await mapper.importMilestoneAsIncrement('milestone-1');
   ```

   **For add issue**:
   ```typescript
   import { GitHubIncrementalMapper } from './src/integrations/github/github-incremental-mapper';

   const incrementalMapper = new GitHubIncrementalMapper(client);
   const result = await incrementalMapper.addIssueToIncrement('0003', 42);
   ```

   **For create from issues**:
   ```typescript
   const result = await incrementalMapper.createIncrementFromIssues(
     'User Authentication',
     [42, 45, 47]
   );
   ```

   **For sync**:
   ```typescript
   const result = await mapper.syncIncrement('0003');
   ```

   **For export**:
   ```typescript
   const result = await mapper.exportIncrementAsIssues('0001');
   ```

3. **Show results**:
   - Display sync summary
   - Show conflicts (if any)
   - List created/updated files
   - Provide links to GitHub and SpecWeave

4. **Handle errors gracefully**:
   - Check if GITHUB_TOKEN exists in environment
   - Validate increment/issue exists
   - Check repository is configured
   - Show clear error messages

## Examples

### Example 1: Import Milestone
**User**: `/specweave.sync-github import milestone-1`
**You**:
- Import Milestone "milestone-1" from GitHub
- Show: "✅ Imported as Increment 0004"
- List: "Created: spec.md, tasks.md, RFC document"
- Link: "GitHub: https://github.com/user/repo/milestone/1 | Increment: .specweave/increments/0004/"

### Example 2: Add Issue to Current Increment
**User**: `/specweave.sync-github add #42`
**You**:
- Determine current increment (latest or from context)
- Fetch issue #42 from GitHub
- Add to increment's spec.md (under ## User Stories or ## Bugs based on labels)
- Update tasks.md
- Update RFC
- Show: "✅ Added Issue #42 to Increment 0003"
- Display: "Type: feature | Title: User authentication | Status: open"

### Example 3: Add Bug Issue to Specific Increment
**User**: `/specweave.sync-github add #123 to 0003`
**You**:
- Fetch issue #123 from GitHub (labeled as "bug")
- Add to increment 0003's spec.md (under ## Bugs)
- Update tasks.md
- Update RFC
- Show: "✅ Added Bug #123 to Increment 0003"
- Display: "Type: bug | Priority: high | Title: Fix login redirect"

### Example 4: Create Increment from Multiple Issues
**User**: `/specweave.sync-github create "User Authentication" from #42 #45 #47`
**You**:
- Fetch all 3 issues from GitHub
- Determine types based on labels (feature, bug, enhancement)
- Create new increment 0005
- Group by type in spec.md:
  - ## User Stories (#42, #45)
  - ## Technical Tasks (#47)
- Generate RFC with all items
- Show: "✅ Created Increment 0005 with 3 issues"
- Display table:
  ```
  | Type    | Issue | Title              |
  |---------|-------|--------------------|
  | Feature | #42   | User login UI      |
  | Feature | #45   | OAuth backend      |
  | Task    | #47   | Setup provider     |
  ```

### Example 5: Sync Existing Increment
**User**: `/specweave.sync-github sync 0003`
**You**:
- Read increment 0003
- Find linked GitHub issues (from spec.md frontmatter.github_issues)
- Fetch current state from GitHub
- Detect changes (status, labels, assignees, comments)
- Show conflicts if any
- Apply sync bidirectionally:
  - Update GitHub issue status based on task completion
  - Update spec.md based on GitHub changes
- Display: "✅ Synced 0003 | Updated: 2 issues | #42 → closed, #45 → in-progress"

### Example 6: Status Overview
**User**: `/specweave.sync-github status`
**You**:
- Scan all increments for GitHub metadata
- Show table:
  ```
  | Increment | Title            | GitHub Issues | Last Sync          |
  |-----------|------------------|---------------|--------------------|
  | 0003      | Test Feature     | 0 issues      | 2025-10-28 17:42   |
  | 0004      | User Auth        | 3 issues      | 2025-10-28 18:00   |
  | 0005      | Bug Fixes        | 5 issues      | Never              |
  ```

## GitHub Issue Format

When creating GitHub issues from increments, use this format:

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

## Bidirectional Sync

When syncing an increment that already has `github_issues` in frontmatter:
- Update existing issues instead of creating new ones
- Sync status changes:
  - Task completion → Close GitHub issue
  - GitHub issue closed → Mark task as completed
- Sync labels and priorities
- Add comments with sync timestamps

## Important Notes

- Always check if GITHUB_TOKEN exists in environment
- Never log tokens or credentials
- Show clear progress messages
- Display rich output with links
- Use GitHub CLI (`gh`) if available for better integration
- Respect rate limits (pause if needed)
- Save sync results to test-results/ if requested

## Error Handling

- **Not a git repository**: "Error: Not a git repository. Initialize git first."
- **No GitHub credentials**: "Error: GITHUB_TOKEN not set. Configure GitHub authentication."
- **Increment not found**: "Error: Increment 0003 not found. Use /specweave.increment first."
- **Issue not found**: "Error: Issue #42 not found in repository."
- **Rate limit exceeded**: "Warning: GitHub rate limit reached. Waiting 60 seconds..."

## Related Commands

- `/specweave.sync-jira` - Sync to Jira
- `/specweave.increment` - Create new increment
- `/specweave.validate` - Validate increment quality
- `/specweave.progress` - Check increment progress

---

**Granular Control**: Unlike simple milestone import/export, this command supports cherry-picking individual issues for maximum flexibility, just like the Jira sync integration.
