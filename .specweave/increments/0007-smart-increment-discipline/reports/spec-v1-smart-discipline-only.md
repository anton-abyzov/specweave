# Specification: Smart Increment Discipline System

**Increment**: 0007-smart-increment-discipline
**Title**: Replace Iron Rule with Intelligent Guidance for Increment Management
**Priority**: P0 (Critical - Affects core workflow)
**Status**: Draft
**Created**: 2025-11-03
**Author**: AI Development Team
**RFC**: [RFC-0007](../../docs/internal/architecture/rfc/rfc-0007-smart-increment-discipline.md)

---

## Executive Summary

Replace SpecWeave's rigid "iron rule" (cannot start increment N+1 until N is done) with an intelligent discipline system that:
- ✅ **Maintains focus** via warnings and cost transparency (not hard blocks)
- ✅ **Handles real-world scenarios** (hotfixes, blocked work, team collaboration)
- ✅ **Provides guidance** instead of fighting the user
- ✅ **Scales from solo to team** workflows

**Key Innovation**: Shift from **prescriptive enforcement** ("You can't do this") to **intelligent coaching** ("Here's the cost of context switching - what do you want to do?")

**Impact**:
- 📈 **Better UX**: Framework feels helpful, not combative
- 🎯 **Same discipline**: Warnings + visibility maintain focus
- 🚀 **Higher productivity**: Handle hotfixes/blockers without `--force` hacks
- 👥 **Team-ready**: Support parallel work with visibility

---

## Problem Statement

### The Iron Rule (v0.6.0)

**Current Behavior**:
```bash
/specweave:inc "0007-new-feature"

❌ Cannot create new increment!

Previous increments are incomplete:
- 0006-llm-native-i18n (50% complete)

Close 0006 first or use --force
```

**Intention**: Prevent scope creep, ensure completion

### Real-World Friction

**Scenario 1: Hotfix** (production down!)
```
Working on: 0006-i18n (50% done)
Emergency: Payment processing broken
Need: Immediate hotfix (0007-fix-payment)
Problem: Must use --force (feels wrong) or abandon i18n work
```

**Scenario 2: Blocked** (waiting for external input)
```
Working on: 0007-stripe-integration
Blocked: Waiting for Stripe API keys (3-5 days)
Want: Start 0008-refactor-auth (unrelated)
Problem: Must close 0007 or wait idle
```

**Scenario 3: Prerequisite Discovery** (this RFC's origin!)
```
Working on: 0006-llm-native-i18n (in progress)
Discovered: Need better increment management first
Want: Start 0007-smart-discipline (prerequisite)
Problem: i18n and discipline are unrelated - why close one to start the other?
```

**Scenario 4: Team Collaboration**
```
Frontend: Working on 0010-dashboard-ui
Backend: Working on 0011-analytics-api
Problem: Framework assumes solo developer
```

### Root Cause

The iron rule conflates:
1. ✅ **Preventing scope creep** (good)
2. ❌ **Preventing all parallel work** (too restrictive)

**Result**: `--force` becomes habitual → discipline lost anyway

---

## User Stories

### US-001: Hotfix Bypasses Limits

**As** a developer with production bug
**I want** to create hotfix increment immediately
**So that** I can fix critical issues without closing feature work

**Acceptance Criteria**:
- ✅ `--type=hotfix` bypasses all active increment limits
- ✅ Hotfix increments clearly marked in `/specweave:status`
- ✅ Warning shown if hotfix remains active >3 days
- ✅ Can have unlimited hotfixes in parallel

**Test Case**: TC-001

---

### US-002: Pause Blocked Work

**As** a developer blocked by external dependency
**I want** to pause current increment
**So that** I can start unrelated work without losing context

**Acceptance Criteria**:
- ✅ `/specweave:pause 0007 --reason="Waiting for API keys"` marks as paused
- ✅ Paused increments don't count toward active limit
- ✅ `/specweave:resume 0007` returns to active state
- ✅ Warning if paused >7 days (staleness check)

**Test Case**: TC-002

---

### US-003: Abandon Obsolete Work

**As** a developer with changed requirements
**I want** to abandon incomplete increment
**So that** I can close work that's no longer needed

**Acceptance Criteria**:
- ✅ `/specweave:abandon 0008 --reason="Requirements changed"` marks as abandoned
- ✅ Abandoned increments moved to `_abandoned/` folder
- ✅ Reason documented in metadata
- ✅ Can be un-abandoned if needed (rare)

**Test Case**: TC-003

---

### US-004: Context Switching Warning

**As** a developer starting 2nd feature
**I want** to see productivity cost warning
**So that** I can make informed decision

**Acceptance Criteria**:
- ✅ Starting 2nd feature shows context switching cost (20-40%)
- ✅ Clear options: Continue current, Pause current, Start parallel
- ✅ User choice saved (not blocked)
- ✅ Analytics track context switching frequency

**Test Case**: TC-004

---

### US-005: Increment Types

**As** a developer
**I want** to specify increment type
**So that** framework applies appropriate rules

**Acceptance Criteria**:
- ✅ `/specweave:inc "title" --type=hotfix|feature|refactor|experiment|spike`
- ✅ Default type = "feature" (if omitted)
- ✅ Type shown in `/specweave:status`
- ✅ Different limits per type (hotfix=unlimited, feature=2, refactor=1)

**Test Case**: TC-005

---

### US-006: Dependency Tracking

**As** a developer discovering prerequisites
**I want** to link increments with dependencies
**So that** framework understands blocked-by relationships

**Acceptance Criteria**:
- ✅ `/specweave:block 0009 --blocked-by=0007` creates dependency
- ✅ Dependencies shown in `/specweave:status`
- ✅ Cannot mark blocker as complete if dependents are blocked
- ✅ Circular dependency detection (error if cycle)

**Test Case**: TC-006

---

### US-007: Team Parallel Work

**As** a team with multiple developers
**I want** to see who's working on what
**So that** we can coordinate without conflicts

**Acceptance Criteria**:
- ✅ `/specweave:status` shows assignee for each increment
- ✅ Warning if two developers start same increment
- ✅ Team-level limits (e.g., max 5 active across all devs)
- ✅ Per-developer limits (max 2 active per person)

**Test Case**: TC-007 (Phase 4)

---

### US-008: Stale Increment Warnings

**As** a project maintainer
**I want** automatic warnings for stale work
**So that** abandoned increments don't pile up

**Acceptance Criteria**:
- ✅ Paused >7 days → warning in `/specweave:status`
- ✅ Active >30 days → warning (long-running feature)
- ✅ Experiment >14 days → auto-abandon
- ✅ Option to extend timeout or close

**Test Case**: TC-008

---

## Technical Requirements

### TR-001: Increment Status Model

**Requirement**: Extend increment metadata with rich status

**Current** (v0.6.0):
```yaml
# Binary: "done" or "not done"
tasks:
  - [ ] Task 1
  - [x] Task 2
```

**New** (v0.7.0+):
```yaml
# .specweave/increments/0007/metadata.json
{
  "id": "0007-smart-increment-discipline",
  "status": "active",  # active | blocked | paused | completed | abandoned
  "type": "feature",   # hotfix | feature | refactor | experiment | spike
  "assignee": "developer-name",
  "created": "2025-11-03T10:00:00Z",
  "lastActivity": "2025-11-03T15:30:00Z",
  "dependencies": {
    "blockedBy": [],
    "blocks": [],
    "related": ["0006"]
  },
  "pausedReason": null,
  "abandonedReason": null
}
```

**Files**:
- `src/core/types/increment.ts` (update IncrementMetadata type)
- `src/core/types/increment-status.ts` (new enum)
- `src/core/types/increment-type.ts` (new enum)

**Implementation**:
```typescript
// src/core/types/increment-status.ts
export enum IncrementStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export enum IncrementType {
  HOTFIX = 'hotfix',
  FEATURE = 'feature',
  REFACTOR = 'refactor',
  EXPERIMENT = 'experiment',
  SPIKE = 'spike'
}

export interface IncrementMetadata {
  id: string;
  status: IncrementStatus;
  type: IncrementType;
  assignee?: string;
  created: string;
  lastActivity: string;
  dependencies: {
    blockedBy: string[];
    blocks: string[];
    related: string[];
  };
  pausedReason?: string;
  abandonedReason?: string;
}
```

---

### TR-002: Status Management Commands

**Requirement**: Implement pause/resume/abandon commands

**Commands**:
1. `/specweave:pause <id> --reason="..."`
2. `/specweave:resume <id>`
3. `/specweave:abandon <id> --reason="..."`

**Files**:
- `plugins/specweave/commands/pause.md` (new)
- `plugins/specweave/commands/resume.md` (new)
- `plugins/specweave/commands/abandon.md` (new)

**Example** (`plugins/specweave/commands/pause.md`):
```markdown
---
name: specweave:pause
description: Pause an active increment (e.g., blocked by external dependency)
---

# Pause Increment Command

**Usage**: `/specweave:pause <increment-id> --reason="<reason>"`

**Example**:
```bash
/specweave:pause 0007 --reason="Waiting for Stripe API keys"
```

**What It Does**:
1. Marks increment status as "paused"
2. Records reason in metadata
3. Removes from active increment count
4. Timestamps pause time (for staleness warnings)

**When to Use**:
- Blocked by external dependency
- Waiting for code review
- Deprioritized (intentionally shelved)

**Resuming**:
```bash
/specweave:resume 0007
```

**Best Practices**:
- Always provide reason (helps future you remember context)
- Review paused increments weekly
- Abandon if paused >30 days and not planning to resume
```

---

### TR-003: Type-Based Limits

**Requirement**: Enforce different limits per increment type

**Limits**:
| Type | Max Active | Auto-Abandon | Notes |
|------|-----------|--------------|-------|
| `hotfix` | Unlimited | Never | Critical production fixes |
| `feature` | 2 | Never | Standard features |
| `refactor` | 1 | Never | High focus requirement |
| `experiment` | Unlimited | 14 days | POC/spike work |
| `spike` | Unlimited | Never | Time-boxed research |

**Logic** (in `/specweave:inc`):
```typescript
// Pseudo-code
function checkIncrementLimits(newType: IncrementType): void {
  const activeIncrements = getActiveIncrements();

  if (newType === IncrementType.HOTFIX) {
    // Bypass all checks
    return;
  }

  const activeFeaturesCount = activeIncrements.filter(i => i.type === IncrementType.FEATURE).length;

  if (newType === IncrementType.FEATURE) {
    if (activeFeaturesCount >= 2) {
      showWarning({
        message: "You have 2 active features. Context switching reduces productivity 20-40%.",
        options: [
          "Continue current feature",
          "Pause current feature",
          "Start 3rd feature anyway (not recommended)"
        ]
      });
    } else if (activeFeaturesCount === 1) {
      showInfo({
        message: "You have 1 active feature. Starting 2nd will increase overhead.",
        recommendation: "Consider completing current feature first."
      });
    }
  }

  // Similar logic for refactor, experiment, spike
}
```

**Files**:
- `plugins/specweave/commands/inc.md` (update)
- `src/core/increment/limits.ts` (new - limit enforcement)

---

### TR-004: Smart /specweave:inc

**Requirement**: Replace hard block with intelligent prompt

**Old Behavior** (v0.6.0):
```bash
/specweave:inc "0007-new-feature"

❌ Cannot create new increment!
Close 0006 first.
```

**New Behavior** (v0.7.0+):
```bash
/specweave:inc "0007-refactoring" --type=refactor

🟡 You have 1 active feature (0006-i18n: 50% done, 2 days old)

ℹ️  Refactor increments require high focus (limit: 1 active)

📊 Context Switching Cost: 20-40% productivity loss

Options:
1️⃣  Continue 0006 first (recommended)
2️⃣  Pause 0006 and start 0007
3️⃣  Start both in parallel (high overhead)

What would you like to do? [1/2/3]: _
```

**User Selects**:
- **1**: Cancel increment creation, return to `/specweave:do` for 0006
- **2**: Pause 0006 (prompt for reason), create 0007
- **3**: Create 0007, both active (show ongoing warnings)

**Files**:
- `plugins/specweave/commands/inc.md` (major update)
- `plugins/specweave/skills/increment-planner/SKILL.md` (update prompt logic)

---

### TR-005: Dependency Management

**Requirement**: Track blocked-by/blocks relationships

**Files**:
- `plugins/specweave/commands/block.md` (new)
- `src/core/increment/dependencies.ts` (new)

**Example**:
```bash
# Explicit blocking
/specweave:block 0009 --blocked-by=0007

# Auto-detected (in spec.md)
## Dependencies
- **Blocked by**: Increment 0007 (session management refactor)
- **Blocks**: Increment 0010 (checkout flow - needs sessions)

# Show graph (future)
/specweave:graph

0007-refactor-sessions
  └─> 0009-shopping-cart (blocked)
        └─> 0010-checkout-flow (blocked)
```

**Validation**:
- ✅ Detect circular dependencies
- ✅ Prevent completing blocker if dependents are blocked
- ✅ Auto-unblock when blocker completes

---

### TR-006: Enhanced Status Command

**Requirement**: Update `/specweave:status` with rich information

**Old Output** (v0.6.0):
```bash
/specweave:status

✅ 0001-core-framework
✅ 0002-core-enhancements
⏳ 0006-llm-native-i18n (50% complete)
```

**New Output** (v0.7.0+):
```bash
/specweave:status

📊 Active Increments (2):
  🚨 0005-payment-hotfix [hotfix] (90% done, 6 hours old)
  🔧 0006-i18n [feature] (50% done, 2 days old)

⏸️  Paused Increments (1):
  🔄 0007-stripe [feature] (30% done, paused 3 days)
     Reason: Waiting for Stripe API keys

✅ Completed (4):
  0001-core-framework
  0002-core-enhancements
  0003-intelligent-model-selection
  0004-plugin-architecture

⚠️  Warnings:
  - 0007-stripe paused for 3 days (review or abandon?)
  - 2 active increments = 20-40% context switching cost

💡 Suggestions:
  - Complete 0005-payment-hotfix (high priority, almost done)
  - Resume or abandon 0007-stripe
```

**Filters**:
```bash
/specweave:status --active     # Only active
/specweave:status --stale      # Paused >7 days
/specweave:status --mine       # Only assigned to me (team mode)
```

**Files**:
- `plugins/specweave/commands/status.md` (major update)

---

## Non-Functional Requirements

### NFR-001: Backwards Compatibility

**Requirement**: Existing workflows must still work

**Constraints**:
- ✅ Old `/specweave:inc` behavior preserved (with warnings instead of blocks)
- ✅ Existing increments auto-migrated (add status/type fields)
- ✅ Feature flag: `discipline.useSmartDiscipline: false` reverts to v0.6.0 behavior

**Migration**:
```typescript
// Auto-migration on first run
function migrateIncrements(): void {
  const increments = getAllIncrements();

  for (const inc of increments) {
    if (!inc.metadata.status) {
      inc.metadata.status = inc.isComplete() ? IncrementStatus.COMPLETED : IncrementStatus.ACTIVE;
    }

    if (!inc.metadata.type) {
      inc.metadata.type = IncrementType.FEATURE; // Default
    }
  }
}
```

### NFR-002: Performance

**Requirement**: No noticeable overhead

**Constraints**:
- ✅ Status checks <10ms (file I/O only)
- ✅ Dependency validation <50ms (graph traversal)
- ✅ Staleness warnings computed on-demand (not background)

### NFR-003: UX Quality

**Requirement**: Feel helpful, not combative

**Constraints**:
- ✅ Warnings use neutral language ("Info", "Suggestion")
- ✅ Always provide clear options (not just "no")
- ✅ Show context (%, days, costs) for informed decisions
- ✅ Progressive disclosure (hide complexity for simple cases)

---

## Dependencies

### Internal Dependencies

1. **Increment Metadata System** (exists in v0.6.0)
   - Already tracks id, created, tasks
   - Need to extend with status, type, dependencies

2. **Commands Infrastructure** (exists)
   - Plugin-based commands in `plugins/specweave/commands/`
   - Add new commands (pause, resume, abandon, block)

3. **PM Agent** (exists)
   - Needs update to detect types from user input
   - Needs update to suggest dependencies from spec

### External Dependencies

**None** - This is purely internal workflow enhancement

---

## Risks and Mitigations

### Risk 1: Too Permissive (Scope Creep Returns)

**Risk**: Removing hard blocks might lead to many active increments

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- ✅ Strong warnings at 2 active features
- ✅ Show context-switching cost metrics (make invisible visible)
- ✅ Analytics track abuse patterns
- ✅ Gradual rollout (beta test first)
- ✅ Feature flag to revert if needed

### Risk 2: Complexity Overhead

**Risk**: More status/types/dependencies = cognitive load

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- ✅ Sensible defaults (type=feature if omitted)
- ✅ Progressive disclosure (advanced features hidden)
- ✅ Clear documentation with examples
- ✅ Gradual rollout (Phase 1 → 4)

### Risk 3: Breaking Changes

**Risk**: Existing workflows break

**Likelihood**: Low
**Impact**: High

**Mitigation**:
- ✅ Backwards compatibility (old workflow still works)
- ✅ Auto-migration of existing increments
- ✅ Feature flag: `useSmartDiscipline: true/false`
- ✅ Deprecation warnings (not hard failures)

---

## Success Metrics

### M1: Reduced Force Usage
- **Target**: <5% of increments use `--force`
- **Current**: ~30% (estimated)
- **Measure**: Track in analytics

### M2: Improved Completion Rate
- **Target**: 80%+ reach "completed" status
- **Current**: ~60%
- **Measure**: Completed / (Completed + Abandoned)

### M3: Lower Context Switching
- **Target**: <2 active increments per user average
- **Current**: Unknown
- **Measure**: Average active count

### M4: User Satisfaction
- **Target**: 80%+ prefer new system
- **Current**: N/A
- **Measure**: Post-implementation survey

---

## Implementation Phases

### Phase 1: Status Tracking (v0.7.0) - Week 1-2

**Scope**: Pause/resume/abandon commands

**Deliverables**:
- ✅ `/specweave:pause` command
- ✅ `/specweave:resume` command
- ✅ `/specweave:abandon` command
- ✅ Updated `/specweave:status` (show statuses)
- ✅ Metadata migration script

**Success Criteria**:
- Can pause/resume increments
- Paused increments don't count toward active limit
- Abandoned increments moved to `_abandoned/`

### Phase 2: Increment Types (v0.8.0) - Week 3-4

**Scope**: Type-based limits

**Deliverables**:
- ✅ `--type` flag in `/specweave:inc`
- ✅ Type-based limit enforcement
- ✅ Hotfix bypass logic
- ✅ Experiment auto-abandon (14 days)

**Success Criteria**:
- Hotfixes bypass all limits
- Features limited to 2 active
- Experiments auto-abandoned after 14 days

### Phase 3: Dependencies (v0.9.0) - Week 5-6

**Scope**: Blocked-by/blocks relationships

**Deliverables**:
- ✅ `/specweave:block` command
- ✅ Dependency graph validation
- ✅ Circular dependency detection
- ✅ Auto-unblock on completion

**Success Criteria**:
- Can create explicit dependencies
- Circular deps prevented
- Dependency graph visualizable

### Phase 4: Smart Discipline (v1.0.0) - Week 7-8

**Scope**: Replace blocks with guidance

**Deliverables**:
- ✅ Interactive prompts in `/specweave:inc`
- ✅ Context-switching cost metrics
- ✅ Staleness warnings
- ✅ Team collaboration support (multi-user)

**Success Criteria**:
- No hard blocks (only warnings + choices)
- Users make informed decisions
- Team mode works (multi-dev)

---

## Out of Scope (Future Work)

1. **Advanced Analytics Dashboard**
   - Velocity charts, cycle time tracking
   - Increment burndown visualization
   - Future increment: 0008-analytics-dashboard

2. **AI-Suggested Dependencies**
   - LLM analyzes spec to suggest blockers
   - "This looks like it depends on 0007"
   - Future enhancement to PM agent

3. **Increment Templates**
   - Predefined templates for hotfix/feature/spike
   - Auto-generate structure
   - Future increment: 0009-increment-templates

4. **Cross-Project Dependencies**
   - Increment in Project A blocks increment in Project B
   - Monorepo/microservices support
   - Future increment: 0010-cross-project-deps

---

## Approval

**Status**: Draft → Ready for Planning
**Created**: 2025-11-03
**Next Steps**:
1. Create plan.md (technical architecture)
2. Create tasks.md (phased implementation)
3. Create tests.md (test cases for all 4 phases)
4. Begin Phase 1 implementation

---

**Version**: 1.0
**Last Updated**: 2025-11-03
**Maintainer**: SpecWeave Core Team
