# ADR-0118: Command Interface Pattern for Feature Deletion

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, Tech Lead
**Priority**: P1

---

## Context

The `/specweave:delete-feature` command requires a robust interface that supports:

1. **Multiple input modes**: Single feature ID, batch deletion, dry-run preview
2. **Interactive confirmations**: Multi-stage safety gates (file deletion, git commit, GitHub cleanup)
3. **Rich output**: Validation reports, progress indicators, deletion summaries
4. **Error resilience**: Graceful handling of partial failures, continue-on-error mode

SpecWeave currently uses **Commander.js** for all CLI commands (see `src/cli/commands/*.ts`). However, feature deletion has unique UX requirements:
- **Multi-stage confirmations** (delete files? commit? delete GitHub issues?)
- **Interactive selection** (which files to delete? which issues to close?)
- **Real-time progress** (scanning files, deleting issues)

**Key Question**: Should we use Commander.js (current standard), Inquirer.js (interactive prompts), or a hybrid approach?

---

## Decision

**Use Hybrid Pattern: Commander.js + Inquirer.js**

```typescript
// src/cli/commands/delete-feature.ts
import { Command } from 'commander';
import inquirer from 'inquirer';
import { FeatureDeleter } from '../../core/feature-deleter.js';

export function registerDeleteFeatureCommand(program: Command): void {
  program
    .command('delete-feature <feature-id>')
    .option('--force', 'Bypass active increment validation')
    .option('--dry-run', 'Preview deletion without executing')
    .option('--no-git', 'Skip git operations')
    .option('--no-github', 'Skip GitHub issue deletion')
    .option('--yes', 'Skip all confirmations (dangerous!)')
    .action(async (featureId, options) => {
      const deleter = new FeatureDeleter({ logger });

      // Phase 1: Validate
      const validation = await deleter.validate(featureId, options);

      // Phase 2: Confirm (Inquirer prompts)
      if (!options.yes && !options.dryRun) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: `Delete ${validation.fileCount} files?`,
            default: false
          },
          {
            type: 'confirm',
            name: 'confirmGit',
            message: 'Commit deletion to git?',
            default: true,
            when: !options.noGit
          },
          {
            type: 'confirm',
            name: 'confirmGithub',
            message: `Delete ${validation.githubIssues.length} GitHub issues?`,
            default: false,
            when: !options.noGithub && validation.githubIssues.length > 0
          }
        ]);

        if (!answers.confirmDelete) {
          console.log('Deletion cancelled.');
          return;
        }
      }

      // Phase 3: Execute
      const result = await deleter.execute(featureId, options);

      // Phase 4: Report
      console.log(result.summary);
    });
}
```

**Rationale**:
- **Commander.js**: Handles flags, validation, help text (consistent with existing commands)
- **Inquirer.js**: Handles confirmations, multi-choice selection, progress (better UX for interactive operations)

---

## Alternatives Considered

### 1. Commander.js Only

**Pros**:
- ✅ Consistency with existing SpecWeave commands
- ✅ Lightweight (no additional dependency)
- ✅ Built-in help/validation

**Cons**:
- ❌ Poor interactive prompt support (must use raw `process.stdin`)
- ❌ No multi-stage confirmation patterns
- ❌ Clunky for complex user flows

**Example** (Commander-only confirmation):
```typescript
// Requires manual stdin handling
const answer = await new Promise((resolve) => {
  process.stdout.write('Delete files? (y/N): ');
  process.stdin.once('data', (data) => resolve(data.toString().trim()));
});
```

**Why Rejected**: Too much boilerplate, poor UX for multi-stage confirmations.

---

### 2. Inquirer.js Only

**Pros**:
- ✅ Excellent interactive prompts
- ✅ Rich UI (checkboxes, multi-select, confirm)
- ✅ Built-in validation

**Cons**:
- ❌ No flag parsing (must manually parse `process.argv`)
- ❌ Inconsistent with existing SpecWeave commands
- ❌ No help text generation

**Example** (Inquirer-only flags):
```typescript
// Must manually parse flags
const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
```

**Why Rejected**: Breaks SpecWeave CLI conventions, poor developer experience.

---

### 3. Prompts.js (Alternative Library)

**Pros**:
- ✅ Lightweight (~10KB vs Inquirer ~500KB)
- ✅ Modern API (async/await)

**Cons**:
- ❌ Less battle-tested than Inquirer
- ❌ Smaller community
- ❌ Fewer plugins/extensions

**Why Rejected**: Inquirer is standard in Node.js ecosystem, well-tested.

---

## Consequences

### Positive

- ✅ **Best of both worlds**: Commander for CLI structure, Inquirer for UX
- ✅ **Consistent with SpecWeave**: All commands use Commander base
- ✅ **Rich confirmations**: Multi-stage prompts with validation
- ✅ **Testable**: Inquirer prompts can be mocked with `inquirer-test`
- ✅ **Reusable pattern**: Other commands can adopt this (e.g., `/specweave:init`, `/specweave:sync`)

### Negative

- ⚠️ **New dependency**: Adds Inquirer.js (~500KB)
- ⚠️ **Learning curve**: Developers must learn Inquirer API
- ⚠️ **Testing complexity**: Must mock Inquirer in tests

### Neutral

- ℹ️ **Package size impact**: +500KB (acceptable for improved UX)
- ℹ️ **Precedent**: Sets pattern for future interactive commands

---

## Implementation Details

### Directory Structure

```
src/
├── cli/
│   └── commands/
│       └── delete-feature.ts         # Commander command registration
├── core/
│   └── feature-deleter/
│       ├── index.ts                  # Main orchestrator
│       ├── validator.ts              # Validation logic
│       ├── git-service.ts            # Git operations
│       ├── github-service.ts         # GitHub API
│       └── audit-logger.ts           # Audit trail
└── utils/
    └── prompts.ts                    # Reusable prompt helpers
```

### Confirmation Flow

```
User runs: specweave delete-feature FS-052
    ↓
Commander parses flags (--force, --dry-run, --no-git, --no-github)
    ↓
Validator scans files/increments/git/GitHub
    ↓
Display validation report (colored table, file list, warnings)
    ↓
Inquirer Prompt 1: "Delete 47 files?" (y/N)
    ↓ (User: y)
Inquirer Prompt 2: "Commit deletion?" (Y/n) [if git enabled]
    ↓ (User: Y)
Inquirer Prompt 3: "Delete 3 GitHub issues?" (y/N) [if GitHub enabled]
    ↓ (User: y)
Execute deletion with progress bar (Ora spinner)
    ↓
Display summary (deleted files, git commit SHA, GitHub issues closed)
    ↓
Log to audit trail (.specweave/logs/feature-deletions.log)
```

### Flag Priority

```
--yes > --dry-run > interactive prompts
```

**Examples**:
- `--yes`: Skip ALL confirmations (destructive, requires explicit flag)
- `--dry-run`: Show plan, skip execution, exit 0
- No flags: Interactive mode (default, safest)

---

## Testing Strategy

### Unit Tests

```typescript
describe('DeleteFeatureCommand', () => {
  it('parses flags correctly', async () => {
    const cmd = parseCommand(['delete-feature', 'FS-052', '--force', '--dry-run']);
    expect(cmd.force).toBe(true);
    expect(cmd.dryRun).toBe(true);
  });

  it('validates feature ID format', async () => {
    await expect(deleteFeature('INVALID')).rejects.toThrow('Invalid feature ID');
  });
});
```

### Integration Tests (Inquirer Mocking)

```typescript
import inquirerTest from 'inquirer-test';

describe('DeleteFeature Interactive', () => {
  it('prompts for confirmation before deletion', async () => {
    const prompts = inquirerTest([
      inquirerTest.ENTER,  // Confirm delete
      inquirerTest.ENTER,  // Confirm git
      inquirerTest.ENTER   // Confirm GitHub
    ]);

    await deleteFeature('FS-052', {}, prompts);

    expect(mockDeleter.execute).toHaveBeenCalled();
  });

  it('cancels if user declines confirmation', async () => {
    const prompts = inquirerTest([
      'N',  // Decline delete
      inquirerTest.ENTER
    ]);

    await deleteFeature('FS-052', {}, prompts);

    expect(mockDeleter.execute).not.toHaveBeenCalled();
  });
});
```

### E2E Tests (Real CLI Execution)

```bash
# Dry-run mode
$ specweave delete-feature FS-052 --dry-run
> Deletion Plan:
>   Files: 47
>   Git: 35 tracked, 12 untracked
>   GitHub: 3 issues
> ✓ Dry-run complete (no changes made)

# Interactive mode (simulated input)
$ echo -e "y\ny\ny\n" | specweave delete-feature FS-052
> Validation complete.
> Delete 47 files? y
> Commit deletion? y
> Delete 3 GitHub issues? y
> ✓ Feature FS-052 deleted successfully
```

---

## Migration Path

**Backward Compatibility**: N/A (new command)

**Future Commands**: Other interactive commands (e.g., `/specweave:init`, `/specweave:migrate`) should adopt this pattern.

---

## References

- **Commander.js Docs**: https://github.com/tj/commander.js
- **Inquirer.js Docs**: https://github.com/SBoudrias/Inquirer.js
- **Existing Pattern**: `src/cli/commands/init.ts` (uses Commander + manual prompts)
- **Related ADR**: ADR-0119 (Git Integration Strategy)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | Hybrid pattern (Commander + Inquirer) | Best UX + consistency |
| 2025-11-23 | Inquirer.js over Prompts.js | Battle-tested, ecosystem standard |
| 2025-11-23 | `--yes` flag for non-interactive mode | CI/automation support |
