# Documentation Update Summary
**Date**: 2026-01-04
**Version**: 1.0.93
**Topic**: Instant Commands Fix Documentation

---

## Overview

Comprehensive documentation updates following the resolution of a 3-4 week bug affecting instant commands (`/sw:jobs`, `/sw:status`, `/sw:progress`, `/sw:workflow`, `/sw:costs`, `/sw:analytics`) in both CLI and VSCode environments.

---

## Files Updated

### 1. CLAUDE.md (User-Facing Instructions)

**Location**: [CLAUDE.md](../../CLAUDE.md)

**Changes**:

#### Troubleshooting Section (Lines 272-292)
- Added 3 new troubleshooting entries:
  - `/sw:jobs`, `/sw:status`, `/sw:progress` not working → VSCode: Restart Claude Code | CLI: Update to latest
  - Instant commands showing "blocked by hook" → Restart Claude Code or update to v1.0.91+
  - Jobs command showing incomplete output → Update to v1.0.93+
- Updated section version from `1.0.90` to `1.0.93`

#### Auto Mode Section (Lines 414-428)
- Added **Main Flags** documentation:
  - `--build`: Run build after every task
  - `--e2e`: Run E2E tests after every task
  - `--tests`: Run unit tests after every task
- Added example: `/sw:auto --build --e2e`
- Changed from `/sw:do` to `/sw:auto` for clarity

**Impact**: End users now have clear guidance on fixing instant command issues and using auto mode flags.

---

### 2. ADR-0223: VSCode Hook Detection Pattern

**Location**: [.specweave/docs/internal/architecture/adr/0223-vscode-hook-detection-pattern.md](.specweave/docs/internal/architecture/adr/0223-vscode-hook-detection-pattern.md)

**Type**: New architecture decision record

**Content**:
- **Problem**: Dual root causes (double-parsing + VSCode blocking)
- **Decision**: Environment detection via `CLAUDE_CODE_ENTRYPOINT`
- **Implementation**: Conditional hook behavior (approve in VSCode, block in CLI)
- **Consequences**: Universal compatibility, performance preservation
- **Verification**: CLI timing tests, VSCode output validation

**Impact**: Permanent architectural documentation of the fix approach for future reference.

---

### 3. Hook Documentation

**Location**: [.specweave/docs/internal/repos/hooks/overview.md](.specweave/docs/internal/repos/hooks/overview.md)

**Changes** (Lines 49-50):
- Added **VSCode Detection Pattern** (v1.0.91+) observation:
  - Hooks detect VSCode via `CLAUDE_CODE_ENTRYPOINT=claude-vscode`
  - Return `{"decision":"approve"}` in VSCode for fallback
- Added instant commands execution note:
  - Hook-based in CLI (<100ms)
  - Command-based fallback in VSCode

**Impact**: Contributors understand the dual execution path architecture.

---

### 4. CLI Documentation

**Location**: [.specweave/docs/internal/repos/cli/overview.md](.specweave/docs/internal/repos/cli/overview.md)

**Changes**:

#### Patterns Section (Line 39)
- Added **Direct Function Invocation Pattern** (architecture)
- Description: Avoids Commander.js double-parsing antipattern

#### Observations Section (Lines 68-69)
- Added **Direct Function Invocation Pattern** observation (v1.0.91+):
  - CLI commands export executable functions
  - Called directly from `bin/specweave.js`
  - Avoids "too many arguments" errors
- Added **Instant Commands** note:
  - Hook-based execution in CLI (<100ms)
  - Command file fallback in VSCode

**Impact**: Contributors have clear architectural pattern to follow for new CLI commands.

---

### 5. Troubleshooting Guide

**Location**: [.specweave/docs/internal/troubleshooting/instant-commands-not-working.md](.specweave/docs/internal/troubleshooting/instant-commands-not-working.md)

**Type**: New comprehensive troubleshooting document

**Sections**:
1. **Problem History**: Detailed explanation of both root causes
2. **Quick Fix Steps**: User and contributor fix procedures
3. **Version History**: v1.0.91, v1.0.92, v1.0.93 changes
4. **How Instant Commands Work**: CLI vs VSCode execution paths
5. **Testing Verification**: CLI and VSCode test procedures
6. **Technical Details**: Files modified, environment variables, hook decisions
7. **Related Documentation**: Links to ADRs and overviews
8. **Prevention**: Guidelines to prevent similar issues

**Impact**: Complete reference for troubleshooting instant command issues, including historical context and prevention strategies.

---

### 6. CHANGELOG.md

**Location**: [CHANGELOG.md](../../CHANGELOG.md)

**Changes** (Lines 17-25):
- Added **Documentation** section to v1.0.93 release notes
- Listed all 6 documentation updates with links:
  - CLAUDE.md troubleshooting section
  - Auto mode flags documentation
  - ADR-0223
  - Hooks overview
  - CLI overview
  - Instant commands troubleshooting guide

**Impact**: Users reviewing changelog can find all related documentation in one place.

---

## Documentation Coverage Matrix

| Audience | Document | Coverage |
|----------|----------|----------|
| **End Users** | CLAUDE.md | Quick fixes, troubleshooting, auto mode usage |
| **Contributors** | ADR-0223 | Architectural decision rationale |
| **Contributors** | hooks/overview.md | Hook system behavior |
| **Contributors** | cli/overview.md | CLI patterns and antipatterns |
| **Both** | troubleshooting/instant-commands-not-working.md | Complete fix history and prevention |
| **Both** | CHANGELOG.md | Version history and documentation index |

---

## Key Concepts Documented

### 1. VSCode Hook Detection Pattern
- Environment variable: `CLAUDE_CODE_ENTRYPOINT=claude-vscode`
- Conditional hook decisions: `approve` vs `block`
- Dual execution paths: CLI (fast) vs VSCode (fallback)

### 2. Direct Function Invocation Pattern
- Export command functions: `export async function jobsCommand(options) {}`
- Direct calls from bin: `await jobsCommand(options)`
- Avoids Commander.js double-parsing antipattern

### 3. Instant Commands Architecture
- 6 affected commands: jobs, status, progress, workflow, costs, analytics
- CLI execution: hook → bash script → <100ms
- VSCode execution: hook approves → command.md → CLI fallback

### 4. Auto Mode Flags
- `--build`: Run build verification
- `--e2e`: Run end-to-end tests
- `--tests`: Run unit tests
- Can be combined: `/sw:auto --build --e2e`

---

## Links and Cross-References

### Internal References
- ADR-0223 → hooks/overview.md (implementation details)
- ADR-0223 → cli/overview.md (CLI patterns)
- troubleshooting guide → ADR-0223 (architectural rationale)
- troubleshooting guide → CLAUDE.md (user guidance)
- CHANGELOG.md → all 6 documents

### External References
- CLAUDE.md → spec-weave.com
- ADR-0223 → GitHub issues
- Troubleshooting guide → GitHub repo

---

## Verification Checklist

- ✅ User-facing documentation updated (CLAUDE.md)
- ✅ Architectural decision recorded (ADR-0223)
- ✅ Hook system documented (hooks/overview.md)
- ✅ CLI patterns documented (cli/overview.md)
- ✅ Troubleshooting guide created
- ✅ CHANGELOG updated with doc links
- ✅ Cross-references verified
- ✅ Version numbers consistent (1.0.93)
- ✅ All links tested

---

## Next Steps

1. **Commit Documentation**:
   ```bash
   git add CLAUDE.md CHANGELOG.md .specweave/docs/
   git commit -m "docs: comprehensive instant commands fix documentation"
   git push origin develop
   ```

2. **User Communication**:
   - Update README.md if needed
   - Post release notes
   - Update website documentation

3. **Prevention**:
   - Reference these docs when adding new instant commands
   - Follow Direct Function Invocation Pattern
   - Test in both CLI and VSCode before release

---

## Impact Assessment

### Immediate Benefits
- Users have clear troubleshooting path
- Contributors understand architectural patterns
- Future instant commands will follow established patterns

### Long-Term Benefits
- Reduced support burden (self-service troubleshooting)
- Architectural consistency (documented patterns)
- Prevention of similar issues (historical context)

### Metrics
- **Documentation Files Created**: 2 (ADR-0223, troubleshooting guide)
- **Documentation Files Updated**: 4 (CLAUDE.md, hooks/overview.md, cli/overview.md, CHANGELOG.md)
- **New Sections Added**: 6 (troubleshooting entries, auto flags, patterns, observations)
- **Total Lines Added**: ~400 lines of documentation

---

## Conclusion

This documentation update provides comprehensive coverage of the instant commands fix across all user types (end users and contributors) and document types (user guides, architecture decisions, and troubleshooting references). The documentation is cross-referenced, version-tracked, and designed to prevent similar issues in the future.
