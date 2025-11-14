# External Tool-Aware Living Docs Architecture

**Date**: 2025-11-13
**Status**: 🎯 DESIGN PROPOSAL

---

## The Problem with Current Architecture

### What's Wrong

**Current (GENERIC)**:
```
SPEC-0031-external-tool-status-synchronization.md
└── user-stories/
    ├── us-001-rich-external-issue-content.md
    ├── us-002-task-level-mapping-traceability.md
    └── ...
```

**Issues**:
- ❌ Uses generic "SPEC" terminology
- ❌ Doesn't match external tool structure
- ❌ Same naming regardless of GitHub/JIRA/ADO
- ❌ No distinction between Epic/Feature/Project

---

## The Correct Architecture

### External Tool Hierarchies

**GitHub Structure**:
```
GitHub Project (e.g., "External Tool Status Sync")
└── GitHub Issues (#1, #2, #3...)
    └── Task checkboxes (inline in issue)
```

**JIRA Structure**:
```
JIRA Epic (e.g., PROJ-100)
├── Stories (PROJ-101, PROJ-102...)
├── Bugs (PROJ-103...)
└── Subtasks (PROJ-104...)
```

**Azure DevOps Structure**:
```
ADO Feature (e.g., Feature 1000)
├── User Stories (1001, 1002...)
├── Bugs (1003...)
└── Tasks (1004...)
```

---

## Proposed Solution

### Option 1: External Tool-Specific Files (User Preference)

**Structure based on primary external tool**:

```
.specweave/docs/internal/specs/default/
├── github/                              # If primary tool = GitHub
│   ├── project-0031-external-tool-status-sync.md
│   └── issues/
│       ├── issue-001-rich-external-content.md
│       ├── issue-002-task-level-mapping.md
│       └── ...
│
├── jira/                                # If primary tool = JIRA
│   ├── epic-0031-external-tool-status-sync.md
│   └── stories/
│       ├── story-001-rich-external-content.md
│       ├── bug-002-sync-failure.md
│       └── ...
│
└── ado/                                 # If primary tool = ADO
    ├── feature-0031-external-tool-status-sync.md
    └── user-stories/
        ├── user-story-001-rich-external-content.md
        ├── bug-002-sync-failure.md
        └── ...
```

**Frontmatter Example (GitHub)**:
```yaml
---
id: github-project-0031
title: "External Tool Status Synchronization"
type: github-project
external_id: 42  # GitHub Project number
external_url: "https://github.com/anton-abyzov/specweave/projects/42"
status: complete
---
```

**Frontmatter Example (JIRA)**:
```yaml
---
id: jira-epic-0031
title: "External Tool Status Synchronization"
type: jira-epic
external_key: "SPEC-100"
external_url: "https://company.atlassian.net/browse/SPEC-100"
status: done
---
```

**Frontmatter Example (ADO)**:
```yaml
---
id: ado-feature-0031
title: "External Tool Status Synchronization"
type: ado-feature
external_id: 1000
external_url: "https://dev.azure.com/org/project/_workitems/edit/1000"
status: closed
---
```

---

### Option 2: Hybrid (Internal + External Mapping)

**Keep internal structure generic, map externally**:

```
.specweave/docs/internal/specs/default/
├── internal/                            # Internal tool-agnostic
│   ├── spec-0031.md                     # Generic spec
│   └── user-stories/
│       ├── us-001.md
│       └── ...
│
├── github/                              # GitHub-specific view
│   ├── project-0031.md → ../internal/spec-0031.md
│   └── issues/
│       ├── issue-001.md → ../internal/user-stories/us-001.md
│       └── ...
│
├── jira/                                # JIRA-specific view
│   ├── epic-0031.md → ../internal/spec-0031.md
│   └── stories/
│       ├── story-001.md → ../internal/user-stories/us-001.md
│       └── ...
│
└── ado/                                 # ADO-specific view
    ├── feature-0031.md → ../internal/spec-0031.md
    └── user-stories/
        ├── user-story-001.md → ../internal/user-stories/us-001.md
        └── ...
```

**Benefits**:
- Single source of truth (internal/)
- Multiple external tool views (github/, jira/, ado/)
- Symlinks keep files in sync

---

### Option 3: Smart Metadata (Recommended)

**Single internal structure with external tool metadata**:

```
.specweave/docs/internal/specs/default/
├── spec-0031-external-tool-status-sync.md
└── user-stories/
    ├── us-001-rich-external-content.md
    └── ...
```

**Frontmatter with external tool mapping**:
```yaml
---
id: spec-0031
title: "External Tool Status Synchronization"
type: spec
status: complete

# External tool mappings
external_tools:
  github:
    type: project
    id: 42
    url: "https://github.com/anton-abyzov/specweave/projects/42"
  jira:
    type: epic
    key: "SPEC-100"
    url: "https://company.atlassian.net/browse/SPEC-100"
  ado:
    type: feature
    id: 1000
    url: "https://dev.azure.com/org/project/_workitems/edit/1000"
---
```

**Sync Logic**:
```typescript
// During sync, map internal structure to external tool
if (externalTool === 'github') {
  // spec-0031 → GitHub Project #42
  // us-001 → GitHub Issue #43
}

if (externalTool === 'jira') {
  // spec-0031 → JIRA Epic SPEC-100
  // us-001 → JIRA Story SPEC-101
}

if (externalTool === 'ado') {
  // spec-0031 → ADO Feature 1000
  // us-001 → ADO User Story 1001
}
```

---

## Work Item Type Mapping

### GitHub

| Internal | GitHub | Notes |
|----------|--------|-------|
| spec | Project | GitHub Project (board) |
| user-story | Issue | GitHub Issue with labels |
| bug | Issue | GitHub Issue with "bug" label |
| task | Checkbox | Task checkbox in issue description |

### JIRA

| Internal | JIRA | Notes |
|----------|------|-------|
| spec | Epic | JIRA Epic (KEY-100) |
| user-story | Story | JIRA Story (KEY-101) |
| bug | Bug | JIRA Bug (KEY-102) |
| task | Subtask | JIRA Subtask (KEY-103) |

### Azure DevOps

| Internal | ADO | Notes |
|----------|-----|-------|
| spec | Feature | ADO Feature (work item type) |
| user-story | User Story | ADO User Story (work item type) |
| bug | Bug | ADO Bug (work item type) |
| task | Task | ADO Task (work item type) |

---

## File Naming Convention

### Option 1: External Tool-Specific (User Preference)

**GitHub**:
- `github-project-0031-external-tool-status-sync.md`
- `issues/github-issue-001-rich-external-content.md`

**JIRA**:
- `jira-epic-0031-external-tool-status-sync.md`
- `stories/jira-story-001-rich-external-content.md`

**ADO**:
- `ado-feature-0031-external-tool-status-sync.md`
- `user-stories/ado-user-story-001-rich-external-content.md`

### Option 3: Generic with Metadata (Recommended)

**Internal (tool-agnostic)**:
- `spec-0031-external-tool-status-sync.md`
- `user-stories/us-001-rich-external-content.md`

**Metadata maps to external tools** (in frontmatter)

---

## Implementation Path

### Phase 1: Detect Primary External Tool

```typescript
function detectPrimaryExternalTool(config: Config): 'github' | 'jira' | 'ado' {
  // Check config.sync.activeProfile
  const activeProfile = config.sync.profiles[config.sync.activeProfile];

  if (activeProfile.provider === 'github') return 'github';
  if (activeProfile.provider === 'jira') return 'jira';
  if (activeProfile.provider === 'ado') return 'ado';

  return 'github'; // Default
}
```

### Phase 2: Update SpecDistributor

```typescript
export class SpecDistributor {
  async distribute(incrementId: string, options?: {
    externalTool?: 'github' | 'jira' | 'ado'
  }): Promise<DistributionResult> {

    const externalTool = options?.externalTool || this.detectPrimaryTool();

    // Generate files based on external tool
    if (externalTool === 'github') {
      epicPath = this.generateGitHubProjectFile(epic);
      storyPaths = this.generateGitHubIssueFiles(stories);
    }

    if (externalTool === 'jira') {
      epicPath = this.generateJiraEpicFile(epic);
      storyPaths = this.generateJiraStoryFiles(stories);
    }

    if (externalTool === 'ado') {
      epicPath = this.generateAdoFeatureFile(epic);
      storyPaths = this.generateAdoUserStoryFiles(stories);
    }
  }
}
```

### Phase 3: Update File Templates

**GitHub Project Template**:
```typescript
private formatGitHubProjectFile(epic: EpicFile): string {
  return `---
id: github-project-${epic.id}
title: "${epic.title}"
type: github-project
external_id: ${epic.externalLinks.github?.id}
external_url: "${epic.externalLinks.github?.url}"
status: ${epic.status}
---

# GitHub Project: ${epic.title}

${epic.overview}

## GitHub Issues

${epic.userStories.map(s =>
  `- [Issue #${s.externalId}: ${s.title}](issues/github-issue-${s.id}.md)`
).join('\n')}
`;
}
```

---

## Migration Strategy

### Rename Files Based on Primary Tool

```bash
# If primary tool = GitHub
mv spec-0031-*.md github-project-0031-*.md
mv user-stories/us-001-*.md issues/github-issue-001-*.md

# If primary tool = JIRA
mv spec-0031-*.md jira-epic-0031-*.md
mv user-stories/us-001-*.md stories/jira-story-001-*.md

# If primary tool = ADO
mv spec-0031-*.md ado-feature-0031-*.md
mv user-stories/us-001-*.md user-stories/ado-user-story-001-*.md
```

---

## Questions for User

1. **Primary approach**: Option 1 (external tool-specific files) or Option 3 (generic with metadata)?

2. **File naming**:
   - `github-project-0031-*.md` (explicit)
   - `project-0031-*.md` (implicit, based on folder)

3. **Multi-tool support**:
   - Single external tool only (simpler)
   - Multiple external tools (complex, needs multiple views)

4. **Migration**:
   - Rename all existing SPEC-* files
   - Keep existing, add new for new increments

---

## Recommendation

**Option 3 (Generic with Metadata)** because:

✅ Single source of truth (internal/)
✅ Clean file names (spec-0031, us-001)
✅ Metadata maps to external tools (github, jira, ado)
✅ Sync logic handles translation
✅ Supports multi-tool scenarios
✅ No file duplication

**But if user prefers Option 1 (external tool-specific files)**:
- More explicit file names
- Clearer external tool association
- Easier to understand at a glance
- Better for single-tool projects

---

**Next Step**: User decides which option to implement!
