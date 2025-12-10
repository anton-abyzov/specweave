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
/specweave:pause XXXX → edit → /specweave:resume XXXX
# OR close completed increments: /specweave:done XXXX
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
2. /specweave:done <id> → validates ACs + asks for user confirmation
3. Only then → status becomes "completed" with approvedAt timestamp
```

**Pre-tool-use hook `completion-guard.sh` BLOCKS direct completion edits.**

If you need to implement closure, use:
```typescript
MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);
// Only succeeds if current status is "ready_for_review"
```

### 2c. spec.md MUST Have project: (and board: for 2-level) - RESOLVED VALUES ONLY! (v0.34.0+)

**Increment creation WITHOUT resolved project context = SYNC FAILURE**

**⛔ YOU MUST RUN `specweave context projects` BEFORE GENERATING spec.md!**

```bash
# MANDATORY FIRST STEP - run this BEFORE generating any spec.md:
specweave context projects

# Parse the JSON output:
# 1-level: {"level": 1, "projects": [{"id": "frontend-app"}, {"id": "backend-api"}]}
# 2-level: {"level": 2, "projects": [...], "boardsByProject": {"project-id": [{"id": "board-1"}]}}

# USE the actual IDs from the output - NEVER use placeholders!
```

```yaml
# 1-level structure (RESOLVED values only):
---
increment: 0001-feature-name
project: frontend-app        # ← RESOLVED from context API (NOT {{PROJECT_ID}})
---

# 2-level structure (BOTH RESOLVED):
---
increment: 0001-feature-name
project: acme-corp           # ← RESOLVED from projects[].id
board: digital-operations    # ← RESOLVED from boardsByProject[project][].id
---
```

**Per-US Project/Board (v0.34.0+ MANDATORY):**
```markdown
### US-001: Login Form
**Project**: frontend-app     # ← RESOLVED value, not placeholder!
**Board**: ui-team            # ← RESOLVED value (2-level only)
```

**VALIDATION RULES (ENFORCED BY HOOK):**
```
❌ FORBIDDEN: Generating spec.md WITHOUT running "specweave context projects" first
❌ FORBIDDEN: Using {{PROJECT_ID}}, {{BOARD_ID}}, {{RESOLVED_PROJECT}} placeholders
❌ FORBIDDEN: Inventing project/board names not in the API response
❌ FORBIDDEN: User stories without **Project**: field
❌ FORBIDDEN: User stories in 2-level without **Board**: field
✅ REQUIRED: Run "specweave context projects" and parse output BEFORE generating
✅ REQUIRED: Each US has **Project**: with RESOLVED value from API
✅ REQUIRED: Each US (2-level) has **Board**: with RESOLVED value from API
```

**Pre-tool-use hook `spec-project-validator.sh` BLOCKS:**
- spec.md with `{{...}}` placeholders
- spec.md without `project:` field
- spec.md (2-level) without `board:` field
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

**Where `{project}` comes from:**
1. spec.md YAML frontmatter `project:` field (MANDATORY)
2. Example: `project: specweave` → `.specweave/docs/internal/specs/specweave/FS-116/`

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

### 2f. NEVER Create Duplicate Increment IDs (v0.33.0+)

**Increment numbers MUST be unique across ALL directories!**

```
❌ FORBIDDEN (Bug pattern from 2025-12-07):
0121-ado-jira-feature-parity-p2-p3/  ← exists
0121-intelligent-living-docs-content/ ← DUPLICATE!

❌ ALSO FORBIDDEN (0001 and 0001E share SAME base number):
0001-internal-feature/
0001E-external-fix/  ← COLLISION! Same base number!
```

**VALIDATION RULES:**
```
✅ ALWAYS use IncrementNumberManager.generateUniqueIncrementId()
✅ ALWAYS use IncrementNumberManager.validateUnique() before creating
✅ Check ALL directories: active, _archive, _abandoned, _paused
```

**API (v0.33.0+):**
```typescript
import { IncrementNumberManager } from './core/increment/increment-utils.js';

// Safe generation with validation:
const id = IncrementNumberManager.generateUniqueIncrementId('feature-name');
// → "0122-feature-name" (guaranteed unique)

// Manual validation:
IncrementNumberManager.validateUnique('0121-new-name'); // throws if duplicate!

// Find duplicates:
IncrementNumberManager.findDuplicates('0121');
// → ["0121-ado-jira-feature (active)", "0121-intelligent-living-docs (active)"]
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

### 11. macOS Notifications - MUST Be Explicit (v0.33.3+)

**Vague notifications = user confusion!** Every notification MUST clearly state:
1. **WHO** sent it (always start with "SpecWeave:")
2. **WHAT** happened (specific action, not vague alert)
3. **ACTION** needed (or "No action needed" if informational)

```
❌ FORBIDDEN (vague, alarming):
Title: "🚨 Zombie Cleanup"           ← What does this mean?!
Sound: "Basso" (error sound)         ← Red alert icon, scary!
Message: "Cleaned up 5 processes"    ← So what?

✅ CORRECT (explicit, calm):
Title: "SpecWeave: Cleanup Done"     ← Clear source
Sound: "Pop" (neutral)               ← Not alarming
Message: "Cleaned up 5 zombie processes. No action needed."
```

**Sound selection rules:**
| Sound | When to use |
|-------|-------------|
| `Pop` | Success, completion (neutral) |
| `Glass` | Informational (gentle) |
| `Submarine` | Warning (not critical) |
| `Basso` | ONLY critical errors requiring immediate action |

**Use notification constants from `src/utils/notification-constants.ts`:**
```typescript
import { getTitleForType, buildNotificationMessage, getSoundForType } from './notification-constants.js';

const title = getTitleForType('cleanup');  // "SpecWeave: Cleanup Done"
const msg = buildNotificationMessage('cleanup', { count: 5 });  // "Cleaned up 5 zombie..."
const sound = getSoundForType('cleanup');  // "Pop"
```

**Pre-commit hook validates notification messages in new code (v0.33.3+).**

---

## Development Setup

```bash
npm install && npm run rebuild
npm run rebuild && npm test
git add . && git commit -m "feat: feature" && git push origin develop
```

**Marketplace**: `bash scripts/refresh-marketplace.sh` (GitHub mode, always use)
**NPM Release**: `/specweave-release:npm`

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

### YAML Frontmatter (spec.md)
```yaml
---
increment: 0001-feature-name  # REQUIRED
project: my-project           # REQUIRED (v0.31.0+)
board: digital-operations     # REQUIRED for 2-level structures
---
```
**NOTE**: `feature_id` is derived from increment number (0001 → FS-001), not stored

**Structure Level Detection**:
- 1-level: `project:` REQUIRED
- 2-level (ADO area paths, JIRA boards): `project:` AND `board:` REQUIRED

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
**MANDATORY** - even with external living docs. Use `/specweave:embed-acs` if missing.

### Git Provider Abstraction
Use `getPlatformRegistry().getProvider('github')`. NEVER hardcode platform names/endpoints.

---

## Configuration

**Secrets** (`.env`, gitignored): Tokens, PATs, emails
**Config** (`.specweave/config.json`, committed): Domains, strategies, sync settings

---

## Commands

```bash
/specweave:increment "feature"  # Plan new increment
/specweave:do                   # Execute tasks
/specweave:done 0002            # Close (validates gates)
/specweave:progress             # Show status
/specweave:sync-progress        # Full sync (tasks→docs→GitHub/JIRA/ADO)
/specweave:validate 0001        # Validate increment
```

---

## Build & Test

```bash
npm run rebuild     # Clean + build (tsc → dist/, esbuild → hooks)
npm test            # Smoke tests
npm run test:all    # All tests (80%+ coverage required)
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
