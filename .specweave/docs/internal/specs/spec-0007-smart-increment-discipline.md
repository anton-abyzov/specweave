# SPEC-0007: Smart Increment Discipline System

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

**CRITICAL CLARIFICATION (v0.7.0)**: The Iron Rule REMAINS ENFORCED. This spec adds status management (pause/resume/abandon) for handling blocked work WITHIN the sequential discipline, not for bypassing it.

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

### Philosophy: Disciplined Tutor, Not Permissive Freedom

**Core Principle**: SpecWeave acts as your AI tutor enforcing disciplined, sequential development.

**The Iron Rule REMAINS**: Cannot start increment N+1 until increment N is DONE.

**What's New (v0.7.0)**: Better handling of blocked work WITHIN this discipline.

### Natural Build Order

**Example - Building a Dashboard Application**:
1. ✅ **First**: Build basic UI components (buttons, forms, cards, layouts)
2. ✅ **Then**: Build authentication (uses UI components)
3. ✅ **Then**: Build data API (uses auth for security)
4. ✅ **Finally**: Build stats dashboard (uses UI + auth + API)

**Wrong Approach** ❌:
- Starting stats dashboard when UI components don't exist
- Building complex features before foundation is ready
- "Vibe coding" without structure

**SpecWeave enforces this**: You can't build features requiring components that don't exist yet.

### Core Principles

1. **Sequential completion** - Finish N before starting N+1 (ENFORCED)
2. **Natural dependencies** - Foundation → Features → Advanced features
3. **Rich status tracking** - active/paused/completed/abandoned (for blocked work)
4. **Type-based limits** - Hotfix=unlimited, feature=2 max, refactor=1 max
5. **Context-switching warnings** - Show 20-40% productivity cost
6. **Pause for blocked work** - NOT for working on multiple things

---

## Detailed Design

### 1. Status-Based Tracking (For Handling Blocked Work)

Add rich status model while maintaining sequential discipline:

```yaml
statuses:
  active:      # Currently working on (MUST complete before starting new)
  paused:      # Temporarily blocked (waiting for API keys, design, etc.)
  completed:   # All tasks done (can start next increment)
  abandoned:   # Won't finish (requires reason)
```

**IMPORTANT**: Paused status is for BLOCKED work (waiting for external dependencies), NOT for working on multiple things simultaneously.

**Use Cases for Pause**:
- ✅ Waiting for API keys/credentials
- ✅ Waiting for design assets/mockups
- ✅ Waiting for code review/approval
- ✅ Waiting for third-party integration
- ❌ NOT for "working on multiple features at once"

**Benefits**:
- ✅ Clear intent ("why did work stop?")
- ✅ Can start new increment when current is genuinely blocked
- ✅ Visibility into blockers
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

### 4. Enhanced `/specweave:inc` Logic (v0.7.0)

**Iron Rule STILL ENFORCED, but with better context and type-based exceptions**:

```bash
/specweave:inc "0012-add-search" --type=feature

# System response:
❌ Cannot create new increment!

Previous increment 0010-user-profiles is incomplete:
   Status: 60% complete (8/12 tasks done)
   Age: 3 days old
   Type: feature

⚠️  The Iron Rule: Complete increment N before starting N+1

💡 What would you like to do?

1️⃣  Continue with 0010 (/specweave:do) - Recommended
2️⃣  Pause 0010 (if blocked) then create 0012
    /pause 0010 --reason="Waiting for API keys"
3️⃣  Complete 0010 first (check remaining tasks)
    /specweave:progress 0010
4️⃣  Force create (EMERGENCY ONLY - requires justification)
    /specweave:inc "0012-add-search" --force --reason="Production down"

What would you like to do? [1/2/3/4]
```

**Key Principles**:
- ⛔ **Iron Rule enforced** (block, not warning)
- 📊 **Context provided** (completion %, age, type)
- 🎯 **Guidance offered** (best path forward)
- 🚪 **Pause option** (for genuinely blocked work)
- ⚠️  **Force requires reason** (auditable)

### 5. Type-Based Limit Warnings (v0.7.0)

**Type limit exceeded (features)**:
```bash
⚠️  TYPE LIMIT REACHED

You already have 2 active features:
   - 0010-user-profiles (60% done, 3 days old)
   - 0012-add-search (10% done, started today)

💡 Research shows: 2+ concurrent tasks = 20-30% productivity loss

   Recommended: Complete or pause one before starting another feature.

   Type limits:
   ✅ hotfix: unlimited (critical fixes)
   ⚠️  feature: 2 max (you're at limit)
   ✅ refactor: 1 max
   ✅ experiment: unlimited (time-boxed)

   Continue anyway? (not recommended) [y/N]
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

| Scenario | Old (v0.6.0) | New (v0.7.0 - Smart Discipline) |
|----------|----------------|------------------------|
| **Iron Rule** | Complete N before N+1 ✅ | **SAME** - Complete N before N+1 ✅ |
| **Hotfix during feature** | Must use `--force` ❌ | Hotfix type unlimited (bypass limit) ✅ |
| **Blocked work (waiting for API keys)** | Close or `--force` ❌ | Mark "paused", start other work when unblocked ✅ |
| **Scope reduction** | Feels like failure ❌ | Normal part of discovery ✅ |
| **Experiments/spikes** | Same rules as features ❌ | Unlimited (auto-abandon after 14 days) ✅ |
| **Status tracking** | Binary (done/not done) ❌ | Rich (active/paused/completed/abandoned) ✅ |
| **Type-based limits** | All same (generic) ❌ | Different per type (hotfix/feature/refactor) ✅ |
| **Context switching warnings** | None ❌ | Show 20-40% productivity cost ✅ |
| **Parallel work on multiple features** | Prevented ✅ | **SAME** - Prevented (Iron Rule enforced) ✅ |

---

## Success Criteria

### Metric 1: Reduced Force Usage
- **Target**: Less than 5% of increments use `--force` flag
- **Current**: ~30% (estimated, based on bypass frequency)
- **Measure**: Track `--force` usage in analytics

### Metric 2: Improved Completion Rate
- **Target**: 80%+ increments reach "completed" status (not abandoned)
- **Current**: ~60% (many increments left incomplete)
- **Measure**: Completed / (Completed + Abandoned)

### Metric 3: Lower Context Switching
- **Target**: Less than 2 active increments per user on average
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

## Summary: What v0.7.0 Actually Implemented

### The Iron Rule REMAINS

⛔ **You CANNOT start increment N+1 until increment N is DONE** (ENFORCED)

This is NOT negotiable. The enforcement remains to maintain discipline and prevent chaos.

### What Changed in v0.7.0

#### 1. Status Management (For Blocked Work)
- ✅ `/pause <id> --reason="..."` - Pause when genuinely blocked
- ✅ `/resume <id>` - Resume when unblocked
- ✅ `/abandon <id> --reason="..."` - Abandon obsolete work
- ✅ Rich status tracking (active/paused/completed/abandoned)

**Critical**: Pause is for BLOCKED work (waiting for API keys, design approval), NOT for working on multiple features simultaneously.

#### 2. Type-Based Limits
- ✅ **hotfix**: unlimited (critical production fixes)
- ✅ **feature**: max 2 active (standard development)
- ✅ **refactor**: max 1 active (high focus requirement)
- ✅ **bug**: unlimited (SRE investigation)
- ✅ **change-request**: max 2 active (stakeholder requests)
- ✅ **experiment**: unlimited (auto-abandon after 14 days)

#### 3. Context Switching Warnings
- ✅ Show 20-40% productivity cost when at type limits
- ✅ Display active increment status and age
- ✅ Provide guidance on best path forward

#### 4. Natural Build Order Enforcement
- ✅ Foundation → Features → Advanced features
- ✅ UI components → Authentication → Dashboard
- ✅ Can't build stats charts before UI exists

### Philosophy: Disciplined Tutor

**SpecWeave is your AI tutor** enforcing structure and discipline:
- 🎓 Guides you through natural dependency order
- 🎓 Prevents "vibe coding" chaos
- 🎓 Ensures completion before starting new work
- 🎓 Helps you not miss critical steps

**Big increments are OK**: The rule isn't about size - you can have substantial increments. The rule is about **completion**: finish what you start before moving to the next thing.

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
- Increment 0006: LLM-native i18n (demonstrates the problem this spec solves!)

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
