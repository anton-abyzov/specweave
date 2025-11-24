/**
 * Unit tests for US Completion Detector
 *
 * Tests the core logic for detecting when user stories become fully complete.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { USCompletionDetector } from '../../../src/core/us-completion-detector.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('USCompletionDetector', () => {
  let tempDir: string;
  let detector: USCompletionDetector;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'us-completion-test-'));
    detector = new USCompletionDetector(tempDir, { logger: silentLogger });

    // Create .specweave directory structure
    await fs.mkdir(path.join(tempDir, '.specweave/increments/0001-test-increment'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.specweave/state'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('parseSpecACs', () => {
    it('should parse ACs with bold formatting', async () => {
      const specContent = `---
title: Test
---

## Acceptance Criteria

### US-001: User Story One

- [x] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion

### US-002: User Story Two

- [x] **AC-US2-01**: Third criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(2);
      expect(completions[0].usId).toBe('US-001');
      expect(completions[0].totalACs).toBe(2);
      expect(completions[0].completedACs).toBe(1);
      expect(completions[0].percentage).toBe(50);
      expect(completions[0].isComplete).toBe(false);

      expect(completions[1].usId).toBe('US-002');
      expect(completions[1].totalACs).toBe(1);
      expect(completions[1].completedACs).toBe(1);
      expect(completions[1].percentage).toBe(100);
      expect(completions[1].isComplete).toBe(true);
    });

    it('should parse ACs without bold formatting', async () => {
      const specContent = `## Acceptance Criteria

- [x] AC-US1-01: First criterion
- [ ] AC-US1-02: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(1);
      expect(completions[0].usId).toBe('US-001');
      expect(completions[0].totalACs).toBe(2);
      expect(completions[0].completedACs).toBe(1);
    });

    it('should handle ACs with various numbering patterns', async () => {
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: One digit user story
- [x] **AC-US11-01**: Two digit user story
- [x] **AC-US111-01**: Three digit user story
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(3);
      expect(completions[0].usId).toBe('US-001');
      expect(completions[1].usId).toBe('US-011');
      expect(completions[2].usId).toBe('US-111');
    });

    it('should handle empty spec.md', async () => {
      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        '',
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(0);
    });

    it('should handle spec.md with no ACs', async () => {
      const specContent = `---
title: Test
---

## Overview

This is a test specification with no acceptance criteria.
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(0);
    });
  });

  describe('detectCompletions', () => {
    it('should detect fully complete user story', async () => {
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
- [x] **AC-US1-03**: Third criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(1);
      expect(completions[0].isComplete).toBe(true);
      expect(completions[0].percentage).toBe(100);
      expect(completions[0].totalACs).toBe(3);
      expect(completions[0].completedACs).toBe(3);
    });

    it('should detect partially complete user story', async () => {
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion
- [ ] **AC-US1-03**: Third criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(1);
      expect(completions[0].isComplete).toBe(false);
      expect(completions[0].percentage).toBeCloseTo(33.33, 1);
      expect(completions[0].totalACs).toBe(3);
      expect(completions[0].completedACs).toBe(1);
    });

    it('should detect incomplete user story (0% complete)', async () => {
      const specContent = `## Acceptance Criteria

- [ ] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(1);
      expect(completions[0].isComplete).toBe(false);
      expect(completions[0].percentage).toBe(0);
      expect(completions[0].completedACs).toBe(0);
    });

    it('should detect multiple user stories with different completion states', async () => {
      const specContent = `## Acceptance Criteria

### US-001: Fully Complete

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion

### US-002: Partially Complete

- [x] **AC-US2-01**: Third criterion
- [ ] **AC-US2-02**: Fourth criterion

### US-003: Not Started

- [ ] **AC-US3-01**: Fifth criterion
- [ ] **AC-US3-02**: Sixth criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(3);

      // US-001: 100% complete
      expect(completions[0].usId).toBe('US-001');
      expect(completions[0].isComplete).toBe(true);
      expect(completions[0].percentage).toBe(100);

      // US-002: 50% complete
      expect(completions[1].usId).toBe('US-002');
      expect(completions[1].isComplete).toBe(false);
      expect(completions[1].percentage).toBe(50);

      // US-003: 0% complete
      expect(completions[2].usId).toBe('US-003');
      expect(completions[2].isComplete).toBe(false);
      expect(completions[2].percentage).toBe(0);
    });
  });

  describe('getNewlyCompletedUSs', () => {
    it('should detect newly completed user story', async () => {
      // Create spec.md with one complete US
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const newlyCompleted = await detector.getNewlyCompletedUSs('0001-test-increment');

      expect(newlyCompleted).toHaveLength(1);
      expect(newlyCompleted[0].usId).toBe('US-001');
      expect(newlyCompleted[0].isComplete).toBe(true);
      expect(newlyCompleted[0].wasAlreadyComplete).toBe(false);
    });

    it('should not return already-complete user stories', async () => {
      // Create spec.md with one complete US
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      // First call: US-001 is newly complete
      const firstRun = await detector.getNewlyCompletedUSs('0001-test-increment');
      expect(firstRun).toHaveLength(1);

      // Save completion state
      const completions = await detector.detectCompletions('0001-test-increment');
      await detector.saveCompletionState('0001-test-increment', completions);

      // Second call: US-001 was already complete
      const secondRun = await detector.getNewlyCompletedUSs('0001-test-increment');
      expect(secondRun).toHaveLength(0);
    });

    it('should detect newly completed US when transitioning from incomplete to complete', async () => {
      // Initial state: US-001 is incomplete
      const initialContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        initialContent,
        'utf-8'
      );

      // Save initial state (US-001 incomplete)
      const initialCompletions = await detector.detectCompletions('0001-test-increment');
      await detector.saveCompletionState('0001-test-increment', initialCompletions);

      // Update spec.md: US-001 now complete
      const updatedContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        updatedContent,
        'utf-8'
      );

      // Detect newly completed USs
      const newlyCompleted = await detector.getNewlyCompletedUSs('0001-test-increment');

      expect(newlyCompleted).toHaveLength(1);
      expect(newlyCompleted[0].usId).toBe('US-001');
      expect(newlyCompleted[0].isComplete).toBe(true);
      expect(newlyCompleted[0].wasAlreadyComplete).toBe(false);
    });

    it('should handle multiple user stories completing at different times', async () => {
      // Initial state: Both USs incomplete
      const initialContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion

- [ ] **AC-US2-01**: Third criterion
- [ ] **AC-US2-02**: Fourth criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        initialContent,
        'utf-8'
      );

      const initialCompletions = await detector.detectCompletions('0001-test-increment');
      await detector.saveCompletionState('0001-test-increment', initialCompletions);

      // Update 1: US-001 completes
      const update1Content = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion

- [ ] **AC-US2-01**: Third criterion
- [ ] **AC-US2-02**: Fourth criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        update1Content,
        'utf-8'
      );

      const newlyCompleted1 = await detector.getNewlyCompletedUSs('0001-test-increment');
      expect(newlyCompleted1).toHaveLength(1);
      expect(newlyCompleted1[0].usId).toBe('US-001');

      // Save state after US-001 completion
      const completions1 = await detector.detectCompletions('0001-test-increment');
      await detector.saveCompletionState('0001-test-increment', completions1);

      // Update 2: US-002 completes
      const update2Content = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion

- [x] **AC-US2-01**: Third criterion
- [x] **AC-US2-02**: Fourth criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        update2Content,
        'utf-8'
      );

      const newlyCompleted2 = await detector.getNewlyCompletedUSs('0001-test-increment');
      expect(newlyCompleted2).toHaveLength(1);
      expect(newlyCompleted2[0].usId).toBe('US-002');
    });
  });

  describe('saveCompletionState', () => {
    it('should save completion state to disk', async () => {
      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');
      await detector.saveCompletionState('0001-test-increment', completions);

      const statePath = path.join(tempDir, '.specweave/state/us-completion-0001-test-increment.json');
      const stateExists = await fs.access(statePath).then(() => true).catch(() => false);

      expect(stateExists).toBe(true);

      const stateContent = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state['US-001']).toBeDefined();
      expect(state['US-001'].completed).toBe(true);
      expect(state['US-001'].percentage).toBe(100);
      expect(state['US-001'].totalACs).toBe(2);
      expect(state['US-001'].completedACs).toBe(2);
      expect(state['US-001'].completedAt).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing spec.md gracefully', async () => {
      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(0);
    });

    it('should handle corrupted state file gracefully', async () => {
      // Write corrupted state file
      const statePath = path.join(tempDir, '.specweave/state/us-completion-0001-test-increment.json');
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      await fs.writeFile(statePath, 'INVALID JSON{{{', 'utf-8');

      const specContent = `## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
`;

      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0001-test-increment/spec.md'),
        specContent,
        'utf-8'
      );

      const completions = await detector.detectCompletions('0001-test-increment');

      expect(completions).toHaveLength(1);
      expect(completions[0].wasAlreadyComplete).toBe(false);
    });
  });
});
