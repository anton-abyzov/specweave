/**
 * AC Test Validator
 *
 * Validates that all Acceptance Criteria linked to a task have passing tests
 * before allowing the task to be marked complete.
 *
 * **CRITICAL QUALITY GATE**: This is the enforcement point that prevents
 * tasks from being marked complete without validated ACs.
 *
 * Workflow:
 * 1. Task completion requested via TodoWrite
 * 2. Validator extracts task's satisfiesACs field
 * 3. Validator finds corresponding test files from Test Plan section
 * 4. Validator runs tests using configured test runner (vitest/jest)
 * 5. If ALL tests pass → Allow completion, auto-check ACs in spec.md
 * 6. If ANY test fails → Block completion, show detailed error
 */
import { Task } from '../generators/spec/task-parser.js';
/**
 * Test validation result
 */
export interface ACTestValidationResult {
    /** Whether all tests passed */
    passed: boolean;
    /** Task ID being validated */
    taskId: string;
    /** AC-IDs this task satisfies */
    acIds: string[];
    /** Test results by AC-ID */
    testResults: Map<string, ACTestResult>;
    /** Overall summary */
    summary: {
        totalACs: number;
        acsTested: number;
        acsUntested: number;
        testsPassed: number;
        testsFailed: number;
    };
    /** Detailed error messages (if validation failed) */
    errors: string[];
}
/**
 * Test result for a single AC
 */
export interface ACTestResult {
    acId: string;
    testFile?: string;
    testCases: string[];
    passed: boolean;
    duration: number;
    error?: string;
}
/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
    /** Test runner command (e.g., "npm test", "vitest run") */
    command: string;
    /** Test file pattern (glob pattern for test files) */
    pattern: string;
    /** Working directory for test execution */
    cwd: string;
    /** Environment variables for test execution */
    env?: Record<string, string>;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
}
/**
 * AC Test Validator - Core validation engine
 */
export declare class ACTestValidator {
    private config;
    constructor(config: TestRunnerConfig);
    /**
     * Validate all ACs for a task have passing tests
     *
     * @param task - Task to validate (must have satisfiesACs field)
     * @param projectRoot - Project root directory
     * @returns Validation result
     */
    validateTask(task: Task, projectRoot: string): Promise<ACTestValidationResult>;
    /**
     * Validate a single AC has passing tests
     */
    private validateAC;
    /**
     * Build test command with AC-ID filter
     */
    private buildTestCommand;
    /**
     * Extract test case names from test output
     */
    private extractTestCases;
    /**
     * Extract failure message from test output
     */
    private extractFailureMessage;
    /**
     * Extract test file path from task description (Test Plan section)
     */
    private extractTestFile;
    /**
     * Format validation result for display
     */
    formatResult(result: ACTestValidationResult): string;
}
/**
 * Create AC test validator from project config
 */
export declare function createACTestValidator(projectRoot: string): Promise<ACTestValidator>;
//# sourceMappingURL=ac-test-validator.d.ts.map