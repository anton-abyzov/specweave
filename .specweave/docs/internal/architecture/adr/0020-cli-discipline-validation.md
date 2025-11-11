# ADR-0020: CLI Discipline Validation Command

**Date**: 2025-11-10
**Status**: Accepted

## Context

SpecWeave enforces strict increment discipline: only 1 active increment at a time (with emergency ceiling of 2 for hotfix/bug). However, this enforcement currently exists only in the PM agent's AGENT.md instructions, which can be bypassed or forgotten.

**Current Problems**:
1. **No programmatic enforcement** - Discipline relies on agent instructions being followed
2. **No pre-flight validation** - User can attempt to create increment N+1 with N incomplete
3. **Inconsistent detection** - Status detection logic scattered across codebase
4. **No CLI validation** - No standalone command to check compliance
5. **Silent violations** - No automated alerts when discipline is violated

**Key Requirements**:
- Standalone CLI command for validation (`specweave check-discipline`)
- Exit codes for CI/CD integration (0=compliant, 1=violations, 2=errors)
- Clear, actionable error messages with suggestions
- Query all metadata.json files (no filtering)
- Use existing `ConfigManager` for WIP limits
- Fast execution (\<1 second for 100 increments)

## Decision

Implement a **standalone CLI command** (`check-discipline`) that validates increment discipline before planning or implementation work.

### Command Signature

```bash
specweave check-discipline [options]

Options:
  --verbose     Show detailed status for all increments
  --fix         Auto-repair metadata inconsistencies (if safe)
  --json        Output results as JSON for automation
```

### Exit Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 0 | Compliant | All discipline rules satisfied |
| 1 | Violations | Active increment limit exceeded or incomplete work |
| 2 | Errors | System error (missing files, invalid config) |

### Validation Logic

**Phase 1: Load Configuration**
```typescript
const config = new ConfigManager(projectRoot).load();
const limits = config.limits || DEFAULT_CONFIG.limits;

// Default: maxActiveIncrements=1, hardCap=2
```

**Phase 2: Detect All Increments**
```typescript
// Use existing IncrementStatusDetector
const detector = new IncrementStatusDetector(projectRoot);
const allIncrements = await detector.getAllIncrements();

// Query metadata.json for each increment
const statuses = await Promise.all(
  allIncrements.map(id => detector.getStatus(id))
);
```

**Phase 3: Validate Discipline**
```typescript
const activeCount = statuses.filter(s => s.status === 'active').length;
const incomplete = statuses.filter(s => s.percentComplete < 100);

// Rule 1: Check active limit
if (activeCount > limits.hardCap) {
  // VIOLATION: Hard cap exceeded
  exit(1);
}

// Rule 2: Check incomplete work
if (incomplete.length > 0 && requestingNewIncrement) {
  // VIOLATION: Cannot start new with incomplete work
  exit(1);
}

// Rule 3: Check emergency interrupt rules
if (activeCount === 2) {
  const types = active.map(s => s.type);
  const hasEmergency = types.some(t =>
    limits.typeBehaviors.canInterrupt.includes(t)
  );

  if (!hasEmergency) {
    // VIOLATION: Two active but no emergency type
    exit(1);
  }
}
```

**Phase 4: Output Results**
```typescript
// Human-readable output
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('DISCIPLINE CHECK RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Active Increments: ${activeCount}/${limits.maxActiveIncrements}`);
console.log(`Status: ${violations.length === 0 ? '✅ COMPLIANT' : '❌ VIOLATIONS'}`);

if (violations.length > 0) {
  console.log('');
  console.log('Violations:');
  violations.forEach(v => {
    console.log(`  • ${v.message}`);
    console.log(`    Suggestion: ${v.suggestion}`);
  });
}

// JSON output for automation
if (options.json) {
  console.log(JSON.stringify({
    compliant: violations.length === 0,
    activeCount,
    maxAllowed: limits.maxActiveIncrements,
    violations,
    increments: statuses
  }));
}
```

## Alternatives Considered

### Alternative 1: Hook-Based Validation

**Approach**: Add pre-increment-planning hook that runs check-discipline automatically

**Pros**:
- Automatic enforcement (no manual check needed)
- Catches violations before work starts
- Consistent behavior

**Cons**:
- Harder to debug (hook execution is opaque)
- No standalone validation
- Can't be used in CI/CD pipelines
- Performance overhead on every increment planning

**Why Not**: Hooks are for automation, but we need a **standalone command** for manual checks, debugging, and CI/CD integration.

### Alternative 2: Agent-Only Enforcement

**Approach**: Keep current PM agent validation, improve instructions

**Pros**:
- No new code needed
- Agents already have context

**Cons**:
- Not programmatically enforceable
- Can be bypassed (user ignores agent)
- No CI/CD integration
- Inconsistent behavior across tools

**Why Not**: Agents are advisory, but we need **hard enforcement** at the framework level.

### Alternative 3: Git Pre-Commit Hook

**Approach**: Block commits if discipline violated

**Pros**:
- Prevents violations from being committed
- Automatic enforcement

**Cons**:
- Git-specific (doesn't work for all workflows)
- Can be bypassed (`git commit --no-verify`)
- No visibility before commit
- Slow (runs on every commit)

**Why Not**: Too late in the workflow, and git-specific. We need **early validation** before planning starts.

## Consequences

### Positive

✅ **Programmatic Enforcement**: Discipline rules enforced at framework level
✅ **CI/CD Integration**: Exit codes allow automated checks in pipelines
✅ **Clear Feedback**: Users see exactly what's wrong and how to fix it
✅ **Fast Execution**: \<1 second for 100 increments (async metadata loading)
✅ **Standalone Tool**: Can be run manually for debugging or validation
✅ **Consistent Behavior**: Same validation logic everywhere
✅ **JSON Output**: Supports automation and tooling integration

### Negative

❌ **New Command**: Adds complexity to CLI surface area
❌ **Maintenance**: Another component to test and maintain
❌ **Breaking Change**: Existing workflows may break if violations exist

### Neutral

⚪ **Performance**: Negligible (\<1s) for typical projects
⚪ **Documentation**: Need to document command and exit codes
⚪ **Testing**: Need unit + integration + E2E tests

## Implementation Notes

### File Structure

```
src/
├── cli/
│   └── commands/
│       └── check-discipline.ts        # New CLI command
├── core/
│   └── increment/
│       ├── status-detector.ts         # Existing (reuse)
│       ├── metadata-validator.ts      # New (validation utilities)
│       └── discipline-checker.ts      # New (core validation logic)
└── utils/
    └── exit-codes.ts                  # Exit code constants

tests/
├── unit/
│   ├── cli/
│   │   └── check-discipline.test.ts   # CLI command tests
│   └── core/
│       └── discipline-checker.test.ts # Validation logic tests
├── integration/
│   └── check-discipline.spec.ts       # Integration tests
└── e2e/
    └── enforcement.spec.ts            # E2E tests
```

### Key Classes

**DisciplineChecker** (core logic):
```typescript
class DisciplineChecker {
  async validate(): Promise<ValidationResult> {
    // Phase 1: Load config
    // Phase 2: Detect increments
    // Phase 3: Validate rules
    // Phase 4: Return results
  }
}
```

**ValidationResult**:
```typescript
interface ValidationResult {
  compliant: boolean;
  activeCount: number;
  maxAllowed: number;
  violations: Violation[];
  increments: IncrementStatus[];
}
```

### Integration Points

1. **PM Agent** (Step 0 - mandatory pre-flight):
   - Execute `npx specweave check-discipline` via Bash tool
   - Block if exit code != 0
   - Show violations to user

2. **CLI Commands** (optional pre-flight):
   - `/specweave:increment` runs check-discipline before planning
   - `/specweave:do` runs check-discipline before resuming work

3. **CI/CD Pipelines** (automated checks):
   ```yaml
   - name: Check Increment Discipline
     run: npx specweave check-discipline
   ```

## Related Decisions

- **ADR-0021**: PM Agent Enforcement (agent integration)
- **ADR-0022**: GitHub Sync Architecture (sync verification)
- **ADR-0007**: Increment Discipline Rules (v0.7.0 - defines WIP limits)

## Testing Strategy

**Unit Tests** (80% coverage target):
- `check-discipline.test.ts`: CLI command logic
- `discipline-checker.test.ts`: Validation logic
- Test all exit codes (0, 1, 2)
- Test all violation scenarios
- Test JSON output format

**Integration Tests**:
- Create increments with violations, run check-discipline
- Verify exit codes match expected behavior
- Test --fix option for auto-repair

**E2E Tests** (Playwright):
- Full workflow: Create increments → Violate discipline → Run check → Resolve
- PM agent integration: Agent blocks on violations
- CI/CD simulation: Automated pipeline check

## Migration Plan

**Phase 1: Implement CLI Command** (Week 1)
- Create `check-discipline.ts` command
- Implement `DisciplineChecker` class
- Add exit codes and JSON output
- Unit tests

**Phase 2: Integrate with PM Agent** (Week 1)
- Update `pm/AGENT.md` with Step 0 validation
- Test agent integration
- Integration tests

**Phase 3: Documentation & Deployment** (Week 2)
- Update CLI docs
- Add examples to README
- Create migration guide
- Deploy to production

## Acceptance Criteria

- [ ] CLI command `specweave check-discipline` implemented
- [ ] Exit codes: 0 (compliant), 1 (violations), 2 (errors)
- [ ] Validates active increment count against config
- [ ] Detects incomplete work (< 100% tasks complete)
- [ ] Validates emergency interrupt rules
- [ ] Clear, actionable error messages
- [ ] JSON output option for automation
- [ ] --verbose option for detailed status
- [ ] --fix option for auto-repair (safe cases only)
- [ ] Unit tests: 80%+ coverage
- [ ] Integration tests: All violation scenarios
- [ ] E2E tests: Full workflow + PM agent integration
- [ ] Documentation: CLI reference + examples

## References

- **Issue**: [#TBD] Strict Increment Discipline Enforcement
- **Spec**: `.specweave/docs/internal/projects/default/specs/spec-018-strict-discipline-enforcement.md`
- **Increment**: `0018-strict-increment-discipline-enforcement`
- **Related**: CLAUDE.md "Increment Discipline" section
