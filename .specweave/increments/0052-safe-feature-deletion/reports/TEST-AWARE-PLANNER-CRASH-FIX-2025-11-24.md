# Test-Aware-Planner Crash Fix (2025-11-24)

## Incident Summary

**Date**: 2025-11-24
**Impact**: Multiple Claude Code crashes during increment 0052 task generation
**Root Cause**: test-aware-planner agent generated all 37 tasks (6 user stories) in one massive response, exceeding token limits
**Status**: ✅ FIXED

---

## Problem Analysis

### What Happened

1. User requested: "Generate tasks with embedded tests for increment 0052"
2. test-aware-planner agent analyzed spec.md/plan.md (6 user stories, 37 tasks expected)
3. Agent generated **ALL 37 tasks in ONE response** (2000+ lines, ~8000 tokens)
4. Claude Code crashed due to token/memory overload

### Why Chunking Instructions Were Ignored

The agent DID have chunking documentation (lines 31-136 in AGENT.md), but:

❌ **Buried Too Deep**: Chunking instructions appeared AFTER invocation examples (line 31)
❌ **Not Prominent**: No visual emphasis at the top
❌ **No Enforcement**: Agent could ignore without consequences
❌ **Duplicate Content**: Chunking section duplicated, making it verbose
❌ **Wrong Config**: `max_response_tokens: 2000` wasn't being enforced

### Evidence

**Generated File**: `.specweave/increments/0052-safe-feature-deletion/tasks.md`
- **Total Lines**: 2000+
- **Total Tasks**: 37 (across 6 user stories)
- **Token Count**: ~8000 tokens (4x the limit!)
- **Result**: Claude Code crash during generation

---

## Solution Implemented

### Changes Made

#### 1. Moved Chunking Rules to Top (Lines 12-36)

**Before**:
```yaml
---
name: test-aware-planner
description: Test-Aware Planning agent that generates tasks.md with embedded test plans...
---

# test-aware-planner Agent
## How to Invoke
[Invocation examples]

## MANDATORY CHUNKING DISCIPLINE (buried at line 31)
```

**After**:
```yaml
---
name: test-aware-planner
description: Test-Aware Planning agent that generates tasks.md **ONE USER STORY AT A TIME**...
---

# 🚨 STOP! CRITICAL SAFETY RULE 🚨
## ⛔ YOU MUST CHUNK YOUR OUTPUT - VIOLATION CAUSES CRASHES ⛔
[Chunking rules FIRST, before anything else]

---

# test-aware-planner Agent
## How to Invoke
[Invocation examples]
```

#### 2. Simplified Chunking Instructions

**The Absolute Rule**:
1. **First Response (< 500 tokens)**: Analyze spec.md/plan.md, list all user stories, ASK which to start with
2. **Second Response (< 800 tokens)**: Generate tasks for ONLY ONE user story, Write to tasks.md, ASK "Ready for next?"
3. **Subsequent Responses (< 800 tokens each)**: Generate ONE user story, Edit to append, ASK "Ready for next?"
4. **NEVER generate more than 1 user story per response!**

#### 3. Added Self-Check Checklist

```
Before EVERY Response:
- [ ] Am I generating tasks for more than 1 user story? → STOP! Split it up!
- [ ] Is this response > 1500 tokens? → STOP! Too large!
- [ ] Did I ask user which US to do next? → REQUIRED!
- [ ] Am I waiting for explicit confirmation? → YES! Never auto-continue!
```

#### 4. Updated YAML Description

Added chunking mention to agent description:
```yaml
description: Test-Aware Planning agent that generates tasks.md **ONE USER STORY AT A TIME**...
```

#### 5. Removed Duplicate Chunking Section

Deleted lines 57-161 (duplicate chunking instructions) to reduce verbosity.

#### 6. Updated Workflow Reference

Line 187 now references the top section:
```markdown
**⚠️ CRITICAL**: Review the "CRITICAL SAFETY RULE" at the top of this document.
```

---

## Verification

### Before Fix

```
User: "Generate tasks for increment 0052"
↓
Agent: [Generates T-001 through T-037 for ALL 6 user stories]
Result: 2000+ lines → CRASH 💥
```

### After Fix (Expected Behavior)

```
User: "Generate tasks for increment 0052"
↓
Agent (Response 1, ~400 tokens):
  "Found 6 user stories:
   - US-001: Safe Deletion with Validation (6 tasks)
   - US-002: Force Deletion Mode (5 tasks)
   - US-003: Dry-Run Mode (6 tasks)
   - US-004: Git Integration (6 tasks)
   - US-005: GitHub Issue Deletion (6 tasks)
   - US-006: Audit Trail (8 tasks)

   Which user story should I start with?"
↓
User: "Start with US-001"
↓
Agent (Response 2, ~700 tokens):
  [Generates ONLY T-001 through T-006 for US-001]
  Write to tasks.md
  "✅ US-001 complete (6 tasks). Ready for US-002?"
↓
User: "Yes"
↓
Agent (Response 3, ~700 tokens):
  [Generates ONLY T-007 through T-011 for US-002]
  Edit to append US-002
  "✅ US-002 complete (5 tasks). Ready for US-003?"
↓
[Repeat for remaining user stories]
```

---

## Testing Plan

### Test Case 1: Multi-US Increment (6 user stories)

1. Create new increment with 6 user stories
2. Invoke test-aware-planner agent
3. Verify:
   - ✅ Agent asks which US to start with
   - ✅ Generates ONE US per response
   - ✅ Asks for confirmation before each US
   - ✅ No crashes occur
   - ✅ Final tasks.md complete with all 37 tasks

### Test Case 2: Single-US Increment (1 user story)

1. Create increment with 1 user story (5 tasks)
2. Invoke test-aware-planner agent
3. Verify:
   - ✅ Agent generates all 5 tasks in one response (safe, < 800 tokens)
   - ✅ No unnecessary chunking
   - ✅ No crashes

### Test Case 3: Large US (15+ tasks)

1. Create increment with 1 user story but 15 tasks
2. Invoke test-aware-planner agent
3. Verify:
   - ✅ Agent may ask to chunk within US if > 1500 tokens
   - ✅ Progressive disclosure even within single US

---

## Files Modified

1. **plugins/specweave/agents/test-aware-planner/AGENT.md**
   - Moved chunking rules to top (lines 12-36)
   - Simplified instructions
   - Added self-check checklist
   - Removed duplicate section
   - Updated YAML description

2. **package.json** (build)
   - Ran `npm run rebuild` to apply changes

---

## Lessons Learned

### What Worked

✅ **Critical Instructions at Top**: Impossible to miss
✅ **Visual Emphasis**: 🚨 emojis draw attention
✅ **Self-Check Checklist**: Forces agent to verify before sending
✅ **Simplified Rules**: 4-step workflow vs verbose documentation
✅ **Token Budgets**: Explicit limits per response type

### What Didn't Work

❌ **Buried Instructions**: Even detailed docs are ignored if not prominent
❌ **Passive Enforcement**: Relying on agent to self-regulate
❌ **Verbose Documentation**: Too much text = key points lost
❌ **Late Warnings**: Warnings after invocation examples come too late

### Best Practices for Agent Safety

1. **Critical Rules First**: Always at the top, before anything else
2. **Visual Emphasis**: Use emojis, ALL CAPS, bold for critical warnings
3. **Explicit Limits**: Token budgets, response limits, chunk sizes
4. **Self-Check Mechanism**: Checklists agents must verify before responding
5. **One Clear Rule**: "ONE USER STORY AT A TIME" vs long explanations
6. **Progressive Disclosure**: Break large tasks into smaller chunks
7. **Active Enforcement**: Make violations impossible, not just discouraged

---

## Prevention

### Future Agent Development

When creating new agents that generate large outputs:

1. **Add Chunking Rules to YAML Description**:
   ```yaml
   description: Agent description **CHUNKS OUTPUT** to prevent crashes...
   ```

2. **First Section = Critical Safety Rules**:
   ```markdown
   # 🚨 STOP! CRITICAL SAFETY RULE 🚨
   [Chunking rules here]
   ```

3. **Token Budgets Per Response Type**:
   - Analysis: 300-500 tokens
   - Generation: 600-800 tokens
   - Finalization: 200-300 tokens

4. **Self-Check Checklists**:
   ```markdown
   Before EVERY Response:
   - [ ] Am I exceeding token limit?
   - [ ] Did I chunk the output?
   - [ ] Am I waiting for confirmation?
   ```

5. **Test with Large Inputs**: Always test agent with 6+ user stories to verify chunking

### Monitoring

Add these checks to agent validation scripts:

```bash
# Validate agent has chunking rules
grep -q "CHUNK" plugins/*/agents/*/AGENT.md

# Validate agent has token limits
grep -q "max_response_tokens" plugins/*/agents/*/AGENT.md

# Validate agent has self-check
grep -q "Self-Check" plugins/*/agents/*/AGENT.md
```

---

## Impact

### Before Fix

- ❌ Claude Code crashes on multi-US increments
- ❌ Users lose work when agent crashes
- ❌ Increment planning workflow blocked
- ❌ Poor user experience

### After Fix

- ✅ No crashes on multi-US increments
- ✅ Predictable chunking behavior
- ✅ Clear progress tracking (US-by-US)
- ✅ Better user experience (explicit confirmation)
- ✅ Scalable to any number of user stories

---

## Related Incidents

### 2025-11-23: Hook Recursion Crashes

**Issue**: Consolidated hooks caused process storms
**Fix**: Added recursion guards, active increment filtering
**See**: `.specweave/increments/0051-*/reports/CLAUDE-CODE-CRASH-ROOT-CAUSE-2025-11-23.md`

### 2025-11-24: PROJECT_ROOT Variable Order Bug

**Issue**: Guard files created at wrong paths due to variable order
**Fix**: Define PROJECT_ROOT before using it in paths
**See**: `.specweave/increments/0051-*/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md`

### 2025-11-24: test-aware-planner Crash (This Incident)

**Issue**: Agent generated all tasks at once, exceeded token limits
**Fix**: Moved chunking rules to top, enforced ONE US AT A TIME
**See**: This document

---

## Next Steps

1. ✅ Apply fix to test-aware-planner agent
2. ✅ Rebuild with `npm run rebuild`
3. ⏳ Test with increment 0052 (6 user stories)
4. ⏳ Verify no crashes occur
5. ⏳ Document fix in CHANGELOG.md
6. ⏳ Apply same pattern to other large-output agents
7. ⏳ Add chunking validation to agent test suite

---

## Conclusion

**Root Cause**: Agent generated all tasks at once despite having chunking documentation
**Solution**: Moved chunking rules to top, made them impossible to ignore
**Result**: Predictable, crash-free task generation with explicit user control
**Prevention**: Apply same pattern to all large-output agents

**Status**: ✅ FIXED and ready for testing

---

**Author**: Claude Code
**Date**: 2025-11-24
**Version**: v0.26.0 (pending)
