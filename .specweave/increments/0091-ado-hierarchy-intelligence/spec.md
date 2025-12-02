---
increment: 0091-ado-hierarchy-intelligence
title: Intelligent ADO Hierarchy Mapping
status: completed
priority: P0
created: 2025-12-02
completedAt: 2025-12-02
---

# Intelligent ADO Hierarchy Mapping

## Problem Statement

SpecWeave's current ADO import incorrectly places **Capabilities** (5th level in ADO SAFe/Enterprise setups) into `FS-XXXE` folders, which are meant for Features (SpecWeave level 3).

**Current broken behavior:**
- ADO Capability "Implementation for v2.0" → `FS-001E/FEATURE.md` (WRONG!)
- Its child ADO Epic → Another `FS-XXXE/` folder (WRONG - loses hierarchy)

**Expected behavior:**
- ADO Capability → `_epics/EPIC-XXX/` folder (SpecWeave Epic level)
- ADO Epic (child of Capability) → `FS-XXXE/` with parent reference to capability
- ADO Feature → `FS-XXXE/` if no Epic parent
- ADO User Story → `us-xxxe.md` in appropriate feature folder

## Root Cause

1. No detection of ADO **process template** (Agile, Scrum, CMMI, Basic, SAFe)
2. `item-converter.ts` treats ALL "feature-level" ADO items the same (Capability, Epic, Feature all go to `FS-XXXE/`)
3. Missing intelligent mapping from 3-6 level external hierarchies to SpecWeave's 4-level structure

## User Stories

### US-001: Auto-Detect ADO Process Template

**As a** SpecWeave user importing from Azure DevOps
**I want** the system to automatically detect my ADO process template
**So that** hierarchy mapping uses the correct work item type hierarchy

#### Acceptance Criteria
- [x] **AC-US1-01**: Detect process template via ADO API during init/import (P0, testable)
- [x] **AC-US1-02**: Store detected template in `config.json` under ADO profile (P0, testable)
- [x] **AC-US1-03**: Support templates: Agile, Scrum, CMMI, Basic, SAFe/CMMI with Capabilities (P0, testable)
- [x] **AC-US1-04**: Log detected template during import for user visibility (P1, testable)

### US-002: Intelligent 5-6 Level Hierarchy Mapping

**As a** SpecWeave user with enterprise ADO setup (SAFe/CMMI)
**I want** Capabilities to map to `_epics/` and Epics to map to `FS-XXXE/`
**So that** my SpecWeave living docs preserve the full external hierarchy

#### Acceptance Criteria
- [x] **AC-US2-01**: ADO Capability → SpecWeave Epic (`_epics/EP-XXXE/`) with proper ID format (P0, testable)
- [x] **AC-US2-02**: ADO Epic (child of Capability) → SpecWeave Feature (`FS-XXXE/`) with parent reference (P0, testable)
- [x] **AC-US2-03**: ADO Feature (standalone) → SpecWeave Feature (`FS-XXXE/`) (P0, testable)
- [x] **AC-US2-04**: Parent Capability referenced in Feature's FEATURE.md description (P1, testable)
- [x] **AC-US2-05**: No separate `_capabilities/` folder - only 4 folder levels (P0, testable)
- [x] **AC-US2-06**: Epic IDs use `EP-XXXE` format (consistent with `FS-XXXE`) (P0, testable)
- [x] **AC-US2-07**: Epic ID allocator prevents duplicates across all projects (P0, testable)

### US-003: Support All ADO Process Templates

**As a** SpecWeave user with any ADO process template
**I want** correct hierarchy mapping regardless of template
**So that** import works for Agile, Scrum, CMMI, and SAFe setups

#### Acceptance Criteria
- [x] **AC-US3-01**: Agile: Epic → Feature → User Story → Task (4 levels) (P0, testable)
- [x] **AC-US3-02**: Scrum: Epic → Feature → PBI → Task (4 levels) (P0, testable)
- [x] **AC-US3-03**: CMMI: Epic → Feature → Requirement → Task (4 levels) (P0, testable)
- [x] **AC-US3-04**: Basic: Issue → Task (2 levels) (P1, testable)
- [x] **AC-US3-05**: SAFe/Enterprise: Capability → Epic → Feature → US → Task (5 levels) (P0, testable)

## Technical Design

### Process Template Detection

ADO API endpoint: `GET /{organization}/_apis/projects/{project}?api-version=7.0`

Response includes:
```json
{
  "capabilities": {
    "processTemplate": {
      "templateName": "Agile" | "Scrum" | "CMMI" | "Basic"
    }
  }
}
```

For SAFe detection, check for "Capability" work item type existence.

### Hierarchy Mapping Table

| ADO Template | ADO Level 5 | ADO Level 4 | ADO Level 3 | ADO Level 2 | ADO Level 1 | → SpecWeave |
|--------------|-------------|-------------|-------------|-------------|-------------|-------------|
| **Agile** | - | Epic | Feature | User Story | Task | Epic→Epic, Feature→Feature, US→US, Task→Task |
| **Scrum** | - | Epic | Feature | PBI | Task | Epic→Epic, Feature→Feature, PBI→US, Task→Task |
| **CMMI** | - | Epic | Feature | Requirement | Task | Epic→Epic, Feature→Feature, Req→US, Task→Task |
| **Basic** | - | - | - | Issue | Task | Issue→US, Task→Task |
| **SAFe/Enterprise** | Capability | Epic | Feature | User Story | Task | **Capability→Epic (EP-XXXE)**, Epic→Feature (FS-XXXE), Feature→Feature*, US→US, Task→Task |

*Feature as child of Epic: keep in same FS-XXXE folder, don't create separate folder

### Epic ID Format (`EP-XXXE`)

Consistent with Feature ID format (`FS-XXXE`):
- `EP` = Epic prefix
- `XXX` = Sequential number (001, 002, etc.)
- `E` = External suffix (imported from external tool)

**Examples:**
- ADO Capability "Implementation for v2.0" → `EP-001E`
- ADO Strategic Theme "2025 Q4 Platform" → `EP-002E`
- Next capability imported → `EP-003E` (auto-incremented)

**Folder structure:**
```
_epics/
├── EP-001E/
│   └── EPIC.md    # Capability: Implementation for v2.0
├── EP-002E/
│   └── EPIC.md    # Strategic Theme: 2025 Q4 Platform
```

### Config Schema Update

```json
{
  "sync": {
    "profiles": {
      "ado-main": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "project": "myproject",
          "processTemplate": "SAFe",  // NEW: Auto-detected
          "hierarchyMapping": {        // NEW: Template-specific mapping
            "capability": "epic",      // Maps to _epics/
            "epic": "feature",         // Maps to FS-XXXE/
            "feature": "feature",      // Maps to FS-XXXE/ (under epic if present)
            "user-story": "user-story",
            "task": "task"
          }
        }
      }
    }
  }
}
```

## Implementation Notes

1. **No new folders**: Do NOT create `_capabilities/` folder. Capabilities go to `_epics/`.
2. **Parent references**: When Epic has Capability parent, FEATURE.md includes link to parent EPIC.md
3. **Backwards compatible**: Existing imports continue to work (default to Agile mapping)
4. **Detection caching**: Store process template in config.json to avoid re-detection on every import

## Out of Scope

- JIRA hierarchy mapping (already working correctly)
- GitHub hierarchy (only 3 levels, working correctly)
- Custom ADO process templates (use closest match)
