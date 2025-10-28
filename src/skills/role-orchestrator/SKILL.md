---
name: role-orchestrator
description: Multi-agent orchestration system that coordinates specialized agents (PM, Architect, DevOps, QA, Tech Lead, Security) to work together on complex tasks. Implements hierarchical orchestrator-worker pattern. Activates for complex multi-step requests requiring multiple roles/skills. Keywords: build product, create SaaS, full implementation, end-to-end, multi-agent, orchestrate, coordinate roles, complex project.
---

# Role Orchestrator - Multi-Agent Coordination System

**Purpose**: Coordinate multiple specialized agents to solve complex, multi-step problems through intelligent task decomposition and role assignment.

## Architecture Pattern

The role-orchestrator implements the **Hierarchical Orchestrator-Worker Pattern** from multi-agent systems research:

```
User Request
     ↓
Role Orchestrator (this skill)
     ↓
├── Task Decomposition (PM Agent)
├── Architecture Design (Architect Agent)
├── Technical Planning (Tech Lead Agent)
├── Security Review (Security Agent)
├── QA Strategy (QA Lead Agent)
├── Implementation (Backend/Frontend Agents)
└── Deployment (DevOps Agent)
```

## When to Activate

This skill activates for requests that require **3+ agents** or **full product development**:

| User Says | Agents Needed | Orchestration Pattern |
|-----------|---------------|---------------------|
| "Build a SaaS for project management" | PM → Architect → Tech Lead → Implement → QA → DevOps | Sequential with feedback loops |
| "Create real-time chat feature" | Architect → Tech Lead → Backend → Frontend → QA | Parallel (Backend + Frontend) |
| "Secure our authentication system" | Security → Tech Lead → Backend → QA | Sequential validation |
| "Deploy to production" | DevOps → QA → Backend → Tech Lead | Pre-flight checks |
| "Optimize system performance" | Tech Lead → Performance → Backend → DevOps → QA | Iterative optimization |

## Agent Roles & Responsibilities

### Strategic Layer

**1. PM Agent (pm-agent)**
- Product strategy and requirements
- User story creation
- Feature prioritization
- Stakeholder communication
- **When**: Starting new products/features

**2. Architect Agent (architect-agent)**
- System design and architecture
- Technology stack decisions
- Create Architecture Decision Records (ADRs)
- Component design
- **When**: Designing new systems or major features

### Execution Layer

**3. Tech Lead Agent (tech-lead-agent)**
- Technical planning and estimation
- Code review and quality standards
- Team guidance
- Technology mentorship
- **When**: Complex technical decisions needed

**4. Backend Developers**
- nodejs-backend: Node.js/TypeScript implementation
- python-backend: Python/FastAPI implementation
- dotnet-backend: C#/.NET implementation
- **When**: Implementing server-side logic

**5. Frontend Agent (frontend-agent)**
- React/Next.js implementation
- UI/UX implementation
- Client-side logic
- **When**: Building user interfaces

### Quality & Operations Layer

**6. QA Lead Agent (qa-lead-agent)**
- Test strategy creation
- Quality assurance
- Test case design
- Test coverage analysis
- **When**: Defining testing approach

**7. Security Agent (security-agent)**
- Security architecture review
- Threat modeling
- Penetration testing
- Compliance validation (OWASP, PCI-DSS)
- **When**: Security-critical features

**8. DevOps Agent (devops-agent)**
- Infrastructure provisioning
- CI/CD pipeline setup
- Deployment automation
- Monitoring and observability
- **When**: Deployment and operations tasks

## ⚠️ CRITICAL: Increment Creation FIRST

**MANDATORY FIRST STEP**: Before invoking ANY agents, the role-orchestrator MUST create an increment folder.

### Phase 0: Create Increment Structure

```typescript
async function createIncrementFirst(userRequest: string): Promise<IncrementInfo> {
  // 1. Parse user request to extract project name
  const projectName = extractProjectName(userRequest);
  // e.g., "event management" → "event-management"

  // 2. Auto-number increment (scan .specweave/increments/ for highest)
  const nextNumber = await getNextIncrementNumber();
  // e.g., 0001, 0002, 0003

  // 3. Create increment folder
  const incrementPath = `.specweave/increments/${nextNumber}-${projectName}/`;
  await mkdir(incrementPath, { recursive: true });

  // 4. Create subdirectories
  await mkdir(`${incrementPath}logs/`);
  await mkdir(`${incrementPath}scripts/`);
  await mkdir(`${incrementPath}reports/`);

  // 5. Create placeholder files
  await writeFile(`${incrementPath}spec.md`, SPEC_TEMPLATE);
  await writeFile(`${incrementPath}tasks.md`, TASKS_TEMPLATE);
  await writeFile(`${incrementPath}tests.md`, TESTS_TEMPLATE);
  await writeFile(`${incrementPath}context-manifest.yaml`, CONTEXT_MANIFEST_TEMPLATE);

  // 6. Return increment info for agents
  return {
    id: `${nextNumber}-${projectName}`,
    path: incrementPath,
    number: nextNumber,
    name: projectName
  };
}
```

**Templates**:

```yaml
# spec.md frontmatter
---
increment: 0001-event-management
title: "Event Management SaaS"
priority: P1
status: planned
created: 2025-10-26
structure: user-stories
---

# Event Management SaaS

## Overview

(To be filled by PM Agent)
```

```yaml
# context-manifest.yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/README.md

documentation:
  - .specweave/docs/internal/architecture/README.md

max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

**Then pass increment path to ALL agents**:
```typescript
const increment = await createIncrementFirst(userRequest);

// Now invoke agents with increment path
await invokeAgent('pm', {
  task: 'Define product requirements',
  outputPath: `${increment.path}reports/pm-analysis.md`,
  incrementId: increment.id
});
```

### ⚠️ CRITICAL: File Reading Instructions for Agents

When invoking agents, provide clear instructions to **read FILES, not DIRECTORIES**:

**❌ WRONG**:
```typescript
await invokeAgent('architect', {
  task: 'Read .specweave/docs/internal/strategy and design architecture'
});
```
This will fail with `EISDIR: illegal operation on a directory, read`

**✅ CORRECT**:
```typescript
await invokeAgent('architect', {
  task: `Read .specweave/docs/internal/strategy/README.md for existing strategy.
         Use Glob to find additional files: .specweave/docs/internal/strategy/**/*.md
         Then design system architecture.`
});
```

**Best Practice**:
- Always specify **file paths** (`.md` extension), NOT directory paths
- Use `Glob` tool for pattern matching (`**/*.md`)
- Read `README.md` files for directory overviews
- List specific files to read

---

## Orchestration Workflows

### Workflow 1: New Product Development

```yaml
name: "Build SaaS Product"
pattern: sequential_with_gates
agents:
  - role: pm-agent
    task: "Define product requirements and user stories"
    output: specifications/product.md
    gate: user_approval_required

  - role: architect-agent
    task: "Design system architecture"
    input: specifications/product.md
    output: .specweave/docs/architecture/system-design.md
    gate: tech_review_required

  - role: tech-lead-agent
    task: "Create technical implementation plan"
    input: .specweave/docs/architecture/system-design.md
    output: .specweave/increments/####-product/plan.md

  - role: security-agent
    task: "Security architecture review"
    input: .specweave/docs/architecture/system-design.md
    output: .specweave/docs/architecture/security/threat-model.md
    gate: security_approval

  - role: qa-lead-agent
    task: "Define test strategy"
    input: specifications/product.md
    output: .specweave/increments/####-product/tests.md

  - role: [nodejs-backend, frontend-agent]
    task: "Implement features"
    pattern: parallel
    input: .specweave/increments/####-product/plan.md

  - role: qa-lead-agent
    task: "Execute tests"
    input: .specweave/increments/####-product/tests.md
    gate: all_tests_pass

  - role: devops-agent
    task: "Deploy to production"
    input: .specweave/increments/####-product/plan.md#deployment
    gate: deployment_approval

success_criteria:
  - All gates passed
  - Tests passing (>80% coverage)
  - Security review approved
  - Deployed successfully
```

### Workflow 2: Feature Addition (Brownfield)

```yaml
name: "Add Feature to Existing System"
pattern: analyze_then_build
agents:
  - role: tech-lead-agent
    task: "Analyze existing codebase"
    output: .specweave/increments/####-feature/analysis.md

  - role: architect-agent
    task: "Design integration approach"
    input: .specweave/increments/####-feature/analysis.md
    output: .specweave/increments/####-feature/plan.md

  - role: qa-lead-agent
    task: "Create regression test suite"
    input: .specweave/increments/####-feature/analysis.md
    output: .specweave/increments/####-feature/regression-tests.md
    gate: user_validates_tests

  - role: [backend-agent, frontend-agent]
    task: "Implement feature"
    pattern: parallel

  - role: qa-lead-agent
    task: "Run regression + new tests"
    gate: no_regressions_detected

  - role: devops-agent
    task: "Deploy with canary release"
```

### Workflow 3: Security Hardening

```yaml
name: "Secure Existing System"
pattern: assess_fix_verify
agents:
  - role: security-agent
    task: "Threat modeling and security assessment"
    output: .specweave/docs/architecture/security/assessment.md

  - role: tech-lead-agent
    task: "Prioritize security issues"
    input: .specweave/docs/architecture/security/assessment.md
    output: work/issues/###-security-fixes/

  - role: [backend-agent, frontend-agent]
    task: "Implement security fixes"
    pattern: parallel

  - role: security-agent
    task: "Penetration testing"
    gate: no_critical_vulns

  - role: qa-lead-agent
    task: "Security regression tests"
    gate: all_tests_pass

  - role: devops-agent
    task: "Deploy with zero-downtime"
```

### Workflow 4: Performance Optimization

```yaml
name: "Optimize System Performance"
pattern: measure_optimize_verify
agents:
  - role: tech-lead-agent
    task: "Profile and identify bottlenecks"
    output: work/issues/###-performance/analysis.md

  - role: architect-agent
    task: "Design optimization strategy"
    input: work/issues/###-performance/analysis.md

  - role: [backend-agent, frontend-agent, devops-agent]
    task: "Implement optimizations"
    pattern: parallel

  - role: qa-lead-agent
    task: "Performance regression tests"
    gate: performance_targets_met

  - role: devops-agent
    task: "Deploy with traffic shaping"
```

## Task Decomposition Strategy

### 1. Analyze Request Complexity

```typescript
interface ComplexityAnalysis {
  scope: 'single-feature' | 'multi-feature' | 'full-product' | 'system-wide';
  domains: string[];  // ['backend', 'frontend', 'database', 'infrastructure']
  phases: number;     // Number of sequential phases
  agents_needed: string[];
  estimated_effort: 'small' | 'medium' | 'large' | 'xl';
}

function analyzeComplexity(userRequest: string): ComplexityAnalysis {
  // Use intent classification from skill-router
  // Analyze keywords, scope, and requirements
  // Return structured complexity analysis
}
```

### 2. Create Execution Plan

```typescript
interface ExecutionPlan {
  phases: Phase[];
  parallel_groups: ParallelGroup[];
  gates: QualityGate[];
  estimated_duration: string;
}

interface Phase {
  name: string;
  agents: AgentAssignment[];
  dependencies: string[];  // Phase IDs this depends on
  outputs: string[];       // File paths to create
}

interface ParallelGroup {
  agents: string[];
  can_run_concurrently: boolean;
  sync_point: string;  // Where they must sync
}

interface QualityGate {
  phase: string;
  type: 'user_approval' | 'test_pass' | 'security_review' | 'performance_target';
  criteria: string[];
  blocker: boolean;  // If true, cannot proceed until gate passes
}
```

### 3. Execute with Monitoring

```typescript
interface ExecutionState {
  current_phase: number;
  completed_tasks: string[];
  blocked_tasks: string[];
  gates_status: Record<string, 'pending' | 'passed' | 'failed'>;
  agent_outputs: Record<string, any>;
}

async function execute(plan: ExecutionPlan): Promise<ExecutionResult> {
  const state: ExecutionState = initializeState();

  for (const phase of plan.phases) {
    // Check dependencies satisfied
    if (!areDependenciesMet(phase, state)) {
      await waitForDependencies(phase);
    }

    // Execute agents (parallel or sequential)
    const results = await executePhase(phase);

    // Update state
    state.completed_tasks.push(...results.tasks);
    state.agent_outputs[phase.name] = results.outputs;

    // Check quality gates
    if (phase.gates) {
      const gateResults = await checkGates(phase.gates);
      if (gateResults.failed.length > 0) {
        // Handle gate failures
        await handleGateFailures(gateResults.failed);
      }
    }
  }

  return {
    success: state.blocked_tasks.length === 0,
    outputs: state.agent_outputs,
    summary: generateSummary(state)
  };
}
```

## Agent Communication Patterns

### 1. Sequential Handoff

```
PM Agent → Architect Agent → Tech Lead → Implementation
   (specs)     (design)         (plan)      (code)
```

Each agent receives the previous agent's output and builds upon it.

### 2. Parallel Execution with Shared State

```
Backend Agent ─┐
               ├─→ Shared Memory (Context) ─→ Integration Phase
Frontend Agent ─┘
```

Multiple agents work simultaneously, coordinated through shared context.

### 3. Feedback Loops

```
Implementation → QA → [FAIL] → Tech Lead (analysis) → Implementation
                  ↓
               [PASS]
                  ↓
              DevOps
```

Iterative refinement with quality gates.

### 4. Hierarchical Decision-Making

```
Role Orchestrator (strategic decisions)
         ↓
Tech Lead Agent (tactical decisions)
         ↓
Implementation Agents (execution)
```

## Context Management

### Shared Context Structure

```yaml
# .specweave/orchestration/context.yaml
project:
  name: "E-Commerce Platform"
  phase: "implementation"
  current_feature: "003-payment-processing"

agents_active:
  - pm-agent: "requirements_complete"
  - architect-agent: "design_approved"
  - backend-agent: "in_progress"
  - frontend-agent: "in_progress"
  - qa-lead-agent: "test_strategy_ready"

shared_artifacts:
  specifications: "specifications/modules/payments/"
  architecture: ".specweave/docs/architecture/payment-system.md"
  feature_plan: "features/003-payment-processing/plan.md"
  implementation: "src/payments/"

quality_gates:
  - name: "security_review"
    status: "passed"
    approved_by: "security-agent"
  - name: "test_coverage"
    status: "pending"
    target: ">80%"
    current: "67%"
```

### Agent-to-Agent Communication

Agents communicate through:
1. **File outputs**: Each agent creates files in designated locations
2. **Shared memory**: `.specweave/orchestration/context.yaml`
3. **Event system**: Agents emit events when tasks complete
4. **Quality gates**: Explicit approval/rejection points

## Decision-Making Framework

### When to Use Which Agent

```typescript
const agentSelectionRules = {
  // Product/Business decisions
  'requirements|user-stories|product-strategy': 'pm-agent',

  // Architecture decisions
  'design|architecture|system-design|tech-stack': 'architect-agent',

  // Technical guidance
  'code-review|best-practices|technical-debt|refactoring': 'tech-lead-agent',

  // Security
  'security|authentication|authorization|encryption|compliance': 'security-agent',

  // Quality assurance
  'testing|qa|test-strategy|test-coverage': 'qa-lead-agent',

  // Implementation
  'implement-nodejs|api|backend': 'nodejs-backend',
  'implement-python|ml|data': 'python-backend',
  'implement-dotnet|csharp|enterprise': 'dotnet-backend',
  'implement-ui|frontend|react': 'frontend-agent',

  // Operations
  'deploy|infrastructure|ci-cd|monitoring': 'devops-agent'
};

function selectAgents(task: string): string[] {
  const keywords = extractKeywords(task);
  const matchedAgents = [];

  for (const [pattern, agent] of Object.entries(agentSelectionRules)) {
    if (keywords.some(kw => pattern.includes(kw))) {
      matchedAgents.push(agent);
    }
  }

  return matchedAgents;
}
```

## Error Handling & Resilience

### Retry Strategy

```typescript
interface RetryConfig {
  max_attempts: number;
  backoff: 'linear' | 'exponential';
  fallback_agent?: string;
}

async function executeWithRetry(
  agent: string,
  task: string,
  config: RetryConfig
): Promise<AgentResult> {
  for (let attempt = 1; attempt <= config.max_attempts; attempt++) {
    try {
      const result = await invokeAgent(agent, task);
      if (result.success) {
        return result;
      }
    } catch (error) {
      if (attempt === config.max_attempts) {
        // Try fallback agent if configured
        if (config.fallback_agent) {
          return await invokeAgent(config.fallback_agent, task);
        }
        throw error;
      }
      await sleep(calculateBackoff(attempt, config.backoff));
    }
  }
}
```

### Feedback Loops with Auto-Refinement

**NEW: Automatic quality improvement through iterative refinement**

```typescript
interface FeedbackLoopConfig {
  enabled: boolean;
  max_retries: 3;
  stop_on_improvement: boolean;
  quality_threshold: number;  // 0.0-1.0
  require_user_approval: boolean;
}

interface RefinementResult {
  attempt: number;
  output: string;
  score: number;
  issues: Issue[];
  improved: boolean;
  final: boolean;
}

async function executeWithFeedback(
  agent: string,
  task: string,
  validator: (output: string) => Promise<ValidationResult>,
  config: FeedbackLoopConfig
): Promise<RefinementResult> {

  let bestResult = null;
  let bestScore = 0;

  for (let attempt = 1; attempt <= config.max_retries; attempt++) {
    // Execute agent
    const output = await invokeAgent(agent, task);

    // Validate output
    const validation = await validator(output);

    // Track progress
    console.log(`🔄 Refinement Attempt ${attempt}/${config.max_retries}`);
    console.log(`   Score: ${validation.score.toFixed(2)} (Target: ${config.quality_threshold})`);

    // Check if quality threshold met
    if (validation.score >= config.quality_threshold) {
      console.log(`✅ Quality threshold met (${validation.score.toFixed(2)} >= ${config.quality_threshold})`);
      return {
        attempt,
        output,
        score: validation.score,
        issues: [],
        improved: true,
        final: true
      };
    }

    // Track best result
    if (validation.score > bestScore) {
      bestScore = validation.score;
      bestResult = { attempt, output, score: validation.score, issues: validation.issues };
    }

    // Check if should stop (improvement + stop_on_improvement flag)
    if (config.stop_on_improvement && attempt > 1 && validation.score > bestScore) {
      console.log(`⏸️  Stopping early (score improved: ${bestScore.toFixed(2)} → ${validation.score.toFixed(2)})`);
      return {
        ...bestResult,
        improved: true,
        final: true
      };
    }

    // If not last attempt, prepare feedback for next iteration
    if (attempt < config.max_retries) {
      const feedback = generateFeedback(validation.issues);

      // Update task with feedback
      task = `${task}\n\n**Feedback from previous attempt (${validation.score.toFixed(2)}/1.00):**\n${feedback}`;

      console.log(`   Issues found: ${validation.issues.length}`);
      console.log(`   Retrying with feedback...`);
    }
  }

  // Max retries reached, return best result
  console.log(`⚠️  Max retries reached. Best score: ${bestScore.toFixed(2)}`);

  return {
    ...bestResult,
    improved: bestScore > 0,
    final: true
  };
}

function generateFeedback(issues: Issue[]): string {
  const feedback: string[] = [];

  for (const issue of issues) {
    feedback.push(`• ${issue.severity.toUpperCase()}: ${issue.description}`);
    if (issue.location) {
      feedback.push(`  Location: ${issue.location}`);
    }
    if (issue.suggestion) {
      feedback.push(`  Suggestion: ${issue.suggestion}`);
    }
  }

  return feedback.join('\n');
}
```

### Feedback Loop Workflow

```
Agent generates output
         ↓
Validate output (rule-based + LLM-judge)
         ↓
Score < threshold? ──No──→ ✅ Accept output
         ↓ Yes
Extract issues and suggestions
         ↓
Generate feedback prompt
         ↓
Agent regenerates with feedback ──┐
         ↓                         │
Validate again                     │
         ↓                         │
Score improved? ──No──→ Retry ────┘ (max 3x)
         ↓ Yes
✅ Accept improved output
```

### Agent-Specific Feedback Integration

**PM Agent (Requirements)**
```typescript
const pmValidator = async (spec: string) => {
  // Rule-based checks
  const ruleScore = await runRuleBasedValidation(spec);

  // Optional: LLM-as-judge quality check
  const qualityScore = await incrementQualityJudge.evaluate(spec);

  return {
    score: (ruleScore + qualityScore) / 2,
    issues: [...ruleIssues, ...qualityIssues]
  };
};

await executeWithFeedback(
  'pm-agent',
  'Define requirements for authentication',
  pmValidator,
  config
);
```

**Architect Agent (Design)**
```typescript
const architectValidator = async (design: string) => {
  return await incrementQualityJudge.evaluate(design, {
    dimensions: ['feasibility', 'scalability', 'maintainability']
  });
};

await executeWithFeedback(
  'architect-agent',
  'Design authentication system',
  architectValidator,
  config
);
```

**QA Lead Agent (Test Strategy)**
```typescript
const qaValidator = async (testPlan: string) => {
  // Check test coverage
  const coverage = await analyzeTestCoverage(testPlan);

  // Check testability
  const testability = await incrementQualityJudge.evaluate(testPlan, {
    dimensions: ['testability', 'completeness']
  });

  return {
    score: coverage >= 0.80 ? testability.score : 0.60,
    issues: testability.issues
  };
};

await executeWithFeedback(
  'qa-lead-agent',
  'Create test strategy',
  qaValidator,
  config
);
```

### Example: PM Agent with Feedback Loop

```markdown
🔷 SpecWeave Multi-Agent Orchestration Active

**Task**: Create authentication feature
**Agent**: PM Agent (Requirements)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Attempt 1/3**: Generating requirements...

✅ PM Agent completed
🔍 Validating output...

Validation Results:
  Rule-based: ✅ 47/47 passed
  Quality Score: 0.72/1.00 ⚠️ (Needs improvement)

Issues Found:
  • MAJOR: Acceptance criteria not testable
    Location: Section "Success Criteria"
    Suggestion: Use measurable metrics (e.g., "Login completes in <2s")

  • MINOR: Missing rate limiting specification
    Location: Section "Security"
    Suggestion: Specify brute-force protection (5 attempts, 15min lockout)

Score: 0.72 < 0.80 (threshold)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 **Attempt 2/3**: Refining with feedback...

✅ PM Agent completed (with feedback)
🔍 Validating output...

Validation Results:
  Rule-based: ✅ 47/47 passed
  Quality Score: 0.85/1.00 ✓ (Improved!)

Issues Found:
  • MINOR: Performance requirements could be more specific
    Location: Section "Non-functional Requirements"
    Suggestion: Add p95/p99 latency targets

Score: 0.85 > 0.80 (threshold) ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **Final Result**: Requirements validated (0.85/1.00)

Improvements made:
  ✓ Acceptance criteria now measurable
  ✓ Rate limiting specified (5 attempts, 15min lockout)
  ✓ Testable success metrics added

Minor issues remaining (can be addressed later):
  • Performance requirements (p95/p99 targets)

Proceeding to architecture phase...
```

### Configuration for Feedback Loops

```yaml
# .specweave/config.yaml
role_orchestrator:
  enabled: true

  # Feedback loop configuration
  feedback_loops:
    enabled: true              # Enable auto-refinement
    max_retries: 3             # Max refinement attempts
    stop_on_improvement: true  # Stop if score improves
    require_user_approval: false  # Auto-refine without asking

    # Quality thresholds per agent
    thresholds:
      pm_agent: 0.80           # Requirements quality
      architect_agent: 0.80    # Design quality
      qa_lead_agent: 0.75      # Test coverage + quality

    # Which agents use feedback loops
    agents:
      - pm_agent
      - architect_agent
      - qa_lead_agent
      # Not applicable for implementation agents

    # Validation strategy
    validation:
      use_llm_judge: true      # Use increment-quality-judge
      combine_with_rules: true # Combine with rule-based checks
      judge_weight: 0.5        # 50% LLM judge, 50% rules
```

### Gate Failure Handling

```typescript
async function handleGateFailure(gate: QualityGate): Promise<void> {
  switch (gate.type) {
    case 'test_pass':
      // Route to QA Lead for analysis
      await invokeAgent('qa-lead-agent', 'Analyze test failures');
      // Then route to appropriate implementation agent
      break;

    case 'security_review':
      // Route to Security Agent for details
      await invokeAgent('security-agent', 'Detail security issues');
      // Create work items for fixes
      break;

    case 'performance_target':
      // Route to Tech Lead for optimization strategy
      await invokeAgent('tech-lead-agent', 'Performance optimization plan');
      break;

    case 'user_approval':
      // Notify user, wait for feedback
      await notifyUser(gate);
      await waitForUserApproval(gate);
      break;
  }
}
```

## Monitoring & Observability

### Progress Tracking

```typescript
interface OrchestrationMetrics {
  total_phases: number;
  completed_phases: number;
  agents_invoked: Record<string, number>;
  gates_passed: number;
  gates_failed: number;
  execution_time: number;
  estimated_time_remaining: number;
}

function trackProgress(state: ExecutionState): OrchestrationMetrics {
  // Calculate metrics
  // Store in .specweave/orchestration/metrics.json
  // Display to user
}
```

### User Visibility

Provide clear progress updates:

```markdown
🔷 SpecWeave Multi-Agent Orchestration Active

**Task**: Build E-Commerce Platform
**Progress**: Phase 3 of 6 (Implementation)

✅ Phase 1: Requirements (PM Agent) - Complete
✅ Phase 2: Architecture (Architect Agent) - Complete
🔄 Phase 3: Implementation - In Progress
   ├─ Backend (nodejs-backend): 65% complete
   └─ Frontend (frontend-agent): 45% complete
⏳ Phase 4: Testing (QA Lead) - Waiting
⏳ Phase 5: Security Review - Waiting
⏳ Phase 6: Deployment - Waiting

**Quality Gates**:
✅ Architecture Review: Passed
⏳ Test Coverage (Target: >80%): Currently 67%
⏳ Security Review: Pending

**Estimated Time Remaining**: 2-3 hours
```

## Integration with Other Skills

### Skill Invocation

```typescript
// role-orchestrator can invoke any other skill
async function invokeSkill(skillName: string, task: string, context: any) {
  // Load skill context
  const skillContext = await loadSkillContext(skillName);

  // Merge with orchestration context
  const mergedContext = {
    ...context,
    ...skillContext,
    orchestration: {
      coordinator: 'role-orchestrator',
      phase: context.current_phase,
      task_id: generateTaskId()
    }
  };

  // Invoke skill
  const result = await executeSkill(skillName, task, mergedContext);

  // Store result in shared memory
  await storeResult(skillName, result);

  return result;
}
```

### Called By

- **specweave-detector**: For complex multi-agent requests
- **skill-router**: When complexity analysis indicates >3 agents needed

### Calls

- All SpecWeave agent skills (pm-agent, architect-agent, etc.)
- SpecWeave utility skills (context-loader, docs-updater, etc.)

## Configuration

```yaml
# .specweave/config.yaml
role_orchestrator:
  enabled: true

  # Orchestration strategy
  default_pattern: "sequential_with_gates"  # or "parallel" or "adaptive"

  # Quality gates
  require_user_approval:
    - architecture_decisions
    - deployment_to_production

  require_automated_approval:
    - test_coverage: ">80%"
    - security_scan: "no_critical"

  # Agent preferences
  preferred_backend: "nodejs-backend"  # or python-backend, dotnet-backend
  preferred_frontend: "frontend-agent"

  # Timeouts
  phase_timeout_minutes: 30
  total_timeout_hours: 8

  # Monitoring
  progress_updates_interval: "5min"
  store_metrics: true
```

## Testing

### Test Cases

**TC-001: Simple Product Development**
- Given: User requests "Build a todo app"
- When: role-orchestrator analyzes request
- Then: Invokes PM → Architect → Backend → Frontend → QA → DevOps
- And: All phases complete successfully

**TC-002: Parallel Execution**
- Given: User requests "Implement payment feature"
- When: Implementation phase starts
- Then: Backend and Frontend agents run in parallel
- And: Both complete without conflicts

**TC-003: Quality Gate Failure**
- Given: Test coverage is 65% (target: >80%)
- When: QA gate evaluates
- Then: Gate fails, blocks deployment
- And: Routes to QA Lead for analysis

**TC-004: Security Gate**
- Given: Security review finds critical vulnerability
- When: Security gate evaluates
- Then: Blocks deployment
- And: Creates work items for security fixes

**TC-005: Brownfield Integration**
- Given: Existing codebase needs new feature
- When: role-orchestrator receives request
- Then: Starts with Tech Lead analysis
- And: Creates regression tests before modification

## Best Practices

### 1. Clear Phase Boundaries

Each phase should have:
- Clear inputs
- Clear outputs
- Success criteria
- Failure handling

### 2. Explicit Dependencies

Always declare:
- Which phases depend on which
- What artifacts are required
- What approvals are needed

### 3. Quality Gates at Key Points

Insert gates:
- After architecture decisions
- Before implementation
- After implementation (tests)
- Before deployment

### 4. User Visibility

Keep users informed:
- Show current phase
- Display progress percentage
- Estimate time remaining
- Highlight blockers

### 5. Graceful Degradation

If an agent fails:
- Retry with backoff
- Try fallback agent
- If critical, pause and notify user
- Don't fail silently

## Resources

### Multi-Agent Systems Research
- [Microsoft Autogen](https://microsoft.github.io/autogen/) - Multi-agent conversation framework
- [LangGraph Multi-Agent](https://blog.langchain.com/langgraph-multi-agent-workflows/) - LangChain's orchestration
- [CrewAI](https://www.crewai.io/) - Role-based agent collaboration
- [Amazon Bedrock Multi-Agent](https://aws.amazon.com/blogs/machine-learning/design-multi-agent-orchestration-with-reasoning-using-amazon-bedrock-and-open-source-frameworks/) - AWS multi-agent patterns

### Orchestration Patterns
- [Azure AI Agent Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) - Microsoft's agent design patterns
- [Orchestrator-Worker Pattern](https://www.confluent.io/blog/event-driven-multi-agent-systems/) - Event-driven multi-agent systems

### Quality Gates
- [Shift-Left Testing](https://www.atlassian.com/continuous-delivery/software-testing/shift-left-testing) - Early quality gates
- [DORA Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance) - Deployment quality metrics

---

## Summary

The **role-orchestrator** skill is the **central nervous system** of SpecWeave's multi-agent architecture:

✅ Coordinates 10+ specialized agents
✅ Implements hierarchical orchestrator-worker pattern
✅ Supports sequential, parallel, and adaptive workflows
✅ Enforces quality gates at critical points
✅ Provides real-time progress tracking
✅ Handles failures gracefully with retry and fallback
✅ Enables complex product development with AI agents

**User benefit**: Submit complex requests like "Build a SaaS" and watch multiple AI agents collaborate seamlessly to deliver the complete solution, from requirements to deployment.

This is the **factory of agents** that makes SpecWeave a true AI-powered development framework.
