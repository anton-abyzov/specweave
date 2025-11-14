# Living Docs Architecture Fix: Eliminating Duplication

**Date**: 2025-11-12
**Status**: Analysis Complete → Implementation Pending
**Priority**: P0 (Critical - Architectural Issue)

## 🎯 THE CORE PROBLEM

Currently, when we sync increment specs to living docs, we're **copying the ENTIRE increment spec file**, which creates massive duplication and defeats the purpose of "living docs" as a permanent source of truth.

### What's Being Duplicated (WRONG ❌)

When you look at **FS-001-core-framework-architecture.md** in living docs, it contains:

1. **Implementation History** (lines 22-32)
   ```markdown
   ## Increments (Implementation History)

   | Increment | Status | Completion | Notes |
   |-----------|--------|------------|-------|
   | **0001-core-framework** | ✅ Complete | 2025-10-15 | ...
   | **0002-core-enhancements** | ✅ Complete | 2025-10-22 | ...
   | **0004-plugin-architecture** | ✅ Complete | 2025-10-28 | ...
   | **0005-cross-platform-cli** | ✅ Complete | 2025-10-30 | ...
   ```

   **❌ Problem**: This is implementation tracking, NOT specification!

2. **Technical Architecture** (lines 83-135)
   ```markdown
   ## Technical Architecture

   ### System Design
   [Mermaid diagrams...]

   ### Key Components
   1. **CLI Framework** (`src/cli/`)
   2. **Plugin System** (`src/core/plugin-*.ts`)
   3. **Config Management** (`src/core/config-manager.ts`)
   ```

   **❌ Problem**: This already exists in `architecture/` folder! Why duplicate?

3. **ADRs Listed Inline** (lines 137-145)
   ```markdown
   ## Architecture Decisions (ADRs)

   | ADR | Decision | Rationale |
   |-----|----------|-----------|
   | **ADR-001** | Claude Code native plugins | ...
   | **ADR-002** | TypeScript over JavaScript | ...
   ```

   **❌ Problem**: ADRs already exist in `architecture/adr/`! Just link to them!

4. **Success Metrics** (lines 147-156)
   **❌ Problem**: These change over time and belong in increment reports, not permanent specs

5. **Future Enhancements** (lines 158-167)
   **❌ Problem**: This is roadmap planning, not specification!

### What Should Actually Be There (CORRECT ✅)

Living docs spec should contain **ONLY**:

1. **Feature Overview** - What this feature area is about
2. **User Stories + Acceptance Criteria** - The REQUIREMENTS (permanent)
3. **Links to Architecture** - NOT duplicate architecture
4. **Links to ADRs** - NOT duplicate ADRs
5. **Implementation History** - Brief table showing which increments implemented which stories
6. **External Tool Links** - GitHub Project, Jira Epic, ADO Feature

**Key Insight**: Living docs = PERMANENT EPIC. Increment spec = TEMPORARY ITERATION.

---

## 🏗️ THE CORRECT ARCHITECTURE

### Two Locations, Two Purposes

```
┌─────────────────────────────────────────────────────────────────────┐
│ LIVING DOCS SPEC (PERMANENT, EPIC-LEVEL)                           │
│ Location: .specweave/docs/internal/specs/default/                  │
│           SPEC-001-core-framework-architecture.md                   │
│                                                                     │
│ Purpose: Complete, permanent source of truth for ENTIRE feature    │
│                                                                     │
│ Contains:                                                           │
│  ✅ ALL user stories for feature area (across all increments)     │
│  ✅ ALL acceptance criteria                                        │
│  ✅ Implementation history (which increments did what)             │
│  ✅ Links to architecture (NO duplication)                         │
│  ✅ Links to ADRs (NO duplication)                                 │
│  ✅ External tool links (GitHub Project, Jira Epic)                │
│                                                                     │
│ External Tool Mapping:                                              │
│  → GitHub Project                                                   │
│  → Jira Epic                                                        │
│  → Azure DevOps Feature                                             │
└─────────────────────────────────────────────────────────────────────┘

                            │
                            │ References
                            ▼

┌─────────────────────────────────────────────────────────────────────┐
│ INCREMENT SPEC (TEMPORARY, ITERATION-LEVEL)                         │
│ Location: .specweave/increments/0001-core-framework/spec.md        │
│                                                                     │
│ Purpose: Focused implementation reference for THIS iteration only  │
│                                                                     │
│ Contains:                                                           │
│  ✅ Reference to living docs: "See SPEC-001"                       │
│  ✅ Subset of user stories (ONLY what's in this increment)         │
│  ✅ What's being implemented RIGHT NOW                              │
│  ✅ Out of scope (deferred to future increments)                   │
│  ✅ Implementation details specific to this iteration               │
│                                                                     │
│ External Tool Mapping:                                              │
│  → GitHub Issue (ephemeral, can be closed)                          │
│  → Jira Story (temporary tracking)                                  │
│  → Azure DevOps User Story                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### External Tool Hierarchy

```
GitHub                     Jira                   Azure DevOps
══════                     ════                   ════════════

📋 Project                 📦 Epic                🎯 Feature
├─ Spec-001               ├─ PROJ-100            ├─ PBI-1000
│  (living docs)          │  (living docs)       │  (living docs)
│                         │                      │
├─ 🔹 Issue #130          ├─ 📝 Story PROJ-101   ├─ 📋 US-1001
│  0001-core-framework    │  0001-core-framework │  0001-core-framework
│  (increment)            │  (increment)         │  (increment)
│  │                      │  │                   │  │
│  ├─ ☑ Task 1            │  ├─ ☑ Subtask 1      │  ├─ ☑ Task 1
│  ├─ ☑ Task 2            │  ├─ ☑ Subtask 2      │  ├─ ☑ Task 2
│  └─ ☐ Task 3            │  └─ ☐ Subtask 3      │  └─ ☐ Task 3
│                         │                      │
├─ 🔹 Issue #145          ├─ 📝 Story PROJ-102   ├─ 📋 US-1002
│  0002-enhancements      │  0002-enhancements   │  0002-enhancements
│  (increment)            │  (increment)         │  (increment)
│                         │                      │
└─ ...                    └─ ...                 └─ ...
```

**Key Relationships**:
- **Living Docs Spec** = Epic/Project/Feature (PERMANENT, many increments)
- **Increment Spec** = Story/Issue/User Story (TEMPORARY, one increment)
- **tasks.md** = Subtasks/Checkboxes/Tasks (EPHEMERAL, implementation detail)

---

## 📊 CURRENT VS CORRECT: Side-by-Side Comparison

### Living Docs Spec: FS-001-core-framework-architecture.md

| Section | Current (WRONG ❌) | Should Be (CORRECT ✅) |
|---------|-------------------|----------------------|
| **Overview** | ✅ Feature description | ✅ KEEP - Brief feature overview |
| **Increments** | ❌ Full implementation table | ✅ SIMPLIFY - Just links to increment folders |
| **User Stories** | ✅ All user stories | ✅ KEEP - This is the core! |
| **Architecture** | ❌ Full technical details | ✅ LINK - Link to `../../architecture/plugin-system.md` |
| **ADRs** | ❌ Inline table of ADRs | ✅ LINK - Link to `../../architecture/adr/0001-plugin-system.md` |
| **Success Metrics** | ❌ Metrics table | ❌ REMOVE - Belongs in increment reports |
| **Future Enhancements** | ❌ Enhancement table | ❌ REMOVE - Belongs in roadmap/backlog |
| **Related Docs** | ⚠️ Some links | ✅ IMPROVE - Comprehensive link section |
| **External Links** | ❌ Missing! | ✅ ADD - GitHub Project, Jira Epic links |

### Increment Spec: .specweave/increments/0001-core-framework/spec.md

| Section | Current (WRONG ❌) | Should Be (CORRECT ✅) |
|---------|-------------------|----------------------|
| **Overview** | ✅ Feature description | ✅ SIMPLIFY - "Implements SPEC-001 (US-001, US-002)" |
| **User Stories** | ❌ All user stories | ✅ SUBSET - ONLY stories in THIS increment |
| **Out of Scope** | ❌ Missing | ✅ ADD - What's NOT in this increment |
| **Implementation** | ⚠️ Some details | ✅ FOCUS - Implementation specific to this iteration |
| **Architecture** | ❌ Full details | ❌ REMOVE - Just reference living docs |
| **Success Criteria** | ⚠️ Some criteria | ✅ KEEP - Specific to THIS increment |

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Redesign Sync Logic (Core Fix)

**File**: `plugins/specweave/lib/hooks/sync-living-docs.ts`

**Current Code** (lines 180-215):
```typescript
async function copyIncrementSpecToLivingDocs(incrementId: string): Promise<boolean> {
  // ❌ This copies ENTIRE spec.md (includes everything)
  await fs.copy(incrementSpecPath, livingDocsPath);
  console.log(`✅ Copied increment spec to living docs: spec-${incrementId}.md`);
  return true;
}
```

**New Logic** (EXTRACT, DON'T COPY):
```typescript
async function extractAndMergeLivingDocs(incrementId: string): Promise<boolean> {
  // 1. Parse increment spec.md (extract sections)
  const incrementSpec = await parseIncrementSpec(incrementSpecPath);

  // 2. Check if living docs spec already exists
  const livingDocsExists = fs.existsSync(livingDocsPath);

  if (livingDocsExists) {
    // MERGE MODE: Add new user stories to existing spec
    const livingSpec = await parseLivingDocsSpec(livingDocsPath);

    // Extract ONLY new user stories from increment
    const newStories = incrementSpec.userStories.filter(
      story => !livingSpec.userStories.some(existing => existing.id === story.id)
    );

    // Merge new stories into living docs
    livingSpec.userStories.push(...newStories);

    // Update implementation history
    livingSpec.implementationHistory.push({
      increment: incrementId,
      status: 'Complete',
      date: new Date().toISOString(),
      stories: incrementSpec.userStories.map(s => s.id)
    });

    // Write merged spec
    await writeLivingDocsSpec(livingDocsPath, livingSpec);

    console.log(`✅ Merged ${newStories.length} new user stories into living docs`);

  } else {
    // CREATE MODE: First increment for this spec
    const livingSpec = {
      id: extractSpecId(incrementId), // e.g., "SPEC-001"
      title: incrementSpec.title,
      overview: incrementSpec.overview,
      userStories: incrementSpec.userStories,
      implementationHistory: [{
        increment: incrementId,
        status: 'Complete',
        date: new Date().toISOString(),
        stories: incrementSpec.userStories.map(s => s.id)
      }],
      relatedDocs: generateRelatedDocsLinks(incrementSpec),
      externalLinks: {
        github: null, // To be filled by external sync
        jira: null,
        ado: null
      }
    };

    await writeLivingDocsSpec(livingDocsPath, livingSpec);

    console.log(`✅ Created new living docs spec: ${livingSpec.id}`);
  }

  return true;
}
```

**Key Changes**:
1. ✅ **Extract user stories only** - Don't copy architecture
2. ✅ **Merge with existing** - Add new stories to existing spec
3. ✅ **Generate links** - Link to architecture/ADRs, don't duplicate
4. ✅ **Update history** - Track which increments implemented which stories
5. ✅ **External links** - Add GitHub Project, Jira Epic metadata

---

### Phase 2: Update Templates

#### Living Docs Spec Template

**Location**: `plugins/specweave/agents/pm/templates/living-docs-spec.md`

```markdown
---
id: SPEC-{number}-{name}
title: "{Feature Area Title}"
status: active | planning | completed
priority: P0 | P1 | P2 | P3
created: {date}
last_updated: {date}
---

# SPEC-{number}: {Feature Area Title}

**Feature Area**: {Category}
**Status**: {Status}
**Priority**: {Priority}

---

## Overview

{Brief description of feature area - 2-3 paragraphs}

**Key Capabilities**:
- Capability 1
- Capability 2
- Capability 3

---

## Implementation History

| Increment | Stories | Status | Completion |
|-----------|---------|--------|------------|
| 0001-{name} | US-001, US-002 | ✅ Complete | 2025-XX-XX |
| 0002-{name} | US-003, US-004 | ⏳ In Progress | - |
| 0003-{name} | US-005 | 📋 Planned | - |

**Overall Progress**: {X}/{Y} user stories complete ({percentage}%)

---

## User Stories & Acceptance Criteria

### Epic 1: {Epic Name}

**US-001**: As a {user type}, I want {feature} so that {benefit}

**Acceptance Criteria**:
- [ ] **AC-US1-01**: {Criterion 1} (Priority: P1, Testable: Yes)
- [ ] **AC-US1-02**: {Criterion 2} (Priority: P1, Testable: Yes)
- [ ] **AC-US1-03**: {Criterion 3} (Priority: P2, Testable: Yes)

**Implementation**: Increment 0001-{name} (Complete)
**Tests**: `tests/unit/feature.test.ts`, `tests/e2e/feature.spec.ts`

---

### Epic 2: {Epic Name}

{More user stories...}

---

## Architecture & Design

**High-Level Design**: [System Architecture](../../architecture/hld-{feature}.md)

**Architecture Decisions**:
- [ADR-001: {Decision}](../../architecture/adr/0001-{decision}.md)
- [ADR-002: {Decision}](../../architecture/adr/0002-{decision}.md)

**Diagrams**:
- [System Design](../../architecture/diagrams/system-design.md)
- [Component Architecture](../../architecture/diagrams/components.md)

---

## External Tool Links

**GitHub**: [Project Board](https://github.com/{owner}/{repo}/projects/{id})
**Jira**: [Epic PROJ-{number}](https://company.atlassian.net/browse/PROJ-{number})
**Azure DevOps**: [Feature #{id}](https://dev.azure.com/{org}/{project}/_workitems/edit/{id})

---

## Related Documentation

**Strategy**:
- [Product Requirements Document](../strategy/prd-{feature}.md)
- [Business Case](../strategy/business-case-{feature}.md)

**Operations**:
- [Runbook](../operations/runbook-{feature}.md)
- [SLOs](../operations/slo-{feature}.md)

**Delivery**:
- [Test Strategy](../delivery/test-strategy-{feature}.md)
- [Release Plan](../delivery/release-plan-{feature}.md)

---

**Last Updated**: {date}
**Owner**: {Team Name}
**Maintainer**: {Person/Team}
```

**Key Features**:
- ✅ **Links instead of duplication** - Architecture, ADRs, diagrams
- ✅ **Implementation history** - Brief table showing progress
- ✅ **External tool links** - GitHub, Jira, ADO
- ✅ **Related docs** - Links to strategy, operations, delivery
- ❌ **NO technical details** - Those live in architecture/
- ❌ **NO success metrics** - Those live in increment reports
- ❌ **NO future enhancements** - Those live in roadmap/backlog

#### Increment Spec Template

**Location**: `plugins/specweave/agents/pm/templates/increment-spec.md`

```markdown
---
increment: {number}-{name}
title: "{Feature Title}"
implements: SPEC-{number}-{name}
priority: P0 | P1 | P2 | P3
status: planning | in-progress | complete
created: {date}
---

# Increment {number}: {Feature Title}

**Implements**: [SPEC-{number}: {Feature Area}](../../docs/internal/specs/default/SPEC-{number}-{name}.md)

**Quick Overview**: {1-2 sentence summary of what THIS increment delivers}

---

## What We're Implementing (This Increment Only)

This increment implements the following user stories from [SPEC-{number}](../../docs/internal/specs/default/SPEC-{number}-{name}.md):

- **US-001**: {User story title} ✅
- **US-002**: {User story title} ✅
- **US-003**: {User story title} ⏳

**Total**: {X}/{Y} user stories from SPEC-{number}

---

## Out of Scope (For This Increment)

The following user stories from SPEC-{number} are **NOT** in this increment:

- ❌ **US-004**: {User story title} → Deferred to Increment {number+1}
- ❌ **US-005**: {User story title} → Deferred to Increment {number+2}
- ❌ **US-006**: {User story title} → Not planned yet

**Rationale**: {Why these are out of scope - complexity, dependencies, etc.}

---

## User Stories (Detailed)

### US-001: {User Story Title}

**As a** {user type}
**I want** {feature}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] **AC-US1-01**: {Criterion 1}
- [ ] **AC-US1-02**: {Criterion 2}
- [ ] **AC-US1-03**: {Criterion 3}

**Implementation Notes**:
- {Implementation detail specific to THIS increment}
- {Technical approach for THIS iteration}

**Tests**:
- Unit: `tests/unit/feature-us1.test.ts`
- Integration: `tests/integration/feature-us1.test.ts`
- E2E: `tests/e2e/feature-us1.spec.ts`

---

## Implementation Plan

See [plan.md](./plan.md) for detailed implementation steps.

---

## Success Criteria (This Increment)

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| User stories complete | 3/3 (100%) | All acceptance criteria met |
| Test coverage | >80% | Jest + Playwright |
| Performance | <200ms | API response time |
| Zero critical bugs | 0 | Pre-launch testing |

---

## Related Documentation

**For complete feature specification**: [SPEC-{number}: {Feature Area}](../../docs/internal/specs/default/SPEC-{number}-{name}.md)

**Architecture**: See SPEC-{number} for links to architecture docs

**External Tracking**:
- GitHub: Issue #{number}
- Jira: Story PROJ-{number}
- Azure DevOps: User Story #{number}

---

**Status**: {Status}
**Created**: {date}
**Started**: {date}
**Completed**: {date}
```

**Key Features**:
- ✅ **References living docs** - Clear link to permanent spec
- ✅ **Focused scope** - ONLY stories in THIS increment
- ✅ **Out of scope section** - What's NOT included
- ✅ **Implementation details** - Specific to this iteration
- ❌ **NO architecture duplication** - Just reference living docs
- ❌ **NO complete feature history** - That lives in living docs

---

### Phase 3: Update PM Agent Instructions

**File**: `plugins/specweave/agents/pm/AGENT.md`

Add section on living docs vs increment specs:

```markdown
## Living Docs vs Increment Specs: The Distinction

**CRITICAL**: You MUST understand the difference between living docs and increment specs.

### Living Docs Spec (PERMANENT, EPIC-LEVEL)

**Location**: `.specweave/docs/internal/specs/default/SPEC-{number}-{name}.md`

**Purpose**: Complete, permanent source of truth for ENTIRE feature area

**Contains**:
- ✅ ALL user stories for feature area (across all increments)
- ✅ ALL acceptance criteria
- ✅ Implementation history (which increments did what)
- ✅ Links to architecture (NO duplication)
- ✅ Links to ADRs (NO duplication)
- ✅ External tool links (GitHub Project, Jira Epic)

**When to Create**: When planning a major feature that spans multiple increments

**Updates**: Add new user stories as new increments are planned

### Increment Spec (TEMPORARY, ITERATION-LEVEL)

**Location**: `.specweave/increments/{number}-{name}/spec.md`

**Purpose**: Focused implementation reference for THIS iteration only

**Contains**:
- ✅ Reference to living docs: "Implements SPEC-{number}"
- ✅ Subset of user stories (ONLY what's in this increment)
- ✅ What's being implemented RIGHT NOW
- ✅ Out of scope (deferred to future increments)
- ✅ Implementation details specific to this iteration

**When to Create**: When starting implementation of one increment

**Updates**: Updated during implementation, can be deleted after completion

### When You Create Specs

**Scenario 1**: User says "I want to build authentication"

```
You should:
1. Create living docs spec: SPEC-001-authentication.md
   - Contains ALL authentication user stories (10-20 stories)
   - Links to architecture docs
   - Maps to GitHub Project or Jira Epic

2. Create first increment spec: 0001-basic-auth/spec.md
   - References SPEC-001
   - Contains ONLY 3-5 user stories for MVP
   - Rest marked as "Out of Scope (deferred to 0002)"
```

**Scenario 2**: User says "Add OAuth to existing authentication"

```
You should:
1. Update living docs spec: SPEC-001-authentication.md
   - Add new user stories for OAuth
   - Update implementation history

2. Create new increment spec: 0005-oauth-integration/spec.md
   - References SPEC-001
   - Contains ONLY OAuth user stories
```

### External Tool Mapping

**Living Docs Spec** maps to:
- GitHub: Project Board (permanent, multiple issues link to it)
- Jira: Epic (permanent, multiple stories link to it)
- Azure DevOps: Feature (permanent, multiple user stories link to it)

**Increment Spec** maps to:
- GitHub: Issue (temporary, closed when done)
- Jira: Story (temporary, moved to Done)
- Azure DevOps: User Story (temporary, completed)

**tasks.md** maps to:
- GitHub: Issue checkboxes
- Jira: Subtasks
- Azure DevOps: Tasks

### What NOT to Do

❌ **DON'T** duplicate architecture in living docs (link to it instead)
❌ **DON'T** copy entire increment spec to living docs (extract user stories only)
❌ **DON'T** put implementation history in increment specs (that's for living docs)
❌ **DON'T** include "Future Enhancements" in living docs (that's roadmap)
```

---

### Phase 4: Migration Strategy for Existing Specs

Create migration script: `scripts/migrate-living-docs-to-new-format.ts`

```typescript
/**
 * Migrates existing living docs specs to new format
 *
 * What it does:
 * 1. Scans .specweave/docs/internal/specs/default/
 * 2. For each SPEC-*.md file:
 *    - Extract user stories (keep)
 *    - Extract implementation history (keep but simplify)
 *    - Find architecture sections (replace with links)
 *    - Find ADR sections (replace with links)
 *    - Remove success metrics (move to increment reports)
 *    - Remove future enhancements (move to roadmap)
 * 3. Rewrite spec using new template
 * 4. Create backup (.bak file)
 */
async function migrateLivingDocsToNewFormat() {
  // Implementation...
}
```

**Run**:
```bash
npx ts-node scripts/migrate-living-docs-to-new-format.ts --dry-run
npx ts-node scripts/migrate-living-docs-to-new-format.ts --apply
```

---

## 🧪 TESTING STRATEGY

### Test Cases

1. **Create New Feature**
   - Given: User requests "Add authentication"
   - When: PM agent creates specs
   - Then:
     - Living docs spec created with ALL auth user stories
     - Increment spec references living docs
     - No duplication of architecture

2. **Add to Existing Feature**
   - Given: SPEC-001-authentication exists
   - When: User requests "Add OAuth"
   - Then:
     - Living docs spec updated with OAuth stories
     - New increment spec created
     - Implementation history updated

3. **Complete Increment**
   - Given: Increment 0001 completes
   - When: Hook fires
   - Then:
     - Living docs spec updated (stories marked complete)
     - Implementation history updated
     - No architecture duplication

4. **External Tool Sync**
   - Given: Living docs spec exists
   - When: GitHub sync runs
   - Then:
     - GitHub Project created/updated
     - Issues link to project
     - Project shows all user stories

---

## 📋 ACCEPTANCE CRITERIA

This fix is COMPLETE when:

1. ✅ Living docs specs contain ONLY:
   - User stories + acceptance criteria
   - Implementation history (brief)
   - Links to architecture (not duplicate)
   - Links to ADRs (not duplicate)
   - External tool links

2. ✅ Increment specs contain ONLY:
   - Reference to living docs
   - Subset of user stories
   - Out of scope section
   - Implementation details

3. ✅ Sync logic extracts user stories (doesn't copy entire spec)

4. ✅ PM agent creates both types correctly

5. ✅ External tools map correctly:
   - Living docs = Epic/Project/Feature
   - Increment = Story/Issue/User Story
   - tasks.md = Subtasks/Checkboxes/Tasks

6. ✅ Migration script converts existing specs

7. ✅ Tests pass for all scenarios

---

## 🚀 NEXT STEPS

1. **Review this analysis** - Get sign-off on architecture
2. **Implement Phase 1** - Fix sync logic
3. **Implement Phase 2** - Update templates
4. **Implement Phase 3** - Update PM agent
5. **Implement Phase 4** - Migration script
6. **Test** - All test cases pass
7. **Migrate existing specs** - Run migration
8. **Document** - Update CLAUDE.md

---

## 📚 RELATED DOCUMENTATION

**See**:
- [CLAUDE.md - Specs Architecture](../../../../CLAUDE.md#specs-architecture-two-locations-explained)
- [Multi-Project Sync Architecture](../../../../CLAUDE.md#multi-project-sync-architecture)
- [External Tool Mapping](../../0031-external-tool-status-sync/spec.md)

---

**Status**: Analysis Complete ✅
**Next**: Implementation Planning
**Owner**: SpecWeave Core Team
**Date**: 2025-11-12
