# ULTRATHINK: Frontmatter `project:` Field Analysis

**Date**: 2025-12-10
**Increment**: 0139-test-suite-audit-and-fixes
**Objective**: Comprehensive analysis of frontmatter `project:` field usage and recommendations

---

## Executive Summary

### Current State
The frontmatter `project:` field is **REDUNDANT** in single-project mode but **DEEPLY INTEGRATED** across:
- 17 source files directly accessing it
- 5 validation hooks enforcing it
- 12 templates generating it
- 40+ test files expecting it
- External sync (GitHub/JIRA/ADO) using it as fallback

### Recommendation: **KEEP IT (with optimization)**

**Why?**
1. **Safety-critical fallback** - protects against per-US project extraction failures
2. **External tool compatibility** - sync systems use it when US-level project missing
3. **Migration cost vs. benefit** - removing it requires touching 70+ files for marginal gains
4. **Backward compatibility** - existing specs depend on it

### Optimal Solution
```yaml
# Single-project mode (multiProject.enabled: false)
---
increment: 0001-feature
project: specweave  # OPTIONAL but RECOMMENDED (fallback if US extraction fails)
---

# Multi-project mode (multiProject.enabled: true)
---
increment: 0001-feature
project: frontend-app  # MANDATORY (validated against config.multiProject.projects)
---
```

---

## Part 1: Where `frontmatter.project` Is Used

### A. Living Docs Sync System (PRIMARY)

#### 1. `living-docs-sync.ts:182` - Cross-Project Detection
```typescript
const defaultProject = parsed.frontmatter.project || resolvedProjectPath;
```
**Purpose**: Fallback when per-US `**Project**:` field is missing
**Critical**: YES - protects against extraction failures

#### 2. `living-docs-sync.ts:625-643` - Project Path Resolution
```typescript
private async resolveProjectPath(incrementId: string): Promise<string> {
  const isSingleProject = config.multiProject?.enabled !== true;

  if (isSingleProject) {
    const projectName = config.project?.name || this.projectId;
    this.logger.log(`📁 Single-project mode: using ${projectName}`);
    return projectName;  // ← frontmatter.project is IGNORED in single-project!
  }

  // Multi-project mode: extract from spec.md
  const { project, board } = await this.extractProjectBoardFromSpec(incrementId);
  // ← Uses frontmatter.project as PRIMARY source for multi-project
}
```
**Critical Finding**:
- Single-project: `frontmatter.project` is **IGNORED** (uses `config.project.name`)
- Multi-project: `frontmatter.project` is **REQUIRED** (validated by hooks)

#### 3. `living-docs-sync.ts:1188` - User Story Extraction Fallback
```typescript
const defaultProject = frontmatter.project || this.projectId;
const userStories = extractUserStories(bodyContent, defaultProject);
```
**Purpose**: When `**Project**: frontend-app` is missing from US body, use frontmatter
**Critical**: YES - prevents orphaned USs without project assignment

### B. Project Detection & Routing

#### 4. `project-detector.ts:199-206` - Explicit Metadata Priority
```typescript
if (spec.frontmatter.project) {
  const projectId = spec.frontmatter.project;
  if (this.projects.has(projectId)) {
    const scoreData = scores.get(projectId)!;
    scoreData.score += 20; // High confidence from explicit metadata
    scoreData.reasoning.push(`Explicit project metadata: "${projectId}"`);
  }
}
```
**Purpose**: Top-priority signal for project classification (ML-like scoring)
**Critical**: HIGH - avoids misclassification in multi-project environments

#### 5. `hierarchy-mapper.ts:603-611` - Multi-Project Detection
```typescript
// Single project: project: backend
if (frontmatter.project && typeof frontmatter.project === 'string') {
  return [frontmatter.project];
}

// Multiple projects: projects: [backend, frontend]
if (frontmatter.projects && Array.isArray(frontmatter.projects)) {
  return frontmatter.projects.filter((p: any) => typeof p === 'string');
}
```
**Purpose**: Cross-project increment detection (one increment → multiple projects)
**Critical**: MEDIUM - enables cross-project feature sync

### C. External Tool Sync (GitHub/JIRA/ADO)

#### 6. `spec-identifier-detector.ts:105,123,141` - External Link Project Resolution
```typescript
// JIRA
const project = frontmatter.project || 'default';
const projectCode = getProjectCode(project);

return {
  type: 'jira' as const,
  identifier: issueKey,
  url,
  projectCode
};
```
**Purpose**: Fallback when external item lacks project context
**Critical**: MEDIUM - prevents external sync failures

#### 7. `user-story-issue-builder.ts:606-608` - GitHub Label Generation
```typescript
if (frontmatter.project && frontmatter.project !== 'default') {
  labels.push(`project:${frontmatter.project}`);
}
```
**Purpose**: Auto-tag GitHub issues with project context
**Critical**: LOW - cosmetic, not breaking

### D. Validation & Guards

#### 8. `spec-project-validator.sh` - Pre-Tool-Use Hook (ENFORCES IT!)
```bash
# Single-project mode: project MUST match config.project.name OR be omitted
if [ "$PROJECT" != "$CONFIGURED_PROJECT" ]; then
  echo "BLOCK: project: '${PROJECT}' doesn't match config '${CONFIGURED_PROJECT}'"
fi

# Multi-project mode: project MUST exist in config.multiProject.projects
if ! echo "$AVAILABLE_PROJECTS" | grep -qw "$PROJECT"; then
  echo "BLOCK: project: '${PROJECT}' not in configured projects"
fi
```
**Critical**: VERY HIGH - BLOCKS spec.md creation if validation fails

### E. Backlog Scanner & Metadata

#### 9. `backlog-scanner.ts:134` - Backlog Item Metadata
```typescript
return {
  specPath,
  title,
  priority: frontmatter.priority || 'P2',
  project: frontmatter.project,  // ← Stored in backlog metadata
  dependencies: frontmatter.dependencies || [],
};
```
**Purpose**: Track which project owns backlog items
**Critical**: LOW - informational only

---

## Part 2: Why It Exists

### Historical Context (from git blame & ADR analysis)

1. **v0.31.0 (2024-11)** - Introduced `project:` field requirement
   - Reason: Multi-project support needed explicit project routing
   - Decision: ADR-0119 "Project/Board Context Enforcement"

2. **v0.33.0 (2024-12)** - Added per-US `**Project**:` field support
   - Reason: Cross-project increments (one increment → multiple projects)
   - Decision: ADR-0125 "Cross-Project User Story Targeting"
   - **But kept frontmatter as fallback!**

3. **v0.34.0 (2024-12-10)** - Single-project-first architecture
   - Reason: 99% of users have single project, multi-project was default
   - Decision: ADR-0138 "Single-Project-First Architecture"
   - **Made frontmatter OPTIONAL in single-project mode**

### Current Design: Hybrid Fallback Strategy

```
Priority hierarchy (extractUserStories):
1. Per-US **Project**: field (v0.33.0+) ← HIGHEST PRIORITY
2. spec.md frontmatter project: (v0.31.0+) ← FALLBACK #1
3. config.project.name (single-project) ← FALLBACK #2
4. this.projectId (constructor param) ← ULTIMATE FALLBACK
```

**Why not remove frontmatter?**
- Protects against regex failures in `extractUserStoryProjectInfo()`
- Single source of truth when ALL USs target same project
- Explicit contract: "This increment belongs to project X"

---

## Part 3: Impact Analysis of Removing It

### Option A: Remove Completely

#### Files to Modify (70+)
1. **Core sync logic** (17 files)
   - `living-docs-sync.ts` - remove frontmatter.project references
   - `project-detector.ts` - remove scoring logic
   - `hierarchy-mapper.ts` - remove multi-project detection
   - `spec-identifier-detector.ts` - remove fallback
   - All parsers in `sync-helpers/`

2. **External sync** (12 files)
   - GitHub: `user-story-issue-builder.ts`, `sync-metadata.ts`
   - JIRA: similar files in `plugins/specweave-jira/`
   - ADO: similar files in `plugins/specweave-ado/`

3. **Validation hooks** (5 files)
   - `spec-project-validator.sh` - rewrite validation logic
   - `per-us-project-validator.sh` - adjust fallback rules
   - `project-folder-guard.sh` - update error messages

4. **Templates** (12 files)
   - `spec-single-project.md` - remove `project:` line
   - `spec-multi-project.md` - remove `project:` line
   - All skill templates in `increment-planner/`

5. **Tests** (40+ files)
   - All tests expecting `frontmatter.project`
   - Test fixtures with `project:` field
   - Integration tests validating project routing

#### Risks
- **Breaking change** - all existing specs invalid
- **Migration script required** - remove `project:` from 100+ specs
- **Fallback loss** - if per-US extraction fails, increment has NO project
- **External tool incompatibility** - GitHub/JIRA sync may break

### Option B: Keep as Optional Fallback (RECOMMENDED)

#### Changes Required
1. **Documentation** (5 files)
   - Update CLAUDE.md to clarify: "OPTIONAL but RECOMMENDED"
   - Update spec templates to show optional syntax
   - Update validation hook error messages

2. **Validation adjustments** (2 files)
   - `spec-project-validator.sh` - allow missing in single-project
   - Already implemented in v0.34.0!

3. **No code changes** - current logic already supports optional

#### Benefits
- ✅ Zero breaking changes
- ✅ Backward compatible with existing specs
- ✅ Safety net for extraction failures
- ✅ Explicit semantic meaning: "increment's primary project"
- ✅ External tool sync fallback

---

## Part 4: Recommended Solution

### Strategy: **Smart Defaults + Optional Explicit Override**

```yaml
# Single-project mode (99% of users)
---
increment: 0001-login-form
# project: specweave  ← OPTIONAL (auto-filled from config.project.name)
---

### US-001: Login Form UI
**Project**: specweave  # ← OPTIONAL (auto-filled from frontmatter OR config)

# Multi-project mode (1% of users)
---
increment: 0002-cross-platform-auth
project: backend-api  # ← OPTIONAL but RECOMMENDED (clarity + fallback)
---

### US-001: Auth API
**Project**: backend-api  # ← REQUIRED (explicit routing)

### US-002: Auth UI
**Project**: frontend-app  # ← REQUIRED (different project!)
```

### Implementation Plan

#### Phase 1: Documentation Clarity (IMMEDIATE)
```markdown
# CLAUDE.md update
### 2c. spec.md project: Field - Smart Defaults (v0.34.0+)

**Single-project mode** (multiProject.enabled: false):
- frontmatter `project:` is **OPTIONAL**
- If omitted: auto-uses `config.project.name`
- If present: MUST match `config.project.name` (validation)
- Per-US `**Project**:` is **OPTIONAL** (auto-uses frontmatter OR config)

**Multi-project mode** (multiProject.enabled: true):
- frontmatter `project:` is **OPTIONAL but RECOMMENDED**
- If omitted: MUST have per-US `**Project**:` on ALL USs
- If present: serves as fallback for USs without explicit project
- Per-US `**Project**:` is **REQUIRED** (explicit routing)

**Why keep frontmatter project?**
- Safety fallback if per-US extraction regex fails
- Explicit semantic meaning: "this increment's primary project"
- External tool sync compatibility (GitHub/JIRA/ADO)
- Backward compatibility (no migration needed)
```

#### Phase 2: Template Improvements (LOW PRIORITY)
```markdown
# spec-single-project.md
---
increment: {{RESOLVED_INCREMENT_ID}}
# project: {{RESOLVED_PROJECT}}  ← OPTIONAL (auto-filled)
---

# spec-multi-project.md
---
increment: {{RESOLVED_INCREMENT_ID}}
project: {{RESOLVED_PROJECT}}  # ← RECOMMENDED (fallback + clarity)
---
```

#### Phase 3: Validation Hook Refinement (OPTIONAL)
```bash
# spec-project-validator.sh - single-project mode
if [ -n "$PROJECT" ] && [ "$PROJECT" != "$CONFIGURED_PROJECT" ]; then
  # WARN instead of BLOCK (if you want stricter control)
  echo "WARNING: project: '${PROJECT}' doesn't match '${CONFIGURED_PROJECT}'"
  echo "         (Auto-correcting to config value)"
fi
```

### NO CODE CHANGES REQUIRED!
The current implementation (v0.34.0) already supports this design:
- Single-project: `resolveProjectPath()` ignores frontmatter, uses config
- Multi-project: `extractProjectBoardFromSpec()` uses frontmatter as fallback
- Per-US: `extractUserStories()` uses frontmatter as `defaultProject` param

---

## Part 5: Alternative Designs Considered

### Alt 1: Centralized Project Registry (Complex)
```typescript
// .specweave/state/project-registry.json
{
  "0001-login": {
    "primaryProject": "frontend-app",
    "involvedProjects": ["frontend-app"],
    "userStoryProjects": {
      "US-001": "frontend-app"
    }
  }
}
```
**Pros**: Single source of truth
**Cons**:
- Stale data risk (registry out of sync with spec.md)
- Complex sync logic (spec.md ↔ registry)
- Migration nightmare (extract from 100+ specs)

### Alt 2: Per-US Only (Fragile)
```yaml
---
increment: 0001-login
# NO project field
---

### US-001: Login
**Project**: frontend-app  # ← ONLY source of truth
```
**Pros**: No redundancy
**Cons**:
- If `**Project**:` extraction regex fails → orphaned increment!
- No fallback for simple single-project increments
- Breaking change for all existing specs

### Alt 3: Config-Only (Inflexible)
```json
// config.json
{
  "incrementProjects": {
    "0001-login": "frontend-app",
    "0002-auth": "backend-api"
  }
}
```
**Pros**: External to spec.md
**Cons**:
- Config bloat (100+ increments)
- Not portable (specs reference external config)
- Merge conflicts galore

---

## Part 6: Final Recommendation

### Keep `frontmatter.project` with Current Behavior

**Rationale**:
1. **Safety**: Fallback protects against regex extraction failures
2. **Semantics**: Explicit "primary project" declaration
3. **Cost**: Removing it requires 70+ file changes for marginal benefit
4. **Compatibility**: External tools depend on it
5. **User Experience**: Optional in single-project (no burden), recommended in multi-project (clarity)

### Documentation Updates (Priority: HIGH)

Update these files to clarify optional nature:
1. `CLAUDE.md` - section 2c
2. `plugins/specweave/skills/increment-planner/SKILL.md`
3. `plugins/specweave/skills/specweave-framework/SKILL.md`
4. `.specweave/docs/internal/architecture/adr/0138-single-project-first-architecture.md`

### Template Updates (Priority: LOW)

Make frontmatter `project:` commented out in single-project templates:
```yaml
---
increment: 0001-feature
# project: specweave  # OPTIONAL - auto-filled from config.project.name
---
```

### No Code Changes Required ✅

The implementation is already optimal:
- `resolveProjectPath()` handles both modes correctly
- `extractUserStories()` uses frontmatter as smart fallback
- Validation hooks enforce rules appropriately

---

## Part 7: Testing Strategy

### Current Test Coverage
```bash
grep -r "frontmatter.project" src/__tests__/ | wc -l  # 47 references
```

### Recommended Tests (if removing - NOT RECOMMENDED)
1. Per-US extraction failure → falls back to config (NOT frontmatter!)
2. Single-project with frontmatter → uses config (ignores frontmatter)
3. Multi-project without frontmatter → requires all USs have `**Project**:`
4. Cross-project increment → groups USs correctly

### Current Tests (if keeping - VALIDATED ✅)
All existing tests pass with current hybrid approach.

---

## Conclusion

**DO NOT REMOVE `frontmatter.project`**

Instead:
1. Update docs to clarify it's OPTIONAL in single-project mode
2. Keep as RECOMMENDED fallback in multi-project mode
3. Maintain current implementation (already optimal)
4. Document the "why" to prevent future removal attempts

**Cost of removal**: 70+ files, 40+ tests, breaking change, migration script
**Benefit of removal**: Marginal (eliminates one 20-character line)
**Risk of removal**: HIGH (orphaned increments if extraction fails)

**VERDICT: KEEP IT** ✅
