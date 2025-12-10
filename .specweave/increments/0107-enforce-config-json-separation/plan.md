# Implementation Plan: 0107-enforce-config-json-separation

## Overview

Fix 15 architectural violations where configuration data is incorrectly read from process.env instead of ConfigManager/config.json.

## Prerequisites

- Audit report: `.specweave/increments/_archive/REGRESSION-AUDIT-secrets-vs-config-2025-12-10.md`
- ConfigManager exists at `src/core/config/config-manager.ts`
- ADR-0050 defines secrets vs config separation

## Implementation Phases

### Phase 1: Foundation (CRITICAL - Must Complete First)

**Goal**: Establish ConfigManager injection pattern in core files

1. **T-001: CredentialsManager refactoring**
   - Inject ConfigManager for config values
   - Keep secrets (PAT, API_TOKEN, EMAIL) in process.env
   - Move config (DOMAIN, ORG, PROJECT) to ConfigManager

2. **T-002: JiraReconciler migration**
   - Add ConfigManager to constructor
   - Read domain from config.issueTracker.domain

3. **T-003: AdoReconciler migration**
   - Add ConfigManager to constructor
   - Read organization from config

4. **T-004: ADR-0194**
   - Document decision formally

### Phase 2: JIRA Integration

**Goal**: Fix all JIRA_DOMAIN violations in mapper classes

1. **T-005: JiraMapper**
   - Add JiraMapperConfig interface
   - Update constructor signature
   - Replace 4 process.env.JIRA_DOMAIN references

2. **T-006: Update callers**
   - Find all JiraMapper instantiation sites
   - Pass domain from ConfigManager

3. **T-007: JiraIncrementalMapper**
   - Same pattern as JiraMapper
   - Replace 11 process.env.JIRA_DOMAIN references

### Phase 3: ADO & Utilities

**Goal**: Fix remaining ADO violations and deprecate legacy utilities

1. **T-008**: Verify AdoReconciler (from T-003)
2. **T-009**: Deprecate env-multi-project-parser.ts
3. **T-010**: Update sync-spec-* commands
4. **T-011**: Migration guide in CLAUDE.md

### Phase 4: Quality Gates

**Goal**: Prevent regression with automated checks

1. **T-012**: ESLint rule
2. **T-013**: Pre-tool-use hook
3. **T-014**: CI workflow

### Phase 5: Testing

**Goal**: Update tests and validate

1. **T-015**: Update test files
2. **T-016**: E2E config-only test

## Code Patterns

### BEFORE (Violation)
```typescript
this.domain = process.env.JIRA_DOMAIN || '';
const org = process.env.AZURE_DEVOPS_ORG;
```

### AFTER (Correct)
```typescript
const config = await this.configManager.read();
this.domain = config.issueTracker?.domain || '';
const org = config.sync?.profiles?.[profileId]?.config?.organization || '';
```

## Risk Mitigation

1. **Breaking changes**: Constructor signatures change
   - Mitigation: Keep backward compatible overloads where possible

2. **Test failures**: Tests mock process.env
   - Mitigation: Update tests in Phase 5

3. **Runtime errors**: Config not found
   - Mitigation: Provide sensible defaults, clear error messages

## Estimated Effort

| Phase | Tasks | Hours |
|-------|-------|-------|
| Phase 1 | 4 | 8 |
| Phase 2 | 3 | 8 |
| Phase 3 | 4 | 6 |
| Phase 4 | 3 | 5 |
| Phase 5 | 2 | 5 |
| **Total** | **16** | **32** |

## Success Criteria

- [ ] Zero `process.env.JIRA_DOMAIN` in src/
- [ ] Zero `process.env.AZURE_DEVOPS_ORG` (config) in src/
- [ ] All tests pass
- [ ] ESLint catches violations
- [ ] CI validates on PRs
