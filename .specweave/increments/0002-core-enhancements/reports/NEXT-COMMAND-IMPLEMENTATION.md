# `/next` Command Implementation

**Status**: ✅ Implemented
**Date**: 2025-10-28
**Increment**: 0002-core-enhancements

---

## Overview

The `/next` command implements the **smart workflow transition** feature shown on the SpecWeave landing page. It combines increment validation, automatic closure, and intelligent next-work suggestions into a single seamless command.

**Website claim**:
> Type `/inc "next"` (auto-closes if ready)

**Reality**:
- `/next` is a standalone command (not `/inc "next"`)
- Provides smarter, more focused workflow transition than `/inc`
- Auto-closes current increment if PM gates pass
- Intelligently suggests next work (backlog, WIP, or new)

---

## Concept & Design Philosophy

### The Problem

Without `/next`, the workflow requires multiple manual steps:

```bash
# Old workflow (manual)
/progress              # Check if done
/done 0001            # Manually close
                      # (PM validates, might fail)
/list-increments      # See what's next
/do 0002           # Start next increment
# or
/inc "new feature"    # Create new increment
```

**Issues**:
- ❌ Multiple commands needed
- ❌ Easy to forget `/done` validation
- ❌ No intelligent suggestions
- ❌ Requires remembering what's next
- ❌ Context switching overhead

### The Solution

`/next` is the **"I'm done, what's next?"** command:

```bash
# New workflow (smart)
/next                  # One command does it all:
                       # 1. Validates current increment
                       # 2. Auto-closes if ready
                       # 3. Suggests next work intelligently
                       # 4. User stays in flow
```

**Benefits**:
- ✅ Single command for workflow transition
- ✅ Automatic PM validation (3 gates)
- ✅ Intelligent backlog suggestions
- ✅ User stays in control (never forces)
- ✅ Natural "what's next?" workflow
- ✅ Reduces cognitive load

---

## Core Workflow

### Step 1: Find Active Increment

```bash
find .specweave/increments -name "spec.md" -exec grep -l "status: in-progress" {} \;
```

**Scenarios**:
- One in-progress → Validate for closure
- Multiple in-progress → Ask which to close (WIP limit warning)
- None in-progress → Skip to next work suggestions

### Step 2: PM Validation (3 Gates)

Reuses the same validation logic as `/done`:

#### Gate 1: Tasks Completed
- All P1 (critical) tasks done
- P2 tasks done OR deferred with reason
- P3 tasks completed, deferred, or moved to backlog

#### Gate 2: Tests Passing
- All test suites passing
- Coverage >80% for critical paths
- E2E tests passing (if applicable)

#### Gate 3: Documentation Updated
- CLAUDE.md updated
- README.md updated
- CHANGELOG.md updated (if API changed)

### Step 3: Closure Decision

**All gates pass** ✅:
```
Auto-close increment
Generate completion report
Free WIP slot
Proceed to next work suggestions
```

**Any gate fails** ❌:
```
Present options:
A. Complete remaining work (recommended)
B. Force close and defer tasks
C. Stay on current increment
```

### Step 4: Suggest Next Work

**Intelligent suggestions based on project state**:

1. **Backlog items found** → Suggest starting planned increments
2. **Other WIP exists** → Suggest continuing existing work
3. **Clean slate** → Prompt to create new increment with `/inc`

---

## Key Design Decisions

### 1. Separate Command (Not `/inc "next"`)

**Decision**: Create `/next` as standalone command, not special argument to `/inc`

**Rationale**:
- `/inc` is for **creating** new increments (PM-led planning)
- `/next` is for **transitioning** between increments (closure + suggestion)
- Different mental models, different purposes
- Cleaner separation of concerns

**Trade-offs**:
- ✅ Clearer intent (transition vs. create)
- ✅ Easier to document
- ❌ Slightly different from website copy (minor)

### 2. Never Force Auto-Close

**Decision**: Always present options if gates fail, never force closure

**Rationale**:
- User stays in control (no surprises)
- Quality awareness (can't ignore incomplete work)
- Clear options (complete, defer, or cancel)

**Example**:
```
Options:
A. Complete remaining work (recommended) → 6 hours
B. Force close and defer tasks to next increment
C. Stay on current increment

What would you like to do? [A/B/C]
```

### 3. Intelligent Next Work Suggestions

**Decision**: Context-aware suggestions based on project state

**Rationale**:
- Reduces cognitive load (AI suggests next best action)
- Promotes backlog usage (planned work)
- Respects WIP limits (warns if at limit)

**Suggestion Priority**:
1. Planned increments in backlog (P1 first)
2. Other in-progress work (complete WIP)
3. New increment creation (clean slate)

### 4. Reuse `/done` Validation Logic

**Decision**: Same PM validation as `/done`, don't reinvent

**Rationale**:
- DRY principle (Don't Repeat Yourself)
- Consistent quality gates
- Easier maintenance

**Implementation**:
- Both commands use same 3-gate validation
- Same PM agent invocation
- Same closure report generation

---

## Integration with Existing Workflow

### Complete SpecWeave Workflow

```bash
# 1. Plan new increment (PM-led)
/inc "User authentication"
   → Creates spec.md, plan.md, tasks.md, tests.md
   → Auto-closes previous if ready (PM gates)

# 2. Check progress anytime
/progress
   → Shows completion %, next task, PM gates preview

# 3. Execute tasks
/do
   → Auto-resumes from last incomplete task
   → Runs hooks after each task

# 4. Smart transition (NEW!)
/next
   → Validates PM gates
   → Auto-closes if ready
   → Suggests next work intelligently

# 5. Manual closure (optional)
/done 0001
   → Explicit closure with PM validation
   → Use if you want manual control
```

### When to Use Each Command

| Command | Use Case | Example |
|---------|----------|---------|
| `/inc` | Start new feature (explicit) | `/inc "Payment processing"` |
| `/do` | Execute tasks | `/do` (auto-resumes) |
| `/progress` | Quick status check | `/progress` |
| `/next` ⭐ | **Workflow transition** | `/next` (done, what's next?) |
| `/done` | Manual closure | `/done 0001` |

**Mental Model**:
- `/inc` = "I want to build **this**"
- `/next` = "I'm done, what's **next**?"
- `/do` = "Let me **work**"
- `/progress` = "Where **am I**?"
- `/done` = "I want to **close this**"

---

## Implementation Details

### File Location

```
.claude/commands/next.md
```

### Command Structure

```yaml
---
name: next
description: Smart increment transition - auto-close current if ready, intelligently suggest next work (backlog or new feature)
---
```

### Key Sections

1. **Usage** - No arguments needed
2. **Workflow** - 4-step process (find, validate, close, suggest)
3. **PM Validation** - 3 gates (tasks, tests, docs)
4. **Example Workflows** - 4 scenarios (happy path, incomplete, clean slate, WIP limit)
5. **Best Practices** - When and how to use
6. **Related Commands** - How it fits with other commands

### Code Reuse

- **PM Validation**: Reuses `/done` logic (3 gates)
- **Task Parsing**: Reuses `/progress` logic (completion %)
- **Backlog Search**: Reuses `/list-increments` logic (status filtering)

---

## Example Scenarios

### Scenario 1: Happy Path (Auto-Close)

**User**: `/next`

**System**:
1. Finds increment 0001 (in-progress)
2. Validates PM gates: ✅✅✅ (all pass)
3. Auto-closes 0001
4. Finds 0002 in backlog (planned)
5. Suggests: "Run `/do 0002` to start"

**Result**: Seamless transition, zero friction

### Scenario 2: Incomplete Work

**User**: `/next`

**System**:
1. Finds increment 0001 (in-progress)
2. Validates PM gates: ❌✅❌ (tasks + docs incomplete)
3. Presents options:
   - A. Complete remaining (6 hours)
   - B. Force close and defer
   - C. Stay on 0001

**User**: Chooses A

**Result**: User completes work properly, maintains quality

### Scenario 3: Clean Slate

**User**: `/next`

**System**:
1. No active increments found
2. Checks backlog: Empty
3. Suggests:
   - Run `/inc "feature"` to create new
   - Check backlog for ideas
   - Review roadmap

**Result**: User prompted to plan next work

### Scenario 4: WIP Limit Warning

**User**: `/next`

**System**:
1. Finds 2 increments in-progress (at WIP limit)
2. Warns about context switching
3. Asks which to focus on closing
4. Validates chosen increment

**Result**: Encourages focus, respects WIP limits

---

## Testing Plan

### Manual Testing Scenarios

1. **Happy path** (all gates pass):
   - Create increment with all tasks complete
   - Run `/next`
   - Verify auto-close
   - Verify next work suggestion

2. **Incomplete tasks** (gate 1 fails):
   - Create increment with 2 P1 tasks incomplete
   - Run `/next`
   - Verify blocker message
   - Verify options presented

3. **Failing tests** (gate 2 fails):
   - Create increment with 1 test failing
   - Run `/next`
   - Verify test failure message
   - Verify fix guidance

4. **Outdated docs** (gate 3 fails):
   - Create increment with CLAUDE.md not updated
   - Run `/next`
   - Verify doc drift warning
   - Verify update instructions

5. **Backlog suggestions**:
   - Create planned increment in backlog
   - Run `/next` after closing current
   - Verify backlog item suggested

6. **WIP limit warning**:
   - Create 2 in-progress increments
   - Run `/next`
   - Verify WIP warning
   - Verify focus recommendation

### Automated Testing (Future)

```typescript
// test/commands/next.test.ts

describe('/next command', () => {
  test('auto-closes when all gates pass', async () => {
    // Setup: Create increment with all tasks complete
    // Act: Run /next
    // Assert: Increment closed, next work suggested
  });

  test('prompts options when gates fail', async () => {
    // Setup: Create increment with incomplete tasks
    // Act: Run /next
    // Assert: Options presented, no auto-close
  });

  test('suggests backlog items', async () => {
    // Setup: Create planned increment in backlog
    // Act: Run /next after closing current
    // Assert: Backlog item suggested
  });
});
```

---

## Documentation Updates

### Files to Update

1. **README.md** (root):
   - Add `/next` to command list
   - Update workflow examples

2. **CLAUDE.md**:
   - Add `/next` to quick reference
   - Update workflow section

3. **.claude/commands/README.md**:
   - Add `/next` to command registry

4. **Landing page** (website):
   - Update copy from `/inc "next"` to `/next`
   - Add workflow diagram

### Example README Section

```markdown
## Smart Workflow Commands

- `/inc "feature"` - Create new increment (PM-led planning)
- `/do` - Execute tasks (auto-resumes)
- `/progress` - Check status
- `/next` - **Smart transition** (close current, suggest next)
- `/done` - Manual closure with validation
```

---

## Benefits Summary

### For Users

- ✅ **Reduced friction** - One command instead of multiple
- ✅ **Stay in flow** - No context switching
- ✅ **Intelligent guidance** - AI suggests next best action
- ✅ **Quality enforcement** - PM validation built-in
- ✅ **Backlog awareness** - Promotes planned work

### For SpecWeave

- ✅ **Workflow completion** - Fills gap in increment lifecycle
- ✅ **Landing page alignment** - Implements promised feature
- ✅ **Competitive advantage** - Unique workflow automation
- ✅ **User experience** - Natural "what's next?" command

---

## Future Enhancements

### Phase 2 Features

1. **Smart priorities**:
   - Suggest P1 items before P2
   - Consider dependencies
   - Factor in estimated effort

2. **Time tracking**:
   - Track time spent per increment
   - Estimate time remaining
   - Velocity calculations

3. **Slack/Discord integration**:
   - Notify team when increment closed
   - Share completion report
   - Suggest pairing opportunities

4. **Analytics**:
   - Track closure success rate
   - Identify common blockers
   - Optimize PM gate thresholds

### Potential Improvements

1. **Closure report customization**:
   - Template options
   - Custom metrics
   - Export formats

2. **Next work scoring**:
   - ML-based recommendations
   - User preference learning
   - Business value ranking

3. **Multi-repo support**:
   - Suggest work across repos
   - Cross-repo dependencies
   - Monorepo awareness

---

## Related Documentation

- [Increment Lifecycle Guide](../../../docs/internal/delivery/guides/increment-lifecycle.md)
- [PM Validation](../../../docs/internal/delivery/guides/pm-validation.md)
- [Workflow Improvements Report](./WORKFLOW-IMPROVEMENTS.md)
- [Command Registry](.claude/commands/README.md)

---

## Conclusion

The `/next` command represents a **significant workflow improvement** for SpecWeave. It transforms increment transitions from a manual, multi-step process into a single, intelligent command that:

- Validates quality automatically
- Closes work when ready
- Suggests next actions intelligently
- Keeps users in flow

This aligns perfectly with SpecWeave's philosophy of **structured yet flexible development** and delivers on the promise shown in the landing page.

**Impact**: Reduced friction, improved quality, happier developers.

---

**Implemented by**: Claude Code
**Review Status**: Ready for review
**Next Steps**: Manual testing, documentation updates, user feedback
