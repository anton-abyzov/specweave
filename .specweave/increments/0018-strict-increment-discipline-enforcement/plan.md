---
increment: 0018-strict-increment-discipline-enforcement
architecture_docs:
  - ../../docs/internal/architecture/adr/0020-cli-discipline-validation.md
  - ../../docs/internal/architecture/adr/0021-pm-agent-enforcement.md
  - ../../docs/internal/architecture/adr/0022-github-sync-architecture.md
  - ../../docs/internal/architecture/diagrams/discipline/enforcement-flow.mmd
  - ../../docs/internal/architecture/diagrams/discipline/cli-sequence.mmd
test_strategy: TDD (Test-Driven Development)
coverage_target: 85%
---

# Implementation Plan: Strict Increment Discipline Enforcement

## Architecture Overview

**Complete architecture**: See [System Design](../../docs/internal/architecture/system-design.md)

**Key decisions**:
- [ADR-0020: CLI Discipline Validation](../../docs/internal/architecture/adr/0020-cli-discipline-validation.md) - Standalone CLI command for validation
- [ADR-0021: PM Agent Enforcement](../../docs/internal/architecture/adr/0021-pm-agent-enforcement.md) - Agent integration via Bash tool
- [ADR-0022: GitHub Sync Architecture](../../docs/internal/architecture/adr/0022-github-sync-architecture.md) - Post-completion sync verification

**Visual Architecture**: See [Enforcement Flow Diagram](../../docs/internal/architecture/diagrams/discipline/enforcement-flow.mmd)

---

## Technology Stack Summary

- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Node.js 20 LTS
- **CLI**: Commander.js
- **Testing**: Jest (unit) + Playwright (E2E)
- **GitHub Integration**: `gh` CLI
- **Exit Codes**: 0 (compliant), 1 (violations), 2 (errors)

**Key Design Patterns**:
- **Command Pattern**: CLI command encapsulates validation logic
- **Strategy Pattern**: DisciplineChecker applies rules based on config
- **Observer Pattern**: Hooks observe increment lifecycle events

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)

**Goal**: Implement core validation logic and CLI command

#### 1.1: Core Types and Interfaces

**File**: `src/core/increment/types.ts`

```typescript
export interface ValidationViolation {
  type: 'active_limit' | 'incomplete_work' | 'emergency_required' | 'metadata_invalid';
  message: string;
  suggestion: string;
  severity: 'error' | 'warning';
  affectedIncrements?: string[];
}

export interface ValidationResult {
  compliant: boolean;
  activeCount: number;
  maxAllowed: number;
  violations: ValidationViolation[];
  increments: IncrementStatus[];
  timestamp: string;
}

export interface DisciplineCheckOptions {
  verbose?: boolean;
  json?: boolean;
  fix?: boolean;
}
```

**Tests**: `tests/unit/core/increment/types.test.ts`
- Validate type definitions
- Test interface constraints

**Acceptance Criteria**:
- [ ] All types defined with JSDoc comments
- [ ] Types exported from core module
- [ ] Unit tests validate type safety

---

#### 1.2: DisciplineChecker Class

**File**: `src/core/increment/discipline-checker.ts`

```typescript
export class DisciplineChecker {
  constructor(
    private projectRoot: string,
    private config?: ConfigManager
  ) {}

  async validate(options: DisciplineCheckOptions = {}): Promise<ValidationResult> {
    const config = this.config || new ConfigManager(this.projectRoot);
    const limits = config.load().limits || DEFAULT_CONFIG.limits;

    // Phase 1: Detect all increments
    const detector = new IncrementStatusDetector(this.projectRoot);
    const allIds = await detector.getAllIncrements();
    const statuses = await Promise.all(
      allIds.map(id => detector.getStatus(id))
    );

    // Phase 2: Count active increments
    const active = statuses.filter(s => s.status === 'active');
    const activeCount = active.length;

    // Phase 3: Find incomplete increments
    const incomplete = statuses.filter(s =>
      s.status !== 'completed' && s.percentComplete < 100
    );

    // Phase 4: Validate rules
    const violations: ValidationViolation[] = [];

    // Rule 1: Check hard cap
    if (activeCount > limits.hardCap) {
      violations.push({
        type: 'active_limit',
        message: `Active increments (${activeCount}) exceeds hard cap (${limits.hardCap})`,
        suggestion: `Complete or pause ${activeCount - limits.hardCap} increment(s)`,
        severity: 'error',
        affectedIncrements: active.map(s => s.id),
      });
    }

    // Rule 2: Check incomplete work
    if (incomplete.length > 0) {
      incomplete.forEach(inc => {
        violations.push({
          type: 'incomplete_work',
          message: `Increment ${inc.id} is incomplete (${inc.percentComplete}%)`,
          suggestion: `Complete or close increment ${inc.id}`,
          severity: 'error',
          affectedIncrements: [inc.id],
        });
      });
    }

    // Rule 3: Check emergency interrupt rules
    if (activeCount === 2) {
      const types = active.map(s => s.type);
      const emergencyTypes = limits.typeBehaviors?.canInterrupt || [];
      const hasEmergency = types.some(t => emergencyTypes.includes(t));

      if (!hasEmergency) {
        violations.push({
          type: 'emergency_required',
          message: 'Two active increments without emergency type (hotfix/bug)',
          suggestion: 'Complete one increment or mark as hotfix/bug',
          severity: 'error',
          affectedIncrements: active.map(s => s.id),
        });
      }
    }

    return {
      compliant: violations.length === 0,
      activeCount,
      maxAllowed: limits.maxActiveIncrements || 1,
      violations,
      increments: statuses,
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Tests**: `tests/unit/core/increment/discipline-checker.test.ts`
- Test all validation rules (active limit, incomplete work, emergency)
- Test with different config values
- Test edge cases (0 increments, exactly at limit)
- Mock IncrementStatusDetector

**Coverage Target**: 90%+

**Acceptance Criteria**:
- [ ] DisciplineChecker class implemented
- [ ] All 3 validation rules working
- [ ] Unit tests: 90%+ coverage
- [ ] Proper error handling for missing files

---

#### 1.3: CLI Command Implementation

**File**: `src/cli/commands/check-discipline.ts`

```typescript
import { Command } from 'commander';
import { DisciplineChecker } from '../../core/increment/discipline-checker.js';
import chalk from 'chalk';

export function createCheckDisciplineCommand(): Command {
  const command = new Command('check-discipline');

  command
    .description('Validate increment discipline rules')
    .option('--verbose', 'Show detailed status for all increments')
    .option('--json', 'Output results as JSON')
    .option('--fix', 'Auto-repair metadata inconsistencies (if safe)')
    .action(async (options) => {
      try {
        const projectRoot = process.cwd();
        const checker = new DisciplineChecker(projectRoot);
        const result = await checker.validate(options);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printHumanReadable(result, options.verbose);
        }

        // Exit codes: 0 (compliant), 1 (violations), 2 (errors)
        process.exit(result.compliant ? 0 : 1);
      } catch (error) {
        console.error(chalk.red('❌ System error:'), error.message);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(2);
      }
    });

  return command;
}

function printHumanReadable(result: ValidationResult, verbose: boolean): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DISCIPLINE CHECK RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Active Increments: ${result.activeCount}/${result.maxAllowed}`);
  console.log(`Status: ${result.compliant ? chalk.green('✅ COMPLIANT') : chalk.red('❌ VIOLATIONS')}`);
  console.log('');

  if (result.violations.length > 0) {
    console.log(chalk.yellow('Violations:'));
    result.violations.forEach(v => {
      console.log(`  ${chalk.red('•')} ${v.message}`);
      console.log(`    ${chalk.cyan('Suggestion:')} ${v.suggestion}`);
      if (v.affectedIncrements && v.affectedIncrements.length > 0) {
        console.log(`    ${chalk.gray('Affected:')} ${v.affectedIncrements.join(', ')}`);
      }
    });
    console.log('');
    console.log(chalk.cyan('💡 Commands:'));
    console.log('  /specweave:status     # Show all increments');
    console.log('  /specweave:close      # Close incomplete increments');
    console.log('  /specweave:do         # Resume work on active increment');
  } else {
    console.log(chalk.green('✅ All discipline rules satisfied'));
  }

  if (verbose) {
    console.log('');
    console.log(chalk.gray('Increment Details:'));
    result.increments.forEach(inc => {
      const statusIcon = inc.status === 'active' ? '🔄' :
                        inc.status === 'completed' ? '✅' :
                        inc.status === 'paused' ? '⏸️' : '📋';
      console.log(`  ${statusIcon} ${inc.id} (${inc.status}, ${inc.percentComplete}%)`);
    });
  }
}
```

**Tests**: `tests/unit/cli/check-discipline.test.ts`
- Test CLI command creation
- Test option parsing (--verbose, --json, --fix)
- Test exit codes (0, 1, 2)
- Test output formats (human-readable, JSON)
- Mock DisciplineChecker

**Coverage Target**: 85%+

**Acceptance Criteria**:
- [ ] CLI command registered in main CLI
- [ ] All options working (--verbose, --json, --fix)
- [ ] Exit codes correct (0/1/2)
- [ ] Output formats tested (human + JSON)
- [ ] Unit tests: 85%+ coverage

---

### Phase 2: PM Agent Integration (Days 3-4)

**Goal**: Integrate check-discipline into PM agent workflow

#### 2.1: Update PM Agent AGENT.md

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Changes**:
1. Replace TypeScript snippet (lines 36-73) with Bash execution
2. Add error message templates
3. Update pre-planning validation step

**Before**:
```typescript
// Import the status detector
import { IncrementStatusDetector } from '../../src/core/increment-status';

// Check for incomplete increments
const detector = new IncrementStatusDetector();
const incomplete = await detector.getAllIncomplete();

if (incomplete.length > 0) {
  // ❌ BLOCK IMMEDIATELY
  console.log('❌ Cannot plan new increment!');
  // ... show violations ...
  throw new Error('Increment discipline violation');
}
```

**After**:
```markdown
## Step 0: Validate Increment Discipline (MANDATORY)

Execute via Bash tool:

```bash
npx specweave check-discipline --json
```

**Parse exit code**:
- 0 → Continue to Step 1 (planning)
- 1 → Show violations, BLOCK planning
- 2 → Show error, request user to fix

**If exit code 1** (violations found):

```
❌ Cannot plan new increment!

[Parse JSON output and show violations]

💡 Suggestions:
  1. Complete or close incomplete increments
  2. Retry: /specweave:increment "your feature"

Commands:
  /specweave:status     # Show all increments
  /specweave:close      # Close incomplete increments
  /specweave:do         # Resume work on active increment
```

**STOP HERE** - Do NOT proceed to planning if violations exist.
```

**Tests**: `tests/integration/pm-agent-enforcement.spec.ts`
- Test PM agent blocks on violations
- Test PM agent allows planning when compliant
- Test error message clarity
- Mock check-discipline CLI

**Coverage Target**: 80%+

**Acceptance Criteria**:
- [ ] PM agent AGENT.md updated with Bash execution
- [ ] TypeScript snippet removed
- [ ] Error message templates added
- [ ] Integration tests passing
- [ ] Manual testing with violations

---

#### 2.2: CLI Integration in /increment Command

**File**: `src/cli/commands/increment.ts` (if exists) or equivalent

**Add pre-flight check**:
```typescript
// Before invoking PM agent
const checkResult = execSync('npx specweave check-discipline --json', {
  cwd: projectRoot,
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe'],
});

if (checkResult.status !== 0) {
  const result = JSON.parse(checkResult.stdout);
  console.error(chalk.red('❌ Cannot create increment: Discipline violations detected'));
  result.violations.forEach(v => {
    console.error(chalk.red(`  • ${v.message}`));
    console.error(chalk.cyan(`    Suggestion: ${v.suggestion}`));
  });
  process.exit(1);
}

// Continue with PM agent invocation
```

**Tests**: `tests/integration/increment-command.spec.ts`
- Test /increment blocks on violations
- Test /increment proceeds when compliant

**Acceptance Criteria**:
- [ ] /increment command runs check-discipline before planning
- [ ] Command blocks if violations found
- [ ] Integration tests passing

---

### Phase 3: GitHub Sync Verification (Days 5-6)

**Goal**: Implement post-completion hook for GitHub sync

#### 3.1: Post-Increment-Completion Hook

**File**: `plugins/specweave/hooks/post-increment-completion.sh`

```bash
#!/bin/bash
# Post-Increment Completion Hook
# Verifies GitHub sync and auto-closes issue if needed

set -e

INCREMENT_ID="$1"
INCREMENT_PATH=".specweave/increments/$INCREMENT_ID"
METADATA_PATH="$INCREMENT_PATH/metadata.json"
LOG_DIR=".specweave/logs"
LOG_FILE="$LOG_DIR/github-sync.log"

# Create log directory if needed
mkdir -p "$LOG_DIR"

# Helper: Log action
log_action() {
  local action="$1"
  local result="$2"
  local error="${3:-}"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $INCREMENT_ID | $action | $result${error:+ | error:$error}" >> "$LOG_FILE"
}

# Phase 1: Check if GitHub sync enabled
if ! jq -e '.sync.enabled' .specweave/config.json > /dev/null 2>&1; then
  echo "ℹ️  GitHub sync not enabled, skipping"
  log_action "check" "skipped" "sync_disabled"
  exit 0
fi

# Phase 2: Load metadata
if [ ! -f "$METADATA_PATH" ]; then
  echo "⚠️  No metadata.json found for $INCREMENT_ID"
  log_action "check" "skipped" "no_metadata"
  exit 0
fi

ISSUE_NUMBER=$(jq -r '.github.issue // empty' "$METADATA_PATH" 2>/dev/null)

if [ -z "$ISSUE_NUMBER" ]; then
  echo "ℹ️  No GitHub issue linked to $INCREMENT_ID"
  log_action "check" "skipped" "no_issue"
  exit 0
fi

# Phase 3: Check GitHub CLI availability
if ! command -v gh &> /dev/null; then
  echo "ℹ️  GitHub CLI not found, skipping sync verification"
  log_action "check" "skipped" "gh_not_found"
  exit 0
fi

if ! gh auth status &> /dev/null; then
  echo "⚠️  GitHub CLI not authenticated, skipping sync verification"
  echo "💡 Run: gh auth login"
  log_action "check" "skipped" "gh_not_authenticated"
  exit 0
fi

# Phase 4: Check issue state
ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state -q .state 2>/dev/null)

if [ -z "$ISSUE_STATE" ]; then
  echo "⚠️  Failed to fetch GitHub issue #$ISSUE_NUMBER"
  log_action "view" "failed" "issue_not_found"
  exit 0  # Non-blocking
fi

# Phase 5: Close issue if open
if [ "$ISSUE_STATE" = "OPEN" ]; then
  echo "🔗 Closing GitHub issue #$ISSUE_NUMBER for completed increment $INCREMENT_ID"

  # Generate completion summary
  SUMMARY=$(cat "$INCREMENT_PATH/spec.md" 2>/dev/null | head -20 | tail -10 || echo "Increment completed")
  COMMENT="✅ Increment $INCREMENT_ID completed\n\n$SUMMARY\n\nClosed automatically by SpecWeave"

  # Close issue with comment
  if gh issue close "$ISSUE_NUMBER" --comment "$COMMENT" > /dev/null 2>&1; then
    echo "✅ GitHub issue #$ISSUE_NUMBER closed"
    log_action "close" "success" ""

    # Update metadata with closed timestamp
    jq '.github.closedAt = now | todate' "$METADATA_PATH" > "$METADATA_PATH.tmp"
    mv "$METADATA_PATH.tmp" "$METADATA_PATH"
  else
    echo "⚠️  Failed to close issue #$ISSUE_NUMBER"
    log_action "close" "failed" "gh_api_error"
  fi
else
  echo "✅ GitHub issue #$ISSUE_NUMBER already closed"
  log_action "verify" "already_closed" ""
fi

exit 0
```

**Tests**: `tests/integration/github-sync.spec.ts`
- Test hook closes open issue
- Test hook skips if already closed
- Test hook non-blocking if GitHub unavailable
- Test logging works correctly
- Mock GitHub CLI

**Coverage Target**: 85%+

**Acceptance Criteria**:
- [ ] Hook closes open GitHub issues
- [ ] Hook skips if issue already closed
- [ ] Hook is non-blocking (all errors exit 0)
- [ ] Hook logs all actions
- [ ] Hook updates metadata.json with closedAt
- [ ] Integration tests: 85%+ coverage

---

#### 3.2: Metadata Validator

**File**: `src/core/increment/metadata-validator.ts`

```typescript
export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class MetadataValidator {
  /**
   * Validate metadata.json structure
   */
  validate(metadata: any): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.increment) {
      errors.push('Missing required field: increment');
    }

    if (!metadata.status) {
      errors.push('Missing required field: status');
    }

    // Validate status enum
    const validStatuses = ['planned', 'active', 'paused', 'completed', 'abandoned'];
    if (metadata.status && !validStatuses.includes(metadata.status)) {
      errors.push(`Invalid status: ${metadata.status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // GitHub sync fields (if present)
    if (metadata.github) {
      if (typeof metadata.github.issue !== 'number') {
        errors.push('Invalid github.issue: Must be a number');
      }

      if (!metadata.github.url || typeof metadata.github.url !== 'string') {
        errors.push('Invalid github.url: Must be a string');
      }

      // Validate URL format
      if (metadata.github.url && !metadata.github.url.match(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/)) {
        warnings.push('github.url does not match expected GitHub issue URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect inconsistencies between metadata and external state
   */
  detectInconsistencies(metadata: any, githubState?: string): string[] {
    const issues: string[] = [];

    if (githubState) {
      if (metadata.status === 'completed' && githubState === 'OPEN') {
        issues.push('Increment marked completed but GitHub issue still open');
      }

      if (metadata.status === 'active' && githubState === 'CLOSED') {
        issues.push('Increment still active but GitHub issue already closed');
      }
    }

    return issues;
  }

  /**
   * Auto-repair common issues (if safe)
   */
  async repair(metadata: any, options: { fix: boolean } = { fix: false }): Promise<any> {
    if (!options.fix) {
      return metadata;
    }

    const repaired = { ...metadata };

    // Fix: Missing status (default to 'planned')
    if (!repaired.status) {
      repaired.status = 'planned';
    }

    // Fix: Invalid status (default to 'active')
    const validStatuses = ['planned', 'active', 'paused', 'completed', 'abandoned'];
    if (!validStatuses.includes(repaired.status)) {
      repaired.status = 'active';
    }

    return repaired;
  }
}
```

**Tests**: `tests/unit/core/increment/metadata-validator.test.ts`
- Test validation with valid metadata
- Test validation with missing fields
- Test validation with invalid fields
- Test inconsistency detection
- Test repair logic

**Coverage Target**: 90%+

**Acceptance Criteria**:
- [ ] Validates all required fields
- [ ] Detects inconsistencies with GitHub
- [ ] Auto-repair logic works (--fix option)
- [ ] Unit tests: 90%+ coverage

---

### Phase 4: Testing & Documentation (Days 7-8)

**Goal**: Comprehensive testing and documentation

#### 4.1: E2E Tests

**File**: `tests/e2e/enforcement.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Increment Discipline Enforcement', () => {
  test('full lifecycle: create → violate → resolve → complete', async ({ page }) => {
    // 1. Start with clean state (no increments)
    await runCommand('specweave check-discipline');
    expect(exitCode).toBe(0);

    // 2. Create first increment
    await runCommand('specweave increment "Feature A"');
    expect(incrementCreated('0001-feature-a')).toBe(true);

    // 3. Try to create second increment (should fail)
    await runCommand('specweave increment "Feature B"');
    expect(exitCode).toBe(1);
    expect(output).toContain('Cannot plan new increment');

    // 4. Complete first increment
    await runCommand('specweave done 0001-feature-a');
    expect(incrementCompleted('0001-feature-a')).toBe(true);

    // 5. Now can create second increment
    await runCommand('specweave increment "Feature B"');
    expect(incrementCreated('0002-feature-b')).toBe(true);

    // 6. Verify GitHub issue closed (if sync enabled)
    const metadata = await readMetadata('0001-feature-a');
    if (metadata.github?.issue) {
      const issue = await checkGitHubIssue(metadata.github.issue);
      expect(issue.state).toBe('CLOSED');
    }
  });

  test('emergency interrupt allowed for hotfix', async ({ page }) => {
    // 1. Create feature increment
    await runCommand('specweave increment "Feature A"');

    // 2. Create hotfix (emergency interrupt)
    await runCommand('specweave increment "Critical Bug Fix" --type hotfix');
    expect(incrementCreated('0002-critical-bug-fix')).toBe(true);

    // 3. Verify 2 active increments allowed
    await runCommand('specweave check-discipline');
    expect(exitCode).toBe(0);

    // 4. Try to create third increment (should fail)
    await runCommand('specweave increment "Feature B"');
    expect(exitCode).toBe(1);
  });

  test('PM agent enforcement prevents planning with violations', async ({ page }) => {
    // 1. Create incomplete increment
    await runCommand('specweave increment "Feature A"');
    await markIncompleteManually('0001-feature-a', 50);

    // 2. Try to plan new increment via PM agent
    const result = await invokePMAgent('Feature B');

    // 3. Verify PM agent blocked
    expect(result.blocked).toBe(true);
    expect(result.message).toContain('Cannot plan new increment');
    expect(result.message).toContain('Incomplete work');

    // 4. Complete increment
    await runCommand('specweave done 0001-feature-a');

    // 5. Now PM agent allows planning
    const result2 = await invokePMAgent('Feature B');
    expect(result2.blocked).toBe(false);
    expect(result2.planCreated).toBe(true);
  });
});
```

**Coverage Target**: 90%+ (critical paths)

**Acceptance Criteria**:
- [ ] E2E tests cover full lifecycle
- [ ] Tests cover emergency interrupt scenario
- [ ] Tests cover PM agent enforcement
- [ ] Tests cover GitHub sync verification
- [ ] All tests passing

---

#### 4.2: Documentation

**Files to Update**:

1. **CLI Reference**: `docs-site/docs/cli/check-discipline.md`
   - Command syntax
   - Options (--verbose, --json, --fix)
   - Exit codes
   - Examples

2. **PM Agent Docs**: `plugins/specweave/agents/pm/README.md`
   - Step 0 validation process
   - How to resolve violations
   - Common scenarios

3. **GitHub Sync Docs**: `plugins/specweave-github/README.md`
   - Post-completion hook behavior
   - Metadata structure
   - Troubleshooting

4. **Troubleshooting Guide**: `docs-site/docs/troubleshooting/discipline.md`
   - Common violations and fixes
   - Debugging tips
   - FAQ

**Acceptance Criteria**:
- [ ] CLI docs complete with examples
- [ ] PM agent docs updated
- [ ] GitHub sync docs updated
- [ ] Troubleshooting guide created
- [ ] All docs reviewed and tested

---

## Technical Challenges & Solutions

### Challenge 1: Status Detection Performance

**Problem**: Loading 100+ metadata.json files may be slow

**Solution**:
- Async loading with `Promise.all()`
- Cache metadata in memory for duration of command
- Consider adding index file if >200 increments

### Challenge 2: Shell Script Portability

**Problem**: Bash script may not work on Windows

**Solution**:
- Use Git Bash on Windows (included with Git)
- Document Git for Windows requirement
- Consider TypeScript hook utility in future

### Challenge 3: GitHub API Rate Limits

**Problem**: May hit 5000/hour rate limit with frequent syncs

**Solution**:
- Hook is non-blocking (continues on failure)
- Cache issue state for 5 minutes
- Log rate limit errors for debugging

### Challenge 4: Metadata Inconsistencies

**Problem**: metadata.json may be manually edited incorrectly

**Solution**:
- MetadataValidator detects issues
- --fix option repairs safe issues
- Clear error messages for manual fixes

---

## Test Strategy

### Unit Tests (Target: 85%+)

**Files**:
- `discipline-checker.test.ts` (90%+)
- `metadata-validator.test.ts` (90%+)
- `check-discipline.test.ts` (85%+)

**Approach**:
- Mock file system operations
- Mock GitHub CLI calls
- Test all validation rules
- Test all error scenarios

### Integration Tests (Target: 80%+)

**Files**:
- `pm-agent-enforcement.spec.ts`
- `github-sync.spec.ts`
- `increment-command.spec.ts`

**Approach**:
- Create real increments in test environment
- Test CLI + agent interaction
- Mock GitHub API for sync tests

### E2E Tests (Target: 90%+ for critical paths)

**Files**:
- `enforcement.spec.ts` (Playwright)

**Approach**:
- Full workflow tests (create → violate → resolve)
- Emergency interrupt scenarios
- GitHub sync verification

---

## Deployment Plan

### Week 1: Foundation + Core

**Days 1-2**:
- Implement DisciplineChecker class
- Implement CLI command
- Unit tests

**Days 3-4**:
- Update PM agent AGENT.md
- Integrate check-discipline into /increment command
- Integration tests

### Week 2: GitHub Sync + Testing

**Days 5-6**:
- Implement post-increment-completion hook
- Implement MetadataValidator
- Integration tests

**Days 7-8**:
- E2E tests (Playwright)
- Documentation updates
- Code review and refinements

### Rollout Strategy

1. **Beta Testing** (Week 3):
   - Deploy to internal SpecWeave development
   - Test with real increments
   - Gather feedback

2. **Production** (Week 4):
   - Update package version
   - Publish to NPM
   - Update docs site
   - Announce in release notes

---

## Success Criteria

**Functional**:
- [ ] CLI command `specweave check-discipline` works
- [ ] Exit codes correct (0/1/2)
- [ ] PM agent blocks on violations
- [ ] GitHub issues auto-close on completion
- [ ] All validation rules enforced

**Quality**:
- [ ] Unit tests: 85%+ coverage
- [ ] Integration tests: 80%+ coverage
- [ ] E2E tests: 90%+ coverage (critical paths)
- [ ] No regressions in existing functionality

**Documentation**:
- [ ] CLI reference complete
- [ ] PM agent docs updated
- [ ] GitHub sync docs updated
- [ ] Troubleshooting guide created

**Performance**:
- [ ] check-discipline executes in <1 second (100 increments)
- [ ] Hook execution <2 seconds (including GitHub API call)

---

## References

- **Spec**: `.specweave/docs/internal/projects/default/specs/spec-018-strict-discipline-enforcement.md`
- **ADRs**:
  - [ADR-0020: CLI Discipline Validation](../../docs/internal/architecture/adr/0020-cli-discipline-validation.md)
  - [ADR-0021: PM Agent Enforcement](../../docs/internal/architecture/adr/0021-pm-agent-enforcement.md)
  - [ADR-0022: GitHub Sync Architecture](../../docs/internal/architecture/adr/0022-github-sync-architecture.md)
- **Diagrams**:
  - [Enforcement Flow](../../docs/internal/architecture/diagrams/discipline/enforcement-flow.mmd)
  - [CLI Sequence](../../docs/internal/architecture/diagrams/discipline/cli-sequence.mmd)
