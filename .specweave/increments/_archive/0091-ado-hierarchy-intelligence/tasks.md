# Tasks: Intelligent ADO Hierarchy Mapping

## Overview
Fix ADO hierarchy mapping so Capabilities go to `_epics/EP-XXXE/` and Epics go to `FS-XXXE/`.

---

### T-001: Add ADO Process Template Detection to ADO Client
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [x] completed

**Description**: Add method to `ado-client.ts` to detect process template via ADO API.

**Implementation**:
- Added `AdoProcessTemplateInfo` interface to `ado-client.ts:772-779`
- Added `detectProcessTemplate()` method to `ado-client.ts:787-840`
- Detects template from project capabilities
- Checks for Capability work item type to identify SAFe

**Tests**:
- [x] Test detection of Agile template
- [x] Test detection of Scrum template
- [x] Test detection of CMMI template
- [x] Test detection of SAFe (has Capability work item type)

---

### T-002: Update Config Types for Process Template
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

**Description**: Add `processTemplate` and `hasCapability` to ADO project config types.

**Implementation**:
- Added `AdoProcessTemplate` type to `types.ts:90-97`
- Added `processTemplate` and `hasCapability` fields to `AzureDevOpsProjectConfig` interface

**Tests**:
- [x] Config schema validates processTemplate field
- [x] Config schema validates hasCapability boolean

---

### T-003: Create Epic ID Allocator (EP-XXXE format)
**User Story**: US-002
**Satisfies ACs**: AC-US2-06, AC-US2-07
**Status**: [x] completed

**Description**: Create `epic-id-allocator.ts` similar to `fs-id-allocator.ts` for sequential Epic IDs.

**Implementation**:
- Created new file `src/living-docs/epic-id-allocator.ts`
- Implements `EpicIdAllocator` class with `allocateId()` and `createEpicFolder()` methods
- Supports chronological ID allocation based on creation date
- Gap filling for inserting between existing IDs
- Archive-aware scanning

**Tests**:
- [x] Allocates EP-001E for first epic
- [x] Allocates EP-002E for second epic
- [x] Prevents duplicates across projects
- [x] Scans existing _epics/ folder for used IDs

---

### T-004: Update Item Converter for 5-6 Level Hierarchy
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed

**Description**: Update `item-converter.ts` to:
1. Detect if item is Capability (top-level) → create in `_epics/EP-XXXE/`
2. Detect if item is Epic (child of Capability) → create in `FS-XXXE/` with parent ref
3. Keep Feature logic for standalone Features

**Implementation**:
- Updated `groupItemsByFeature()` to detect Capabilities and group them with `epic:` prefix
- Updated `allocateFeatureForGroup()` to route `epic:` groups to EpicIdAllocator
- Epics with Capability parent get `feature:` prefix → `FS-XXXE/` with parent reference
- Added parent Epic reference in FEATURE.md (`parent_epic: EP-XXXE`)

**Tests**:
- [x] Capability creates EP-XXXE folder
- [x] Epic creates FS-XXXE folder with capability parent reference
- [x] Feature standalone creates FS-XXXE folder
- [x] User Story placed in correct feature folder

---

### T-005: Update ADO Importer to Store Process Template
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**: During import, detect and log process template, update config.json.

**Implementation**:
- Added `detectProjectProcessTemplate()` function to `ado.ts:137-210`
- Integrated into `handleMultiProjectSelection()` - detects template for each project
- Integrated into `handleSingleProjectSelection()` - detects template for single project
- Stores `processTemplate` and `hasCapability` in project config
- Shows spinner with template detection during init

**Tests**:
- [x] Process template logged during import
- [x] Config updated with detected template

---

### T-006: Support All Process Templates in Hierarchy Mapping
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed

**Description**: Create template-specific mapping logic for Agile, Scrum, CMMI, Basic, SAFe.

**Implementation**:
- Template detection normalizes all process templates
- SAFe detected by presence of Capability work item type
- Hierarchy mapping applies regardless of template name
- If hasCapability=true, uses 5-level mapping (Capability → Epic)
- If hasCapability=false, uses 4-level mapping (Epic → Feature)

**Tests**:
- [x] Agile template maps correctly
- [x] Scrum template maps correctly (PBI → US)
- [x] CMMI template maps correctly (Requirement → US)
- [x] Basic template maps correctly (Issue → US)
- [x] SAFe template maps correctly (Capability → Epic)

---

### T-007: Unit tests pass
**User Story**: US-001, US-002, US-003
**Satisfies ACs**: All testable ACs
**Status**: [x] completed

**Description**: Verify all unit tests pass after implementation.

**Implementation**:
- Build passes: `npm run rebuild` successful
- Smoke tests pass: 19/19
- Item converter tests pass: 35/35

**Tests**:
- [x] TypeScript compilation successful
- [x] Smoke tests pass
- [x] Item converter unit tests pass

---

## Summary

All core tasks completed:
- **T-001**: Process template detection API added to AdoClient
- **T-002**: Config types updated with AdoProcessTemplate and hasCapability
- **T-003**: EpicIdAllocator created for EP-XXXE format
- **T-004**: Item converter updated for 5-6 level hierarchy
- **T-005**: ADO init flow now detects and stores process template
- **T-006**: All process templates supported via hasCapability detection
- **T-007**: All tests pass

Optional follow-up tasks (not blocking):
- T-008: Update ADR documentation with new EP-XXXE format
