# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## CRITICAL SAFETY RULES

### 1. Context Management (CRASH PREVENTION!)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/sw:pause XXXX → edit → /sw:resume XXXX
# OR close completed increments: /sw:done XXXX
```

### 1b. Max 25 Tasks Per Increment (SOFT LIMIT)

**>25 tasks = consider splitting for maintainability**

```bash
# Check task count before starting work:
grep -c "^### T-" .specweave/increments/*/tasks.md

# If >25 tasks: Consider splitting by phase
# Pattern: Feature → Phase1 (T-001 to T-008) + Phase2 (T-009 to T-016) + ...
```

**When to split (guidelines, not hard rules):**
- Tasks span unrelated subsystems
- Different teams would own different phases
- Review cycles would benefit from smaller PRs

**Phase-by-phase execution** (recommended for 15-25 tasks):
```
Execute Phase 1 → validate → continue to Phase 2 → ...
```

**Token budget per increment**: ~80k tokens max (tasks + spec + plan + context)

### 2. Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work - IMMEDIATELY update both:
TodoWrite([{task: "T-013", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

### 2b. NEVER Edit metadata.json to "completed" Directly (v0.28.63+)

**Direct status change to "completed" = BUG** (auto-completion without user approval)

```
❌ FORBIDDEN (Bug pattern from increment 0081):
Edit("metadata.json", '"status": "active"', '"status": "completed"')
→ Status becomes "completed" without ACs checked or user approval!

✅ CORRECT workflow:
1. All tasks completed → auto-transition to "ready_for_review"
2. /sw:done <id> → validates ACs + asks for user confirmation
3. Only then → status becomes "completed" with approvedAt timestamp
```

**Pre-tool-use hook `completion-guard.sh` BLOCKS direct completion edits.**

If you need to implement closure, use:
```typescript
MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);
// Only succeeds if current status is "ready_for_review"
```

### 2b-bis. Task-AC Auto-Sync (EDA v0.35.2+)

**When you mark a task complete in tasks.md, THREE things are AUTO-UPDATED!**

```
FLOW (fully automatic via EDA hooks):
1. Edit tasks.md: **Status**: [ ] pending → **Status**: [x] completed
2. Hook auto-checks ALL **Acceptance** points in that task: - [ ] → - [x]
3. Hook extracts AC tags from task: **Satisfies ACs**: AC-US1-01, AC-US1-02
4. Hook auto-updates spec.md: - [ ] **AC-US1-01** → - [x] **AC-US1-01**
5. When ALL tasks complete → auto-transitions status to "ready_for_review"
6. User runs /sw:done → PM validation → status becomes "completed"
```

**This EDA flow ensures:**
- ✅ Task **Acceptance** checkboxes auto-checked when task completed
- ✅ spec.md ACs always match tasks.md completion status
- ✅ No manual checkbox updates needed (task or spec level)
- ✅ Auto-transition to `ready_for_review` when all tasks done
- ✅ Manual `/sw:done` still required for final closure (PM gate preserved)

**Example (automatic transformation):**
```markdown
# BEFORE: Mark task complete
### T-001: Implement Feature
**Acceptance**:
- [ ] Code compiles              ← Will be auto-checked!
- [ ] Tests pass                 ← Will be auto-checked!
**Status**: [x] completed        ← You only edit this line

# AFTER: Hook runs automatically
### T-001: Implement Feature
**Acceptance**:
- [x] Code compiles              ← Auto-checked by hook
- [x] Tests pass                 ← Auto-checked by hook
**Status**: [x] completed
```

**Hook chain**: `post-tool-use.sh` → `task-ac-sync-guard.sh` → `us-completion-detector.sh`

**Log location**: `.specweave/logs/task-ac-sync.log`

### 2c. Per-US **Project**: Fields are MANDATORY (ADR-0140, v0.35.0+)

**⛔ EVERY User Story MUST have `**Project**:` field - NO EXCEPTIONS!**

This applies to BOTH single-project AND multi-project modes. The field is MANDATORY because:
1. Living docs sync requires it to place files in correct folders
2. External tool sync (GitHub/JIRA/ADO) requires it to create issues in correct projects
3. Without it, the LLM "forgets" to include project context

**🧠 ULTRATHINK REQUIRED FOR PROJECT ASSIGNMENT:**

**RESOLUTION PRIORITY (MUST FOLLOW THIS ORDER!):**
```
1. ✅ EXACT MATCH: config.project.name or multiProject.projects key → USE IT
2. ✅ LIVING DOCS: Existing folder in specs/ → USE THAT PROJECT ID
3. ✅ RECENT PATTERNS: Same feature type in past increments → USE SAME PROJECT
4. ⚠️  UNCERTAIN: Multiple valid options OR no clear match → ASK USER!
5. 🔄 FALLBACK: If all else fails → USE "default" (NEVER "specweave"!)
```

**❌ NEVER assign "specweave" as project** - that's the framework name, not user's project!
**✅ When uncertain, ASK the user which project to use!**
**✅ Fallback to "default" if no projects are configured.**

**Frontmatter `project:` is DEPRECATED** - per-US fields are now the ONLY source of truth!

```yaml
# spec.md frontmatter (v0.35.0+)
---
increment: 0001-feature-name
# NOTE: project: field REMOVED - use per-US **Project**: fields instead
---
```

**Per-US Project/Board (MANDATORY in spec.md body):**
```markdown
### US-001: Login Form
**Project**: my-app           # ← MANDATORY (even in single-project mode!)
**Board**: ui-team            # ← MANDATORY for 2-level structures only

**As a** user, I want...
```

**CRITICAL: Two File Formats for Project Field**

1. **spec.md** (increment folder): `**Project**:` in BODY of each user story - MANDATORY!
2. **us-*.md** (living docs folder): `project:` in FRONTMATTER - auto-generated from spec.md

When living docs sync runs, it extracts `**Project**:` from spec.md body and places it in us-*.md frontmatter:

```yaml
# us-001-login-form.md frontmatter (living docs) - AUTO-GENERATED
---
id: US-001
project: my-app    # ← Extracted from spec.md **Project**: field
---
```

**Code Implementation Rules:**
- **Generating GitHub issues**: Read from `frontmatter.project` in us-*.md files
- **Parsing spec.md**: Extract from `**Project**:` in body using regex
- **Living docs sync**: Transforms body field → frontmatter field

**VALIDATION RULES (ENFORCED BY HOOKS):**
```
✅ Per-US **Project**: fields are MANDATORY (in ALL modes!)
✅ Single-project mode: use config.project.name as the value
✅ Multi-project mode: use appropriate project from multiProject.projects
❌ FORBIDDEN: Using {{...}} placeholders in spec.md
❌ FORBIDDEN: User stories WITHOUT **Project**: field (ANY mode!)
❌ FORBIDDEN: Multiple comma-separated projects per US
❌ FORBIDDEN: Frontmatter project: field (use per-US fields instead)
```

**Pre-tool-use hook `spec-project-validator.sh` BLOCKS:**
- spec.md with `{{...}}` unresolved placeholders
- User stories missing `**Project**:` field
- User stories with unresolved `**Project**:` or `**Board**:` placeholders

### 2c-bis. Each User Story MUST Have **Project**: (and **Board**: for 2-level) (v0.34.0+)

**CRITICAL 1:1 MAPPING RULE: Each User Story maps to EXACTLY ONE project and ONE board!**

```markdown
### US-001: Login Form UI
**Project**: frontend-app     ← MANDATORY (exactly ONE project)
**Board**: ui-team            ← MANDATORY for 2-level (exactly ONE board)
**As a** user, I want a login form...

### US-002: Auth API Endpoints
**Project**: backend-api      ← DIFFERENT project = OK
**Board**: api-team           ← DIFFERENT board = OK
**As a** developer, I want JWT auth API...
```

**1:1 MAPPING ENFORCEMENT:**
```
❌ FORBIDDEN: **Project**: frontend-app, backend-api  (MULTIPLE projects)
❌ FORBIDDEN: **Board**: ui-team, api-team           (MULTIPLE boards)
❌ FORBIDDEN: User Story without **Project**: field

✅ REQUIRED: Each US has exactly ONE **Project**: value
✅ REQUIRED: Each US has exactly ONE **Board**: value (2-level)
✅ CROSS-PROJECT: Split into separate USs per project
```

**Cross-project features → Create SEPARATE User Stories:**
```markdown
## OAuth Feature (Cross-Project)

### US-001: OAuth Login Form
**Project**: frontend-app     ← One project per US
...

### US-002: OAuth API Endpoints
**Project**: backend-api      ← Different project = separate US
...

### US-003: OAuth Mobile Screen
**Project**: mobile-app       ← Different project = separate US
...
```

**Pre-tool-use hook `per-us-project-validator.sh` BLOCKS spec.md with:**
- Missing `**Project**:` field per US
- Missing `**Board**:` field per US (2-level)
- Multiple comma-separated projects
- Multiple comma-separated boards

**Bypass (EMERGENCY ONLY):**
```bash
SPECWEAVE_FORCE_PROJECT=1   # Skip all validation
SPECWEAVE_LEGACY_SPEC=1     # Allow legacy specs without per-US fields
```

### 2d. NEVER Create Files in _features/ Folder (OBSOLETE v5.0.0+)

**The `_features/` folder is OBSOLETE!** Features MUST live in project folders:

```
❌ FORBIDDEN (Bug pattern from 2025-12-06):
.specweave/docs/internal/specs/_features/FS-116/FEATURE.md

✅ CORRECT:
.specweave/docs/internal/specs/{project}/FS-116/FEATURE.md
```

**Where `{project}` comes from (ADR-0140 v0.35.0+):**
1. Per-US `**Project**:` field (PRIMARY - recommended)
2. `config.json` → `project.name` (single-project mode fallback)
3. Example: `**Project**: specweave` → `.specweave/docs/internal/specs/specweave/FS-116/`

**Pre-tool-use hook `features-folder-guard.sh` BLOCKS writes to `_features/` (v0.33.0+).**

### 2e. NEVER Create Files at Increment Root (FOLDER STRUCTURE v0.33.0+)

**Files at increment root MUST be limited to required files!**

```
❌ FORBIDDEN (Bug pattern from 2025-12-09):
.specweave/increments/0134-feature/COMPLETION_REPORT.md
.specweave/increments/0135-feature/COMPLETION_SUMMARY.md

✅ CORRECT - Use reports/ subfolder:
.specweave/increments/0134-feature/reports/COMPLETION_REPORT.md
.specweave/increments/0135-feature/reports/COMPLETION_SUMMARY.md
```

**ONLY ALLOWED at increment root:**
- `metadata.json`
- `spec.md`
- `plan.md`
- `tasks.md`

**Everything else → subfolders:**
- `reports/` - completion reports, validation reports, analysis docs
- `scripts/` - helper scripts, automation
- `logs/` - execution logs, debug output
- `backups/` - backup files
- `docs/` - additional documentation

**Pre-tool-use hook `increment-root-guard.sh` BLOCKS non-standard files at root (v0.33.0+).**

### 2f. NEVER Create Duplicate Increment IDs (v0.33.0+, enhanced v0.34.0)

**Increment numbers MUST be unique across ALL directories!**

```
❌ FORBIDDEN (Bug pattern from 2025-12-07 and 2025-12-10):
0121-ado-jira-feature-parity-p2-p3/  ← exists
0121-intelligent-living-docs-content/ ← DUPLICATE!

❌ ALSO FORBIDDEN when splitting increments:
0141-frontmatter-removal-part1/  ← exists (original split)
0141-frontmatter-removal-code/   ← DUPLICATE! (created later with same ID)

❌ ALSO FORBIDDEN (0001 and 0001E share SAME base number):
0001-internal-feature/
0001E-external-fix/  ← COLLISION! Same base number!
```

**MULTI-LAYER PREVENTION (v0.34.0+):**
1. **Code-level**: `generateIncrementId()` now validates by default
2. **Hook-level**: `increment-duplicate-guard.sh` blocks Write operations
3. **Split-level**: Use `validateExplicitId()` when manually specifying IDs

**API (v0.34.0+):**
```typescript
import { IncrementNumberManager } from './core/increment/increment-utils.js';

// RECOMMENDED: Auto-generated ID (validates by default)
const id = IncrementNumberManager.generateIncrementId('feature-name');
// → "0122-feature-name" (guaranteed unique, throws if duplicate)

// For explicit IDs (e.g., splits): MUST validate first!
IncrementNumberManager.validateExplicitId('0145-split-part2');
// → Throws if 0145 already exists!

// Then create folder only if validation passes

// Manual validation (still available):
IncrementNumberManager.validateUnique('0121-new-name'); // throws if duplicate!

// Find duplicates:
IncrementNumberManager.findDuplicates('0121');
// → ["0121-ado-jira-feature (active)", "0121-intelligent-living-docs (active)"]
```

**CRITICAL: When Splitting Increments:**
```typescript
// ❌ WRONG - Manually specifying ID without validation:
const splitId = '0141-feature-part2';  // May conflict!
fs.mkdirSync(path.join(incrementsDir, splitId));

// ✅ CORRECT - Validate first:
IncrementNumberManager.validateExplicitId('0145-feature-part2');  // Throws if exists!
// Only proceed if no error thrown
```

**Pre-tool-use hook `increment-duplicate-guard.sh` BLOCKS duplicate increment creation (v0.33.0+).**

### 2f. Gap-Filling Increment IDs (v0.33.1+)

**Increment IDs now FILL GAPS instead of always using highest + 1!**

```
OLD BEHAVIOR (v0.33.0 and earlier):
0128 (exists) → next is 0136 (highest + 1, even if gaps exist)

NEW BEHAVIOR (v0.33.1+):
0106, 0108, 0128, 0131 (exists) → next is 0107 (fills first gap!)
```

**Gap-filling algorithm:**
1. Scans ALL directories (main, _archive, _paused, _abandoned)
2. Finds first available number starting from 0001
3. Returns gap number if found, otherwise returns highest + 1

**Examples:**
```typescript
// Existing: [0001, 0002, 0004, 0005]
IncrementNumberManager.getNextIncrementNumber(); // "0003" ← Fills gap!

// Existing: [0001, 0002, 0003, 0004]
IncrementNumberManager.getNextIncrementNumber(); // "0005" ← Sequential (no gaps)

// Existing: [0050, 0051]
IncrementNumberManager.getNextIncrementNumber(); // "0001" ← Starts from beginning!
```

**Benefits:**
- ✅ No wasted ID space (4-digit limit = max 9999 increments)
- ✅ Clear sequence without confusing gaps
- ✅ Total increment count = highest number (no need to scan all)

**Migration:** Automatic, no action required. Next increment fills first gap!

**Details:** See ADR-0142 (`.specweave/docs/internal/architecture/adr/0142-gap-filling-increment-ids.md`)

### 2f-bis. Per-Project Increment ID Collision Prevention (v1.0.19+)

**In multi-project setups, increment IDs are now checked against the target project's feature space!**

**PROBLEM (before v1.0.19):**
```
Project ec-web-ui imports external GitHub issue → creates FS-001E
User creates internal increment → 0001-feature → derives to FS-001
⚠️ FS-001 and FS-001E share same base number → COLLISION!
```

**SOLUTION (v1.0.19+):**
When `projectId` is provided to `generateIncrementId()`, it checks the target project's `specs/{projectId}/` folder for existing FS-IDs and skips colliding numbers:

```typescript
import { IncrementNumberManager } from './core/increment/increment-utils.js';

// WITHOUT projectId - uses global increment pool (backward compatible)
const globalId = IncrementNumberManager.generateIncrementId('feature');
// → "0001-feature" (no project-specific collision check)

// WITH projectId - checks target project's FS-ID space
const safeId = IncrementNumberManager.generateIncrementId('feature', {
  projectId: 'ec-web-ui'  // ← Checks specs/ec-web-ui/ for FS-001, FS-001E
});
// → "0002-feature" (skipped 0001 because FS-001E exists in ec-web-ui)

// Direct method for project-scoped number
const nextNum = IncrementNumberManager.getNextIncrementNumberForProject(
  process.cwd(),
  'ec-web-ui'
);
// → "0002" (skips numbers with existing FS-IDs)
```

**JIRA/ADO Mappers (v1.0.19+):**
- `JiraMapper` and `JiraIncrementalMapper` now accept optional `targetProjectId` constructor param
- When set, uses project-scoped ID generation to prevent collisions

**MULTI-PROJECT INDEPENDENCE:**
```
Project A (specs/project-a/): FS-001, FS-002 exist
Project B (specs/project-b/): FS-001E exists

IncrementNumberManager.getNextIncrementNumberForProject(root, 'project-a'); // "0003"
IncrementNumberManager.getNextIncrementNumberForProject(root, 'project-b'); // "0002"
```

### 2g. NEVER Create Project Folders Without Validation (v0.34.0+, fixed v0.35.1)

**Project folders MUST exist in config.json before creation!**

```
❌ FORBIDDEN (Bug pattern from 2025-12-11):
.specweave/docs/internal/specs/MyApp (3 repos)/      ← Example from spec.md!
.specweave/docs/internal/specs/frontend-app/         ← Example from spec.md!
.specweave/docs/internal/specs/backend-api/          ← Example from spec.md!
.specweave/docs/internal/specs/acme-corp/            ← Example from spec.md!
.specweave/docs/internal/specs/{{PROJECT_ID}}.../    ← Unresolved placeholder!

✅ CORRECT - Only configured projects:
.specweave/docs/internal/specs/specweave/  (exists in config.json)
```

**ROOT CAUSE (Fixed in v0.35.1):**
- Increments contain EXAMPLE User Stories with placeholder `**Project**:` values
- `extractUserStoryProjectInfo()` in parsers.ts extracts ANY string after `**Project**:`
- When sync runs, creates folders for ALL projects mentioned, including examples
- v0.35.1 FIX: `ProjectResolutionService.validateProjectForFolderCreation()` now validates BEFORE folder creation

**KNOWN EXAMPLE PROJECT NAMES (ALWAYS BLOCKED unless configured):**
- `frontend-app`, `backend-api`, `mobile-app`, `shared-lib`
- `acme-corp`, `my-app`, `myapp`, `example-project`, `sample-project`
- `test-project`, `demo`, `placeholder`, `per`, `default`

**MULTI-LAYER PROTECTION (v0.35.1+):**
1. **Code-level**: `ProjectResolutionService.validateProjectForFolderCreation()` validates in TypeScript
2. **Living-docs-sync**: Filters out invalid projects BEFORE calling `ensureDir()`
3. **Cross-project-sync**: `ensureSpecsFolder()` throws Error if project invalid
4. **Hook-level**: `project-folder-guard.sh` blocks Write operations to invalid folders

**EXAMPLES OF FORBIDDEN PATTERNS:**
```markdown
### US-001: Example Login Form
**Project**: MyApp (3 repos)  ← FORBIDDEN (parentheses not allowed!)

### US-002: Example API
**Project**: frontend-app, backend-api  ← FORBIDDEN (comma-separated!)

### US-003: Placeholder Story
**Project**: acme-corp  ← FORBIDDEN (example name not in config!)

### US-004: Unresolved
**Project**: {{PROJECT_ID}}  ← FORBIDDEN (unresolved placeholder!)
```

**VALIDATION RULES (ENFORCED BY CODE + HOOK):**
```
❌ FORBIDDEN: Creating folders for projects not in config.json
❌ FORBIDDEN: Example/placeholder project names (see list above)
❌ FORBIDDEN: Parentheses in project names (e.g., "MyApp (3 repos)")
❌ FORBIDDEN: Comma-separated projects (must be ONE project per US)
❌ FORBIDDEN: Template placeholders like {{PROJECT_ID}}

✅ REQUIRED: All projects MUST be in config.project.name (single) or config.multiProject.projects (multi)
✅ REQUIRED: Run `specweave context projects` to get valid project IDs
✅ REQUIRED: Use RESOLVED values from config, never placeholders
```

**BYPASS (EMERGENCY ONLY):**
```bash
SPECWEAVE_FORCE_PROJECT=1  # Skip project folder validation (DANGEROUS!)
```

**API for validation (v0.35.1+):**
```typescript
import { ProjectResolutionService } from './core/project/project-resolution.js';

const resolver = new ProjectResolutionService(projectRoot);

// Validate before folder creation
const validation = await resolver.validateProjectForFolderCreation('frontend-app');
if (!validation.valid) {
  console.error(`Cannot create folder: ${validation.reason}`);
  console.log(`Allowed projects: ${validation.allowedProjects.join(', ')}`);
}

// Static sync check for hooks
if (ProjectResolutionService.isExampleProjectName('frontend-app')) {
  // Block - it's a known example name
}
```

**Pre-tool-use hook `project-folder-guard.sh` BLOCKS writes to non-configured project folders (v0.35.1 enhanced).**

### 2h. Single-Project vs Multi-Project Architecture (v0.35.0+)

**Both modes require `**Project**:` field per User Story - the only difference is where the value comes from.**

```
SINGLE-PROJECT: **Project**: uses config.project.name (e.g., "my-app")
MULTI-PROJECT:  **Project**: uses one of multiProject.projects keys
```

#### Single-Project Mode (Default)

```json
// config.json - single project
{
  "project": {
    "name": "my-app",  // ← This value goes in **Project**: field!
    "description": "My Application",
    "techStack": ["TypeScript", "React"]
  },
  "multiProject": {
    "enabled": false  // ← Default!
  }
}
```

**Behavior**:
- All user stories use `**Project**: my-app` (from config.project.name)
- All increments go to same project folder
- No `board:` field allowed (1-level structure)
- Living docs auto-use `project.name`

**spec.md format (Single-Project)**:
```markdown
---
increment: 0001-feature
---

### US-001: Feature Name
**Project**: my-app    # ← MANDATORY! Use value from config.project.name
**As a** user, I want...
```

#### Multi-Project Mode (Opt-In)

```json
// config.json - multi-project
{
  "multiProject": {
    "enabled": true,
    "projects": {
      "frontend-app": { "name": "Frontend App" },
      "backend-api": { "name": "Backend API" }
    }
  }
}
```

**NOTE**: `activeProject` is DEPRECATED and will be removed. Per-US `**Project**:` fields are now the source of truth.

**Behavior**:
- Each US specifies which project it belongs to
- Different USs in same increment can target different projects
- Living docs distributed across project folders

**spec.md format (Multi-Project)**:
```markdown
---
increment: 0001-feature
---

### US-001: Login Form
**Project**: frontend-app  # ← MANDATORY! Pick from multiProject.projects
**As a** user, I want...

### US-002: Auth API
**Project**: backend-api   # ← Different project = different folder in living docs
**As a** developer, I want...
```

#### When to Enable Multi-Project?

| Scenario | Use Single-Project | Use Multi-Project |
|----------|-------------------|-------------------|
| One repository, one application | ✅ Default | ❌ Unnecessary |
| Monorepo with 2-3 services | ⚠️  Simpler but limited | ✅ Recommended |
| 5+ services/teams | ❌ Too simple | ✅ Required |
| Multi-repo (umbrella) | ❌ Not supported | ✅ Required |

#### Validation Rules (BOTH MODES!)

**⛔ CRITICAL: `**Project**:` is MANDATORY in BOTH modes!**

```markdown
# WRONG - Missing **Project**: field
### US-001: Feature Name
**As a** user, I want...

# CORRECT - Has **Project**: field
### US-001: Feature Name
**Project**: my-app           # ← MANDATORY (single-project: use config.project.name)
**As a** user, I want...

# CORRECT - Multi-project
### US-001: Frontend Feature
**Project**: frontend-app     # ← MANDATORY (multi-project: pick from config)
**As a** user, I want...
```

**Why mandatory in single-project mode?**
1. Consistency - same format everywhere
2. Living docs sync works correctly
3. External tool sync works correctly
4. No special cases = fewer bugs

This fixes the bug where `specweave init` created multi-project configs by default.

**Migration log**: `.specweave/logs/migration.log`

#### Troubleshooting

**Error**: "Project folders created for example names (MyApp, frontend-app)"
**Cause**: Old bug - auto-enabled multi-project mode
**Fix**: Auto-migration runs on next command. Check `migration.log`.

**Error**: "board: field not allowed"
**Cause**: Using `board:` in single-project mode
**Fix**: Remove `board:` field OR run `/sw:enable-multiproject`

**Error**: "Only folder allowed: my-app"
**Cause**: Trying to create non-configured project folder
**Fix**: Check `project.name` in config OR run `/sw:enable-multiproject`

### 3. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`
**NEVER run**: `specweave init . --force` (deletes all without backup)

### 4. Skills Must NOT Spawn Large Agents

**Skills spawning content-generating agents = CRASH** (context explosion)

```typescript
// ❌ FORBIDDEN in skills:
Task({ subagent_type: "specweave:architect:architect" }); // 1000-3000 lines output

// ✅ CORRECT: Skills create templates, guide user to invoke agents in main context
```

### 5. NEVER Spawn Parallel Agents for Multi-File Migrations (CRITICAL!)

**Parallel agents reading large files = CRASH** (context shared, not isolated!)

```
❌ FORBIDDEN (Crash pattern from 2025-11-24):
"This is a large migration (46 files)... Let me use parallel agents"
→ 4 parallel tech-lead agents × 36k tokens each = 144k tokens → CRASH!

✅ CORRECT: Sequential single-agent execution:
- Process files ONE BY ONE in main context
- Use Edit tool directly (not agents) for simple find-replace
- For complex migrations: ONE file per response, ask "Ready for next?"
```

**Rule**: Multi-file migrations MUST be sequential, NEVER parallel agents.

### 6. Emergency Minimal Mode (Explicit Activation Only)

**Activates ONLY when user says**: "emergency mode", "minimal mode ON", "crashed N times"
**Does NOT activate on**: "be careful", "small chunks" (normal caution ≠ emergency)

**Emergency mode rules:**
```
READ: limit:50 | EDIT: 1 per response | AGENTS: none | FLOW: "Done. Next?"
```

**User emergency phrase:** `EMERGENCY MODE. 1 edit. 50 lines max. No agents.`

### 7. Writing Effective Claude Instructions

**Terse imperatives > verbose explanations:**
```
❌ "Please consider making smaller edits and waiting for my confirmation"
✅ "1 edit. STOP. Wait for 'next'."
```

**Format:** `ACTION. CONSTRAINT. CONSTRAINT.` (periods, not commas)

### 8. MDX Compatibility (Docusaurus Preview)

**External HTML content = MDX compilation errors** (blocks docs preview)

```
❌ MDX FAILS ON:
- target=_blank (unquoted attribute) → target="_blank"
- <br> (self-closing without /) → <br />
- dir=auto, rel=noopener, alt=image (all unquoted)

✅ PREVENTION (automatic in importers since v0.32.0):
- ADO/JIRA/GitHub importers use sanitizeHtmlForMdx()
- Located: src/utils/html-to-mdx.ts
```

**If Docusaurus preview fails with "Unexpected character":**
```bash
# Batch fix existing files (macOS):
find .specweave/docs -name "*.md" -exec sed -i '' 's/target=_blank/target="_blank"/g' {} \;
find .specweave/docs -name "*.md" -exec sed -i '' 's/dir=auto/dir="auto"/g' {} \;
```

### 9. NEVER Use Bash for File Creation (INFINITE HANG PREVENTION!)

**Bash + heredoc/echo for files = SESSION FREEZE** (shell waits forever for EOF)

```
❌ FORBIDDEN (Crash pattern from 2025-12-06 - 2 HOUR HANG!):
Bash("cat > file.md << 'EOF'\nContent here\nEOF")
Bash("echo 'content' > file.md")
Bash("printf 'content' > file.md")

→ If heredoc is truncated mid-content, shell waits FOREVER for EOF terminator!
→ Claude Code session stuck "Marinating..." for hours with no recovery!

✅ MANDATORY - Use Write tool:
Write({ file_path: "/path/to/file.md", content: "Content here" })

✅ MANDATORY - Use Edit tool for modifications:
Edit({ file_path: "/path/to/file.md", old_string: "old", new_string: "new" })
```

**Why heredocs are catastrophically dangerous:**
1. **Truncation = infinite wait**: Token limits can cut off EOF terminator
2. **No timeout**: Shell waits forever, bypasses Claude Code's 2-min limit
3. **No recovery**: Session becomes completely unresponsive
4. **Silent failure**: No error message, just endless "Waiting..."

**Tool selection rules:**
| Operation | CORRECT Tool | FORBIDDEN |
|-----------|--------------|-----------|
| Create file | `Write` | `Bash cat/echo/printf >` |
| Edit file | `Edit` | `Bash sed/awk` |
| Append to file | `Read` + `Write` | `Bash echo >>` |
| Create directory | `Bash mkdir -p` | ✅ OK |

**Pre-tool-use hook `bash-file-guard.sh` BLOCKS dangerous Bash file patterns (v0.32.1+).**
This hook automatically blocks: heredoc, echo >, printf >, cat > patterns.

**If session gets stuck ("Marinating..." / "Waiting..."):**
```bash
# 1. Kill Claude Code (Ctrl+C or close terminal)
# 2. Kill zombie shell processes:
pkill -f "cat.*EOF"
pkill -f "bash.*heredoc"
# 3. Clean state:
rm -f .specweave/state/.processor.lock
rm -f .specweave/state/.dedup-cache/*.lock
# 4. Restart Claude Code
```

### 10. Bash Tool - Terminal Operations ONLY

**Bash is for system commands, NOT file manipulation:**

```
✅ ALLOWED Bash operations:
- git commands (status, add, commit, push, diff)
- npm/pnpm/yarn commands (install, build, test)
- Directory operations (mkdir, ls, pwd)
- Process management (ps, kill, pkill)
- Network tools (curl, wget for APIs)
- Build tools (make, cmake, cargo)

❌ FORBIDDEN - Use dedicated tools instead:
- File reading → Read tool
- File writing → Write tool
- File editing → Edit tool
- File searching → Glob tool
- Content searching → Grep tool
- Communication → Direct text output
```

**Mental model**: Bash = "run a program". Write/Edit/Read = "modify files".

### 11. Notifications - MUST Be Non-Alarming AND Non-Blocking (v0.33.4+)

**All notifications are INFORMATIVE only - NEVER alarming!** Every notification MUST:
1. **WHO** sent it (always start with "SpecWeave:")
2. **WHAT** happened (specific action, not vague alert)
3. **ACTION** needed (or "No action needed" if informational)
4. **NEVER trigger alert icon** - no red/warning badges!
5. **NEVER block execution** - fire-and-forget pattern ONLY!

```
❌ FORBIDDEN (alarming):
Title: "🚨 Zombie Cleanup"           ← Emoji overload
Sound: "Basso"                       ← Shows RED ALERT ICON - NEVER USE!
Message: "Cleaned up 5 processes"    ← Too vague

❌ FORBIDDEN (blocking):
execSync(`osascript -e 'display notification...'`)  ← BLOCKS main thread!
await exec(`osascript -e 'display notification...'`)  ← BLOCKS cleanup/exit!

✅ CORRECT (explicit, calm, non-blocking):
Title: "SpecWeave: Cleanup Done"     ← Clear source
Sound: "Pop" or "Submarine"          ← Neutral sounds ONLY
Message: "Cleaned up 5 zombie processes. No action needed."
exec(`osascript...`, (error) => { /* log */ })  ← Fire-and-forget!
```

**CRITICAL: Fire-and-Forget Pattern (v0.33.6+)**

**⛔ NEVER use `execSync()` or `await exec()` for notifications!**
- Notifications MUST be **fire-and-forget** to prevent blocking Claude Code
- macOS `osascript` can take 1-2 seconds → blocks session if awaited
- Use callback-based `exec()` WITHOUT await/Promise wrapping

```typescript
// ❌ WRONG - BLOCKS execution!
execSync(`osascript -e 'display notification...'`);
await exec(`osascript -e 'display notification...'`);

// ✅ CORRECT - Fire-and-forget!
import('child_process').then(cp => {
  cp.exec(`osascript -e 'display notification...'`, (error) => {
    if (error) logger.debug(`Notification failed: ${error.message}`);
  });
});

// Or using require (CommonJS):
const { exec } = require('child_process');
exec(`osascript -e 'display notification...'`, (error) => {
  if (error) logger.debug(`Notification failed: ${error.message}`);
});
```

**Files using notifications MUST follow fire-and-forget pattern:**
- [src/utils/platform-utils.ts](src/utils/platform-utils.ts) (uses dynamic import)
- [src/utils/notification-manager.ts](src/utils/notification-manager.ts) (resolves immediately)
- [src/cli/cleanup-zombies.ts](src/cli/cleanup-zombies.ts) (uses childProcess.exec callback)

**Sound selection rules (macOS only, other OS have no sound param):**
| Sound | When to use |
|-------|-------------|
| `Pop` | Success, completion (neutral) |
| `Glass` | Informational (gentle) |
| `Submarine` | Warning OR error (deep but calm) |

**⛔ NEVER USE "Basso"** - it triggers a RED ALERT ICON in macOS notification center!
SpecWeave notifications are informative, never require immediate action.

**Cross-platform behavior:**
- **macOS**: Uses `osascript` with sound name param (Pop/Glass/Submarine ONLY)
- **Linux**: Uses `notify-send` with `--urgency=normal` (never `critical`)
- **Windows**: Uses PowerShell toast (no urgency levels, always neutral)

**Use notification constants from `src/utils/notification-constants.ts`:**
```typescript
import { getTitleForType, buildNotificationMessage, getSoundForType } from './notification-constants.js';

const title = getTitleForType('cleanup');  // "SpecWeave: Cleanup Done"
const msg = buildNotificationMessage('cleanup', { count: 5 });  // "Cleaned up 5 zombie..."
const sound = getSoundForType('cleanup');  // "Pop" (NEVER returns "Basso")
```

**Code review should verify:**
1. Notification messages follow WHO/WHAT/ACTION pattern
2. All notification calls use fire-and-forget (no await/execSync)
3. macOS notifications use dynamic import or callback pattern

---

## Development Setup

```bash
npm install && npm run rebuild
npm run rebuild && npm test
git add . && git commit -m "feat: feature" && git push origin develop
```

**Marketplace**: `bash scripts/refresh-marketplace.sh` (GitHub mode, always use)
**NPM Release**: `/sw-release:npm`

### No Default Increment on Init (v1.0.27+)

**`specweave init` NO LONGER creates `0001-project-setup` increment automatically!**

**Reason**: Multi-project scenarios REQUIRE `**Project**:` field per User Story, which cannot be determined automatically at init time.

**User workflow (v1.0.27+):**
```bash
npx specweave init .           # Creates structure, no increment
/sw:increment "my-feature"     # User creates increment with proper project context
```

**Old behavior (removed):**
```bash
npx specweave init .           # ❌ Was creating 0001-project-setup with missing **Project**: field!
```

---

## Coding Standards

1. **Logger injection**: ALL `src/` code uses `logger`, NEVER `console.*`
   ```typescript
   import { Logger, consoleLogger } from '../../utils/logger.js';
   constructor(options: { logger?: Logger } = {}) {
     this.logger = options.logger ?? consoleLogger;
   }
   ```
2. **Imports**: ALWAYS `.js` extensions
3. **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
4. **Filesystem**: Native `fs` only (NEVER `fs-extra`)
5. **Code**: Functions < 100 lines, avoid `any`, custom error types

### File Size Limits

**Max 1500 lines/file** (2000+ = crash risk). Check: `wc -l file.ts`
- >1000 lines → extract before adding code
- Split pattern: See ADR-0138 (`init.ts` → `init/` folder)

---

## Folder Structure

**At `.specweave/increments/` root - ONLY**: `####-name/` or `####E-name/` folders, `_archive/`, `README.md`

**Inside increment folders - ONLY at root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `backups/`, `docs/`

### External Increment E-Suffix (v0.32.0+)

**Increments for external items MUST use E suffix** to match FS-XXXE, US-XXXE conventions:

```
✅ CORRECT: 0111E-dora-metrics-fix (external GitHub issue #779)
❌ WRONG:   0111-dora-metrics-fix  (missing E suffix)
```

**When to use E suffix:**
- Increment works on imported GitHub/JIRA/ADO issue
- spec.md has `origin: external` or `external_ref:`
- Feature folder is FS-XXXE (ends with E)

**API (v0.32.0+):**
```typescript
import { IncrementNumberManager } from './core/increment/increment-utils.js';

// For external items:
const id = IncrementNumberManager.generateIncrementId('fix-name', { isExternal: true });
// → "0112E-fix-name"

// Check if external:
IncrementNumberManager.isExternalIncrement('0111E-fix'); // true
```

### CLI Command Structure (ADR-0138)

**Init command** is modular - DO NOT add logic to main file:
```
src/cli/commands/init.ts           ← Orchestrator only (~600 lines)
src/cli/helpers/init/
├── types.ts                       ← Shared interfaces
├── path-utils.ts                  ← findPackageRoot, findSourceDir
├── config-detection.ts            ← detectGitHubRemote/Jira/ADO
├── smart-reinit.ts                ← Re-init prompts (SINGLE source!)
├── plugin-installer.ts            ← Claude plugin installation
├── repository-setup.ts            ← Git provider selection
├── testing-config.ts              ← Test mode prompts
├── external-import.ts             ← Import from external tools
├── directory-structure.ts         ← .specweave/ creation
└── next-steps.ts                  ← Post-init instructions
```
**Rule**: Add new init features to appropriate helper, NOT to init.ts

---

## Key Formats

### Task Format (MANDATORY)
```markdown
### T-001: Task Title
**User Story**: US-001           ← MANDATORY
**Satisfies ACs**: AC-US1-01     ← MANDATORY
**Status**: [x] completed
```

### GitHub Issue Format
**ONLY**: `[FS-XXX][US-YYY] User Story Title`
**PROHIBITED**: `[SP-*]`, `[FS-XXX]` alone, `[undefined][US-XXX]`

### spec.md Format (v0.35.0+)

**Frontmatter** (simplified - NO project/board):
```yaml
---
increment: 0001-feature-name  # REQUIRED
title: "Feature Title"        # REQUIRED
---
```

**Per-User-Story Fields** (MANDATORY):
```markdown
### US-001: Feature Name
**Project**: my-project       # ← MANDATORY (from config.project.name or multiProject.projects)
**Board**: digital-ops        # ← MANDATORY for 2-level structures ONLY
**As a** user, I want...
```

**NOTE**: `feature_id` is derived from increment number (0001 → FS-001), not stored

**How to Determine Structure Level**:
1. Run `specweave context projects`
2. If output has `boardsByProject` → 2-level (include **Board**:)
3. If output has only `projects` → 1-level (NO **Board**:)

### ADR Naming
**Format**: `XXXX-decision-title.md` (4-digit, NO `adr-` prefix)
**Location**: `.specweave/docs/internal/architecture/adr/`

---

## Important Rules

### NO Increment-to-Increment References
**FORBIDDEN**: User stories referencing increments (`increments: [0050-...]`)
**ONLY ALLOWED**: `INCREMENT → FEATURE → USER STORIES` (forward reference only)

### Structured Data Matching
```typescript
// ❌ WRONG: content.includes('FS-039')  // Matches "See FS-039"!
// ✅ CORRECT: Use deriveFeatureId() from src/utils/feature-id-derivation.ts
//    or match folder patterns: /^FS-\d{3,}E?$/
```

### GitHub Duplicates
Use `DuplicateDetector.createWithProtection()`, NEVER `--limit 1` in gh searches

### AC Presence in spec.md
**MANDATORY** - even with external living docs. Use `/sw:embed-acs` if missing.

### Git Provider Abstraction
Use `getPlatformRegistry().getProvider('github')`. NEVER hardcode platform names/endpoints.

---

## Configuration

### Secrets vs Configuration (v0.34.0+ MANDATORY)

**CRITICAL**: Configuration values MUST NOT be in .env. Use config.json via ConfigManager.

**Secrets** (`.env`, gitignored):
- `AZURE_DEVOPS_PAT` - Personal Access Token
- `JIRA_API_TOKEN` - API Token
- `JIRA_EMAIL` - Auth email
- `GH_TOKEN` / `GITHUB_TOKEN` - GitHub token

**Config** (`.specweave/config.json`, committed):
- `issueTracker.domain` - JIRA domain (e.g., "company.atlassian.net")
- `issueTracker.organization_ado` - ADO organization name
- `issueTracker.project` - Project name
- `sync.profiles` - Sync profile configurations

### FORBIDDEN Patterns (Pre-tool-use hook blocks these)
```typescript
// NEVER DO THIS in src/ files:
const domain = process.env.JIRA_DOMAIN;  // VIOLATION!
const org = process.env.AZURE_DEVOPS_ORG;  // VIOLATION!

// ALWAYS DO THIS:
const config = await this.configManager.read();
const domain = config.issueTracker?.domain || '';
const org = config.issueTracker?.organization_ado || '';
```

### Migration from .env to config.json
```bash
# 1. Add to config.json
specweave config set issueTracker.domain "company.atlassian.net"
specweave config set issueTracker.organization_ado "my-org"

# 2. Remove deprecated vars from .env (keep only secrets)
# JIRA_DOMAIN=xxx  # DELETE THIS LINE
# AZURE_DEVOPS_ORG=xxx  # DELETE THIS LINE

# 3. Keep these in .env (secrets):
AZURE_DEVOPS_PAT=xxx
JIRA_API_TOKEN=xxx
JIRA_EMAIL=xxx
```

### ADR Reference
See ADR-0194 for full architecture decision.

---

## Commands

```bash
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:sync-progress          # Full sync (tasks→docs→GitHub/JIRA/ADO)
/sw:validate 0001          # Validate increment
/sw:living-docs            # Launch living docs builder (interactive)
/sw:living-docs --full-scan # Full deep scan (all phases: repos, org, arch, inconsistencies, strategy)
```

---

## Build & Test

```bash
npm run rebuild     # Clean + build (tsc → dist/, esbuild → hooks)
npm test            # Smoke tests
npm run test:all    # All tests (30%+ coverage required)
```

**Plugin validation**: `bash scripts/validation/validate-marketplace-plugins.sh`

---

## Emergency

### Session Stuck ("Marinating..." for hours)

**Cause**: Heredoc command truncated, shell waiting forever for EOF.

```bash
# 1. Force quit Claude Code (Ctrl+C multiple times, or close terminal)

# 2. Kill zombie processes:
pkill -f "cat.*EOF"
pkill -9 -f "bash.*specweave"

# 3. Clean locks:
rm -f .specweave/state/.processor.lock
rm -f .specweave/state/*.lock
rm -rf .specweave/state/.dedup-cache/*.lock

# 4. Restart Claude Code
```

**Prevention**: NEVER use `Bash("cat > file << EOF")` - use `Write` tool instead!

### Marketplace Plugin Desync (v1.0.21+)

**Symptoms**: `/plugin` shows "Plugin 'specweave' not found in marketplace 'specweave'" errors
**Root Cause**: `npm run rebuild` regenerates local `dist/`, but marketplace cache points to GitHub clone

**Quick Fix:**
```bash
# Refresh marketplace from GitHub and reinstall all plugins
bash scripts/refresh-marketplace.sh

# Verify fix
npm test

# Restart Claude Code for changes to take effect
```

**Detection**:
```bash
# Check marketplace last update
cat ~/.claude/plugins/known_marketplaces.json | jq '.specweave.lastUpdated'

# Check installed plugin count (should be 24)
cat ~/.claude/plugins/installed_plugins.json | jq '.plugins | keys | length'
```

**Prevention**:
- Always run `bash scripts/refresh-marketplace.sh` after major changes
- Push changes to develop branch to keep GitHub marketplace in sync
- Use `/specweave-validate-status` command to check sync status

### MCP IDE Connection Drops (v0.32.1+)

**Symptoms**: Session hangs, commands not responding, "Waiting..." forever, UI frozen
**Root Cause**: VSCode MCP server WebSocket connection drops after ~2 seconds

**Detection** (check `~/.claude/debug/latest`):
```
MCP server "ide": WS-IDE connection dropped after 2s uptime
MCP server "ide": Connection error: Received a response for an unknown message ID
```

**Quick Fix:**
```bash
# 1. Restart VS Code Extension Host:
#    Cmd+Shift+P → "Developer: Restart Extension Host"

# 2. Reduce diagnostics payload (close extra tabs/files in VS Code)

# 3. If persists, run Claude Code in plain terminal (not VS Code integrated):
cd /path/to/project && claude

# 4. Run cleanup script:
bash plugins/specweave/scripts/cleanup-state.sh
```

**Prevention:**
- Keep VS Code file count low (large diagnostics payloads cause drops)
- Update Claude Code VS Code extension regularly
- Use terminal mode for long-running sessions

### Zombie Processes (v0.33.0+ AUTO-CLEANUP)

**Status**: ✅ AUTOMATED - No manual intervention needed!

**How it works:**
- SessionStart hook registers all Claude Code sessions
- Heartbeat process monitors parent health every 5s
- Session watchdog cleans up zombies every 60s
- Automatic cleanup within 60s of session termination

**Session Registry**: `.specweave/state/.session-registry.json`

**Logs**:
```bash
# Session tracking logs
cat .specweave/logs/sessions/session-*.log

# Cleanup logs
cat .specweave/logs/cleanup.log

# Heartbeat logs
cat .specweave/logs/heartbeat-*.log
```

**Manual Cleanup (if needed)**:
```bash
# Kill all zombie processes
node dist/src/cli/cleanup-zombies.js 60

# Or use watchdog
bash plugins/specweave/scripts/session-watchdog.sh
```

**Troubleshooting**:
- If zombies persist >5 minutes: Check `.specweave/state/.session-registry.json`
- If cleanup fails: Run `bash plugins/specweave/scripts/cleanup-state.sh`
- For details: See `.specweave/docs/internal/troubleshooting/zombie-processes.md`

### Crash loop / prompt duplication

**Disable hooks FIRST:**
```bash
export SPECWEAVE_DISABLE_HOOKS=1   # In terminal before starting Claude
# OR rename hooks.json:
mv plugins/specweave/hooks/hooks.json plugins/specweave/hooks/hooks.json.bak
```

**Then clean state:**
```bash
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache
npm run rebuild
```

**Recovery docs**: `.specweave/docs/internal/emergency-procedures/`

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| **File ops** | Write/Edit/Read tools ONLY. NEVER Bash heredoc/echo! |
| **Bash guard** | Hook `bash-file-guard.sh` BLOCKS dangerous patterns (v0.32.1+) |
| Skills vs Agents | Skills = auto-activate (keywords), Agents = explicit `Task()` |
| Hook events | PostToolUse, PreToolUse, UserPromptSubmit, Stop, SessionStart/End, etc. |
| Cache location | `.specweave/cache/` (24h TTL) |
| Pre-commit | Blocks 50+ deletions, `rm -rf` on protected dirs |
| Stuck session | Kill + `pkill -f "cat.*EOF"` + clean locks + restart |
| MCP drops | Restart Extension Host OR use terminal mode |

---

## References

**Internal Docs**: `.specweave/docs/internal/`
- `sync-architecture.md` - GitHub sync flow, troubleshooting
- `architecture/adr/` - Decision records (ADR-0032, 0060, 0129, etc.)
- `emergency-procedures/` - Crash recovery guides

**External**: `.github/CONTRIBUTING.md`, https://spec-weave.com
