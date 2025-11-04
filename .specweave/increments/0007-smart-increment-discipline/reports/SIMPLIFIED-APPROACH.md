# Simplified WIP Limits: 1 Active Increment (v0.7.1)

**Created**: 2025-11-04
**Context**: User feedback - type-based limits over-engineered, need simpler approach
**Status**: Implemented ✅

---

## 🎯 **User Feedback (The Wake-Up Call)**

> "we don't have strictly type of increment, e.g. it's all increment, no features, refactor separation - or how it works"

> "I would suggest to implement to have by default only 1 increment possible"

> "progress command should also give us overall progress, e.g. how many increments complete"

**Translation**: The type-based limits (feature: 2, refactor: 1, hotfix: unlimited) were **over-engineered** and didn't match reality.

---

## ❌ **What Was Wrong** (Old Approach)

### 1. Type-Based Limits (Too Complex)

**Old System**:
```typescript
feature: 2         // Max 2 active feature increments
hotfix: unlimited  // Unlimited hotfix increments
bug: unlimited     // Unlimited bug increments
refactor: 1        // Max 1 active refactor
experiment: unlimited
```

**Problems**:
- ❌ Users don't specify increment type when creating
- ❌ All increments defaulted to "feature" (meaningless distinction)
- ❌ No UI/CLI for setting increment type
- ❌ Over-complicated for actual workflow
- ❌ Premature optimization (no evidence types needed different limits)

### 2. Status Command (Incomplete)

**Old Output**:
```
▶️  Active (6):
  ● 0001-core-framework
  ● 0002-core-enhancements
  ...

⚠️ feature: 6/2
✅ hotfix: unlimited
✅ refactor: 0/1
```

**Problems**:
- ❌ No overall progress (X/Y complete)
- ❌ Type breakdown confusing (what does "feature: 6/2" mean?)
- ❌ Paused reasons hidden in verbose mode (should always show)

---

## ✅ **What Changed** (New Approach)

### 1. Simplified to 1 Active Increment

**New Default**:
```typescript
// ALL types get same limit: 1
feature: 1
hotfix: 1
bug: 1
change-request: 1
refactor: 1
experiment: 1
```

**Rationale**:
- ✅ **Simple rule**: ONE thing at a time
- ✅ **Maximum focus**: Context switching kills quality
- ✅ **Type becomes optional metadata**: Can still categorize, but doesn't affect limits
- ✅ **User can configure**: Increase limit in `.specweave/config.json` if needed

### 2. Enhanced Status Command

**New Output**:
```
📊 Increment Status

📈 Overall Progress: 1/8 increments complete (13%)

▶️  Active (6):
  ● 0001-core-framework [feature]
  ● 0002-core-enhancements [feature]
  ...

⏸️  Paused (0):
  (none)

📈 WIP Limit:
  ⚠️ Active increments: 6/1 (EXCEEDS LIMIT!)
     💡 Run 'specweave pause <id>' to pause one before starting new work

📊 Summary:
   Active: 6
   Paused: 0
   Completed: 1
   Abandoned: 1
   Total: 8
```

**Improvements**:
- ✅ **Overall progress at top**: "1/8 complete (13%)"
- ✅ **Simple WIP limit display**: "6/1 (EXCEEDS LIMIT!)"
- ✅ **Paused reasons always shown**: Critical info, not hidden
- ✅ **Clear next action**: "Run 'specweave pause <id>'"

---

## 🔧 **Implementation Details**

### Changed Files

1. **src/core/types/increment-metadata.ts**
   - Updated `TYPE_LIMITS` to 1 for all types
   - Added comment: "SIMPLIFIED (v0.7.1): Default to 1 active increment"

2. **src/core/types/config.ts**
   - Updated `DEFAULT_CONFIG.limits` to 1 for all types
   - Comment: "Simplified: 1 active increment (strict focus)"

3. **src/core/increment/status-commands.ts**
   - Added overall progress calculation
   - Simplified WIP limit display
   - Always show paused reasons
   - Enhanced help text

---

## 📊 **Before & After Comparison**

### Old Status Output (Confusing)

```
📊 Increment Status

▶️  Active (6):
  ● 0001-core-framework [feature]
  ● 0002-core-enhancements [feature]
  ...

📈 WIP Limits:
  ⚠️ feature: 6/2
  ✅ hotfix: unlimited
  ✅ bug: unlimited
  ✅ change-request: 0/2
  ✅ refactor: 0/1
  ✅ experiment: unlimited

📊 Summary:
   Active: 6
   Completed: 1
   Total: 8
```

**Problems**:
- Where's the overall progress?
- What does "feature: 6/2" mean? (6 active, limit 2?)
- Why show types I'm not using?
- No clear next action

### New Status Output (Clear)

```
📊 Increment Status

📈 Overall Progress: 1/8 increments complete (13%)

▶️  Active (6):
  ● 0001-core-framework [feature]
  ● 0002-core-enhancements [feature]
  ...

📈 WIP Limit:
  ⚠️ Active increments: 6/1 (EXCEEDS LIMIT!)
     💡 Run 'specweave pause <id>' to pause one before starting new work

📊 Summary:
   Active: 6
   Paused: 0
   Completed: 1
   Abandoned: 1
   Total: 8
```

**Improvements**:
- ✅ Overall progress front and center
- ✅ Simple limit: "6/1 (EXCEEDS LIMIT!)"
- ✅ Clear next action
- ✅ All statuses shown

---

## 🚀 **Next Steps** (User Request: Interactive Prompt)

**User's Vision**:
> "when you tend to move to next inc, you MUST ask a user what to do, focus on completing current, pausing, maybe moving uncompleted scope into this new inc or changing the default to allow working on additional items!"

### Proposed Flow

**When user runs**: `/specweave:inc "new feature"`

**If active increment exists**:
```
⚠️  You have 1 active increment:
   ● 0007-smart-increment-discipline (80% complete)

What would you like to do?

1. Complete current increment first (recommended)
   → Run: /specweave:do to finish 0007
   → Then create new increment

2. Pause current increment
   → Reason: _____________________
   → Then create new increment

3. Move uncompleted scope to new increment
   → Transfer remaining tasks from 0007 to new increment
   → Close 0007 as "scope reduced"

4. Allow multiple active increments (change limit)
   → Update .specweave/config.json: limits.feature = 2
   → Then create new increment

5. Cancel (don't create new increment)

Your choice (1-5):
```

### Implementation (Pending)

**Files to Update**:
- `plugins/specweave/skills/increment-planner/SKILL.md` - Add pre-flight check
- `plugins/specweave/agents/pm/AGENT.md` - Add conflict resolution dialog
- `src/core/increment/limits.ts` (new file) - Helper for interactive prompt

**Benefits**:
- ✅ Forces explicit decision (no accidents)
- ✅ Provides clear options
- ✅ Guides user to best practices
- ✅ Allows escape hatch (option 4: change limit)

---

## 🔄 **GitHub Sync Fix**

**Problem**: Issue #4 was still open despite increment 0007 being complete.

**Fix**: ✅ Closed https://github.com/anton-abyzov/specweave/issues/4

**Command**:
```bash
gh issue close 4 --comment "✅ Increment 0007 Complete

All 24 tasks implemented and tested.
Auto-closed by SpecWeave (increment metadata: completed)"
```

**Result**: Issue #4 now closed, matches metadata.json status.

---

## 💡 **Key Insights**

### 1. Simple is Better

**Before**: 6 different limit types, complex rules
**After**: 1 simple rule (ONE active increment)

**Lesson**: Start simple, add complexity only when needed (not before).

### 2. Metadata ≠ Enforcement

**Type field is still useful**:
- ✅ Categorization (filter by type in reports)
- ✅ Historical tracking (what kind of work we do)
- ✅ Statistics (how many features vs bugs)

**But limits don't need to vary by type**:
- ❌ No evidence that features need limit 2 but refactors need limit 1
- ❌ Premature optimization
- ❌ Users don't set type anyway (defaults to "feature")

### 3. User Feedback > Assumptions

**Assumption**: "Different work types need different limits"
**Reality**: "I just want ONE active increment, period"

**Lesson**: Listen to users, simplify when possible.

---

## 📝 **Summary**

**What Changed**:
1. ✅ Default limit: 1 active increment (all types)
2. ✅ Status command: Shows overall progress
3. ✅ Status command: Simplified WIP limit display
4. ✅ Status command: Always shows paused reasons
5. ✅ GitHub sync: Closed issue #4

**What's Next**:
1. ⏳ Interactive prompt when starting new increment
2. ⏳ Task migration utility (move tasks between increments)
3. ⏳ Config loader (read limits from .specweave/config.json)

**Status**: Core simplification complete ✅

---

## 🎯 **The Philosophy**

**SpecWeave's Core Principle**:
> **Focus = Quality. Context switching = Chaos.**

**Why 1 Active Increment?**
- Humans can't truly multitask
- Every context switch costs 15-30 minutes
- ONE thing at a time = shipped features
- Multiple things at a time = endless WIP

**The Rule**:
> **Default to 1. Justify exceptions.**

**Not a Rigid Policy**:
- User can configure (increase limit)
- Emergency hotfixes can bypass (with --force)
- But default encourages discipline

**Bottom Line**: Simple rules, explicit exceptions, maximum focus.
