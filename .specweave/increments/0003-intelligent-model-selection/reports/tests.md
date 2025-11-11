---
increment: 0003-intelligent-model-selection
title: "Test Strategy & Test Cases"
created: 2025-10-30
updated: 2025-10-30
status: planned
---

# Test Strategy: Intelligent Model Selection

## Testing Philosophy

This increment implements cost-critical functionality that directly impacts user spending. Therefore, testing must ensure:

1. **Accuracy**: Model selection is correct 95%+ of the time
2. **Cost Correctness**: Cost calculations match Anthropic billing
3. **Quality Preservation**: Haiku-generated code meets 90%+ quality vs Sonnet
4. **No Regressions**: Existing functionality unchanged
5. **Performance**: Minimal overhead (<50ms for decisions, <10ms for tracking)

---

## Test Pyramid

```
        ▲
       / \
      /E2E\       5 E2E tests (workflows)
     /-----\
    /Integ-\     15 integration tests (system)
   /---------\
  /---Unit----\  100+ unit tests (components)
 /_____________\
```

**Coverage Targets**:
- Critical paths: 95%+
- Core modules: 90%+
- Overall: 80%+

---

## Test Levels

### Level 1: Unit Tests (100+ tests)

**Purpose**: Verify individual components in isolation

**Test Files**:
```
tests/unit/
├── agent-model-manager.test.ts      (20 tests)
├── phase-detector.test.ts           (50 tests)
├── model-selector.test.ts           (20 tests)
├── cost-tracker.test.ts             (30 tests)
├── cost-reporter.test.ts            (15 tests)
├── pricing-constants.test.ts        (5 tests)
└── auto-split-orchestrator.test.ts  (10 tests)
```

**Coverage**: 95%+ for all core modules

---

### Level 2: Integration Tests (15 tests)

**Purpose**: Verify components work together correctly

**Test Files**:
```
tests/integration/
├── model-selection-pipeline.test.ts (5 tests)
├── cost-tracking-integration.test.ts (5 tests)
└── task-tool-integration.test.ts    (5 tests)
```

**Key Scenarios**:
- Agent preference → Model selector → Task tool
- Task execution → Cost tracker → Report generation
- Phase detection → Model selection → Cost tracking

---

### Level 3: E2E Tests (5 tests)

**Purpose**: Verify end-to-end user workflows

**Test Files**:
```
tests/e2e/
└── intelligent-model-selection.spec.ts (5 tests)
```

**Scenarios**:
1. Planning workflow (`/specweave:inc` → Sonnet used)
2. Execution workflow (`/specweave:do` → Haiku used)
3. Cost dashboard (`/specweave:costs` → Report displayed)
4. Auto-split workflow (brownfield-onboarder → 3 phases)
5. Manual override (user forces Opus → Opus used)

---

## Test Cases by Component

### TC-001: Agent Model Manager

**Test File**: `tests/unit/agent-model-manager.test.ts`

#### TC-001.1: Load All Agent Preferences
**Given**: Agent AGENT.md files exist in src/agents/
**When**: AgentModelManager.loadAllPreferences() called
**Then**: Map of agent → preference returned
**Expected**: 20 agents loaded

#### TC-001.2: Planning Agents Prefer Sonnet
**Given**: Agent model manager loaded
**When**: getPreferredModel('pm') called
**Then**: Returns 'sonnet'
**Also**: architect, security, performance → 'sonnet'

#### TC-001.3: Execution Agents Prefer Haiku
**Given**: Agent model manager loaded
**When**: getPreferredModel('frontend') called
**Then**: Returns 'haiku'
**Also**: backend, devops, tech-lead, qa-lead → 'haiku'

#### TC-001.4: Hybrid Agents Use Auto
**Given**: Agent model manager loaded
**When**: getPreferredModel('diagrams-architect') called
**Then**: Returns 'auto'
**Also**: docs-writer, sre → 'auto'

#### TC-001.5: Missing Preference Defaults to Auto
**Given**: Agent without model_preference field
**When**: getPreferredModel('new-agent') called
**Then**: Returns 'auto'

#### TC-001.6: Invalid YAML Handled Gracefully
**Given**: Agent with malformed YAML
**When**: loadAgentPreference('broken-agent') called
**Then**: Returns null (error logged)

#### TC-001.7: Cost Profiles Loaded Correctly
**Given**: Agent model manager loaded
**When**: getCostProfile('pm') called
**Then**: Returns 'planning'
**Also**: frontend → 'execution', diagrams → 'hybrid'

---

### TC-002: Phase Detector

**Test File**: `tests/unit/phase-detector.test.ts`

#### Planning Phase Detection (20 tests)

**TC-002.1**: "Analyze requirements" → planning (confidence > 0.7)
**TC-002.2**: "Design architecture" → planning (confidence > 0.7)
**TC-002.3**: "Research market trends" → planning (confidence > 0.7)
**TC-002.4**: "Plan implementation strategy" → planning (confidence > 0.7)
**TC-002.5**: "Create technical specification" → planning (confidence > 0.7)

...15 more planning test cases

#### Execution Phase Detection (20 tests)

**TC-002.21**: "Implement login form" → execution (confidence > 0.7)
**TC-002.22**: "Build API endpoint" → execution (confidence > 0.7)
**TC-002.23**: "Write unit tests" → execution (confidence > 0.7)
**TC-002.24**: "Create component" → execution (confidence > 0.7)
**TC-002.25**: "Refactor code" → execution (confidence > 0.7)

...15 more execution test cases

#### Review Phase Detection (10 tests)

**TC-002.41**: "Review code for bugs" → review (confidence > 0.7)
**TC-002.42**: "Validate implementation" → review (confidence > 0.7)
**TC-002.43**: "Audit security" → review (confidence > 0.7)

...7 more review test cases

#### Command Hints (5 tests)

**TC-002.51**: command="/specweave:inc" → planning (confidence > 0.8)
**TC-002.52**: command="/specweave:do" → execution (confidence > 0.8)
**TC-002.53**: command="/specweave:validate" → review (confidence > 0.8)
**TC-002.54**: command="/do" → execution (confidence > 0.8)
**TC-002.55**: command="/spec-driven-brainstorming" → planning (confidence > 0.8)

#### Context Signals (5 tests)

**TC-002.56**: incrementState="planned" → planning (boost)
**TC-002.57**: incrementState="in-progress" → execution (boost)
**TC-002.58**: filesModified includes architecture docs → planning (boost)
**TC-002.59**: filesModified includes .ts code files → execution (boost)
**TC-002.60**: Multiple signals combined → high confidence

#### Edge Cases (5 tests)

**TC-002.61**: Empty prompt → low confidence, default to 'execution'
**TC-002.62**: Ambiguous prompt "Do something" → low confidence
**TC-002.63**: Conflicting keywords (plan + implement) → lower confidence
**TC-002.64**: All signals point to same phase → very high confidence (>0.9)
**TC-002.65**: No keywords, no command, no context → low confidence (<0.4)

**Accuracy Target**: 95%+ on all 50 test cases

---

### TC-003: Model Selector

**Test File**: `tests/unit/model-selector.test.ts`

#### User Override (2 tests)

**TC-003.1**: forceModel='opus' → Always returns opus (reason: user_override)
**TC-003.2**: forceModel='haiku' → Always returns haiku (ignores agent/phase)

#### Agent Preferences (4 tests)

**TC-003.3**: PM agent → sonnet (reason: agent_preference)
**TC-003.4**: Frontend agent → haiku (reason: agent_preference)
**TC-003.5**: Architect agent → sonnet (reason: agent_preference)
**TC-003.6**: Backend agent → haiku (reason: agent_preference)

#### Phase Detection for Auto Agents (6 tests)

**TC-003.7**: Auto agent + planning phase (high confidence) → sonnet
**TC-003.8**: Auto agent + execution phase (high confidence) → haiku
**TC-003.9**: Auto agent + review phase (high confidence) → sonnet
**TC-003.10**: Auto agent + planning phase (low confidence) → sonnet (default)
**TC-003.11**: Auto agent + execution phase (low confidence) → sonnet (default)
**TC-003.12**: Auto agent + ambiguous prompt → sonnet (default)

#### Decision Logging (3 tests)

**TC-003.13**: logDecisions=true → Decision logged to console
**TC-003.14**: showReasoning=true → Reasoning included in log
**TC-003.15**: logDecisions=false → No log output

#### Decision Matrix (5 tests)

**TC-003.16**: Confidence > 0.7 → Use phase detection
**TC-003.17**: Confidence 0.4-0.7 → Use agent preference
**TC-003.18**: Confidence < 0.4 → Default to sonnet
**TC-003.19**: Multiple signals align → High confidence decision
**TC-003.20**: Conflicting signals → Lower confidence, safe default

---

### TC-004: Cost Tracker

**Test File**: `tests/unit/cost-tracker.test.ts`

#### Session Management (5 tests)

**TC-004.1**: startSession() → Returns unique session ID
**TC-004.2**: endSession() → Records tokens + cost correctly
**TC-004.3**: Multiple concurrent sessions → All tracked independently
**TC-004.4**: Session without endSession() → Logged as incomplete
**TC-004.5**: Session with error → success=false recorded

#### Cost Calculations (10 tests)

**TC-004.6**: Sonnet costs calculated correctly
- Input: 10,000 tokens = $0.03
- Output: 5,000 tokens = $0.075
- Total: $0.105

**TC-004.7**: Haiku costs calculated correctly
- Input: 10,000 tokens = $0.01
- Output: 5,000 tokens = $0.025
- Total: $0.035

**TC-004.8**: Opus costs calculated correctly
- Input: 10,000 tokens = $0.15
- Output: 5,000 tokens = $0.375
- Total: $0.525

**TC-004.9**: Zero tokens → $0 cost (no error)
**TC-004.10**: Large token counts → Correct precision (no overflow)
**TC-004.11**: Cached tokens → Counted correctly
**TC-004.12**: Cost matches Anthropic pricing (validated 2025-10-30)

...4 more cost calculation tests

#### Aggregations (8 tests)

**TC-004.16**: Aggregate by agent → Correct totals
**TC-004.17**: Aggregate by phase → Correct breakdown
**TC-004.18**: Aggregate by model → Sonnet + Haiku + Opus totals
**TC-004.19**: Aggregate by increment → Per-increment reports
**TC-004.20**: Multiple increments → No cross-contamination

...3 more aggregation tests

#### Savings Calculations (4 tests)

**TC-004.24**: All Sonnet baseline → 0% savings
**TC-004.25**: Mixed Sonnet/Haiku → Correct savings %
**TC-004.26**: All Haiku → Maximum savings (~67%)
**TC-004.27**: Savings vs baseline validated

#### Persistence (3 tests)

**TC-004.28**: saveToDisk() → JSON file written correctly
**TC-004.29**: loadFromDisk() → Data restored accurately
**TC-004.30**: Missing file → Empty report (no crash)

---

### TC-005: Cost Reporter

**Test File**: `tests/unit/cost-reporter.test.ts`

#### Report Generation (5 tests)

**TC-005.1**: generateIncrementReport() → Complete report structure
**TC-005.2**: Report includes all sections (totals, breakdown, savings, efficiency)
**TC-005.3**: Empty increment → Report with zero values
**TC-005.4**: Multiple sessions → Aggregated correctly
**TC-005.5**: Report format matches IncrementCostReport interface

#### Export Formats (5 tests)

**TC-005.6**: exportToJSON() → Valid JSON file
**TC-005.7**: exportToCSV() → Valid CSV with headers
**TC-005.8**: CSV columns match session data
**TC-005.9**: JSON is human-readable (indented)
**TC-005.10**: Exports don't mutate original data

#### Dashboard Rendering (5 tests)

**TC-005.11**: generateDashboard() → ASCII table rendered
**TC-005.12**: Dashboard includes all key metrics
**TC-005.13**: Cost values formatted correctly ($0.00)
**TC-005.14**: Percentages displayed correctly (66%)
**TC-005.15**: Dashboard fits in standard terminal (80 cols)

---

### TC-006: Auto-Split Orchestrator

**Test File**: `tests/unit/auto-split-orchestrator.test.ts`

#### Workflow Execution (5 tests)

**TC-006.1**: 3-phase workflow → All phases execute sequentially
**TC-006.2**: Phase dependencies → Correct execution order
**TC-006.3**: Context passed between phases → Correct data flow
**TC-006.4**: Phase failure → Stops execution, reports error
**TC-006.5**: Cost tracked per phase → Per-phase breakdown

#### Cost Optimization (5 tests)

**TC-006.6**: Mixed Sonnet/Haiku workflow → Savings calculated
**TC-006.7**: Baseline (all Sonnet) calculated correctly
**TC-006.8**: Savings > 50% for typical workflows
**TC-006.9**: Phase transitions logged → User sees progress
**TC-006.10**: Total cost matches sum of phase costs

---

## Integration Tests

### INT-001: Model Selection Pipeline

**Test File**: `tests/integration/model-selection-pipeline.test.ts`

**Test Case**: End-to-end model selection flow

**Steps**:
1. Load agent preferences
2. Invoke model selector with prompt + agent
3. Verify correct model selected
4. Check decision logged
5. Validate reasoning

**Scenarios**:
- Planning agent + planning prompt → sonnet
- Execution agent + execution prompt → haiku
- Auto agent + high-confidence planning → sonnet
- Auto agent + low-confidence → sonnet (default)
- User override → forced model

**Expected**: All scenarios pass, decisions logged correctly

---

### INT-002: Cost Tracking Integration

**Test File**: `tests/integration/cost-tracking-integration.test.ts`

**Test Case**: Cost tracking across multiple task executions

**Steps**:
1. Start increment
2. Execute 10 tasks (mix of Sonnet/Haiku)
3. End increment
4. Generate cost report
5. Validate totals, breakdown, savings

**Expected**:
- All sessions recorded
- Costs calculated correctly
- Savings match expected (50-60%)
- Report persisted to disk

---

### INT-003: Task Tool Integration

**Test File**: `tests/integration/task-tool-integration.test.ts`

**Test Case**: Task tool automatically uses intelligent model selection

**Steps**:
1. Invoke Task tool with PM agent
2. Verify Sonnet used (no explicit model specified)
3. Invoke Task tool with Frontend agent
4. Verify Haiku used
5. Check cost tracked automatically

**Expected**:
- Model selection automatic
- Cost tracking transparent
- No breaking changes to Task tool API
- Backward compatible (existing code works)

---

## E2E Tests (Playwright)

### E2E-001: Planning Workflow

**Test File**: `tests/e2e/intelligent-model-selection.spec.ts`

**Scenario**: User creates new increment, Sonnet automatically used

**Steps**:
1. Run `/specweave:inc "New feature"`
2. PM agent invoked
3. Verify Sonnet used (check logs)
4. Spec.md generated
5. Cost tracked

**Expected**:
- Sonnet used for planning
- No user intervention required
- Cost logged to increment report

---

### E2E-002: Execution Workflow

**Scenario**: User implements tasks, Haiku automatically used

**Steps**:
1. Run `/specweave:do`
2. Frontend agent invoked for task
3. Verify Haiku used (check logs)
4. Code generated
5. Cost tracked

**Expected**:
- Haiku used for execution
- Quality maintained (code compiles)
- Cost savings vs Sonnet (60%+)

---

### E2E-003: Cost Dashboard

**Scenario**: User views cost report

**Steps**:
1. Complete increment with mixed Sonnet/Haiku usage
2. Run `/specweave:costs`
3. Dashboard displayed
4. Verify all metrics shown (totals, breakdown, savings)

**Expected**:
- Dashboard renders correctly
- Metrics accurate
- Savings calculated correctly
- Export options available

---

### E2E-004: Auto-Split Workflow

**Scenario**: User runs brownfield-onboarder, 3 phases auto-split

**Steps**:
1. Invoke brownfield-onboarder skill
2. Phase 1 (analysis) → Sonnet used
3. Phase 2 (migration) → Haiku used
4. Phase 3 (validation) → Sonnet used
5. Cost report shows savings

**Expected**:
- 3 phases execute automatically
- Cost savings > 60%
- Quality maintained (migration successful)
- Phase transitions logged

---

### E2E-005: Manual Override

**Scenario**: User forces Opus for critical task

**Steps**:
1. Invoke Task tool with `model: 'opus'`
2. Verify Opus used (ignores agent preference)
3. Cost tracked correctly
4. Higher cost reflected in report

**Expected**:
- Override respected
- Opus used
- Cost calculated correctly
- User has full control

---

## Performance Tests

### PERF-001: Model Selection Overhead

**Target**: < 50ms for model selection decision

**Test**:
```typescript
test('Model selection is fast', async () => {
  const start = performance.now();
  const decision = modelSelector.select('Implement feature', 'frontend');
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(50); // ms
});
```

**Expected**: < 50ms for 99% of requests

---

### PERF-002: Cost Tracking Overhead

**Target**: < 10ms per operation

**Test**:
```typescript
test('Cost tracking is fast', async () => {
  const start = performance.now();
  const sessionId = costTracker.startSession('frontend', 'haiku', 'execution');
  costTracker.endSession(sessionId, { input: 1000, output: 2000 }, true);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(10); // ms
});
```

**Expected**: < 10ms for 99% of operations

---

### PERF-003: Phase Detection Performance

**Target**: < 30ms for phase detection

**Test**:
```typescript
test('Phase detection is fast', async () => {
  const start = performance.now();
  const result = phaseDetector.detect('Implement the login form component');
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(30); // ms
});
```

**Expected**: < 30ms for 99% of requests

---

## Quality Tests

### QUAL-001: Haiku vs Sonnet Quality Comparison

**Purpose**: Verify Haiku achieves 90%+ quality vs Sonnet baseline

**Method**:
1. Create 50 test tasks (implementation-focused)
2. Run each with Sonnet → Collect results
3. Run each with Haiku → Collect results
4. Compare:
   - Success rate (compiles, tests pass)
   - Code quality (manual review)
   - Edge case handling

**Acceptance**: Haiku success rate ≥ 90% of Sonnet's

**Tasks**:
- Create React component
- Write API endpoint
- Write unit tests
- Refactor function
- Fix bug
- Add validation
- Update documentation
- ...45 more

---

### QUAL-002: Phase Detection Accuracy

**Purpose**: Verify phase detection accuracy ≥ 95%

**Method**:
1. Create 100 labeled test prompts
   - 40 planning prompts → expected: 'planning'
   - 40 execution prompts → expected: 'execution'
   - 20 review prompts → expected: 'review'
2. Run phase detector on all
3. Calculate accuracy: correct / total

**Acceptance**: Accuracy ≥ 95%

**Prompts**: See `tests/fixtures/phase-detection-test-set.yaml`

---

## Test Data & Fixtures

### Fixture Files

```
tests/fixtures/
├── phase-detection-test-set.yaml    # 100 labeled prompts
├── agent-preferences.yaml           # Test agent configs
├── sample-cost-reports.json         # Test cost data
└── brownfield-projects/             # Test projects for auto-split
    ├── small-project/
    ├── medium-project/
    └── large-project/
```

### Mock Data

**Mock Anthropic API Responses**:
```typescript
const mockSonnetResponse = {
  usage: { input_tokens: 1000, output_tokens: 2000 },
  content: 'Generated content',
  model: 'claude-sonnet-4.5',
};

const mockHaikuResponse = {
  usage: { input_tokens: 1000, output_tokens: 2000 },
  content: 'Generated content',
  model: 'claude-haiku-4.5',
};
```

---

## Test Execution

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Specific test file
npm test agent-model-manager.test.ts

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/test.yml`):
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3  # Upload coverage
```

**Quality Gates**:
- All tests must pass
- Coverage ≥ 80% (critical paths ≥ 95%)
- No new linting errors
- Performance tests pass

---

## Test Maintenance

### Adding New Tests

**When implementing task T-XXX**:
1. Write tests FIRST (TDD)
2. Ensure tests fail initially (red)
3. Implement functionality (green)
4. Refactor (refactor)
5. Verify coverage ≥ 90%

**Test file naming**:
- Unit: `tests/unit/{module-name}.test.ts`
- Integration: `tests/integration/{feature-name}.test.ts`
- E2E: `tests/e2e/{workflow-name}.spec.ts`

### Updating Tests

**When modifying code**:
- Update affected tests
- Add new tests for new behavior
- Remove obsolete tests
- Maintain coverage thresholds

### Test Review Checklist

- [ ] Test names are descriptive
- [ ] Tests are independent (no shared state)
- [ ] Edge cases covered
- [ ] Performance validated
- [ ] Fixtures used (not hard-coded data)
- [ ] Assertions clear and specific

---

## Success Criteria

### Acceptance Gates

**Unit Tests**:
- [ ] 100+ unit tests written
- [ ] Coverage ≥ 95% for core modules
- [ ] All tests pass
- [ ] Performance tests pass (<50ms, <10ms)

**Integration Tests**:
- [ ] 15 integration tests written
- [ ] End-to-end pipelines tested
- [ ] Backward compatibility verified
- [ ] All tests pass

**E2E Tests**:
- [ ] 5 E2E workflows tested (Playwright)
- [ ] User journeys validated
- [ ] Visual regression tests (optional)
- [ ] All tests pass

**Quality Tests**:
- [ ] Phase detection accuracy ≥ 95%
- [ ] Haiku quality ≥ 90% vs Sonnet
- [ ] Cost calculations validated against Anthropic billing
- [ ] No regressions in existing functionality

### Continuous Validation

**During Development**:
- Run tests on every commit
- Monitor coverage trends
- Fix flaky tests immediately
- Update fixtures as needed

**Before Release**:
- Full test suite passes
- Coverage thresholds met
- Performance benchmarks achieved
- Manual QA completed
- Beta user testing validated

---

## Related Documentation

- [spec.md](./spec.md) - Product requirements with acceptance criteria
- [plan.md](./plan.md) - Technical architecture
- [tasks.md](./tasks.md) - Implementation tasks (many reference test IDs)

---

**Last Updated**: 2025-10-30
**Status**: Planned
**Next Steps**: Execute tasks, write tests as you go (TDD)
