# Specs Restructuring Plan - Enterprise-Grade Hierarchy

**Status**: Implementation Plan
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**Current State**: FS-* folders contain increment specs (0001-.md) mixed with permanent docs
**Target State**: Clean hierarchy with Feature Specs (Epics) → User Stories → Tasks
**Complexity Level**: **Standard** (SpecWeave is a medium-sized project, 6-20 people)

---

## Part 1: Current Structure Analysis

### What We Have Now

```
.specweave/docs/internal/specs/
├── FS-001-core-framework-architecture/
│   ├── 0001-core-framework.md          ❌ Increment spec (should be elsewhere)
│   ├── 0002-core-enhancements.md       ❌ Increment spec (should be elsewhere)
│   ├── 0004-plugin-architecture.md     ❌ Increment spec (should be elsewhere)
│   ├── 0005-cross-platform-cli.md      ❌ Increment spec (should be elsewhere)
│   └── README.md                        ✅ Good (navigation)
├── FS-002-intelligent-ai-capabilities/
│   ├── 0003-intelligent-model-selection.md  ❌ Increment spec
│   ├── 0007-smart-increment-discipline.md   ❌ Increment spec
│   ├── 0009-intelligent-reopen-logic.md     ❌ Increment spec
│   ├── 0016-self-reflection-system.md       ❌ Increment spec
│   └── README.md                             ✅ Good
...
├── FS-031-external-tool-status-synchronization/
│   ├── 0031-external-tool-status-sync.md   ❌ Increment spec
│   ├── user-stories/                        ✅ Good!
│   │   ├── US-001-rich-external-issue-content.md
│   │   ├── US-002-task-level-mapping.md
│   │   └── ...
│   └── README.md
└── default/                                  ❌ Old structure (needs migration)
    ├── SPEC-0031-external-tool-status-synchronization.md
    ├── user-stories/
    ├── _backup/
    ├── _backup-manual/
    └── _archive/
```

### Problems Identified

1. **Mixed Content**: FS-* folders contain increment specs (temporary) instead of user stories (permanent)
2. **Missing Epic Overview**: No `spec.md` file describing the epic/feature
3. **Inconsistent Structure**: FS-031 has user-stories/, but others have increment specs
4. **Old "default" Folder**: Contains legacy structure, duplicate content, multiple _backup folders
5. **No Clear Hierarchy**: Increments mixed with strategic docs

---

## Part 2: Target Structure (Standard Level)

### What We Should Have

```
.specweave/docs/internal/specs/
├── FS-001-core-framework-architecture/       (Epic)
│   ├── spec.md                               ✅ Epic overview (NEW!)
│   ├── user-stories/                         ✅ Permanent user stories
│   │   ├── US-001-cli-initialization.md
│   │   ├── US-002-config-management.md
│   │   ├── US-003-plugin-loader.md
│   │   └── US-004-hook-system.md
│   └── README.md                             ✅ Navigation
├── FS-002-intelligent-ai-capabilities/       (Epic)
│   ├── spec.md                               ✅ Epic overview
│   ├── user-stories/
│   │   ├── US-001-intelligent-model-selection.md
│   │   ├── US-002-cost-tracking.md
│   │   ├── US-003-phase-detection.md
│   │   └── US-004-self-reflection.md
│   └── README.md
├── FS-003-developer-experience/              (Epic)
│   ├── spec.md
│   ├── user-stories/
│   │   ├── US-001-user-education-faq.md
│   │   ├── US-002-multi-repo-init-ux.md
│   │   └── US-003-ux-improvements.md
│   └── README.md
...
├── FS-031-external-tool-status-synchronization/
│   ├── spec.md                               ✅ Already has user-stories/
│   ├── user-stories/
│   │   ├── US-001-rich-external-issue-content.md
│   │   ├── US-002-task-level-mapping.md
│   │   ├── US-003-status-mapping.md
│   │   ├── US-004-bidirectional-sync.md
│   │   ├── US-005-user-prompts.md
│   │   ├── US-006-conflict-resolution.md
│   │   └── US-007-multi-tool-support.md
│   └── README.md
```

**Note**: Increment specs (0001-.md) remain in `.specweave/increments/` (NOT in FS-* folders)

---

## Part 3: Hierarchy Mapping (Standard Level)

### Universal Hierarchy (from guide)

**SpecWeave uses Standard Level** (team 6-20, multiple features, 3-12 months):

| SpecWeave | GitHub | Jira | ADO |
|-----------|--------|------|-----|
| **Feature Spec (FS-*)** | Project / Milestone | Epic | Epic |
| **User Story (US-*)** | Issue / Section | Story | User Story |
| **Task (T-*)** | Checkbox | Sub-task | Task |

### Example: FS-001 Mapping

**SpecWeave Structure**:
```
FS-001-core-framework-architecture/
├── spec.md (Epic overview: "Core Framework Architecture")
└── user-stories/
    ├── US-001-cli-initialization.md
    ├── US-002-config-management.md
    └── US-003-plugin-loader.md
```

**Maps to GitHub**:
```
GitHub Project: "Core Framework Architecture"
├── Issue #1: "US-001: CLI Initialization"
│   └── Checkboxes: [T-001, T-002, T-003]
├── Issue #2: "US-002: Config Management"
│   └── Checkboxes: [T-004, T-005]
└── Issue #3: "US-003: Plugin Loader"
    └── Checkboxes: [T-006, T-007, T-008]
```

**Maps to Jira**:
```
Jira Epic: "SW-1: Core Framework Architecture"
├── Story: "SW-2: US-001 CLI Initialization"
│   ├── Sub-task: "SW-3: T-001 Create CLI Entry Point"
│   ├── Sub-task: "SW-4: T-002 Parse Arguments"
│   └── Sub-task: "SW-5: T-003 Validate Flags"
├── Story: "SW-6: US-002 Config Management"
│   └── Sub-task: "SW-7: T-004 Load Config File"
└── Story: "SW-8: US-003 Plugin Loader"
    └── Sub-task: "SW-9: T-006 Discover Plugins"
```

**Maps to Azure DevOps**:
```
ADO Epic: "Core Framework Architecture" (WI-100)
├── Feature: "Phase 1: Foundation" (WI-200) ← From Increment 0001
│   ├── User Story: "US-001: CLI Initialization" (WI-201)
│   │   ├── Task: "T-001: Create CLI Entry Point" (WI-202)
│   │   └── Task: "T-002: Parse Arguments" (WI-203)
│   └── User Story: "US-002: Config Management" (WI-204)
│       └── Task: "T-004: Load Config File" (WI-205)
└── Feature: "Phase 2: Plugins" (WI-300) ← From Increment 0004
    └── User Story: "US-003: Plugin Loader" (WI-301)
        └── Task: "T-006: Discover Plugins" (WI-302)
```

---

## Part 4: Implementation Steps

### Step 1: Create spec.md for Each FS-* Folder

For each FS-* folder, create a `spec.md` file with:
- Epic overview
- Business value
- High-level user stories
- Implementation history (which increments implemented this)

**Template**:
```yaml
---
id: FS-001
title: "Core Framework Architecture"
type: epic
status: in-progress | complete
priority: P0 | P1 | P2 | P3
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
# External Tool Mapping
external_tools:
  github:
    type: project | milestone
    id: null
    url: null
  jira:
    type: epic
    key: null
    url: null
  ado:
    type: epic
    id: null
    url: null
---

# FS-001: Core Framework Architecture

## Epic Overview

[High-level description of the epic]

## Business Value

- **Problem**: What problem does this solve?
- **Solution**: What does this epic deliver?
- **Impact**: What's the business impact?

## User Stories

- [US-001: CLI Initialization](user-stories/US-001-cli-initialization.md)
- [US-002: Config Management](user-stories/US-002-config-management.md)
- [US-003: Plugin Loader](user-stories/US-003-plugin-loader.md)

## Implementation History

| Increment | Stories Implemented | Status | Completion Date |
|-----------|-------------------|--------|----------------|
| [0001-core-framework](../../../../increments/0001-core-framework/) | US-001, US-002 | ✅ Complete | 2025-01-20 |
| [0004-plugin-architecture](../../../../increments/0004-plugin-architecture/) | US-003 | ✅ Complete | 2025-02-15 |

## Architecture

[Link to HLDs, ADRs, diagrams]

## External Tool Integration

**GitHub Project**: [Link if synced]
**Jira Epic**: [Link if synced]
**Azure DevOps Epic**: [Link if synced]
```

### Step 2: Extract User Stories from Increment Specs

For each increment spec (0001-.md) in FS-* folders:
1. Parse the file to extract user stories (sections starting with "US-")
2. Create individual `US-*.md` files in `user-stories/` subfolder
3. Remove increment spec from FS-* folder
4. Keep increment spec in `.specweave/increments/####/` (source of truth)

**User Story Template**:
```yaml
---
id: US-001
title: "CLI Initialization"
epic: FS-001-core-framework-architecture
status: complete | in-progress | planned
priority: P0 | P1 | P2 | P3
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
# External Tool Mapping
external_tools:
  github:
    type: issue
    number: null
    url: null
  jira:
    type: story
    key: null
    url: null
  ado:
    type: user-story
    id: null
    url: null
# Implementation
increments:
  - id: 0001-core-framework
    status: complete
    tasks: [T-001, T-002, T-003]
---

# US-001: CLI Initialization

## Description

As a developer, I want to initialize SpecWeave from command line...

## Acceptance Criteria

- **AC-US1-01**: CLI can be invoked with `specweave init`
- **AC-US1-02**: CLI validates required arguments
- **AC-US1-03**: CLI shows help message on invalid input

## Implementation

**Increment**: [0001-core-framework](../../../../increments/0001-core-framework/)
**Status**: ✅ Complete
**Completion Date**: 2025-01-20

### Tasks

- [T-001: Create CLI Entry Point](../../../../increments/0001-core-framework/tasks.md#t-001)
- [T-002: Parse Arguments](../../../../increments/0001-core-framework/tasks.md#t-002)
- [T-003: Validate Flags](../../../../increments/0001-core-framework/tasks.md#t-003)

## Related Documents

- **Epic**: [FS-001: Core Framework Architecture](../spec.md)
- **Architecture**: [HLD: CLI Architecture](../../architecture/hld-cli.md)
- **Tests**: [Test Strategy](../../../../increments/0001-core-framework/tasks.md)
```

### Step 3: Migrate default/SPEC-0031 to FS-031

The `default/` folder contains legacy structure for SPEC-0031 (now FS-031):

**Actions**:
1. FS-031 already has correct structure (user-stories/)
2. Remove duplicate files in `default/`
3. Archive _backup, _backup-manual, _archive folders
4. Update references to point to FS-031

### Step 4: Update Living Docs Sync Hook

Modify `plugins/specweave/lib/hooks/sync-living-docs.ts` to:

1. **Parse Increment Spec** (spec.md):
   - Extract user stories (US-001, US-002, etc.)
   - Identify which FS-* epic they belong to
   - Extract frontmatter metadata

2. **Distribute to Correct FS-* Folder**:
   - Create/update user-stories/US-*.md files
   - Update epic spec.md with implementation history
   - Update README.md with navigation

3. **Generate Cross-Links**:
   - User Story → Epic (parent link)
   - User Story → Increment (implementation link)
   - Epic → User Stories (children links)

4. **Preserve Hierarchy**:
   - Don't flatten - keep FS-* → user-stories/ → US-*.md structure
   - Generate Docusaurus-compatible frontmatter
   - Create bidirectional links

### Step 5: Update Spec Distributor

Modify `src/core/living-docs/spec-distributor.ts` to:

1. **Classify Content**:
   - Epic Overview → `FS-*/spec.md`
   - User Story → `FS-*/user-stories/US-*.md`
   - Architecture → `.specweave/docs/internal/architecture/`
   - ADR → `.specweave/docs/internal/architecture/adr/`
   - Operations → `.specweave/docs/internal/operations/`

2. **Support Hierarchy Mapping**:
   - Detect which FS-* epic a user story belongs to
   - Use frontmatter (`epic: FS-001`) or keyword detection
   - Score confidence (explicit > keyword > fallback)

3. **Handle External Tool Metadata**:
   - Parse external tool IDs from metadata.json
   - Update frontmatter with GitHub/Jira/ADO links
   - Track sync status (synced/unsynced/conflict)

### Step 6: Cleanup _backup Folders

**Actions**:
1. Move all _backup folders to `.specweave/docs/internal/specs/_archive/`
2. Add README.md explaining what's archived
3. Update .gitignore to exclude _archive/

---

## Part 5: Configuration for Sync

### .specweave/config.json

```json
{
  "sync": {
    "level": "standard",
    "activeProfile": "specweave-dev",
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave",
          "mapping": {
            "featureSpec": "project",
            "userStory": "issue",
            "task": "checkbox"
          }
        }
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "atomicSync": true,
      "extractEpic": true,
      "hierarchyMapping": {
        "enabled": true,
        "level": "standard",
        "epicFolder": "FS-*",
        "userStoryFolder": "user-stories",
        "preserveHierarchy": true
      }
    }
  }
}
```

---

## Part 6: Validation Checklist

After restructuring, validate:

- [ ] Each FS-* folder has `spec.md` (epic overview)
- [ ] Each FS-* folder has `user-stories/` subfolder
- [ ] Each user story has frontmatter with epic reference
- [ ] Each user story has implementation history (which increment)
- [ ] No increment specs (0001-.md) in FS-* folders
- [ ] All _backup folders moved to _archive/
- [ ] README.md files updated with correct navigation
- [ ] Cross-links work (US → Epic, Epic → US, US → Increment)
- [ ] External tool metadata present in frontmatter
- [ ] Living docs sync hook creates correct structure

---

## Part 7: Benefits

### Before (Current State)

- ❌ Mixed content (increment specs + strategic docs)
- ❌ No clear hierarchy
- ❌ Hard to find user stories
- ❌ Increments duplicate content from living docs
- ❌ External tools can't map properly

### After (Target State)

- ✅ Clean hierarchy (Epic → User Stories → Tasks)
- ✅ Strategic docs separate from implementation
- ✅ User stories easy to find (FS-*/user-stories/)
- ✅ Increments reference living docs (no duplication)
- ✅ External tools map correctly (Epic → Project/Epic)
- ✅ Full traceability (US → Increment → Tasks)
- ✅ Ready for GitHub/Jira/ADO sync

---

## Part 8: Example Transformation

### Before: FS-001 Current Structure

```
FS-001-core-framework-architecture/
├── 0001-core-framework.md          ❌ Increment spec
├── 0002-core-enhancements.md       ❌ Increment spec
├── 0004-plugin-architecture.md     ❌ Increment spec
├── 0005-cross-platform-cli.md      ❌ Increment spec
└── README.md
```

### After: FS-001 Target Structure

```
FS-001-core-framework-architecture/
├── spec.md                          ✅ Epic overview
├── user-stories/
│   ├── US-001-cli-initialization.md
│   ├── US-002-config-management.md
│   ├── US-003-plugin-loader.md
│   ├── US-004-plugin-discovery.md
│   ├── US-005-hook-system.md
│   └── US-006-cross-platform-support.md
└── README.md                        ✅ Navigation
```

**Increment specs moved to**:
```
.specweave/increments/
├── 0001-core-framework/spec.md     ← References FS-001, US-001, US-002
├── 0002-core-enhancements/spec.md  ← References FS-001, US-003
├── 0004-plugin-architecture/spec.md← References FS-001, US-004
└── 0005-cross-platform-cli/spec.md ← References FS-001, US-006
```

---

## Part 9: Next Steps

1. **Phase 1**: Create spec.md for all FS-* folders (epic overviews)
2. **Phase 2**: Extract user stories from increment specs
3. **Phase 3**: Migrate default/ to FS-031 structure
4. **Phase 4**: Update living docs sync hook
5. **Phase 5**: Update spec distributor
6. **Phase 6**: Cleanup _backup folders
7. **Phase 7**: Test sync with real increment
8. **Phase 8**: Validate and document

---

## Summary

**Goal**: Transform FS-* folders from containing increment specs to containing strategic epic documentation with user stories

**Hierarchy**: Feature Spec (Epic) → User Stories → Tasks (Standard Level)

**External Mapping**: FS-* → GitHub Project/Jira Epic/ADO Epic

**Key Change**: Increment specs stay in `.specweave/increments/`, living docs in `.specweave/docs/internal/specs/`

**Result**: Clean, enterprise-grade documentation structure ready for external tool sync

---

**Status**: ✅ Ready for Implementation
**Date**: 2025-11-13
**Author**: SpecWeave Team
