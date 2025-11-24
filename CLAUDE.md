# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## CRITICAL SAFETY RULES

### Context Management (CRASH PREVENTION!)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/specweave:pause XXXX → edit → /specweave:resume XXXX
# OR close completed increments: /specweave:done XXXX
```

### Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work:
TodoWrite([{task: "T-013", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

### Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`
**NEVER run**: `specweave init . --force`

---

## Development Setup

```bash
npm install && npm run rebuild
npm run rebuild && npm test
git add . && git commit -m "feat: feature" && git push origin develop
```

**Marketplace**: `bash scripts/refresh-marketplace.sh` (GitHub mode)
**NPM Release**: `/specweave-release:npm`

---

## Coding Standards

1. NEVER `console.*` in `src/` (use logger injection)
2. ALWAYS `.js` extensions in imports
3. Test files: `.test.ts`, use `vi.fn()`, `os.tmpdir()`
4. Native `fs` only (NEVER `fs-extra`)
5. Functions < 100 lines, avoid `any`

---

## Folder Structure

**Increment root - ONLY**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `backups/`

---

## Commands

```bash
/specweave:increment "feature"  # Plan
/specweave:do                   # Execute
/specweave:done 0002            # Close (validates)
/specweave:progress             # Status
/specweave:sync-progress        # Full sync (tasks→docs→GitHub)
```

---

## Build & Test

```bash
npm run rebuild     # Full build
npm test            # Smoke tests
npm run test:all    # All tests (80%+ coverage required)
```

---

## Key Rules

| Rule | Details |
|------|---------|
| GitHub Issues | `[FS-XXX][US-YYY] Title` format only |
| Task Format | Must have `**User Story**: US-XXX` and `**Satisfies ACs**: AC-*` |
| ADR Naming | `XXXX-decision-title.md` in `.specweave/docs/internal/architecture/adr/` |
| AC in spec.md | MANDATORY - use `/specweave:embed-acs` if missing |
| Skills vs Agents | Skills = auto-activate, Agents = explicit `Task()` |

---

## Emergency

```bash
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
npm run rebuild
```

---

## References

**Internal Docs**: `.specweave/docs/internal/`
- `architecture/adr/` - Decision records
- `emergency-procedures/` - Crash recovery
- `sync-architecture.md` - GitHub sync details

**External**: `.github/CONTRIBUTING.md`, https://spec-weave.com
