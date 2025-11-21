# Proposal: Enhanced External Tool Import Strategy (All vs Specific Projects)

**Status**: Draft
**Created**: 2025-11-21
**Type**: UX Enhancement
**Area**: Initialization Flow (JIRA, ADO, GitHub)

---

## Executive Summary

Add explicit **"Import All Projects" vs "Select Specific Projects"** choice during `specweave init` for external tool integration (JIRA, ADO). This improves UX for users managing large-scale Jira/ADO instances (50-500+ projects) and aligns with SpecWeave's existing universal hierarchy mapping capabilities.

**Current Problem**:
- Users must manually select/deselect from checkbox lists (tedious for 100+ projects)
- No explicit "import all" option (hidden in checkbox UI with `<a>` toggle all)
- Inconsistent with GitHub's repository configuration flow
- Doesn't leverage existing `project-selector.ts` "Select All" capability

**Proposed Solution**:
Add upfront choice:
1. **Import all projects** → Auto-select all, skip checkbox UI
2. **Select specific projects** → Show interactive checkbox (current behavior)
3. **Manual entry** → Type project keys manually (existing feature)

---

## Current State Analysis

### JIRA Initialization Flow (v0.24.0)

**File**: `src/cli/helpers/issue-tracker/jira.ts:80-139`

```typescript
// Step 1: Prompt credentials (domain, email, token, instance type)
const answers = await inquirer.prompt(questions);

// Step 2: Auto-discover all accessible projects via API
const selectedProjects = await autoDiscoverJiraProjects({
  domain: answers.domain,
  email: answers.email,
  token: answers.token,
  instanceType: instanceType as JiraInstanceType
});

// Step 3: Strategy detection based on selection count
if (selectedProjects.length === 1) {
  strategy = 'single-project';  // One project selected
} else {
  strategy = 'project-per-team';  // Multiple projects selected
}
```

**Current Project Selection** (`autoDiscoverJiraProjects`):
```typescript
// Fetch all projects from Jira API
const allProjects: any[] = await response.json();
spinner.succeed(`Found ${allProjects.length} accessible project(s)`);

// Show checkbox - user MUST manually select
const { selectedProjects } = await inquirer.prompt({
  type: 'checkbox',
  name: 'selectedProjects',
  message: 'Select Jira projects to sync (use Space to select, Enter to confirm):',
  choices: allProjects.map((p: any) => ({
    name: `${p.key} - ${p.name}`,
    value: p.key,
    checked: false  // All unchecked by default!
  }))
});
```

**Pain Points**:
1. ❌ For 100+ projects, user must hit `<a>` to toggle all (hidden shortcut)
2. ❌ No explicit "Import All" option shown
3. ❌ Inconsistent with GitHub flow (which has repository strategy selection)
4. ❌ Doesn't use existing `project-selector.ts` infrastructure

### Azure DevOps Initialization Flow

**File**: `src/cli/helpers/issue-tracker/ado.ts`

**Current State**: Similar to JIRA (manual project selection)
**Gap**: No "import all" option for ADO projects

### GitHub Initialization Flow (Reference Implementation)

**File**: `src/cli/helpers/issue-tracker/github.ts`

**Already Has Strategy Selection**:
```typescript
const { repositoryStrategy } = await inquirer.prompt({
  type: 'list',
  name: 'repositoryStrategy',
  message: 'How many repositories are you syncing?',
  choices: [
    { name: '📦 Single repository', value: 'single' },
    { name: '📦📦 Multiple repositories', value: 'multiple' },
    { name: '📦🔗 Monorepo (multiple projects in one repo)', value: 'monorepo' }
  ]
});
```

**Lesson**: Users benefit from **upfront strategy choice** rather than implicit detection from selection count.

### Existing Infrastructure: `project-selector.ts`

**File**: `plugins/specweave-jira/lib/project-selector.ts:104-128`

**Already Implements "Select All" Feature**:
```typescript
const { selectionMethod } = await inquirer.prompt({
  type: 'list',
  name: 'selectionMethod',
  message: 'How would you like to select projects?',
  choices: [
    { name: '📋 Interactive (browse and select)', value: 'interactive' },
    { name: '✏️  Manual entry (type project keys)', value: 'manual' },
    { name: '✨ Select all (X projects)', value: 'all' }  // ← ALREADY EXISTS!
  ]
});

if (selectionMethod === 'all') {
  return {
    selectedKeys: allProjects.map((p) => p.key),
    method: 'all'
  };
}
```

**Opportunity**: Reuse this proven pattern in init flow!

---

## Proposed Solution

### Enhanced Initialization Flow (JIRA/ADO)

**NEW Step**: After credentials validated, BEFORE project selection:

```typescript
// Step 1: Prompt credentials (unchanged)
const answers = await inquirer.prompt(questions);

// Step 2: Fetch accessible projects count (quick check)
const projectCount = await fetchProjectCount(credentials);

// Step 3: NEW - Ask import strategy (if multiple projects exist)
if (projectCount > 1) {
  const { importStrategy } = await inquirer.prompt({
    type: 'list',
    name: 'importStrategy',
    message: `Found ${projectCount} accessible projects. How would you like to import?`,
    choices: [
      {
        name: `✨ Import all ${projectCount} projects (recommended for full sync)`,
        value: 'all'
      },
      {
        name: '📋 Select specific projects (interactive)',
        value: 'specific'
      },
      {
        name: '✏️  Enter project keys manually',
        value: 'manual'
      }
    ],
    default: 'specific'  // Safe default (current behavior)
  });

  // Route based on choice
  switch (importStrategy) {
    case 'all':
      selectedProjects = await fetchAllProjects(credentials);
      break;
    case 'specific':
      selectedProjects = await selectSpecificProjects(credentials);  // Current flow
      break;
    case 'manual':
      selectedProjects = await promptManualProjectKeys();
      break;
  }
} else if (projectCount === 1) {
  // Auto-select single project (no prompt)
  selectedProjects = await fetchAllProjects(credentials);
} else {
  console.log('⚠️  No accessible projects found.');
  return null;
}

// Step 4: Validate resources (boards, teams, etc.)
await validateResources(tracker, credentials, projectPath);
```

### Strategy Detection Logic (Enhanced)

**Current** (implicit from selection count):
```typescript
if (selectedProjects.length === 1) {
  strategy = 'single-project';
} else {
  strategy = 'project-per-team';
}
```

**Enhanced** (explicit + selection count):
```typescript
if (importStrategy === 'all') {
  strategy = 'project-per-team';  // Explicit multi-project intent
  console.log(`📊 Strategy: Project-per-team (all ${selectedProjects.length} projects)`);
} else if (selectedProjects.length === 1) {
  strategy = 'single-project';
  console.log(`📊 Strategy: Single project (${selectedProjects[0]})`);
} else {
  strategy = 'project-per-team';
  console.log(`📊 Strategy: Project-per-team (${selectedProjects.length} projects)`);
}
```

### CLI-First Default Strategy (CRITICAL!)

**Philosophy**: SpecWeave is a **CLI tool for developers** → defaults must prioritize **efficiency over safety**

**Default Behavior**:
```typescript
// Step 1: Strategy choice - DEFAULT to "Import all"
const { importStrategy } = await inquirer.prompt({
  type: 'list',
  name: 'importStrategy',
  message: `Found ${projectCount} accessible projects. How would you like to import?`,
  choices: [
    {
      name: `✨ Import all ${projectCount} projects (recommended)`,  // ← DEFAULT!
      value: 'all',
      short: 'Import all'
    },
    {
      name: '📋 Select specific projects',
      value: 'specific',
      short: 'Select specific'
    },
    {
      name: '✏️  Enter project keys manually',
      value: 'manual',
      short: 'Manual entry'
    }
  ],
  default: 'all'  // ← Efficient default for CLI users
});

// Step 2: If "specific" chosen, ALL projects checked by default
if (importStrategy === 'specific') {
  const { selectedProjects } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedProjects',
    message: 'Select projects (all selected by default - deselect unwanted):',
    choices: allProjects.map(p => ({
      name: `${p.key} - ${p.name}`,
      value: p.key,
      checked: true  // ← ALL CHECKED BY DEFAULT (CLI philosophy!)
    })),
    validate: (selected) => selected.length > 0 || 'Select at least one project'
  });
}
```

**Why "Import all" as default**:
- ✅ CLI users expect bulk operations (not tedious clicking)
- ✅ Faster for 90% of use cases (setup once, import everything)
- ✅ Easy to override (choose "Select specific" if needed)
- ✅ Aligns with power user expectations (efficiency > caution)

**Why "All checked" in checkbox**:
- ✅ Deselecting is faster than selecting (Space×5 vs Space×45)
- ✅ Common case: Import most projects, exclude 2-3
- ✅ Matches Unix philosophy: Do the obvious thing, allow customization
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 hours)

**T-001: Create `fetchProjectCount()` helper**
- **File**: `src/cli/helpers/issue-tracker/jira.ts`
- **Implementation**: Lightweight API call to count projects (no full fetch)
- **Rationale**: Avoid fetching 500+ projects if user chooses "select specific"

```typescript
async function fetchProjectCount(credentials: JiraCredentials): Promise<number> {
  const apiBase = credentials.instanceType === 'cloud'
    ? `https://${credentials.domain}/rest/api/3/project/search`
    : `https://${credentials.domain}/rest/api/2/project/search`;

  const response = await fetch(`${apiBase}?maxResults=0`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });

  const data = await response.json();
  return data.total;  // Total count without fetching all projects
}
```

**T-002: Implement import strategy prompt**
- **File**: `src/cli/helpers/issue-tracker/jira.ts`
- **Implementation**: Add choice BEFORE `autoDiscoverJiraProjects()`
- **Choices**:
  - ✨ Import all (fetch all projects, skip checkbox)
  - 📋 Select specific (current flow)
  - ✏️  Manual entry (existing `manualProjectEntry()`)

**T-003: Route to appropriate selection method**
- **Case "all"**: `fetchAllProjects()` → Return all without checkbox
- **Case "specific"**: `autoDiscoverJiraProjects()` → Current checkbox flow
- **Case "manual"**: `promptManualProjectKeys()` → Existing manual entry

### Phase 2: Azure DevOps Support (1-2 hours)

**T-004: Replicate for ADO**
- **File**: `src/cli/helpers/issue-tracker/ado.ts`
- **Implementation**: Same pattern as JIRA
- **ADO-specific**: Use Azure DevOps REST API for project count

### Phase 3: Reuse `project-selector.ts` Infrastructure (Optional, 2-3 hours)

**T-005: Refactor to use existing `selectJiraProjects()`**
- **Current**: `autoDiscoverJiraProjects()` in `jira.ts`
- **Enhanced**: Reuse `plugins/specweave-jira/lib/project-selector.ts`
- **Benefit**: Consistent UX, shared code, proven implementation

**Before** (current):
```typescript
// jira.ts - custom implementation
const selectedProjects = await autoDiscoverJiraProjects(credentials);
```

**After** (reuse existing):
```typescript
// Import from plugin
import { selectJiraProjects } from '../../../plugins/specweave-jira/lib/project-selector.js';
import { JiraClient } from '../../integrations/jira/jira-client.js';

// Create client
const client = new JiraClient({
  domain: credentials.domain,
  email: credentials.email,
  token: credentials.token,
  instanceType: credentials.instanceType
});

// Use existing selector (already has "Select All" option!)
const result = await selectJiraProjects(client, {
  allowManualEntry: true,
  allowSelectAll: true,  // ← Enable "Select All" option
  minSelection: 1
});

const selectedProjects = result.selectedKeys;
const importStrategy = result.method;  // 'all', 'interactive', 'manual'
```

**Benefits**:
✅ Reuses existing proven code
✅ `project-selector.ts` already has "Select All" feature
✅ Consistent UX across init and `/specweave-jira:sync`
✅ Less maintenance burden

### Phase 4: Testing & Documentation (2 hours)

**T-006: Integration tests**
- **File**: `tests/integration/cli/init-external-import.test.ts`
- **Test Cases**:
  - Import all projects (JIRA, ADO)
  - Select specific projects (current behavior)
  - Manual entry (existing feature)
  - Single project auto-selection
  - Zero projects handling

**T-007: Update documentation**
- **File**: `.specweave/docs/public/guides/external-tools/jira-setup.md`
- **Content**: Screenshot/example of new import strategy choice

---

## Universal Hierarchy Mapping Integration

**CRITICAL**: SpecWeave already supports 3-5 level hierarchies!

**File**: `src/integrations/jira/jira-hierarchy-mapper.ts`

**Supported Hierarchies**:
```typescript
// 4-level Jira Agile
Initiative → Epic → Story → Sub-task

// 4-level Jira CMMI
Epic → Feature → Requirement → Task

// 4-level Jira SAFe
Strategic Theme → Capability → User Story → Task
```

**Mapping to SpecWeave Universal Hierarchy**:
```typescript
export interface JiraHierarchyMapping {
  epic: string;       // SpecWeave Epic   → Initiative/Theme/Epic
  feature: string;    // SpecWeave Feature → Epic/Capability/Feature
  userStory: string;  // SpecWeave US      → Story/Requirement
  task: string;       // SpecWeave Task    → Sub-task/Task
}
```

**How "Import All" Leverages This**:
1. User chooses "Import all 50 projects"
2. Each project gets detected hierarchy type (Agile/CMMI/SAFe)
3. SpecWeave creates per-project folders:
   ```
   .specweave/docs/internal/projects/
   ├── backend/      (Jira Agile: Epic → Story → Sub-task)
   ├── frontend/     (Jira CMMI: Epic → Feature → Requirement)
   └── mobile/       (Jira SAFe: Capability → User Story → Task)
   ```
4. Universal mapper handles sync for ALL hierarchies automatically

**Why This Matters**:
- ✅ "Import all" works seamlessly with mixed project types
- ✅ SpecWeave's universal mapping handles 3-5 level hierarchies
- ✅ No manual configuration needed per project

---

## User Experience Flow Diagram

### Current Flow (JIRA)

```
┌─────────────────────────────────┐
│ 1. Choose Tracker: JIRA         │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 2. Enter Credentials            │
│    - Domain                     │
│    - Email                      │
│    - API Token                  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 3. Validate Connection          │
│    ✅ Authenticated              │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 4. Fetch ALL Projects (API)    │
│    Found 127 projects           │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 5. Checkbox Selection           │
│    ☐ PROJ-001 - Backend         │
│    ☐ PROJ-002 - Frontend        │
│    ☐ PROJ-003 - Mobile          │
│    ... (124 more)               │
│                                 │
│    💡 Hidden: <a> toggle all    │  ← User must discover this!
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 6. Implicit Strategy Detection  │
│    - 1 project   → single       │
│    - 2+ projects → per-team     │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 7. Create Sync Config           │
│    .specweave/config.json       │
└─────────────────────────────────┘
```

### Enhanced Flow (JIRA/ADO)

```
┌─────────────────────────────────┐
│ 1. Choose Tracker: JIRA         │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 2. Enter Credentials            │
│    - Domain                     │
│    - Email                      │
│    - API Token                  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 3. Validate Connection          │
│    ✅ Authenticated              │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 4. Fetch Project Count (Fast)   │
│    Found 127 accessible projects│
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 5. NEW: Import Strategy Choice  │  ← NEW STEP!
│                                 │
│    ┌─────────────────────────┐ │
│    │ ✨ Import all 127 projects │ │
│    │ 📋 Select specific projects│ │
│    │ ✏️  Enter keys manually    │ │
│    └─────────────────────────┘ │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
        │             │
┌───────▼──────┐  ┌───▼────────────────┐
│ Import All   │  │ Select Specific    │
│ (Fast)       │  │ (Interactive)      │
│              │  │                    │
│ • Fetch all  │  │ ☐ PROJ-001         │
│ • Skip UI    │  │ ☐ PROJ-002         │
│ • Auto-select│  │ ☑ PROJ-003         │
└───────┬──────┘  └───┬────────────────┘
        │             │
        └──────┬──────┘
               │
┌──────────────▼──────────────────┐
│ 6. Explicit Strategy Detection  │
│    - All      → per-team        │
│    - 1 picked → single          │
│    - 2+ picked→ per-team        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 7. Validate Resources           │
│    - Boards (JIRA)              │
│    - Teams (ADO)                │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 8. Create Multi-Project Folders │
│    .specweave/docs/internal/    │
│    projects/backend/            │
│    projects/frontend/           │
│    projects/mobile/             │
└─────────────────────────────────┘
```

**Key Improvements**:
- ✅ Explicit choice (no hidden `<a>` toggle)
- ✅ Fast path for "import all" (skip checkbox UI)
- ✅ Consistent with GitHub repository flow
- ✅ Scales to 500+ projects gracefully

---

## Migration & Backward Compatibility

### Existing Projects (Already Initialized)

**Scenario**: User already has `.env` with `JIRA_PROJECTS=BACKEND,FRONTEND`

**Behavior**: No change (existing config works as-is)

**Enhancement Flow** (optional):
```bash
# Re-run init to add more projects
specweave init .

# Detects existing .env → Asks:
"Found existing JIRA configuration (2 projects: BACKEND, FRONTEND)"
"Do you want to:"
  1. Keep existing (skip)
  2. Add more projects (merge)
  3. Replace all (reconfigure)
```

### New Projects

**Behavior**: Get enhanced flow with upfront choice

---

## Alternatives Considered

### Alternative 1: Auto-detect "import all" intent from checkbox

**Approach**: If user hits `<a>` to toggle all → Assume "import all" intent

**Rejected Because**:
- ❌ Hidden behavior (not discoverable)
- ❌ Doesn't save time (still loads checkbox UI)
- ❌ Can't optimize API calls (already fetched all projects)

### Alternative 2: Default to "import all" without asking

**Approach**: Auto-select all projects, allow deselection

**Rejected Because**:
- ❌ Risky for large instances (500+ projects)
- ❌ Users may not want ALL projects (compliance, security)
- ❌ Doesn't match SpecWeave's explicit opt-in philosophy

### Alternative 3: Config file-based approach

**Approach**: Provide `.specweave/import-config.json` to pre-configure

**Rejected Because**:
- ❌ Complex for new users
- ❌ Requires two steps (create config → run init)
- ❌ Doesn't help interactive `specweave init` flow

---

## Success Criteria

### Must-Have (MVP)

- ✅ User can choose "Import all projects" for JIRA
- ✅ User can choose "Import all projects" for ADO
- ✅ "Import all" bypasses checkbox UI (fast path)
- ✅ Existing "select specific" flow unchanged
- ✅ Multi-project folder structure created automatically
- ✅ Universal hierarchy mapping works for all project types

### Nice-to-Have (Future)

- ⭐ Reuse `project-selector.ts` infrastructure
- ⭐ GitHub Copilot-style smart suggestions ("You have 50 projects, import all?")
- ⭐ Per-project hierarchy type detection dashboard
- ⭐ Import progress bar for 100+ projects

### Non-Goals

- ❌ Selective board import per project (keep current JIRA_BOARDS_{ProjectKey} pattern)
- ❌ Multi-platform simultaneous import (JIRA + ADO at once)
- ❌ Automatic project discovery without credentials

---

## Technical Risks & Mitigations

### Risk 1: API Rate Limits (JIRA Cloud)

**Problem**: Fetching 500+ projects may hit Jira API rate limits (3600 req/hour)

**Mitigation**:
- Use `/rest/api/3/project/search?maxResults=1000` (batch fetch)
- Cache project list for 5 minutes (avoid re-fetch on retry)
- Show progress bar: "Fetching projects... 127/500"

### Risk 2: Large Project Lists (Performance)

**Problem**: Creating 500 project folders may take time

**Mitigation**:
- Batch folder creation (async I/O)
- Show progress: "Creating project folders... 45/500"
- Allow cancellation (Ctrl+C graceful exit)

### Risk 3: Partial Failures (Some Projects Inaccessible)

**Problem**: User selects "Import all" but lacks permissions for 10/100 projects

**Mitigation**:
- Validate permissions BEFORE creating folders
- Show warning: "⚠️  10 projects inaccessible (insufficient permissions)"
- Allow user to continue with accessible 90 projects

---

## Timeline Estimate

| Phase | Tasks | Effort | Dependencies |
|-------|-------|--------|--------------|
| Phase 1 | JIRA "import all" | 2-3 hours | None |
| Phase 2 | ADO "import all" | 1-2 hours | Phase 1 |
| Phase 3 | Reuse project-selector | 2-3 hours | Optional |
| Phase 4 | Testing + Docs | 2 hours | Phases 1-2 |
| **Total** | **MVP** | **7-10 hours** | - |

**Delivery**: 1-2 days (single contributor, focused work)

---

## Open Questions

1. **Default choice**: Should "Import all" or "Select specific" be default?
   - **Recommendation**: "Select specific" (safe default, matches current UX)

2. **Project count threshold**: Show "import all" only if 5+ projects?
   - **Recommendation**: Always show choice (even for 2 projects, consistency)

3. **GitHub alignment**: Should GitHub also get "import all repos" option?
   - **Recommendation**: Yes (future enhancement, separate increment)

4. **Validation timing**: Validate boards/teams BEFORE or AFTER project selection?
   - **Recommendation**: AFTER (current behavior, avoid premature validation)

---

## Next Steps

1. ✅ **Review proposal** with team (this document)
2. ⏳ **Create increment**: `/specweave:increment "External Tool Import Strategy - All vs Specific Projects"`
3. ⏳ **Implement Phase 1**: JIRA "import all" support
4. ⏳ **Test with real Jira instance** (50+ projects)
5. ⏳ **Implement Phase 2**: ADO support
6. ⏳ **Document in user guide**: `.specweave/docs/public/guides/external-tools/`

---

## References

- **Current Code**:
  - `src/cli/helpers/issue-tracker/jira.ts:80-139` (autoDiscoverJiraProjects)
  - `src/cli/helpers/issue-tracker/index.ts:66-353` (setupIssueTracker)
  - `plugins/specweave-jira/lib/project-selector.ts` (existing "Select All" feature)

- **Universal Hierarchy Mapping**:
  - `src/integrations/jira/jira-hierarchy-mapper.ts` (3-5 level support)

- **Multi-Project Support**:
  - `src/cli/commands/init.ts:83-183` (createMultiProjectFolders)

- **Related ADRs**:
  - ADR-0032: Universal Hierarchy Mapping
  - ADR-0007: GitHub-First Task-Level Synchronization

---

**Author**: Anton Abyzov (with Claude Code assistance)
**Reviewed**: Pending
**Approved**: Pending
