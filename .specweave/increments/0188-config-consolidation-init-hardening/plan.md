# 0188: Architecture & Implementation Plan

## ADR-001: Config Type Consolidation Strategy

**Decision**: Merge INTO the new `src/core/config/types.ts` (the one with validation and migration support), keeping the comprehensive field set from `src/core/types/config.ts`.

**Rationale**:
- New ConfigManager (506 lines) is a strict superset of old (156 lines) — has validation, migration, dot-path access
- Old type file has the comprehensive field definitions (~100 fields) that the new one lacks (16 fields)
- Solution: port all field definitions into new types file, then make old files re-export

**Migration Path** (zero-breakage):
1. Copy all interfaces from `src/core/types/config.ts` into `src/core/config/types.ts`
2. Merge DEFAULT_CONFIG (140-line comprehensive version into new file)
3. Replace `src/core/types/config.ts` body with re-exports: `export { SpecweaveConfig, DEFAULT_CONFIG, ... } from '../config/types.js'`
4. Replace `src/core/config-manager.ts` body with re-export: `export { ConfigManager } from './config/config-manager.js'`
5. Add deprecation comments pointing to new canonical paths
6. Ensure all 25+ old-path importers still compile

**Naming**: Keep `SpecweaveConfig` (camelCase) as canonical — it's used by 25+ files vs 12. Add `SpecWeaveConfig` as type alias for backward compat.

## ADR-002: CI/CD Config Integration

**Decision**: Add `cicd` section to unified SpecweaveConfig. The existing `src/core/cicd/config-loader.ts` will read from unified config first, then fall back to env vars.

**Schema**:
```typescript
interface CiCdConfig {
  pushStrategy: 'direct' | 'pr-based';
  autoFix: {
    enabled: boolean;
    maxRetries: number;
    allowedBranches: string[];
  };
  monitoring?: {
    pollInterval: number;
    autoNotify: boolean;
  };
}
```

## ADR-003: Translation Fix Strategy

**Decision**: Add explicit `enableChoice` and `disableChoice` fields to each language's translation strings object, instead of using runtime `.replace()` hacks.

**Before** (broken for 6 languages):
```typescript
strings.disabled.replace('Translat', 'No translat').replace('Перевод:', 'Нет -').replace('Traducción:', 'No -')
```

**After** (works for all 9):
```typescript
strings.disableChoice  // "No translation" / "Нет перевода" / "翻訳なし" etc.
strings.enableChoice   // "Enable translation" / "Включить перевод" / "翻訳を有効にする" etc.
```

## ADR-004: Provider Folder Abstraction

**Decision**: Extract folder creation into `createMultiProjectFolders(targetDir, provider, projects[])` helper. Call it from all 4 provider paths (JIRA legacy, JIRA config, ADO, GitHub).

## Implementation Order

```
Phase 1: Config consolidation (US-001) — foundational, must go first
Phase 2: CI/CD config schema (US-002) — builds on unified type
Phase 3: Init fixes (US-003, US-004, US-005) — independent of each other
Phase 4: Provider symmetry (US-006) — can be parallel with Phase 3
```

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking 25+ importers | Re-export from old paths, run full test suite |
| Config migration breaks existing projects | ConfigManager.read() already has migration logic — extend it |
| Translation changes break layout | Each language tested with actual string lengths |
| Init refactor breaks CI mode | Add unit test for `isCI` constant covering all env var combinations |

## Files Modified (complete list)

| Action | File | US |
|--------|------|----|
| EDIT (major) | `src/core/config/types.ts` | US-001, US-002 |
| EDIT (re-export) | `src/core/types/config.ts` | US-001 |
| EDIT (major) | `src/core/config/config-manager.ts` | US-001 |
| EDIT (re-export) | `src/core/config-manager.ts` | US-001 |
| EDIT | `src/core/cicd/config-loader.ts` | US-002 |
| EDIT | `src/cli/commands/init.ts` | US-003, US-005 |
| EDIT | `src/cli/helpers/init/translation-config.ts` | US-004 |
| CREATE | `src/cli/helpers/init/multi-project-folders.ts` | US-006 |
| EDIT | `tests/unit/core/config/config-manager.test.ts` | US-001 |
| CREATE | `tests/unit/cli/helpers/init/translation-config.test.ts` | US-004 |
| CREATE | `tests/unit/cli/commands/init-ci-detection.test.ts` | US-003 |
