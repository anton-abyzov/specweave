---
name: sync
description: Sync SpecWeave increments with JIRA epics/stories. Supports import, export, bidirectional sync, and granular item operations
---

# Sync Jira Command

You are a Jira synchronization expert. Help the user sync between Jira and SpecWeave with granular control.

## Available Operations

### Epic-Level Operations

**1. Import Jira Epic as SpecWeave Increment**
```
/specweave:sync-jira import SCRUM-123
```

**2. Sync existing linked Increment with Jira**
```
/specweave:sync-jira sync 0003
```

**3. Export SpecWeave Increment to Jira**
```
/specweave:sync-jira export 0001
```

### Granular Item Operations

**4. Add specific Story/Bug/Task to existing Increment**
```
/specweave:sync-jira add SCRUM-1 to 0003
/specweave:sync-jira add SCRUM-1              # Adds to current increment
```

**5. Create Increment from specific items (cherry-pick)**
```
/specweave:sync-jira create "User Authentication" from SCRUM-1 SCRUM-5 SCRUM-7
/specweave:sync-jira create "Bug Fixes Sprint 1" from SCRUM-10 SCRUM-15 SCRUM-20
```

**6. Show sync status**
```
/specweave:sync-jira status
/specweave:sync-jira status 0003              # Status of specific increment
```

## Your Task

When the user runs this command:

1. **Parse the command arguments**:
   - Operation: import, sync, export, add, create, or status
   - ID: Jira Epic key (e.g., SCRUM-123) or Increment ID (e.g., 0001)

2. **Execute the operation**:

   **For import Epic**:
   ```typescript
   import { JiraClient } from './src/integrations/jira/jira-client';
   import { JiraMapper } from './src/integrations/jira/jira-mapper';

   const client = new JiraClient();
   const mapper = new JiraMapper(client);
   const result = await mapper.importEpicAsIncrement('SCRUM-123');
   ```

   **For add item**:
   ```typescript
   import { JiraIncrementalMapper } from './src/integrations/jira/jira-incremental-mapper';

   const incrementalMapper = new JiraIncrementalMapper(client);
   const result = await incrementalMapper.addItemToIncrement('0003', 'SCRUM-1');
   ```

   **For create from items**:
   ```typescript
   const result = await incrementalMapper.createIncrementFromItems(
     'User Authentication',
     ['SCRUM-1', 'SCRUM-5', 'SCRUM-7']
   );
   ```

   **For sync**:
   ```typescript
   const result = await mapper.syncIncrement('0003');
   ```

   **For export**:
   ```typescript
   const result = await mapper.exportIncrementAsEpic('0001', 'SCRUM');
   ```

3. **Show results**:
   - Display sync summary
   - Show conflicts (if any)
   - List created/updated files
   - Provide links to Jira and SpecWeave

4. **Handle errors gracefully**:
   - Check if .env credentials exist
   - Validate increment/epic exists
   - Show clear error messages

## Examples

### Example 1: Import Epic
**User**: `/specweave:sync-jira import SCRUM-2`
**You**:
- Import Epic SCRUM-2 from Jira
- Show: "✅ Imported as Increment 0004"
- List: "Created: spec.md, tasks.md, RFC document"
- Link: "Jira: https://... | Increment: .specweave/increments/0004/"

### Example 2: Add Story to Current Increment
**User**: `/specweave:sync-jira add SCRUM-1`
**You**:
- Determine current increment (latest or from context)
- Fetch SCRUM-1 from Jira
- Add to increment's spec.md (under ## User Stories)
- Update tasks.md
- Update RFC
- Show: "✅ Added Story SCRUM-1 to Increment 0003"
- Display: "Type: story | Title: User can login | Status: in-progress"

### Example 3: Add Bug to Specific Increment
**User**: `/specweave:sync-jira add SCRUM-10 to 0003`
**You**:
- Fetch SCRUM-10 from Jira (it's a Bug)
- Add to increment 0003's spec.md (under ## Bugs)
- Update tasks.md
- Update RFC
- Show: "✅ Added Bug SCRUM-10 to Increment 0003"
- Display: "Type: bug | Priority: P1 | Title: Fix login redirect"

### Example 4: Create Increment from Multiple Items
**User**: `/specweave:sync-jira create "User Authentication" from SCRUM-1 SCRUM-5 SCRUM-7`
**You**:
- Fetch all 3 issues from Jira
- Determine types (story, bug, task)
- Create new increment 0005
- Group by type in spec.md:
  - ## User Stories (SCRUM-1, SCRUM-5)
  - ## Technical Tasks (SCRUM-7)
- Generate RFC with all items
- Show: "✅ Created Increment 0005 with 3 work items"
- Display table:
  ```
  | Type  | Jira Key | Title           |
  |-------|----------|-----------------|
  | Story | SCRUM-1  | User login UI   |
  | Story | SCRUM-5  | OAuth backend   |
  | Task  | SCRUM-7  | Setup provider  |
  ```

### Example 5: Sync Existing Increment
**User**: `/specweave:sync-jira sync 0003`
**You**:
- Read increment 0003
- Find linked Jira items (from spec.md frontmatter.work_items)
- Fetch current state from Jira
- Detect changes (status, priority, description)
- Show conflicts if any
- Apply sync bidirectionally
- Display: "✅ Synced 0003 | Updated: 2 items | SCRUM-1 → in-progress, SCRUM-10 → completed"

### Example 6: Status Overview
**User**: `/specweave:sync-jira status`
**You**:
- Scan all increments for Jira metadata
- Show table:
  ```
  | Increment | Title            | Jira Items | Last Sync          |
  |-----------|------------------|------------|--------------------|
  | 0003      | Test Epic        | 0 items    | 2025-10-28 17:42   |
  | 0004      | User Auth        | 3 items    | 2025-10-28 18:00   |
  | 0005      | Bug Fixes        | 5 items    | Never              |
  ```

## Important Notes

- Always check if .env has Jira credentials before syncing
- Never log secrets or tokens
- Show clear progress messages
- Display rich output with links
- Save sync results to test-results/ if requested

## Related Commands

- `/specweave:sync-github` - Sync to GitHub issues
- `/specweave:increment` - Create new increment
- `/specweave:validate` - Validate increment quality

---

**Granular Control**: Unlike simple epic import/export, this command supports cherry-picking individual stories, bugs, and tasks for maximum flexibility.
