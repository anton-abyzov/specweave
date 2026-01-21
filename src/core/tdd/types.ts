/**
 * TDD Types
 *
 * Type definitions for TDD task template generation and enforcement.
 */

/**
 * Test mode options for increments
 */
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

/**
 * TDD phase markers
 */
export type TDDPhase = 'RED' | 'GREEN' | 'REFACTOR';

/**
 * A single task in the TDD workflow
 */
export interface TDDTask {
  /** Task ID (e.g., "T-001") */
  id: string;

  /** Task title */
  title: string;

  /** TDD phase */
  phase: TDDPhase;

  /** User story reference (e.g., "US-001") */
  userStory: string;

  /** Acceptance criteria IDs this task satisfies */
  satisfiesACs: string[];

  /** Task description */
  description: string;

  /** Test plan in Given-When-Then format */
  testPlan: {
    given: string;
    when: string;
    then: string;
  };

  /** Dependency on other task IDs (must be completed first) */
  dependencies: string[];

  /** Priority level */
  priority: 'P0' | 'P1' | 'P2';

  /** Recommended model for this task */
  model: 'opus' | 'sonnet' | 'haiku';
}

/**
 * A triplet of RED-GREEN-REFACTOR tasks for a single feature
 */
export interface TDDTaskTriplet {
  /** The RED phase task (write failing test) */
  redTask: TDDTask;

  /** The GREEN phase task (implement minimal code) */
  greenTask: TDDTask;

  /** The REFACTOR phase task (improve code quality) */
  refactorTask: TDDTask;
}

/**
 * User story information for task generation
 */
export interface UserStoryContext {
  /** User story ID (e.g., "US-001") */
  id: string;

  /** User story title */
  title: string;

  /** Acceptance criteria with IDs */
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
  }>;
}

/**
 * Options for TDD task generation
 */
export interface TDDTaskGenerationOptions {
  /** Test mode from increment metadata */
  testMode: TestMode;

  /** Starting task number */
  startingTaskNumber?: number;

  /** Feature description */
  featureDescription: string;

  /** User stories to generate tasks for */
  userStories: UserStoryContext[];

  /** Test file path pattern (e.g., "src/{module}/{file}.test.ts") */
  testFilePattern?: string;

  /** Implementation file path pattern */
  implFilePattern?: string;
}

/**
 * Result of TDD task generation
 */
export interface TDDTaskGenerationResult {
  /** Generated tasks in order */
  tasks: TDDTask[];

  /** Task triplets (only for TDD mode) */
  triplets: TDDTaskTriplet[];

  /** Test mode used */
  testMode: TestMode;

  /** Total task count */
  totalTasks: number;
}

/**
 * TDD violation detected during execution
 */
export interface TDDViolation {
  /** Type of violation */
  type: 'green-before-red' | 'refactor-before-green' | 'implementation-without-test';

  /** Task that caused the violation */
  taskId: string;

  /** Expected prerequisite task */
  expectedPrerequisite: string;

  /** Violation message */
  message: string;

  /** Timestamp */
  timestamp: string;
}
