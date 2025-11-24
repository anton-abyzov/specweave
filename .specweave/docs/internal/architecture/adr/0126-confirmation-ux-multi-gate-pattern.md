# ADR-0126: Confirmation UX - Multi-Gate Pattern

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, UX Lead
**Priority**: P1

---

## Context

Feature deletion is **destructive** and **irreversible** (after git commit). The command must prevent accidental deletions while maintaining good UX.

**Problem**: How many confirmation prompts should we show?

**Scenarios**:

### Scenario 1: Safe Deletion (No Warnings)
```bash
$ specweave delete-feature FS-052
> Validation complete:
>   - 47 files to delete
>   - 0 active increments (safe)
>   - 3 GitHub issues to close
>
> Delete feature FS-052? (y/N): _
```

### Scenario 2: Force Deletion (Has Active Increments)
```bash
$ specweave delete-feature FS-052 --force
> ⚠️  WARNING: Active increment 0053 references FS-052!
>
> Validation complete:
>   - 47 files to delete
>   - 1 active increment (will be orphaned)
>   - 3 GitHub issues to close
>
> Delete feature FS-052 anyway? (y/N): y
> ⚠️  Confirm: This will orphan increment 0053! Type 'delete' to proceed: delete
> ✓ Proceeding with force deletion...
```

### Scenario 3: GitHub Cleanup
```bash
$ specweave delete-feature FS-052
> Validation complete:
>   - 47 files to delete
>   - 3 GitHub issues to close (#42: [FS-052][US-001], ...)
>
> Delete feature FS-052? (y/N): y
> Delete 3 GitHub issues? (y/N): y
> ✓ Deleting feature...
```

**Key Questions**:
1. How many gates should we have?
2. Should confirmation differ for safe vs force mode?
3. How to prevent accidental `y` spam?

---

## Decision

**4-Tier Safety Gate Pattern**

### Tier 1: Validation (Auto)
- **Always run** (no skip)
- **Blocks execution** if critical errors found
- **Shows detailed report** (files, increments, GitHub issues)

### Tier 2: Primary Confirmation (Required in Safe Mode)
- **Prompt**: "Delete feature FS-XXX? (y/N)"
- **Default**: No (safety-first)
- **Skippable**: `--yes` flag

### Tier 3: Elevated Confirmation (Required in Force Mode)
- **Prompt**: "⚠️ Confirm: This will orphan increments! Type 'delete' to proceed:"
- **Requires typing**: "delete" (no auto-yes)
- **NOT skippable**: Even with `--yes` flag
- **Purpose**: Prevent accidental force deletion

### Tier 4: GitHub Confirmation (Optional, Separate)
- **Prompt**: "Delete 3 GitHub issues? (y/N)"
- **Default**: No (GitHub deletion optional)
- **Skippable**: `--yes` or `--no-github` flag
- **Purpose**: Separate confirmation for external operations

```typescript
// src/core/feature-deleter/confirmation-manager.ts

export class ConfirmationManager {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? consoleLogger;
  }

  /**
   * Multi-gate confirmation flow
   */
  async confirm(validation: ValidationResult, options: DeletionOptions): Promise<boolean> {
    // Tier 1: Validation (auto, no prompt)
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // Show validation report (always)
    this.showValidationReport(validation, options);

    // Tier 2: Primary confirmation (safe mode)
    if (!options.yes && !options.dryRun) {
      const primaryConfirmed = await this.promptPrimaryConfirmation(validation);
      if (!primaryConfirmed) {
        return false; // User cancelled
      }
    }

    // Tier 3: Elevated confirmation (force mode)
    if (options.force && validation.orphanedIncrements.length > 0) {
      const elevatedConfirmed = await this.promptElevatedConfirmation(validation);
      if (!elevatedConfirmed) {
        return false; // User cancelled force deletion
      }
    }

    // Tier 4: GitHub confirmation (optional)
    if (!options.noGithub && validation.githubIssues.length > 0 && !options.yes) {
      const githubConfirmed = await this.promptGitHubConfirmation(validation);
      if (!githubConfirmed) {
        // User declined GitHub deletion - continue with file deletion
        options.noGithub = true; // Skip GitHub cleanup
        this.logger.info('Skipping GitHub issue deletion (user declined)');
      }
    }

    return true; // All confirmations passed
  }

  /**
   * Tier 1: Show validation report (no prompt)
   */
  private showValidationReport(validation: ValidationResult, options: DeletionOptions): void {
    const { featureId, files, orphanedIncrements, githubIssues } = validation;

    console.log('\n' + chalk.bold('Validation Complete:'));
    console.log(`  Feature ID: ${chalk.cyan(featureId)}`);
    console.log(`  Files to delete: ${chalk.yellow(files.length)}`);

    // Living docs breakdown
    const livingDocs = files.filter(f => f.includes('/_features/'));
    const userStories = files.filter(f => f.includes('/FS-') && f.endsWith('.md'));
    console.log(`    - Living docs: ${livingDocs.length}`);
    console.log(`    - User stories: ${userStories.length}`);

    // Active increments warning
    if (orphanedIncrements.length > 0) {
      console.log(chalk.yellow(`\n  ⚠️  Active increments: ${orphanedIncrements.length}`));
      orphanedIncrements.forEach(inc => {
        console.log(chalk.yellow(`    - ${inc}`));
      });
      if (!options.force) {
        console.log(chalk.red('\n  Cannot delete: Active increments reference this feature.'));
        console.log(chalk.gray('  Use --force to override (will orphan increments).\n'));
        throw new ValidationError(['Active increments found']);
      }
    } else {
      console.log(chalk.green(`  ✓ No active increments (safe to delete)`));
    }

    // GitHub issues
    if (githubIssues.length > 0) {
      console.log(`\n  GitHub issues: ${githubIssues.length}`);
      githubIssues.slice(0, 3).forEach(issue => {
        console.log(`    - #${issue.number}: ${issue.title}`);
      });
      if (githubIssues.length > 3) {
        console.log(chalk.gray(`    ... and ${githubIssues.length - 3} more`));
      }
    }

    console.log(''); // Blank line before prompt
  }

  /**
   * Tier 2: Primary confirmation (safe mode)
   */
  private async promptPrimaryConfirmation(validation: ValidationResult): Promise<boolean> {
    const { featureId, files } = validation;

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Delete feature ${featureId} (${files.length} files)?`,
        default: false // Safety-first default
      }
    ]);

    return answers.confirmDelete;
  }

  /**
   * Tier 3: Elevated confirmation (force mode)
   */
  private async promptElevatedConfirmation(validation: ValidationResult): Promise<boolean> {
    const { orphanedIncrements } = validation;

    console.log(chalk.yellow('\n⚠️  WARNING: Force deletion will orphan increments!'));
    console.log(chalk.gray(`   Affected increments: ${orphanedIncrements.join(', ')}`));
    console.log(chalk.gray('   Their metadata will be updated (feature_id removed).\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmForce',
        message: 'Type "delete" to confirm force deletion:',
        validate: (input: string) => {
          if (input.trim().toLowerCase() === 'delete') {
            return true;
          }
          return 'You must type "delete" to proceed with force deletion.';
        }
      }
    ]);

    return answers.confirmForce.trim().toLowerCase() === 'delete';
  }

  /**
   * Tier 4: GitHub confirmation (optional)
   */
  private async promptGitHubConfirmation(validation: ValidationResult): Promise<boolean> {
    const { githubIssues } = validation;

    console.log(''); // Blank line
    console.log(chalk.bold('GitHub Issue Cleanup:'));
    githubIssues.forEach(issue => {
      console.log(`  - #${issue.number}: ${issue.title}`);
    });
    console.log(''); // Blank line

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmGithub',
        message: `Close ${githubIssues.length} GitHub issues?`,
        default: false // Separate confirmation, default No
      }
    ]);

    return answers.confirmGithub;
  }
}
```

---

## Alternatives Considered

### 1. Single Confirmation (Too Simple)

```typescript
async confirm(): Promise<boolean> {
  const answer = await inquirer.prompt([
    { type: 'confirm', name: 'delete', message: 'Delete feature?' }
  ]);
  return answer.delete;
}
```

**Pros**:
- ✅ Simple UX (one prompt)

**Cons**:
- ❌ No differentiation between safe and force mode
- ❌ Easy to accidentally confirm
- ❌ No separate GitHub confirmation

**Why Rejected**: Too risky for destructive operation.

---

### 2. Double Confirmation (All Modes)

```typescript
async confirm(): Promise<boolean> {
  // Confirmation 1
  const first = await inquirer.prompt([
    { type: 'confirm', name: 'delete', message: 'Delete feature?' }
  ]);
  if (!first.delete) return false;

  // Confirmation 2
  const second = await inquirer.prompt([
    { type: 'confirm', name: 'confirm', message: 'Are you sure?' }
  ]);
  return second.confirm;
}
```

**Pros**:
- ✅ Very safe (two prompts)

**Cons**:
- ❌ Annoying for safe deletions (no warnings)
- ❌ "Are you sure?" is redundant (poor UX)
- ❌ No contextual information (why ask twice?)

**Why Rejected**: Annoying UX without adding safety.

---

### 3. Type Feature ID to Confirm

```typescript
async confirm(featureId: string): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmId',
      message: `Type feature ID (${featureId}) to confirm:`,
      validate: (input) => input === featureId || 'Feature ID mismatch'
    }
  ]);
  return answer.confirmId === featureId;
}
```

**Pros**:
- ✅ Very difficult to accidentally confirm
- ✅ Forces user to read feature ID

**Cons**:
- ❌ Tedious for every deletion (even safe ones)
- ❌ Slows down workflow (must type FS-052)
- ❌ Overkill for safe deletions

**Why Rejected**: Too tedious. Only needed for force mode.

---

### 4. Confirmation via Flag Only (No Prompts)

```typescript
// User must explicitly pass --confirm flag
$ specweave delete-feature FS-052 --confirm
```

**Pros**:
- ✅ No interactive prompts (good for CI)
- ✅ Explicit confirmation (flag required)

**Cons**:
- ❌ No validation report shown
- ❌ Easy to forget flag (command fails)
- ❌ Poor UX for interactive use

**Why Rejected**: `--yes` flag already provides this functionality.

---

## Consequences

### Positive

- ✅ **Tiered safety**: Different confirmations for different risk levels
- ✅ **Prevent accidents**: Force mode requires typing "delete"
- ✅ **Clear UX**: User knows exactly what will be deleted
- ✅ **Flexible**: Can skip confirmations with `--yes` (except force mode)
- ✅ **Informative**: Validation report shows all affected items
- ✅ **Separate GitHub**: User can decline GitHub cleanup

### Negative

- ⚠️ **Multiple prompts**: 2-3 prompts in some scenarios (can be verbose)
- ⚠️ **Force mode friction**: Typing "delete" slows down workflow
- ⚠️ **`--yes` limitation**: Cannot skip elevated confirmation (by design)

### Neutral

- ℹ️ **Dry-run bypass**: `--dry-run` skips all prompts (safe preview)
- ℹ️ **No silent deletions**: All deletions require some form of confirmation

---

## Flag Behavior Matrix

| Flags | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|-------|--------|--------|--------|--------|
| (none) | ✓ | Prompt | N/A | Prompt |
| `--yes` | ✓ | Skip | N/A | Skip |
| `--force` | ✓ | Prompt | **Type "delete"** | Prompt |
| `--force --yes` | ✓ | Skip | **Type "delete"** | Skip |
| `--dry-run` | ✓ | Skip | Skip | Skip |
| `--no-github` | ✓ | Prompt | N/A | Skip |

**Key Point**: Tier 3 (elevated confirmation) **NEVER skipped** (even with `--yes`)

---

## Confirmation Messages

### Safe Mode (No Warnings)
```
Validation Complete:
  Feature ID: FS-052
  Files to delete: 47
    - Living docs: 1
    - User stories: 3
  ✓ No active increments (safe to delete)
  GitHub issues: 3

? Delete feature FS-052 (47 files)? (y/N):
```

### Force Mode (With Warnings)
```
Validation Complete:
  Feature ID: FS-052
  Files to delete: 47
  ⚠️  Active increments: 1
    - 0053-external-tool-import
  GitHub issues: 3

? Delete feature FS-052 (47 files)? (y/N): y

⚠️  WARNING: Force deletion will orphan increments!
   Affected increments: 0053-external-tool-import
   Their metadata will be updated (feature_id removed).

? Type "delete" to confirm force deletion: delete

✓ Proceeding with force deletion...
```

### GitHub Confirmation
```
GitHub Issue Cleanup:
  - #42: [FS-052][US-001] User Story Title
  - #43: [FS-052][US-002] Another Story
  - #44: [FS-052][US-003] Third Story

? Close 3 GitHub issues? (y/N): y
```

---

## Error Messages

### Validation Failed (Tier 1)
```
❌ Validation failed:
   - Active increment 0053 references FS-052
   - Use --force to override (will orphan increments)
```

### User Cancelled (Tier 2)
```
Deletion cancelled by user.
```

### Force Confirmation Failed (Tier 3)
```
❌ Force deletion cancelled.
   You must type "delete" to confirm.
```

### GitHub Skipped (Tier 4)
```
ℹ️  Skipping GitHub issue deletion (user declined).
   Files will be deleted, but GitHub issues remain open.
   To close them manually: gh issue close 42 43 44
```

---

## Dry-Run Mode UX

**No confirmations** (preview only):
```bash
$ specweave delete-feature FS-052 --dry-run

Validation Complete:
  Feature ID: FS-052
  Files to delete: 47
  ✓ No active increments (safe to delete)
  GitHub issues: 3

[DRY-RUN] Deletion Plan:

Files to delete:
  .specweave/docs/internal/specs/_features/FS-052/
  .specweave/docs/internal/specs/specweave/FS-052/us-001-*.md
  .specweave/docs/internal/specs/specweave/FS-052/us-002-*.md
  .specweave/docs/internal/specs/specweave/FS-052/us-003-*.md

Git operations:
  - git rm (35 tracked files)
  - rm (12 untracked files)
  - git commit -m "feat: delete feature FS-052"

GitHub operations:
  - Close issue #42: [FS-052][US-001] Title
  - Close issue #43: [FS-052][US-002] Title
  - Close issue #44: [FS-052][US-003] Title

✓ Dry-run complete (no changes made)
```

---

## Testing Strategy

```typescript
describe('ConfirmationManager', () => {
  it('prompts for primary confirmation in safe mode', async () => {
    const prompts = mockInquirerPrompts([{ confirmDelete: true }]);
    const manager = new ConfirmationManager();

    const confirmed = await manager.confirm(validationResult, {});

    expect(confirmed).toBe(true);
    expect(prompts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'confirmDelete', type: 'confirm' })
      ])
    );
  });

  it('requires typing "delete" in force mode', async () => {
    const prompts = mockInquirerPrompts([
      { confirmDelete: true },
      { confirmForce: 'delete' }
    ]);

    const manager = new ConfirmationManager();
    const confirmed = await manager.confirm(validationResult, { force: true });

    expect(confirmed).toBe(true);
    expect(prompts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'confirmForce', type: 'input' })
      ])
    );
  });

  it('skips confirmations with --yes flag', async () => {
    const prompts = mockInquirerPrompts([]);
    const manager = new ConfirmationManager();

    const confirmed = await manager.confirm(validationResult, { yes: true });

    expect(confirmed).toBe(true);
    expect(prompts).not.toHaveBeenCalled(); // No prompts shown
  });

  it('does NOT skip elevated confirmation even with --yes', async () => {
    const prompts = mockInquirerPrompts([{ confirmForce: 'delete' }]);
    const manager = new ConfirmationManager();

    const confirmed = await manager.confirm(validationWithOrphans, { force: true, yes: true });

    expect(confirmed).toBe(true);
    expect(prompts).toHaveBeenCalledTimes(1); // Elevated prompt still shown
  });

  it('shows GitHub confirmation separately', async () => {
    const prompts = mockInquirerPrompts([
      { confirmDelete: true },
      { confirmGithub: false } // User declines GitHub
    ]);

    const manager = new ConfirmationManager();
    const confirmed = await manager.confirm(validationWithGitHub, {});

    expect(confirmed).toBe(true); // Deletion confirmed
    expect(prompts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'confirmGithub' })
      ])
    );
  });
});
```

---

## Accessibility

**Keyboard navigation**:
- ✅ All prompts support Enter/Esc (Inquirer.js default)
- ✅ Default No (safety-first, just press Enter to cancel)

**Color-blind support**:
- ✅ Use symbols + color (⚠️ + yellow, ✓ + green)
- ✅ Text descriptions (not color-only)

**Screen reader support**:
- ✅ All prompts have descriptive messages
- ✅ Validation report uses plain text (no ASCII art)

---

## References

- **Related ADR**: ADR-0118 (Command Interface Pattern), ADR-0124 (Atomic Deletion)
- **Library**: Inquirer.js for prompts
- **Pattern**: Multi-gate confirmation (inspired by AWS CLI, Kubernetes)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | 4-tier safety gate pattern | Tiered safety for different risk levels |
| 2025-11-23 | Elevated confirmation for force mode | Prevent accidental orphaned increments |
| 2025-11-23 | Type "delete" (not feature ID) | Balance safety vs UX friction |
| 2025-11-23 | Separate GitHub confirmation | User control over external operations |
| 2025-11-23 | `--yes` CANNOT skip elevated confirmation | Safety override (by design) |
