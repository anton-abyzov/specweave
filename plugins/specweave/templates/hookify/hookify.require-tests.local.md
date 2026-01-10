---
name: require-tests-before-commit
enabled: false
event: bash
action: warn
conditions:
  - field: command
    operator: regex_match
    pattern: git\s+commit
---

**Committing without running tests?**

Best practice is to run tests before committing:
- `npm test` - Unit tests
- `npx vitest run` - Vitest
- `npx playwright test` - E2E tests

To enable strict enforcement:
1. Edit this file
2. Change `enabled: false` to `enabled: true`
3. Change `action: warn` to `action: block`
