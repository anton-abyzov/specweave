## TDD Contract

**This increment uses Test-Driven Development (TDD).**

For EVERY feature you implement, follow the RED-GREEN-REFACTOR cycle:

1. **RED**: Write failing test FIRST
   - Define expected behavior in test code
   - Run test to confirm it FAILS
   - No implementation code yet!

2. **GREEN**: Write minimal code to pass
   - Only enough code to make test pass
   - Hardcoded values are OK at this stage
   - Don't optimize or generalize

3. **REFACTOR**: Improve code quality
   - Extract methods, remove duplication
   - Improve naming and structure
   - Keep tests GREEN throughout

**FORBIDDEN in TDD mode:**
- Writing implementation before test
- Writing test after implementation
- Skipping tests for "simple" features
- Marking GREEN task complete before RED task

**Task Dependencies:**
- `[GREEN]` tasks depend on their `[RED]` counterpart
- `[REFACTOR]` tasks depend on their `[GREEN]` counterpart
- Always complete tasks in order: RED → GREEN → REFACTOR

---
