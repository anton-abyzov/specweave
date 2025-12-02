# Tasks: ADO Folder Naming Fix

## Task Summary
| ID | Task | Status | US |
|----|------|--------|-----|
| T-001 | Fix UI display strings in jira-ado-auto-detect.ts | [x] completed | US-001 |
| T-002 | Fix folder mapping generation (remove ADO- prefix) | [x] completed | US-001 |
| T-003 | Update fs-id-allocator.ts container directory naming | [x] completed | US-001 |
| T-004 | Update documentation comments | [x] completed | US-001 |
| T-005 | Verify work items use correct area path folders | [x] completed | US-002 |
| T-006 | Build and test changes | [x] completed | US-001, US-002 |

---

### T-001: Fix UI Display Strings
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Description**:
Update `jira-ado-auto-detect.ts` to show `specs/{PROJECT}/` instead of `specs/ADO-{PROJECT}/`.

**Implementation**:
1. Change line 625: `'by-project': 'specs/ADO-{PROJECT}/'` → `'by-project': 'specs/{PROJECT}/'`
2. Change line 626: `'by-area': 'specs/ADO-{PROJECT}/{area}/ (2-level)'` → `'by-area': 'specs/{PROJECT}/{area}/ (2-level)'`
3. Update prompt choice text at lines 641, 645

**Files**:
- `src/cli/helpers/init/jira-ado-auto-detect.ts`

**Tests**:
- [ ] UI prompts show correct folder names
- [ ] No ADO- prefix in display strings

---

### T-002: Fix Folder Mapping Generation
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed

**Description**:
Remove ADO- prefix from actual folder mapping in `confirmAdoMapping()`.

**Implementation**:
1. Line 662: `areaMappings.set('*', \`ADO-${projectFolder}\`)` → `areaMappings.set('*', projectFolder)`
2. Line 666: `areaMappings.set('*', \`ADO-${projectFolder}/default\`)` → `areaMappings.set('*', \`${projectFolder}/_default\`)`
3. Line 670: `areaMappings.set(area.path, \`ADO-${projectFolder}/${areaFolder}\`)` → `areaMappings.set(area.path, \`${projectFolder}/${areaFolder}\`)`

**Files**:
- `src/cli/helpers/init/jira-ado-auto-detect.ts`

**Tests**:
- [ ] Folder mappings don't contain ADO- prefix
- [ ] Mapping preview shows correct paths

---

### T-003: Update fs-id-allocator.ts Container Naming
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**:
Update `getBaseDirectory()` in fs-id-allocator.ts to not add platform prefix for ADO.

**Implementation**:
1. Line 148-149: For ADO, use just the containerId without prefix
2. Keep JIRA- prefix for JIRA (different behavior)

**Files**:
- `src/living-docs/fs-id-allocator.ts`

**Tests**:
- [ ] ADO features created in `specs/{project}/{area}/FS-XXX/`
- [ ] No ADO- prefix in directory paths

---

### T-004: Update Documentation Comments
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed

**Description**:
Update comment strings that reference ADO- prefix folder structure.

**Files**:
- `src/importers/external-importer.ts` (line 86)
- `src/living-docs/fs-id-allocator.ts` (lines 89, 141, 215, 667-668)
- `src/importers/item-converter.ts` (line 109)

**Tests**:
- [ ] Comments reflect actual behavior

---

### T-005: Verify Work Item Placement
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

**Description**:
Verify that work items are placed in correct area path folders after T-001 to T-004 changes.

**Implementation**:
1. Check `groupItemsByExternalContainer()` in external-import.ts - should work correctly with removed prefix
2. Verify FSIdAllocator uses correct paths
3. Test import flow with sample ADO items

**Tests**:
- [ ] Items with area path go to correct subfolder
- [ ] Items without area path go to `_default` subfolder
- [ ] Preview during init shows correct paths

---

### T-006: Build and Test
**User Story**: US-001, US-002
**Status**: [x] completed

**Description**:
Build project and run tests to verify changes.

**Implementation**:
1. Run `npm run rebuild`
2. Run relevant tests
3. Manual verification if needed

**Tests**:
- [ ] Build succeeds
- [ ] Tests pass
