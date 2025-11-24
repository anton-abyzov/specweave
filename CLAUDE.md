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

### 2. Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work - IMMEDIATELY update both:
TodoWrite([{task: "T-013", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
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

---

## Folder Structure

**At `.specweave/increments/` root - ONLY**: `####-name/` folders, `_archive/`, `README.md`

**Inside increment folders - ONLY at root**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `backups/`, `docs/`

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

```bash
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
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
