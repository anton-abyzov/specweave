---
name: tdd-workflow
description: Test-Driven Development discovery hub that detects TDD intent and guides the red-green-refactor cycle. Use when wanting to write tests first, implement TDD workflow, or learn test-first development practices. Routes to appropriate TDD commands (/sw:tdd-red, /sw:tdd-green, /sw:tdd-refactor).
---

# TDD Workflow - Discovery & Coordination Skill

## Purpose

This skill acts as a **discovery hub** for Test-Driven Development (TDD) in SpecWeave. It:
- ✅ Detects when users want to implement features with TDD
- ✅ Asks user preference for TDD workflow enforcement
- ✅ Routes to appropriate TDD tools (commands vs agent)
- ✅ Provides TDD education and best practices

**NOT a full TDD implementation** - delegates to:
- `tdd-orchestrator` agent (deep TDD expertise)
- `/sw:tdd:cycle` command (enforced red-green-refactor)
- Individual phase commands (`/sw:tdd:red`, `/sw:tdd:green`, `/sw:tdd:refactor`)

---

## When to Activate

**Automatic activation when user mentions**:
- "implement with TDD"
- "use test-driven development"
- "red-green-refactor"
- "write tests first"
- "test-first approach"
- "Kent Beck style"
- "TDD discipline"

**Example triggers**:
```
User: "Implement authentication with TDD"
User: "Use test-driven development for this feature"
User: "Let's do red-green-refactor for the payment module"
```

---

## Workflow

### Step 1: Detect TDD Intent

When activated, confirm user's TDD intent:

```
"I detected you want to use Test-Driven Development (TDD).

TDD follows the red-green-refactor cycle:
🔴 RED: Write a failing test first
🟢 GREEN: Write minimal code to make it pass
🔵 REFACTOR: Improve code while keeping tests green

Would you like to:"
```

### Step 2: Offer TDD Options

**Use AskUserQuestion tool** to present choices:

```typescript
Question: "How would you like to implement TDD for this feature?"
Options:
  1. "Guided TDD Workflow (/sw:tdd:cycle)"
     Description: "Full red-green-refactor cycle with gates between phases.
                   Can't proceed to GREEN without RED test. Most rigorous."

  2. "Expert TDD Agent (tdd-orchestrator)"
     Description: "Deep TDD expertise with flexible workflow.
                   Best for complex scenarios, property-based testing, legacy code."

  3. "Manual TDD (I'll guide myself)"
     Description: "I'll implement TDD discipline myself.
                   You provide TDD advice when needed."
```

### Step 3: Route Based on Choice

**Option 1: Guided TDD Workflow**
```bash
Invoke: /sw:tdd:cycle

This command orchestrates:
1. /sw:tdd:red    - Write failing test (blocks until red)
2. /sw:tdd:green  - Implement minimal code (blocks until green)
3. /sw:tdd:refactor - Refactor safely (tests must stay green)

Benefits:
- Enforces discipline (gates prevent skipping phases)
- Perfect for beginners or teams learning TDD
- Integrates with SpecWeave increment workflow
```

**Option 2: Expert TDD Agent**
```bash
Invoke: tdd-orchestrator agent (via Task tool)

This agent provides:
- Multi-agent TDD workflow coordination
- Property-based testing (QuickCheck, Hypothesis)
- Mutation testing for test quality
- Legacy code refactoring with safety nets
- BDD/ATDD integration
- AI-assisted test generation

Benefits:
- Flexible workflow (not rigid gates)
- Advanced techniques (property-based, mutation)
- Best for experienced TDD practitioners
- Handles complex scenarios
```

**Option 3: Manual TDD**
```bash
Provide TDD best practices:

"I'll implement your feature while following TDD principles.
I'll ensure:
- Tests written before implementation
- Minimal code to pass tests
- Refactoring with test coverage
- Clear red→green→refactor progression

I'll notify you at each phase transition."
```

---

## TDD Best Practices (Reference)

### Red Phase 🔴
- Write the simplest test that fails
- Test should compile but fail on assertion
- Focus on WHAT, not HOW
- One test at a time

### Green Phase 🟢
- Write minimal code to pass the test
- Embrace "fake it till you make it"
- Hardcoded values acceptable initially
- Get to green FAST

### Refactor Phase 🔵
- Improve code structure
- Extract methods, remove duplication
- Tests must stay green
- Commit after each refactor

### TDD Anti-Patterns to Avoid
- ❌ Writing implementation before test
- ❌ Writing multiple tests before implementation
- ❌ Over-engineering in GREEN phase
- ❌ Refactoring without tests passing
- ❌ Skipping refactor phase

---

## Integration with SpecWeave

**In Increment Workflow**:
```
/sw:inc "Authentication feature" → spec.md created
↓
User: "Implement with TDD"
↓
tdd-workflow skill activates → offers options
↓
User chooses: Guided TDD Workflow
↓
/sw:tdd:cycle invoked
  ↓
  Phase 1: RED   - tests.md updated with failing tests
  Phase 2: GREEN - tasks.md implementation
  Phase 3: REFACTOR - code improvements
↓
Increment tasks completed with TDD discipline
```

**With spec-driven-debugging**:
```
Bug found → spec-driven-debugging activates
↓
Fix proposal includes: "Add regression test first (TDD RED phase)"
↓
tdd-workflow can coordinate test-first bug fixes
```

---

## Commands Reference

### Full Cycle
- `/sw:tdd:cycle` - Complete red-green-refactor orchestration

### Individual Phases
- `/sw:tdd:red` - RED phase only (write failing test)
- `/sw:tdd:green` - GREEN phase only (make test pass)
- `/sw:tdd:refactor` - REFACTOR phase only (improve code)

### When to Use Each

**Use /sw:tdd:cycle when**:
- ✅ Starting new feature from scratch
- ✅ Learning TDD or teaching team
- ✅ Want enforced discipline (gates)
- ✅ Working in increment-based workflow

**Use individual commands when**:
- ✅ Already in middle of TDD cycle
- ✅ Need to repeat a phase (e.g., multiple refactors)
- ✅ Want finer control over cycle
- ✅ Integrating with other workflows

**Use tdd-orchestrator agent when**:
- ✅ Complex scenarios (property-based testing)
- ✅ Legacy code refactoring
- ✅ Multi-agent coordination needed
- ✅ Advanced TDD techniques required

---

## Example Interactions

### Example 1: Beginner TDD User

**User**: "I want to implement user registration with TDD"

**tdd-workflow**:
```
Great! TDD (Test-Driven Development) follows red-green-refactor:
🔴 RED: Write failing test
🟢 GREEN: Make it pass
🔵 REFACTOR: Improve code

[Presents AskUserQuestion with 3 options]
```

**User selects**: "Guided TDD Workflow"

**tdd-workflow**:
```
Perfect! I'm invoking /sw:tdd:cycle to orchestrate your TDD workflow.

🔴 Starting RED phase...
Write a failing test for user registration. Let me create the test skeleton:

[Creates test file with failing test]

✅ Test written and failing. Run: npm test
❌ Expected failure confirmed.

Ready to proceed to GREEN phase? (type 'yes' or run /sw:tdd:green)
```

---

### Example 2: Experienced TDD User

**User**: "Refactor auth module with TDD safety nets"

**tdd-workflow**:
```
I see you want to refactor with TDD discipline.

[Presents AskUserQuestion]
```

**User selects**: "Expert TDD Agent"

**tdd-workflow**:
```
Invoking tdd-orchestrator agent for advanced refactoring support...

[tdd-orchestrator agent takes over with:]
- Characterization tests for legacy code
- Golden master testing
- Seam identification
- Incremental refactoring with safety nets
```

---

### Example 3: Mid-Cycle TDD

**User**: "I'm in GREEN phase, tests passing, ready to refactor"

**tdd-workflow**:
```
Great! Tests are passing. Time for REFACTOR phase.

You can:
1. Run /sw:tdd:refactor (guided refactoring)
2. Refactor manually (I'll verify tests stay green)

Which would you prefer?
```

**User**: "I'll refactor manually"

**tdd-workflow**:
```
Perfect! I'll monitor your refactoring:

✅ Tests passing before refactor
[User refactors code]
✅ Tests still passing after refactor
✅ TDD cycle maintained

Ready for next feature? Run /sw:tdd:cycle or continue manually.
```

---

## Configuration

**Optional**: Customize TDD preferences in `.specweave/config.yaml`:

```yaml
tdd:
  default_workflow: "cycle"  # Options: "cycle", "agent", "manual"
  auto_activate: true         # Auto-offer TDD on new features
  gates_enabled: true         # Enforce phase gates in cycle mode
  mutation_testing: false     # Enable mutation testing (requires setup)
```

---

## Success Criteria

**This skill succeeds when**:
- ✅ Users are offered TDD workflow when appropriate
- ✅ TDD choice is explicit (not assumed)
- ✅ Clear routing to appropriate tool (command vs agent)
- ✅ TDD education embedded in workflow
- ✅ Flexible enough for beginners and experts
- ✅ Integrates seamlessly with SpecWeave increments

---

## Related Skills & Agents

**Skills**:
- `spec-driven-debugging` - Bug fixes can use TDD approach
- `increment-planner` - Increments can specify TDD as methodology
- `e2e-playwright` - E2E tests can follow TDD for acceptance tests

**Agents**:
- `tdd-orchestrator` - Deep TDD expertise (invoked by this skill)
- `qa-lead` - Test strategy overlaps with TDD principles

**Commands**:
- `/sw:tdd:cycle` - Full red-green-refactor orchestration
- `/sw:tdd:red`, `/sw:tdd:green`, `/sw:tdd:refactor` - Individual phases

---

## Summary

**tdd-workflow** is a lightweight discovery skill that:

1. ✅ **Detects** TDD intent from user messages
2. ✅ **Asks** user preference for TDD enforcement level
3. ✅ **Routes** to appropriate tool (guided commands vs expert agent)
4. ✅ **Educates** on TDD principles and best practices
5. ✅ **Integrates** with SpecWeave increment workflow

**Not a replacement for**:
- `tdd-orchestrator` agent (deep expertise)
- `/sw:tdd-*` commands (workflow enforcement)

**Instead, it's the entry point** that helps users choose the right TDD tool for their context.

---

**Keywords**: TDD, test-driven development, red-green-refactor, test-first, Kent Beck, TDD cycle, property-based testing, mutation testing, refactoring, test discipline
