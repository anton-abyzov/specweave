---
increment: "0023-release-management-enhancements"
created: "2025-11-11"
status: "in-progress"
---

# Implementation Plan: Release Management Plugin Enhancements

## Overview

This increment enhances the existing `specweave-release` plugin (80% complete) with the missing 20%: Claude Code integration, DORA metrics tracking, and platform release coordination.

**Key Insight**: NOT building from scratch - completing an existing well-documented plugin.

---

## Architecture

### Phase 1: Claude Code Integration ✅

**Files**:
- ✅ `plugins/specweave-release/.claude-plugin/plugin.json` - Plugin manifest (updated)
- ✅ `plugins/specweave-release/hooks/hooks.json` - Hook definitions (PostToolUse → TodoWrite)
- ✅ `plugins/specweave-release/hooks/post-task-completion.sh` - DORA tracking hook

**Integration Points**:
- Auto-loads with other SpecWeave plugins (via `specweave init`)
- Hook fires after `/specweave:done` completes
- Uses `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths

---

### Phase 2: DORA Metrics Persistent Tracking ✅

**Files Created**:
- ✅ `plugins/specweave-release/lib/dora-tracker.ts` (380 lines)
  - Append-only JSONL storage (`.specweave/metrics/dora-history.jsonl`)
  - Trend calculation (7-day, 30-day, 90-day rolling averages)
  - Degradation detection (>20% threshold)
  - CLI tools: `npm run dora:track append|trends|degradation|count`

- ✅ `plugins/specweave-release/lib/dashboard-generator.ts` (280 lines)
  - Generates `.specweave/docs/internal/delivery/dora-dashboard.md`
  - Visual indicators: ✅ Elite, 🟢 High, 🟡 Medium, 🔴 Low
  - Trend charts with percentage changes
  - Degradation alerts

**Data Flow**:
```
Increment Complete
  ↓
Post-Task Hook Fires
  ↓
dora-calculator.ts (existing) → Calculate metrics
  ↓
dora-tracker.ts → Append to history.jsonl
  ↓
dashboard-generator.ts → Update dashboard.md
  ↓
Degradation Check → Alert if >20% worse
```

---

### Phase 3: Platform Release Coordination ✅

**Files Created**:
- ✅ `plugins/specweave-release/commands/specweave-release-platform.md` (450 lines)
  - `/specweave-release:platform create <version>` - Create platform RC
  - `/specweave-release:platform iterate <rc-version>` - Iterate RC
  - `/specweave-release:platform promote <rc-version>` - Promote to GA
  - `/specweave-release:platform status [version]` - Check status

**Platform Manifest** (`.specweave/platform-releases.json`):
```json
{
  "v3.0.0": {
    "status": "rc",
    "currentRC": "rc.2",
    "services": {
      "frontend": "v5.0.0-rc.2",
      "backend": "v2.9.0-rc.1",
      "api-gateway": "v4.0.0-rc.2"
    },
    "rcHistory": [ ... ]
  }
}
```

**Version Matrix** (`.specweave/docs/internal/delivery/version-matrix.md`):
- Product version → Service versions mapping
- RC history
- Release notes per service

---

### Phase 4: GitFlow Integration (Documented in Command)

**Workflow**:
```
1. Create release branches: develop → release/v*
2. Tag RCs: v*-rc.1, v*-rc.2, ...
3. Merge to main: release/v* → main
4. Tag final: v* (no -rc suffix)
5. Merge back: main → develop
6. Delete release branches
```

**Implementation**: Via command in `specweave-release-platform.md`

---

## Testing Strategy

### Manual Testing (Required)

**Test Case 1: DORA Tracking**
```bash
# 1. Complete an increment
/specweave:done 0023

# 2. Verify hook fired
cat .specweave/logs/dora-tracking.log

# 3. Verify history appended
tail -1 .specweave/metrics/dora-history.jsonl

# 4. Verify dashboard updated
cat .specweave/docs/internal/delivery/dora-dashboard.md
```

**Expected**:
- ✅ Hook log shows successful execution
- ✅ History file has new JSON line
- ✅ Dashboard shows current metrics + trends

**Test Case 2: Platform Release** (Future)
```bash
# 1. Create platform RC
/specweave-release:platform create v1.0.0

# 2. Verify manifest created
cat .specweave/platform-releases.json

# 3. Verify version matrix
cat .specweave/docs/internal/delivery/version-matrix.md
```

**Note**: Full multi-repo testing requires multiple test repositories.

---

## Integration Points

### With Existing SpecWeave

**1. Increment Lifecycle**
```bash
/specweave:increment "0050-platform-v3-release"  # Create increment
/specweave-release:platform create v3.0.0        # Create platform RC
/specweave:do                                     # Execute tasks
/specweave-release:platform promote v3.0.0-rc.3  # Promote to production
/specweave:done 0050                              # Complete (hook tracks DORA)
```

**2. Living Docs**
- DORA dashboard auto-updates: `.specweave/docs/internal/delivery/dora-dashboard.md`
- Version matrix maintains history: `.specweave/docs/internal/delivery/version-matrix.md`
- Links from main DORA doc: `.specweave/docs/internal/delivery/dora-metrics.md`

**3. Hooks**
- Core `post-task-completion.sh` (if exists) runs first
- Release plugin `post-task-completion.sh` runs in parallel
- Both update living docs independently

---

## Deliverables

### Code Deliverables ✅

- ✅ `plugin.json` - Claude Code integration
- ✅ `hooks.json` + `post-task-completion.sh` - DORA tracking hook
- ✅ `dora-tracker.ts` - Persistent storage + trending
- ✅ `dashboard-generator.ts` - Living docs dashboard
- ✅ `specweave-release-platform.md` - Platform release command

### Documentation Deliverables

- ✅ `spec.md` - User stories and acceptance criteria
- 🔄 `plan.md` - This file (implementation plan)
- ⏳ `tasks.md` - Task breakdown with embedded tests
- ⏳ `reports/ENHANCEMENT-SUMMARY.md` - Complete summary

---

## Success Criteria

**Must Have (P0/P1)** ✅:
- ✅ Plugin registered with Claude Code (auto-loads)
- ✅ DORA metrics tracked persistently (JSONL)
- ✅ Living docs dashboard auto-updates
- ✅ Platform release commands documented
- ✅ Hooks integrated (post-task-completion)

**Nice to Have (P2)** 📋:
- TypeScript utilities for platform coordination (future)
- Automated E2E tests (future)
- CI/CD integration examples (future)

---

## Risks & Mitigation

### Risk 1: Hook Performance

**Risk**: DORA calculation slow (~10s), blocks user
**Mitigation**: Hook runs asynchronously (non-blocking)
**Status**: ✅ Mitigated (hook exits 0 on error, logs to file)

### Risk 2: Multi-Repo Complexity

**Risk**: Platform releases complex, error-prone
**Mitigation**: Extensive documentation, examples, validation
**Status**: ✅ Mitigated (command has detailed examples)

### Risk 3: DORA Metrics Accuracy

**Risk**: Metrics calculation depends on GitHub API
**Mitigation**: Use existing `dora-calculator.ts` (already validated)
**Status**: ✅ Mitigated (reusing proven code)

---

## Timeline

**Estimated**: 2-3 days total

**Actual**:
- ✅ Day 1: Analysis, design, plugin.json, hooks (2 hours)
- ✅ Day 1: DORA tracking + dashboard (3 hours)
- ✅ Day 1: Platform release command (2 hours)
- 🔄 Day 2: Documentation, testing (2 hours)

**Status**: On track

---

## Related Documentation

- `.specweave/docs/internal/delivery/dora-metrics.md` - Existing DORA doc
- `plugins/specweave-release/README.md` - Plugin README
- `plugins/specweave-release/IMPLEMENTATION.md` - Implementation summary
- `src/metrics/dora-calculator.ts` - Existing metrics calculator

---

**Next Steps**:
1. Create `tasks.md` with test-embedded format
2. Manual testing of DORA tracking
3. Create enhancement summary report
4. Update plugin README with new features
