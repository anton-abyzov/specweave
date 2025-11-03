---
name: spec-driven-debugging
description: Use when encountering ANY bug, test failure, or unexpected behavior before proposing fixes - systematic five-phase framework (context loading, root cause investigation, pattern analysis, hypothesis testing, implementation with documentation) that ensures understanding and spec alignment before attempting solutions. Activates for: bug, error, test failure, failing test, unexpected behavior, crash, exception, debug, troubleshoot, fix issue, investigate problem, ultrathink bug.
---

# Spec-Driven Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues and create spec-code divergence.

**Core principle:** ALWAYS find root cause AND verify spec alignment before attempting fixes. Symptom fixes are failure.

**SpecWeave addition:** Bugs reveal either code issues OR spec misalignment. Fix at the right level.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
NO FIXES WITHOUT CHECKING SPEC ALIGNMENT
```

If you haven't completed Phase 0 and Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures (unit, integration, E2E)
- Bugs in development or production
- Unexpected behavior vs spec.md
- Performance problems
- Build failures
- Integration issues
- Security vulnerabilities
- Race conditions or concurrency bugs

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue
- **Behavior differs from spec.md** (spec-code misalignment)
- **Complex distributed systems bug** (use ultrathink)

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (systematic is faster than thrashing)
- Manager wants it fixed NOW (systematic prevents rework)
- **Working in brownfield code** (may need retroactive specs)

## The Five Phases

You MUST complete each phase before proceeding to the next.

### Phase 0: Context Loading (SpecWeave-Specific)

**BEFORE investigating, load SpecWeave context:**

1. **Check if Bug is in SpecWeave Increment**
   ```bash
   # Find which increment contains the buggy file
   find .specweave/increments -name "context-manifest.yaml" -exec grep -l "path/to/buggy/file" {} \;
   ```

2. **Load Increment Documentation** (if found)
   - Read `.specweave/increments/XXXX/spec.md` - What SHOULD happen?
   - Read `.specweave/increments/XXXX/plan.md` - How was it SUPPOSED to work?
   - Read `.specweave/increments/XXXX/tests.md` - What tests were planned?
   - Read `.specweave/increments/XXXX/tasks.md` - Was this a known issue?

3. **Load Architecture Context**
   - Check `.specweave/docs/internal/architecture/adr/` for relevant ADRs
   - Why was this designed this way?
   - What trade-offs were made?
   - What assumptions were documented?

4. **Load Strategy Context** (if domain-specific)
   - Check `.specweave/docs/internal/strategy/` for requirements
   - What are the acceptance criteria (TC-0001, TC-0002)?
   - Are there non-functional requirements (performance, security)?

5. **Identify Bug Type**
   - **Code bug:** Implementation doesn't match spec → Fix code
   - **Spec bug:** Spec is unclear/wrong/incomplete → Update spec first, then code
   - **Missing spec:** Behavior undocumented (brownfield) → Create retroactive spec
   - **Architectural issue:** Design is fundamentally flawed → Create ADR, refactor

**🧠 Ultrathink Trigger:** If bug involves distributed systems, race conditions, security vulnerabilities, or complex architecture → Ask: "Should I **ultrathink** this bug to analyze edge cases?"

**Output of Phase 0:**
- Understanding of WHAT SHOULD HAPPEN (from specs)
- Understanding of HOW IT WAS DESIGNED (from plan/ADRs)
- Classification: Code bug vs Spec bug vs Architectural issue

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes
   - **Cross-reference with spec.md:** Does error indicate spec violation?

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess
   - **Check tests.md:** Is there already a test case for this scenario?

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences
   - **Check increment history:** Was this file modified in recent increments?

4. **Compare Behavior vs Specification**
   - What does spec.md say should happen?
   - What is actually happening?
   - Is the discrepancy:
     - Code not implementing spec? → Code bug
     - Spec unclear about this case? → Spec bug (update spec first)
     - Behavior not documented? → Missing spec (create retroactive spec)

5. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (frontend → API → database, CI → build → deploy):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify spec compliance at each layer
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (full-stack bug):**
   ```typescript
   // Frontend (React component)
   console.log('[Frontend] Sending request:', { userId, data });
   const response = await api.updateUser(userId, data);
   console.log('[Frontend] Received response:', response);

   // API route (Next.js)
   console.log('[API] Request received:', { params, body });
   const result = await db.users.update(userId, body);
   console.log('[API] DB result:', result);

   // Database layer (Prisma)
   console.log('[DB] Query:', { where: { id: userId }, data });
   ```

   **This reveals:** Which layer violates spec (frontend ✓, API ✗, DB ✓)

6. **Trace Data Flow** (Deep Call Stack Bugs)

   **WHEN error is deep in call stack:**

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - **Check spec:** Does source component have correct requirements?
   - Fix at source, not at symptom

7. **Check for Architectural Issues**

   **Signs of architectural problem (not just code bug):**
   - Multiple components affected by single change
   - Fix would require "massive refactoring"
   - Similar bugs keep appearing in different places
   - Design violates SOLID principles or best practices
   - **ADR contradicts current requirements** (requirements evolved)

   **If architectural issue detected:**
   - STOP normal debugging flow
   - Suggest: "This seems like an architectural issue. Should I **ultrathink** the design to propose a refactor?"
   - If confirmed, create ADR and new increment for refactoring

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples in Codebase**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?
   - **Check other increments:** Has this pattern been implemented successfully elsewhere?

2. **Compare Against Spec and References**
   - **Spec comparison:** Read spec.md section for this feature COMPLETELY
   - **ADR comparison:** Check if ADRs document this pattern
   - **Reference implementation:** If implementing external pattern, read reference completely
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"
   - **Spec differences:** Does working example follow spec more closely?

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?
   - **Check context-manifest.yaml:** Are all dependencies loaded?

5. **Consult SpecWeave Skills** (Domain-Specific Knowledge)
   - **For Next.js bugs:** Check `nextjs` skill for patterns
   - **For Node.js backend bugs:** Check `nodejs-backend` skill
   - **For Python bugs:** Check `python-backend` skill
   - **For .NET bugs:** Check `dotnet-backend` skill
   - **For frontend bugs:** Check `frontend` skill
   - **For E2E test failures:** Check `e2e-playwright` skill

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down explicitly
   - Be specific, not vague
   - **Include spec alignment:** "Code violates spec.md section Z by doing A instead of B"

2. **Classify Hypothesis Type**
   - **Code hypothesis:** "Function X has logic bug on line Y"
   - **Spec hypothesis:** "Spec.md doesn't cover edge case Z, causing confusion"
   - **Architecture hypothesis:** "Current design can't support requirement R"
   - **Test hypothesis:** "Test assumes incorrect behavior (test bug, not code bug)"

3. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once
   - **For spec hypotheses:** Update spec.md first, then verify code needs change

4. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top
   - **Count attempts:** How many hypotheses have you tested?

5. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - **Ultrathink option:** For complex bugs, suggest: "This is complex - should I **ultrathink** this to explore edge cases?"
   - Ask user for clarification
   - Research more (read docs, check StackOverflow, read source code)

6. **If 3+ Hypotheses Failed: Ultrathink Required**

   **After 3 failed attempts, STOP and ultrathink:**
   ```
   "I've tested 3 hypotheses without success. This suggests a deeper issue.
   Let me **ultrathink** this bug to:
   - Analyze edge cases thoroughly
   - Consider architectural implications
   - Trace full data flow across all components
   - Review thread safety / race conditions
   - Check for resource leaks or state corruption
   "
   ```

   **Ultrathink mode allocates 31,999 thinking tokens for:**
   - Deep call stack analysis
   - Race condition investigation
   - Memory leak detection
   - Security vulnerability analysis
   - Architectural pattern evaluation

### Phase 4: Implementation (with Spec Alignment)

**Fix the root cause at the right level:**

1. **Determine Fix Level**
   - **Code-level fix:** Code doesn't match spec → Fix code
   - **Spec-level fix:** Spec is wrong/unclear → Update spec.md FIRST, then code
   - **Test-level fix:** Test expects wrong behavior → Fix test
   - **Architecture-level fix:** Design is flawed → Create ADR + new increment for refactor

2. **Create Failing Test Case** (at appropriate level)

   **SpecWeave has 4 test levels - choose appropriately:**

   **Level 1: Specification Tests** (`.specweave/docs/internal/strategy/`)
   - For acceptance criteria violations
   - Format: TC-0001, TC-0002 in requirements.md

   **Level 2: Feature Tests** (`.specweave/increments/XXXX/tests.md`)
   - For feature-specific bugs
   - Update tests.md with new test case

   **Level 3: Code Tests** (`tests/` directory)
   - **Unit tests:** Single function/class bug
   - **Integration tests:** Multi-component interaction bug
   - **E2E tests:** User-facing workflow bug (use `e2e-playwright` skill)

   **Level 4: Skill Tests** (`src/skills/*/test-cases/`)
   - For skill-specific bugs
   - Create .yaml test case

   **Process:**
   - Write failing test that reproduces bug
   - MUST fail before fix (proves test catches the bug)
   - Test should be MINIMAL (smallest reproduction)
   - **For E2E tests:** Use `e2e-playwright` skill to create Playwright test

3. **Update Spec if Needed** (BEFORE code fix)

   **If bug revealed spec issue:**
   - Update `.specweave/increments/XXXX/spec.md` with clarified requirements
   - Add missing edge case documentation
   - Update acceptance criteria if needed
   - Commit spec changes BEFORE code changes

   **If bug revealed missing spec (brownfield):**
   - Create retroactive spec documenting intended behavior
   - Place in appropriate increment or create new increment
   - Document "as-is" behavior first, then planned changes

4. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring
   - **Follow spec:** Ensure fix aligns with updated spec.md

5. **Verify Fix**
   - Test passes now? ✓
   - No other tests broken? ✓
   - Issue actually resolved? ✓
   - **Spec alignment:** Does behavior match spec.md now? ✓
   - Run full test suite (not just the one test)

6. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: MANDATORY ULTRATHINK** (see Phase 4.7 below)
   - DON'T attempt Fix #4 without ultrathinking

7. **If 3+ Fixes Failed: Ultrathink Architecture** 🧠

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere
   - **Spec-code gap is too large** (fundamental design mismatch)

   **MANDATORY ULTRATHINK MODE:**
   ```
   "After 3 failed fixes, this is an architectural issue. Let me **ultrathink** this:

   Analyzing:
   - Is this pattern fundamentally sound?
   - Are we maintaining it through inertia?
   - What architectural refactor would eliminate this bug class?
   - What are the trade-offs of different refactoring approaches?
   - Should we create a new ADR to document this decision?
   "
   ```

   **Ultrathink will explore:**
   - Alternative architectural patterns
   - Refactoring strategies (strangler fig, big bang, incremental)
   - Impact analysis (what else breaks?)
   - Cost-benefit of refactor vs maintain
   - ADR recommendations

   **After ultrathink:**
   - Discuss with user before attempting more fixes
   - Create ADR if architectural decision is made
   - Create new increment for refactoring work
   - Update strategy docs if requirements changed

   **This is NOT a failed hypothesis - this is a wrong architecture.**

### Phase 5: Living Documentation Update (SpecWeave-Specific)

**After fix is verified, update documentation:**

1. **Update Increment Documentation**
   - **spec.md:** If requirements were clarified, update spec
   - **plan.md:** If implementation approach changed, document it
   - **tests.md:** Add new test case that caught this bug
   - **tasks.md:** Mark related task complete or add follow-up task

2. **Update Architecture Documentation** (if architectural change)
   - **Create ADR:** If architectural decision was made
     - Location: `.specweave/docs/internal/architecture/adr/XXXX-decision-title.md`
     - Document: Context, Decision, Consequences, Alternatives Considered
   - **Update system-design.md:** If component architecture changed
   - **Update component-design.md:** If internal design changed

3. **Update Strategy Documentation** (if requirements changed)
   - **requirements.md:** If functional/non-functional requirements clarified
   - **success-criteria.md:** If acceptance criteria updated

4. **Create New Increment** (if fix is substantial)
   - **When to create new increment:**
     - Fix involves > 3 files
     - Architectural refactoring
     - Breaking change
     - New feature added to fix bug (scope creep)
   - **Use:** `increment-planner` skill to create proper increment

5. **Commit with Proper Documentation**
   ```bash
   git add .
   git commit -m "$(cat <<'EOF'
   fix: [brief description of bug fix]

   Root cause: [what was broken and why]
   Solution: [what was changed and why this fixes it]
   Spec alignment: [how this aligns with spec.md or what spec was updated]

   Test coverage:
   - Added: [new test case]
   - Verified: [existing tests still pass]

   Documentation updated:
   - spec.md: [clarified requirements for edge case X]
   - tests.md: [added TC-007 for regression prevention]

   Fixes: #123 (if GitHub issue exists)

   🤖 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Update Context Manifest** (if dependencies changed)
   - Add new files to `context-manifest.yaml` if needed
   - Update max_context_tokens if context grew significantly

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **Proposing code fix before checking spec.md**
- **"One more fix attempt" (when already tried 2+) WITHOUT ultrathinking**
- **Each fix reveals new problem in different place**
- **"Spec is probably right, code is wrong"** (verify, don't assume)

**ALL of these mean: STOP. Return to Phase 0 and Phase 1.**

**If 3+ fixes failed:** MANDATORY ultrathink mode (see Phase 4.7)

## User Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- **"What does the spec say?"** - You skipped Phase 0
- **"Ultrathink this"** - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working
- **"Does that match the requirements?"** - Spec alignment check missed

**When you see these:** STOP. Return to Phase 0 and Phase 1.

## Ultrathink Debugging Mode 🧠

**What is Ultrathink Debugging?**
- Allocates **31,999 thinking tokens** for deep analysis
- Used for complex bugs requiring extensive reasoning
- Mandatory after 3 failed fix attempts
- Suggested for architectural issues, race conditions, security bugs

**When to Use Ultrathink:**

**Mandatory:**
- 3+ failed fix attempts (architectural issue)
- Security vulnerability analysis
- Distributed systems bugs (consensus, consistency, partitions)

**Suggested:**
- Race conditions or concurrency bugs
- Memory leaks or performance degradation
- Complex data flow across many components
- Novel bug patterns not seen before
- Brownfield code with no documentation

**How to Activate:**

**User-initiated:**
```
User: "This bug is complex - can you ultrathink it?"
```

**Agent-suggested:**
```
Assistant: "After 3 failed fixes, this is an architectural issue.
Let me **ultrathink** this to analyze:
- Alternative architectural patterns
- Race condition analysis
- Edge cases across distributed components
- Security implications
"
```

**Ultrathink Analysis Includes:**
- Full call stack analysis (every function, every parameter)
- State machine analysis (all possible states and transitions)
- Concurrency analysis (thread safety, locks, deadlocks)
- Data flow analysis (every transformation, every validation)
- Edge case exploration (boundary conditions, error paths)
- Architectural pattern evaluation (current vs alternatives)
- Security threat modeling (STRIDE, attack vectors)
- Performance bottleneck identification

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| **"Spec is probably right, no need to check"** | Specs can be wrong/unclear. Always verify. |
| **"One more fix attempt" (after 2+ failures)** | 3+ failures = architectural problem. **Ultrathink required.** |
| **"Ultrathink is overkill for this"** | If 3+ fixes failed, ultrathink is NOT overkill. |

## Quick Reference

| Phase | Key Activities | SpecWeave Additions | Success Criteria |
|-------|---------------|---------------------|------------------|
| **0. Context** | Load increment docs, ADRs, specs | Identify bug type, check spec alignment | Understand WHAT SHOULD HAPPEN |
| **1. Root Cause** | Read errors, reproduce, trace flow | Compare vs spec.md, check tests.md | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Check other increments, consult skills | Identify differences |
| **3. Hypothesis** | Form theory, test minimally, count attempts | Classify hypothesis type, ultrathink if 3+ failures | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Fix at right level (code/spec/architecture) | Bug resolved, tests pass, spec aligned |
| **5. Documentation** | Update docs, commit | Update spec/plan/tests, create ADR if needed | Living docs updated |

## When Process Reveals Different Bug Types

### Code Bug (Most Common)
- Spec is clear, code doesn't implement it correctly
- **Fix:** Update code to match spec
- **Update:** tests.md with new test case

### Spec Bug
- Code works as designed, but spec is wrong/unclear
- **Fix:** Update spec.md FIRST, then update code to match
- **Update:** spec.md, plan.md, tests.md

### Missing Spec (Brownfield)
- Behavior is undocumented
- **Fix:** Create retroactive spec documenting current behavior
- **Then:** Decide if current behavior is correct or needs fixing
- **Update:** Create increment with retroactive spec

### Architectural Bug
- Design is fundamentally flawed, can't support requirements
- **Fix:** **Ultrathink required** to propose refactoring approach
- **Update:** Create ADR, create new increment for refactoring

### Test Bug
- Code and spec are correct, test expects wrong behavior
- **Fix:** Update test to match spec
- **Update:** tests.md with corrected test case

## Integration with SpecWeave

### Relationship to Other Skills

**This skill coordinates with:**
- **increment-planner** - Create new increment for large fixes
- **e2e-playwright** - Create E2E tests for UI bugs
- **nextjs** / **nodejs-backend** / **python-backend** / **dotnet-backend** - Domain-specific debugging patterns
- **frontend** - React/Vue/Angular debugging patterns
- **diagrams-architect** - Create sequence diagrams for complex data flow
- **context-loader** - Load relevant context for bug investigation

### Relationship to SpecWeave Agents

**This skill may invoke:**
- **tech-lead** agent - Code review of complex fixes
- **security** agent - Security vulnerability analysis (use ultrathink)
- **sre** agent - Production incident investigation
- **architect** agent - Architectural refactoring proposals
- **qa-lead** agent - Test strategy for regression prevention

### Documentation Flow

```
Bug reported
  ↓
Phase 0: Load context (spec.md, plan.md, ADRs)
  ↓
Phase 1-3: Investigate, analyze, test hypothesis
  ↓
Phase 4: Implement fix (code or spec)
  ↓
Phase 5: Update living docs
  ├─ spec.md (if requirements clarified)
  ├─ plan.md (if implementation changed)
  ├─ tests.md (add test case)
  ├─ ADR (if architectural decision)
  └─ Commit with documentation
```

## Real-World Impact

From debugging sessions:
- **Systematic approach:** 15-30 minutes to fix (with docs)
- **Random fixes approach:** 2-3 hours of thrashing (no docs)
- **First-time fix rate:** 95% vs 40%
- **New bugs introduced:** Near zero vs common
- **Spec-code alignment:** Maintained vs diverges
- **Regression prevention:** Tests created vs no tests
- **Ultrathink for complex bugs:** 30-45 minutes deep analysis vs days of random attempts

## Summary

**spec-driven-debugging** extends systematic debugging with SpecWeave's spec-driven methodology:

1. ✅ **Phase 0: Context loading** - Load specs, ADRs, increment docs
2. ✅ **Spec alignment checks** - Verify behavior matches requirements
3. ✅ **Multi-level testing** - Create tests at appropriate level (spec/feature/code/skill)
4. ✅ **Living documentation** - Update specs, plans, ADRs after fix
5. ✅ **Ultrathink mode** - Deep analysis for complex bugs (31,999 tokens)
6. ✅ **Architectural awareness** - Recognize design issues vs code bugs
7. ✅ **Brownfield support** - Create retroactive specs for undocumented code

**The Iron Law remains:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION + SPEC ALIGNMENT CHECK.

**New addition:** 3+ failed fixes = MANDATORY ULTRATHINK.
