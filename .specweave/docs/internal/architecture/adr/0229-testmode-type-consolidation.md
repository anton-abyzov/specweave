# ADR-0229: TestMode Type Consolidation

**Status**: Proposed
**Date**: 2026-01-25
**Decision Makers**: SpecWeave Core Team

## Context

The `TestMode` type is duplicated in **4 different files**:

```typescript
// 1. src/core/types/config.ts:152
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

// 2. src/core/tdd/types.ts:10
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

// 3. src/core/qa/coverage-validator.ts:21
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

// 4. src/cli/helpers/init/types.ts:133
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';
```

## Problem

1. **Synchronization Risk**: If one definition is updated, others may become out of sync
2. **Import Confusion**: Different modules import from different sources
3. **Maintenance Burden**: Changes need to be made in 4 places
4. **Type Safety**: TypeScript can't guarantee compatibility between identical but separate types

## Decision

**Designate `src/core/types/config.ts` as the canonical source for `TestMode`.**

### Rationale

1. `config.ts` already defines related types: `TDDEnforcement`, `TestingConfig`
2. TDD configuration is fundamentally a config concern
3. Most other modules already import types from `src/core/types/`

## Implementation Plan

### Phase 1: Update Imports (Non-Breaking)

```typescript
// In src/core/tdd/types.ts - REMOVE local definition, import from config
import type { TestMode } from '../types/config.js';
export type { TestMode }; // Re-export for backwards compatibility

// In src/core/qa/coverage-validator.ts - REMOVE local definition, import from config
import type { TestMode } from '../types/config.js';

// In src/cli/helpers/init/types.ts - REMOVE local definition, import from config
import type { TestMode } from '../../core/types/config.js';
export type { TestMode }; // Re-export for backwards compatibility
```

### Phase 2: Update Dependents

Files that currently import from the duplicated locations:
- `src/cli/helpers/init/testing-config.ts` → Change to import from `../../core/types/config.js`
- `src/cli/helpers/init/directory-structure.ts` → Change to import from `../../core/types/config.js`
- `src/core/increment/completion-validator.ts` → Already imports correctly via coverage-validator

### Phase 3: Remove Re-exports (Optional)

After confirming all imports are updated, the re-exports can be removed for cleaner architecture.

## Consequences

### Positive

- Single source of truth for `TestMode`
- Reduced maintenance burden
- Clear import hierarchy
- Better type safety

### Negative

- One-time migration effort
- Potential for import path breaks (mitigated by re-exports)

### Neutral

- No runtime behavior change
- No configuration change required

## Related

- [TDD Configuration Behavior Mapping](../guides/tdd-config-behavior-mapping.md)
- [ADR-0228: TDD Configuration Enforcement Gap](./0228-tdd-config-enforcement-gap.md)
