# ADR-0021: PM Agent Enforcement Integration

**Date**: 2025-11-10
**Status**: Accepted

## Context

The PM agent is responsible for increment planning, but currently lacks programmatic enforcement of increment discipline. While `AGENT.md` contains instructions for discipline checks (Step 0), these are advisory and can be bypassed.

**Current State**:
- PM agent has Step 0 validation in AGENT.md (lines 36-73)
- Uses TypeScript code snippet (not executable by agent)
- No actual enforcement (relies on agent following instructions)
- Inconsistent behavior across sessions
- Can be bypassed by user or agent

**Example of Current Issue**:
```typescript
// AGENT.md contains this code:
const detector = new IncrementStatusDetector();
const incomplete = await detector.getAllIncomplete();

// But agents can't execute TypeScript!
// They can only read files via Read tool
```

**Key Requirements**:
1. Agent must execute actual validation (not read code snippets)
2. Must block increment planning if violations detected
3. Must show clear, actionable errors to user
4. Must be fast (\<2 seconds including tool invocation)
5. Must work with Claude Code's Bash tool

## Decision

Integrate the CLI `check-discipline` command into PM agent workflow as **mandatory Step 0** using the **Bash tool**.

### Updated PM Agent Workflow

**Step 0: Discipline Validation (MANDATORY)**

```markdown
## Step 0: Validate Increment Discipline (MANDATORY)

**BEFORE planning any increment**, execute discipline check:

```bash
npx specweave check-discipline --json
```

**Parse output**:
- Exit code 0 → ✅ Continue to planning
- Exit code 1 → ❌ Block and show violations
- Exit code 2 → ⚠️  Show system error

**If violations found**:
```
❌ Cannot plan new increment!

Violations:
  • Active increments: 2/1 (limit exceeded)
  • Incomplete work: 0002-core-enhancements (73% complete)
    - 11/15 tasks completed
    - Pending: T-008, T-010, T-012, T-013, T-015

💡 Resolve violations first:
  1. Complete or close increment 0002
  2. Re-run: /specweave:increment "your feature"

Commands:
  /specweave:status     # Show all increments
  /specweave:close      # Close incomplete increments
  /specweave:do         # Resume work on active increment
```

**Do NOT proceed with planning if violations exist.**
```

### Integration Points

**1. `/specweave:increment` Command**

Before PM agent plans:
```typescript
// In increment command handler
const result = execSync('npx specweave check-discipline --json', {
  cwd: projectRoot,
  encoding: 'utf-8'
});

if (result.exitCode !== 0) {
  const violations = JSON.parse(result.stdout);
  console.error('❌ Cannot create increment: Discipline violations detected');
  violations.violations.forEach(v => console.error(`  • ${v.message}`));
  process.exit(1);
}

// Continue with PM agent invocation
```

**2. PM Agent AGENT.md Update**

Replace TypeScript snippet (lines 36-73) with Bash execution:

```diff
- // Import the status detector
- import { IncrementStatusDetector } from '../../src/core/increment-status';
-
- // Check for incomplete increments
- const detector = new IncrementStatusDetector();
- const incomplete = await detector.getAllIncomplete();
+ **BEFORE planning**, execute via Bash tool:
+
+ ```bash
+ npx specweave check-discipline --json
+ ```
+
+ **Parse the JSON output** to check for violations.
```

**3. Error Handling**

```typescript
interface DisciplineCheckResult {
  compliant: boolean;
  activeCount: number;
  maxAllowed: number;
  violations: Array<{
    type: 'active_limit' | 'incomplete_work' | 'emergency_required';
    message: string;
    suggestion: string;
  }>;
  increments: IncrementStatus[];
}

// Agent processes result
if (!result.compliant) {
  // Show violations
  // Suggest fixes
  // Exit without planning
}
```

## Alternatives Considered

### Alternative 1: Keep TypeScript Snippet in AGENT.md

**Approach**: Improve TypeScript code in AGENT.md, rely on agent to "simulate" execution

**Pros**:
- No Bash tool dependency
- Agents already read AGENT.md

**Cons**:
- Not executable (agents can't run TypeScript)
- Inconsistent enforcement (agents may skip/misinterpret)
- No actual validation (just advisory text)
- Can't block planning programmatically

**Why Not**: Agents need **executable validation**, not code to read.

### Alternative 2: Agent-Internal API Calls

**Approach**: Agent calls SpecWeave API endpoints for validation

**Pros**:
- No CLI dependency
- Direct API access

**Cons**:
- No SpecWeave API exists (would need to build)
- Agents can't make HTTP requests easily
- Adds architectural complexity (need API server)
- Slower than CLI (network overhead)

**Why Not**: Over-engineered. CLI + Bash tool is simpler and works today.

### Alternative 3: Pre-Increment Hook

**Approach**: Hook runs before PM agent, blocks if violations

**Pros**:
- Automatic enforcement
- No agent changes needed

**Cons**:
- Hook timing unclear (when exactly does it run?)
- Harder to debug (opaque to user)
- Can't show errors to user easily
- May run too late (after agent starts)

**Why Not**: Hooks are for automation, but PM agent needs **explicit validation** before planning.

## Consequences

### Positive

✅ **Executable Validation**: Agent runs actual command, not just reads instructions
✅ **Programmatic Blocking**: Exit code 1 prevents planning
✅ **Clear Errors**: JSON output provides structured violation data
✅ **Fast Execution**: \<2 seconds (CLI command + JSON parsing)
✅ **Consistent Behavior**: Same validation logic every time
✅ **Debuggable**: User can run `check-discipline` manually to see status
✅ **CI/CD Ready**: Same command works in automated pipelines

### Negative

❌ **Bash Tool Dependency**: Requires agent to use Bash tool
❌ **Platform Differences**: Shell differences (bash vs sh vs zsh)
❌ **Error Handling**: Need robust parsing of CLI output
❌ **Agent Updates**: Need to update AGENT.md instructions

### Neutral

⚪ **Performance**: Negligible overhead (\<2s)
⚪ **Maintenance**: Need to keep CLI and agent in sync
⚪ **Testing**: Need integration tests for agent + CLI interaction

## Implementation Notes

### PM Agent AGENT.md Changes

**Before** (TypeScript snippet):
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

**After** (Bash execution):
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

**If exit code 1** (violations):

```bash
# Parse JSON output
VIOLATIONS=$(cat /tmp/check-discipline-output.json)

# Show to user
echo "❌ Cannot plan new increment!"
echo ""
echo "Violations:"
jq -r '.violations[] | "  • \(.message)"' <<< "$VIOLATIONS"
echo ""
echo "💡 Suggestions:"
jq -r '.violations[] | "  → \(.suggestion)"' <<< "$VIOLATIONS"
```

**STOP HERE** - Do NOT proceed to planning.
```

### Error Message Templates

**Violation Type 1: Active Limit Exceeded**
```
❌ Violation: Active increments limit exceeded

Current: 2 active increments
Limit: 1 active increment (default)

Active increments:
  • 0002-core-enhancements (in-progress, 73% complete)
  • 0003-model-selection (in-progress, 50% complete)

💡 Suggestions:
  1. Complete increment 0002 first (/specweave:do 0002)
  2. Or close one increment (/specweave:close 0002)
  3. Then retry: /specweave:increment "your feature"
```

**Violation Type 2: Incomplete Work**
```
❌ Violation: Previous increment incomplete

Increment: 0002-core-enhancements
Status: 73% complete (11/15 tasks)

Pending tasks:
  - T-008: Migrate DIAGRAM-CONVENTIONS.md
  - T-010: Create context-manifest.yaml
  - T-012: Test agent invocation
  - T-013: Run skill test suite
  - T-015: Create PR

💡 Suggestions:
  1. Complete remaining tasks (/specweave:do 0002)
  2. Or adjust scope (/specweave:close 0002 --adjust-scope)
  3. Then retry: /specweave:increment "your feature"
```

**Violation Type 3: Emergency Required**
```
❌ Violation: Two active increments without emergency

Current: 2 active increments
Types: feature, feature

Emergency types: hotfix, bug

💡 Suggestions:
  1. Only hotfix/bug can interrupt existing work
  2. Complete one feature increment first
  3. Or change type to hotfix if urgent (/specweave:increment "urgent-fix" --type hotfix)
```

### Testing Strategy

**Integration Tests**:
```typescript
describe('PM Agent Discipline Enforcement', () => {
  test('blocks planning with violations', async () => {
    // Setup: Create incomplete increment
    await createIncrement('0002-test', { progress: 50 });

    // Execute: Try to plan new increment
    const result = await invokePMAgent('new feature');

    // Verify: Agent blocked
    expect(result.blocked).toBe(true);
    expect(result.message).toContain('Cannot plan new increment');
  });

  test('allows planning when compliant', async () => {
    // Setup: Complete all increments
    await completeAllIncrements();

    // Execute: Plan new increment
    const result = await invokePMAgent('new feature');

    // Verify: Agent proceeded
    expect(result.blocked).toBe(false);
    expect(result.planCreated).toBe(true);
  });
});
```

## Related Decisions

- **ADR-0020**: CLI Discipline Validation (implements check-discipline command)
- **ADR-0022**: GitHub Sync Architecture (sync verification after completion)
- **ADR-0007**: Increment Discipline Rules (v0.7.0 - defines WIP limits)

## Migration Plan

**Phase 1: Update AGENT.md** (Day 1)
- Replace TypeScript snippet with Bash execution
- Add error message templates
- Test manually with violations

**Phase 2: CLI Integration** (Day 2)
- Implement check-discipline command (see ADR-0020)
- Test CLI output format
- Verify JSON parsing works

**Phase 3: Integration Testing** (Day 3)
- Create test cases for all violation types
- Test PM agent integration end-to-end
- Verify error messages are clear

**Phase 4: Documentation** (Day 4)
- Update PM agent docs
- Add examples to README
- Create troubleshooting guide

## Acceptance Criteria

- [ ] PM agent AGENT.md updated with Bash execution
- [ ] TypeScript snippet removed (replaced with CLI call)
- [ ] Agent blocks planning if exit code 1
- [ ] Agent shows clear violations to user
- [ ] Agent suggests fixes for each violation type
- [ ] Integration tests: All violation scenarios
- [ ] E2E tests: PM agent + check-discipline workflow
- [ ] Documentation: PM agent enforcement behavior
- [ ] Error messages: Clear, actionable, user-friendly

## References

- **PM Agent**: `plugins/specweave/agents/pm/AGENT.md`
- **CLI Command**: `src/cli/commands/check-discipline.ts`
- **Spec**: `.specweave/docs/internal/projects/default/specs/spec-018-strict-discipline-enforcement.md`
- **Increment**: `0018-strict-increment-discipline-enforcement`
