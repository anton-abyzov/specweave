# ADR-0052: CLI-First Defaults and Smart Pagination

**Date**: 2025-11-21
**Status**: Accepted

## Context

SpecWeave's current external tool initialization has poor UX for CLI power users:

**Current Behavior**:
- User runs `specweave init`
- Auto-discovery finds 50 JIRA projects
- ALL 50 projects fetched and displayed in checkbox UI
- ALL checkboxes UNCHECKED by default
- User must manually select 45/50 projects (45 Space keystrokes + navigation)
- "Select All" feature exists but requires discovering `<a>` keyboard shortcut (undocumented)

**User Pain Points**:
1. **Tedious Selection**: Selecting 45/50 projects takes 2-3 minutes of repetitive clicking
2. **Hidden Feature**: `<a>` toggle is not shown in prompt (users don't discover it)
3. **Wrong Default**: Unchecked boxes assume users want NOTHING (most want EVERYTHING)
4. **Timeout Risk**: Loading 500+ projects during init causes 2-5 minute waits and timeout errors

**Comparison with GitHub Init Flow**:
- GitHub init: Upfront choice ("All repos" vs "Select specific")
- Default: "All repos" selected (CLI-first philosophy)
- Efficient: Users deselect unwanted (not select wanted)
- SpecWeave JIRA: No upfront choice, all unchecked, hidden shortcuts

## Decision

Implement CLI-first defaults with smart pagination:

### 1. Smart Pagination (50-Project Limit During Init)

**Rationale**: Avoid 2-5 minute waits and timeout errors

**Implementation**:
```typescript
// Step 1: Fetch project COUNT (fast, lightweight)
const projectCount = await fetchProjectCount(credentials);
// API: /rest/api/3/project/search?maxResults=0
// Returns: { total: 127 } (no project data, just count)

// Step 2: Show upfront choice (before loading all)
const strategy = await promptImportStrategy(projectCount);

// Step 3: Route based on choice
switch (strategy) {
  case 'all':
    return await fetchAllProjectsAsync(credentials, projectCount);
  case 'specific':
    return await selectSpecificProjects(credentials);
  case 'manual':
    return await promptManualProjectKeys();
}
```

**Performance Optimization**:
- Fetch max 50 projects initially (avoid timeout)
- Async pagination for "Import all" (batches of 50)
- Progress bar: "Fetching projects... 47/127 (37%)"
- Cancelation support: Ctrl+C saves partial progress

**Performance Target**: Init completes in < 30 seconds even for 500+ project instances

### 2. CLI-First Defaults (Select All by Default)

**Philosophy**: Bulk operations by default, selective deselection

**Rationale**:
- **Unix Philosophy**: Do the obvious thing (import everything), allow customization (deselect unwanted)
- **Efficiency**: Deselecting 5/50 is faster than selecting 45/50 (80% fewer keystrokes)
- **Expectations**: CLI power users expect bulk operations, not tedious clicking
- **Consistency**: Aligns with GitHub init flow ("All repos" is default)

**Implementation**:

#### Upfront Strategy Choice (NEW)
```
Found 127 accessible projects. How would you like to import?

1. ✨ Import all 127 projects (recommended for full sync)     [DEFAULT]
2. 📋 Select specific projects (interactive checkbox)
3. ✏️  Enter project keys manually (comma-separated)

[Use arrow keys to navigate, Enter to confirm]
```

**Default**: Option 1 ("Import all") is pre-selected

#### Checkbox Mode (If User Chooses "Select Specific")
```
💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>

Select projects (all selected by default - deselect unwanted):
[x] BACKEND - Backend Services
[x] FRONTEND - Frontend App
[x] MOBILE - Mobile App
[x] INFRA - Infrastructure
[x] LEGACY - Legacy System (archived)

[Use space to toggle, <a> to toggle all, Enter to confirm]
```

**All checkboxes CHECKED by default** (not unchecked)

### 3. Explicit Choice (No Hidden Shortcuts)

**Problem**: Current `<a>` keyboard shortcut is hidden (users don't discover it)

**Solution**: Make all actions visible in prompt messages

**Before (Hidden)**:
```
Select projects:
[Options hidden, user must discover <a> toggle]
```

**After (Explicit)**:
```
💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>

Select projects (all selected by default - deselect unwanted):
[Instructions visible, no hidden shortcuts]
```

**Benefits**:
- Users understand intent immediately
- No need to discover hidden keyboard shortcuts
- Consistent with modern CLI tools (e.g., `npm init`, `git`)

### 4. Safety Mechanism (Confirmation for Large Imports)

**Problem**: User presses Enter without reading prompt, imports 500 projects unintentionally

**Solution**: Confirmation prompt if project count > 100

```typescript
if (projectCount > 100) {
  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Import all ${projectCount} projects? This may take 1-2 minutes.`,
    default: false  // Safe default (don't import)
  });

  if (!confirm) {
    console.log('⏭️  Import cancelled. Choose "Select specific" to filter projects.\n');
    return await promptImportStrategy(projectCount);  // Re-prompt
  }
}
```

**Threshold**: 100 projects (configurable via `SPECWEAVE_IMPORT_CONFIRM_THRESHOLD`)

## Alternatives Considered

### Alternative 1: Keep Current Behavior (All Unchecked)

- **Pros**: Safe default (explicit opt-in for each project)
- **Cons**: Tedious for typical use case (import most projects), hidden shortcuts, poor UX
- **Why not**: Violates CLI power user expectations

### Alternative 2: Always Import All (No Choice)

- **Pros**: Simplest UX, zero keystrokes
- **Cons**: No control, users may import unwanted projects (test, legacy, archived)
- **Why not**: Removes user agency, not flexible

### Alternative 3: Smart Defaults Based on Project Count

- **Pros**: Automatic optimization (< 10 projects = all, > 100 = specific)
- **Cons**: Inconsistent UX (behavior changes based on count), confusing
- **Why not**: Explicit choice is clearer than implicit logic

### Alternative 4: No Upfront Choice (Always Show Checkbox)

- **Pros**: Simpler code (no branching)
- **Cons**: Still requires loading all projects (slow), doesn't solve pagination problem
- **Why not**: Doesn't address performance issue

## Consequences

### Positive

- ✅ **80% fewer keystrokes**: Deselect 5/50 instead of select 45/50
- ✅ **Faster init**: < 30 seconds even for 500+ project instances
- ✅ **Better UX**: Explicit choices, no hidden shortcuts
- ✅ **Consistency**: Aligns with GitHub init flow (already has strategy selection)
- ✅ **Flexibility**: Users can still choose "Select specific" if needed
- ✅ **Safety**: Confirmation prompt for large imports (> 100 projects)

### Negative

- ❌ **More code**: Upfront choice adds branching logic
- ❌ **Migration**: Existing users may expect old behavior (documentation needed)
- ❌ **Accidental imports**: User may import unwanted projects if not careful (mitigated by confirmation)

### Neutral

- ⚖️ **Default can be overridden**: Environment variable to change default strategy
- ⚖️ **Confirmation threshold configurable**: `SPECWEAVE_IMPORT_CONFIRM_THRESHOLD=50`

## Risks & Mitigations

### Risk 1: User Imports All 500 Projects Unintentionally

**Problem**: User presses Enter without reading, imports massive project list

**Mitigation**:
- Confirmation prompt if > 100 projects
- Default = "No" (safe default)
- Show estimate: "This may take 1-2 minutes"
- Allow cancelation: Ctrl+C during import

### Risk 2: Checkbox Mode Still Shows All 500 Projects (Slow)

**Problem**: "Select specific" still loads 500 projects in checkbox UI (slow render)

**Mitigation**:
- Load only first 50 projects initially
- Pagination in checkbox UI: "Show next 50" button
- Search filter: Type to filter projects by name/key
- Smart filtering (US-008): "Active only", "By type", "Custom JQL"

### Risk 3: Existing Users Confused by Behavior Change

**Problem**: Current users expect unchecked boxes, new behavior is different

**Mitigation**:
- Release notes: Document behavior change prominently
- Migration guide: Explain new workflow
- Backward compatibility flag: `SPECWEAVE_USE_LEGACY_INIT=true` (temporary)
- In-app notification: "New init flow! See docs for details"

## Related Decisions

- **ADR-0050**: Three-Tier Dependency Loading (smart pagination enables fast init)
- **ADR-0051**: Smart Caching with TTL (cache supports fast project list loading)
- **ADR-0053**: Progress Tracking and Cancelation (handles async pagination)

## Implementation Notes

### Files to Create

1. `src/cli/helpers/issue-tracker/pagination.ts` - Smart pagination logic (shared JIRA/ADO)
2. `src/cli/helpers/issue-tracker/import-strategy.ts` - Upfront choice prompt

### Files to Modify

1. `src/cli/helpers/issue-tracker/jira.ts` - Add `fetchProjectCount()`, `promptImportStrategy()`
2. `src/cli/helpers/issue-tracker/ado.ts` - Same as JIRA (consistency)
3. `plugins/specweave-jira/lib/project-selector.ts` - Change `checked: false` → `checked: true`
4. `src/cli/commands/init.ts` - Integrate upfront choice prompt

### API Endpoints (JIRA)

```typescript
// Fast project count (no data fetching)
async function fetchProjectCount(credentials: JiraCredentials): Promise<number> {
  const apiBase = credentials.instanceType === 'cloud'
    ? `https://${credentials.domain}/rest/api/3/project/search`
    : `https://${credentials.domain}/rest/api/2/project/search`;

  const response = await fetch(`${apiBase}?maxResults=0`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });

  const data = await response.json();
  return data.total;  // Count only (no project data)
}

// Batch project fetching (pagination)
async function fetchProjectBatch(
  credentials: JiraCredentials,
  offset: number,
  limit: number = 50
): Promise<any[]> {
  const apiBase = credentials.instanceType === 'cloud'
    ? `https://${credentials.domain}/rest/api/3/project/search`
    : `https://${credentials.domain}/rest/api/2/project/search`;

  const response = await fetch(
    `${apiBase}?startAt=${offset}&maxResults=${limit}`,
    { headers: { 'Authorization': `Basic ${auth}` } }
  );

  const data = await response.json();
  return data.values || data;  // Cloud: .values, Server: root array
}
```

### Checkbox Default State

```typescript
// plugins/specweave-jira/lib/project-selector.ts

const { selectedProjects } = await inquirer.prompt({
  type: 'checkbox',
  name: 'selectedProjects',
  message: 'Select projects (all selected by default - deselect unwanted):',
  choices: allProjects.map(p => ({
    name: `${p.key} - ${p.name}`,
    value: p.key,
    checked: true  // ← ALL CHECKED BY DEFAULT (CLI-first)
  })),
  validate: (selected) => selected.length > 0 || 'Select at least one project'
});
```

### User Testing Metrics

**Success Criteria**:
- 90% of users choose "Import all" (default is correct choice)
- Average init time < 30 seconds for 100+ project instances
- Zero timeout errors in 100 test runs
- User feedback: "Much faster than before", "Love the new defaults"

---

**Created**: 2025-11-21
**Author**: Architect Agent
**Status**: Accepted (FS-048 implementation)
