---
increment: 0073-fix-y2k-id-limit-bug
title: "Technical Plan: Fix Y2K-Style ID Limit Bug"
---

# Technical Plan: Fix Y2K-Style ID Limit Bug

## Approach

**Simple regex replacement**: Change `\d{3}` to `\d{3,}` in all affected patterns.

This is a mechanical fix with no architectural changes required.

## Pattern Categories

### Category A: Feature ID Patterns (FS-XXX)

| File | Line | Current | Fixed |
|------|------|---------|-------|
| `src/cli/commands/delete-feature.ts` | 18 | `/^FS-\d{3}$/` | `/^FS-\d{3,}$/` |
| `src/core/living-docs/feature-id-manager.ts` | 253 | `/^FS-\d{3}$/` | `/^FS-\d{3,}$/` |
| `src/core/living-docs/feature-id-manager.ts` | 324 | `/^FS-(\d{3})$/` | `/^FS-(\d{3,})$/` |
| `src/core/living-docs/hierarchy-mapper.ts` | 525 | `/^FS-\d{3}$/` | `/^FS-\d{3,}$/` |
| `src/core/living-docs/hierarchy-mapper.ts` | 718 | `/^FS-\d{3}E?$/` | `/^FS-\d{3,}E?$/` |
| `src/core/living-docs/hierarchy-mapper.ts` | 772 | `/^FS-\d{3}E?$/` | `/^FS-\d{3,}E?$/` |
| `src/living-docs/fs-id-allocator.ts` | 231 | `/^FS-\d{3}E?$/` | `/^FS-\d{3,}E?$/` |
| `src/living-docs/fs-id-allocator.ts` | 308 | `/^(FS-\d{3}E?)$/` | `/^(FS-\d{3,}E?)$/` |
| `src/core/living-docs/living-docs-sync.ts` | 353 | `/^FS-\d{3}$/` | `/^FS-\d{3,}$/` |
| `plugins/.../user-story-issue-builder.ts` | 69 | `/^FS-\d{3}$/` | `/^FS-\d{3,}$/` |
| `plugins/.../user-story-issue-builder.ts` | 118 | `/^\[FS-\d{3}\]\[US-\d{3}\]/` | `/^\[FS-\d{3,}\]\[US-\d{3,}\]/` |

### Category B: User Story ID Patterns (US-XXX)

| File | Line | Current | Fixed |
|------|------|---------|-------|
| `src/generators/spec/task-parser.ts` | 92 | `/US-\d{3}E?/` | `/US-\d{3,}E?/` |
| `src/generators/spec/task-parser.ts` | 268 | `/^US-\d{3}$/` | `/^US-\d{3,}$/` |
| `src/generators/spec/task-parser.ts` | 349 | `/^US-(\d{3})$/` | `/^US-(\d{3,})$/` |
| `src/generators/spec/spec-parser.ts` | 216 | `/US-\d{3}E?/` | `/US-\d{3,}E?/` |
| `src/generators/spec/spec-parser.ts` | 331 | `/^US-(\d{3})$/` | `/^US-(\d{3,})$/` |
| `src/core/feature-deleter/github-service.ts` | 45 | `\[US-\d{3}\]` | `\[US-\d{3,}\]` |
| `plugins/.../user-story-issue-builder.ts` | 118 | (combined with FS above) | (combined) |

### Category C: Task ID Patterns (T-XXX)

| File | Line | Current | Fixed |
|------|------|---------|-------|
| `src/generators/spec/task-parser.ts` | 91 | `/T-\d{3}E?/` | `/T-\d{3,}E?/` |
| `src/generators/spec/task-parser.ts` | 184 | `/^T-\d{3}$/` | `/^T-\d{3,}$/` |
| `src/core/validation/three-file-validator.ts` | 122 | `/T-\d{3}/` | `/T-\d{3,}/` |
| `src/core/validation/three-file-validator.ts` | 128 | `/T-\d{3}/` | `/T-\d{3,}/` |
| `src/core/validation/three-file-validator.ts` | 265 | `/^###\s+T-\d{3}/` | `/^###\s+T-\d{3,}/` |
| `src/core/validation/three-file-validator.ts` | 281 | `/T-\d{3}/` | `/T-\d{3,}/` |
| `src/core/validation/three-file-validator.ts` | 293 | `/T-\d{3}/` | `/T-\d{3,}/` |
| `src/core/validation/three-file-validator.ts` | 305 | `/T-\d{3}/` | `/T-\d{3,}/` |

## Error Message Updates

Update user-facing messages that mention "exactly 3 digits":

**File**: `src/cli/commands/delete-feature.ts` (lines 22-31)
- Before: "Must have exactly 3 digits"
- After: "Must have 3 or more digits"

## Testing Strategy

### Unit Tests
- Add tests for 4-digit IDs (FS-1000, US-1234, T-9999)
- Ensure 3-digit IDs still work (backward compatibility)
- Test boundary cases (FS-999, FS-1000, FS-10000)

### Integration Tests
- Create feature with ID > 999 (simulated)
- Parse spec/tasks with 4-digit IDs
- GitHub issue title validation with 4-digit IDs

## Risk Assessment

**Risk**: Low
- Pattern change is mechanical (`{3}` → `{3,}`)
- No logic changes, only regex updates
- Existing tests verify backward compatibility

**Rollback**: Simple
- Revert regex patterns if issues found
- No data migration required

## Implementation Order

1. **Phase 1**: Core ID validation (delete-feature, feature-id-manager)
2. **Phase 2**: Living docs (hierarchy-mapper, fs-id-allocator, living-docs-sync)
3. **Phase 3**: Parsers (task-parser, spec-parser)
4. **Phase 4**: Validators (three-file-validator)
5. **Phase 5**: External integrations (github-service, user-story-issue-builder)
6. **Phase 6**: Tests and error messages
