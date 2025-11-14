# Comprehensive External Tool Sync Architecture Analysis

**Date**: 2025-11-13
**Increment**: 0031-external-tool-status-sync
**Author**: SpecWeave AI Analysis

---

## Executive Summary

This document provides a comprehensive analysis of SpecWeave's external tool synchronization architecture and proposes enhancements to address current gaps in content sync, hierarchy mapping, and configuration.

**Key Findings**:
- ✅ **Strong Foundation**: Status sync, conflict resolution, and bidirectional sync architecture already implemented
- ⚠️ **Gap 1**: GitHub sync doesn't show tasks as checkboxes in issue description (uses file references instead)
- ⚠️ **Gap 2**: Missing natural hierarchy mapping for Jira/ADO (Capability → Epic → Feature → User Story)
- ⚠️ **Gap 3**: Configuration needs per-tool sync enablement settings

**Proposed Solution**:
- **Phase 1**: Enhanced content builder with task checkboxes (Week 1)
- **Phase 2**: Universal hierarchy mapper for all tools (Week 2)
- **Phase 3**: Configuration enhancements (Week 3)

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Gap Analysis](#gap-analysis)
3. [Hierarchy Mapping Analysis](#hierarchy-mapping-analysis)
4. [Configuration Analysis](#configuration-analysis)
5. [Proposed Architecture](#proposed-architecture)
6. [Implementation Plan](#implementation-plan)

---

## Current Architecture

### 1. Status Synchronization (✅ IMPLEMENTED)

**Location**: `src/core/sync/status-sync-engine.ts`

**Features**:
- ✅ Bidirectional sync (SpecWeave ↔ External)
- ✅ Conflict detection and resolution
- ✅ Configurable mappings (GitHub, Jira, ADO)
- ✅ Multiple conflict resolution strategies (prompt, last-write-wins, specweave-wins, external-wins)
- ✅ Bulk sync with rate limiting

**Configuration** (`.specweave/config.json`):
```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": true,
      "conflictResolution": "prompt",
      "mappings": {
        "github": { "planning": "open", "active": "open", "completed": "closed" },
        "jira": { "planning": "To Do", "active": "In Progress", "completed": "Done" },
        "ado": { "planning": "New", "active": "Active", "completed": "Closed" }
      }
    }
  }
}
```

**Strengths**:
- Well-tested (unit, integration, E2E)
- Configurable per-team workflows
- Rate limit protection
- Audit trail (sync-events.json)

---

### 2. Content Synchronization (⚠️ PARTIAL)

**Location**: `src/core/sync/enhanced-content-builder.ts`, `plugins/specweave-github/lib/enhanced-github-sync.ts`

**Current Features**:
- ✅ Executive summary section
- ✅ User stories with collapsible sections (`<details>`)
- ✅ Acceptance criteria with AC-IDs
- ✅ Architecture references (ADRs, HLDs)
- ✅ Source links (spec.md, plan.md, tasks.md)

**Gaps** (❌ MISSING):
- ❌ **Tasks NOT shown as checkboxes in description** - Currently shows task count and file reference
- ❌ **No task completion status** in external issue body
- ❌ **No GitHub issue numbers** for individual tasks in issue description
- ❌ **No labels/tags** for bug vs feature (user mentioned [Bug] [Feature] [Docs] tags)

**Current GitHub Issue Format** (Gap):
```markdown
## Summary
Executive overview...

## User Stories
<details>
<summary>US-001: User Login</summary>
- [ ] AC-US1-01: Description (P1, testable)
</details>

## Tasks
This epic includes 24 tasks from increment 0031-external-tool-status-sync:
- **T-001**: Create Enhanced Content Builder
  - Implements: US-001, US-002

See full task list: [tasks.md](https://github.com/.../tasks.md)
```

**Desired GitHub Issue Format** (✅ GOAL):
```markdown
## Summary
Executive overview...

## User Stories
<details>
<summary>US-001: User Login</summary>
- [ ] AC-US1-01: Description (P1, testable)
</details>

## Tasks (24 total, 12 completed)
Progress: ████████░░░░ 50% (12/24)

- [ ] **T-001**: Create Enhanced Content Builder (implements US-001, US-002) [#45]
- [x] **T-002**: Create Spec-to-Increment Mapper (implements US-002) [#46] ✅
- [ ] **T-003**: Enhance GitHub Content Sync (implements US-001) [#47]
...

## Architecture
**ADRs**: [ADR-0031-001: Status Mapping](link)

## Source
- [spec.md](link)
- [plan.md](link)
- [tasks.md](link)
```

**Key Difference**: Tasks show as **GitHub checkboxes** with completion status, not just file reference!

---

### 3. Hierarchy Mapping (✅ IMPLEMENTED for SpecWeave, ⚠️ PARTIAL for external)

**Location**: `src/core/living-docs/hierarchy-mapper.ts`

**Current Hierarchy** (SpecWeave Internal):
```
SpecWeave Living Docs (Standard Level):
├── Feature Folder (e.g., external-tool-status-sync/)
│   ├── FEATURE.md (Epic overview)
│   ├── us-001-*.md (User Story 1)
│   ├── us-002-*.md (User Story 2)
│   └── us-003-*.md (User Story 3)
└── Increments (Temporary)
    └── 0031-external-tool-status-sync/
        ├── spec.md
        ├── plan.md
        └── tasks.md (T-001, T-002, T-003 with AC-US1-01 references)
```

**Current External Tool Mapping**:
| SpecWeave | GitHub | Jira | ADO |
|-----------|--------|------|-----|
| **Feature** (permanent) | Project/Milestone | Epic | Epic |
| **US-* (User Story)** | Issue | Story | User Story |
| **T-* (Task)** | Checkbox | Sub-task | Task |

**Gaps** (❌ MISSING):
- ❌ **No Capability level** - Some teams need Portfolio → Capability → Epic → Feature → User Story → Task
- ❌ **No natural Jira/ADO hierarchy mapping** - Currently maps everything to one level
- ❌ **No differentiation between Feature and Epic** - SpecWeave treats them as same level

---

### 4. Configuration System (✅ IMPLEMENTED, ⚠️ NEEDS ENHANCEMENT)

**Location**: `src/core/schemas/specweave-config.schema.json`

**Current Configuration** (lines 588-980):
```json
{
  "sync": {
    "profiles": {
      "profile-name": {
        "provider": "github" | "jira" | "ado",
        "config": { "owner": "...", "repo": "..." },
        "timeRange": { "default": "1M", "max": "6M" },
        "rateLimits": { "maxItemsPerSync": 500 }
      }
    },
    "settings": {
      "autoCreateIssue": false,          // ⚠️ NOT configurable per-tool
      "syncDirection": "bidirectional",
      "conflictResolution": "prompt"
    },
    "statusSync": {
      "enabled": true,                   // ⚠️ Global, NOT per-tool
      "autoSync": true,
      "promptUser": true,
      "conflictResolution": "prompt",
      "mappings": { "github": {...}, "jira": {...}, "ado": {...} }
    }
  }
}
```

**Gaps** (❌ MISSING per User Requirements):
1. ❌ **No per-tool sync enablement** - User wants: "sync with GitHub: true, Jira: false, ADO: false"
2. ❌ **No per-tool status sync control** - User wants: "include work item status in sync: true/false"
3. ❌ **No initialization-time configuration** - User wants: "configurable during specweave init"

---

## Gap Analysis

### Gap 1: Task Checkboxes in GitHub Issue Description (CRITICAL)

**User Requirement**:
> "In the description of GH issue it MUST include each task with its status (done/not done) as GitHub subtasks **copied from increment/tasks.md** instead of reference (as ref won't work in GH issue desc)."

**Current Behavior**:
- Shows task count: "This epic includes 24 tasks"
- Shows file reference: "See full task list: [tasks.md](link)"
- External stakeholders must navigate to repository to see tasks

**Desired Behavior**:
- Show ALL tasks as GitHub checkboxes: `- [ ] T-001: Task Name (#45)`
- Show completion status: `- [x] T-002: Completed Task (#46) ✅`
- Show progress bar: `████████░░░░ 50% (12/24)`
- Update checkboxes when tasks complete (via hook)

**Why This Matters**:
- PMs/stakeholders see progress WITHOUT repository access
- GitHub's built-in checkbox tracking works
- Clear visual indication of what's done/pending
- Can click checkboxes to manually mark complete (bidirectional sync)

**Solution**: Enhance `EnhancedContentBuilder.buildTasksSection()` (T-001)

---

### Gap 2: Natural Hierarchy Mapping (IMPORTANT)

**User Requirement**:
> "For Jira sync it MUST be natural sync, e.g., from our structure to Jira's, we MUST have mapping and do kind of epic to epic, feature to feature, capability to cap, us to us."

**Current Behavior**:
- SpecWeave has: Feature → User Story → Task
- Jira supports: Portfolio → Epic → Feature → Story → Sub-task
- Current mapping is FLAT (Feature = Epic, no Portfolio/Capability level)

**Desired Behavior**:
- Support multiple hierarchy levels
- Map SpecWeave concepts to Jira/ADO naturally
- Allow users to configure hierarchy depth

**Proposed Universal Hierarchy** (5 levels):
```
Level 1: Portfolio (optional) - Strategic grouping
   ↓
Level 2: Capability (optional) - Large feature set
   ↓
Level 3: Epic (standard) - Multiple features
   ↓
Level 4: Feature (standard) - Single feature with user stories
   ↓
Level 5: User Story (standard) - Detailed requirement
   ↓
Level 6: Task (standard) - Implementation unit
```

**Mapping Examples**:

**Simple Project** (3 levels - current SpecWeave):
```
SpecWeave:       Feature → User Story → Task
GitHub:          Milestone → Issue → Checkbox
Jira:            Epic → Story → Sub-task
ADO:             Epic → User Story → Task
```

**Standard Project** (4 levels):
```
SpecWeave:       Epic → Feature → User Story → Task
GitHub:          Project → Milestone → Issue → Checkbox
Jira:            Epic → Feature → Story → Sub-task
ADO:             Epic → Feature → User Story → Task
```

**Enterprise Project** (5 levels):
```
SpecWeave:       Capability → Epic → Feature → User Story → Task
GitHub:          Project → Label → Milestone → Issue → Checkbox
Jira:            Portfolio → Epic → Feature → Story → Sub-task
ADO:             Feature → Epic → Feature → User Story → Task
```

**Solution**: Create `UniversalHierarchyMapper` (T-015)

---

### Gap 3: Per-Tool Sync Configuration (IMPORTANT)

**User Requirement**:
> "Settings file which we MUST have... should show at first if we want our local changes to be synced with e.g. jira/ado/gh (to be safe should be false by default for ado and jira and true for gh, but should be configurable on specweave init step) and second sync option is shall we include work item status in sync!"

**Desired Configuration**:
```json
{
  "sync": {
    "tools": {
      "github": {
        "enabled": true,                  // ✅ Sync with GitHub
        "includeStatus": true,            // ✅ Sync status changes
        "includeTaskCheckboxes": true,    // ✅ NEW: Copy tasks as checkboxes
        "labels": {
          "bug": "[Bug]",
          "feature": "[Feature]",
          "docs": "[Docs]"
        }
      },
      "jira": {
        "enabled": false,                 // ❌ Don't sync with Jira
        "includeStatus": false
      },
      "ado": {
        "enabled": false,                 // ❌ Don't sync with ADO
        "includeStatus": false
      }
    },
    "initPrompts": {
      "askGitHubSync": true,              // ✅ Prompt during specweave init
      "askJiraSync": true,
      "askAdoSync": true,
      "askStatusSync": true
    }
  }
}
```

**Init Flow** (specweave init):
```
? Do you want to sync with GitHub? (Y/n): y
? Include status updates in GitHub sync? (Y/n): y
? Copy tasks as checkboxes in GitHub issues? (Y/n): y
? Use labels for bugs/features/docs? (Y/n): y

? Do you want to sync with Jira? (y/N): n
? Do you want to sync with Azure DevOps? (y/N): n
```

**Solution**: Enhance config schema + init command (T-016, T-017)

---

## Hierarchy Mapping Analysis

### SpecWeave's Current Structure

**Living Docs** (`.specweave/docs/internal/specs/default/`):
```
external-tool-status-sync/                 # Feature folder (permanent)
├── FEATURE.md                             # Feature overview (epic-level)
├── us-001-rich-external-issue-content.md  # User Story 1
├── us-002-task-level-mapping.md           # User Story 2
├── us-003-status-mapping-config.md        # User Story 3
├── us-004-bidirectional-status-sync.md    # User Story 4
├── us-005-user-prompts.md                 # User Story 5
├── us-006-conflict-resolution.md          # User Story 6
└── us-007-logging-audit.md                # User Story 7
```

**Increments** (`.specweave/increments/`):
```
0031-external-tool-status-sync/            # Increment (temporary)
├── spec.md                                 # Contains all 7 user stories
├── plan.md                                 # Technical design
└── tasks.md                                # 24 tasks
    ├── T-001: Create Enhanced Content Builder (AC-US1-01, AC-US1-02)
    ├── T-002: Create Spec-to-Increment Mapper (AC-US2-01, AC-US2-02)
    └── ... (22 more tasks)
```

**Relationships**:
- **Feature** ↔ **Increment**: One-to-many (multiple increments can implement same feature)
- **User Story** ↔ **Task**: Many-to-many (tasks can implement multiple user stories via AC-IDs)
- **User Story** ↔ **Feature**: One-to-many (user stories belong to one feature)

---

### External Tool Hierarchies

**GitHub** (Simple):
```
Repository
└── Project (optional)
    └── Milestone (optional)
        └── Issue
            └── Checkbox (in issue description)
```

**Jira** (Complex):
```
Portfolio
└── Epic
    └── Feature (optional)
        └── Story
            └── Sub-task
```

**Azure DevOps** (Medium):
```
Feature (strategic)
└── Epic
    └── Feature (tactical) OR User Story
        └── Task
```

---

### Proposed Mapping Strategy

**Option 1: Simple (Current - 3 Levels)**
```
SpecWeave       GitHub          Jira              ADO
─────────────────────────────────────────────────────
Feature      → Milestone      → Epic            → Epic
User Story   → Issue          → Story           → User Story
Task         → Checkbox       → Sub-task        → Task
```

**Option 2: Standard (Recommended - 4 Levels)**
```
SpecWeave       GitHub          Jira              ADO
─────────────────────────────────────────────────────
Epic         → Project        → Epic            → Feature
Feature      → Milestone      → Feature         → Epic
User Story   → Issue          → Story           → User Story
Task         → Checkbox       → Sub-task        → Task
```

**Option 3: Enterprise (5 Levels)**
```
SpecWeave       GitHub          Jira              ADO
─────────────────────────────────────────────────────
Capability   → Project        → Portfolio       → Feature
Epic         → Label          → Epic            → Epic
Feature      → Milestone      → Feature         → Feature
User Story   → Issue          → Story           → User Story
Task         → Checkbox       → Sub-task        → Task
```

**Configuration** (`.specweave/config.json`):
```json
{
  "livingDocs": {
    "hierarchyLevel": "simple" | "standard" | "enterprise",
    "customHierarchy": {
      "levels": ["capability", "epic", "feature", "user-story", "task"],
      "mappings": {
        "github": { "capability": "project", "epic": "label", "feature": "milestone" },
        "jira": { "capability": "portfolio", "epic": "epic", "feature": "feature" },
        "ado": { "capability": "feature", "epic": "epic", "feature": "feature" }
      }
    }
  }
}
```

---

## Configuration Analysis

### Current Schema Gaps

**Gap 1: Per-Tool Enablement**
```json
// ❌ CURRENT (Global)
{
  "sync": {
    "statusSync": {
      "enabled": true  // Applies to ALL tools
    }
  }
}

// ✅ DESIRED (Per-Tool)
{
  "sync": {
    "tools": {
      "github": { "enabled": true, "includeStatus": true },
      "jira": { "enabled": false },
      "ado": { "enabled": false }
    }
  }
}
```

**Gap 2: Task Checkbox Configuration**
```json
// ❌ CURRENT (Not configurable)
{
  "sync": {
    // No setting for task checkboxes
  }
}

// ✅ DESIRED (Configurable)
{
  "sync": {
    "tools": {
      "github": {
        "content": {
          "includeTaskCheckboxes": true,    // Copy tasks as checkboxes
          "updateTasksOnSync": true,        // Bidirectional: check checkbox = update task
          "showCompletionStatus": true      // Show ✅ for completed tasks
        }
      }
    }
  }
}
```

**Gap 3: Label/Tag Configuration**
```json
// ❌ CURRENT (Not configurable)
{
  // No label configuration
}

// ✅ DESIRED (Per User Request)
{
  "sync": {
    "tools": {
      "github": {
        "labels": {
          "bug": "[Bug]",
          "feature": "[Feature]",
          "docs": "[Docs]",
          "autoApply": true  // Auto-detect from increment type
        }
      }
    }
  }
}
```

---

## Proposed Architecture

### Enhanced Configuration Schema

```json
{
  "sync": {
    "tools": {
      "github": {
        "enabled": true,
        "profile": "specweave-dev",  // Reference to sync.profiles

        "status": {
          "enabled": true,
          "autoSync": true,
          "promptUser": true,
          "conflictResolution": "prompt"
        },

        "content": {
          "includeTaskCheckboxes": true,
          "updateTasksOnSync": true,
          "showCompletionStatus": true,
          "collapseUserStories": true,
          "includeArchitecture": true
        },

        "labels": {
          "bug": "[Bug]",
          "feature": "[Feature]",
          "docs": "[Docs]",
          "autoApply": true
        }
      },

      "jira": {
        "enabled": false,
        "profile": "jira-prod",
        "status": { "enabled": false },
        "content": { "includeTaskCheckboxes": false }
      },

      "ado": {
        "enabled": false,
        "profile": "ado-enterprise",
        "status": { "enabled": false },
        "content": { "includeTaskCheckboxes": false }
      }
    },

    "initPrompts": {
      "askGitHubSync": true,
      "askJiraSync": true,
      "askAdoSync": true,
      "askStatusSync": true,
      "askTaskCheckboxes": true,
      "askLabels": true
    },

    "profiles": {
      // Existing profile configuration (unchanged)
    },

    "statusSync": {
      // DEPRECATED - moved to tools.<provider>.status
      // Keep for backward compatibility
    }
  },

  "livingDocs": {
    "hierarchyLevel": "simple",  // simple | standard | enterprise
    "intelligent": {
      "enabled": true,
      "bidirectionalLinks": true  // Task ↔ User Story linking
    }
  }
}
```

---

### Enhanced Content Builder Architecture

```typescript
// NEW: Enhanced task section builder
interface TaskCheckboxConfig {
  includeCheckboxes: boolean;
  showCompletionStatus: boolean;
  showGitHubIssueNumbers: boolean;
  showProgressBar: boolean;
}

class EnhancedContentBuilder {
  /**
   * Build tasks section with GitHub checkboxes (NEW)
   */
  buildTasksSection(
    taskMapping: TaskMapping,
    config: TaskCheckboxConfig
  ): string {
    const lines: string[] = ['## Tasks'];

    // Calculate progress
    const total = taskMapping.tasks.length;
    const completed = taskMapping.tasks.filter(t => t.completed).length;
    const percent = Math.round((completed / total) * 100);

    // Progress bar
    if (config.showProgressBar) {
      const filled = Math.round((completed / total) * 12);
      const bar = '█'.repeat(filled) + '░'.repeat(12 - filled);
      lines.push(`Progress: ${bar} ${percent}% (${completed}/${total})`);
      lines.push('');
    }

    // Tasks as checkboxes
    for (const task of taskMapping.tasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      const status = task.completed && config.showCompletionStatus ? ' ✅' : '';
      const issue = task.githubIssue && config.showGitHubIssueNumbers
        ? ` [#${task.githubIssue}]`
        : '';
      const userStories = task.userStories.length > 0
        ? ` (implements ${task.userStories.join(', ')})`
        : '';

      lines.push(`- ${checkbox} **${task.id}**: ${task.title}${userStories}${issue}${status}`);
    }

    return lines.join('\n');
  }
}
```

---

### Universal Hierarchy Mapper Architecture

```typescript
interface HierarchyLevel {
  name: string;  // capability, epic, feature, user-story, task
  specweaveType: 'portfolio' | 'epic' | 'feature' | 'user-story' | 'task';
  githubType: 'project' | 'label' | 'milestone' | 'issue' | 'checkbox';
  jiraType: 'portfolio' | 'epic' | 'feature' | 'story' | 'sub-task';
  adoType: 'feature' | 'epic' | 'feature' | 'user-story' | 'task';
}

interface HierarchyMapping {
  level: 'simple' | 'standard' | 'enterprise' | 'custom';
  levels: HierarchyLevel[];
}

class UniversalHierarchyMapper {
  /**
   * Get hierarchy mapping for external tool
   */
  getMapping(tool: 'github' | 'jira' | 'ado'): HierarchyMapping {
    const config = this.loadConfig();
    const level = config.livingDocs.hierarchyLevel || 'simple';

    switch (level) {
      case 'simple':
        return this.getSimpleMapping(tool);
      case 'standard':
        return this.getStandardMapping(tool);
      case 'enterprise':
        return this.getEnterpriseMapping(tool);
      case 'custom':
        return this.getCustomMapping(tool, config.livingDocs.customHierarchy);
    }
  }

  /**
   * Map SpecWeave item to external tool type
   */
  mapToExternal(
    item: SpecWeaveItem,
    tool: 'github' | 'jira' | 'ado'
  ): ExternalItemType {
    const mapping = this.getMapping(tool);
    const level = this.detectLevel(item);
    return mapping.levels.find(l => l.specweaveType === level)?.[`${tool}Type`];
  }
}
```

---

## Implementation Plan

### Phase 1: Enhanced Content Sync (Week 1)

**T-001: Enhance Content Builder for Task Checkboxes** (2 days)
- Update `buildTasksSection()` to generate GitHub checkboxes
- Add progress bar calculation
- Add completion status indicator (✅)
- Add GitHub issue number links

**T-002: Add Label/Tag Support** (1 day)
- Detect increment type (bug, feature, docs)
- Auto-apply labels to GitHub issues
- Add label configuration to schema

**T-003: Update GitHub Sync** (1 day)
- Use enhanced content builder
- Update issue body with task checkboxes
- Test bidirectional checkbox updates

**T-004: Update Jira Sync** (1 day)
- Format tasks for Jira markup
- Handle Jira-specific constraints

**T-005: Update ADO Sync** (1 day)
- Format tasks for ADO HTML
- Handle ADO-specific constraints

**Deliverable**: External issues show tasks as checkboxes with completion status

---

### Phase 2: Universal Hierarchy Mapping (Week 2)

**T-006: Design Universal Hierarchy Schema** (1 day)
- Define hierarchy levels (5 levels)
- Define mappings for each tool
- Update config schema

**T-007: Implement UniversalHierarchyMapper** (2 days)
- Create mapper class
- Implement level detection
- Implement mapping logic

**T-008: Update GitHub Hierarchy Sync** (1 day)
- Map SpecWeave hierarchy to GitHub (Project → Milestone → Issue)
- Test multi-level sync

**T-009: Update Jira Hierarchy Sync** (1 day)
- Map SpecWeave hierarchy to Jira (Portfolio → Epic → Feature → Story)
- Test natural hierarchy mapping

**T-010: Update ADO Hierarchy Sync** (1 day)
- Map SpecWeave hierarchy to ADO (Feature → Epic → User Story → Task)
- Test hierarchy consistency

**Deliverable**: Natural hierarchy mapping for all tools

---

### Phase 3: Configuration Enhancements (Week 3)

**T-011: Enhance Config Schema** (1 day)
- Add `sync.tools.<provider>` structure
- Add per-tool enablement
- Add per-tool status sync control
- Add label/tag configuration
- Maintain backward compatibility

**T-012: Add Init Prompts** (1 day)
- Enhance `specweave init` command
- Add prompts for each tool
- Generate config from responses

**T-013: Migration Script** (0.5 days)
- Migrate old config format to new
- Show deprecation warnings

**T-014: Update Documentation** (0.5 days)
- Update config guide
- Update sync guide
- Update ADR

**Deliverable**: Per-tool sync configuration with init-time setup

---

### Phase 4: Testing & Integration (Week 4)

**T-015: Unit Tests** (2 days)
- Test enhanced content builder
- Test hierarchy mapper
- Test config schema validation

**T-016: Integration Tests** (2 days)
- Test GitHub sync end-to-end
- Test Jira sync end-to-end
- Test ADO sync end-to-end
- Test bidirectional checkbox updates

**T-017: E2E Tests** (1 day)
- Test full workflow: init → plan → sync → complete
- Test conflict resolution
- Test status sync

**Deliverable**: 85%+ test coverage, all tests passing

---

## Success Criteria

### Phase 1 (Enhanced Content)
- ✅ GitHub issues show tasks as checkboxes
- ✅ Checkbox completion status visible (✅ icon)
- ✅ Progress bar shows overall completion
- ✅ Labels auto-applied ([Bug], [Feature], [Docs])

### Phase 2 (Hierarchy Mapping)
- ✅ Jira sync maps Capability → Epic → Feature → Story
- ✅ ADO sync maps Feature → Epic → User Story → Task
- ✅ GitHub sync maps Project → Milestone → Issue → Checkbox
- ✅ Natural hierarchy for each tool

### Phase 3 (Configuration)
- ✅ Per-tool sync enablement (GitHub: true, Jira: false, ADO: false)
- ✅ Per-tool status sync control
- ✅ Init-time configuration (prompts during `specweave init`)
- ✅ Backward compatibility with existing configs

### Phase 4 (Testing)
- ✅ 85%+ test coverage
- ✅ All unit, integration, E2E tests passing
- ✅ Documentation complete

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Impact**: Medium
**Probability**: Low
**Mitigation**:
- Maintain backward compatibility
- Add deprecation warnings
- Provide migration script

### Risk 2: API Rate Limits
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Batch updates
- Rate limit protection (already implemented)
- Time range filtering (already implemented)

### Risk 3: Bidirectional Checkbox Sync Complexity
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Use webhooks for real-time updates (future)
- Manual sync command for now
- Clear conflict resolution strategy

---

## Next Steps

1. **Review this analysis** with stakeholders
2. **Prioritize phases** (all P1 or selective implementation?)
3. **Assign tasks** to development team
4. **Create tracking issues** (GitHub/Jira/ADO)
5. **Begin Phase 1 implementation** (Enhanced Content Sync)

---

## References

- **Increment**: [0031-external-tool-status-sync](../)
- **ADRs**:
  - [ADR-0031-001: Status Mapping Strategy](../../docs/internal/architecture/adr/0031-001-status-mapping-strategy.md)
  - [ADR-0031-002: Conflict Resolution Approach](../../docs/internal/architecture/adr/0031-002-conflict-resolution-approach.md)
  - [ADR-0031-003: Bidirectional Sync Implementation](../../docs/internal/architecture/adr/0031-003-bidirectional-sync-implementation.md)
- **Code**:
  - Status Sync Engine: `src/core/sync/status-sync-engine.ts`
  - Enhanced Content Builder: `src/core/sync/enhanced-content-builder.ts`
  - Hierarchy Mapper: `src/core/living-docs/hierarchy-mapper.ts`
- **Configuration**: `src/core/schemas/specweave-config.schema.json`
