# Tasks: 0086 Brownfield Documentation Analysis

## Overview

This increment implements brownfield documentation analysis with discrepancy management.
**Max 25 tasks** per CLAUDE.md guidelines (soft limit for maintainability).

---

### T-001: Create Discrepancy Type System and Manager
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04, AC-US3-05
**Status**: [x] completed

**Description**:
Create the core discrepancy type system and manager for CRUD operations.

**Implementation**:
1. Create `src/core/discrepancy/types.ts` with:
   - `DiscrepancyType` union type
   - `DiscrepancyStatus` union type
   - `Discrepancy` interface
   - `DiscrepancyEvidence` interface
   - `DiscrepancyIndex` interface

2. Create `src/core/discrepancy/discrepancy-manager.ts`:
   - Constructor takes projectPath
   - `createDiscrepancy()` - generates DISC-XXXX ID
   - `getDiscrepancy()` - by ID
   - `updateDiscrepancy()` - partial updates
   - `listDiscrepancies()` - with filter support
   - `getStats()` - returns index stats

**Tests**:
```typescript
// tests/unit/core/discrepancy/discrepancy-manager.test.ts
describe('DiscrepancyManager', () => {
  it('should create discrepancy with auto-generated ID');
  it('should retrieve discrepancy by ID');
  it('should update discrepancy fields');
  it('should list discrepancies with filters');
  it('should calculate stats correctly');
});
```

**Files**:
- `src/core/discrepancy/types.ts`
- `src/core/discrepancy/discrepancy-manager.ts`
- `src/core/discrepancy/index.ts`
- `tests/unit/core/discrepancy/discrepancy-manager.test.ts`

---

### T-002: Implement Batched Folder Storage
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-06
**Status**: [x] completed

**Description**:
Implement scalable folder structure with batching and archival.

**Implementation**:
1. Add to `DiscrepancyManager`:
   - `getBatchFolder(numericId)` - returns `0001-0100/` style folder
   - `ensureFolderStructure()` - creates pending/in-progress/resolved
   - `updateIndex()` - updates index.json with stats
   - `archiveResolved()` - moves to resolved/YYYY-MM/

2. Create folder structure on first write:
   ```
   .specweave/discrepancies/
   ├── index.json
   ├── pending/
   │   └── 0001-0100/
   ├── in-progress/
   └── resolved/
   ```

**Tests**:
```typescript
describe('Batched Storage', () => {
  it('should place DISC-0001 in 0001-0100 folder');
  it('should place DISC-0101 in 0101-0200 folder');
  it('should update index.json on changes');
  it('should archive resolved to YYYY-MM folder');
});
```

**Files**:
- `src/core/discrepancy/discrepancy-manager.ts` (extend)
- `tests/unit/core/discrepancy/batched-storage.test.ts`

---

### T-003: Add Brownfield Analysis Prompt to Init
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-05
**Status**: [x] completed

**Description**:
Add brownfield analysis question to init flow after testing config.

**Implementation**:
1. Create `src/cli/helpers/init/brownfield-analysis.ts`:
   - `promptBrownfieldAnalysis()` - main prompt function
   - `detectExistingDocsLocations()` - finds docs/, wiki/, README.md
   - `getBrownfieldStrings()` - i18n strings (en, ru, es, zh, de, fr, ja, ko, pt)

2. Add to init flow in `src/cli/commands/init.ts`:
   - Call after `promptTestingConfig()`
   - Before "Next steps" output
   - Store config in `.specweave/config.json`

**Tests**:
```typescript
describe('Brownfield Init Prompt', () => {
  it('should detect common doc locations');
  it('should offer analysis depth options');
  it('should support skip option');
});
```

**Files**:
- `src/cli/helpers/init/brownfield-analysis.ts`
- `src/cli/helpers/init/index.ts` (export)
- `src/cli/commands/init.ts` (integrate)

---

### T-004: Extend Background Job System for Brownfield
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04
**Status**: [x] completed

**Description**:
Add brownfield-analysis job type to background job system.

**Implementation**:
1. Update `src/core/background/types.ts`:
   - Add `'brownfield-analysis'` to `JobType`
   - Add `BrownfieldAnalysisJobConfig` interface
   - Add `BrownfieldPhase` type

2. Create `src/core/background/brownfield-launcher.ts`:
   - `launchBrownfieldAnalysisJob()` - spawns worker
   - Integrates with existing job manager

3. Update `src/core/background/index.ts`:
   - Export new launcher

**Tests**:
```typescript
describe('Brownfield Job', () => {
  it('should create job with brownfield-analysis type');
  it('should track phase progress');
  it('should support checkpoint for resume');
});
```

**Files**:
- `src/core/background/types.ts` (extend)
- `src/core/background/brownfield-launcher.ts`
- `src/core/background/index.ts` (export)

---

### T-005: Implement Brownfield Analysis Worker
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-03, AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed

**Description**:
Create the background worker that performs brownfield analysis.

**Implementation**:
1. Create `src/cli/workers/brownfield-worker.ts`:
   - Phases: discovery, code-analysis, doc-matching, discrepancy-detect, reporting
   - `runDiscoveryPhase()` - find all code/doc files
   - `runCodeAnalysisPhase()` - reuse analyzers from 0084
   - `runDocMatchingPhase()` - match docs to code modules
   - `runDiscrepancyDetectionPhase()` - create discrepancies
   - `runReportingPhase()` - generate summary

2. Add checkpoint support:
   - Save checkpoint after each phase
   - Resume from checkpoint on restart

**Tests**:
```typescript
describe('Brownfield Worker', () => {
  it('should run all phases in order');
  it('should save checkpoint after each phase');
  it('should resume from checkpoint');
  it('should create discrepancies for undocumented code');
});
```

**Files**:
- `src/cli/workers/brownfield-worker.ts`
- `tests/unit/workers/brownfield-worker.test.ts`

---

### T-006: Create Discrepancy Commands
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [x] completed

**Description**:
Create commands for viewing and managing discrepancies.

**Implementation**:
1. Create `plugins/specweave/commands/specweave-discrepancies.md`:
   - List all pending discrepancies
   - Support filters: --module, --type, --severity
   - Table output with ID, Type, Module, Severity, Summary

2. Create `plugins/specweave/commands/specweave-discrepancy.md`:
   - View single discrepancy details
   - Show evidence, code/doc locations

3. Add ignore functionality:
   - `--ignore DISC-0001 "reason"`
   - Updates status to 'ignored'

**Files**:
- `plugins/specweave/commands/specweave-discrepancies.md`
- `plugins/specweave/commands/specweave-discrepancy.md`
- `plugins/specweave/skills/discrepancy-viewer.md`

---

### T-007: Implement Discrepancy to Increment Flow
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed

**Description**:
Create flow to convert discrepancies into increments.

**Implementation**:
1. Create `plugins/specweave/commands/specweave-discrepancy-to-increment.md`:
   - Accept multiple discrepancy IDs
   - Group by module if different
   - Generate increment spec with context

2. Create `src/core/discrepancy/increment-generator.ts`:
   - `generateSpecFromDiscrepancies(discrepancies)` - creates spec.md content
   - `linkDiscrepanciesToIncrement(discIds, incrementId)` - updates status

3. Add completion hook:
   - When increment status → completed
   - Auto-resolve linked discrepancies
   - Archive to resolved/YYYY-MM/

**Tests**:
```typescript
describe('Discrepancy to Increment', () => {
  it('should generate increment spec from discrepancies');
  it('should link discrepancies to increment');
  it('should resolve discrepancies on increment completion');
});
```

**Files**:
- `plugins/specweave/commands/specweave-discrepancy-to-increment.md`
- `src/core/discrepancy/increment-generator.ts`
- `tests/unit/core/discrepancy/increment-generator.test.ts`

---

### T-008: Jobs Command Integration and Notifications
**User Story**: US-002
**Satisfies ACs**: AC-US2-05, AC-US2-06, AC-US1-04
**Status**: [x] completed

**Description**:
Integrate brownfield analysis with jobs command and add notifications.

**Implementation**:
1. Update `/specweave:jobs` command:
   - Show brownfield-analysis jobs
   - Display phase progress (1/5, 2/5, etc.)
   - Show discrepancy count when complete

2. Add completion notification:
   - Log summary when job completes
   - Show discrepancy count by type
   - Suggest next steps

3. Connect init flow to background job:
   - Launch job from init prompt
   - Show job ID for monitoring

**Tests**:
```typescript
describe('Jobs Integration', () => {
  it('should display brownfield job in jobs list');
  it('should show phase progress');
  it('should notify on completion');
});
```

**Files**:
- `plugins/specweave/commands/specweave-jobs.md` (update)
- `src/core/background/brownfield-launcher.ts` (notifications)

---

## Summary

| Task | User Story | Priority | Est. Hours |
|------|------------|----------|------------|
| T-001 | US-003 | P0 | 2h |
| T-002 | US-003 | P0 | 2h |
| T-003 | US-001 | P0 | 3h |
| T-004 | US-002 | P0 | 2h |
| T-005 | US-002, US-004 | P1 | 4h |
| T-006 | US-006 | P1 | 3h |
| T-007 | US-005 | P1 | 3h |
| T-008 | US-002 | P2 | 2h |

**Total**: 8 tasks, ~21 hours estimated
