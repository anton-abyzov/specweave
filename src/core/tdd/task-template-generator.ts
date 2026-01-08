/**
 * TDD Task Template Generator
 *
 * Generates tasks in RED-GREEN-REFACTOR structure for TDD mode,
 * or standard implementation-first tasks for other modes.
 *
 * @module tdd/task-template-generator
 * @see {@link https://spec-weave.com/docs/tdd} TDD Documentation
 */

import type {
  TestMode,
  TDDPhase,
  TDDTask,
  TDDTaskTriplet,
  UserStoryContext,
  TDDTaskGenerationOptions,
  TDDTaskGenerationResult,
} from './types.js';

// ============================================================================
// CONSTANTS: Phase Markers & Template Strings
// ============================================================================

/** Phase marker constants for consistent task naming */
export const PHASE_MARKERS = {
  RED: '[RED]',
  GREEN: '[GREEN]',
  REFACTOR: '[REFACTOR]',
} as const;

/** Template strings for TDD task descriptions */
export const TDD_TEMPLATES = {
  RED: {
    titlePrefix: 'Write failing test for',
    description: (feature: string) =>
      `Write a failing test that defines the expected behavior for ${feature}. The test MUST fail initially (red) to prove it's testing real behavior.`,
    testPlan: {
      given: (feature: string) => `Test file created for ${feature}`,
      when: 'Run npm test',
      then: 'Test FAILS with clear assertion message',
    },
  },
  GREEN: {
    titlePrefix: 'Implement minimal code for',
    description: (feature: string, redTaskId: string) =>
      `Write the MINIMAL code necessary to make ${redTaskId}'s test pass. Do not over-engineer. Hardcoded values acceptable at this stage.`,
    testPlan: {
      given: (redTaskId: string) => `${redTaskId} test exists and fails`,
      when: 'Implement minimal code, run npm test',
      then: 'Test PASSES (green)',
    },
  },
  REFACTOR: {
    titlePrefix: 'Improve',
    titleSuffix: 'code quality',
    description: (feature: string, greenTaskId: string) =>
      `Improve the code from ${greenTaskId} without changing behavior. Extract methods, remove duplication, improve naming.`,
    testPlan: {
      given: (redTaskId: string) => `${redTaskId} test passes`,
      when: 'Refactor code, run npm test',
      then: 'Test STILL passes (green)',
    },
  },
} as const;

/** Model emoji mappings for task display */
const MODEL_EMOJI: Record<string, string> = {
  opus: '💎',
  sonnet: '🧠',
  haiku: '⚡',
};

/**
 * Generate tasks based on test mode configuration
 *
 * @param options - Task generation options including testMode
 * @returns Generated tasks and triplets (for TDD mode)
 */
export function generateTDDTasks(options: TDDTaskGenerationOptions): TDDTaskGenerationResult {
  const { testMode, featureDescription, userStories, startingTaskNumber = 1 } = options;

  switch (testMode) {
    case 'TDD':
      return generateTDDModeTasks(featureDescription, userStories, startingTaskNumber);
    case 'test-after':
      return generateTestAfterModeTasks(featureDescription, userStories, startingTaskNumber);
    case 'manual':
      return generateManualModeTasks(featureDescription, userStories, startingTaskNumber);
    case 'none':
      return generateNoTestModeTasks(featureDescription, userStories, startingTaskNumber);
    default:
      // Default to test-after for unknown modes
      return generateTestAfterModeTasks(featureDescription, userStories, startingTaskNumber);
  }
}

/**
 * Generate TDD mode tasks with RED-GREEN-REFACTOR triplets
 */
function generateTDDModeTasks(
  featureDescription: string,
  userStories: UserStoryContext[],
  startingTaskNumber: number
): TDDTaskGenerationResult {
  const tasks: TDDTask[] = [];
  const triplets: TDDTaskTriplet[] = [];
  let taskNumber = startingTaskNumber;

  for (const userStory of userStories) {
    for (const ac of userStory.acceptanceCriteria) {
      const triplet = generateTaskTriplet({
        featureName: extractFeatureName(featureDescription, ac.description),
        userStory,
        acId: ac.id,
        startingTaskNumber: taskNumber,
      });

      triplets.push(triplet);
      tasks.push(triplet.redTask, triplet.greenTask, triplet.refactorTask);
      taskNumber += 3;
    }
  }

  return {
    tasks,
    triplets,
    testMode: 'TDD',
    totalTasks: tasks.length,
  };
}

/**
 * Generate test-after mode tasks (implementation first)
 */
function generateTestAfterModeTasks(
  featureDescription: string,
  userStories: UserStoryContext[],
  startingTaskNumber: number
): TDDTaskGenerationResult {
  const tasks: TDDTask[] = [];
  let taskNumber = startingTaskNumber;

  for (const userStory of userStories) {
    // First: implementation tasks
    for (const ac of userStory.acceptanceCriteria) {
      const implTask = createStandardTask({
        taskNumber,
        title: `Implement ${extractFeatureName(featureDescription, ac.description)}`,
        userStory,
        acId: ac.id,
        description: `Implement the functionality for: ${ac.description}`,
        isTest: false,
      });
      tasks.push(implTask);
      taskNumber++;
    }

    // Then: test tasks
    const testTask = createStandardTask({
      taskNumber,
      title: `Write tests for ${userStory.title}`,
      userStory,
      acId: userStory.acceptanceCriteria.map(ac => ac.id).join(', '),
      description: `Write unit and integration tests to verify ${userStory.title} implementation.`,
      isTest: true,
      dependencies: tasks.slice(-userStory.acceptanceCriteria.length).map(t => t.id),
    });
    tasks.push(testTask);
    taskNumber++;
  }

  return {
    tasks,
    triplets: [],
    testMode: 'test-after',
    totalTasks: tasks.length,
  };
}

/**
 * Generate manual mode tasks (flexible, no strict structure)
 */
function generateManualModeTasks(
  featureDescription: string,
  userStories: UserStoryContext[],
  startingTaskNumber: number
): TDDTaskGenerationResult {
  const tasks: TDDTask[] = [];
  let taskNumber = startingTaskNumber;

  for (const userStory of userStories) {
    for (const ac of userStory.acceptanceCriteria) {
      const task = createStandardTask({
        taskNumber,
        title: `Implement ${extractFeatureName(featureDescription, ac.description)}`,
        userStory,
        acId: ac.id,
        description: `Implement and optionally test: ${ac.description}`,
        isTest: false,
      });
      tasks.push(task);
      taskNumber++;
    }
  }

  return {
    tasks,
    triplets: [],
    testMode: 'manual',
    totalTasks: tasks.length,
  };
}

/**
 * Generate no-test mode tasks (implementation only)
 */
function generateNoTestModeTasks(
  featureDescription: string,
  userStories: UserStoryContext[],
  startingTaskNumber: number
): TDDTaskGenerationResult {
  const tasks: TDDTask[] = [];
  let taskNumber = startingTaskNumber;

  for (const userStory of userStories) {
    for (const ac of userStory.acceptanceCriteria) {
      const task = createStandardTask({
        taskNumber,
        title: `Implement ${extractFeatureName(featureDescription, ac.description)}`,
        userStory,
        acId: ac.id,
        description: `Implement: ${ac.description}`,
        isTest: false,
        skipTestPlan: true,
      });
      tasks.push(task);
      taskNumber++;
    }
  }

  return {
    tasks,
    triplets: [],
    testMode: 'none',
    totalTasks: tasks.length,
  };
}

/**
 * Options for generating a single task triplet
 */
interface TripletOptions {
  featureName: string;
  userStory: UserStoryContext;
  acId: string;
  startingTaskNumber: number;
}

/**
 * Generate a complete RED-GREEN-REFACTOR task triplet for TDD workflow.
 *
 * @param options - Options for triplet generation
 * @param options.featureName - Human-readable feature name
 * @param options.userStory - User story context with ACs
 * @param options.acId - Acceptance criteria ID being satisfied
 * @param options.startingTaskNumber - Starting task number (triplet uses N, N+1, N+2)
 * @returns Complete triplet with RED, GREEN, and REFACTOR tasks
 *
 * @example
 * ```typescript
 * const triplet = generateTaskTriplet({
 *   featureName: 'user login',
 *   userStory: { id: 'US-001', ... },
 *   acId: 'AC-US1-01',
 *   startingTaskNumber: 1,
 * });
 * // Returns { redTask: T-001, greenTask: T-002, refactorTask: T-003 }
 * ```
 */
export function generateTaskTriplet(options: TripletOptions): TDDTaskTriplet {
  const { featureName, userStory, acId, startingTaskNumber } = options;

  const redTaskId = formatTaskId(startingTaskNumber);
  const greenTaskId = formatTaskId(startingTaskNumber + 1);
  const refactorTaskId = formatTaskId(startingTaskNumber + 2);

  const redTask: TDDTask = {
    id: redTaskId,
    title: `${PHASE_MARKERS.RED} ${TDD_TEMPLATES.RED.titlePrefix} ${featureName}`,
    phase: 'RED',
    userStory: userStory.id,
    satisfiesACs: [acId],
    description: TDD_TEMPLATES.RED.description(featureName),
    testPlan: {
      given: TDD_TEMPLATES.RED.testPlan.given(featureName),
      when: TDD_TEMPLATES.RED.testPlan.when,
      then: TDD_TEMPLATES.RED.testPlan.then,
    },
    dependencies: [],
    priority: 'P0',
    model: 'opus',
  };

  const greenTask: TDDTask = {
    id: greenTaskId,
    title: `${PHASE_MARKERS.GREEN} ${TDD_TEMPLATES.GREEN.titlePrefix} ${featureName}`,
    phase: 'GREEN',
    userStory: userStory.id,
    satisfiesACs: [acId],
    description: TDD_TEMPLATES.GREEN.description(featureName, redTaskId),
    testPlan: {
      given: TDD_TEMPLATES.GREEN.testPlan.given(redTaskId),
      when: TDD_TEMPLATES.GREEN.testPlan.when,
      then: TDD_TEMPLATES.GREEN.testPlan.then,
    },
    dependencies: [redTaskId],
    priority: 'P0',
    model: 'opus',
  };

  const refactorTask: TDDTask = {
    id: refactorTaskId,
    title: `${PHASE_MARKERS.REFACTOR} ${TDD_TEMPLATES.REFACTOR.titlePrefix} ${featureName} ${TDD_TEMPLATES.REFACTOR.titleSuffix}`,
    phase: 'REFACTOR',
    userStory: userStory.id,
    satisfiesACs: [acId],
    description: TDD_TEMPLATES.REFACTOR.description(featureName, greenTaskId),
    testPlan: {
      given: TDD_TEMPLATES.REFACTOR.testPlan.given(redTaskId),
      when: TDD_TEMPLATES.REFACTOR.testPlan.when,
      then: TDD_TEMPLATES.REFACTOR.testPlan.then,
    },
    dependencies: [greenTaskId],
    priority: 'P1',
    model: 'opus',
  };

  return { redTask, greenTask, refactorTask };
}

/**
 * Format a TDD task as Markdown for inclusion in tasks.md.
 *
 * @param task - The TDD task to format
 * @returns Formatted markdown string
 *
 * @example
 * ```typescript
 * const markdown = formatTaskAsMarkdown(task);
 * // Returns:
 * // ### T-001: [RED] Write failing test for user login
 * // **User Story**: US-001
 * // **Satisfies ACs**: AC-US1-01
 * // ...
 * ```
 */
export function formatTaskAsMarkdown(task: TDDTask): string {
  const lines: string[] = [];

  lines.push(`### ${task.id}: ${task.title}`);
  lines.push(`**User Story**: ${task.userStory}`);
  lines.push(`**Satisfies ACs**: ${task.satisfiesACs.join(', ')}`);
  lines.push(`**Status**: [ ] pending`);

  if (task.phase) {
    lines.push(`**Phase**: ${task.phase}`);
  }

  lines.push(`**Priority**: ${task.priority}`);
  lines.push(`**Model**: ${getModelEmoji(task.model)} ${capitalizeFirst(task.model)}`);

  if (task.dependencies.length > 0) {
    lines.push(`**Dependency**: ${task.dependencies[0]} MUST be completed first`);
  }

  lines.push('');
  lines.push('**Description**:');
  lines.push(task.description);
  lines.push('');
  lines.push('**Test Plan**:');
  lines.push(`- **Given**: ${task.testPlan.given}`);
  lines.push(`- **When**: ${task.testPlan.when}`);
  lines.push(`- **Then**: ${task.testPlan.then}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Parse TDD phase from task title by detecting phase markers.
 *
 * @param title - Task title containing phase marker
 * @returns The detected TDD phase or null if not a TDD task
 *
 * @example
 * ```typescript
 * parsePhaseFromTask('[RED] Write failing test')  // 'RED'
 * parsePhaseFromTask('[GREEN] Implement code')    // 'GREEN'
 * parsePhaseFromTask('Regular task')              // null
 * ```
 */
export function parsePhaseFromTask(title: string): TDDPhase | null {
  if (title.includes(PHASE_MARKERS.RED)) return 'RED';
  if (title.includes(PHASE_MARKERS.GREEN)) return 'GREEN';
  if (title.includes(PHASE_MARKERS.REFACTOR)) return 'REFACTOR';
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface StandardTaskOptions {
  taskNumber: number;
  title: string;
  userStory: UserStoryContext;
  acId: string;
  description: string;
  isTest: boolean;
  dependencies?: string[];
  skipTestPlan?: boolean;
}

function createStandardTask(options: StandardTaskOptions): TDDTask {
  const {
    taskNumber,
    title,
    userStory,
    acId,
    description,
    isTest,
    dependencies = [],
    skipTestPlan = false,
  } = options;

  return {
    id: formatTaskId(taskNumber),
    title,
    phase: undefined as unknown as TDDPhase, // No phase for non-TDD tasks
    userStory: userStory.id,
    satisfiesACs: acId.split(', ').map(id => id.trim()),
    description,
    testPlan: skipTestPlan
      ? { given: 'N/A', when: 'N/A', then: 'N/A' }
      : {
          given: isTest ? 'Implementation complete' : 'Feature requirements defined',
          when: isTest ? 'Run npm test' : 'Implement feature, run verification',
          then: isTest ? 'All tests pass' : 'Feature works as expected',
        },
    dependencies,
    priority: userStory.acceptanceCriteria.find(ac => ac.id === acId.split(',')[0])?.priority || 'P1',
    model: 'opus',
  };
}

function formatTaskId(num: number): string {
  return `T-${String(num).padStart(3, '0')}`;
}

function extractFeatureName(featureDescription: string, acDescription: string): string {
  // Use AC description as feature name, cleaned up
  const words = acDescription.toLowerCase().split(' ').slice(0, 4);
  return words.join(' ');
}

function getModelEmoji(model: string): string {
  return MODEL_EMOJI[model] ?? MODEL_EMOJI.opus;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
