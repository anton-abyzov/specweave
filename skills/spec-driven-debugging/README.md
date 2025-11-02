---
name: spec-driven-debugging
description: Systematic debugging framework integrated with SpecWeave's spec-driven development methodology. Ensures root cause investigation AND spec alignment before proposing fixes. Includes ultrathink mode for complex bugs (31,999 thinking tokens).
---

# Spec-Driven Debugging Skill

## Overview

The **spec-driven-debugging** skill extends systematic debugging with SpecWeave's spec-driven development methodology. It ensures that every bug is investigated for root cause AND checked against specifications before proposing fixes.

**Core principle:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION + SPEC ALIGNMENT CHECK

This prevents:
- ❌ Random fixes that waste time
- ❌ Symptom patches that mask underlying issues
- ❌ Spec-code divergence
- ❌ Repeat bugs due to missing regression tests
- ❌ Architectural issues mistaken for code bugs

## Purpose

This skill bridges the gap between **"There's a bug"** and **"Bug fixed with full understanding and documentation."**

It helps developers:
- **Investigate systematically** instead of guessing
- **Verify spec alignment** before fixing code
- **Create retroactive specs** for brownfield code
- **Identify architectural issues** vs simple code bugs
- **Use ultrathink mode** for complex distributed systems bugs
- **Update living documentation** after every fix
- **Prevent regressions** with proper test cases

## Inspired By

This skill is **adapted from** [obra/superpowers systematic-debugging skill](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) and enhanced for SpecWeave's spec-driven workflow.

**Key differences from the original:**
- ✅ **Phase 0: Context Loading** - Loads spec.md, plan.md, ADRs before investigating
- ✅ **Spec alignment checks** - Compares behavior vs specification at every phase
- ✅ **Brownfield support** - Creates retroactive specs for undocumented code
- ✅ **Ultrathink integration** - Deep reasoning mode (31,999 tokens) for complex bugs
- ✅ **Multi-level testing** - Creates tests at appropriate level (spec/feature/code/skill)
- ✅ **Living documentation updates** - Updates spec/plan/tests/ADRs after fix
- ✅ **Architectural awareness** - Recognizes design issues vs code bugs (triggers after 3 failed fixes)
- ✅ **SpecWeave agent integration** - Coordinates with Tech Lead, Security, SRE agents

## When to Use This Skill

### ✅ Use spec-driven-debugging for:
- **Any bug or test failure** (production or development)
- **Unexpected behavior** different from spec.md
- **Performance problems or degradation**
- **Security vulnerabilities**
- **Race conditions or concurrency bugs**
- **Build or deployment failures**
- **Integration issues between components**
- **Brownfield code** with no documentation
- **After 2 failed fix attempts** (3rd requires systematic approach)

### ⚠️ ESPECIALLY use when:
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- Previous fix didn't work (don't try fix #4 without this process)
- You don't fully understand the issue
- **Behavior differs from spec.md** (spec-code misalignment)
- **Complex distributed systems** (use ultrathink)

### ❌ Never skip when:
- Issue seems simple (simple bugs need root causes too)
- You're in a hurry (systematic is faster than thrashing)
- Manager wants it fixed NOW (prevents rework)

## The Five-Phase Framework

### Phase 0: Context Loading (SpecWeave-Specific) 🆕
**BEFORE investigating, understand WHAT SHOULD HAPPEN**

1. **Check if bug is in SpecWeave increment**
   - Find increment containing buggy code
   - Load spec.md (WHAT and WHY)
   - Load plan.md (HOW it was designed)
   - Load tests.md (test coverage)
   - Check tasks.md (was this a known issue?)

2. **Load architecture context**
   - Read relevant ADRs (design decisions)
   - Understand trade-offs and assumptions
   - Check if requirements evolved since design

3. **Classify bug type**
   - **Code bug:** Code doesn't match spec → Fix code
   - **Spec bug:** Spec is wrong/unclear → Update spec first
   - **Missing spec:** Undocumented (brownfield) → Create retroactive spec
   - **Architectural issue:** Design is flawed → Create ADR, refactor

4. **🧠 Ultrathink trigger**
   - Complex distributed systems? → Suggest ultrathink
   - Race conditions? → Suggest ultrathink
   - Security vulnerability? → Suggest ultrathink

### Phase 1: Root Cause Investigation
**FIND THE TRUE CAUSE**

1. **Read error messages carefully** (don't skip!)
2. **Reproduce consistently** (exact steps)
3. **Check recent changes** (git diff, dependencies)
4. **Compare behavior vs spec.md** (does code match requirements?)
5. **Add instrumentation** for multi-component systems (log at every boundary)
6. **Trace data flow** (where does bad value originate?)
7. **Check for architectural issues** (multiple components affected?)

**🧠 If architectural issue detected:** STOP and suggest ultrathink

### Phase 2: Pattern Analysis
**FIND THE PATTERN**

1. **Find working examples** in codebase (similar working code)
2. **Compare against spec and references** (read spec.md completely, check ADRs)
3. **Identify differences** (what's different between working and broken?)
4. **Understand dependencies** (what does this need to work?)
5. **Consult SpecWeave skills** (nextjs, nodejs-backend, python-backend, etc.)

### Phase 3: Hypothesis and Testing
**TEST SCIENTIFICALLY**

1. **Form single hypothesis** ("I think X because Y")
2. **Classify hypothesis** (code bug vs spec bug vs architecture)
3. **Test minimally** (smallest possible change, one variable)
4. **Verify before continuing** (did it work? count attempts)
5. **When you don't know:** Say it! Don't pretend.
6. **🧠 If 3+ hypotheses failed:** MANDATORY ULTRATHINK

**Ultrathink after 3 failures analyzes:**
- Edge cases thoroughly
- Architectural implications
- Race conditions and thread safety
- Security vulnerabilities
- Alternative patterns

### Phase 4: Implementation (with Spec Alignment)
**FIX AT THE RIGHT LEVEL**

1. **Determine fix level**
   - Code fix → Update code
   - Spec fix → Update spec.md FIRST, then code
   - Test fix → Fix test expectations
   - Architecture fix → Create ADR + new increment for refactor

2. **Create failing test** at appropriate level:
   - **Level 1:** Specification tests (TC-0001 in requirements.md)
   - **Level 2:** Feature tests (tests.md in increment)
   - **Level 3:** Code tests (tests/ directory - unit/integration/E2E)
   - **Level 4:** Skill tests (test-cases/ in skill)

3. **Update spec if needed** (BEFORE code fix if spec was unclear)
4. **Implement single fix** (one change, no "while I'm here" improvements)
5. **Verify fix** (test passes, no other tests broken, spec aligned)
6. **🧠 If 3+ fixes failed:** MANDATORY ULTRATHINK ARCHITECTURE ANALYSIS

**After 3 failed fixes, ultrathink explores:**
- Is this pattern fundamentally sound?
- What architectural refactor would eliminate this bug class?
- Trade-offs of different refactoring approaches
- Should we create ADR to document decision?

7. **Create ADR if architectural decision made**

### Phase 5: Living Documentation Update (SpecWeave-Specific) 🆕
**UPDATE DOCUMENTATION AFTER FIX**

1. **Update increment documentation**
   - spec.md (if requirements clarified)
   - plan.md (if implementation changed)
   - tests.md (add regression test)
   - tasks.md (mark complete or add follow-up)

2. **Update architecture documentation** (if architectural change)
   - Create ADR (decision, context, consequences)
   - Update system-design.md
   - Update component-design.md

3. **Update strategy documentation** (if requirements changed)
   - requirements.md (functional/non-functional)
   - success-criteria.md (acceptance criteria)

4. **Create new increment** if fix is substantial (>3 files, breaking change)

5. **Commit with proper documentation** (include root cause, solution, spec alignment, test coverage)

6. **Update context manifest** (if dependencies changed)

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
NO FIXES WITHOUT CHECKING SPEC ALIGNMENT
```

**New addition:** 3+ failed fixes = MANDATORY ULTRATHINK

If you haven't completed Phase 0 and Phase 1, you cannot propose fixes.

## Ultrathink Debugging Mode 🧠

**What is Ultrathink?**
- Allocates **31,999 thinking tokens** for deep analysis
- Most powerful thinking mode available in Claude Code
- Enables comprehensive edge case exploration and architectural evaluation

**When to Use Ultrathink:**

**Mandatory (automatic activation):**
- ✅ After 3 failed fix attempts (architectural issue)
- ✅ Security vulnerability requiring threat modeling
- ✅ Distributed systems consensus/consistency bugs

**Suggested (agent recommends):**
- ⚠️ Race conditions or concurrency bugs
- ⚠️ Memory leaks or performance degradation
- ⚠️ Complex data flow across many components
- ⚠️ Novel bug patterns not seen before
- ⚠️ Brownfield code with no documentation

**How to Activate:**

**User requests:**
```
User: "This bug is complex - can you ultrathink it?"
```

**Agent suggests (after 3 failed fixes):**
```
Assistant: "After 3 failed fixes, this is an architectural issue.
Let me **ultrathink** this to analyze:
- Alternative architectural patterns
- Race condition analysis across all components
- Edge cases in distributed system
- Security implications
- Refactoring strategies with trade-offs
"
```

**Ultrathink Analysis Includes:**
- ✅ Full call stack analysis (every function, parameter, state)
- ✅ Concurrency analysis (thread safety, deadlocks, race conditions)
- ✅ Data flow analysis (every transformation, validation)
- ✅ Edge case exploration (boundary conditions, error paths)
- ✅ Architectural pattern evaluation (current vs alternatives)
- ✅ Security threat modeling (STRIDE, attack vectors)
- ✅ Performance bottleneck identification

**Thinking Token Levels:**
- `think` - 4,000 tokens (simple problems)
- `megathink` - 10,000 tokens (moderate complexity)
- `ultrathink` - 31,999 tokens (high complexity) ← **For complex debugging**

## Bug Types and Fix Strategies

| Bug Type | Detection | Fix Strategy | Documentation |
|----------|-----------|--------------|---------------|
| **Code Bug** | Spec clear, code wrong | Fix code to match spec | Update tests.md |
| **Spec Bug** | Code correct, spec unclear | Update spec.md FIRST, then code | Update spec.md, plan.md, tests.md |
| **Missing Spec** | Behavior undocumented (brownfield) | Create retroactive spec, decide if correct | Create increment with spec |
| **Architectural Bug** | Design flawed, 3+ fixes failed | **Ultrathink** → Create ADR → Refactor | Create ADR, update architecture docs |
| **Test Bug** | Code & spec correct, test wrong | Fix test expectations | Update tests.md |

## Test Cases

This skill includes **3 comprehensive test cases**:

### TC-001: Simple Authentication Bug with Spec Alignment
- **Scenario:** Login failing with "401 Unauthorized" even with correct credentials
- **Root cause:** bcrypt.compare() arguments reversed
- **Focus:** Spec alignment check, data flow tracing, simple fix
- **Phases:** Context loading → Root cause → Pattern analysis → Single hypothesis → Fixed first try
- **Complexity:** Low (code bug)
- **Time:** 15-20 minutes

### TC-002: Race Condition Bug Requiring Ultrathink
- **Scenario:** Task queue occasionally processes same task twice (violates exactly-once delivery)
- **Root cause:** Race condition between Redis lock and DB idempotency check
- **Focus:** Deep ultrathink analysis, architectural refactoring, ADR creation
- **Phases:** Context loading → 3 failed hypotheses → **ULTRATHINK** → Architectural fix → ADR
- **Complexity:** High (distributed systems, concurrency)
- **Time:** 45-60 minutes (includes ultrathink)
- **Ultrathink findings:**
  - Analyzed 3 alternative architectures
  - Identified fundamental design flaw (two separate consistency mechanisms)
  - Recommended hybrid approach (Redis pre-filter + DB source of truth)

### TC-003: Brownfield Bug with Missing Spec
- **Scenario:** Payment webhook randomly failing with "Invalid signature" (20% failure rate)
- **Root cause:** Express middleware parsing large webhook bodies (>5mb) as JSON
- **Focus:** Retroactive spec creation, brownfield documentation, middleware configuration
- **Phases:** No spec found → Create retroactive spec → Debug with spec → Fix → Full documentation
- **Complexity:** Medium (brownfield, requires business context gathering)
- **Time:** 30-40 minutes
- **Documentation created:**
  - Retroactive spec.md, plan.md, tests.md
  - ADR-0013 for webhook middleware pattern
  - Strategy doc for payment webhooks

## Red Flags - When You're Violating the Process

**STOP immediately if you catch yourself thinking:**
- ❌ "Quick fix for now, investigate later"
- ❌ "Just try changing X and see if it works"
- ❌ "Add multiple changes, run tests"
- ❌ "Skip the test, I'll manually verify"
- ❌ "I don't fully understand but this might work"
- ❌ Proposing solutions before tracing data flow
- ❌ **Proposing code fix before checking spec.md**
- ❌ **"One more fix attempt" (after 2 failures) WITHOUT ultrathinking**
- ❌ **Each fix reveals new problem in different place** (architectural issue!)

**ALL of these mean:** STOP. Return to Phase 0 and Phase 1.

**If 3+ fixes failed:** MANDATORY ultrathink (not optional)

## Integration with SpecWeave

### Relationship to Other Skills

**This skill coordinates with:**
- **increment-planner** - Create new increment for large fixes or retroactive specs
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
- **architect** agent - Architectural refactoring proposals (after 3 failed fixes + ultrathink)
- **qa-lead** agent - Test strategy for regression prevention

### Documentation Flow

```
Bug reported
  ↓
Phase 0: Load context (spec.md, plan.md, ADRs)
  ↓ (understand WHAT SHOULD HAPPEN)
Phase 1-3: Investigate, analyze, test hypothesis
  ↓ (find root cause, test scientifically)
Phase 4: Implement fix at right level (code/spec/architecture)
  ↓ (create test, fix, verify)
Phase 5: Update living docs
  ├─ spec.md (if requirements clarified)
  ├─ plan.md (if implementation changed)
  ├─ tests.md (add regression test)
  ├─ ADR (if architectural decision)
  └─ Commit with full documentation
```

## Key Principles

| Principle | Application |
|-----------|-------------|
| **Root cause first** | NEVER fix symptoms, always find true cause |
| **Spec alignment** | Check spec.md before assuming code is wrong |
| **Scientific method** | Form hypothesis, test minimally, verify |
| **One change at a time** | No bundled fixes (can't isolate what worked) |
| **Test before fix** | Failing test proves you caught the bug |
| **Count attempts** | After 3 failures → ultrathink required |
| **Brownfield support** | Create retroactive spec before debugging |
| **Living documentation** | Update docs after every fix |
| **Ultrathink for complexity** | Use 31,999 thinking tokens for hard bugs |

## Common Rationalizations (Don't Fall for These!)

| Excuse | Reality | What to Do |
|--------|---------|-----------|
| "Issue is simple, don't need process" | Simple bugs have root causes too | Follow process (it's fast for simple bugs) |
| "Emergency, no time for process" | Systematic is FASTER than thrashing | Use process to avoid wasted hours |
| "Just try this first, investigate later" | First fix sets bad pattern | Do it right from start |
| "I'll write test after fix works" | Untested fixes don't stick | Test first, proves you caught it |
| "Multiple fixes save time" | Can't isolate what worked | One change at a time |
| "Spec is probably right, no need to check" | Specs can be wrong | Always verify spec alignment |
| **"One more fix" (after 2+ failures)** | 3+ = architectural problem | **ULTRATHINK REQUIRED** |
| **"Ultrathink is overkill"** | If 3+ fixes failed, it's NOT | Use 31,999 tokens to understand |

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|-------------------|
| Skipping Phase 0 | Don't know what SHOULD happen | Load spec.md, plan.md, ADRs first |
| Proposing fixes immediately | Random guessing wastes time | Complete Phase 1 investigation |
| Testing multiple changes | Can't isolate root cause | One variable at a time |
| Skipping test creation | Can't verify fix, might regress | Create failing test first |
| Ignoring spec misalignment | Spec-code divergence grows | Update spec if unclear |
| Continuing after 3 failures | Architectural issue unrecognized | STOP and ultrathink |
| Not updating documentation | Knowledge lost, bugs repeat | Phase 5: Update living docs |

## Real-World Impact

From debugging sessions using this framework:

**Systematic + SpecWeave approach:**
- ⏱️ **Time to fix:** 15-30 minutes (with full documentation)
- ✅ **First-time fix rate:** 95%
- 📚 **Documentation:** Spec/plan/tests updated
- 🔁 **Regressions:** Near zero (tests prevent)
- 🏗️ **Architecture:** Issues identified early

**Random fixes approach (old way):**
- ⏱️ **Time to fix:** 2-3 hours of thrashing
- ❌ **First-time fix rate:** 40%
- 📚 **Documentation:** None (divergence grows)
- 🔁 **Regressions:** Common (no tests)
- 🏗️ **Architecture:** Issues accumulate

**Ultrathink for complex bugs:**
- ⏱️ **Time:** 30-45 minutes deep analysis
- 🧠 **Alternative:** Days of random attempts
- 🎯 **Success rate:** Identifies architectural issues that would take weeks to find

## Installation

This skill is part of the SpecWeave framework. To install:

```bash
# From SpecWeave project root:
npm run install:skills

# Or install this specific skill to .claude/ (local project):
cp -r src/skills/spec-driven-debugging ~/.claude/skills/

# Restart Claude Code after installation
```

## Activation Triggers

This skill activates automatically when users say:
- "This bug is failing..."
- "Why is [feature] not working?"
- "Help me debug [problem]"
- "Test is failing with [error]"
- "Investigate [unexpected behavior]"
- "Ultrathink this bug" (activates deep reasoning mode)
- "Fix [issue]" (automatically applies systematic debugging)

## Contributing

This skill is part of the SpecWeave framework. To contribute:

1. **Edit the source:** `src/skills/spec-driven-debugging/SKILL.md`
2. **Update test cases:** Add `.yaml` files to `test-cases/` directory
3. **Test the skill:** Use SpecWeave's skill testing framework
4. **Run installation:** `npm run install:skills` to sync to `.claude/`
5. **Create PR:** Follow SpecWeave's contribution guidelines

## License

This skill is part of SpecWeave and licensed under [LICENSE].

**Acknowledgment:** Adapted from [obra/superpowers systematic-debugging skill](https://github.com/obra/superpowers) by Jesse Vincent. Thank you to the superpowers project for the excellent systematic debugging framework!

## Summary

**spec-driven-debugging** extends systematic debugging with SpecWeave's spec-driven methodology:

1. ✅ **The Iron Law:** NO FIXES WITHOUT ROOT CAUSE + SPEC ALIGNMENT CHECK
2. ✅ **Phase 0: Context loading** - Load specs, ADRs, increment docs FIRST
3. ✅ **Spec alignment checks** - Verify behavior matches requirements
4. ✅ **Brownfield support** - Create retroactive specs for undocumented code
5. ✅ **Multi-level testing** - Create tests at appropriate level (spec/feature/code/skill)
6. ✅ **Ultrathink mode** - Deep analysis (31,999 tokens) for complex bugs
7. ✅ **Architectural awareness** - Recognize design issues vs code bugs
8. ✅ **Mandatory ultrathink** - After 3 failed fixes (not optional!)
9. ✅ **Living documentation** - Update spec/plan/tests/ADRs after every fix
10. ✅ **SpecWeave integration** - Coordinates with agents and skills

**Result:** Bugs fixed correctly the first time, with full understanding, proper tests, and updated documentation. No guessing, no rework, no spec-code divergence.
