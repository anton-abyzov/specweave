---
id: US-004
feature: FS-043
title: Existing Desyncs Detected and Repaired
status: planning
project: specweave
priority: P2
created: 2025-11-18
external:
  github:
    issue: 620
    url: https://github.com/anton-abyzov/specweave/issues/620
---

# US-004: Existing Desyncs Detected and Repaired

**Epic**: FS-043
**Priority**: P2
**Status**: Planning
**Story Points**: 5

---

## User Story

**As a** SpecWeave maintainer
**I want** a script to detect and repair existing spec.md/metadata.json desyncs
**So that** the codebase is in a clean state before deploying the fix

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Validation script scans all increments and finds desyncs
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (create test desyncs → verify script finds them)

- [ ] **AC-US4-02**: Repair script updates spec.md to match metadata.json (metadata.json is source of truth for repair)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (create desync → run repair → verify spec.md fixed)

- [ ] **AC-US4-03**: Repair script logs all changes for audit trail
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P3
  - **Testable**: Yes (verify log file contains all repaired increments)

---

## Example Scenario

No specific example scenario provided in spec - implementation approach documented in implementation notes.

---

## Implementation Notes

**Known Desyncs to Repair**:
- Increment 0038: metadata.json="completed", spec.md="active"
- Increment 0041: metadata.json="completed", spec.md="active"
- Any others discovered by validation script

**Validation Script** (`.specweave/increments/0043-spec-md-desync-fix/scripts/validate-sync.ts`):

```typescript
#!/usr/bin/env tsx
import { MetadataManager } from '../../../../src/core/increment/metadata-manager.js';
import matter from 'gray-matter';

const desyncs: string[] = [];

const allIncrements = MetadataManager.getAll();
for (const metadata of allIncrements) {
  const specPath = path.join(process.cwd(), '.specweave', 'increments', metadata.id, 'spec.md');
  const content = await fs.readFile(specPath, 'utf-8');
  const { data } = matter(content);

  if (data.status !== metadata.status) {
    desyncs.push(`${metadata.id}: metadata.json="${metadata.status}", spec.md="${data.status}"`);
  }
}

if (desyncs.length > 0) {
  console.error('❌ Desyncs detected:');
  desyncs.forEach(d => console.error(`  - ${d}`));
  process.exit(1);
} else {
  console.log('✅ All increments in sync');
}
```

**Repair Script** (`.specweave/increments/0043-spec-md-desync-fix/scripts/repair-desync.ts`):

```typescript
#!/usr/bin/env tsx
// Repairs existing desyncs by updating spec.md to match metadata.json
// (metadata.json is source of truth for repair)

const repaired: string[] = [];

for (const desync of desyncs) {
  await SpecFrontmatterUpdater.updateStatus(desync.id, desync.metadataStatus);
  repaired.push(desync.id);
}

console.log(`✅ Repaired ${repaired.length} desyncs:`, repaired);
```

---

## Tasks

- [ ] **T-008**: Create Validation Command (validate-status-sync)
- [ ] **T-009**: Implement Severity Calculation for Desyncs
- [ ] **T-010**: Create Repair Script (repair-status-desync)
- [ ] **T-011**: Implement Dry-Run Mode for Repair Script
- [ ] **T-012**: Add Audit Logging to Repair Script
- [ ] **T-016**: Run Validation Script on Current Codebase
- [ ] **T-017**: Repair Existing Desyncs (0038, 0041, etc.)
- [ ] **T-021**: Write E2E Test (Repair Script Workflow)
- [ ] **T-023**: Manual Testing Checklist Execution
- [ ] **T-024**: Update User Guide (Troubleshooting Section)
