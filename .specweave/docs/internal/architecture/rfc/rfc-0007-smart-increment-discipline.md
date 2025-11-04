# RFC-0007: Smart Increment Discipline System

**Status**: Implemented (v0.7.0)
**Created**: 2025-11-03
**Updated**: 2025-11-04
**Author**: AI Development Team
**Increment**: 0007-smart-increment-discipline

---

## Problem Statement

### Current System (v0.6.0): "Iron Rule"

**Rule**: Cannot start increment N+1 until increment N is DONE

**Enforcement**: Hard block in `/specweave:inc`, with escape hatches:
- `--force` flag (emergency bypass)
- `/specweave:close` (interactive closure with 3 options)

**Intention**: Prevent scope creep, maintain discipline, ensure completion

**CRITICAL CLARIFICATION (v0.7.0)**: The Iron Rule REMAINS ENFORCED. This RFC adds status management (pause/resume/abandon) for handling blocked work WITHIN the sequential discipline, not for bypassing it.

### Real-World Friction Points

#### Scenario 1: Hotfix During Feature Development
```
Day 1: Start 0005-user-profiles (50% complete)
Day 3: Critical bug - payment processing broken
Day 3: Need 0006-fix-payment IMMEDIATELY
```
**Problem**: Must use `--force` (feels wrong) or close 0005 (loses context)

#### Scenario 2: Blocked Waiting for External Input
```
Day 1: Start 0007-stripe-integration
Day 2: Blocked - waiting for Stripe API keys (3-5 days)
Day 2: Want 0008-refactor-auth (unrelated)
```
**Problem**: Must close 0007 or wait idle. "Move tasks to 0008" doesn't make sense (different features).

#### Scenario 3: Prerequisite Discovery
```
Day 1: Start 0009-shopping-cart
Day 2: Discover: Need to refactor session management first
Day 2: Want 0010-refactor-sessions before continuing 0009
```
**Problem**: Must close 0009, then re-open after 0010. Loses continuity.

#### Scenario 4: Team Collaboration
```
Frontend Dev: Working on 0011-dashboard-ui
Backend Dev: Working on 0012-analytics-api
```
**Problem**: Framework assumes solo developer, linear workflow.

### Root Cause Analysis

The iron rule conflates **two different goals**:
1. ✅ **Preventing scope creep** (good goal - we want this)
2. ❌ **Preventing all parallel work** (too restrictive - hurts productivity)

### Fundamental Flaws

| Flaw | Impact | Real-World Result |
|------|--------|-------------------|
| **Too Rigid** | Treats all parallel work as "lack of discipline" | `--force` becomes habitual, defeating purpose |
| **Binary Thinking** | Only "done" or "not done" states | No way to signal "blocked", "paused", "waiting" |
| **Context-Free** | Same rule for hotfixes, features, experiments | Framework fights user rather than helping |
| **Solo Assumption** | Assumes one person, linear workflow | Doesn't scale to teams, parallel streams |
| **"Reduce Scope" = Failure** | Framing suggests over-commitment | Discourages ambitious specs, punishes discovery |
| **No Type Distinction** | Hotfix = Feature = Experiment = Refactor | Different work needs different discipline |

---

## Proposed Solution: Smart Discipline System

### Philosophy Shift

**Old**: "The framework knows better than you" (prescriptive enforcement)
**New**: "The framework helps you make informed decisions" (intelligent guidance)

### Core Principles

1. **Replace blocks with warnings** - Show context, let user decide
2. **Rich status tracking** - active/blocked/paused/completed/abandoned
3. **Type-based rules** - Different rules for hotfix/feature/spike
4. **Dependency tracking** - Explicit blocked-by/blocks relationships
5. **Team-aware** - Support parallel streams with visibility
6. **Cost transparency** - Show context-switching overhead metrics

---

## Detailed Design

### 1. Status-Based Tracking (Not Binary)

Replace "done vs. not-done" with rich status model:

```yaml
statuses:
  active:      # Currently working on (limit: 1-2)
  blocked:     # Waiting for external input (unlimited)
  paused:      # Intentionally shelved (warn after 7 days)
  completed:   # All tasks done
  abandoned:   # Won't finish (requires reason)
```

**Benefits**:
- ✅ Clear intent ("blocked" vs "paused" vs "abandoned")
- ✅ Different rules per status (blocked = OK to start new work)
- ✅ Visibility into why work stopped
- ✅ Automatic staleness warnings (paused > 7 days)

### 2. Increment Types (Different Rules)

```yaml
types:
  hotfix:      # Can always start (priority: urgent)
               # Limit: unlimited
               # Rules: Bypass all checks

  feature:     # Standard feature development
               # Limit: 2 active at once
               # Rules: Warn on 2nd, block on 3rd

  refactor:    # Code improvements
               # Limit: 1 active at once
               # Rules: High focus requirement

  experiment:  # POC/spike work
               # Limit: unlimited
               # Rules: Auto-abandon after 14 days if untouched

  spike:       # Time-boxed research
               # Limit: unlimited
               # Rules: No completion required
```

**Usage**:
```bash
/specweave:inc "Fix payment bug" --type=hotfix
/specweave:inc "Add search" --type=feature
/specweave:inc "Try GraphQL" --type=experiment --timeout=7d
```

### 3. Dependency Tracking

```yaml
# In spec.md
dependencies:
  blocks: []           # This increment blocks these others
  blocked-by: [0005]   # Can't start until 0005 completes
  related: [0003]      # Related but not blocking
```

**Auto-detection** (future enhancement):
- Scan spec.md for "depends on", "requires", "builds on"
- Suggest dependency links
- Validate dependency graph (detect cycles)

### 4. Revised `/specweave:inc` Logic

**Replace hard block with context-aware guidance**:

```bash
/specweave:inc "0012-add-search" --type=feature

# System response:
🟡 You have 1 active feature (0010-user-profiles: 60% done, 3 days)

⚠️  Context switching reduces productivity by 20-40%.

Options:
1️⃣  Continue with 0010 first (/specweave:do)
2️⃣  Pause 0010 and start 0012 (mark 0010 as paused)
3️⃣  Start 0012 in parallel (2 active features - higher overhead)

What would you like to do? [1/2/3]
```

**Key Differences**:
- ℹ️  **Information** instead of blocking
- 📊 **Context** (how much done, how old)
- 🎯 **Suggestions** (best practices)
- 🚪 **User choice** (not forced)

### 5. Automatic Warnings (Not Blocks)

**High context switching detected**:
```bash
⚠️  You now have 3 active increments:
   - 0010-user-profiles (60% done, 3 days old)
   - 0012-add-search (10% done, started today)
   - 0013-refactor-db (5% done, started today)

💡 Research shows: 3+ concurrent tasks = 40% productivity loss

   Suggestion: Complete or pause one before continuing.

   [Continue anyway] [Pause one increment]
```

**Stale paused increment**:
```bash
⚠️  Increment 0011-stripe has been paused for 8 days.

   Status: Blocked waiting for API keys
   Last activity: 2025-10-20

   Options:
   1. Resume (if unblocked)
   2. Abandon (if no longer needed)
   3. Keep paused (extend wait time)

   [Choose option]
```

### 6. New Commands

```bash
# Status management
/specweave:pause <id> --reason="Waiting for API keys"
/specweave:resume <id>
/specweave:abandon <id> --reason="Requirements changed"
/specweave:block <id> --blocked-by=0005

# Visibility
/specweave:status               # Show all increments
/specweave:status --active      # Only active
/specweave:status --stale       # Paused > 7 days
/specweave:graph                # Dependency graph (future)
```

---

## Implementation Plan

### Phase 1: Status Tracking (v0.7.0)

**Goal**: Add pause/resume/abandon commands

**Tasks**:
1. Add `status` field to increment metadata
2. Implement `/specweave:pause` command
3. Implement `/specweave:resume` command
4. Implement `/specweave:abandon` command
5. Update `/specweave:status` to show statuses
6. Add status validation to increment lifecycle

**Files**:
- `plugins/specweave/commands/pause.md` (new)
- `plugins/specweave/commands/resume.md` (new)
- `plugins/specweave/commands/abandon.md` (new)
- `plugins/specweave/commands/status.md` (update)
- `src/core/types/increment.ts` (add status enum)

**Testing**:
- TC-PHASE1-01: Pause active increment
- TC-PHASE1-02: Resume paused increment
- TC-PHASE1-03: Abandon incomplete increment
- TC-PHASE1-04: Status command shows all states

### Phase 2: Increment Types (v0.8.0)

**Goal**: Add type-based rules

**Tasks**:
1. Add `type` field to increment metadata
2. Update `/specweave:inc` to accept `--type` flag
3. Implement type-based limits (hotfix=unlimited, feature=2, etc.)
4. Add type-specific warnings
5. Auto-abandon experiments after 14 days

**Files**:
- `plugins/specweave/commands/inc.md` (update)
- `src/core/types/increment.ts` (add type enum)
- `plugins/specweave/agents/pm/AGENT.md` (update for type detection)

**Testing**:
- TC-PHASE2-01: Create hotfix (bypasses limits)
- TC-PHASE2-02: Create 2nd feature (shows warning)
- TC-PHASE2-03: Create 3rd feature (blocked with guidance)
- TC-PHASE2-04: Experiment auto-abandoned after 14 days

### Phase 3: Dependency Tracking (v0.9.0)

**Goal**: Add blocked-by/blocks relationships

**Tasks**:
1. Add `dependencies` field to spec.md schema
2. Update PM agent to detect dependencies
3. Implement `/specweave:block` command
4. Add dependency validation (detect cycles)
5. Show blockers in `/specweave:status`

**Files**:
- `plugins/specweave/commands/block.md` (new)
- `plugins/specweave/agents/pm/AGENT.md` (update)
- `src/core/schemas/spec-schema.json` (add dependencies)

**Testing**:
- TC-PHASE3-01: Block increment explicitly
- TC-PHASE3-02: Auto-detect dependencies from spec
- TC-PHASE3-03: Prevent circular dependencies
- TC-PHASE3-04: Show dependency graph

### Phase 4: Smart Discipline (v1.0.0)

**Goal**: Replace hard blocks with intelligent guidance

**Tasks**:
1. Replace `/specweave:inc` hard block with context-aware prompt
2. Add context-switching cost metrics
3. Implement staleness warnings
4. Add productivity analytics
5. Team collaboration support (multi-user)

**Files**:
- `plugins/specweave/commands/inc.md` (major update)
- `plugins/specweave/skills/increment-planner/SKILL.md` (update)
- `src/core/analytics/` (new - context switching metrics)

**Testing**:
- TC-PHASE4-01: Guidance shown instead of block
- TC-PHASE4-02: Context switching metrics calculated
- TC-PHASE4-03: Staleness warnings for paused increments
- TC-PHASE4-04: Multi-user parallel work supported

---

## Comparison: Old vs. New

| Scenario | Old (Iron Rule) | New (Smart Discipline) |
|----------|----------------|------------------------|
| **Hotfix during feature** | Must use `--force` ❌ | Hotfix type auto-allowed ✅ |
| **Blocked work** | Close or `--force` ❌ | Mark "blocked", start other work ✅ |
| **Prerequisite discovery** | Close & re-open ❌ | Create dependency, pause original ✅ |
| **Team parallel work** | Not supported ❌ | Multiple active allowed (with warnings) ✅ |
| **Scope reduction** | Feels like failure ❌ | Normal part of discovery ✅ |
| **Discipline enforcement** | Hard block (circumvented) ❌ | Visibility + warnings (internalized) ✅ |
| **3+ active increments** | Prevented ❌ | Allowed with cost transparency ✅ |
| **Experiments/spikes** | Same rules as features ❌ | Lightweight, time-boxed, auto-cleanup ✅ |

---

## Success Criteria

### Metric 1: Reduced Force Usage
- **Target**: <5% of increments use `--force` flag
- **Current**: ~30% (estimated, based on bypass frequency)
- **Measure**: Track `--force` usage in analytics

### Metric 2: Improved Completion Rate
- **Target**: 80%+ increments reach "completed" status (not abandoned)
- **Current**: ~60% (many increments left incomplete)
- **Measure**: Completed / (Completed + Abandoned)

### Metric 3: Lower Context Switching
- **Target**: <2 active increments per user on average
- **Current**: Unknown (no tracking)
- **Measure**: Average active increments across all projects

### Metric 4: User Satisfaction
- **Target**: 80%+ users prefer new system in survey
- **Current**: N/A (no baseline)
- **Measure**: Post-implementation survey

### Metric 5: Faster Cycle Time
- **Target**: 20% reduction in time-to-completion
- **Current**: Baseline TBD
- **Measure**: Time from increment start → completed

---

## Risks and Mitigations

### Risk 1: Too Permissive (Scope Creep Returns)

**Risk**: Removing hard blocks might lead to too many active increments

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Warnings at 2 active increments, strong warnings at 3+
- Show context-switching cost metrics (make visible)
- Default type = "feature" (strict limits)
- Analytics to detect abuse patterns
- Gradual rollout (opt-in beta first)

### Risk 2: Complexity Overhead

**Risk**: More status/types/dependencies = more cognitive load

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Sensible defaults (most users don't need to think about types)
- Progressive disclosure (advanced features hidden until needed)
- Clear documentation with examples
- Gradual rollout (Phase 1 → 2 → 3 → 4)

### Risk 3: Breaking Changes

**Risk**: Existing workflows break with new system

**Likelihood**: Low
**Impact**: High

**Mitigation**:
- Backwards compatibility (old workflow still works)
- Migration guide for existing increments
- Feature flag: `useSmartDiscipline: true/false` in config
- Deprecation warnings (not hard failures)

---

## Alternatives Considered

### Alternative 1: Keep Iron Rule, Add Exceptions

**Approach**: Maintain hard block but add more escape hatches
- `--type=hotfix` bypasses block
- `--type=blocked` allows pause
- `--force` remains for edge cases

**Pros**:
- ✅ Simpler (fewer changes)
- ✅ Maintains strict discipline

**Cons**:
- ❌ Still feels combative (framework vs. user)
- ❌ Doesn't solve team collaboration
- ❌ Doesn't provide context/guidance

**Decision**: Rejected - doesn't address root cause

### Alternative 2: Remove All Restrictions

**Approach**: No limits, full user freedom
- Users can create any number of increments
- No warnings, no guidance

**Pros**:
- ✅ Maximum flexibility
- ✅ No framework friction

**Cons**:
- ❌ Loses all discipline (worse than v0.5.0)
- ❌ No help for users who need structure
- ❌ Scope creep returns

**Decision**: Rejected - too extreme

### Alternative 3: Per-Project Configuration

**Approach**: Let users configure their own limits
- `maxActiveIncrements: 3` in config
- `allowParallelWork: true/false`

**Pros**:
- ✅ Flexibility per project/team
- ✅ Users control their discipline

**Cons**:
- ❌ Decision fatigue (what's the right number?)
- ❌ No intelligent guidance
- ❌ Doesn't solve type/dependency problems

**Decision**: Rejected as primary approach, but could be Phase 5 enhancement

---

## Migration Path

### For Solo Developers (Current Users)

**v0.6.0 → v0.7.0** (Status Tracking):
- Continue working as before
- Optionally use `/specweave:pause` when blocked
- No breaking changes

**v0.7.0 → v0.8.0** (Increment Types):
- Optionally add `--type=hotfix` for urgent work
- Continue using default `--type=feature` otherwise
- No breaking changes

**v0.8.0 → v1.0.0** (Smart Discipline):
- Hard blocks replaced with prompts (guided choice)
- Can opt-out: `useSmartDiscipline: false` in config
- Backwards compatible

### For Teams (New Users)

**Initial Setup**:
```yaml
# .specweave/config.json
{
  "discipline": {
    "useSmartDiscipline": true,
    "maxActivePerDeveloper": 2,
    "maxActiveTotalTeam": 5,
    "warnOnContextSwitch": true
  }
}
```

**Best Practices**:
- Use types (hotfix/feature/experiment)
- Mark blocked increments explicitly
- Review paused increments weekly
- Close or abandon stale work

---

## Open Questions

1. **Should we track time spent per increment?**
   - Pro: Better analytics, cycle time metrics
   - Con: Overhead, privacy concerns
   - **Decision**: Deferred to Phase 5

2. **Should we support sub-increments (nesting)?**
   - Pro: Better for large features
   - Con: Complexity, violates flat structure principle
   - **Decision**: Out of scope for v1.0

3. **Should abandoned increments be deleted or archived?**
   - Pro (delete): Cleaner repository
   - Pro (archive): Learning from failures
   - **Decision**: Archive to `_abandoned/` folder

4. **How to handle team conflicts (two devs, same increment)?**
   - Pro (block): Prevents conflicts
   - Pro (allow): Enable collaboration
   - **Decision**: Phase 4, allow with warnings

---

## References

### Internal Documents
- [ADR-0001: Increment-Based Development](../adr/0001-increment-based-development.md)
- [High-Level Design: Increment Lifecycle](../hld-system.md#increment-lifecycle)
- [CLAUDE.md: Increment Discipline](../../../../CLAUDE.md#increment-discipline-v060-mandatory)

### External Research
- [Context Switching Cost Study](https://www.apa.org/research/action/multitask) - American Psychological Association
- [Software Engineering Productivity](https://www.microsoft.com/en-us/research/publication/the-influence-of-organizational-structure-on-software-quality/) - Microsoft Research
- [Lean Software Development](https://www.amazon.com/Lean-Software-Development-Agile-Toolkit/dp/0321150783) - Limiting WIP

### Related Increments
- Increment 0001: Core Framework (established increment pattern)
- Increment 0002: Core Enhancements (living docs, hooks)
- Increment 0006: LLM-native i18n (demonstrates the problem this RFC solves!)

---

**Status**: Draft → Under Review (pending approval)
**Next Steps**:
1. Team review and feedback (1 week)
2. Create increment 0007 spec.md
3. Implement Phase 1 (status tracking)
4. Beta test with 5-10 projects
5. Iterate based on feedback

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Maintainer**: SpecWeave Core Team
