# ADR-0188: Smart Project Matching with User Clarification

| Status | Accepted |
|--------|----------|
| Date | 2025-12-03 |
| Decision | When sync is unsure about project/board, ASK user instead of falling back silently |
| Related | ADR-0185, ADR-0187, ADR-0152 |

## Context

### Problem Statement

Living docs sync creates features in wrong locations when it can't match to an existing project:

**Bug Report** (2025-12-03):
- Increment `0002-user-authentication` should create `FS-002` in `frontend-app/`
- Actual: Created `FS-XXX-001` in `_features/` (WRONG!)

**Root Causes**:

1. **Feature ID Derivation Broken in Plugins**: Plugin documentation shows wrong patterns (`FS-YY-MM-DD`, `FS-XXX-001`) instead of derived `FS-XXX`

2. **`_features` Folder Still Referenced**: 20+ plugin files reference `_features/` which was removed in v5.0.0

3. **Silent Fallback**: `resolveProjectPath()` falls back to wrong folder without asking user

### Why This Happens

When Claude runs in a **client project** (using SpecWeave as dependency):
1. Claude follows plugin DOCUMENTATION (markdown prompts)
2. NOT the TypeScript code (which is correct)
3. Documentation has wrong patterns → wrong output

## Decision

### 1. Remove `_features` Folder from ALL Documentation

**v5.0.0 Structure** (current, correct):
```
.specweave/docs/internal/specs/
├── {project}/
│   └── FS-XXX/
│       ├── FEATURE.md
│       └── us-*.md
└── _archive/
```

**NO `_features` folder** - features live directly in project folders.

### 2. Fix Feature ID Derivation in ALL Documentation

**CORRECT**: Feature ID derived from increment number
```
Increment: 0002-user-authentication
Feature ID: FS-002  ← Derived from 0002
Path: specs/frontend-app/FS-002/
```

**WRONG patterns to remove**:
- `FS-YY-MM-DD-name` (brownfield date format)
- `FS-XXX-001` (invented patterns)
- `FS-25-11-14-external-tool-sync` (date-based)

### 3. Smart Project Matching with User Clarification

**When sync is UNSURE about project**, it MUST:

1. **Detect available projects** from:
   - `multiProject.projects[]` in config
   - Sync profile `boardMapping` / `areaPathMapping`
   - Existing folders in `specs/`
   - Git remote / repo name

2. **Calculate confidence score** (0-1):
   - 0.8+ → Auto-match, proceed silently
   - 0.5-0.8 → Suggest with confirmation
   - <0.5 → ASK user to choose

3. **Ask user** when unsure:
```
🤔 Not sure where to sync increment 0002-user-authentication

Detected projects:
1. frontend-app (ADO: Frontend App board)
2. backend-api (ADO: Backend API board)
3. Create new project folder

Which project should this increment sync to?
> _
```

### 4. Multi-Project Mode Detection

**MUST detect before sync**:
```typescript
function detectMultiProjectMode(config): MultiProjectInfo {
  return {
    isMultiProject: boolean,
    projects: ProjectInfo[],
    detectionReason: 'umbrella' | 'boardMapping' | 'areaPathMapping' | 'multiFolder'
  };
}
```

**If multi-project AND unsure → ASK**

## Implementation

### Phase 1: Fix Plugin Documentation (Immediate)

Files to update:
- `plugins/specweave/commands/specweave-sync-specs.md`
- `plugins/specweave-github/skills/github-issue-standard/SKILL.md`
- `plugins/specweave-github/commands/*.md`
- All files containing `_features`

Replace:
- `_features/FS-XXX/` → `{project}/FS-XXX/`
- `FS-YY-MM-DD-name` → `FS-XXX` (derived from increment)

### Phase 2: Add User Clarification to LivingDocsSync

Enhance `resolveProjectPath()`:

```typescript
private async resolveProjectPath(incrementId: string): Promise<string> {
  // 1. Extract project from spec.md **Project**: field
  const specProject = await this.extractProjectFromSpec(incrementId);

  // 2. Try to match to existing projects
  const matchResult = await this.findBestProjectMatch(specProject);

  // 3. If confident → return match
  if (matchResult.confidence >= 0.8) {
    return matchResult.projectPath;
  }

  // 4. If unsure → ASK USER
  if (matchResult.confidence < 0.5 || this.isMultiProjectMode()) {
    return await this.askUserForProject(incrementId, matchResult.candidates);
  }

  // 5. Medium confidence → suggest with warning
  this.logger.warn(`⚠️ Project match has ${Math.round(matchResult.confidence * 100)}% confidence`);
  this.logger.warn(`   Matched: ${matchResult.projectPath}`);
  return matchResult.projectPath;
}

private async askUserForProject(
  incrementId: string,
  candidates: ProjectCandidate[]
): Promise<string> {
  const { select } = await import('@inquirer/prompts');

  const choices = candidates.map(c => ({
    name: `${c.name} (${c.source}: ${c.displayName})`,
    value: c.path
  }));

  choices.push({
    name: 'Create new project folder...',
    value: '__new__'
  });

  const selected = await select({
    message: `Which project should increment ${incrementId} sync to?`,
    choices
  });

  if (selected === '__new__') {
    const { input } = await import('@inquirer/prompts');
    return await input({
      message: 'Enter new project folder name:',
      validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Must be lowercase kebab-case'
    });
  }

  return selected;
}
```

### Phase 3: Add Spec.md Project Field Parsing

When creating increments, prompt for project:

```markdown
<!-- In spec.md header -->
---
increment: 0002-user-authentication
**Project**: frontend-app
---
```

Sync reads this field first before falling back to detection.

## Consequences

### Positive

1. **No more silent wrong paths** - User confirms when unsure
2. **Multi-project aware** - Properly routes to boards/area paths
3. **Documentation matches code** - ADR-0187 feature ID derivation enforced
4. **Clean folder structure** - No rogue `_features` creation

### Negative

1. **User interaction** - May interrupt workflow for ambiguous cases
2. **Documentation migration** - 20+ plugin files need updates

### Neutral

1. **Performance** - Adds project detection step (cached after first run)

## Files to Modify

| File | Change |
|------|--------|
| `src/core/living-docs/living-docs-sync.ts` | Add `askUserForProject()` method |
| `plugins/specweave/commands/specweave-sync-specs.md` | Remove `_features`, fix feature ID examples |
| `plugins/specweave-github/*` | Remove all `_features` references |
| 20+ other plugin files | Search/replace `_features` → `{project}` |

## References

- ADR-0185: Unified Living Docs Sync Architecture
- ADR-0187: Derive Feature ID from Increment Number
- ADR-0152: Brownfield-First Specs Organization
- Bug report: 2025-12-03 client project sync failure
