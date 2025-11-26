# Plan - 0067-multi-project-init-bugs

## Implementation Order

1. **T-001**: Fix parent repo folder creation (root cause)
2. **T-002**: Fix GitHub config condition
3. **T-003**: Improve import error messages
4. **T-004**: Fix init.ts error handling
5. **T-005**: Verify with tests

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/repo-structure/repo-initializer.ts` | Add `config.parentRepo` handling |
| `src/cli/helpers/init/external-import.ts` | Fix condition at line 404, improve error at line 773 |
| `src/cli/commands/init.ts` | Log actual error at line 457-459 |

## Risk Assessment

- **Low risk**: All changes are additive or condition fixes
- **No breaking changes**: Existing single-repo behavior unchanged
- **Test coverage**: Existing tests should pass

## Verification

1. Run `npm test`
2. Manual test with multi-repo setup
