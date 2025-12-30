---
id: US-002
feature: FS-148
title: Auto Mode as Default in /sw:increment
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 952
    url: https://github.com/anton-abyzov/specweave/issues/952
---

# US-002: Auto Mode as Default in /sw:increment

## User Story

**As a** developer, I want `/sw:increment` to automatically analyze project complexity, split into multiple increments when needed, set dependencies, and start execution by default, so that I can describe my project once and let SpecWeave handle the rest.

## Background

Auto mode is the DEFAULT. Users opt-OUT with `--manual` flag, not opt-in.

## Acceptance Criteria

- [ ] **AC-US2-01**: Update `plugins/specweave/commands/increment.md` to enable auto-execution by default
- [ ] **AC-US2-02**: Analyze project description for complexity (count features, estimate tasks)
- [ ] **AC-US2-03**: If estimated tasks > 25 OR features > 4, trigger multi-increment splitting
- [ ] **AC-US2-04**: Present split plan to user with dependency graph before creating
- [ ] **AC-US2-05**: Auto-detect dependencies based on feature relationships (auth is foundation, etc.)
- [ ] **AC-US2-06**: Create all increments with proper `dependencies: []` field in spec.md
- [ ] **AC-US2-07**: After creation, immediately start auto session on first increment in queue
- [ ] **AC-US2-08**: Display cost estimate and human gates before starting
- [ ] **AC-US2-09**: `--manual` flag skips auto-execution (creates increment but waits)
- [ ] **AC-US2-10**: `--dry-run` shows split plan without creating anything

## Technical Notes

### Complexity Thresholds

| Complexity | Task Count | Features | Action |
|------------|-----------|----------|--------|
| Small | <10 | 1-2 | Single increment |
| Medium | 10-25 | 3-5 | Single increment (sweet spot) |
| Large | 26+ | 6+ | Split into multiple |

### Split Algorithm

```typescript
function analyzeAndSplit(description: string) {
  const features = extractFeatures(description);
  const estimatedTasks = features.reduce((sum, f) => sum + estimateTasks(f), 0);

  if (estimatedTasks > 25 || features.length > 4) {
    return createSplitPlan(features);
  }
  return createSingleIncrement(features);
}
```

### Dependency Detection

Common patterns automatically linked:
- Auth → Foundation for user-facing features
- Database → Foundation for data-dependent features
- Shared/Utils → Foundation for all
