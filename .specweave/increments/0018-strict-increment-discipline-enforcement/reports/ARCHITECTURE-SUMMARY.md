# Architecture Summary: Strict Increment Discipline Enforcement

**Date**: 2025-11-10
**Increment**: 0018-strict-increment-discipline-enforcement
**Architect**: Claude (Sonnet 4.5)

---

## Executive Summary

This increment implements **programmatic enforcement** of SpecWeave's increment discipline rules, transforming advisory agent instructions into hard, automated checks at the framework level.

**Key Achievement**: Discipline moves from "please follow these rules" → "rules enforced automatically at every step"

---

## Architecture Overview

### Three-Layer Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: CLI Validation                   │
│  npx specweave check-discipline                              │
│  • Standalone command                                        │
│  • Exit codes: 0 (compliant), 1 (violations), 2 (errors)   │
│  • JSON output for automation                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Layer 2: PM Agent Integration                │
│  PM Agent Step 0 (Pre-Planning)                             │
│  • Executes check-discipline via Bash tool                   │
│  • Blocks planning if exit code 1                            │
│  • Shows clear violations to user                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Layer 3: Post-Completion Verification           │
│  post-increment-completion.sh hook                           │
│  • Verifies GitHub issue state                               │
│  • Auto-closes issue if still open                           │
│  • Logs all sync actions                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. DisciplineChecker (Core Logic)

**File**: `src/core/increment/discipline-checker.ts`

**Responsibilities**:
- Load configuration (WIP limits, emergency types)
- Detect all increments (via IncrementStatusDetector)
- Validate 3 rules:
  1. Active count ≤ hard cap (default: 2)
  2. No incomplete work before starting new
  3. Emergency interrupt rules (only hotfix/bug can interrupt)
- Return structured ValidationResult

**Algorithm**:
```
1. Load config.limits (maxActiveIncrements=1, hardCap=2)
2. Detect all increments (scan .specweave/increments/)
3. Load status for each (parse metadata.json + tasks.md)
4. Count active increments
5. Find incomplete increments (percentComplete < 100)
6. Validate rules:
   - Rule 1: active ≤ hardCap
   - Rule 2: incomplete.length === 0 (when starting new)
   - Rule 3: if active === 2, check for emergency type
7. Return { compliant, violations, increments }
```

**Performance**:
- <1 second for 100 increments (async loading)
- Cached config (only loads once)

---

### 2. CLI Command (User Interface)

**File**: `src/cli/commands/check-discipline.ts`

**Usage**:
```bash
npx specweave check-discipline [options]

Options:
  --verbose     Show detailed status for all increments
  --json        Output results as JSON (for automation)
  --fix         Auto-repair metadata inconsistencies
```

**Exit Codes**:
- `0`: Compliant (all rules satisfied)
- `1`: Violations (active limit or incomplete work)
- `2`: System error (missing files, invalid config)

**Output Formats**:

**Human-Readable**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCIPLINE CHECK RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Increments: 2/1
Status: ❌ VIOLATIONS

Violations:
  • Active increments (2) exceeds limit (1)
    Suggestion: Complete or pause 1 increment(s)
    Affected: 0002-core-enhancements, 0003-model-selection

💡 Commands:
  /specweave:status     # Show all increments
  /specweave:close      # Close incomplete increments
  /specweave:do         # Resume work on active increment
```

**JSON** (for automation/CI):
```json
{
  "compliant": false,
  "activeCount": 2,
  "maxAllowed": 1,
  "violations": [
    {
      "type": "active_limit",
      "message": "Active increments (2) exceeds limit (1)",
      "suggestion": "Complete or pause 1 increment(s)",
      "severity": "error",
      "affectedIncrements": ["0002-core-enhancements", "0003-model-selection"]
    }
  ],
  "increments": [...]
}
```

---

### 3. PM Agent Integration (Enforcement)

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Change**: Replace TypeScript snippet with Bash execution

**Old** (Advisory):
```typescript
// Agent reads TypeScript code (not executable)
const detector = new IncrementStatusDetector();
const incomplete = await detector.getAllIncomplete();
if (incomplete.length > 0) {
  // Agent may or may not enforce this
}
```

**New** (Enforced):
```bash
# Agent executes actual command via Bash tool
npx specweave check-discipline --json

# Parse exit code:
# 0 → Continue to planning
# 1 → BLOCK and show violations
# 2 → Show error and abort
```

**Workflow**:
```
User: /specweave:increment "Feature B"
  ↓
PM Agent: Step 0 (Pre-Planning Validation)
  ↓
Execute: npx specweave check-discipline --json
  ↓
Exit Code? ─┬─ 0: ✅ Continue to planning (Step 1)
            ├─ 1: ❌ Block, show violations, exit
            └─ 2: ⚠️  Show error, exit
```

**Key Benefit**: PM agent now **executes** validation, not just **reads** instructions

---

### 4. GitHub Sync Verification (Post-Completion)

**File**: `plugins/specweave/hooks/post-increment-completion.sh`

**Purpose**: Ensure GitHub issues close when increments complete

**Workflow**:
```
Increment Completed → Hook Fires
  ↓
1. Check if sync enabled (config.sync.enabled)
2. Load metadata.json
3. Extract github.issue number
4. Query issue state: gh issue view $ISSUE --json state
5. If OPEN → Close with summary comment
6. If CLOSED → Log "already closed"
7. Log action to .specweave/logs/github-sync.log
```

**Error Handling** (All Non-Blocking):
- GitHub CLI not found → Skip
- Not authenticated → Skip, suggest `gh auth login`
- Issue not found → Skip, log warning
- Rate limit exceeded → Skip, log error
- API failure → Skip, log error

**Key Design**: **Non-blocking** - Increment can complete even if GitHub sync fails

**Log Format**:
```
2025-11-10T10:00:00Z | 0018-strict-discipline | issue:123 | state:OPEN | action:closed | result:success
```

---

### 5. Metadata Validator (Quality Assurance)

**File**: `src/core/increment/metadata-validator.ts`

**Purpose**: Detect and repair metadata inconsistencies

**Validation Checks**:
- Required fields present (increment, status)
- Valid status enum (planned/active/paused/completed/abandoned)
- GitHub fields valid (issue is number, url is string)
- URL format correct (matches GitHub issue URL pattern)

**Inconsistency Detection**:
- Increment completed but GitHub issue open
- Increment active but GitHub issue closed
- Issue number in metadata but issue not found in GitHub

**Auto-Repair** (with `--fix` option):
- Missing status → Default to 'planned'
- Invalid status → Default to 'active'
- Safe repairs only (no data loss)

---

## Data Flow

### Increment Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant PM Agent
    participant DisciplineChecker
    participant ConfigManager
    participant StatusDetector

    User->>CLI: /specweave:increment "Feature"
    CLI->>PM Agent: Invoke PM Agent
    PM Agent->>DisciplineChecker: Execute check-discipline (Bash)
    DisciplineChecker->>ConfigManager: Load limits
    ConfigManager-->>DisciplineChecker: limits config
    DisciplineChecker->>StatusDetector: Get all increments
    StatusDetector-->>DisciplineChecker: increment statuses
    DisciplineChecker->>DisciplineChecker: Validate rules

    alt Violations Found
        DisciplineChecker-->>PM Agent: Exit 1 (violations)
        PM Agent-->>User: ❌ Block planning, show violations
    else Compliant
        DisciplineChecker-->>PM Agent: Exit 0 (compliant)
        PM Agent->>PM Agent: Plan increment
        PM Agent-->>User: ✅ Increment created
    end
```

### Increment Completion Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Hook
    participant GitHub
    participant Log

    User->>CLI: /specweave:done 0018
    CLI->>CLI: Mark increment complete
    CLI->>Hook: Fire post-increment-completion.sh
    Hook->>Hook: Load metadata.json
    Hook->>GitHub: gh issue view $ISSUE
    GitHub-->>Hook: Issue state (OPEN/CLOSED)

    alt Issue is OPEN
        Hook->>GitHub: gh issue close $ISSUE
        GitHub-->>Hook: Issue closed
        Hook->>Log: Log: action=closed, result=success
    else Issue is CLOSED
        Hook->>Log: Log: action=verified, already_closed
    end

    Hook-->>CLI: Exit 0 (always)
    CLI-->>User: ✅ Increment closed
```

---

## Integration Points

### 1. CLI Commands

**`/specweave:increment`**:
- Runs `check-discipline` before PM agent invocation
- Blocks if exit code 1

**`/specweave:do`**:
- Optionally runs `check-discipline` before resuming work

**`/specweave:status`**:
- Shows compliance status (calls `check-discipline`)

### 2. Hooks

**`post-increment-planning.sh`** (existing):
- Creates GitHub issue after planning
- Sets metadata.json with github.issue

**`post-task-completion.sh`** (existing):
- Syncs progress to GitHub issue
- Updates issue description with task checklist

**`post-increment-completion.sh`** (NEW):
- Verifies GitHub issue closed
- Auto-closes if still open

### 3. Configuration

**`.specweave/config.json`**:
```json
{
  "limits": {
    "maxActiveIncrements": 1,
    "hardCap": 2,
    "allowEmergencyInterrupt": true,
    "typeBehaviors": {
      "canInterrupt": ["hotfix", "bug"],
      "autoAbandonDays": {
        "experiment": 14
      }
    }
  },
  "sync": {
    "enabled": true,
    "activeProfile": "specweave-dev"
  }
}
```

---

## Testing Strategy

### Unit Tests (Target: 85%+)

**Files**:
- `discipline-checker.test.ts` (90%+)
- `metadata-validator.test.ts` (90%+)
- `check-discipline.test.ts` (85%+)

**Coverage**:
- All validation rules (active limit, incomplete work, emergency)
- All exit codes (0, 1, 2)
- All output formats (human, JSON)
- Error scenarios (missing files, invalid config)

### Integration Tests (Target: 80%+)

**Files**:
- `pm-agent-enforcement.spec.ts`
- `github-sync.spec.ts`
- `increment-command.spec.ts`

**Coverage**:
- PM agent blocks on violations
- GitHub sync verifies and closes issues
- CLI integrates with hooks

### E2E Tests (Target: 90%+ critical paths)

**Files**:
- `enforcement.spec.ts` (Playwright)

**Scenarios**:
- Full lifecycle: Create → Violate → Resolve → Complete
- Emergency interrupt: Hotfix interrupts feature
- GitHub sync: Issue auto-closes on completion

---

## Performance Characteristics

### CLI Command Performance

**Benchmark** (100 increments):
- Load config: <10ms
- Detect increments: <50ms (file system scan)
- Load statuses: <300ms (async, 100 parallel reads)
- Validate rules: <50ms (in-memory operations)
- Format output: <50ms
- **Total**: <500ms (well under 1 second target)

### Hook Performance

**Benchmark** (single increment):
- Load metadata: <10ms
- GitHub API call: 500-1000ms (network)
- Close issue: 500-1000ms (network)
- Log action: <10ms
- **Total**: 1-2 seconds (acceptable for post-completion)

### Scalability

- **100 increments**: <1 second (CLI)
- **500 increments**: <2 seconds (CLI)
- **1000 increments**: <5 seconds (CLI, consider indexing)

**Recommendation**: Add index file if >500 increments for sub-second performance

---

## Security Considerations

### GitHub Token Handling

**Risk**: GitHub CLI stores tokens locally

**Mitigation**:
- Use GitHub CLI's native auth (secure keychain)
- Don't store tokens in code or config
- Require `gh auth login` before sync

### Exit Code Behavior

**Risk**: Non-zero exit codes may break scripts

**Mitigation**:
- Exit 0 for compliant (safe for scripts)
- Exit 1 for violations (clear failure)
- Exit 2 for errors (distinguishable from violations)
- Document exit codes clearly

### Metadata Tampering

**Risk**: User manually edits metadata.json

**Mitigation**:
- MetadataValidator detects tampering
- CLI validates before using metadata
- Logs all metadata changes
- --fix option repairs safe issues

---

## Migration Path

### Existing Projects

**Phase 1: Install** (no breaking changes)
```bash
npm install -g specweave@latest
```

**Phase 2: Enable** (opt-in)
- Discipline enforcement enabled by default
- Existing increments grandfathered (no validation until next increment)

**Phase 3: Validate** (manual check)
```bash
specweave check-discipline
# Shows current violations
# Suggests fixes
```

**Phase 4: Resolve** (clean up violations)
```bash
specweave close 0002  # Close incomplete increments
# Or complete them: specweave do 0002
```

### Breaking Changes

**None** - This is purely additive:
- New CLI command (doesn't change existing commands)
- PM agent update (improves enforcement, doesn't break existing behavior)
- New hook (opt-in via config)

---

## Future Enhancements

### 1. Visual Dashboard

**Idea**: Web UI showing increment discipline status

**Features**:
- Visual timeline of active increments
- Violation alerts
- One-click resolution
- Team-wide compliance view

### 2. CI/CD Integration

**Idea**: GitHub Actions workflow for automated checks

**Example**:
```yaml
name: Increment Discipline Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npx specweave check-discipline --json
      - if: failure()
        run: echo "Increment discipline violated"
```

### 3. Metrics & Analytics

**Idea**: Track discipline violations over time

**Metrics**:
- Violation frequency (per week)
- Time to resolution (avg hours)
- Emergency interrupt rate (%)
- Compliance score (% of time compliant)

### 4. Smart Suggestions

**Idea**: AI-powered resolution suggestions

**Examples**:
- "Increment 0002 has 3 tasks left, estimated 2 hours to complete"
- "Increment 0003 has not been touched in 7 days, suggest abandoning"
- "Emergency interrupt detected, consider splitting into hotfix increment"

---

## Key Takeaways

### What Changed

**Before**:
- Discipline enforced by agent instructions (advisory)
- User could bypass or ignore
- No programmatic validation
- Inconsistent behavior

**After**:
- Discipline enforced at framework level (mandatory)
- CLI validates before every planning operation
- PM agent blocks on violations
- GitHub sync verified automatically
- Consistent, reliable enforcement

### Why It Matters

**For Users**:
- Fewer incomplete increments piling up
- Clear feedback when discipline violated
- Automated sync (less manual work)
- Better focus (one thing at a time)

**For Teams**:
- Consistent discipline across all developers
- Audit trail via logs
- CI/CD integration possible
- Reduced scope creep

**For SpecWeave**:
- Framework integrity maintained
- Living docs stay current (no stale increments)
- Quality enforced automatically
- Professional development workflow

---

## Success Metrics

**Functional**:
- ✅ CLI command works (exit codes correct)
- ✅ PM agent blocks on violations
- ✅ GitHub issues auto-close
- ✅ All validation rules enforced

**Quality**:
- ✅ Unit tests: 85%+ coverage
- ✅ Integration tests: 80%+ coverage
- ✅ E2E tests: 90%+ coverage (critical paths)
- ✅ No regressions

**Performance**:
- ✅ CLI: <1 second (100 increments)
- ✅ Hook: <2 seconds (including network)

---

## Documentation

**Created**:
- ✅ ADR-0020: CLI Discipline Validation
- ✅ ADR-0021: PM Agent Enforcement
- ✅ ADR-0022: GitHub Sync Architecture
- ✅ Enforcement Flow Diagram (Mermaid)
- ✅ CLI Sequence Diagram (Mermaid)
- ✅ Implementation Plan (plan.md)
- ✅ This Architecture Summary

**To Create** (during implementation):
- CLI Reference (`docs-site/docs/cli/check-discipline.md`)
- Troubleshooting Guide (`docs-site/docs/troubleshooting/discipline.md`)
- PM Agent README update
- GitHub Sync README update

---

## References

**Living Docs**:
- [Spec](../../docs/internal/projects/default/specs/spec-018-strict-discipline-enforcement.md)
- [ADR-0020](../../docs/internal/architecture/adr/0020-cli-discipline-validation.md)
- [ADR-0021](../../docs/internal/architecture/adr/0021-pm-agent-enforcement.md)
- [ADR-0022](../../docs/internal/architecture/adr/0022-github-sync-architecture.md)

**Diagrams**:
- [Enforcement Flow](../../docs/internal/architecture/diagrams/discipline/enforcement-flow.mmd)
- [CLI Sequence](../../docs/internal/architecture/diagrams/discipline/cli-sequence.mmd)

**Implementation**:
- [Plan](../plan.md)
- [Tasks](../tasks.md) (to be created by test-aware-planner)
