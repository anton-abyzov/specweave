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

### 1b. Max 8 Tasks Per Increment (HARD LIMIT!)

**>8 tasks = context explosion = CRASH**

```bash
# Check task count before starting work:
grep -c "^### T-" .specweave/increments/*/tasks.md

# If >8 tasks: SPLIT the increment
# Pattern: Feature → Increment-Part1 (T-001 to T-004) + Increment-Part2 (T-005 to T-008)
```

**Splitting large features:**
```
0045-auth-system/        → 0045-auth-system-core/ (T-001 to T-004)
                         → 0046-auth-system-ui/   (T-005 to T-008)
                         → 0047-auth-system-tests/ (T-009 to T-012)
```

**Token budget per increment**: ~50k tokens max (tasks + spec + plan + context)

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

### 2c. spec.md MUST Have project: (and board: for 2-level) (v0.31.0+)

**Increment creation WITHOUT project context = SYNC FAILURE**

```yaml
# 1-level structure (single project or multi-project):
---
increment: 0001-feature-name
project: my-project          # ← MANDATORY
---

# 2-level structure (ADO area paths, JIRA boards):
---
increment: 0001-feature-name
project: acme-corp           # ← MANDATORY
board: digital-operations    # ← MANDATORY for 2-level
---
```

**Detection**: Use `src/utils/structure-level-detector.ts`:
```typescript
import { detectStructureLevel } from './utils/structure-level-detector.js';
const config = detectStructureLevel(projectRoot);
// config.level === 1 → project required
// config.level === 2 → project AND board required
```

**VALIDATION RULES:**
```
❌ FORBIDDEN: Creating spec.md with project: {{PROJECT_ID}} (unresolved placeholder)
❌ FORBIDDEN: Creating spec.md for 2-level without board: field
❌ FORBIDDEN: Vague increments without knowing sync target
✅ REQUIRED: Always select project (and board for 2-level) BEFORE generating spec.md
```

**Pre-tool-use hook `spec-project-validator.sh` BLOCKS spec.md without required fields (2-level).**

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
| Skills vs Agents | Skills = auto-activate (keywords), Agents = explicit `Task()` |
| Hook events | PostToolUse, PreToolUse, UserPromptSubmit, Stop, SessionStart/End, etc. |
| Cache location | `.specweave/cache/` (24h TTL) |
| Pre-commit | Blocks 50+ deletions, `rm -rf` on protected dirs |
| Stuck session | Kill + `pkill -f "cat.*EOF"` + clean locks + restart |

---

## References

**Internal Docs**: `.specweave/docs/internal/`
- `sync-architecture.md` - GitHub sync flow, troubleshooting
- `architecture/adr/` - Decision records (ADR-0032, 0060, 0129, etc.)
- `emergency-procedures/` - Crash recovery guides

**External**: `.github/CONTRIBUTING.md`, https://spec-weave.com
