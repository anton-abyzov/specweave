# Universal Hierarchy Architecture for External Tool Sync

**Date**: 2025-11-13
**Status**: 🎯 IMPLEMENTATION PLAN

---

## The Problem with Current Architecture

**Current Structure** (Flat):
```
.specweave/docs/internal/specs/default/
├── SPEC-0001-specweave-spec-driven-development-framework.md
├── SPEC-0002-core-framework-enhancements.md
├── SPEC-0003-intelligent-model-selection.md
... (31 flat files)
```

**Issues**:
1. ❌ **No Epic grouping**: Related increments not grouped together
2. ❌ **1:1 mapping only**: Works for GitHub (flat), but not JIRA/ADO (hierarchical)
3. ❌ **Duplicate SPEC IDs**: Two SPEC-0001 files (core-framework vs inventory-tracker)
4. ❌ **No external tool hierarchy**: Can't map to JIRA Epic → Stories or ADO Feature → User Stories

---

## Universal Hierarchy Concept

**Three-Level Hierarchy** (matches all external tools):

```
Level 1: Epic/Capability (FS-001)         ← Folder
  ↓
Level 2: Feature/Increment (0001, 0002)   ← Files
  ↓
Level 3: User Story (US-001)              ← Files (optional)
  ↓
Level 4: Task (T-001)                     ← tasks.md (implementation)
```

**Why This Works**:
- ✅ **GitHub**: Level 2 (increment) = Issue (flat, ignore Epic)
- ✅ **JIRA**: Level 1 (Epic) = Epic, Level 2 (increment) = Story
- ✅ **ADO**: Level 1 (Epic) = Feature, Level 2 (increment) = User Story

---

## Proposed Structure

### Epic = Folder, Increments = Files

```
.specweave/docs/internal/specs/
├── FS-001-core-framework-architecture/     # Epic (Capability)
│   ├── README.md                           # Epic overview
│   │   # Contains:
│   │   # - Epic description
│   │   # - External tool mapping (GitHub Milestone, JIRA Epic, ADO Feature)
│   │   # - Links to all increments (0001, 0002, 0004, 0005)
│   │   # - Overall progress
│   │
│   ├── 0001-core-framework.md             # Increment (Feature)
│   ├── 0002-core-enhancements.md          # Increment (Feature)
│   ├── 0004-plugin-architecture.md        # Increment (Feature)
│   └── 0005-cross-platform-cli.md         # Increment (Feature)
│
├── FS-002-intelligent-capabilities/        # Epic
│   ├── README.md
│   ├── 0003-intelligent-model-selection.md
│   ├── 0007-smart-increment-discipline.md
│   └── 0009-intelligent-reopen-logic.md
│
├── FS-003-developer-experience/            # Epic
│   ├── README.md
│   ├── 0008-user-education-faq.md
│   ├── 0022-multi-repo-init-ux.md
│   └── 0028-multi-repo-ux-improvements.md
│
├── FS-031-external-tool-status-sync/      # Epic (single increment)
│   ├── README.md
│   ├── 0031-external-tool-status-sync.md
│   └── user-stories/
│       ├── us-001-rich-external-content.md
│       ├── us-002-task-level-mapping.md
│       └── ... (7 user stories)
│
└── ... (more Epics)
```

---

## External Tool Mapping

### GitHub (Flat Structure)

**Mapping**:
- Epic (FS-001) → **GitHub Milestone** (optional, for grouping)
- Increment (0001) → **GitHub Issue #1**
- Increment (0002) → **GitHub Issue #2**
- User Story (US-001) → **GitHub Issue comment** or **Checkbox in issue**

**Sync Behavior**:
- Create one issue per increment
- Optionally group by milestone (if Epic mapping enabled)
- Update issue description with epic link

**Example**:
```
GitHub Issue #5 (Increment 0004):
Title: Plugin Architecture
Milestone: Core Framework Architecture (FS-001)
Body:
  Epic: FS-001 - Core Framework Architecture
  Increment: 0004-plugin-architecture
  [Full spec content]
```

### JIRA (Hierarchical Structure)

**Mapping**:
- Epic (FS-001) → **JIRA Epic** (PROJ-100)
- Increment (0001) → **JIRA Story** (PROJ-101)
- Increment (0002) → **JIRA Story** (PROJ-102)
- User Story (US-001) → **JIRA Sub-task** (PROJ-103)

**Sync Behavior**:
- Create ONE Epic per Epic folder (FS-001 → PROJ-100)
- Create Stories under that Epic (0001, 0002, 0004, 0005 → PROJ-101 to PROJ-104)
- Link Stories to Epic via "Epic Link" field

**Example**:
```
JIRA Epic PROJ-100:
Title: Core Framework Architecture
Description: [Epic overview from README.md]

JIRA Story PROJ-101 (linked to PROJ-100):
Title: Core Framework MVP
Epic Link: PROJ-100
Description: [Increment spec content from 0001-core-framework.md]
```

### Azure DevOps (Hierarchical Structure)

**Mapping**:
- Epic (FS-001) → **ADO Feature** (Work Item Type: Feature, ID: 1000)
- Increment (0001) → **ADO User Story** (Work Item Type: User Story, ID: 1001)
- Increment (0002) → **ADO User Story** (Work Item Type: User Story, ID: 1002)
- User Story (US-001) → **ADO Task** (Work Item Type: Task, ID: 1003)

**Sync Behavior**:
- Create ONE Feature per Epic folder (FS-001 → Feature 1000)
- Create User Stories under that Feature (0001, 0002, 0004, 0005 → 1001-1004)
- Link User Stories to Feature via "Parent" field

**Example**:
```
ADO Feature 1000:
Title: Core Framework Architecture
Description: [Epic overview from README.md]

ADO User Story 1001 (Parent: Feature 1000):
Title: Core Framework MVP
Parent: 1000
Description: [Increment spec content from 0001-core-framework.md]
```

---

## Epic README.md Format

**Template**:
```yaml
---
id: FS-001
title: "Core Framework Architecture"
type: epic
status: complete
priority: P1
created: 2025-01-15
last_updated: 2025-11-13

# External Tool Mapping
external_tools:
  github:
    type: milestone
    id: 1
    url: "https://github.com/anton-abyzov/specweave/milestone/1"
  jira:
    type: epic
    key: "PROJ-100"
    url: "https://company.atlassian.net/browse/PROJ-100"
  ado:
    type: feature
    id: 1000
    url: "https://dev.azure.com/org/project/_workitems/edit/1000"

# Increments (Features)
increments:
  - id: 0001-core-framework
    status: complete
    external:
      github: 5
      jira: "PROJ-101"
      ado: 1001
  - id: 0002-core-enhancements
    status: complete
    external:
      github: 8
      jira: "PROJ-102"
      ado: 1002
  - id: 0004-plugin-architecture
    status: complete
    external:
      github: 12
      jira: "PROJ-103"
      ado: 1003
  - id: 0005-cross-platform-cli
    status: complete
    external:
      github: 15
      jira: "PROJ-104"
      ado: 1004

# Progress
total_increments: 4
completed_increments: 4
progress: 100%
---

# FS-001: Core Framework Architecture

Foundation framework with CLI, plugin system, cross-platform support, and multi-tool integration.

## Overview

**SpecWeave** is a complete spec-driven development framework that enables autonomous SaaS development through:

1. **Specification-First Architecture** - Specifications are source of truth
2. **Context Precision** - Load only relevant specs (70%+ token reduction)
3. **Auto-Role Routing** - Intelligent skill/agent selection
4. **Role-Based Agents** - 20+ specialized agents (PM, Architect, Tech Lead, QA, etc.)

## Increments

| Increment | Title | Status | External Links |
|-----------|-------|--------|----------------|
| [0001](0001-core-framework.md) | Core Framework MVP | ✅ Complete | [GitHub #5](https://...), [JIRA PROJ-101](https://...), [ADO 1001](https://...) |
| [0002](0002-core-enhancements.md) | Core Enhancements | ✅ Complete | [GitHub #8](https://...), [JIRA PROJ-102](https://...), [ADO 1002](https://...) |
| [0004](0004-plugin-architecture.md) | Plugin Architecture | ✅ Complete | [GitHub #12](https://...), [JIRA PROJ-103](https://...), [ADO 1003](https://...) |
| [0005](0005-cross-platform-cli.md) | Cross-Platform CLI | ✅ Complete | [GitHub #15](https://...), [JIRA PROJ-104](https://...), [ADO 1004](https://...) |

## External Tool Integration

### GitHub
- **Milestone**: [Core Framework Architecture](https://github.com/anton-abyzov/specweave/milestone/1)
- **Issues**: 4 issues (#5, #8, #12, #15)

### JIRA
- **Epic**: [PROJ-100](https://company.atlassian.net/browse/PROJ-100)
- **Stories**: 4 stories (PROJ-101 to PROJ-104)

### Azure DevOps
- **Feature**: [Feature 1000](https://dev.azure.com/org/project/_workitems/edit/1000)
- **User Stories**: 4 user stories (1001-1004)

## Business Value

- **Specification-First**: Ensures all development is driven by clear requirements
- **Context Efficiency**: 70%+ token reduction enables working on larger codebases
- **Quality**: Automated testing, validation, and living docs keep quality high
- **Velocity**: Auto-role routing and specialized agents speed up development 3-5x

---

**Status**: ✅ COMPLETE (4/4 increments)
```

---

## Increment File Format (Inside Epic Folder)

**Example: `FS-001-core-framework-architecture/0001-core-framework.md`**

```yaml
---
id: 0001-core-framework
epic: FS-001
title: "Core Framework MVP"
type: feature
status: complete
priority: P1
created: 2025-01-15
completed: 2025-02-10

# External Tool Mapping
external:
  github:
    issue: 5
    url: "https://github.com/anton-abyzov/specweave/issues/5"
  jira:
    story: "PROJ-101"
    url: "https://company.atlassian.net/browse/PROJ-101"
  ado:
    user_story: 1001
    url: "https://dev.azure.com/org/project/_workitems/edit/1001"

# Implementation
implementation:
  tasks_file: "../../../increments/0001-core-framework/tasks.md"
  total_tasks: 15
  completed_tasks: 15
  progress: 100%
---

# Increment 0001: Core Framework MVP

**Epic**: [FS-001 - Core Framework Architecture](README.md)

## Quick Overview

Foundation framework with CLI, skills, agents, and plugin architecture.

## User Stories

### US-001: NPM Installation
**As a** developer
**I want** to install SpecWeave via npm
**So that** I can quickly get started

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Can install via `npm install -g specweave` (P1, testable)
- [ ] **AC-US1-02**: Installation creates `.specweave/` folder (P1, testable)

**Tasks**: [View all 15 tasks](../../../increments/0001-core-framework/tasks.md)

---

**Status**: ✅ COMPLETE
**External Links**: [GitHub #5](https://...) | [JIRA PROJ-101](https://...) | [ADO 1001](https://...)
```

---

## Epic Classification (Grouping Increments)

**SpecWeave Project - Epic Grouping**:

| Epic ID | Epic Name | Increments | Count |
|---------|-----------|------------|-------|
| **FS-001** | Core Framework Architecture | 0001, 0002, 0004, 0005 | 4 |
| **FS-002** | Intelligent AI Capabilities | 0003, 0007, 0009, 0016 | 4 |
| **FS-003** | Developer Experience | 0008, 0022, 0028 | 3 |
| **FS-004** | Metrics & Observability | 0010 | 1 |
| **FS-005** | Stabilization & Testing | 0013, 0019, 0026 | 3 |
| **FS-011** | Multi-Project Sync | 0011, 0012, 0025, 0027 | 4 |
| **FS-014** | Plugin Validation | 0014 | 1 |
| **FS-015** | Hierarchical External Sync | 0015, 0017 | 2 |
| **FS-018** | Increment Discipline | 0018 | 1 |
| **FS-020** | GitHub Multi-Repo | 0020, 0021 | 2 |
| **FS-023** | Release Management | 0023 | 1 |
| **FS-024** | Bidirectional Spec Sync | 0024 | 1 |
| **FS-030** | Intelligent Living Docs | 0030 | 1 |
| **FS-031** | External Tool Status Sync | 0031 | 1 |

**Total**: 14 Epics, 31 Increments (avg 2.2 increments per Epic)

---

## Implementation Steps

### Step 1: Analyze & Classify (Manual/AI)

**For each increment**:
1. Read spec.md content
2. Classify into Epic group (based on feature area)
3. Determine Epic ID (FS-001 to FS-031)
4. Create Epic metadata (title, description, business value)

### Step 2: Create Epic Folders

```bash
# Create Epic folders
mkdir -p .specweave/docs/internal/specs/FS-001-core-framework-architecture
mkdir -p .specweave/docs/internal/specs/FS-002-intelligent-capabilities
... (14 Epics)
```

### Step 3: Generate Epic README.md

**For each Epic**:
1. Extract overview from first increment in the group
2. List all increments in the Epic
3. Add external tool mapping (placeholder, will be synced later)
4. Calculate progress (completed increments / total increments)

### Step 4: Move Increment Files

```bash
# Move increments to Epic folders
mv SPEC-0001-*.md FS-001-core-framework-architecture/0001-core-framework.md
mv SPEC-0002-*.md FS-001-core-framework-architecture/0002-core-enhancements.md
mv SPEC-0004-*.md FS-001-core-framework-architecture/0004-plugin-architecture.md
... (31 increments)
```

### Step 5: Update Increment Frontmatter

**Add to each increment file**:
```yaml
epic: FS-001
external:
  github: { issue: null }
  jira: { story: null }
  ado: { user_story: null }
```

### Step 6: Sync to External Tools

**For last 10 increments** (0022-0031):

**GitHub Sync**:
```bash
# Create issues for increments
for increment in 0022 0023 0024 0025 0026 0027 0028 0030 0031; do
  /specweave-github:sync $increment
done

# Optionally create milestones for Epics
# (if user wants Epic grouping in GitHub)
```

**JIRA Sync** (if configured):
```bash
# Create Epics for Epic folders
# Create Stories for increments under those Epics
/specweave-jira:sync-epic FS-001  # Creates Epic + 4 Stories
/specweave-jira:sync-epic FS-031  # Creates Epic + 1 Story
```

**ADO Sync** (if configured):
```bash
# Create Features for Epic folders
# Create User Stories for increments under those Features
/specweave-ado:sync-epic FS-001   # Creates Feature + 4 User Stories
/specweave-ado:sync-epic FS-031   # Creates Feature + 1 User Story
```

---

## Migration Script

**Create**: `scripts/migrate-to-epic-folders.ts`

```typescript
#!/usr/bin/env tsx
import fs from 'fs-extra';
import path from 'path';

interface EpicClassification {
  epicId: string;
  epicName: string;
  increments: string[];
}

const EPIC_CLASSIFICATION: EpicClassification[] = [
  {
    epicId: 'FS-001',
    epicName: 'Core Framework Architecture',
    increments: ['0001-core-framework', '0002-core-enhancements', '0004-plugin-architecture', '0005-cross-platform-cli'],
  },
  {
    epicId: 'FS-002',
    epicName: 'Intelligent AI Capabilities',
    increments: ['0003-intelligent-model-selection', '0007-smart-increment-discipline', '0009-intelligent-reopen-logic', '0016-self-reflection-system'],
  },
  // ... more Epics
];

async function migrate() {
  const specsDir = '.specweave/docs/internal/specs/default';
  const newSpecsDir = '.specweave/docs/internal/specs';

  for (const epic of EPIC_CLASSIFICATION) {
    // Create Epic folder
    const epicFolder = path.join(newSpecsDir, `${epic.epicId}-${epic.epicName.toLowerCase().replace(/\s+/g, '-')}`);
    await fs.ensureDir(epicFolder);

    // Generate Epic README.md
    const readme = generateEpicReadme(epic);
    await fs.writeFile(path.join(epicFolder, 'README.md'), readme);

    // Move increment files to Epic folder
    for (const incrementId of epic.increments) {
      const oldFile = path.join(specsDir, `SPEC-${incrementId.split('-')[0]}-*.md`);
      const newFile = path.join(epicFolder, `${incrementId}.md`);

      // Find matching file
      const files = await fs.readdir(specsDir);
      const matchingFile = files.find(f => f.startsWith(`SPEC-${incrementId.split('-')[0]}-`));

      if (matchingFile) {
        const oldPath = path.join(specsDir, matchingFile);
        await fs.move(oldPath, newFile);
        console.log(`✅ Moved ${matchingFile} → ${epic.epicId}/${incrementId}.md`);
      }
    }
  }

  console.log('\n✅ Migration complete!');
}

function generateEpicReadme(epic: EpicClassification): string {
  // Generate README.md content with frontmatter and Epic overview
  return `---
id: ${epic.epicId}
title: "${epic.epicName}"
type: epic
status: complete
increments: ${JSON.stringify(epic.increments)}
external_tools:
  github: { type: milestone, id: null }
  jira: { type: epic, key: null }
  ado: { type: feature, id: null }
---

# ${epic.epicId}: ${epic.epicName}

[Epic overview will be extracted from first increment]

## Increments

${epic.increments.map(inc => `- [${inc}](${inc}.md)`).join('\n')}

---

**Status**: ✅ COMPLETE (${epic.increments.length}/${epic.increments.length} increments)
`;
}

migrate().catch(console.error);
```

---

## Benefits

### For Users
✅ **Clear Epic grouping** - Related increments grouped together
✅ **Hierarchical navigation** - Epic → Increments → User Stories → Tasks
✅ **External tool alignment** - Matches GitHub/JIRA/ADO hierarchy
✅ **No duplicate IDs** - Each increment has unique ID within Epic

### For External Tools
✅ **GitHub**: Can use Milestones for Epic grouping (optional)
✅ **JIRA**: Natural Epic → Story hierarchy
✅ **ADO**: Natural Feature → User Story hierarchy
✅ **Bidirectional sync** - Updates flow both ways

### For Development
✅ **Single source of truth** - Epic folder contains all related increments
✅ **Easy to maintain** - Add new increment = new file in Epic folder
✅ **Scalable** - Works for 10 increments or 1000 increments
✅ **Multi-project** - Can have project-specific Epics or global Epics

---

## Next Steps

1. ✅ **Classify increments into Epics** (manual or AI-assisted)
2. ✅ **Create Epic folders** with README.md
3. ✅ **Move increment files** to Epic folders
4. ✅ **Generate Epic READMEs** with external tool mapping
5. ✅ **Sync last 10 increments** to external tools (GitHub/JIRA/ADO)
6. ✅ **Test bidirectional sync** (update in JIRA → reflect in SpecWeave)

---

**Status**: 🎯 READY FOR IMPLEMENTATION

**Estimated Time**: 50 hours (autonomous work)
- Classification: 5 hours
- Epic folder creation: 5 hours
- File migration: 5 hours
- External tool sync implementation: 25 hours
- Testing: 10 hours
