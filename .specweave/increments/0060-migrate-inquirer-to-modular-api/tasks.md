# Tasks - Migrate Inquirer to Modular API

## Overview
Migrate 46 occurrences across 18 files from legacy inquirer.prompt() to @inquirer/prompts modular API.

---

### T-001: Install @inquirer/prompts package
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

Add `@inquirer/prompts` to dependencies and verify TypeScript types.

**Test Plan**:
- [ ] Package installs without errors
- [ ] TypeScript recognizes imports from @inquirer/prompts

---

### T-002: Migrate src/cli/commands/init.ts (8 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US2-01, AC-US2-04
**Status**: [x] completed

Migrate all 8 prompts in init.ts to modular API.

**Test Plan**:
- [ ] `specweave init test-project` shows selectable list for repo structure
- [ ] All prompts in init flow work correctly

---

### T-003: Migrate src/core/repo-structure/repo-structure-manager.ts (10 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-04
**Status**: [x] completed

Migrate all 10 prompts in repo-structure-manager.ts.

**Test Plan**:
- [ ] Repository structure prompts work correctly

---

### T-004: Migrate src/utils/external-resource-validator.ts (4 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-04
**Status**: [x] completed

**Test Plan**:
- [ ] External resource validation prompts work

---

### T-005: Migrate src/cli/helpers/github-repo-selector.ts (3 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-04
**Status**: [x] completed

**Test Plan**:
- [ ] GitHub repo selection prompts work

---

### T-006: Migrate src/cli/helpers/issue-tracker/github.ts (3 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-04
**Status**: [x] completed

**Test Plan**:
- [ ] GitHub issue tracker prompts work

---

### T-007: Migrate src/cli/helpers/ado-area-path-mapper.ts (3 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-04
**Status**: [x] completed

**Test Plan**:
- [ ] ADO area path mapper prompts work

---

### T-008: Migrate remaining 11 files (11 occurrences)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US2-04
**Status**: [x] completed

Migrate remaining files:
- src/cli/commands/import-docs.ts (2)
- src/cli/commands/install.ts (2)
- src/core/repo-structure/repo-bulk-discovery.ts (2)
- src/cli/helpers/issue-tracker/github-multi-repo.ts (1)
- src/cli/helpers/issue-tracker/jira.ts (1)
- src/cli/helpers/issue-tracker/index.ts (1)
- src/cli/helpers/smart-filter.ts (1)
- src/cli/helpers/github/profile-manager.ts (1)
- src/cli/helpers/import-strategy-prompter.ts (1)
- src/core/sync/bidirectional-engine.ts (1)
- src/init/InitFlow.ts (1)
- src/integrations/ado/area-path-mapper.ts (1)

**Test Plan**:
- [ ] All migrated prompts work correctly

---

### T-009: Remove legacy inquirer imports
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed

Remove `import inquirer from 'inquirer'` from all migrated files and remove `inquirer` dependency.

**Test Plan**:
- [ ] No legacy inquirer imports remain
- [ ] Build succeeds without inquirer package

---

### T-010: Build and test
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-04, AC-US2-03
**Status**: [x] completed

Run full build and test suite.

**Test Plan**:
- [ ] `npm run rebuild` succeeds
- [ ] `npm test` passes
- [ ] Manual test of init flow works

---

### T-011: Update CHANGELOG and version
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

Update CHANGELOG.md with fix and bump version.

**Test Plan**:
- [ ] CHANGELOG entry added
- [ ] Version bumped in package.json
