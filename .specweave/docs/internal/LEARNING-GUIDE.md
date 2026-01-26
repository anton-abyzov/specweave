# SpecWeave Learning Guide

**Last Updated**: 2026-01-08
**Version**: 1.0.109
**Target Audience**: New Contributors, Technical Staff

---

## Welcome to SpecWeave!

This guide will help you understand the SpecWeave codebase from a technical perspective. Whether you're a new contributor or looking to deepen your understanding, this guide will walk you through the key concepts, architecture, and components.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Learning Path](#learning-path)
3. [Key Concepts](#key-concepts)
4. [Architecture Deep Dive](#architecture-deep-dive)
5. [Code Walkthrough](#code-walkthrough)
6. [Common Patterns](#common-patterns)
7. [Debugging Guide](#debugging-guide)
8. [Contributing](#contributing)

---

## Quick Start

### 1. Set Up Your Environment

```bash
# Clone the repository
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify setup
npm test

# Install globally for testing
npm link
```

### 2. Project Structure Overview

```
specweave/
├── src/                    # Core framework (215K+ LOC)
│   ├── cli/               # Command-line interface
│   ├── core/              # Core functionality
│   ├── config/            # Configuration management
│   ├── hooks/             # Git and event hooks
│   ├── sync/              # External tool sync
│   └── living-docs/       # Documentation builder
├── plugins/               # 25+ specialized plugins
├── tests/                 # Test suites
└── .specweave/            # Internal living docs
```

### 3. Run Your First Command

```bash
# Initialize a test project
mkdir test-project && cd test-project
specweave init .

# Create your first increment
specweave increment "Hello World feature"

# Check status
specweave status
```

---

## Learning Path

### Phase 1: Foundation (Week 1)

**Goal**: Understand core concepts and basic workflow

1. **Read Documentation** (2 hours)
   - [TECHNICAL-OVERVIEW.md](architecture/TECHNICAL-OVERVIEW.md)
   - [CLAUDE.md](../../CLAUDE.md) - SpecWeave instructions
   - [README.md](../../README.md) - Project introduction

2. **Explore Increments** (2 hours)
   - Navigate: `.specweave/increments/`
   - Read: `spec.md`, `tasks.md`, `metadata.json`
   - Understand the increment lifecycle

3. **Study Diagrams** (1 hour)
   - [System Context](architecture/diagrams/system-context.mmd)
   - [Container View](architecture/diagrams/system-container.mmd)
   - [Increment Lifecycle](architecture/diagrams/state/increment-lifecycle.mmd)

4. **Hands-On Exercise** (3 hours)
   - Create a test project
   - Create 3 increments (FEATURE, BUG, HOTFIX)
   - Complete tasks and observe auto-transitions
   - Archive completed increments

**Success Criteria**: You can explain the increment lifecycle and create/complete increments.

---

### Phase 2: Core Components (Week 2)

**Goal**: Understand the core architectural components

1. **Increment Management** (4 hours)
   - Read: `src/core/increment/metadata-manager.ts`
   - Read: `src/core/increment/active-increment-manager.ts`
   - Study: WIP limits and status transitions
   - Exercise: Modify WIP limits in a test project

2. **Specification System** (4 hours)
   - Read: `src/core/specs/spec-parser.ts`
   - Read: `src/core/specs/completion-propagator.ts`
   - Study: How ACs propagate when tasks complete
   - Exercise: Add custom AC parsing logic

3. **Hook System** (4 hours)
   - Read: `src/core/hooks/hook-executor.ts`
   - Read: `plugins/specweave/hooks/auto-transition.ts`
   - Study: Event-driven architecture
   - Exercise: Create a custom hook

**Success Criteria**: You can explain how increments, specs, and hooks interact.

---

### Phase 3: Advanced Features (Week 3)

**Goal**: Master sync, plugins, and auto mode

1. **Sync Engine** (6 hours)
   - Read: `src/core/sync/sync-orchestrator.ts`
   - Read: `plugins/specweave-github/lib/github-adapter.ts`
   - Study: Multi-platform sync coordination
   - Exercise: Set up GitHub sync for a test project

2. **Plugin System** (4 hours)
   - Read: [COMPONENT-CATALOG.md](architecture/COMPONENT-CATALOG.md) - Plugin section
   - Study: `plugins/specweave/` structure
   - Exercise: Create a simple plugin with one skill

3. **Auto Mode** (4 hours)
   - Read: `src/core/auto/session-manager.ts`
   - Read: `plugins/specweave/hooks/stop-auto.sh`
   - Study: Autonomous execution loop
   - Exercise: Run `/sw:auto` on a test increment

**Success Criteria**: You can set up external sync and create basic plugins.

---

### Phase 4: Expert Topics (Week 4)

**Goal**: Contribute to core framework

1. **Living Documentation** (4 hours)
   - Read: `src/living-docs/living-docs-builder.ts`
   - Study: 6-pillar documentation structure
   - Exercise: Generate living docs for a test project

2. **Multi-Agent System** (4 hours)
   - Read: `src/core/agents/agent-orchestrator.ts`
   - Study: PM → Architect → Tech Lead flow
   - Exercise: Trace `/sw:increment` execution

3. **Performance & Optimization** (4 hours)
   - Study: Progressive plugin loading
   - Study: Circuit breaker pattern
   - Exercise: Profile plugin loading performance

4. **Contributing** (2 hours)
   - Read: [CONTRIBUTING.md](../../CONTRIBUTING.md) (if exists)
   - Study: Git workflow and PR process
   - Exercise: Submit a documentation improvement PR

**Success Criteria**: You can contribute meaningful improvements to the core framework.

---

## Key Concepts

### 1. Increment-Centric Development

**Philosophy**: All work happens in temporary increments that feed permanent living documentation.

```
Temporary Increment (0001-feature)
    ↓
Permanent Living Docs (.specweave/docs/internal/specs/FS-001/)
    ↓
Archived Increment (_archive/0001-feature/)
```

**Key Points**:
- Increments are work units, not features
- Living docs are permanent, increments are temporary
- Specs drive implementation, not the other way around

### 2. Specification-First Approach

**Philosophy**: Write specs before code. Specs are the source of truth.

```
User Story (US-001)
    ↓
Acceptance Criteria (AC-US1-01, AC-US1-02)
    ↓
Tasks (T-001, T-002)
    ↓
Implementation
    ↓
AC Completion Feedback Loop
```

**Key Points**:
- User stories define WHAT
- Acceptance criteria define DONE
- Tasks define HOW
- Implementation follows tasks
- Completion updates specs

### 3. Event-Driven Architecture

**Philosophy**: Decouple concerns via hooks and events.

```
Task Completed (Event)
    ↓
Hook: update-tasks-md (Updates tasks.md)
    ↓
Hook: auto-transition (Checks if all tasks done)
    ↓
Hook: sync-living-docs (Updates living docs)
    ↓
Hook: sync-external (Updates GitHub/JIRA/ADO)
```

**Key Points**:
- Hooks run in isolated child processes
- No shared state between hooks
- Health checking before execution
- Auto-fixing common errors

### 4. Multi-Agent Planning

**Philosophy**: Specialized agents for different planning phases.

```
PM Agent (Product Manager)
    ↓ (Requirements, market research)
Architect Agent (System Architect)
    ↓ (Technical design, patterns)
Tech Lead Agent (Implementation)
    ↓ (Tasks, estimates, risks)
Generated Files (spec.md, plan.md, tasks.md)
```

**Key Points**:
- Each agent has isolated context
- PM focuses on WHAT and WHY
- Architect focuses on HOW (architecture)
- Tech Lead focuses on HOW (implementation)

### 5. Bidirectional Sync

**Philosophy**: Sync with external tools while maintaining local control.

```
Local Increment (spec.md + tasks.md)
    ↕ (Bidirectional sync)
External Tool (GitHub Issue / JIRA Story / ADO Work Item)
```

**Key Points**:
- Local is source of truth for specs
- External is source of truth for status
- Conflict resolution via circuit breaker
- Permission-based enforcement

### 6. Living Documentation

**Philosophy**: Documentation that evolves with your codebase.

```
6 Core Pillars:
1. Strategy (Why we build)
2. Specs (What we build)
3. Architecture (How we design)
4. Delivery (How we build)
5. Operations (How we run)
6. Governance (Guardrails)
```

**Key Points**:
- Auto-organized by theme
- Cross-linked for navigation
- Synced from increment specs
- Permanent, not temporary

---

## Architecture Deep Dive

### Core Workflow: Creating an Increment

**Command**: `/sw:increment "Add authentication"`

**Execution Flow**:

```
1. User invokes command
   └─ src/cli/commands/increment.ts

2. PM Agent: Market research
   └─ plugins/specweave/skills/pm/pm-agent.ts
   └─ Output: Requirements, user expectations

3. Architect Agent: System design
   └─ plugins/specweave/skills/architect/architect-agent.ts
   └─ Output: Architecture, component breakdown

4. Tech Lead Agent: Implementation plan
   └─ plugins/specweave/skills/tech-lead/tech-lead-agent.ts
   └─ Output: Tasks, estimates, risks

5. Generate Files
   └─ src/core/increment/increment-generator.ts
   └─ Create: spec.md, plan.md, tasks.md

6. Create Increment Folder
   └─ src/core/increment/increment-number-manager.ts
   └─ Validate unique ID
   └─ Create: .specweave/increments/0XXX-feature/

7. Sync to Living Docs
   └─ plugins/specweave/hooks/sync-living-docs.ts
   └─ Create: .specweave/docs/internal/specs/FS-XXX/

8. Return Success
   └─ User sees increment created
```

**Files Touched**:
- `src/cli/commands/increment.ts` - CLI entry point
- `src/core/increment/increment-generator.ts` - File generation
- `src/core/increment/increment-number-manager.ts` - ID generation
- `src/core/increment/metadata-manager.ts` - Metadata creation
- `plugins/specweave/hooks/sync-living-docs.ts` - Living docs sync

**Diagram**: [diagrams/flows/increment-creation-flow.mmd](architecture/diagrams/flows/increment-creation-flow.mmd)

---

### Core Workflow: Completing a Task

**Action**: User marks task complete in `tasks.md`

**Execution Flow**:

```
1. Task marked [x] in tasks.md
   └─ Manual edit by user or via /sw:do

2. Hook: update-tasks-md triggered
   └─ plugins/specweave/hooks/update-tasks-md.ts
   └─ Detect: Which task was completed?
   └─ Extract: Which ACs does this task satisfy?

3. Update AC Checkboxes in Task
   └─ src/core/specs/ac-status-manager.ts
   └─ Mark ALL acceptance checkboxes in task as [x]

4. Propagate to spec.md
   └─ src/core/specs/completion-propagator.ts
   └─ Find corresponding ACs in spec.md
   └─ Mark ACs as [x] in spec.md

5. Check All Tasks Complete
   └─ src/core/increment/status-auto-transition.ts
   └─ Query: Are ALL tasks [x]?
   └─ If yes: Transition ACTIVE → READY_FOR_REVIEW

6. Hook: auto-transition triggered
   └─ plugins/specweave/hooks/auto-transition.ts
   └─ Update metadata.json status

7. Hook: sync-living-docs triggered
   └─ plugins/specweave/hooks/sync-living-docs.ts
   └─ Update living docs with completion status

8. Hook: sync-external (if configured)
   └─ plugins/specweave-github/hooks/sync-on-completion.ts
   └─ Update GitHub issue checkboxes
```

**Files Touched**:
- `tasks.md` - User edit
- `plugins/specweave/hooks/update-tasks-md.ts` - Hook trigger
- `src/core/specs/ac-status-manager.ts` - AC checkbox updates
- `src/core/specs/completion-propagator.ts` - Propagation logic
- `src/core/increment/status-auto-transition.ts` - Status transition
- `src/core/increment/metadata-manager.ts` - Metadata update
- `spec.md` - AC completion update

**Diagram**: [diagrams/flows/task-completion-flow.mmd](architecture/diagrams/flows/task-completion-flow.mmd)

---

### Core Workflow: Auto Mode Execution

**Command**: `/sw:auto`

**Execution Flow**:

```
1. User invokes /sw:auto
   └─ src/cli/commands/auto.ts

2. Create Auto Session
   └─ src/core/auto/session-manager.ts
   └─ Store: Session state, iteration count

3. Load Task Queue
   └─ src/core/auto/task-queue.ts
   └─ Parse: tasks.md
   └─ Enqueue: All pending tasks

4. LOOP: For each task
   │
   ├─ 4.1: Test Gate (Pre-check)
   │   └─ src/core/auto/test-gate.ts
   │   └─ Run: npm test
   │   └─ If fail: Abort task
   │
   ├─ 4.2: Human Gate (Sensitive ops)
   │   └─ src/core/auto/human-gate.ts
   │   └─ Check: Is this deploy/publish/force-push?
   │   └─ If yes: Block and ask user
   │
   ├─ 4.3: Execute Task
   │   └─ Claude Code: Implement task
   │   └─ Update: tasks.md [x]
   │
   ├─ 4.4: Test Gate (Post-check)
   │   └─ src/core/auto/test-gate.ts
   │   └─ Run: npm test
   │   └─ If fail: Fix and retry (max 3x)
   │
   ├─ 4.5: Report Progress
   │   └─ src/core/auto/progress-reporter.ts
   │   └─ Report: Completed X/Y tasks
   │
   ├─ 4.6: Sync Checkpoint
   │   └─ src/core/auto/session-manager.ts
   │   └─ Update: Session state
   │
   └─ 4.7: Continue or Abort?
       └─ Check: Max iterations reached?
       └─ Check: All tasks complete?
       └─ If done: EXIT LOOP

5. Stop Hook Chain (hooks.json)
   └─ stop-reflect.sh → stop-auto.sh → stop-sync.sh
   └─ Each hook runs independently

6. Hook: stop-reflect (always runs)
   └─ plugins/specweave/hooks/stop-reflect.sh
   └─ Extract: Learnings from session
   └─ Save: To memory files

7. Hook: stop-auto (if still running)
   └─ plugins/specweave/hooks/stop-auto.sh
   └─ Decide: Continue or stop?
   └─ Check: Iteration count < 100?
   └─ If yes: CONTINUE
   └─ If no: STOP

8. Complete Session
   └─ src/core/auto/session-manager.ts
   └─ Mark: Session complete
   └─ Notify: User
```

**Files Touched**:
- `src/cli/commands/auto.ts` - CLI entry point
- `src/core/auto/session-manager.ts` - Session lifecycle
- `src/core/auto/task-queue.ts` - Task management
- `src/core/auto/test-gate.ts` - Test validation
- `src/core/auto/human-gate.ts` - Sensitive operation blocking
- `plugins/specweave/hooks/stop-reflect.sh` - Reflection hook
- `plugins/specweave/hooks/stop-auto.sh` - Auto mode continuation hook
- `plugins/specweave/hooks/stop-sync.sh` - Sync hook

**Diagram**: [diagrams/flows/auto-mode-flow.mmd](architecture/diagrams/flows/auto-mode-flow.mmd)

---

## Code Walkthrough

### Example 1: MetadataManager

**Location**: `src/core/increment/metadata-manager.ts`

**Purpose**: CRUD operations for increment metadata

**Key Methods**:

```typescript
class MetadataManager {
  // Load metadata from disk
  static async load(incrementId: string): Promise<IncrementMetadata> {
    const metadataPath = this.getMetadataPath(incrementId);

    // Check if file exists
    if (!await fs.pathExists(metadataPath)) {
      // Lazy initialization: create default metadata
      return this.createDefault(incrementId);
    }

    // Read and parse JSON
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    // Validate schema
    const result = IncrementMetadataSchema.safeParse(metadata);
    if (!result.success) {
      throw new ValidationError('Invalid metadata', result.error);
    }

    return result.data;
  }

  // Save metadata to disk
  static async save(metadata: IncrementMetadata): Promise<void> {
    const metadataPath = this.getMetadataPath(metadata.id);

    // Validate before saving
    const result = IncrementMetadataSchema.safeParse(metadata);
    if (!result.success) {
      throw new ValidationError('Invalid metadata', result.error);
    }

    // Update lastActivity timestamp
    metadata.lastActivity = new Date().toISOString();

    // Write atomically (temp file + rename)
    const tempPath = `${metadataPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(metadata, null, 2));
    await fs.rename(tempPath, metadataPath);
  }

  // Update status with validation
  static async updateStatus(
    id: string,
    newStatus: IncrementStatus
  ): Promise<void> {
    const metadata = await this.load(id);

    // Check if transition is valid
    if (!this.isValidTransition(metadata.status, newStatus)) {
      throw new InvalidTransitionError(
        `Cannot transition from ${metadata.status} to ${newStatus}`
      );
    }

    // Update status
    metadata.status = newStatus;

    // Add timestamps for specific statuses
    if (newStatus === IncrementStatus.READY_FOR_REVIEW) {
      metadata.readyForReviewAt = new Date().toISOString();
    } else if (newStatus === IncrementStatus.COMPLETED) {
      metadata.approvedAt = new Date().toISOString();
    }

    // Save
    await this.save(metadata);
  }
}
```

**Key Patterns**:
- Lazy initialization (create default if not exists)
- Atomic writes (temp file + rename)
- Schema validation (Zod)
- State machine validation (VALID_TRANSITIONS)
- Automatic timestamp updates

---

### Example 2: HookExecutor

**Location**: `src/core/hooks/hook-executor.ts`

**Purpose**: Execute hooks in isolated child processes

**Key Methods**:

```typescript
class HookExecutor {
  // Execute a hook with timeout protection
  static async execute(
    hookPath: string,
    args: string[] = [],
    timeout = 20000
  ): Promise<HookResult> {
    // Health check before execution
    const health = await HookHealthChecker.check(hookPath);
    if (!health.healthy) {
      // Try auto-fix
      const fixed = await HookAutoFixer.fix(hookPath, health.issues);
      if (!fixed) {
        return { success: false, error: 'Hook health check failed' };
      }
    }

    // Determine hook type
    const hookType = this.getHookType(hookPath);

    // Build command
    const command = this.buildCommand(hookType, hookPath, args);

    // Spawn child process
    const child = spawn(command.binary, command.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Collect output
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
    }, timeout);

    // Wait for completion
    return new Promise((resolve) => {
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);

        // Log result
        HookLogger.log({
          hookPath,
          exitCode: code,
          stdout,
          stderr,
          duration: Date.now() - startTime
        });

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        });
      });
    });
  }
}
```

**Key Patterns**:
- Health checking before execution
- Auto-fixing common errors
- Child process isolation
- Timeout protection (SIGTERM → SIGKILL)
- Structured logging
- Error recovery

---

### Example 3: CompletionPropagator

**Location**: `src/core/specs/completion-propagator.ts`

**Purpose**: Propagate AC completion when task completes

**Key Methods**:

```typescript
class CompletionPropagator {
  // Propagate completion from task to spec
  static async propagateCompletion(
    taskId: string,
    incrementId: string
  ): Promise<void> {
    // 1. Load tasks.md
    const tasksPath = PathUtils.getTasksPath(incrementId);
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // 2. Parse and find the completed task
    const tasks = TaskParser.parse(tasksContent);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 3. Extract AC IDs that this task satisfies
    const acIds = this.extractACIds(task);
    if (acIds.length === 0) {
      return; // No ACs to propagate
    }

    // 4. Update AC checkboxes in tasks.md
    let updatedTasksContent = tasksContent;
    for (const acId of acIds) {
      updatedTasksContent = this.updateACCheckbox(
        updatedTasksContent,
        taskId,
        acId,
        true // Mark as complete
      );
    }
    await fs.writeFile(tasksPath, updatedTasksContent);

    // 5. Load spec.md
    const specPath = PathUtils.getSpecPath(incrementId);
    const specContent = await fs.readFile(specPath, 'utf-8');

    // 6. Update ACs in spec.md
    let updatedSpecContent = specContent;
    for (const acId of acIds) {
      updatedSpecContent = this.updateSpecAC(
        updatedSpecContent,
        acId,
        true // Mark as complete
      );
    }
    await fs.writeFile(specPath, updatedSpecContent);

    // 7. Check if ALL tasks are complete
    const allTasksComplete = tasks.every(t => t.status === 'completed');
    if (allTasksComplete) {
      // Trigger auto-transition
      await StatusAutoTransition.checkAndTransition(incrementId);
    }
  }

  // Extract AC IDs from task's "Satisfies ACs" field
  private static extractACIds(task: Task): string[] {
    const match = task.satisfiesACs?.match(/AC-[\w-]+/g);
    return match || [];
  }

  // Update AC checkbox in content
  private static updateACCheckbox(
    content: string,
    taskId: string,
    acId: string,
    complete: boolean
  ): string {
    const checkbox = complete ? '[x]' : '[ ]';
    const pattern = new RegExp(
      `(### T-${taskId}:.*?#### Acceptance.*?)- \\[ \\] (\\*\\*${acId}\\*\\*:)`,
      'gs'
    );
    return content.replace(pattern, `$1- ${checkbox} $2`);
  }
}
```

**Key Patterns**:
- Multi-file coordination (tasks.md + spec.md)
- Regex-based updates (preserve structure)
- Atomic operations (all or nothing)
- Cascade triggering (auto-transition)
- Idempotency (safe to run multiple times)

---

## Common Patterns

### Pattern 1: Lazy Initialization

**Use Case**: Create default data if not found

```typescript
async function load(id: string): Promise<Data> {
  const path = getPath(id);

  if (!await fs.pathExists(path)) {
    // Lazy initialization: create default
    const defaultData = createDefault(id);
    await save(defaultData);
    return defaultData;
  }

  return readAndParse(path);
}
```

**Examples**:
- `MetadataManager.load()` - Create default metadata
- `ConfigManager.load()` - Create default config

---

### Pattern 2: Atomic File Writes

**Use Case**: Prevent corruption on write failure

```typescript
async function save(data: Data): Promise<void> {
  const targetPath = getPath(data.id);
  const tempPath = `${targetPath}.tmp`;

  // Write to temp file
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

  // Atomic rename
  await fs.rename(tempPath, targetPath);
}
```

**Examples**:
- `MetadataManager.save()` - Atomic metadata writes
- `ConfigManager.save()` - Atomic config writes

---

### Pattern 3: Schema Validation (Zod)

**Use Case**: Validate data before processing

```typescript
import { z } from 'zod';

const DataSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'completed']),
  created: z.string().datetime()
});

async function validate(data: unknown): Promise<Data> {
  const result = DataSchema.safeParse(data);

  if (!result.success) {
    throw new ValidationError('Invalid data', result.error);
  }

  return result.data;
}
```

**Examples**:
- `IncrementMetadataSchema` - Metadata validation
- `SpecWeaveConfigSchema` - Config validation

---

### Pattern 4: State Machine with Guards

**Use Case**: Enforce valid state transitions

```typescript
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  planning: ['active', 'abandoned'],
  active: ['ready_for_review', 'paused', 'abandoned'],
  ready_for_review: ['completed', 'active'],
  completed: []
};

function transition(from: Status, to: Status): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}
```

**Examples**:
- `IncrementStatus` transitions
- `SyncStatus` transitions

---

### Pattern 5: Circuit Breaker

**Use Case**: Prevent cascading failures

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= 3) {
      this.state = 'open';
      setTimeout(() => this.state = 'half-open', 60000); // Try again in 1 min
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
}
```

**Examples**:
- `SyncOrchestrator` - Prevent sync failures from cascading
- `HookExecutor` - Prevent hook failures from blocking

---

## Debugging Guide

### 1. Enable Debug Logging

```bash
# Set log level to debug
export LOG_LEVEL=debug

# Run command
specweave status
```

### 2. Check Logs

```bash
# Hook execution logs
cat .specweave/logs/hooks-YYYY-MM-DD.log

# Sync audit logs
cat .specweave/logs/sync-audit-YYYY-MM-DD.log

# General logs
cat .specweave/logs/specweave.log
```

### 3. Common Issues

**Issue**: Increment not found

```bash
# Check increment exists
ls .specweave/increments/

# Verify metadata.json
cat .specweave/increments/0001-feature/metadata.json
```

**Issue**: Hook not executing

```bash
# Check hook health
specweave check-hooks

# Manually run hook
bash plugins/specweave/hooks/auto-transition.ts
```

**Issue**: Sync failing

```bash
# Check sync logs
cat .specweave/logs/sync-audit-YYYY-MM-DD.log

# Check permissions
cat .specweave/config.json | grep -A 10 permissions

# Verify tokens
grep GITHUB_TOKEN .env
```

### 4. Debugging Tools

```bash
# VS Code: Launch Configuration (.vscode/launch.json)
{
  "type": "node",
  "request": "launch",
  "name": "Debug SpecWeave",
  "program": "${workspaceFolder}/bin/specweave.js",
  "args": ["status"],
  "console": "integratedTerminal"
}

# Node Inspector
node --inspect-brk bin/specweave.js status

# Then open chrome://inspect in Chrome
```

---

## Contributing

### 1. Find an Issue

- Browse: [GitHub Issues](https://github.com/specweave/specweave/issues)
- Look for: `good-first-issue` label

### 2. Fork and Clone

```bash
# Fork on GitHub, then clone
git clone https://github.com/YOUR-USERNAME/specweave.git
cd specweave

# Add upstream remote
git remote add upstream https://github.com/specweave/specweave.git
```

### 3. Create a Branch

```bash
# Create feature branch
git checkout -b feature/my-improvement

# Keep branch up to date
git fetch upstream
git rebase upstream/develop
```

### 4. Make Changes

```bash
# Make changes
# ...

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

### 5. Submit PR

```bash
# Commit (clean messages, no AI references)
git commit -m "Add feature X"

# Push
git push origin feature/my-improvement

# Open PR on GitHub
# Title: Clear, concise description
# Description: What, why, how
```

---

## Next Steps

1. **Complete the learning path** - Follow Phase 1-4
2. **Read architecture docs** - Dive into diagrams and ADRs
3. **Explore the codebase** - Use your IDE to navigate
4. **Run the test suite** - Understand test patterns
5. **Join the community** - Ask questions, share learnings

**Happy learning! 🚀**

---

**Last Updated**: 2026-01-08
**Document Owner**: SpecWeave Core Team
**Feedback**: Open an issue or PR with improvements
