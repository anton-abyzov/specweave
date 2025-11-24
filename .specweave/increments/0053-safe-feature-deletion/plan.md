---
increment: 0053-safe-feature-deletion
title: "Safe Feature Deletion Command"
feature_id: FS-052
architecture_docs:
  - ../../docs/internal/architecture/adr/0118-command-interface-pattern.md
  - ../../docs/internal/architecture/adr/0119-git-integration-strategy.md
  - ../../docs/internal/architecture/adr/0120-github-integration-approach.md
  - ../../docs/internal/architecture/adr/0121-validation-engine-design.md
  - ../../docs/internal/architecture/adr/0123-deletion-orchestration-pattern.md
  - ../../docs/internal/architecture/adr/0124-atomic-deletion-with-transaction-rollback.md
  - ../../docs/internal/architecture/adr/0125-incremental-vs-batch-deletion.md
  - ../../docs/internal/architecture/adr/0126-confirmation-ux-multi-gate-pattern.md
---

# Implementation Plan: Safe Feature Deletion Command

**Complete Requirements**: [Increment Spec](./spec.md)

**Living Docs**: `.specweave/docs/internal/specs/_features/FS-052/` (to be created)

---

## Architecture Overview

**Complete architecture decisions**: See ADRs listed in frontmatter

**Key Architectural Patterns**:

1. **Transaction-Based Deletion** ([ADR-0124](../../docs/internal/architecture/adr/0124-atomic-deletion-with-transaction-rollback.md))
   - Three-phase commit: Validation → Staging → Commit
   - File backup for rollback capability
   - Checkpoint tracking for debugging

2. **Orchestration Pattern** ([ADR-0123](../../docs/internal/architecture/adr/0123-deletion-orchestration-pattern.md))
   - Step-by-step execution with checkpointing
   - Continue-on-failure for non-critical steps
   - Rollback on critical failures

3. **Multi-Gate Confirmation** ([ADR-0126](../../docs/internal/architecture/adr/0126-confirmation-ux-multi-gate-pattern.md))
   - 4-tier safety gates (Validation, Primary, Elevated, GitHub)
   - Force mode requires typing "delete"
   - Separate GitHub confirmation

4. **Single Feature Deletion Only** ([ADR-0125](../../docs/internal/architecture/adr/0125-incremental-vs-batch-deletion.md))
   - v1: Single feature only (simplicity)
   - v2: Batch support deferred to future increment

---

## Technology Stack Summary

**Languages & Frameworks**:
- TypeScript 5.x
- Node.js 20 LTS
- Commander.js (CLI framework)
- Inquirer.js (interactive prompts)

**Dependencies**:
- `simple-git` - Git operations
- `chalk` - Terminal colors
- `ora` - Progress spinners
- `inquirer` - User prompts

**Testing**:
- Vitest (unit + integration tests)
- `@vitest/coverage-v8` (coverage reports)

**Existing Infrastructure**:
- GitHub CLI (`gh`) for GitHub operations ([ADR-0120](../../docs/internal/architecture/adr/0120-github-integration-approach.md))
- Logger abstraction (`src/utils/logger.ts`)
- Git integration utilities (`src/core/git/`)

---

## Component Architecture

### Directory Structure

```
src/
├── cli/
│   └── commands/
│       └── delete-feature.ts              # CLI command (Commander.js)
├── core/
│   └── feature-deleter/
│       ├── index.ts                       # Main entry point (FeatureDeleter)
│       ├── deletion-transaction.ts        # Transaction pattern (ADR-0124)
│       ├── validator.ts                   # Validation logic
│       ├── confirmation-manager.ts        # Multi-gate prompts (ADR-0126)
│       ├── git-service.ts                 # Git operations (ADR-0119)
│       ├── github-service.ts              # GitHub API (ADR-0120)
│       ├── audit-logger.ts                # Audit trail
│       └── types.ts                       # TypeScript interfaces
└── utils/
    └── checkpoint.ts                      # Checkpoint tracking

tests/
├── unit/
│   └── feature-deleter/
│       ├── deletion-transaction.test.ts
│       ├── validator.test.ts
│       ├── confirmation-manager.test.ts
│       ├── git-service.test.ts
│       ├── github-service.test.ts
│       └── audit-logger.test.ts
├── integration/
│   └── feature-deleter/
│       ├── end-to-end-deletion.test.ts
│       ├── git-integration.test.ts
│       └── github-integration.test.ts
└── e2e/
    └── delete-feature-command.test.ts
```

---

## Core Components

### 1. CLI Command (`src/cli/commands/delete-feature.ts`)

**Purpose**: Command registration and flag parsing

**Architecture**: Hybrid Commander.js + Inquirer.js ([ADR-0118](../../docs/internal/architecture/adr/0118-command-interface-pattern.md))

**Interface**:
```typescript
// Command signature
specweave delete-feature <feature-id> [options]

// Flags
--force          # Bypass active increment validation
--dry-run        # Preview deletion without executing
--no-git         # Skip git operations
--no-github      # Skip GitHub issue deletion
--yes            # Skip confirmations (except elevated)
```

**Responsibilities**:
- Parse feature ID and flags
- Validate feature ID format (`FS-XXX`)
- Reject batch syntax (v1 limitation)
- Delegate to FeatureDeleter

**Key Design Decision**: Single feature only in v1 ([ADR-0125](../../docs/internal/architecture/adr/0125-incremental-vs-batch-deletion.md))

---

### 2. Feature Deleter (`src/core/feature-deleter/index.ts`)

**Purpose**: Main orchestrator for deletion workflow

**Pattern**: Step-by-step orchestration with checkpointing ([ADR-0123](../../docs/internal/architecture/adr/0123-deletion-orchestration-pattern.md))

**Public API**:
```typescript
export class FeatureDeleter {
  constructor(options?: { projectRoot?: string; logger?: Logger });

  async execute(featureId: string, options: DeletionOptions): Promise<DeletionResult>;
}

interface DeletionOptions {
  force?: boolean;         // Bypass active increment validation
  dryRun?: boolean;        // Preview mode (no execution)
  noGit?: boolean;         // Skip git operations
  noGithub?: boolean;      // Skip GitHub cleanup
  yes?: boolean;           // Skip confirmations (except elevated)
}

interface DeletionResult {
  success: boolean;
  featureId: string;
  filesDeleted: number;
  commitSha?: string;
  githubIssuesClosed?: number;
  orphanedIncrements?: string[];
  steps: CheckpointStep[];
  errors?: string[];
}
```

**Workflow**:
1. Validate feature exists and get files
2. Check for active increment references
3. Confirm with user (multi-gate pattern)
4. Execute deletion transaction
5. Return result summary

---

### 3. Deletion Transaction (`src/core/feature-deleter/deletion-transaction.ts`)

**Purpose**: Atomic deletion with rollback capability

**Pattern**: Three-phase commit ([ADR-0124](../../docs/internal/architecture/adr/0124-atomic-deletion-with-transaction-rollback.md))

**Public API**:
```typescript
export class DeletionTransaction {
  constructor(options: { projectRoot: string; logger?: Logger });

  async execute(featureId: string, options: DeletionOptions): Promise<DeletionResult>;
}
```

**Three Phases**:

**Phase 1: Validation** (read-only)
- Check feature exists
- Scan files to delete
- Check git status (clean working directory)
- Validate no active increments (unless --force)

**Phase 2: Staging** (reversible)
- Backup files to `.specweave/state/deletion-backup/`
- Create checkpoint file (`.specweave/state/deletion-checkpoint.json`)
- Stage git deletions (git rm)

**Phase 3: Commit** (irreversible)
- Commit git changes
- Close GitHub issues (non-critical)
- Update orphaned metadata (if force)
- Log to audit trail
- Remove backup and checkpoint

**Rollback Logic**:
- If failure before commit: Restore from backup, unstage git deletions
- If failure after commit: Cannot auto-rollback (user must use `git reset HEAD~1`)

**Performance**: < 5 seconds for typical feature (47 files)

---

### 4. Validator (`src/core/feature-deleter/validator.ts`)

**Purpose**: Pre-flight validation before deletion

**Validation Rules**:

```typescript
export class FeatureValidator {
  async validate(featureId: string, options: DeletionOptions): Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  featureId: string;
  files: string[];              // All files to delete
  livingDocsFiles: string[];    // Living docs folder files
  userStoryFiles: string[];     // User story markdown files
  orphanedIncrements: string[]; // Active increments referencing feature
  githubIssues: GitHubIssue[];  // GitHub issues to close
  mode: 'safe' | 'force';
}
```

**Validation Checks**:

1. **Feature exists** (living docs folder or user story files found)
2. **No active increments reference feature** (unless --force)
   - Scan `.specweave/increments/*/metadata.json` for `feature_id: FS-XXX`
   - Filter by status: active = NOT (completed, abandoned, archived)
3. **Git repository clean** (no uncommitted changes)
4. **Files are deletable** (permissions check)
5. **GitHub issues exist** (if --no-github not set)

**Error Handling**:
- Validation errors block execution (cannot proceed)
- Warnings allow execution with user confirmation

---

### 5. Confirmation Manager (`src/core/feature-deleter/confirmation-manager.ts`)

**Purpose**: Multi-gate confirmation UX

**Pattern**: 4-tier safety gates ([ADR-0126](../../docs/internal/architecture/adr/0126-confirmation-ux-multi-gate-pattern.md))

**Public API**:
```typescript
export class ConfirmationManager {
  constructor(logger?: Logger);

  async confirm(validation: ValidationResult, options: DeletionOptions): Promise<boolean>;
}
```

**4 Tiers**:

**Tier 1: Validation Report** (auto-show, no prompt)
- Feature ID, file count, active increments, GitHub issues

**Tier 2: Primary Confirmation** (required in safe mode)
- Prompt: "Delete feature FS-XXX (N files)? (y/N)"
- Skippable with `--yes`

**Tier 3: Elevated Confirmation** (required in force mode)
- Prompt: "Type 'delete' to confirm force deletion:"
- **NOT skippable** even with `--yes`
- Prevents accidental orphaning

**Tier 4: GitHub Confirmation** (optional)
- Prompt: "Close N GitHub issues? (y/N)"
- Skippable with `--yes` or `--no-github`

---

### 6. Git Service (`src/core/feature-deleter/git-service.ts`)

**Purpose**: Git operations wrapper

**Architecture**: Uses `simple-git` library ([ADR-0119](../../docs/internal/architecture/adr/0119-git-integration-strategy.md))

**Public API**:
```typescript
export class FeatureDeletionGitService {
  constructor(options: { projectRoot: string; logger?: Logger });

  async stageGitDeletions(files: string[]): Promise<{ tracked: number; untracked: number }>;
  async commitDeletion(featureId: string, validation: ValidationResult): Promise<string>;
  async unstageGitDeletions(files: string[]): Promise<void>;
}
```

**Operations**:

1. **Stage Deletions** (git rm)
   - Tracked files: `git rm <file>`
   - Untracked files: `fs.unlink(<file>)`

2. **Commit Deletion**
   ```
   feat: delete feature FS-XXX

   - Deleted N files
   - Living docs: X
   - User stories: Y
   - Orphaned increments: Z (if force mode)

   Deleted by: <user>
   Timestamp: <ISO timestamp>
   Mode: safe|force
   ```

3. **Unstage Deletions** (rollback)
   - `git reset HEAD <files>`
   - Restore files from backup

**Error Handling**:
- Git not available → Error (cannot proceed)
- Repository dirty → Error (must commit/stash first)
- Git operation failed → Rollback + error

---

### 7. GitHub Service (`src/core/feature-deleter/github-service.ts`)

**Purpose**: GitHub issue cleanup

**Architecture**: Uses `gh` CLI ([ADR-0120](../../docs/internal/architecture/adr/0120-github-integration-approach.md))

**Public API**:
```typescript
export class FeatureDeletionGitHubService {
  constructor(options: { owner: string; repo: string; logger?: Logger });

  async findFeatureIssues(featureId: string): Promise<GitHubIssue[]>;
  async deleteIssues(issues: GitHubIssue[]): Promise<DeletionResult>;
}

interface GitHubIssue {
  number: number;
  title: string;
  url: string;
}
```

**Operations**:

1. **Find Issues**
   - Search query: `repo:owner/repo is:issue "[FS-XXX]" in:title`
   - Filter to exact pattern: `/\[FS-XXX\]\[US-\d{3}\]/`

2. **Close Issues** (not delete - GitHub API limitation)
   - `gh issue close <number> --comment "Closed by feature deletion automation"`
   - Retry on rate limit (exponential backoff: 2s, 4s, 8s)

**Error Handling** (non-critical):
- `gh` not installed → Warning + skip
- Not authenticated → Warning + skip
- Rate limit → Retry 3x, then skip
- Issue already closed → Log + continue

**Key Decision**: Issues are **closed**, not deleted ([ADR-0120](../../docs/internal/architecture/adr/0120-github-integration-approach.md))

---

### 8. Audit Logger (`src/core/feature-deleter/audit-logger.ts`)

**Purpose**: Deletion audit trail

**Log Location**: `.specweave/logs/feature-deletions.log`

**Log Format** (JSON Lines):
```json
{
  "timestamp": "2025-11-23T14:30:00.000Z",
  "featureId": "FS-052",
  "user": "john.doe",
  "mode": "force",
  "filesDeleted": 47,
  "livingDocsFiles": 1,
  "userStoryFiles": 3,
  "commitSha": "abc123def456",
  "githubIssuesClosed": 3,
  "orphanedIncrements": ["0053-external-tool-import"],
  "status": "success"
}
```

**Public API**:
```typescript
export class FeatureDeletionAuditLogger {
  constructor(logger?: Logger);

  async logDeletion(event: DeletionEvent): Promise<void>;
}

interface DeletionEvent {
  featureId: string;
  timestamp: string;
  user: string;
  mode: 'safe' | 'force';
  filesDeleted: number;
  commitSha?: string;
  orphanedIncrements?: string[];
  githubIssuesClosed?: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}
```

**Log Rotation**: If file > 10MB, rotate to `.feature-deletions.log.1`

---

## Implementation Phases

### Phase 1: Core Validation & File Detection (4 hours)

**Tasks**:
- [ ] T-001: Implement FeatureValidator class
- [ ] T-002: Scan living docs folder (`.specweave/docs/internal/specs/_features/FS-XXX/`)
- [ ] T-003: Scan user story files (`.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`)
- [ ] T-004: Validate active increment references (scan metadata.json)
- [ ] T-005: Git status validation (clean working directory)
- [ ] T-006: Write unit tests (validator.test.ts)

**Deliverable**: Validator returns complete file list + increment references

---

### Phase 2: Deletion Transaction & Git Integration (4 hours)

**Tasks**:
- [ ] T-007: Implement DeletionTransaction class (3-phase commit)
- [ ] T-008: File backup logic (copy to `.specweave/state/deletion-backup/`)
- [ ] T-009: Checkpoint tracking (`.specweave/state/deletion-checkpoint.json`)
- [ ] T-010: Git staging (git rm tracked, fs.unlink untracked)
- [ ] T-011: Git commit with descriptive message
- [ ] T-012: Rollback logic (restore from backup, unstage git)
- [ ] T-013: Write unit tests (deletion-transaction.test.ts)
- [ ] T-014: Write integration tests (git-integration.test.ts)

**Deliverable**: Atomic deletion with rollback capability

---

### Phase 3: Confirmation UX & CLI Command (3 hours)

**Tasks**:
- [ ] T-015: Implement ConfirmationManager (4-tier gates)
- [ ] T-016: Validation report display (colored table)
- [ ] T-017: Primary confirmation prompt (Inquirer.js)
- [ ] T-018: Elevated confirmation (type "delete")
- [ ] T-019: GitHub confirmation (separate prompt)
- [ ] T-020: CLI command registration (delete-feature.ts)
- [ ] T-021: Flag parsing (--force, --dry-run, --no-git, --no-github, --yes)
- [ ] T-022: Write unit tests (confirmation-manager.test.ts)

**Deliverable**: Interactive CLI command with multi-gate confirmations

---

### Phase 4: GitHub Integration & Cleanup (3 hours)

**Tasks**:
- [ ] T-023: Implement FeatureDeletionGitHubService
- [ ] T-024: Find issues matching pattern `[FS-XXX][US-YYY]`
- [ ] T-025: Close issues via `gh issue close` (with retry logic)
- [ ] T-026: Handle gh CLI errors (not installed, not authenticated)
- [ ] T-027: Rate limit handling (exponential backoff)
- [ ] T-028: Update orphaned increment metadata (if force mode)
- [ ] T-029: Write unit tests (github-service.test.ts)
- [ ] T-030: Write integration tests (github-integration.test.ts)

**Deliverable**: GitHub issue cleanup with error resilience

---

### Phase 5: Audit Logging & Dry-Run Mode (2 hours)

**Tasks**:
- [ ] T-031: Implement FeatureDeletionAuditLogger
- [ ] T-032: JSON Lines log format
- [ ] T-033: Log rotation (> 10MB)
- [ ] T-034: Dry-run mode (preview without execution)
- [ ] T-035: Dry-run report formatting
- [ ] T-036: Write unit tests (audit-logger.test.ts)
- [ ] T-037: Write E2E tests (delete-feature-command.test.ts)

**Deliverable**: Complete audit trail + dry-run preview

---

## Test Strategy

**Test-Driven Development (TDD)**:
1. Write failing test (RED)
2. Implement minimal code (GREEN)
3. Refactor for quality (REFACTOR)

**Coverage Target**: 85% minimum

### Unit Tests (90%+ coverage)

**Files**:
- `tests/unit/feature-deleter/validator.test.ts`
- `tests/unit/feature-deleter/deletion-transaction.test.ts`
- `tests/unit/feature-deleter/confirmation-manager.test.ts`
- `tests/unit/feature-deleter/git-service.test.ts`
- `tests/unit/feature-deleter/github-service.test.ts`
- `tests/unit/feature-deleter/audit-logger.test.ts`

**Test Cases**:
- Feature validation (exists, active increments, git status)
- File backup and restore
- Git staging and rollback
- Confirmation prompts (all 4 tiers)
- GitHub issue search and closure
- Audit log writing and rotation

**Mocking**:
- `fs` operations (use `memfs`)
- `simple-git` (mock git commands)
- `inquirer` prompts (use `inquirer-test`)
- `gh` CLI (mock `execFileNoThrow`)

---

### Integration Tests (80%+ coverage)

**Files**:
- `tests/integration/feature-deleter/end-to-end-deletion.test.ts`
- `tests/integration/feature-deleter/git-integration.test.ts`
- `tests/integration/feature-deleter/github-integration.test.ts`

**Test Cases**:
- Complete deletion flow (safe mode)
- Force deletion flow (with orphaned increments)
- Dry-run mode (no execution)
- Rollback on git commit failure
- GitHub cleanup with rate limit retry
- Audit log persistence

**Test Environment**:
- Temporary git repository (`os.tmpdir()`)
- Mock GitHub API responses
- Isolated test directories

---

### E2E Tests (70%+ coverage)

**Files**:
- `tests/e2e/delete-feature-command.test.ts`

**Test Cases**:
- CLI command execution (spawn subprocess)
- User confirmation prompts (mock stdin)
- Flag combinations (--force, --dry-run, --yes, etc.)
- Error messages and exit codes
- Multi-feature deletion workaround (shell loop)

**Test Execution**:
```bash
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e            # E2E tests only
npm run test:all            # All tests
npm run test:coverage       # Coverage report (must be 85%+)
```

---

## Error Handling Strategy

### Critical Errors (Abort + Rollback)

**ValidationError**: Feature doesn't exist, invalid format
```
❌ Validation failed:
   - Feature FS-052 not found (no living docs or user stories)
```

**FileSystemError**: Permission denied, disk full
```
❌ File deletion failed:
   - EACCES: permission denied, unlink 'file.md'
   - Attempting rollback...
   ✓ Rollback complete: Files restored from backup
```

**GitError**: Repository corrupted, merge conflict
```
❌ Git commit failed:
   - fatal: Unable to create '.git/index.lock': File exists
   - Attempting rollback...
   ✓ Rollback complete: Git index reset
```

---

### Non-Critical Errors (Log + Continue)

**GitHubAPIError**: API down, rate limit exceeded
```
⚠️  GitHub cleanup failed (non-critical):
   - Rate limit exceeded (5000 requests/hour)
   - Files deleted successfully, but GitHub issues remain open
   - Manually close issues: gh issue close 42 43 44
```

**MetadataUpdateError**: Orphaned increment metadata update failed
```
⚠️  Metadata update failed (non-critical):
   - Cannot write to .specweave/increments/0053/metadata.json
   - Manually remove feature_id field from metadata
```

---

## Performance Benchmarks

**Typical Feature** (47 files, 3 GitHub issues):

| Phase | Time | Notes |
|-------|------|-------|
| Validation | ~100ms | File scanning, git status |
| Backup | ~300ms | Copy 47 files to temp |
| Git staging | ~200ms | git rm 35 tracked, unlink 12 untracked |
| Git commit | ~150ms | Create commit |
| GitHub cleanup | ~2s | Close 3 issues (API rate limit) |
| Audit log | ~10ms | Write JSON to file |
| **Total** | **~2.76s** | Within 5s target ✓ |

**Large Feature** (150 files, 10 GitHub issues):

| Phase | Time | Notes |
|-------|------|-------|
| Validation | ~200ms | Scan 150 files |
| Backup | ~1s | Copy 150 files |
| Git staging | ~500ms | git rm 120 tracked, unlink 30 untracked |
| Git commit | ~200ms | Create commit |
| GitHub cleanup | ~6s | Close 10 issues (batched) |
| **Total** | **~7.9s** | Slightly over 5s target |

**Optimization**: Batch GitHub issue closure (5 at a time) to reduce API calls

---

## CLI Usage Examples

### Example 1: Safe Deletion (Default)

```bash
$ specweave delete-feature FS-052

Validation Complete:
  Feature ID: FS-052
  Files to delete: 47
    - Living docs: 1
    - User stories: 3
  ✓ No active increments (safe to delete)
  GitHub issues: 3

? Delete feature FS-052 (47 files)? (y/N): y

GitHub Issue Cleanup:
  - #42: [FS-052][US-001] User Story Title
  - #43: [FS-052][US-002] Another Story
  - #44: [FS-052][US-003] Third Story

? Close 3 GitHub issues? (y/N): y

✓ Deleting feature FS-052...
  ✓ Files backed up
  ✓ Git deletions staged
  ✓ Git commit created (abc123d)
  ✓ GitHub issues closed (3/3)
  ✓ Audit log written

Feature FS-052 deleted successfully!
```

---

### Example 2: Force Deletion (Active Increments)

```bash
$ specweave delete-feature FS-052 --force

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
  ✓ Files backed up
  ✓ Git deletions staged
  ✓ Git commit created (def456a)
  ✓ Orphaned metadata updated (0053)
  ✓ GitHub issues closed (3/3)
  ✓ Audit log written

Feature FS-052 deleted (force mode). Increment 0053 orphaned.
```

---

### Example 3: Dry-Run Mode (Preview)

```bash
$ specweave delete-feature FS-052 --dry-run

Validation Complete:
  Feature ID: FS-052
  Files to delete: 47
  ✓ No active increments (safe to delete)
  GitHub issues: 3

[DRY-RUN] Deletion Plan:

Files to delete:
  .specweave/docs/internal/specs/_features/FS-052/FEATURE.md
  .specweave/docs/internal/specs/specweave/FS-052/README.md
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

### Example 4: Skip All Confirmations (CI Mode)

```bash
$ specweave delete-feature FS-052 --yes --no-github

✓ Deleting feature FS-052...
  ✓ Files backed up
  ✓ Git deletions staged
  ✓ Git commit created (abc123d)
  ✓ GitHub cleanup skipped (--no-github)
  ✓ Audit log written

Feature FS-052 deleted successfully!
```

---

## Migration Path

**No breaking changes**: New command, no existing functionality modified.

**Integration Points**:
- Uses existing logger abstraction (`src/utils/logger.ts`)
- Uses existing git utilities (if any in `src/core/git/`)
- Uses existing GitHub client pattern (gh CLI)
- Uses existing config system (`.specweave/config.json`)

---

## Future Enhancements (v2+)

**Batch Deletion** ([ADR-0125](../../docs/internal/architecture/adr/0125-incremental-vs-batch-deletion.md)):
```bash
$ specweave delete-feature FS-050 FS-051 FS-052
> Found 3 features to delete: 120 files total
> Delete all 3 features? (y/N): y
```

**Undo Command**:
```bash
$ specweave undo-delete FS-052
> Restore from git commit abc123d? (y/N): y
> ✓ Feature FS-052 restored
```

**Archive Instead of Delete**:
```bash
$ specweave archive-feature FS-052
> Move to .specweave/docs/internal/archive/FS-052/? (y/N): y
```

---

## Security Considerations

**File Permissions**:
- Check write permissions before deletion
- Validate feature ID format (prevent path traversal)

**Git Safety**:
- Never delete `.git/` folder
- Never delete outside project root
- Validate repository is clean (no uncommitted changes)

**GitHub Safety**:
- Only close issues matching exact pattern `[FS-XXX][US-YYY]`
- Require separate confirmation for GitHub cleanup
- Log all GitHub operations to audit trail

**Audit Trail**:
- Log all deletions (success, partial, failed)
- Include user, timestamp, mode, files deleted
- Append-only log (no deletion or modification)

---

## References

**Architecture Decisions**:
- [ADR-0118: Command Interface Pattern](../../docs/internal/architecture/adr/0118-command-interface-pattern.md)
- [ADR-0119: Git Integration Strategy](../../docs/internal/architecture/adr/0119-git-integration-strategy.md)
- [ADR-0120: GitHub Integration Approach](../../docs/internal/architecture/adr/0120-github-integration-approach.md)
- [ADR-0123: Deletion Orchestration Pattern](../../docs/internal/architecture/adr/0123-deletion-orchestration-pattern.md)
- [ADR-0124: Atomic Deletion with Transaction Rollback](../../docs/internal/architecture/adr/0124-atomic-deletion-with-transaction-rollback.md)
- [ADR-0125: Incremental vs Batch Deletion](../../docs/internal/architecture/adr/0125-incremental-vs-batch-deletion.md)
- [ADR-0126: Confirmation UX Multi-Gate Pattern](../../docs/internal/architecture/adr/0126-confirmation-ux-multi-gate-pattern.md)

**Existing Code**:
- `src/cli/commands/init.ts` - CLI command pattern
- `plugins/specweave-github/lib/github-client-v2.ts` - GitHub integration
- `src/utils/logger.ts` - Logger abstraction
- `src/utils/execFileNoThrow.ts` - Safe subprocess execution

**External Libraries**:
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [simple-git](https://github.com/steveukx/git-js) - Git operations
- [GitHub CLI](https://cli.github.com/) - GitHub API access

---

## Next Steps

1. **Review this plan** with Tech Lead and PM
2. **Create living docs** via `/specweave:sync-docs update`
3. **Start Phase 1** (Core Validation & File Detection)
4. **Write tests first** (TDD approach)
5. **Implement incrementally** (one phase at a time)
6. **Review code** after each phase
7. **Integration test** before final merge
8. **Update README** with new command documentation

---

**Estimated Effort**: 16 hours (2 days)

**Test Coverage Target**: 85% minimum

**Performance Target**: < 5 seconds for typical feature
