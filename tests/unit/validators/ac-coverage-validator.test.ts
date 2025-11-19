/**
 * Unit tests for AC Coverage Validator
 *
 * Tests the validateACCoverage function and related utilities
 * that validate Acceptance Criteria coverage by tasks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  validateACCoverage,
  isCoveragePassing,
  printCoverageReport,
  getRecommendedActions,
  exportCoverageReportJSON,
  type ACCoverageReport
} from '../../../src/validators/ac-coverage-validator.js';

describe('AC Coverage Validator', () => {
  let testDir: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `ac-coverage-test-${Date.now()}`);
    incrementPath = path.join(testDir, '0047-test-increment');
    await fs.ensureDir(incrementPath);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testDir);
  });

  describe('validateACCoverage()', () => {
    it('should validate 100% AC coverage with no orphans', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: User Authentication

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in
- [ ] **AC-US1-02**: User can log out

### US-002: User Profile

**Acceptance Criteria**:
- [ ] **AC-US2-01**: User can view profile
`;

      const tasksContent = `---
total_tasks: 3
completed: 0
by_user_story:
  US-001: 2
  US-002: 1
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - User Authentication

**Linked ACs**: AC-US1-01, AC-US1-02
**Tasks**: 2 total, 0 completed

### T-001: Implement login

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Implement logout

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending

## User Story: US-002 - User Profile

**Linked ACs**: AC-US2-01
**Tasks**: 1 total, 0 completed

### T-003: Implement profile view

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.totalACs).toBe(3);
      expect(report.coveredACs).toBe(3);
      expect(report.uncoveredACs).toHaveLength(0);
      expect(report.orphanTasks).toHaveLength(0);
      expect(report.coveragePercentage).toBe(100);
      expect(report.acToTasksMap.size).toBe(3);
      expect(report.acToTasksMap.get('AC-US1-01')).toEqual(['T-001']);
      expect(report.acToTasksMap.get('AC-US1-02')).toEqual(['T-002']);
      expect(report.acToTasksMap.get('AC-US2-01')).toEqual(['T-003']);
    });

    it('should detect uncovered ACs', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: User Authentication

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in
- [ ] **AC-US1-02**: User can log out
- [ ] **AC-US1-03**: User can reset password
`;

      const tasksContent = `---
total_tasks: 1
completed: 0
by_user_story:
  US-001: 1
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - User Authentication

### T-001: Implement login

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.totalACs).toBe(3);
      expect(report.coveredACs).toBe(1);
      expect(report.uncoveredACs).toHaveLength(2);
      expect(report.uncoveredACs).toContain('AC-US1-02');
      expect(report.uncoveredACs).toContain('AC-US1-03');
      expect(report.coveragePercentage).toBe(33); // 1/3 = 33%
    });

    it('should detect orphan tasks', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: User Authentication

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in
`;

      const tasksContent = `---
total_tasks: 2
completed: 0
by_user_story:
  US-001: 2
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - User Authentication

### T-001: Implement login

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Refactor code

**User Story**: US-001
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.orphanTasks).toHaveLength(1);
      expect(report.orphanTasks).toContain('T-002');
    });

    it('should handle multiple tasks satisfying same AC', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: User Authentication

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in
`;

      const tasksContent = `---
total_tasks: 2
completed: 0
by_user_story:
  US-001: 2
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - User Authentication

### T-001: Implement login UI

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Implement login backend

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.coveragePercentage).toBe(100);
      expect(report.acToTasksMap.get('AC-US1-01')).toEqual(['T-001', 'T-002']);
    });

    it('should calculate per-User Story coverage', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: Feature A

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Requirement 1
- [ ] **AC-US1-02**: Requirement 2

### US-002: Feature B

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Requirement 1
- [ ] **AC-US2-02**: Requirement 2
`;

      const tasksContent = `---
total_tasks: 2
completed: 0
by_user_story:
  US-001: 2
  US-002: 0
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - Feature A

### T-001: Implement A1

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Implement A2

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.coverageByUS.size).toBe(2);

      const us1Stats = report.coverageByUS.get('US-001');
      expect(us1Stats).toBeDefined();
      expect(us1Stats!.totalACs).toBe(2);
      expect(us1Stats!.coveredACs).toBe(2);
      expect(us1Stats!.coveragePercentage).toBe(100);

      const us2Stats = report.coverageByUS.get('US-002');
      expect(us2Stats).toBeDefined();
      expect(us2Stats!.totalACs).toBe(2);
      expect(us2Stats!.coveredACs).toBe(0);
      expect(us2Stats!.coveragePercentage).toBe(0);
      expect(us2Stats!.uncoveredACs).toEqual(['AC-US2-01', 'AC-US2-02']);
    });

    it('should throw error if spec.md not found', () => {
      // Act & Assert
      expect(() => validateACCoverage(incrementPath)).toThrow('spec.md not found');
    });

    it('should throw error if tasks.md not found', async () => {
      // Arrange
      await fs.writeFile(path.join(incrementPath, 'spec.md'), '### US-001\n- [ ] **AC-US1-01**', 'utf-8');

      // Act & Assert
      expect(() => validateACCoverage(incrementPath)).toThrow('tasks.md not found');
    });

    it('should handle empty spec.md', async () => {
      // Arrange
      await fs.writeFile(path.join(incrementPath, 'spec.md'), '# Empty Spec', 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), '---\ntotal_tasks: 0\n---\n# Tasks', 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.totalACs).toBe(0);
      expect(report.coveragePercentage).toBe(100); // 0/0 = 100% by convention
    });

    it('should handle tasks with multiple ACs', async () => {
      // Arrange
      const specContent = `---
title: Test Increment
---

### US-001: Multi-AC Feature

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First requirement
- [ ] **AC-US1-02**: Second requirement
- [ ] **AC-US1-03**: Third requirement
`;

      const tasksContent = `---
total_tasks: 1
completed: 0
by_user_story:
  US-001: 1
test_mode: test-after
coverage_target: 90
---

# Tasks

## User Story: US-001 - Multi-AC Feature

### T-001: Multi-AC task

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

      // Act
      const report = validateACCoverage(incrementPath);

      // Assert
      expect(report.coveragePercentage).toBe(100);
      expect(report.acToTasksMap.get('AC-US1-01')).toEqual(['T-001']);
      expect(report.acToTasksMap.get('AC-US1-02')).toEqual(['T-001']);
      expect(report.acToTasksMap.get('AC-US1-03')).toEqual(['T-001']);
      expect(report.taskToACsMap.get('T-001')).toEqual(['AC-US1-01', 'AC-US1-02', 'AC-US1-03']);
    });
  });

  describe('isCoveragePassing()', () => {
    it('should return true for 100% coverage with no orphans', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: [],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act & Assert
      expect(isCoveragePassing(report)).toBe(true);
    });

    it('should return false for incomplete coverage', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 4,
        uncoveredACs: ['AC-US1-05'],
        orphanTasks: [],
        coveragePercentage: 80,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act & Assert
      expect(isCoveragePassing(report)).toBe(false);
    });

    it('should return false for orphan tasks (default)', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: ['T-999'],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act & Assert
      expect(isCoveragePassing(report)).toBe(false);
    });

    it('should allow orphan tasks if allowOrphans=true', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: ['T-999'],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act & Assert
      expect(isCoveragePassing(report, { allowOrphans: true })).toBe(true);
    });

    it('should respect minCoveragePercentage option', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 10,
        coveredACs: 9,
        uncoveredACs: ['AC-US1-10'],
        orphanTasks: [],
        coveragePercentage: 90,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act & Assert
      expect(isCoveragePassing(report, { minCoveragePercentage: 100 })).toBe(false);
      expect(isCoveragePassing(report, { minCoveragePercentage: 90 })).toBe(true);
      expect(isCoveragePassing(report, { minCoveragePercentage: 80 })).toBe(true);
    });
  });

  describe('getRecommendedActions()', () => {
    it('should recommend creating tasks for uncovered ACs', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 3,
        uncoveredACs: ['AC-US1-04', 'AC-US1-05'],
        orphanTasks: [],
        coveragePercentage: 60,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act
      const actions = getRecommendedActions(report);

      // Assert
      expect(actions).toHaveLength(2);
      expect(actions[0]).toContain('Create tasks to satisfy 2 uncovered AC(s)');
      expect(actions[0]).toContain('AC-US1-04');
      expect(actions[1]).toContain('Increase coverage by 40%');
    });

    it('should recommend adding AC linkage for orphan tasks', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: ['T-010', 'T-011'],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act
      const actions = getRecommendedActions(report);

      // Assert
      expect(actions).toHaveLength(1);
      expect(actions[0]).toContain('Add **Satisfies ACs** field to 2 orphan task(s)');
      expect(actions[0]).toContain('T-010');
    });

    it('should identify User Stories with low coverage', () => {
      // Arrange
      const coverageByUS = new Map();
      coverageByUS.set('US-001', {
        usId: 'US-001',
        title: 'Feature A',
        totalACs: 10,
        coveredACs: 5,
        coveragePercentage: 50,
        uncoveredACs: ['AC-US1-01', 'AC-US1-02', 'AC-US1-03', 'AC-US1-04', 'AC-US1-05']
      });

      const report: ACCoverageReport = {
        totalACs: 10,
        coveredACs: 5,
        uncoveredACs: ['AC-US1-01', 'AC-US1-02', 'AC-US1-03', 'AC-US1-04', 'AC-US1-05'],
        orphanTasks: [],
        coveragePercentage: 50,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS,
        timestamp: new Date().toISOString()
      };

      // Act
      const actions = getRecommendedActions(report);

      // Assert
      expect(actions.some(action => action.includes('User Story US-001 has low coverage'))).toBe(true);
    });

    it('should return empty array for perfect report', () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: [],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act
      const actions = getRecommendedActions(report);

      // Assert
      expect(actions).toHaveLength(0);
    });
  });

  describe('printCoverageReport()', () => {
    it('should print detailed coverage report', () => {
      // Arrange
      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      };

      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 4,
        uncoveredACs: ['AC-US1-05'],
        orphanTasks: ['T-010'],
        coveragePercentage: 80,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map([
          ['US-001', {
            usId: 'US-001',
            title: 'Feature A',
            totalACs: 5,
            coveredACs: 4,
            coveragePercentage: 80,
            uncoveredACs: ['AC-US1-05']
          }]
        ]),
        timestamp: new Date().toISOString()
      };

      // Act
      printCoverageReport(report, { logger: mockLogger });

      // Assert
      expect(mockLogger.log).toHaveBeenCalled();
      const output = mockLogger.log.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('Total ACs: 5');
      expect(output).toContain('Covered ACs: 4');
      expect(output).toContain('Coverage: 80%');
      expect(output).toContain('Orphan Tasks: 1');
      expect(output).toContain('❌ VALIDATION FAILED');
    });

    it('should show passing status for perfect coverage', () => {
      // Arrange
      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      };

      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: [],
        coveragePercentage: 100,
        acToTasksMap: new Map(),
        taskToACsMap: new Map(),
        coverageByUS: new Map(),
        timestamp: new Date().toISOString()
      };

      // Act
      printCoverageReport(report, { logger: mockLogger });

      // Assert
      const output = mockLogger.log.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('✅ VALIDATION PASSED');
    });
  });

  describe('exportCoverageReportJSON()', () => {
    it('should export report to JSON file', async () => {
      // Arrange
      const report: ACCoverageReport = {
        totalACs: 5,
        coveredACs: 5,
        uncoveredACs: [],
        orphanTasks: [],
        coveragePercentage: 100,
        acToTasksMap: new Map([['AC-US1-01', ['T-001']]]),
        taskToACsMap: new Map([['T-001', ['AC-US1-01']]]),
        coverageByUS: new Map([
          ['US-001', {
            usId: 'US-001',
            title: 'Feature A',
            totalACs: 5,
            coveredACs: 5,
            coveragePercentage: 100,
            uncoveredACs: []
          }]
        ]),
        timestamp: new Date().toISOString()
      };

      const outputPath = path.join(testDir, 'coverage-report.json');

      // Act
      await exportCoverageReportJSON(report, outputPath);

      // Assert
      expect(await fs.pathExists(outputPath)).toBe(true);
      const exported = await fs.readJSON(outputPath);
      expect(exported.totalACs).toBe(5);
      expect(exported.coveragePercentage).toBe(100);
      expect(exported.acToTasksMap['AC-US1-01']).toEqual(['T-001']);
      expect(exported.taskToACsMap['T-001']).toEqual(['AC-US1-01']);
    });
  });
});
