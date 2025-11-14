# Bidirectional Task ↔ User Story Linking

**Status**: Production Ready (v0.18.0+)
**Feature**: Automatic bidirectional traceability between tasks and user stories

---

## Overview

SpecWeave automatically creates **bidirectional links** between tasks and user stories during living docs sync. This provides complete traceability in both directions:

- **Forward Links** (US → Tasks): User stories link to all implementing tasks
- **Reverse Links** (Tasks → US): Tasks link back to their user story (automatic!)

## How It Works

### Automatic During `/specweave:done`

When you complete an increment:

```bash
/specweave:done 0031
```

SpecWeave automatically:
1. Extracts user stories from `spec.md`
2. Writes user story files to `.specweave/docs/internal/specs/{project}/{feature}/`
3. **Parses tasks.md for AC-IDs** (e.g., `AC-US1-01`)
4. **Creates task → user story mapping**
5. **Injects reverse links** into tasks.md

### What Gets Added

**Before** (no bidirectional link):
```markdown
### T-001: Implement User Login

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
```

**After** (WITH bidirectional link):
```markdown
### T-001: Implement User Login

**User Story**: [US-001: User Authentication](../../docs/internal/specs/default/auth-service/us-001-user-authentication.md)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
```

## Requirements

### Must Have AC-IDs in Tasks

**CRITICAL**: Your tasks.md MUST have **AC**: fields with AC-IDs for bidirectional linking to work.

**AC-ID Format**: `AC-US{number}-{criteria}`

**Examples**:
- `AC-US1-01` → Maps to `US-001`
- `AC-US2-03` → Maps to `US-002`
- `AC-US10-05` → Maps to `US-010`

**Full Example**:
```markdown
### T-001: Implement User Login

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
```

### Must Have User Stories in spec.md

Your `spec.md` must contain user stories with matching IDs:

```markdown
### US-001: User Authentication

**As a** user
**I want** to log in securely
**So that** I can access my account

**Acceptance Criteria**:
- AC-US1-01: Login with email and password
- AC-US1-02: Receive JWT token on success
- AC-US1-03: Show error on invalid credentials
```

**Supported Heading Formats**:
- `### US-001:` (3 hashes) ✅
- `#### US-001:` (4 hashes) ✅

## Multi-Project Support

Bidirectional linking works automatically with multi-project setups!

### Project Detection

SpecWeave detects your project from config or path:

```json
{
  "livingDocs": {
    "specsDir": ".specweave/docs/internal/specs/backend"
  }
}
```

**Detected**: `projectId = "backend"`

### Path Adaptation

Links automatically use the correct project folder:

**Default Project**:
```markdown
**User Story**: [US-001: Title](../../docs/internal/specs/default/auth-service/us-001-*.md)
```

**Backend Project**:
```markdown
**User Story**: [US-001: Title](../../docs/internal/specs/backend/auth-service/us-001-*.md)
```

**Frontend Project**:
```markdown
**User Story**: [US-001: Title](../../docs/internal/specs/frontend/dashboard/us-001-*.md)
```

**Result**: No configuration needed - paths adapt automatically!

## Traceability Flow

### Before (One-Way Only)

```
User Story (US-001)
  ↓
  ↓ Links to Tasks
  ↓
Tasks (T-001, T-002, T-003)
  ✗ No reverse links
```

### After (Bidirectional)

```
User Story (US-001) ←――――――――――┐
  ↓                            |
  ↓ Links to Tasks (forward)  | Link to User Story (reverse)
  ↓                            |
Tasks (T-001, T-002, T-003) ――┘
```

### Example Navigation

**From User Story** → See all implementing tasks:
```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031/tasks.md)

**Tasks**:
- [T-001: Create Enhanced Content Builder](../../../../../increments/0031/tasks.md#t-001-create-enhanced-content-builder)
- [T-003: Enhance GitHub Content Sync](../../../../../increments/0031/tasks.md#t-003-enhance-github-content-sync)
- [T-004: Enhance JIRA Content Sync](../../../../../increments/0031/tasks.md#t-004-enhance-jira-content-sync)
```

**From Task** → Jump to user story:
```markdown
### T-001: Create Enhanced Content Builder

**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/external-tool-status-sync/us-001-rich-external-issue-content.md)
```

**Result**: Complete bidirectional navigation!

## Benefits

### 1. Complete Traceability ✅

Navigate from tasks to user stories and back:
- **During planning**: See which tasks implement which user stories
- **During implementation**: Jump from task to full user story context
- **During review**: Verify all acceptance criteria are covered

### 2. LLM-Friendly ✅

AI assistants (Claude, GitHub Copilot, ChatGPT) can:
- Understand relationships in both directions
- Navigate context automatically
- Provide better suggestions based on user story context

### 3. Zero Manual Work ✅

- Links created automatically during `/specweave:done`
- No manual linking needed
- Idempotent (safe to run sync multiple times)

### 4. Multi-Project Aware ✅

- Works with single-project mode (default)
- Works with multi-project mode (backend, frontend, mobile, etc.)
- Paths automatically adapt to project structure

## Configuration

### Default (No Config Needed)

Bidirectional linking works out of the box if:
- ✅ Living docs sync enabled (`livingDocs.intelligent.enabled: true`)
- ✅ Tasks have **AC**: fields with AC-IDs
- ✅ User stories in spec.md match AC-IDs

### Optional Disable

To disable bidirectional linking (not recommended):

```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "bidirectionalLinks": false  // ← Disable bidirectional linking
    }
  }
}
```

## Edge Cases

### Tasks Without AC Fields

**Scenario**: Task doesn't have **AC**: field

**Behavior**: Skipped (no mapping, no reverse link)

**Example**:
```markdown
### T-001: Setup Infrastructure

**Implementation**: Create Kubernetes cluster...
```

**Result**: No bidirectional link added (no AC-IDs to map)

### Tasks With Multiple AC-IDs

**Scenario**: Task has multiple AC-IDs from different user stories

**Example**:
```markdown
**AC**: AC-US1-01, AC-US2-03, AC-US3-05
```

**Behavior**: Maps to **first** user story only (`US-001`)

**Reason**: One task should have one primary user story

### Missing User Story

**Scenario**: AC-ID references non-existent user story

**Example**:
```markdown
**AC**: AC-US99-01   # US-099 doesn't exist
```

**Behavior**: Skipped (no matching user story found)

**Result**: No link added for this task

### Duplicate Prevention

**Scenario**: Run `/specweave:done` twice on same increment

**Behavior**: Checks if `**User Story**:` already exists → Skip

**Result**: Idempotent (safe to run multiple times)

## Troubleshooting

### "No AC-based task-to-US mapping found"

**Problem**: Tasks don't have **AC**: fields

**Solution**: Add AC-IDs to your tasks:
```markdown
### T-001: Implement Login

**AC**: AC-US1-01, AC-US1-02   ← Add this!
```

### Links Not Created

**Problem**: User story IDs don't match AC-IDs

**Solution**: Ensure consistency:
```markdown
# In spec.md:
### US-001: User Authentication   ← Matches AC-US1-01

# In tasks.md:
**AC**: AC-US1-01, AC-US1-02   ← Must match US-001
```

### Wrong Project Path

**Problem**: Links point to wrong project folder

**Solution**: Check `livingDocs.specsDir` in config:
```json
{
  "livingDocs": {
    "specsDir": ".specweave/docs/internal/specs/backend"  ← Correct project!
  }
}
```

## Manual Sync

If automatic sync didn't work during `/specweave:done`:

```bash
node -e "import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const distributor = new SpecDistributor(process.cwd());
  await distributor.distribute('0031-external-tool-status-sync');
});"
```

**Output**:
```
🔍 Detecting feature folder for 0031-external-tool-status-sync...
📁 Mapped to external-tool-status-sync (confidence: 90%, method: increment-name)
✅ Written feature overview to external-tool-status-sync/FEATURE.md
✅ Written 7 user stories directly to external-tool-status-sync/
🔗 Added 18 bidirectional links to tasks.md
```

## Technical Implementation

### Code Location

`src/core/living-docs/spec-distributor.ts`

**Methods**:
- `updateTasksWithUserStoryLinks()` - Adds links to tasks.md
- `mapTasksToUserStories()` - Creates AC-ID based mapping

### Pattern Support

**Task Headings** (both supported):
- `## T-001:` (2 hashes) ✅
- `### T-001:` (3 hashes) ✅

**User Story Headings** (both supported):
- `### US-001:` (3 hashes) ✅
- `#### US-001:` (4 hashes) ✅

### Algorithm

1. **Parse tasks.md**:
   ```typescript
   const taskPattern = /^##+ (T-\d+):.*?$\n[\s\S]*?\*\*AC\*\*:\s*([^\n]+)/gm;
   ```

2. **Extract AC-IDs**:
   ```typescript
   const acPattern = /AC-US(\d+)-\d+/g;
   // AC-US1-01 → "1"
   ```

3. **Format US-ID**:
   ```typescript
   const usId = `US-${usNumber.padStart(3, '0')}`;
   // "1" → "US-001"
   ```

4. **Find User Story**:
   ```typescript
   const userStory = userStories.find(us => us.id === usId);
   ```

5. **Generate Path**:
   ```typescript
   const relativePath = `../../docs/internal/specs/${projectId}/${featureFolder}/${userStoryFile}`;
   ```

6. **Inject Link**:
   ```typescript
   const link = `**User Story**: [${userStory.id}: ${userStory.title}](${relativePath})`;
   ```

## Examples

### Example 1: Single Task → Single User Story

**spec.md**:
```markdown
### US-001: User Login

**As a** user
**I want** to log in with email and password
**So that** I can access my account

**Acceptance Criteria**:
- AC-US1-01: Accept email and password
- AC-US1-02: Validate credentials
- AC-US1-03: Return JWT token
```

**tasks.md** (BEFORE):
```markdown
### T-001: Implement Login Endpoint

**AC**: AC-US1-01, AC-US1-02, AC-US1-03
```

**tasks.md** (AFTER):
```markdown
### T-001: Implement Login Endpoint

**User Story**: [US-001: User Login](../../docs/internal/specs/default/auth-service/us-001-user-login.md)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03
```

### Example 2: Multiple Tasks → Same User Story

**spec.md**:
```markdown
### US-002: Password Reset

**As a** user
**I want** to reset my forgotten password
**So that** I can regain access

**Acceptance Criteria**:
- AC-US2-01: Send reset email
- AC-US2-02: Validate reset token
- AC-US2-03: Update password
```

**tasks.md** (BEFORE):
```markdown
### T-002: Implement Reset Email

**AC**: AC-US2-01

### T-003: Implement Token Validation

**AC**: AC-US2-02

### T-004: Implement Password Update

**AC**: AC-US2-03
```

**tasks.md** (AFTER):
```markdown
### T-002: Implement Reset Email

**User Story**: [US-002: Password Reset](../../docs/internal/specs/default/auth-service/us-002-password-reset.md)

**AC**: AC-US2-01

### T-003: Implement Token Validation

**User Story**: [US-002: Password Reset](../../docs/internal/specs/default/auth-service/us-002-password-reset.md)

**AC**: AC-US2-02

### T-004: Implement Password Update

**User Story**: [US-002: Password Reset](../../docs/internal/specs/default/auth-service/us-002-password-reset.md)

**AC**: AC-US2-03
```

**Result**: All three tasks link back to the same user story!

## FAQ

### Q: Do I need to configure anything?

**A**: No! Bidirectional linking works out of the box if:
- Living docs sync is enabled
- Tasks have **AC**: fields
- User stories exist in spec.md

### Q: Can I disable it?

**A**: Yes, set `livingDocs.intelligent.bidirectionalLinks: false` (not recommended)

### Q: Does it work with multi-project setups?

**A**: Yes! Paths automatically adapt to `specs/default/`, `specs/backend/`, `specs/frontend/`, etc.

### Q: What if I don't use AC-IDs?

**A**: No bidirectional links will be created (forward links still work)

### Q: Can I run sync multiple times?

**A**: Yes! It's idempotent (checks if link exists before adding)

### Q: Where are the links added?

**A**: Right after the task heading, before the **AC**: field

## See Also

- [Living Docs Sync Guide](intelligent-living-docs-sync.md) - Complete living docs architecture
- [Test-Aware Planning](../../../increments/0003-intelligent-model-selection/reports/TEST-AWARE-PLANNING.md) - AC-ID format explanation
- [Multi-Project Setup](multi-project-setup.md) - Multi-project configuration

---

**Last Updated**: 2025-11-13
**Version**: v0.18.0+
**Status**: Production Ready
