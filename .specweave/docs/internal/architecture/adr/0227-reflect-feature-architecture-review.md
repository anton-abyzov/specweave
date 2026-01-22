# ADR-0227: Reflect Feature Architecture Review

**Date**: 2026-01-10
**Status**: Superseded
**Superseded By**: Reflect v2.0 Simplification (2026-01-22)
**Author**: Architecture Review
**Category**: Self-Improving AI

> **Note (2026-01-22)**: This ADR documents the original complex architecture. It has been superseded by the Reflect v2.0 simplification which:
> - Uses CLAUDE.md as single source of truth (no more `.specweave/memory/*.md` files)
> - Always uses LLM for extraction (no quick signal check)
> - Organizes learnings under "## Skill Memories" section in CLAUDE.md
> - Reduces ~900 lines of code to ~150 lines
> - See `src/core/reflection/reflect-handler.ts` for the new implementation.

## Context

This document provides a comprehensive architectural review of the SpecWeave Reflect feature - a self-improving AI system that learns from user corrections and patterns across sessions. The review was conducted from a user perspective, simulating the journey from `specweave init` to active usage.

## Executive Summary

The Reflect feature is a **well-designed** system with solid fundamentals:
- Clean separation between skill-specific and category-based memory
- Cross-platform support (Claude Code vs project-local)
- Smart deduplication with 6 strategies
- Marketplace update preservation
- Auto-reflection enabled by default since v1.0.96

However, several **gaps and issues** were identified that impact user experience and reliability.

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     REFLECT SYSTEM ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐    ┌──────────────┐ │
│  │   CLI Layer    │     │   Hook Layer   │    │  Skill Layer │ │
│  │                │     │                │    │              │ │
│  │ /sw:reflect    │     │ stop-reflect   │    │ SKILL.md     │ │
│  │ /sw:reflect-on │     │ .sh (async)    │    │ MEMORY.md    │ │
│  │ /sw:reflect-off│     │                │    │              │ │
│  │ /sw:reflect-   │     │ process-       │    │ (per-skill)  │ │
│  │    status      │     │ reflect-queue  │    │              │ │
│  └───────┬────────┘     │ .sh            │    └──────────────┘ │
│          │              └───────┬────────┘                      │
│          ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   CORE REFLECTION ENGINE                     ││
│  │                                                              ││
│  │  src/core/reflection/                                        ││
│  │  ├── skill-reflection-manager.ts  (orchestration)           ││
│  │  ├── skill-memory-paths.ts        (path resolution)         ││
│  │  └── skill-memory-merger.ts       (memory I/O)              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     STORAGE LAYER                            ││
│  │                                                              ││
│  │  Claude Code:                                                ││
│  │    ~/.claude/plugins/marketplaces/specweave/                 ││
│  │    ├── plugins/specweave/skills/{skill}/MEMORY.md           ││
│  │    └── memory/{category}.md  (global categories)            ││
│  │                                                              ││
│  │  Project-Local:                                              ││
│  │    .specweave/                                               ││
│  │    ├── plugins/specweave/skills/{skill}/MEMORY.md           ││
│  │    └── memory/{category}.md  (project categories)           ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Correction
      │
      ▼
┌─────────────────┐
│ Signal Detection │ ← CORRECTION_PATTERNS / RULE_PATTERNS
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  is_actionable? │ ← SKIP_PATTERNS (filters noise)
└────────┬────────┘
         │ YES
         ▼
┌─────────────────┐
│  extract_rule() │ ← Priority-based extraction
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Skill Detection (v4.1)  │
│  1. Explicit skill name │ ← "the detector skill..."
│  2. Keyword matching    │ ← SKILL_KEYWORDS map
│  3. Category fallback   │ ← CATEGORY_KEYWORDS map
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│    Deduplication        │
│  - Same ID              │
│  - Exact match          │
│  - Substring match      │
│  - Core phrase          │
│  - Keyword overlap 50%+ │
└────────┬────────────────┘
         │ NOT DUPLICATE
         ▼
┌─────────────────┐
│  Write MEMORY.md │
└─────────────────┘
```

---

## IDENTIFIED GAPS AND ISSUES

### CRITICAL GAPS

#### GAP-001: Memory Directory Not Created on Init
**Severity**: HIGH
**Impact**: Category-based learnings fail silently

**Current Behavior**:
```
specweave init → Creates .specweave/state/reflect-config.json
                  Does NOT create .specweave/memory/
```

**Evidence**:
```bash
$ ls -la /tmp/test-project/.specweave/memory/
ls: cannot access: No such file or directory
```

**Impact**: When a user makes a correction that doesn't match any skill (e.g., general project conventions), the learning is supposed to go to `.specweave/memory/general.md`. But the directory doesn't exist, so either:
1. It's created on first write (works but inconsistent)
2. The write fails silently

**Recommendation**: Create `.specweave/memory/` during init alongside `state/`.

---

#### GAP-002: Skill Memory Files Not Distributed to User Projects
**Severity**: HIGH
**Impact**: Skills have no MEMORY.md in user projects

**Current Behavior**:
```
Claude Code: ~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/{skill}/MEMORY.md ✅
Project-local: .specweave/plugins/ NOT CREATED ❌
```

**Issue**: For non-Claude Code environments, the `.specweave/plugins/specweave/skills/` directory is never created. This means:
- `skill-memory-paths.ts` correctly falls back to project-local path
- But the path doesn't exist
- Skill-based routing always fails and falls back to category

**Recommendation**:
1. Either copy skills to project during init
2. Or use Claude marketplace as primary source always
3. Or create empty MEMORY.md stubs in expected location

---

#### GAP-003: Global Memory Directory Path Inconsistency
**Severity**: MEDIUM → **RESOLVED**
**Impact**: Learnings may be written to unexpected location

**Documentation previously said**: `~/.specweave/memory/`
**Code creates**: `~/.claude/plugins/marketplaces/specweave/memory/` (Claude Code)
                  `.specweave/memory/` (project-local)

**Resolution**: Documentation updated to reflect correct paths. Migration command (`specweave migrate-memory`) handles legacy paths automatically. Init now detects legacy files and prompts for migration.

---

#### GAP-004: Hook Integration Not Fully Wired
**Severity**: HIGH
**Impact**: Auto-reflection may not trigger

**Current State**:
- `stop-reflect.sh` exists and queues reflections
- `process-reflect-queue.sh` exists for async processing
- But hook registration in Claude Code requires manual verification

**Evidence**: The hook depends on:
1. Claude Code's hook system recognizing `stop-reflect.sh`
2. Proper `hooks.json` configuration
3. User having jq installed

**Potential Failure Modes**:
- jq not installed → silent failure
- Hook not registered in Claude Code → never runs
- Transcript path incorrect → no signals detected

---

### MODERATE GAPS

#### GAP-005: No Learning Verification UI
**Severity**: MEDIUM
**Impact**: Users don't know if reflections are working

**Current State**:
- `/sw:reflect-status` shows stats
- But no way to verify a specific learning was captured
- No way to see what triggers a learning would match

**Recommendation**: Add `--verbose` flag to show exactly what was detected and why.

---

#### GAP-006: JSONL Transcript Format Fragile
**Severity**: MEDIUM
**Impact**: Claude Code transcript format changes break reflection

**Code** (in `stop-reflect.sh:80-87`):
```bash
jq -r 'select(.message.role == "user") | .message.content[]? | select(.text) | .text'
```

**Risk**: If Claude Code changes transcript format, this jq query silently fails.

**Recommendation**: Add format version detection and graceful fallback.

---

#### GAP-007: No Rate Limiting for Learnings
**Severity**: LOW
**Impact**: Aggressive users could pollute memory

**Current State**:
- `maxLearningsPerSession: 10` is configurable
- `MAX_RULES_PER_CATEGORY: 30` is enforced
- But no rate limiting per day/week

**Recommendation**: Add temporal rate limiting to prevent memory pollution.

---

#### GAP-008: Skill Detection False Positives
**Severity**: MEDIUM
**Impact**: Learnings routed to wrong skill

**Code** (in `skill-reflection-manager.ts:120-145`):
```typescript
const explicitPatterns = [
    /(?:the\s+)?([a-z][-a-z0-9]*)\s+skill/gi,
    ...
];
```

**Risk**: Matches like "that skill" or common words could route incorrectly.

**Evidence**: The code has guards (`skillName.length > 2`, not in common words), but edge cases exist.

---

### MINOR GAPS

#### GAP-009: Missing Migration Documentation for End Users
**Severity**: LOW
**Impact**: Users with legacy memory files may not know to migrate

**Current State**:
- `specweave migrate-memory` CLI exists
- But not mentioned in `/sw:reflect-status` output
- Not auto-detected during init

**Recommendation**: Check for legacy files during init and prompt user.

---

#### GAP-010: Test Coverage for Edge Cases
**Severity**: LOW
**Impact**: Edge cases may not be handled

**Tests exist but missing**:
- JSONL transcript parsing failure scenarios
- Cross-platform path edge cases (Windows drive letters)
- Concurrent write scenarios
- Very long learning content truncation

---

## USER JOURNEY ANALYSIS

### Happy Path: User Does Init

```
1. specweave init .
   ✅ Creates .specweave/state/reflect-config.json with autoReflect: true
   ✅ Shows "Auto-reflection enabled (self-improving AI)"
   ❌ Does NOT create .specweave/memory/
   ❌ Does NOT create .specweave/plugins/specweave/skills/

2. User works in Claude Code
   ✅ Skills loaded from ~/.claude/plugins/marketplaces/specweave/...
   ✅ MEMORY.md files exist in Claude marketplace location

3. User makes correction: "No, use Button component, not custom HTML"
   ✅ Session ends, stop-reflect.sh triggered (if hooks wired)
   ✅ Signal detected with CORRECTION_PATTERNS
   ✅ Skill detected: frontend (contains 'button', 'component')
   ✅ Learning written to ~/.claude/.../skills/frontend/MEMORY.md

4. User runs /sw:reflect-status
   ✅ Shows configuration
   ⚠️ May show "No learnings" if memory directory structure differs
```

### Problematic Path: Non-Claude Environment

```
1. User works in different AI tool (not Claude Code)
   ❌ No marketplace installation
   ❌ isClaudeCodeEnvironment() returns false

2. Code falls back to project-local:
   .specweave/plugins/specweave/skills/
   ❌ This directory doesn't exist

3. skill-memory-paths.ts resolves paths correctly
   ❌ But the directories don't exist

4. All skill routing fails → falls back to category
   ⚠️ Category memory works IF .specweave/memory/ exists
```

---

## RECOMMENDATIONS

### Priority 1: Critical Fixes

1. **Create memory directories during init**
   ```typescript
   // In directory-structure.ts, add:
   fs.mkdirSync(path.join(targetDir, '.specweave', 'memory'), { recursive: true });
   ```

2. **Verify hook registration**
   - Add `specweave check-hooks --reflect` command
   - Verify Claude Code hook integration

3. **Document actual memory paths**
   - Update SKILL.md documentation
   - Update CLAUDE.md reflect section

### Priority 2: Important Improvements

4. **Add learning verification**
   ```bash
   /sw:reflect --dry-run --verbose
   # Shows: "Detected 3 signals → frontend(2), backend(1)"
   ```

5. **Add migration check during init**
   ```typescript
   if (hasLegacyMemoryFiles()) {
     console.log('Legacy memory files detected. Run: specweave migrate-memory');
   }
   ```

6. **Improve error handling for JSONL parsing**
   - Try/catch around jq calls
   - Log format detection for debugging

### Priority 3: Nice-to-Have

7. **Add temporal rate limiting**
8. **Improve skill detection accuracy**
9. **Add Windows-specific path tests**

---

## CONCLUSION

The Reflect feature has a **solid architectural foundation**:
- Clear separation of concerns (paths, merger, manager)
- Smart deduplication
- Skill-specific and category fallback routing
- Marketplace update preservation

However, **user experience gaps** exist:
- Directory structure incomplete after init
- Non-Claude environments have reduced functionality
- Hook integration verification missing
- Documentation/code path inconsistencies

**Recommended Priority**: Fix GAP-001 and GAP-004 first, as they have the highest user impact.

---

## APPENDIX: File Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/core/reflection/skill-reflection-manager.ts` | Main orchestration | ✅ Solid |
| `src/core/reflection/skill-memory-paths.ts` | Path resolution | ✅ Solid |
| `src/core/reflection/skill-memory-merger.ts` | Memory I/O | ✅ Solid |
| `plugins/specweave/hooks/stop-reflect.sh` | Auto-reflection hook | ⚠️ Needs verification |
| `plugins/specweave/scripts/reflect.sh` | Manual reflection | ✅ Solid |
| `src/cli/helpers/init/directory-structure.ts` | Init structure | ⚠️ Missing memory dir |
| `plugins/specweave/commands/reflect*.md` | Command docs | ✅ Good |
| `plugins/specweave/skills/reflect/SKILL.md` | Feature docs | ✅ Comprehensive |

---

## Changelog

- **2026-01-10**: Initial architecture review completed
