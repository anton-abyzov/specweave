# ADR-0033: Auto-Apply vs Manual Review for CI/CD Fixes

**Date**: 2025-11-12
**Status**: Accepted
**Context**: Increment 0029 - CI/CD Failure Detection & Claude Auto-Fix System

---

## Context

After Claude analyzes a CI/CD failure and generates a fix proposal, we need to decide: should fixes be applied automatically or require manual review?

**The Trade-Off**:
- **Auto-Apply**: Fast resolution, zero human intervention, but risk of bad fixes
- **Manual Review**: Safe, user has control, but slower and requires human attention

**Requirements**:
- Fix success rate: 70%+ (from ADR-0032)
- User control: Must never break more than it fixes
- Speed: Minimize time to resolution
- Safety: Critical files need extra protection
- Rollback: Must support undo if fix fails

**Example Scenarios**:

**Scenario 1: TypeScript Type Error (High Confidence)**
```typescript
// Fix proposal: confidence 0.95
{
  "fixes": [{
    "file": "src/core/cicd/monitor.ts",
    "line": 42,
    "oldCode": "this.interval = '60000';",
    "newCode": "this.interval = 60000;",
    "explanation": "Remove quotes to fix type error (string → number)"
  }]
}

// Auto-apply? ✅ Yes (high confidence, simple fix, non-critical file)
```

**Scenario 2: Security Configuration (Low Confidence)**
```typescript
// Fix proposal: confidence 0.6
{
  "fixes": [{
    "file": ".github/workflows/deploy.yml",
    "line": 15,
    "oldCode": "token: ${{ secrets.GITHUB_TOKEN }}",
    "newCode": "token: ${{ secrets.DEPLOY_TOKEN }}",
    "explanation": "Use deployment token instead (uncertain)"
  }]
}

// Auto-apply? ❌ No (low confidence, security-sensitive, workflow file)
```

**Scenario 3: Test Failure (Medium Confidence)**
```typescript
// Fix proposal: confidence 0.75
{
  "fixes": [{
    "file": "tests/unit/monitor.test.ts",
    "line": 25,
    "oldCode": "expect(result).toBe(5);",
    "newCode": "expect(result).toBe(10);",
    "explanation": "Update expected value to match actual"
  }]
}

// Auto-apply? 🤔 Maybe (medium confidence, test file, could be masking real bug)
```

---

## Decision

Use **configurable safety gates** with three auto-apply modes:
1. **Always Manual** (safest): All fixes require review
2. **High Confidence Only** (balanced): Auto-apply if confidence > 0.8 and non-critical files
3. **Always Auto** (fastest): Auto-apply everything, verify with workflow re-run

### Architecture: Safety Gates

```typescript
interface SafetyGate {
  autoApply: boolean;        // Should this fix be auto-applied?
  reason: string;            // Why/why not?
  warnings: string[];        // Potential risks
  requiresReview: boolean;   // Force manual review?
}

class FixSafetyValidator {
  evaluate(proposal: FixProposal, config: Config): SafetyGate {
    // Gate 1: Confidence threshold
    if (proposal.confidence < config.confidenceThreshold) {
      return {
        autoApply: false,
        reason: `Low confidence (${proposal.confidence} < ${config.confidenceThreshold})`,
        warnings: ['Uncertain fix, manual review recommended'],
        requiresReview: true,
      };
    }

    // Gate 2: Critical files
    const criticalFiles = this.checkCriticalFiles(proposal.fixes);
    if (criticalFiles.length > 0) {
      return {
        autoApply: false,
        reason: `Modifies critical files: ${criticalFiles.join(', ')}`,
        warnings: ['Changes to workflow/security files require review'],
        requiresReview: true,
      };
    }

    // Gate 3: Multi-file changes
    if (proposal.fixes.length > config.maxFilesAutoApply) {
      return {
        autoApply: false,
        reason: `Too many files (${proposal.fixes.length} > ${config.maxFilesAutoApply})`,
        warnings: ['Complex multi-file changes are riskier'],
        requiresReview: true,
      };
    }

    // Gate 4: Test file modifications
    const testFiles = proposal.fixes.filter(f => f.file.includes('test'));
    if (testFiles.length > 0 && config.reviewTestChanges) {
      return {
        autoApply: false,
        reason: 'Modifies test files',
        warnings: ['Test changes may mask real bugs'],
        requiresReview: true,
      };
    }

    // All gates passed
    return {
      autoApply: true,
      reason: `High confidence (${proposal.confidence}), non-critical files`,
      warnings: [],
      requiresReview: false,
    };
  }

  private checkCriticalFiles(fixes: Fix[]): string[] {
    const criticalPatterns = [
      '.github/workflows/',       // CI/CD workflows
      'package.json',             // Dependencies
      'tsconfig.json',            // TypeScript config
      '.env',                     // Environment variables
      'src/core/security/',       // Security code
      'src/auth/',                // Authentication
    ];

    return fixes
      .filter(fix => criticalPatterns.some(pattern => fix.file.includes(pattern)))
      .map(fix => fix.file);
  }
}
```

### Configuration (User Control)

```jsonc
// .specweave/config.json
{
  "cicd": {
    "autoFix": {
      // Mode: "never" | "high-confidence" | "always"
      "mode": "high-confidence",

      // Safety thresholds
      "confidenceThreshold": 0.8,      // Auto-apply if > 0.8
      "maxFilesAutoApply": 3,          // Max files in one auto-apply
      "reviewTestChanges": true,       // Always review test file changes

      // Critical files (never auto-apply)
      "criticalFiles": [
        ".github/workflows/**",
        "package.json",
        "*.env",
        "src/core/security/**"
      ],

      // Workflow verification
      "verifyAfterApply": true,        // Re-run workflow to verify
      "rollbackOnFailure": true,       // Auto-rollback if verification fails

      // Notifications
      "notifyOnAutoApply": true,       // Desktop notification when fix applied
      "notifyOnReviewNeeded": true     // Desktop notification when review needed
    }
  }
}
```

### User Workflows

#### Mode 1: "never" (Always Manual)

```bash
# Failure detected → Fix proposed
$ specweave cicd fix propose 12345

✅ Fix proposed for workflow run #12345

Root Cause: TypeScript type error in monitor.ts
Confidence: 0.95 (High)
Files: 1

Changes:
  src/core/cicd/monitor.ts:42
  - this.interval = '60000';
  + this.interval = 60000;

🔍 Review needed (mode: never)

Commands:
  specweave cicd fix apply 12345    # Apply fix
  specweave cicd fix preview 12345  # Preview diff
  specweave cicd fix reject 12345   # Reject fix
```

#### Mode 2: "high-confidence" (Balanced)

```bash
# Failure detected → Fix proposed → Auto-applied (high confidence)
$ specweave cicd status

✅ Auto-applied fix for workflow run #12345
   Root Cause: TypeScript type error
   Confidence: 0.95
   Files: src/core/cicd/monitor.ts
   Verification: Re-running workflow...

# OR: Manual review needed (low confidence)
$ specweave cicd status

⚠️  Fix needs review for workflow run #12346
   Root Cause: Dependency conflict
   Confidence: 0.65 (Low)
   Reason: Uncertain about correct version
   Files: package.json

Commands:
  specweave cicd fix preview 12346
  specweave cicd fix apply 12346
```

#### Mode 3: "always" (Fully Automated)

```bash
# Failure detected → Fix proposed → Auto-applied → Verified
$ specweave cicd report

Today's Auto-Fixes:
  ✅ 12345: TypeScript type error (verified)
  ✅ 12346: Dependency conflict (verified)
  ❌ 12347: Test failure (rollback - fix ineffective)

Success rate: 67% (2/3)
```

### Rollback Mechanism

```typescript
interface FixBackup {
  fixId: string;
  timestamp: Date;
  files: Array<{
    path: string;
    originalContent: string;
    newContent: string;
  }>;
  workflowRunId: number;
}

class FixRollbackManager {
  async createBackup(proposal: FixProposal): Promise<FixBackup> {
    const files = [];

    for (const fix of proposal.fixes) {
      const originalContent = await fs.readFile(fix.file, 'utf-8');
      files.push({
        path: fix.file,
        originalContent,
        newContent: null, // Will be set after apply
      });
    }

    const backup: FixBackup = {
      fixId: generateFixId(),
      timestamp: new Date(),
      files,
      workflowRunId: proposal.workflowRunId,
    };

    // Save backup
    await fs.writeFile(
      `.specweave/state/backups/${backup.fixId}.json`,
      JSON.stringify(backup, null, 2)
    );

    return backup;
  }

  async rollback(fixId: string): Promise<void> {
    const backup = await this.loadBackup(fixId);

    for (const file of backup.files) {
      await fs.writeFile(file.path, file.originalContent);
    }

    console.log(`✅ Rolled back fix ${fixId}`);
    console.log(`   Files restored: ${backup.files.length}`);
  }
}
```

### Verification Flow

```typescript
class FixVerificationManager {
  async verify(fixId: string, workflowRunId: number): Promise<boolean> {
    // Re-run the workflow
    console.log('🔄 Re-running workflow to verify fix...');
    const newRun = await this.githubClient.rerunWorkflow(workflowRunId);

    // Wait for completion (with timeout)
    const result = await this.waitForCompletion(newRun.id, {
      timeout: 10 * 60 * 1000, // 10 minutes
    });

    if (result.conclusion === 'success') {
      console.log('✅ Fix verified! Workflow passed.');
      return true;
    } else {
      console.log('❌ Fix ineffective. Workflow still failing.');
      console.log('   Rolling back changes...');
      await this.rollbackManager.rollback(fixId);
      return false;
    }
  }

  private async waitForCompletion(runId: number, options: { timeout: number }): Promise<WorkflowRun> {
    const startTime = Date.now();

    while (true) {
      const run = await this.githubClient.getWorkflowRun(runId);

      if (run.status === 'completed') {
        return run;
      }

      if (Date.now() - startTime > options.timeout) {
        throw new Error('Verification timeout');
      }

      await sleep(10_000); // Poll every 10 seconds
    }
  }
}
```

---

## Alternatives Considered

### Alternative 1: Always Auto-Apply (Full Automation)

**Approach**: Apply every fix immediately, no safety gates

**Pros**:
- ✅ Fastest resolution (zero human intervention)
- ✅ Simplest implementation
- ✅ Scales to 1000s of failures

**Cons**:
- ❌ Dangerous (bad fixes could break production)
- ❌ No user control
- ❌ Trust issues (users won't adopt)
- ❌ Could introduce security vulnerabilities
- ❌ May mask real bugs (changing tests to pass)

**Why Not**: Too risky. 30% of fixes might fail (70% success rate). Unacceptable.

### Alternative 2: Always Manual Review (Zero Automation)

**Approach**: User must approve every fix

**Pros**:
- ✅ Safest (user has full control)
- ✅ User learns from each fix
- ✅ No risk of bad auto-apply

**Cons**:
- ❌ Slow (defeats purpose of automation)
- ❌ Requires human attention 24/7
- ❌ Doesn't scale (50 failures/day = 50 reviews)
- ❌ User fatigue (approve, approve, approve...)

**Why Not**: Too slow. Goal is to reduce developer toil, not increase it.

### Alternative 3: AI-Powered Risk Scoring

**Approach**: Use ML model to predict fix success probability

```typescript
// ML model predicts risk
const riskScore = await mlModel.predictRisk({
  fileType: 'typescript',
  errorType: 'build',
  confidence: 0.85,
  filesChanged: 1,
  linesChanged: 3,
  historicalSuccessRate: 0.78,
});

if (riskScore < 0.2) {
  // Low risk → auto-apply
  await applyFix();
}
```

**Pros**:
- ✅ More intelligent than rule-based gates
- ✅ Learns from historical data
- ✅ Adaptive (improves over time)

**Cons**:
- ❌ Requires training data (don't have it yet)
- ❌ Complex (ML model, training pipeline, etc.)
- ❌ Black box (hard to explain why fix rejected)
- ❌ Overkill for v1

**Why Not**: Over-engineered. Simple rules work well for 80% of cases. ML can be added later if needed.

### Alternative 4: User Confirmation Prompt

**Approach**: Show preview, ask "Apply? [y/n]"

```bash
Fix proposed:
  src/file.ts:42
  - this.interval = '60000';
  + this.interval = 60000;

Apply this fix? [y/n/p=preview/s=skip]:
```

**Pros**:
- ✅ Simple UX
- ✅ User control at apply time
- ✅ Can skip bad fixes

**Cons**:
- ❌ Blocks CLI (user must respond)
- ❌ Doesn't work for background monitoring
- ❌ Can't be used in CI/CD pipelines
- ❌ User may not be available (after hours)

**Why Not**: Doesn't support unattended operation.

### Alternative 5: Staged Rollout (Canary Deployments)

**Approach**: Apply fix to test environment first, then production

**Pros**:
- ✅ Safe (test first, prod later)
- ✅ Catches bad fixes early

**Cons**:
- ❌ Requires test environment (many projects don't have)
- ❌ Complex (need test → prod promotion)
- ❌ Slow (2x the time)
- ❌ Overkill for simple fixes

**Why Not**: Most projects don't have separate test environments. Can be added as enhancement.

---

## Consequences

### Positive

**Safety**:
- ✅ Configurable risk tolerance (3 modes)
- ✅ Safety gates prevent dangerous auto-apply
- ✅ Rollback mechanism if fix fails
- ✅ Verification re-runs workflow

**User Control**:
- ✅ User chooses automation level
- ✅ Can override on per-fix basis
- ✅ Desktop notifications keep user informed
- ✅ Clear reasons when review needed

**Speed**:
- ✅ High-confidence fixes applied instantly
- ✅ No waiting for review (in auto mode)
- ✅ Parallel processing (multiple failures)

**Reliability**:
- ✅ Backups before every apply
- ✅ Auto-rollback on verification failure
- ✅ Audit trail (all actions logged)

### Negative

**Complexity**:
- ❌ 3 modes to explain to users
- ❌ Safety gate logic (200+ lines)
- ❌ Rollback system (state management)
- ❌ Verification polling (extra API calls)

**Risk** (Even with Safety Gates):
- ❌ False positives (high confidence but wrong fix)
- ❌ May break more than it fixes (if gates misconfigured)
- ❌ Test changes may mask real bugs
- ❌ User may over-trust automation

**User Experience**:
- ❌ Must understand 3 modes
- ❌ Must configure safety settings
- ❌ May get notification fatigue

**Verification Cost**:
- ❌ Extra API calls (re-run workflows)
- ❌ Extra CI/CD minutes (re-running tests)
- ❌ Longer feedback loop (10+ minutes per verification)

### Neutral

**Default Behavior**: "high-confidence" mode (balanced)
**Adoption**: Users can start with "never", graduate to "high-confidence"

---

## Implementation Plan

### Phase 1: Safety Gates (Week 3)

```typescript
// src/core/cicd/safety-validator.ts
export class FixSafetyValidator {
  evaluate(proposal: FixProposal, config: Config): SafetyGate;
  checkCriticalFiles(fixes: Fix[]): string[];
  checkMultiFileRisk(fixes: Fix[]): boolean;
}
```

### Phase 2: Backup & Rollback (Week 3)

```typescript
// src/core/cicd/rollback-manager.ts
export class FixRollbackManager {
  createBackup(proposal: FixProposal): Promise<FixBackup>;
  rollback(fixId: string): Promise<void>;
  listBackups(): Promise<FixBackup[]>;
}
```

### Phase 3: Verification (Week 4)

```typescript
// src/core/cicd/verification-manager.ts
export class FixVerificationManager {
  verify(fixId: string, workflowRunId: number): Promise<boolean>;
  waitForCompletion(runId: number, options: { timeout: number }): Promise<WorkflowRun>;
}
```

### Phase 4: User Workflows (Week 4)

```bash
# CLI commands
specweave cicd fix propose <run-id>    # Propose fix (always)
specweave cicd fix apply <fix-id>      # Apply fix (manual mode)
specweave cicd fix preview <fix-id>    # Preview changes
specweave cicd fix rollback <fix-id>   # Rollback applied fix
specweave cicd fix list                # List pending fixes
specweave cicd report                  # Show auto-fix stats
```

---

## Testing Strategy

### Safety Gate Tests

```typescript
describe('FixSafetyValidator', () => {
  test('rejects low confidence fix', () => {
    const proposal = { confidence: 0.65, fixes: [...] };
    const gate = validator.evaluate(proposal, config);

    expect(gate.autoApply).toBe(false);
    expect(gate.reason).toContain('Low confidence');
  });

  test('rejects critical file changes', () => {
    const proposal = {
      confidence: 0.95,
      fixes: [{ file: '.github/workflows/deploy.yml' }],
    };
    const gate = validator.evaluate(proposal, config);

    expect(gate.autoApply).toBe(false);
    expect(gate.reason).toContain('critical files');
  });

  test('allows high confidence non-critical fix', () => {
    const proposal = {
      confidence: 0.92,
      fixes: [{ file: 'src/utils/helper.ts' }],
    };
    const gate = validator.evaluate(proposal, config);

    expect(gate.autoApply).toBe(true);
  });
});
```

### Rollback Tests

```typescript
describe('FixRollbackManager', () => {
  test('creates backup before apply', async () => {
    const proposal = { fixes: [{ file: 'src/file.ts' }] };
    const backup = await rollbackManager.createBackup(proposal);

    expect(backup.files).toHaveLength(1);
    expect(backup.files[0].originalContent).toBeDefined();
  });

  test('restores files on rollback', async () => {
    const originalContent = await fs.readFile('src/file.ts', 'utf-8');

    // Apply fix
    await applyFix(proposal);
    const modifiedContent = await fs.readFile('src/file.ts', 'utf-8');
    expect(modifiedContent).not.toBe(originalContent);

    // Rollback
    await rollbackManager.rollback(fixId);
    const restoredContent = await fs.readFile('src/file.ts', 'utf-8');
    expect(restoredContent).toBe(originalContent);
  });
});
```

### Verification Tests

```typescript
describe('FixVerificationManager', () => {
  test('verifies successful fix', async () => {
    mockGitHub.mockWorkflowRerun({ runId: 123, conclusion: 'success' });

    const verified = await verifier.verify(fixId, 123);

    expect(verified).toBe(true);
    expect(rollbackManager.rollback).not.toHaveBeenCalled();
  });

  test('rolls back ineffective fix', async () => {
    mockGitHub.mockWorkflowRerun({ runId: 123, conclusion: 'failure' });

    const verified = await verifier.verify(fixId, 123);

    expect(verified).toBe(false);
    expect(rollbackManager.rollback).toHaveBeenCalledWith(fixId);
  });
});
```

---

## Monitoring & Metrics

### Success Rate Tracking

```typescript
interface AutoFixMetrics {
  totalFixes: number;
  autoApplied: number;
  manualReview: number;
  verified: number;
  rolledBack: number;
  successRate: number; // verified / autoApplied
}

// CLI: specweave cicd report
{
  "thisWeek": {
    "totalFixes": 50,
    "autoApplied": 35,
    "manualReview": 15,
    "verified": 28,
    "rolledBack": 7,
    "successRate": "80%" // 28/35
  }
}
```

### Safety Gate Analytics

```typescript
// Track why fixes were rejected
{
  "rejectionReasons": {
    "lowConfidence": 8,      // 53%
    "criticalFiles": 4,      // 27%
    "multipleFiles": 2,      // 13%
    "testFileChanges": 1     // 7%
  }
}
```

---

## Related Decisions

- **ADR-0031**: GitHub Actions Polling (detects failures)
- **ADR-0032**: Haiku vs Sonnet (generates fix proposals with confidence)
- **ADR-0022**: GitHub Sync Architecture (verifies fixes via workflow re-run)

---

## References

**Implementation Files**:
- `src/core/cicd/safety-validator.ts` (new)
- `src/core/cicd/rollback-manager.ts` (new)
- `src/core/cicd/verification-manager.ts` (new)
- `src/core/cicd/fix-applicator.ts` (new)

**User Stories**:
- US-012: Preview Fix Before Applying
- US-013: Auto-Apply Fixes with Approval
- US-015: Verify Fix Effectiveness
- US-021: Configure Auto-Apply Rules

---

## Acceptance Criteria

- [x] Three auto-apply modes defined (never, high-confidence, always)
- [x] Safety gates prevent dangerous auto-apply
- [x] Rollback mechanism for failed fixes
- [x] Verification re-runs workflow to confirm fix
- [x] User configuration via .specweave/config.json
- [x] Desktop notifications for auto-apply events
- [x] Audit trail for all fix applications
- [x] Testing strategy covers all safety scenarios
