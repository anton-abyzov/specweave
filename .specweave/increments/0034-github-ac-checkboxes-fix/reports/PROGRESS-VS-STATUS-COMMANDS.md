# Progress vs Status Commands - Complete Analysis

**Date**: 2025-11-15
**Increment**: 0034-github-ac-checkboxes-fix
**Issue**: `/specweave:progress` command doesn't exist as a separate CLI command

---

## Executive Summary

**The Confusion**: `/specweave:progress` and `status` are **the same thing** currently!

**What Users Expect**: Two **different** commands:
1. `/specweave:progress` - Detailed progress for ALL active increments (task-level details)
2. `status` - Quick overview of all increments (summary only)

**Current Reality**: Only `status` command exists, and it does both jobs poorly.

---

## Current Architecture (What EXISTS)

### 1. `status` Command (CLI + Slash)

**CLI**: `node bin/specweave.js status`
**File**: `src/cli/commands/status.ts` → `src/core/increment/status-commands.ts::showStatus()`

**What it shows**:
```
📊 Increment Status

📈 Overall Progress: 4/5 increments complete (80%)

▶️  Active (1):
  ● 0034-github-ac-checkboxes-fix [feature]
     Progress: 0%
     Age: 0 days

📈 WIP Limit:
  ✅ Active increments: 1/1

📊 Summary:
   Active: 1
   Paused: 0
   Completed: 4
   Abandoned: 0
```

**Characteristics**:
- ✅ Shows **all increments** (active, paused, completed, abandoned)
- ✅ Shows **overall progress** (completed/total)
- ✅ Shows **WIP limits**
- ❌ Does NOT show task-level details
- ❌ Does NOT show PM gate status
- ❌ Does NOT show next task to work on

### 2. `status-line` Command (CLI only, no slash)

**CLI**: `node bin/specweave.js status-line`
**File**: `src/cli/commands/status-line.ts` → `src/core/status-line/status-line-manager.ts`

**What it shows**:
```
[prevent-increment-number-gaps] ░░░░░░░░ 0/0 (2 open)
```

**Characteristics**:
- ✅ Shows **single line** status for one increment
- ✅ Used in **status bars** (Claude Code statusline, terminal)
- ✅ Shows **task progress** (e.g., 5/10)
- ❌ Does NOT show details for ALL active increments
- ❌ Not suitable for user interaction (too brief)

### 3. `/specweave:progress` Slash Command (BROKEN)

**File**: `plugins/specweave/commands/specweave-progress.md`

**What it tries to do**:
```bash
node dist/src/cli/index.js progress  # ← DOESN'T EXIST!
```

**Error**:
```
Error: Cannot find module '/Users/antonabyzov/Projects/github/specweave/dist/src/cli/index.js'
```

**What it SHOULD do** (according to documentation):
- Show **ALL active increments** (max 2)
- Show **task completion %** per increment
- Show **PM gates preview** (tasks, tests, docs)
- Show **next action** to take
- Show **time tracking**
- Warn about **WIP limit violations**

---

## What Users EXPECT (from `/specweave:progress`)

Based on the documentation in `specweave-progress.md`:

### Expected Output Format

```
📊 Current Progress

Active Increment: 0001-user-authentication
Status: in-progress (started 2 hours ago)

Task Progress: 3/12 completed (25%)
├─ [✅] T001: Setup auth module (P1) - 5 min ago
├─ [✅] T002: Create user model (P1) - 10 min ago
├─ [✅] T003: Implement JWT tokens (P1) - 15 min ago
├─ [⏳] T004: Add password hashing (P1) ← NEXT
├─ [ ] T005: Create login endpoint (P1)
├─ [ ] T006: Add logout endpoint (P2)
└─ 6 more tasks...

PM Gates Preview:
├─ Gate 1 (Tasks): 3/8 P1 tasks done (38%) ⏳
├─ Gate 2 (Tests): 2/5 passing (40%) ⏳
└─ Gate 3 (Docs): CLAUDE.md ✅, README.md ⏳

Last Activity: 5 minutes ago
Next Action: Run `/do 0001` to resume at T004

💡 Tip: `/do` auto-resumes from last incomplete task!
```

### Key Features (Missing from Current Commands)

| Feature | `status` | `status-line` | Expected in `progress` |
|---------|----------|---------------|------------------------|
| **ALL active increments** | ✅ | ❌ | ✅ |
| **Task-level details** | ❌ | ❌ | ✅ REQUIRED |
| **PM gates preview** | ❌ | ❌ | ✅ REQUIRED |
| **Next task highlighted** | ❌ | ❌ | ✅ REQUIRED |
| **Time tracking** | ✅ (days) | ❌ | ✅ (minutes) |
| **Next action guidance** | ✅ (basic) | ❌ | ✅ (specific) |
| **WIP limit warnings** | ✅ | ❌ | ✅ |
| **Visual task tree** | ❌ | ❌ | ✅ REQUIRED |

---

## The Gap: What's Missing

### Missing Command: `progress`

**We need to create a NEW command** that:
1. Reads ALL active increments (from `MetadataManager.getActive()`)
2. For EACH active increment:
   - Parse `tasks.md` to get task list
   - Calculate completion % (weighted by priority)
   - Find next incomplete task
   - Show time since last activity
3. Check PM gates status (tasks, tests, docs)
4. Show visual task tree (like documentation example)
5. Provide next action guidance

### Implementation Plan

#### Step 1: Create `progress.ts` CLI Command

**File**: `src/cli/commands/progress.ts`

```typescript
import { Command } from 'commander';
import { showProgress, ProgressOptions } from '../../core/increment/progress-commands.js';

export async function progressCommand(options: ProgressCommandOptions = {}): Promise<void> {
  const progressOptions: ProgressOptions = {
    incrementId: options.incrementId,
    verbose: options.verbose
  };

  await showProgress(progressOptions);
}
```

**Register in** `bin/specweave.js`:
```javascript
program
  .command('progress [increment-id]')
  .description('Show detailed progress for ALL active increments (or specific increment)')
  .option('-v, --verbose', 'Show extra details (test coverage, docs status)')
  .action(async (incrementId, options) => {
    const { progressCommand } = await import('../dist/src/cli/commands/progress.js');
    await progressCommand({ ...options, incrementId });
  });
```

#### Step 2: Create `progress-commands.ts` Core Logic

**File**: `src/core/increment/progress-commands.ts`

```typescript
import chalk from 'chalk';
import { MetadataManager } from './metadata-manager.js';
import { TaskParser } from '../task-parser.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ProgressOptions {
  incrementId?: string;  // If specified, show only this increment
  verbose?: boolean;
}

interface TaskInfo {
  id: string;
  title: string;
  priority: string;
  completed: boolean;
  completedAt?: string;
}

interface IncrementProgress {
  id: string;
  status: string;
  startedAt: string;
  lastActivity: string;
  tasks: {
    total: number;
    completed: number;
    percentage: number;
    list: TaskInfo[];
    nextTask?: TaskInfo;
  };
  gates: {
    tasks: { done: number; total: number; status: string };
    tests: { done: number; total: number; status: string };
    docs: { updated: boolean; status: string };
  };
}

export async function showProgress(options: ProgressOptions = {}): Promise<void> {
  const { incrementId, verbose } = options;

  console.log(chalk.blue.bold(`\n📊 Current Progress\n`));

  try {
    // Get active increments
    const active = incrementId
      ? [MetadataManager.read(incrementId)]
      : MetadataManager.getActive();

    if (active.length === 0) {
      showNoActiveIncrements();
      return;
    }

    // Check WIP limits
    if (active.length > 2) {
      console.log(chalk.red.bold(`⚠️ WARNING: ${active.length} increments active (exceeds limit of 2)\n`));
    }

    // Show progress for each active increment
    for (const metadata of active) {
      const progress = await getIncrementProgress(metadata.id);
      displayIncrementProgress(progress, verbose);
      console.log(''); // Spacing between increments
    }

    // Show overall recommendations
    showRecommendations(active.length);

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to show progress: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

async function getIncrementProgress(incrementId: string): Promise<IncrementProgress> {
  const metadata = MetadataManager.read(incrementId);
  const extended = MetadataManager.getExtended(incrementId);

  // Parse tasks.md
  const tasksPath = path.join(process.cwd(), '.specweave/increments', incrementId, 'tasks.md');
  const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
  const tasks = parseTasksFromMarkdown(tasksContent);

  // Calculate completion percentage (weighted by priority)
  const { completed, total, percentage } = calculateCompletion(tasks);

  // Find next incomplete task
  const nextTask = tasks.find(t => !t.completed);

  // Check PM gates
  const gates = await checkPMGates(incrementId, tasks);

  return {
    id: incrementId,
    status: metadata.status,
    startedAt: metadata.created,
    lastActivity: metadata.lastActivity,
    tasks: {
      total,
      completed,
      percentage,
      list: tasks,
      nextTask
    },
    gates
  };
}

function displayIncrementProgress(progress: IncrementProgress, verbose?: boolean): void {
  const { id, status, tasks, gates } = progress;

  // Header
  console.log(chalk.cyan.bold(`Active Increment: ${id}`));
  console.log(chalk.gray(`Status: ${status} (started ${formatTimeAgo(progress.startedAt)})`));
  console.log('');

  // Task progress
  console.log(chalk.cyan(`Task Progress: ${tasks.completed}/${tasks.total} completed (${tasks.percentage}%)`));

  // Show task tree (max 10 tasks, then "X more tasks...")
  const displayTasks = tasks.list.slice(0, 10);
  displayTasks.forEach(task => {
    const icon = task.completed ? chalk.green('[✅]') :
                 task === tasks.nextTask ? chalk.yellow('[⏳]') :
                 chalk.gray('[ ]');
    const timeStr = task.completed && task.completedAt ? chalk.gray(` - ${formatTimeAgo(task.completedAt)}`) : '';
    const nextMarker = task === tasks.nextTask ? chalk.yellow(' ← NEXT') : '';

    console.log(`├─ ${icon} ${task.id}: ${task.title} (${task.priority})${timeStr}${nextMarker}`);
  });

  if (tasks.total > 10) {
    console.log(chalk.gray(`└─ ${tasks.total - 10} more tasks...`));
  }
  console.log('');

  // PM Gates
  console.log(chalk.cyan('PM Gates Preview:'));
  console.log(`├─ Gate 1 (Tasks): ${gates.tasks.done}/${gates.tasks.total} P1 tasks done (${Math.round((gates.tasks.done/gates.tasks.total)*100)}%) ${getGateIcon(gates.tasks.status)}`);
  console.log(`├─ Gate 2 (Tests): ${gates.tests.done}/${gates.tests.total} passing (${Math.round((gates.tests.done/gates.tests.total)*100)}%) ${getGateIcon(gates.tests.status)}`);
  console.log(`└─ Gate 3 (Docs): CLAUDE.md ${gates.docs.updated ? '✅' : '⏳'}, README.md ${getGateIcon(gates.docs.status)}`);
  console.log('');

  // Next action
  console.log(chalk.gray(`Last Activity: ${formatTimeAgo(progress.lastActivity)}`));
  if (tasks.nextTask) {
    console.log(chalk.cyan(`Next Action: Run \`/specweave:do ${id}\` to resume at ${tasks.nextTask.id}`));
  } else {
    console.log(chalk.green(`✅ All tasks complete! Run \`/specweave:done ${id}\` to close increment`));
  }
}

function parseTasksFromMarkdown(content: string): TaskInfo[] {
  // Parse tasks from markdown (look for ## T-XXX: or ### T-XXX:)
  const taskRegex = /^#{2,3}\s+(T-\d+):\s+(.+)$/gm;
  const tasks: TaskInfo[] = [];

  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const [, id, title] = match;

    // Determine if completed (look for ✅ in next few lines)
    const afterMatch = content.substring(match.index);
    const completed = /✅|completed/i.test(afterMatch.substring(0, 200));

    // Extract priority (look for P1/P2/P3 in task section)
    const priority = /P[123]/.exec(afterMatch.substring(0, 200))?.[0] || 'P3';

    tasks.push({
      id,
      title,
      priority,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined // TODO: Parse from markdown
    });
  }

  return tasks;
}

function calculateCompletion(tasks: TaskInfo[]): { completed: number; total: number; percentage: number } {
  // Weight tasks by priority (P1=2, P2=1.5, P3=1)
  const weights = { P1: 2, P2: 1.5, P3: 1 };

  let totalWeight = 0;
  let completedWeight = 0;

  tasks.forEach(task => {
    const weight = weights[task.priority as keyof typeof weights] || 1;
    totalWeight += weight;
    if (task.completed) {
      completedWeight += weight;
    }
  });

  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  const completed = tasks.filter(t => t.completed).length;

  return { completed, total: tasks.length, percentage };
}

async function checkPMGates(incrementId: string, tasks: TaskInfo[]): Promise<IncrementProgress['gates']> {
  // Gate 1: P1 tasks
  const p1Tasks = tasks.filter(t => t.priority === 'P1');
  const p1Done = p1Tasks.filter(t => t.completed).length;
  const tasksStatus = p1Done === p1Tasks.length ? 'pass' : p1Done > 0 ? 'partial' : 'fail';

  // Gate 2: Tests (TODO: Run test suite and check coverage)
  // For now, mock data
  const testsStatus = 'partial';
  const testsDone = 2;
  const testsTotal = 5;

  // Gate 3: Docs (check if CLAUDE.md and README.md updated recently)
  const docsUpdated = true; // TODO: Check git diff
  const docsStatus = docsUpdated ? 'pass' : 'fail';

  return {
    tasks: { done: p1Done, total: p1Tasks.length, status: tasksStatus },
    tests: { done: testsDone, total: testsTotal, status: testsStatus },
    docs: { updated: docsUpdated, status: docsStatus }
  };
}

function getGateIcon(status: string): string {
  switch (status) {
    case 'pass': return chalk.green('✅');
    case 'partial': return chalk.yellow('⏳');
    case 'fail': return chalk.red('❌');
    default: return chalk.gray('⏳');
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

function showNoActiveIncrements(): void {
  console.log(chalk.yellow('No active increment found.\n'));
  console.log(chalk.gray('Recent Increments:'));

  // Get completed increments
  const completed = MetadataManager.getAll()
    .filter(m => m.status === 'completed')
    .slice(0, 3);

  completed.forEach(m => {
    const extended = MetadataManager.getExtended(m.id);
    console.log(chalk.gray(`├─ ${m.id} (completed) - ${extended.ageInDays} days ago`));
  });

  console.log('');
  console.log(chalk.cyan(`Next Action: Run \`/specweave:increment "feature description"\` to start new work\n`));
  console.log(chalk.gray(`💡 Tip: \`/specweave:increment\` is your starting point for all new features`));
}

function showRecommendations(activeCount: number): void {
  if (activeCount === 0) return;

  if (activeCount > 2) {
    console.log(chalk.yellow.bold(`⚠️ Recommendation: You have ${activeCount} active increments (exceeds limit of 2)`));
    console.log(chalk.gray(`   Focus on completing one increment before starting new work`));
    console.log(chalk.gray(`   Run \`/specweave:pause <id>\` to pause non-critical work\n`));
  } else if (activeCount === 2) {
    console.log(chalk.yellow(`💡 Tip: You're at the WIP limit (2 active increments)`));
    console.log(chalk.gray(`   Complete one before starting new work\n`));
  } else {
    console.log(chalk.green(`✅ 1 active increment (optimal focus)\n`));
  }
}
```

#### Step 3: Update Slash Command

**File**: `plugins/specweave/commands/specweave-progress.md`

**Change line** (find the node command):
```diff
-node dist/src/cli/index.js progress
+node bin/specweave.js progress
```

---

## Comparison Table: After Implementation

| Feature | `status` | `status-line` | **`progress` (NEW)** |
|---------|----------|---------------|----------------------|
| **Purpose** | Overview of ALL increments | One-line status for statusbar | **Detailed progress tracking** |
| **Shows all increments** | ✅ | ❌ | ✅ (active only) |
| **Task-level details** | ❌ | ❌ | ✅ Visual tree |
| **PM gates** | ❌ | ❌ | ✅ Preview |
| **Next task** | ❌ | ❌ | ✅ Highlighted |
| **Time tracking** | ✅ (days) | ❌ | ✅ (minutes) |
| **Visual format** | Summary | One-liner | **Rich tree view** |
| **Use case** | Quick status check | Status bar integration | **Interactive work sessions** |

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1**: CLI command | 30 min | Create `progress.ts`, register in bin |
| **Phase 2**: Core logic | 2 hours | Implement `progress-commands.ts` (parsing, PM gates) |
| **Phase 3**: Slash command | 10 min | Update `specweave-progress.md` entry point |
| **Phase 4**: Testing | 1 hour | Unit tests, E2E tests |
| **Total** | **~4 hours** | Full implementation |

---

## Success Criteria

### Must Have ✅
- [ ] `node bin/specweave.js progress` works
- [ ] Shows **all active increments** (max 2)
- [ ] Shows **task tree** with completion indicators
- [ ] Shows **PM gates preview**
- [ ] Shows **next task** highlighted
- [ ] Shows **time tracking** (minutes/hours)
- [ ] `/specweave:progress` slash command works
- [ ] WIP limit warnings for >2 active

### Nice to Have 📋
- [ ] Verbose mode (`--verbose`) shows test coverage
- [ ] Specific increment mode (`progress 0034`)
- [ ] JSON output (`--json`)
- [ ] Color-coded priorities (P1=red, P2=yellow, P3=gray)

---

## Related Issues

### Issue #1: Task Parsing
**Problem**: Need robust task parsing from `tasks.md`
**Solution**: Reuse or enhance existing `TaskParser` class

### Issue #2: PM Gates Checking
**Problem**: Need to actually run tests and check docs
**Solution**:
- Tests: Run `npm test` and parse coverage report
- Docs: Use `git diff` to check CLAUDE.md/README.md changes

### Issue #3: Time Tracking
**Problem**: Need to track when each task was completed
**Solution**: Parse markdown for completion timestamps (or store in metadata)

---

## Conclusion

**Current Situation**:
- `/specweave:progress` slash command is **broken**
- `status` command exists but lacks detail
- No way to see task-level progress interactively

**Solution**:
- **Create NEW `progress` CLI command** with rich task-level details
- **Keep `status`** for quick overview (different use case)
- **Keep `status-line`** for status bar integration (different use case)
- **Fix slash command** to call new `progress` command

**Benefits**:
- ✅ Clear separation of concerns (status vs progress vs status-line)
- ✅ Better UX (users get the detail they need)
- ✅ Matches documentation expectations
- ✅ Enables interactive work sessions

**Next Steps**:
1. Create `src/cli/commands/progress.ts`
2. Implement `src/core/increment/progress-commands.ts`
3. Register command in `bin/specweave.js`
4. Fix slash command entry point
5. Add tests
6. Update documentation

---

**Status**: Analysis Complete ✅
**Implementation**: Ready to start
**Priority**: P1 (core user feature)
**Estimated Effort**: 4 hours
