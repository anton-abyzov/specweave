---
increment: 0137-per-us-project-board-enforcement
title: "Per-US Project/Board Enforcement - The Missing Runtime Layer"
type: feature
priority: P0
status: planning
created: 2025-12-09
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Per-US Project/Board Enforcement - The Missing Runtime Layer

## Executive Summary

**Problem**: Increments 0119 and 0125 implemented the INFRASTRUCTURE for per-User-Story project/board targeting, but **Claude doesn't actually USE it at runtime**. User Stories are still being created without `**Project**:` and `**Board**:` fields, causing sync failures and living docs to land in wrong folders.

**Solution**: Create a comprehensive runtime enforcement layer that:
1. **Validates** spec.md has per-US project fields before saving
2. **Blocks** external sync if USs lack project targeting
3. **Auto-resolves** project/board from context when possible
4. **Connects** external sync plugins to the per-US orchestrator

## Problem Statement

### What We Built (0119, 0125) - Infrastructure EXISTS

```typescript
// Parser - WORKS (parsers.ts:32-46)
extractUserStoryProjectInfo(storyContent) → { project, board, externalProvider }

// Types - EXIST (types.ts:191-196)
interface UserStoryData {
  project?: string;      // ← Optional, no enforcement!
  board?: string;        // ← Optional, no enforcement!
  externalProvider?: 'github' | 'jira' | 'ado';
}

// Cross-project sync - EXISTS (cross-project-sync.ts, external-sync-orchestrator.ts)
class CrossProjectSync { groupByProject(), isCrossProject(), ... }
class ExternalSyncOrchestrator { groupUSsByProject(), getPreferredProvider(), ... }

// Skill documentation - EXISTS (increment-planner/SKILL.md:243-295)
// All the rules and decision trees are documented!
```

### What's MISSING - The Runtime Gap

```
USER CREATES INCREMENT:
  ┌─────────────────────────────────────┐
  │ Claude reads skill documentation    │
  │ (increment-planner/SKILL.md)        │
  └───────────────┬─────────────────────┘
                  │
                  ▼
  ┌─────────────────────────────────────┐
  │ Claude SHOULD run:                  │
  │   specweave context projects        │
  │ Claude SHOULD resolve project IDs   │
  │ Claude SHOULD add **Project**: per US│
  └───────────────┬─────────────────────┘
                  │
         BUT CLAUDE DOESN'T!            ← THE BUG
                  │
                  ▼
  ┌─────────────────────────────────────┐
  │ spec.md created WITHOUT:            │
  │   ### US-001: Login Form            │
  │   **Project**: ???  ← MISSING!      │
  │   **Board**: ???    ← MISSING!      │
  └───────────────┬─────────────────────┘
                  │
                  ▼
  ┌─────────────────────────────────────┐
  │ Living docs sync uses default       │
  │ All USs go to SAME project folder   │
  │ External sync creates issues in     │
  │ WRONG repo/project!                 │
  └─────────────────────────────────────┘
```

### Real-World Impact

**User Setup:**
- 2-level structure (ADO area paths)
- Projects: `acme-corp`
- Boards: `digital-operations`, `mobile-team`, `platform-core`

**User Request:** "Create increment for OAuth implementation"

**Expected Behavior:**
```markdown
### US-001: Login Form UI
**Project**: acme-corp
**Board**: mobile-team
**As a** mobile user...

### US-002: Auth API Endpoints
**Project**: acme-corp
**Board**: platform-core
**As a** developer...
```

**Actual Behavior (THE BUG):**
```markdown
### US-001: Login Form UI
**As a** mobile user...  ← NO PROJECT/BOARD!

### US-002: Auth API Endpoints
**As a** developer...    ← NO PROJECT/BOARD!
```

**Consequence:**
- Living docs → all USs land in default project folder
- ADO sync → all work items created in wrong area path
- Team confusion → mobile team sees platform work items

## Root Cause Analysis

### Why Claude Doesn't Follow the Skill

1. **No Enforcement Hook**: Skill says "MUST run `specweave context projects`" but nothing BLOCKS spec creation without it

2. **No Validation on Write**: spec.md can be written with `**Project**: {{PROJECT_ID}}` placeholders - no hook catches this

3. **No Runtime Prompt Injection**: Claude should receive project context BEFORE generating spec, but context isn't injected into the conversation

4. **External Plugins Not Connected**: `specweave-github`, `specweave-jira`, `specweave-ado` plugins don't call `ExternalSyncOrchestrator` - they sync at increment level, not per-US

5. **Optional Fields**: `UserStoryData.project` and `.board` are optional in TypeScript - no runtime enforcement

## Core Principle: 1:1 US → Project+Board Mapping

**CRITICAL DESIGN CONSTRAINT**: Each User Story MUST map to exactly ONE project (and ONE board for 2-level):

```
┌──────────────────────────────────────────────────────────────────┐
│                    US → PROJECT+BOARD RELATIONSHIP               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   US-001 ─────────► project: frontend-app                        │
│                     board: ui-team        (1:1 mapping)         │
│                                                                  │
│   US-002 ─────────► project: backend-api                         │
│                     board: api-team       (1:1 mapping)         │
│                                                                  │
│   US-003 ─────────► project: mobile-app                          │
│                     board: mobile-team    (1:1 mapping)         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  ❌ FORBIDDEN:                                                   │
│     US-001 → [project-a, project-b]  (multiple projects)        │
│     US-001 → [board-a, board-b]      (multiple boards)          │
│     US-001 → null/undefined          (missing assignment)       │
│                                                                  │
│  ✅ REQUIRED:                                                    │
│     US-XXX → exactly 1 project + exactly 1 board (2-level)     │
│     US-XXX → exactly 1 project (1-level)                        │
└──────────────────────────────────────────────────────────────────┘
```

### Why 1:1 Mapping is Essential

1. **External Sync**: Each US creates ONE issue in ONE external tool (GitHub repo, JIRA project, ADO area)
2. **Living Docs**: Each US file lives in ONE project folder (no duplicates, no ambiguity)
3. **Team Ownership**: Each US belongs to ONE team (clear responsibility)
4. **Validation**: Simple check - every US must have non-null, non-list project/board

### Cross-Project Features

If a feature spans multiple projects, create **separate USs per project**:

```markdown
## Cross-Project Feature: OAuth Implementation

### US-001: Login Form UI
**Project**: frontend-app
**Board**: ui-team
**As a** user, I want a login form...

### US-002: Auth API Endpoints
**Project**: backend-api
**Board**: api-team
**As a** developer, I want JWT authentication API...

### US-003: Mobile Login Screen
**Project**: mobile-app
**Board**: mobile-team
**As a** mobile user, I want native login...

### US-004: Shared Auth Types
**Project**: shared-lib
**Board**: platform
**As a** developer, I want shared TypeScript types...
```

**NOT this (WRONG):**
```markdown
### US-001: OAuth Implementation
**Project**: frontend-app, backend-api, mobile-app  ← ❌ FORBIDDEN
```

## Solution Architecture

### Layer 1: Pre-Planning Context Injection (US-001)

**BEFORE Claude generates spec.md**, inject project context into conversation:

```typescript
// Hook: pre-increment-planning.ts
export async function injectProjectContext(incrementDescription: string): Promise<string> {
  const structureConfig = detectStructureLevel(projectRoot);

  const contextBlock = `
## 🎯 Project Context (AUTO-INJECTED)

**Structure Level**: ${structureConfig.level}-level
**Available Projects**: ${structureConfig.projects.map(p => p.id).join(', ')}
${structureConfig.level === 2 ? `**Boards by Project**:\n${formatBoardsByProject(structureConfig.boardsByProject)}` : ''}

**⚠️ MANDATORY**: Each User Story MUST have:
- \`**Project**: <project-id>\` ← Pick from list above
${structureConfig.level === 2 ? '- `**Board**: <board-id>` ← Pick from boards above' : ''}

---

User's request: ${incrementDescription}
`;

  return contextBlock;
}
```

### Layer 2: Per-US Validation Hook (US-002)

**BLOCK spec.md writes** that lack per-US project targeting:

```bash
#!/bin/bash
# Hook: per-us-project-validator.sh (Pre-Tool-Use)

# Parse spec.md content from tool input
spec_content="$TOOL_INPUT_CONTENT"

# Count user stories
us_count=$(echo "$spec_content" | grep -c "^### US-")

# Count user stories WITH project field
us_with_project=$(echo "$spec_content" | grep -A2 "^### US-" | grep -c "^\*\*Project\*\*:")

# Validate all USs have project
if [ "$us_with_project" -lt "$us_count" ]; then
  echo "❌ BLOCKED: ${us_count} User Stories found, but only ${us_with_project} have **Project**: field"
  echo "Each User Story MUST have **Project**: <project-id> on the line after the heading"
  echo ""
  echo "Example:"
  echo "### US-001: Login Form"
  echo "**Project**: frontend-app"
  echo "**Board**: ui-team  (required for 2-level structures)"
  echo ""
  exit 1
fi

# For 2-level structures, also check board
if [ "$(cat .specweave/config.json | jq -r '.sync.profiles | to_entries | map(select(.value.config.areaPathMapping or .value.config.boardMapping)) | length')" -gt 0 ]; then
  us_with_board=$(echo "$spec_content" | grep -A3 "^### US-" | grep -c "^\*\*Board\*\*:")
  if [ "$us_with_board" -lt "$us_count" ]; then
    echo "❌ BLOCKED: 2-level structure detected. ${us_count} USs found, but only ${us_with_board} have **Board**: field"
    exit 1
  fi
fi

exit 0
```

### Layer 3: Smart Project Resolution (US-003)

**Auto-resolve project from context** when Claude can infer it:

```typescript
// src/utils/project-resolver.ts

export interface ProjectResolution {
  resolved: boolean;
  projectId?: string;
  boardId?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export function resolveProjectFromContext(
  usContent: string,
  structureConfig: StructureLevelConfig,
  existingPatterns: Map<string, string>  // keyword → project
): ProjectResolution {

  // 1. Single project → auto-select
  if (structureConfig.projects.length === 1) {
    return {
      resolved: true,
      projectId: structureConfig.projects[0].id,
      confidence: 'high',
      reason: 'Single project available - auto-selected'
    };
  }

  // 2. Check keyword patterns from existing specs
  for (const [keyword, project] of existingPatterns) {
    if (usContent.toLowerCase().includes(keyword.toLowerCase())) {
      return {
        resolved: true,
        projectId: project,
        confidence: 'medium',
        reason: `Matched keyword "${keyword}" from existing patterns`
      };
    }
  }

  // 3. Cross-cutting detector
  const crossCutting = detectCrossCutting(usContent);
  if (crossCutting.suggestedProjects.length === 1) {
    // Map suggested project to actual project ID
    const suggestedId = mapToActualProject(crossCutting.suggestedProjects[0], structureConfig);
    if (suggestedId) {
      return {
        resolved: true,
        projectId: suggestedId,
        confidence: crossCutting.confidence === 'high' ? 'high' : 'medium',
        reason: `Keyword analysis: ${crossCutting.matchedKeywords.join(', ')}`
      };
    }
  }

  // 4. Cannot resolve
  return {
    resolved: false,
    confidence: 'low',
    reason: 'Could not determine project from context'
  };
}
```

### Layer 4: External Plugin Integration (US-004, US-005, US-006)

**Connect external sync plugins to per-US orchestrator:**

```typescript
// plugins/specweave-github/lib/per-us-sync.ts

export async function syncUserStoriesToGitHub(
  incrementId: string,
  userStories: UserStoryData[],
  projectMappings: Record<string, ProjectMapping>
): Promise<USSyncResult[]> {

  const results: USSyncResult[] = [];

  // Group by project
  const byProject = groupBy(userStories, us => us.project || 'default');

  for (const [projectId, stories] of Object.entries(byProject)) {
    const mapping = projectMappings[projectId];

    if (!mapping?.github) {
      results.push(...stories.map(us => ({
        usId: us.id,
        provider: 'github' as const,
        success: false,
        error: `No GitHub mapping for project "${projectId}"`
      })));
      continue;
    }

    // Sync each US to the correct repo
    for (const us of stories) {
      const result = await createGitHubIssue(
        mapping.github.owner,
        mapping.github.repo,
        us
      );
      results.push(result);
    }
  }

  return results;
}
```

### Layer 5: Config Schema Extension (US-007)

**Add projectMappings to config schema:**

```json
{
  "projectMappings": {
    "type": "object",
    "description": "Maps SpecWeave project IDs to external tool targets",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "github": {
          "type": "object",
          "properties": {
            "owner": { "type": "string" },
            "repo": { "type": "string" }
          },
          "required": ["owner", "repo"]
        },
        "jira": {
          "type": "object",
          "properties": {
            "project": { "type": "string" },
            "board": { "type": "string" }
          },
          "required": ["project"]
        },
        "ado": {
          "type": "object",
          "properties": {
            "project": { "type": "string" },
            "areaPath": { "type": "string" }
          },
          "required": ["project"]
        }
      }
    }
  }
}
```

## User Stories

### US-001: Pre-Planning Context Injection (P0)
**Project**: specweave

**As a** user creating a new increment
**I want** project/board context automatically injected before Claude generates spec.md
**So that** Claude has the information needed to assign projects per US

#### Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:increment` hook detects structure level before planning starts
- [x] **AC-US1-02**: Available projects/boards are listed in a context block injected into conversation
- [x] **AC-US1-03**: Context block includes clear instructions that each US needs **Project**: field
- [x] **AC-US1-04**: For 2-level structures, context block includes board options per project
- [x] **AC-US1-05**: Context injection happens BEFORE Claude starts generating spec.md content

---

### US-002: Per-US Project Validation Hook (P0)
**Project**: specweave

**As a** framework maintainer
**I want** a validation hook that BLOCKS spec.md writes missing per-US project fields
**So that** specs cannot be saved without proper project targeting

#### Acceptance Criteria

- [x] **AC-US2-01**: Hook parses spec.md to count User Stories (### US-XXX pattern)
- [x] **AC-US2-02**: Hook counts USs with **Project**: field (line after heading)
- [x] **AC-US2-03**: Hook BLOCKS write if any US lacks **Project**: field
- [x] **AC-US2-04**: For 2-level structures, hook also requires **Board**: field
- [x] **AC-US2-05**: Error message lists which USs are missing fields
- [x] **AC-US2-06**: Error message shows available projects/boards from config
- [x] **AC-US2-07**: Hook can be bypassed with explicit `--force` flag

---

### US-003: Smart Project Resolution Utility (P1)
**Project**: specweave

**As a** Claude agent generating user stories
**I want** a utility that auto-resolves project/board from US content
**So that** I can suggest projects without always asking the user

#### Acceptance Criteria

- [x] **AC-US3-01**: Single project → auto-selects silently (no question)
- [x] **AC-US3-02**: Keyword matching → suggests project with confidence level
- [x] **AC-US3-03**: Cross-cutting detection → splits USs across projects
- [x] **AC-US3-04**: Resolution includes `confidence` (high/medium/low) and `reason`
- [x] **AC-US3-05**: Low confidence → prompts user with all options
- [x] **AC-US3-06**: Existing spec patterns learned from `.specweave/increments/*/spec.md`

---

### US-004: GitHub Plugin Per-US Sync (P1)
**Project**: specweave

**As a** user with USs targeting different GitHub repos
**I want** GitHub sync to create issues in the correct repo per US
**So that** each team's repo contains only their relevant issues

#### Acceptance Criteria

- [x] **AC-US4-01**: `specweave-github` reads `projectMappings` from config.json
- [x] **AC-US4-02**: Sync groups USs by their `project` field
- [x] **AC-US4-03**: Each project group syncs to its mapped `github.owner/repo`
- [x] **AC-US4-04**: metadata.json stores `externalRefs` per US (not per increment)
- [x] **AC-US4-05**: USs without mapping show clear error (not silent failure)
- [x] **AC-US4-06**: Rate limiting applies per-provider, batched across USs

---

### US-005: JIRA Plugin Per-US Sync (P1)
**Project**: specweave

**As a** user with USs targeting different JIRA projects/boards
**I want** JIRA sync to create issues in the correct project per US
**So that** each JIRA board contains only relevant stories

#### Acceptance Criteria

- [x] **AC-US5-01**: `specweave-jira` reads `projectMappings` from config.json
- [x] **AC-US5-02**: Sync groups USs by their `project` field
- [x] **AC-US5-03**: Each project group syncs to its mapped `jira.project/board`
- [x] **AC-US5-04**: metadata.json stores `externalRefs` per US
- [x] **AC-US5-05**: USs without mapping show clear error
- [x] **AC-US5-06**: Existing JIRA issues updated if already synced

---

### US-006: ADO Plugin Per-US Sync (P1)
**Project**: specweave

**As a** user with USs targeting different ADO area paths
**I want** ADO sync to create work items in the correct area path per US
**So that** each team's board shows only their relevant work items

#### Acceptance Criteria

- [x] **AC-US6-01**: `specweave-ado` reads `projectMappings` from config.json
- [x] **AC-US6-02**: Sync groups USs by their `project` field
- [x] **AC-US6-03**: Each project group syncs to its mapped `ado.project/areaPath`
- [x] **AC-US6-04**: metadata.json stores `externalRefs` per US
- [x] **AC-US6-05**: USs without mapping show clear error
- [x] **AC-US6-06**: Work items tagged with area path correctly

---

### US-007: Config Schema for projectMappings (P1)
**Project**: specweave

**As an** admin configuring multi-project sync
**I want** a validated `projectMappings` schema in config.json
**So that** project → external tool mappings are consistent and validated

#### Acceptance Criteria

- [x] **AC-US7-01**: JSON schema defines `projectMappings` structure
- [x] **AC-US7-02**: Each mapping has optional `github`, `jira`, `ado` sub-objects
- [x] **AC-US7-03**: GitHub mapping requires `owner` and `repo`
- [x] **AC-US7-04**: JIRA mapping requires `project`, optional `board`
- [x] **AC-US7-05**: ADO mapping requires `project`, optional `areaPath`
- [x] **AC-US7-06**: Schema validation runs on `specweave init` and config load

---

### US-008: /specweave:status Cross-Project View (P2)
**Project**: specweave

**As a** user managing cross-project increments
**I want** `/specweave:status` to show per-US sync status grouped by project
**So that** I can see which USs synced where and their external status

#### Acceptance Criteria

- [x] **AC-US8-01**: Status groups USs by their target project
- [x] **AC-US8-02**: Each US shows external tool link (GitHub/JIRA/ADO issue URL)
- [x] **AC-US8-03**: Aggregate shows "3/5 USs synced, 2 pending"
- [x] **AC-US8-04**: Warning shown for USs without project mapping
- [x] **AC-US8-05**: 2-level structures show project AND board per US

---

### US-009: Living Docs Per-US Folder Placement (P1)
**Project**: specweave

**As a** user with cross-project increments
**I want** living docs to place each US file in its declared project folder
**So that** each project's docs contain only relevant user stories

#### Acceptance Criteria

- [x] **AC-US9-01**: `syncIncrement()` reads `project` field from each US
- [x] **AC-US9-02**: Each US file placed in `specs/{project}/FS-XXX/us-XXX.md`
- [x] **AC-US9-03**: Cross-project increments create FS-XXX folder in EACH project
- [x] **AC-US9-04**: FEATURE.md in each project links to related projects
- [x] **AC-US9-05**: 2-level structures place files in `specs/{project}/{board}/FS-XXX/`

---

### US-010: Backward Compatibility - Default Project Fallback (P2)
**Project**: specweave

**As a** user with existing specs without per-US project fields
**I want** the system to fall back to increment-level `project:` field
**So that** existing increments continue to work

#### Acceptance Criteria

- [x] **AC-US10-01**: If US has no `**Project**:`, use spec.md frontmatter `project:`
- [x] **AC-US10-02**: If no frontmatter project, use first project from config
- [x] **AC-US10-03**: Fallback logged as warning (not error)
- [x] **AC-US10-04**: Validation hook has `--legacy` mode for existing specs
- [x] **AC-US10-05**: Migration guide documents how to add per-US fields

## Functional Requirements

### FR-001: Context Injection Timing

Context MUST be injected:
1. AFTER user provides increment description
2. BEFORE Claude generates spec.md content
3. In the SAME conversation (not separate agent)

### FR-002: Validation Hook Integration

Hook MUST:
1. Run on Pre-Tool-Use for Write/Edit to `*/spec.md`
2. Parse YAML frontmatter AND markdown body
3. Validate BOTH `project:` frontmatter AND per-US `**Project**:` fields
4. Return structured error with missing USs listed

### FR-003: External Sync Flow

```
syncToExternalTools(incrementId)
    │
    ├── loadUserStories() → get project field per US
    │
    ├── loadProjectMappings() → get external targets
    │
    ├── groupUSsByProject()
    │
    └── for each (project, stories):
           │
           ├── getMapping(project) → {github?, jira?, ado?}
           │
           └── syncToProvider(stories, mapping)
                  │
                  ├── createIssues() / updateIssues()
                  │
                  └── updateMetadataExternalRefs(usId → ref)
```

### FR-004: metadata.json External Refs Format

```json
{
  "id": "0137-oauth-implementation",
  "externalRefs": {
    "US-001": {
      "github": {
        "provider": "github",
        "issueNumber": 45,
        "url": "https://github.com/org/frontend-app/issues/45",
        "targetProject": "frontend-app",
        "lastSynced": "2025-12-09T10:00:00Z"
      }
    },
    "US-002": {
      "jira": {
        "provider": "jira",
        "issueNumber": "BE-123",
        "url": "https://jira.example.com/browse/BE-123",
        "targetProject": "backend-api",
        "lastSynced": "2025-12-09T10:00:00Z"
      }
    }
  }
}
```

## Non-Functional Requirements

### NFR-001: Performance

- Context injection: < 100ms
- Validation hook: < 50ms per spec.md
- External sync batching: Max 10 API calls per second per provider

### NFR-002: Error Messages

All error messages MUST:
- Identify which USs are affected
- Show available options from config
- Provide actionable fix instructions

## Out of Scope

- **Automatic migration of existing specs**: Users must manually add per-US fields
- **Multiple projects per US**: Each US targets exactly ONE project
- **Cross-org sync**: All projects must be accessible with configured credentials
- **Real-time sync**: External sync is triggered manually or by hooks

## Dependencies

- **0119** (completed): Project/board context enforcement infrastructure
- **0125** (completed): Cross-project user story targeting infrastructure
- `src/utils/structure-level-detector.ts`: Exists, works
- `src/core/living-docs/cross-project-sync.ts`: Exists, works
- `src/core/living-docs/external-sync-orchestrator.ts`: Exists, needs integration

## Success Criteria

1. **Zero specs without per-US project**: Validation hook blocks all new specs missing fields
2. **Correct external sync**: USs sync to their declared project's external tool
3. **Clear errors**: Missing project shows available options
4. **Backward compatible**: Existing specs work with fallback to increment project

## Technical Notes

### Files to Create

1. `plugins/specweave/hooks/per-us-project-validator.sh` - Pre-Tool-Use validation
2. `src/hooks/pre-increment-planning.ts` - Context injection
3. `src/utils/project-resolver.ts` - Smart project resolution

### Files to Modify

1. `plugins/specweave-github/lib/github-sync.ts` - Call per-US orchestrator
2. `plugins/specweave-jira/lib/jira-sync.ts` - Call per-US orchestrator
3. `plugins/specweave-ado/lib/ado-sync.ts` - Call per-US orchestrator
4. `src/core/living-docs/living-docs-sync.ts` - Use per-US project for folder placement
5. `src/core/schemas/specweave-config.schema.json` - Add projectMappings
6. `plugins/specweave/skills/increment-planner/SKILL.md` - Add context injection step

### Hook Configuration

```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "pattern": "Write|Edit",
      "pathPattern": ".*/spec\\.md$",
      "script": "plugins/specweave/hooks/per-us-project-validator.sh"
    }
  ]
}
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude ignores context injection | High | Make validation hook BLOCKING - cannot bypass |
| Existing specs break | Medium | Fallback to increment-level project |
| External API rate limits | Low | Batch by provider, respect limits |
| Complex 2-level structures | Medium | Thorough testing with ADO/JIRA board configs |
