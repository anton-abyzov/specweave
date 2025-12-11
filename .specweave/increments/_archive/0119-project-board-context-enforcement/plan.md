# Implementation Plan: Project/Board Context Enforcement

## Overview

This plan addresses the gap where Claude's increment planning bypasses the project/board detection API, resulting in invalid specs that fail to sync correctly.

## Architecture

### Current Flow (Broken)

```
User: "create increment for X"
    ↓
Claude reads increment-planner/SKILL.md
    ↓
Claude generates spec.md with guessed project (folder name)
    ↓
Living docs sync fails OR syncs to wrong location
```

### Target Flow (Fixed)

```
User: "create increment for X"
    ↓
Claude reads increment-planner/SKILL.md
    ↓
Claude MUST run: specweave context projects   ← NEW MANDATORY STEP
    ↓
Claude receives JSON: {level: 2, projects: [...], boardsByProject: {...}}
    ↓
Claude selects or prompts user for project/board
    ↓
Claude generates spec.md with VALID project/board
    ↓
Pre-write hook validates project/board   ← EXISTING + ENHANCED
    ↓
Claude creates all increment files (spec.md, plan.md, tasks.md, metadata.json)
    ↓
⭐ AUTO-SYNC: /specweave:sync-specs <increment-id>   ← NEW MANDATORY STEP
    ↓
Living docs created: internal/specs/{project}/FS-XXX/
    ↓
External tool sync triggers (if enabled)   ← AUTO-CASCADE
    ↓
GitHub/JIRA/ADO issues created
```

## Components

### 1. CLI Context Command (NEW)

**Location**: `src/cli/commands/context.ts`

```typescript
export const contextCommand = new Command('context')
  .description('Get project/board context for increment planning')
  .addCommand(projectsSubcommand)
  .addCommand(boardsSubcommand)
  .addCommand(selectSubcommand);
```

**Subcommands**:
- `specweave context projects` - Returns all projects as JSON
- `specweave context boards --project=<id>` - Returns boards for project
- `specweave context select` - Interactive selection (returns JSON)

### 2. Enhanced spec-project-validator Hook

**Location**: `plugins/specweave/hooks/spec-project-validator.sh`

Current behavior: Validates 2-level structure has board field.
Enhanced behavior:
- Validate project exists in config
- Validate board exists under project
- Reject unresolved placeholders

### 3. Updated increment-planner Skill

**Location**: `plugins/specweave/skills/increment-planner/SKILL.md`

Add MANDATORY step before spec generation:

```markdown
### STEP 0B: Get Project Context (MANDATORY - BLOCKING!)

⛔ **DO NOT PROCEED WITHOUT THIS STEP**

Before generating ANY spec.md content, you MUST run:

\`\`\`bash
specweave context projects
\`\`\`

This returns JSON like:
\`\`\`json
{
  "level": 2,
  "projects": [{"id": "acme-corp", "name": "ACME Corporation"}],
  "boardsByProject": {
    "acme-corp": [
      {"id": "digital-ops", "name": "Digital Operations"},
      {"id": "mobile-team", "name": "Mobile Team"}
    ]
  },
  "detectionReason": "ADO area path mapping configured"
}
\`\`\`

**Selection Rules:**
- level=1 + 1 project → AUTO-SELECT silently
- level=2 + 1 project + 1 board → AUTO-SELECT silently
- Multiple options → ASK user
```

### 4. Living Docs Sync Path Validation

**Location**: `src/core/living-docs/living-docs-sync.ts`

Add validation before creating files:

```typescript
private validateTargetPath(specContent: string): void {
  const validation = validateProjectContext(specContent, this.projectRoot);
  if (!validation.isValid) {
    throw new Error(`Invalid project context: ${validation.errors.join(', ')}`);
  }
}
```

## Implementation Phases

### Phase 1: CLI Context Command (US-003)

1. Create `src/cli/commands/context.ts`
2. Add `projects` subcommand using `detectStructureLevel()`
3. Add `boards` subcommand with project filter
4. Add `select` subcommand with interactive prompts
5. Register in main CLI

### Phase 2: Enhanced Hook (US-002)

1. Update `spec-project-validator.sh` to call detection API
2. Add project existence validation
3. Add board existence validation for 2-level
4. Return helpful errors with available options

### Phase 3: Skill Updates (US-001, US-004)

1. Add MANDATORY context command call to SKILL.md
2. Add example output Claude must parse
3. Add validation that values came from detection
4. Update templates with clearer placeholders

### Phase 4: Living Docs Validation (US-005)

1. Add `validateTargetPath()` to living-docs-sync.ts
2. Validate project/board before creating folders
3. Log expected path for debugging
4. Fail with actionable error if invalid

### Phase 5: Auto-Sync After Increment Creation (US-006)

1. Update or create `post-increment-planning.sh` hook
2. Hook triggers `specweave sync-specs <increment-id>` after files created
3. Update SKILL.md with MANDATORY sync step
4. Ensure external tool sync cascades if `canUpsertInternalItems: true`
5. Make sync NON-BLOCKING (errors logged, not thrown)

### 5. Auto-Sync Cascade (NEW)

**Location**: `plugins/specweave/hooks/post-increment-planning.sh` + SKILL.md

After increment files are created, AUTOMATICALLY trigger:

```bash
# In post-increment-planning.sh OR as SKILL.md step
specweave sync-specs <increment-id>
```

This creates the full cascade:
1. **Living Docs Sync** → Creates `FS-XXX/FEATURE.md` + `us-*.md`
2. **External Tool Sync** → Creates GitHub/JIRA/ADO issues (if enabled)

**Why hook + skill instruction both?**
- Hook: Automatic, doesn't rely on Claude following instructions
- Skill: Explicit, visible to user, works even if hook fails

## Testing Strategy

### Unit Tests

- `detectStructureLevel()` with various configs
- `validateProjectContext()` with valid/invalid specs
- CLI commands return correct JSON

### Integration Tests

- End-to-end increment creation with multi-project
- Hook blocks invalid specs
- Living docs sync to correct folder

### Manual Testing

- Create increment in 1-level single-project (auto-select)
- Create increment in 1-level multi-project (prompt)
- Create increment in 2-level (prompt project AND board)

## Rollback Plan

If issues arise:
1. Remove MANDATORY enforcement from SKILL.md
2. Hook can be bypassed with `--force`
3. CLI command is additive (doesn't break existing)

## Success Metrics

| Metric | Target |
|--------|--------|
| Specs with valid project | 100% |
| Specs with valid board (2-level) | 100% |
| Living docs sync success | 100% |
| User prompts for single-option | 0 |
| **Auto-sync after increment creation** | **100%** |
| **Living docs in sync with increments** | **100%** |
| **External issues created (if enabled)** | **100%** |
