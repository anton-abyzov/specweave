# Tasks - 0067-multi-project-init-bugs

## T-001: Add parent repo folder creation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

### Description
In `src/core/repo-structure/repo-initializer.ts`, add handling for `config.parentRepo` when `config.architecture === 'parent'`.

### Implementation
```typescript
// After creating implementation repo folders, add:
if (config.architecture === 'parent' && config.parentRepo) {
  const parentSpecPath = path.join(
    specweavePath,
    'docs',
    'internal',
    'specs',
    config.parentRepo.name
  );
  if (!existsSync(parentSpecPath)) {
    mkdirSync(parentSpecPath, { recursive: true });
  }
  console.log(chalk.gray(`   [OK] Created project structure: ${config.parentRepo.name}`));
}
```

---

## T-002: Fix GitHub config condition for profiles-only mode
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed

### Description
In `src/cli/helpers/init/external-import.ts:404`, fix condition to match line 359.

### Implementation
Change:
```typescript
if (github && hasGitHubToken) {
```
To:
```typescript
if ((github || (hasGitHubProfiles && repoSelectionConfig)) && hasGitHubToken) {
```

---

## T-003: Improve error messages in external import
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04
**Status**: [x] completed

### Description
In `src/cli/helpers/init/external-import.ts:773-774`, add error details to failure message.

### Implementation
```typescript
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  spinner.fail(`Import failed: ${errorMsg}`);
```

---

## T-004: Log actual errors in init.ts
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed

### Description
In `src/cli/commands/init.ts:457-459`, log the actual error instead of swallowing it.

### Implementation
```typescript
} catch (importError) {
  const errorMsg = importError instanceof Error ? importError.message : String(importError);
  console.log(chalk.yellow(`\n⚠️  External tool import failed: ${errorMsg}`));
  console.log(chalk.gray('   → You can run /specweave-github:sync later to retry'));
}
```

---

## T-005: Verify fixes with test
**User Story**: US-001, US-002
**Satisfies ACs**: All
**Status**: [x] completed

### Description
Run existing tests and verify no regressions.
