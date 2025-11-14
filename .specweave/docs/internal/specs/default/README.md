# SpecWeave Project: Default

**Project Type**: Single-project mode
**Complexity Level**: Standard (Team 6-20, multiple features)
**Last Updated**: 2025-11-13

---

## Project Overview

This is the **default** project for SpecWeave, containing active feature specs (epics) and user stories for the core SpecWeave framework.

## Active Features

| Feature | Title | User Stories | Status | Priority |
|---------|-------|--------------|--------|----------|
| [intelligent-model-selection](intelligent-model-selection/) | Intelligent Model Selection | 11 | ✅ Complete | P0 |
| [plugin-architecture](plugin-architecture/) | Plugin Architecture | 15 | ✅ Complete | P0 |
| [release-management](release-management/) | Release Management | 0 | 🚧 In Progress | P1 |
| [bidirectional-spec-sync](bidirectional-spec-sync/) | Bidirectional Spec Sync | 0 | ✅ Complete | P1 |
| [external-tool-status-sync](external-tool-status-sync/) | External Tool Status Sync | 7 | ✅ Complete | P0 |

## Structure (NEW: Feature-Based Naming!)

**Key Changes (v0.18.0+)**:
- ✅ Features named by CONCEPT (release-management), not increment number (FS-023)
- ✅ FEATURE.md for feature overview (replaces README.md)
- ✅ Multiple increments can contribute to same feature
- ✅ Permanent feature folders (features are strategic, increments are tactical)

Each feature folder contains:
- **FEATURE.md** - Feature overview (high-level summary)
- **us-\*.md** - User story files directly in the feature folder

**Example**:
```
external-tool-status-sync/
├── FEATURE.md                                 ← Feature overview
├── us-001-rich-external-issue-content.md      ← User stories
├── us-002-task-level-mapping.md
├── us-003-status-mapping-configuration.md
└── (more user stories...)
```

## Hierarchy Mapping (Standard Level)

| SpecWeave | GitHub | Jira | ADO |
|-----------|--------|------|-----|
| **Feature** (permanent) | Project/Milestone | Epic | Epic |
| **US-* (User Story)** | Issue | Story | User Story |
| **T-* (Task)** | Checkbox | Sub-task | Task |

**Note**: Features are permanent (named by concept), increments are temporary (numbered)

## External Tool Integration

**GitHub**: https://github.com/anton-abyzov/specweave
**Jira**: Not configured
**Azure DevOps**: Not configured

## Progress

- **Total Features**: 5
- **Total User Stories**: 33 (11 + 15 + 7)
- **Completed**: 4 features with user stories
- **In Progress**: 1 (release-management)
- **Overall Progress**: 80%

---

## Living Docs Sync (NEW: Feature-Based + Bidirectional Linking!)

**How It Works**:
1. Complete increment: `/specweave:done 0031`
2. System automatically:
   - Detects feature folder via HierarchyMapper (external-tool-status-sync)
   - Writes feature overview to `external-tool-status-sync/FEATURE.md`
   - Distributes user stories to `external-tool-status-sync/us-*.md` files
   - **Creates bidirectional links** (Tasks ↔ User Stories)
   - Updates implementation history

**Bidirectional Linking** (v0.18.0+):
- **Forward (US → Tasks)**: User stories link to all implementing tasks
- **Reverse (Tasks → US)**: Tasks link back to their user story (NEW!)
- **How**: Uses AC-IDs from tasks.md (e.g., `AC-US1-01` → `US-001`)
- **Example**: `**User Story**: [US-001: Title](path)` added to each task
- **Result**: Complete traceability in both directions!

**Manual Sync**: Run SpecDistributor if needed:
```bash
node -e "import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const dist = new SpecDistributor(process.cwd());
  await dist.distribute('0031-external-tool-status-sync');
});"
```

**Key Changes (v0.18.0+)**:
- Features named by CONCEPT, not increment number
- FEATURE.md replaces README.md
- Multiple increments → same feature folder

---

**Note**: Increments (0001-xxx/) are stored in `.specweave/increments/` and reference features via frontmatter (`epic: release-management`).

**Last Updated**: 2025-11-13 (Feature-based naming + Bidirectional linking implemented)
