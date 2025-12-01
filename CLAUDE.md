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

**At `.specweave/increments/` root - ONLY**: `####-name/` folders, `_archive/`, `README.md`

**Inside increment folders - ONLY at root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `backups/`, `docs/`

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
feature_id: FS-001            # OPTIONAL
---
```

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
// ✅ CORRECT: content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m)
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

**Plugin validation**: `bash scripts/validate-marketplace-plugins.sh`

---

## Emergency

**Crash loop / prompt duplication? Disable hooks FIRST:**
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
| Skills vs Agents | Skills = auto-activate (keywords), Agents = explicit `Task()` |
| Hook events | PostToolUse, PreToolUse, UserPromptSubmit, Stop, SessionStart/End, etc. |
| Cache location | `.specweave/cache/` (24h TTL) |
| Pre-commit | Blocks 50+ deletions, `rm -rf` on protected dirs |

---

## References

**Internal Docs**: `.specweave/docs/internal/`
- `sync-architecture.md` - GitHub sync flow, troubleshooting
- `architecture/adr/` - Decision records (ADR-0032, 0060, 0129, etc.)
- `emergency-procedures/` - Crash recovery guides

**External**: `.github/CONTRIBUTING.md`, https://spec-weave.com
