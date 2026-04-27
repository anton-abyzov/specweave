---
description: "[DEPRECATED] Refactor code with test safety net to improve quality. Use when saying \"TDD refactor\", \"refactor with tests\", or \"improve code quality\"."
version: 1.0.0
deprecated: true
---

> ⚠️ DEPRECATED: Use `sw:tdd-cycle --phase refactor` instead. This skill will be removed in v1.3.0.

## Migration

This skill has been deprecated as part of the Opus 4.7 framework alignment (increment 0669).

- **Use instead**: `sw:tdd-cycle --phase refactor` runs only the REFACTOR phase (improve code quality with test safety net)
- **Removal**: Scheduled for v1.3.0 (2 minor releases after v1.1.0)
- **Why**: The three TDD phase skills (tdd-red, tdd-green, tdd-refactor) were consolidated into `sw:tdd-cycle` with a `--phase` flag. Alias routing in `marketplace.json` redirects `/sw:tdd-refactor` → `/sw:tdd-cycle --phase refactor` automatically.

For the migration policy, see `.specweave/docs/internal/specs/skill-deprecation-policy.md`.

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
