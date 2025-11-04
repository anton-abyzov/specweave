# Complementary Improvements to Smart Increment Discipline

**Document**: Analysis of related improvements discovered during increment 0007
**Created**: 2025-11-03
**Status**: Recommendations for future increments

---

## Context

While designing the Smart Increment Discipline system (RFC-0007), several **adjacent improvements** became apparent. These improvements are NOT in scope for 0007 but are natural extensions that would enhance the system.

This document captures these ideas for future consideration.

---

## Improvement 1: Increment Estimation & Velocity Tracking

### Problem

**Current State**:
- No way to estimate how long an increment will take
- No visibility into historical velocity
- Planning is guesswork ("this feels like 3 days of work?")

**Impact**:
- Poor scope estimation (over/under commit)
- No data for improvement
- Can't predict completion dates

### Proposed Solution

**Add estimation to increment creation**:
```bash
/specweave:inc "Add search" --estimate=3d

# Prompt during creation:
How long will this take? [1d/3d/1w/2w/custom]: 3d
```

**Track actual completion time**:
```yaml
# metadata.json
{
  "estimate": "3d",
  "actualTime": "4.5d",
  "velocity": {
    "tasksPerDay": 2.5,
    "linesChangedPerDay": 450
  }
}
```

**Show velocity trends**:
```bash
/specweave:velocity

📊 Your Velocity (Last 30 Days):

Average Completion Time:
  Features: 4.2 days (estimated: 3.5 days) [+20% over]
  Refactors: 1.8 days (estimated: 2.0 days) [-10% under]
  Hotfixes: 0.5 days (estimated: 0.5 days) [on target]

Completed Increments: 8
Tasks Per Day: 3.2 (↑ from 2.8 last month)
Estimation Accuracy: 75% (↑ from 60%)

💡 Suggestion: You tend to underestimate features by 20%.
   Consider adding 1 day buffer to feature estimates.
```

### Benefits

- ✅ **Better planning** - Data-driven scope estimation
- ✅ **Realistic commitments** - Know your velocity
- ✅ **Continuous improvement** - Track estimation accuracy over time
- ✅ **Predictability** - "This will be done Thursday" (with confidence)

### Future Increment

**0008-increment-estimation-and-velocity**
- Priority: P1 (high value for teams)
- Effort: 2-3 weeks
- Dependencies: 0007 (needs status tracking)

---

## Improvement 2: Definition of Done (DoD) Checklist

### Problem

**Current State**:
- "Done" is ambiguous
  - Tasks complete? ✅
  - Tests written? 🤷
  - Docs updated? 🤷
  - Code reviewed? 🤷
  - Deployed? 🤷
- Leads to "90% done forever" syndrome
- Inconsistent quality across increments

**Impact**:
- Increments "complete" but not production-ready
- Technical debt accumulates
- Living docs out of sync

### Proposed Solution

**Configurable DoD checklist per increment type**:

```yaml
# .specweave/config.json
{
  "definitions": {
    "feature": {
      "checklist": [
        "All tasks completed",
        "Unit tests written (80%+ coverage)",
        "Integration tests added",
        "Documentation updated",
        "Code reviewed by peer",
        "Living docs synced",
        "ADRs updated (if architecture changed)",
        "Deployed to staging"
      ]
    },
    "hotfix": {
      "checklist": [
        "All tasks completed",
        "Root cause documented",
        "Fix verified in production",
        "Incident report filed"
      ]
    },
    "refactor": {
      "checklist": [
        "All tasks completed",
        "No functionality changed (tests prove it)",
        "Performance metrics unchanged or improved",
        "Code complexity reduced",
        "Documentation updated"
      ]
    }
  }
}
```

**Enforce checklist before completion**:
```bash
/specweave:done 0007

✅ Tasks: 15/15 completed
❌ Definition of Done:
   ✅ Unit tests written (85% coverage)
   ✅ Documentation updated
   ✅ Code reviewed
   ❌ Living docs synced
   ❌ Deployed to staging

Cannot mark as complete until DoD checklist is satisfied.

Run: /specweave:sync-docs
     /specweave:deploy staging
```

**Progressive completion**:
```bash
/specweave:checklist 0007

Definition of Done (5/8):
[ ] All tasks completed (15/15) ✅
[x] Unit tests written
[x] Documentation updated
[x] Code reviewed
[ ] Living docs synced
[ ] ADRs updated (if needed)
[x] Integration tests added
[ ] Deployed to staging

Next: /specweave:sync-docs
```

### Benefits

- ✅ **Consistent quality** - Every increment meets same standard
- ✅ **No "90% done"** - Clear completion criteria
- ✅ **Automated checks** - Framework validates DoD
- ✅ **Team alignment** - Shared understanding of "done"
- ✅ **Living docs discipline** - Enforced sync before completion

### Future Increment

**0009-definition-of-done-checklist**
- Priority: P1 (critical for quality)
- Effort: 1-2 weeks
- Dependencies: 0007 (needs status model)

---

## Improvement 3: Increment Retrospectives (Learning Capture)

### Problem

**Current State**:
- No structured learning capture after completion
- Patterns/mistakes repeated across increments
- No "lessons learned" repository
- Knowledge lost when developers leave

**Impact**:
- Same mistakes repeated
- No continuous improvement
- Junior developers lack guidance

### Proposed Solution

**Structured retrospectives**:
```bash
/specweave:retro 0007

🔍 Increment 0007 Retrospective

📊 Stats:
  - Duration: 4.5 days (estimated: 3 days)
  - Tasks: 15 completed, 2 added during implementation
  - Context switches: 3 (paused twice for hotfixes)

💡 What went well?
> Smart discipline design was comprehensive
> RFC-first approach saved time
> Discovered complementary improvements early

⚠️  What could be improved?
> Underestimated complexity by 50%
> Should have broken into smaller increments
> Needed more testing infrastructure first

🎯 Action Items (for future):
> Add estimation buffer for "system redesigns"
> Create increment templates for common patterns
> Build testing harness before major refactors

📚 Patterns Discovered:
> Meta-problems (experiencing the problem while solving it)
> Progressive enhancement (phase 1 → 4 rollout)
> Backward compatibility critical for adoption

Save retrospective? [Y/n]: Y
```

**Retrospective storage**:
```
.specweave/increments/0007/reports/RETROSPECTIVE.md
```

**Aggregate learnings**:
```bash
/specweave:learnings

📚 Top Patterns (Last 10 Increments):

Estimation:
  - System redesigns: +50% buffer needed (3/10 increments)
  - New integrations: +30% buffer (2/10 increments)

Quality:
  - Test-first reduced bugs by 60% (5/10 increments)
  - RFC-first saved 2-3 days rework (4/10 increments)

Workflow:
  - Breaking into phases improved completion rate (4/10)
  - Context switching cost higher than estimated (6/10)

🚨 Common Mistakes:
  - Skipping tests.md → bugs in production (3 times)
  - Not updating living docs → stale documentation (5 times)
```

### Benefits

- ✅ **Continuous improvement** - Learn from every increment
- ✅ **Pattern recognition** - See what works/doesn't
- ✅ **Knowledge retention** - Documented for future devs
- ✅ **Onboarding** - New team members learn from history
- ✅ **Velocity increase** - Avoid repeating mistakes

### Future Increment

**0010-increment-retrospectives**
- Priority: P2 (nice-to-have, high long-term value)
- Effort: 1 week
- Dependencies: 0007, 0008 (needs velocity data)

---

## Improvement 4: Smart Context Loading (Efficiency)

### Problem

**Current State**:
- Skills/agents load context for ALL increments
- Even completed increments from 6 months ago
- Bloats token usage unnecessarily

**Example**:
```
Current project has 20 completed increments + 2 active
Context loaded: 22 increments = 15K tokens
Actually needed: 2 active + 2 recent = 3K tokens
Waste: 80% of context is irrelevant!
```

**Impact**:
- Higher API costs (5x more tokens than needed)
- Slower responses (more context to process)
- Harder to focus (signal-to-noise ratio low)

### Proposed Solution

**Tiered context loading**:

```yaml
# Default: Smart loading
context:
  tier1: [active, paused, blocked]  # Always load (highest priority)
  tier2: [completed-last-30d]       # Load if space available
  tier3: [completed-older]          # Load only on explicit request
  tier4: [abandoned]                # Never load (unless --include-abandoned)
```

**Context budget**:
```typescript
// Smart context loader
function loadIncrementContext(maxTokens: number = 10000): Increment[] {
  const tier1 = getIncrements({ status: ['active', 'paused', 'blocked'] });
  const tier1Cost = estimateTokens(tier1);

  if (tier1Cost > maxTokens) {
    console.warn('⚠️  Too many active increments! Context budget exceeded.');
    return tier1.slice(0, maxTokenBudget);
  }

  const remaining = maxTokens - tier1Cost;
  const tier2 = getIncrements({ completedWithin: '30d' });
  const tier2Cost = estimateTokens(tier2);

  if (tier2Cost <= remaining) {
    return [...tier1, ...tier2];
  } else {
    // Load most recent until budget exhausted
    return [...tier1, ...tier2.slice(0, Math.floor(remaining / avgIncrementCost))];
  }
}
```

**Explicit context expansion**:
```bash
# Default (smart loading)
/specweave:status
# Loads: 2 active + 2 recent = 3K tokens

# Explicit expansion
/specweave:status --all
# Loads: All 22 increments = 15K tokens

# Historical search
/specweave:search "authentication" --all-increments
# Loads: Only increments matching "authentication"
```

### Benefits

- ✅ **80% token reduction** - Only load what's needed
- ✅ **Faster responses** - Less context to process
- ✅ **Lower costs** - 5x reduction in API usage
- ✅ **Better focus** - Signal-to-noise ratio improved
- ✅ **Scalability** - Works for projects with 100+ increments

### Future Increment

**0011-smart-context-loading**
- Priority: P0 (critical for large projects)
- Effort: 1 week
- Dependencies: 0007 (needs status model)

---

## Improvement 5: Increment Handoffs (Team Collaboration)

### Problem

**Current State**:
- No way to signal "ready for review"
- No way to block on "needs approval"
- No handoff tracking (Frontend → Backend → QA)

**Team workflow**:
```
Frontend dev: Finishes UI work
               No way to signal "ready for backend"
Backend dev:  Doesn't know frontend is done
               Starts backend work late
Result:       Delays, confusion, rework
```

**Impact**:
- Poor team coordination
- Delays at handoff points
- No visibility into blockers

### Proposed Solution

**Add "review" and "approved" statuses**:

```yaml
statuses:
  active:      # Currently working
  review:      # Ready for review (blocked on peer)
  approved:    # Review complete, can continue
  blocked:     # Waiting for external input
  paused:      # Intentionally shelved
  completed:   # All done
  abandoned:   # Won't finish
```

**Handoff workflow**:
```bash
# Frontend dev completes work
/specweave:review 0012 --assign=backend-dev

📝 Increment 0012 marked as "review"
🔔 Notification sent to: backend-dev
💬 Message: "Frontend work complete. Ready for API integration."

# Backend dev reviews
/specweave:approve 0012 --comment="API endpoints ready"

✅ Increment 0012 approved
📊 Review time: 2 hours
🔄 Status: review → active (backend work)
```

**Review SLA warnings**:
```bash
/specweave:status

⏰ Reviews Pending (2):
  🔍 0012-dashboard [review] (waiting 3 hours)
     Assigned to: backend-dev
     ⚠️  SLA: 8 hours (5 hours remaining)

  🔍 0013-checkout [review] (waiting 1 day)
     Assigned to: qa-team
     🚨 SLA exceeded! (expected: 4 hours)
```

**Team dashboard**:
```bash
/specweave:team

👥 Team Activity:

alice@example.com:
  🔧 0010-auth [feature] (active, 2 days)
  🔍 0011-payments [feature] (review, 3 hours)

bob@example.com:
  🚨 0005-hotfix [hotfix] (active, 6 hours)

charlie@example.com:
  ⏸️  0014-refactor [refactor] (paused, waiting on 0010)

📊 Team Stats:
  - Active: 3 increments
  - In Review: 1 increment
  - Blocked/Paused: 1 increment
  - Average cycle time: 4.2 days
```

### Benefits

- ✅ **Clear handoffs** - Explicit "ready for next phase"
- ✅ **SLA tracking** - Know when reviews are overdue
- ✅ **Team visibility** - See what everyone's working on
- ✅ **Bottleneck detection** - Identify review delays
- ✅ **Async collaboration** - Works for distributed teams

### Future Increment

**0012-increment-handoffs-and-reviews**
- Priority: P1 (critical for teams)
- Effort: 2 weeks
- Dependencies: 0007 (needs status model)

---

## Improvement 6: Increment Templates (Efficiency)

### Problem

**Current State**:
- Every increment starts from scratch
- Common patterns (hotfix, feature, spike) have similar structure
- Repetitive spec writing

**Example**:
```
Creating 10 hotfixes in a year = writing same structure 10 times:
- Problem statement
- Root cause analysis
- Fix implementation
- Verification steps
- Deployment plan
```

**Impact**:
- Wasted time on boilerplate
- Inconsistent structure
- Missed steps (e.g., forgot "rollback plan" in hotfix)

### Proposed Solution

**Predefined templates**:

```bash
/specweave:inc "Fix payment bug" --type=hotfix --template=hotfix

# Uses predefined template:
```

**Template: hotfix.md**:
```markdown
# Specification: {{TITLE}}

**Increment**: {{ID}}
**Type**: Hotfix
**Severity**: P0 - Critical Production Issue
**Created**: {{DATE}}

---

## Incident Summary

**What broke**: [Describe the problem]
**When discovered**: [Timestamp]
**Impact**: [Users affected, revenue lost, etc.]
**Current status**: [Degraded/Down/Mitigated]

---

## Root Cause Analysis

**Immediate cause**: [What directly caused the failure]
**Underlying cause**: [Why the immediate cause occurred]
**Contributing factors**: [What made this worse]

---

## Fix Implementation

**Solution**: [How we'll fix it]
**Code changes**: [Files/functions to modify]
**Testing**: [How to verify fix]

---

## Deployment Plan

**Steps**:
1. Deploy to staging
2. Verify fix in staging
3. Deploy to production (canary 5% → 50% → 100%)
4. Monitor error rates for 1 hour

**Rollback plan**: [How to revert if fix fails]

---

## Prevention

**Immediate**: [Quick fix to prevent recurrence]
**Long-term**: [Systematic improvement]
**Monitoring**: [What alerts to add]

---

## Post-Incident

**Incident report**: [Link to formal incident report]
**Follow-up tasks**: [Technical debt to address]
**Learnings**: [What we learned]
```

**Custom templates**:
```bash
# Create custom template
/specweave:template create "data-migration"

# Use custom template
/specweave:inc "Migrate to PostgreSQL" --template=data-migration
```

**Template library**:
```
.specweave/templates/
├── hotfix.md
├── feature.md
├── refactor.md
├── spike.md
├── data-migration.md (custom)
└── api-integration.md (custom)
```

### Benefits

- ✅ **Faster creation** - Pre-filled structure
- ✅ **Consistency** - Same structure every time
- ✅ **Completeness** - Templates include all required sections
- ✅ **Best practices** - Templates encode lessons learned
- ✅ **Onboarding** - New devs learn structure from templates

### Future Increment

**0013-increment-templates**
- Priority: P2 (nice-to-have, saves time)
- Effort: 1 week
- Dependencies: 0007 (needs type model)

---

## Priority Matrix

| Improvement | Priority | Effort | Value | Dependencies | Increment |
|-------------|----------|--------|-------|--------------|-----------|
| **DoD Checklist** | P0 | 2w | Very High | 0007 | 0009 |
| **Smart Context Loading** | P0 | 1w | Very High | 0007 | 0011 |
| **Estimation & Velocity** | P1 | 3w | High | 0007 | 0008 |
| **Team Handoffs** | P1 | 2w | High | 0007 | 0012 |
| **Retrospectives** | P2 | 1w | Medium | 0007, 0008 | 0010 |
| **Templates** | P2 | 1w | Medium | 0007 | 0013 |

**Recommended Sequence**:
1. **0007** - Smart Discipline (foundation)
2. **0009** - DoD Checklist (quality)
3. **0011** - Smart Context Loading (efficiency)
4. **0008** - Estimation & Velocity (planning)
5. **0012** - Team Handoffs (collaboration)
6. **0010** - Retrospectives (learning)
7. **0013** - Templates (convenience)

---

## Integration Points

### How These Improvements Connect

```
0007 (Smart Discipline)
  ├─> 0009 (DoD Checklist)
  │    └─> Enforces completion criteria per type
  │
  ├─> 0011 (Smart Context)
  │    └─> Uses status to filter loaded increments
  │
  ├─> 0008 (Estimation)
  │    ├─> Tracks actual vs. estimated per type
  │    └─> Feeds into context switching cost metrics
  │
  ├─> 0012 (Team Handoffs)
  │    ├─> Adds review/approved statuses
  │    └─> Enables multi-developer workflows
  │
  ├─> 0010 (Retrospectives)
  │    ├─> Uses velocity data from 0008
  │    └─> Captures learnings per increment
  │
  └─> 0013 (Templates)
       └─> Pre-fills based on type (from 0007)
```

### Synergies

**Smart Discipline + DoD Checklist**:
- Increment can't be "completed" until DoD satisfied
- Type-specific checklists (hotfix ≠ feature)

**Smart Discipline + Estimation**:
- Velocity informs context switching cost
- "You have 2 days of work left on 0010, finish it first"

**Smart Discipline + Team Handoffs**:
- "review" status counts as "active" for original assignee
- "approved" status moves to next assignee

**DoD Checklist + Retrospectives**:
- Checklist completeness tracked in retro
- "We forgot to update docs 3 times" → add to DoD

---

## Open Questions

1. **Should velocity be per-developer or per-project?**
   - Per-developer: More accurate, better coaching
   - Per-project: Easier to aggregate, team metrics
   - **Recommendation**: Both (individual + aggregate)

2. **Should DoD be enforced (hard block) or suggested (warning)?**
   - Enforced: Ensures quality, prevents shortcuts
   - Suggested: Flexibility for emergencies
   - **Recommendation**: Enforced by default, `--skip-dod` flag for emergencies

3. **Should retrospectives be required or optional?**
   - Required: Ensures learning capture
   - Optional: Reduces friction for small increments
   - **Recommendation**: Required for features/refactors, optional for hotfixes/spikes

4. **Should templates be versioned?**
   - Yes: Track improvements to templates over time
   - No: Adds complexity
   - **Recommendation**: Version in future (0014-template-versioning)

---

## Conclusion

The **Smart Increment Discipline system (0007)** unlocks a **suite of powerful improvements**:

1. **DoD Checklist** - Ensures consistent quality
2. **Smart Context Loading** - Reduces costs by 80%
3. **Estimation & Velocity** - Enables data-driven planning
4. **Team Handoffs** - Supports collaborative workflows
5. **Retrospectives** - Captures learning for continuous improvement
6. **Templates** - Speeds up increment creation

**Together, these create a comprehensive increment management system** that:
- ✅ Maintains discipline (via DoD, not hard blocks)
- ✅ Scales to teams (handoffs, velocity)
- ✅ Optimizes efficiency (context loading, templates)
- ✅ Enables continuous improvement (retrospectives, velocity)

**Next Steps**:
1. Complete increment 0007 (Smart Discipline foundation)
2. Create RFCs for 0008-0013
3. Prioritize based on user feedback
4. Implement incrementally (naturally using the system we're building!)

---

**Status**: Recommendations for Future Work
**Created**: 2025-11-03
**Maintainer**: SpecWeave Core Team
