---
description: Refactor code with test safety net to improve quality. Use when saying "TDD refactor", "refactor with tests", or "improve code quality".
---

# TDD Refactor Phase - Improve Code Quality

Refactor code with confidence using comprehensive test safety net.

## Usage

Use Task tool with subagent_type="general-purpose" to perform safe refactoring.

Prompt: "Refactor this code while keeping all tests green: $ARGUMENTS. Apply TDD refactor phase:

1. **Pre-Assessment**: Run tests to establish green baseline, analyze code smells, document current metrics
2. **Code Smell Detection**: Duplicated code, long methods, large classes, long parameter lists, feature envy, dead code
3. **Refactoring Techniques**: Extract Method/Variable/Interface, inline unnecessary indirection, rename for clarity, move to appropriate classes, replace conditionals with polymorphism
4. **Incremental Steps**: Small atomic changes, run tests after each modification, commit after each successful refactoring, keep separate from behavior changes
5. **Safety Verification**: Run full test suite after each change, check for performance regressions, maintain/improve code coverage

Output:
- Refactored code with improvements applied
- Test results (all green)
- Before/after metrics comparison
- Applied refactoring techniques list"

## Safety Checklist

Before committing:
- All tests pass (100% green)
- No functionality regression
- Performance metrics acceptable
- Code coverage maintained/improved

## Recovery

If tests fail: immediately revert last change, identify breaking refactoring, apply smaller incremental changes.

Code to refactor: $ARGUMENTS

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#tdd-refactor)
