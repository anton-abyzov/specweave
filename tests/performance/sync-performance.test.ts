/**
 * Sync Performance Tests (T-012)
 *
 * Tests that living docs sync meets <500ms target for large increments.
 * Validates caching, incremental sync, and batch operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { syncUSTasksToLivingDocs } from '../../plugins/specweave/lib/hooks/sync-us-tasks.js';
import { clearCache, getCacheStats } from '../../plugins/specweave/lib/hooks/sync-cache.js';

describe('Sync Performance Tests', () => {
  let testDir: string;
  let incrementId: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `sync-perf-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    incrementId = '0047-us-task-linkage';

    // Clear cache before each test
    clearCache();
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('TC-033: Benchmark sync time for 50 user stories', () => {
    it('should sync 50 user stories with 200 tasks in <500ms (95th percentile)', async () => {
      // Create test increment structure
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      // Generate tasks.md with 50 user stories, 200 tasks (4 tasks per US)
      const tasksContent = generateLargeTasksFile(50, 4);
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Create living docs structure with 50 US files
      const featureId = 'FS-047';
      const projectId = 'specweave';
      const livingDocsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', projectId, featureId);
      await fs.ensureDir(livingDocsDir);

      for (let i = 1; i <= 50; i++) {
        const usId = `us-${String(i).padStart(3, '0')}`;
        const usFile = `${usId}-test-story.md`;
        const usContent = generateUSFile(`US-${String(i).padStart(3, '0')}`);
        await fs.writeFile(path.join(livingDocsDir, usFile), usContent);
      }

      // Run sync 100 times and measure performance
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();

        await syncUSTasksToLivingDocs(incrementId, testDir, featureId, {});

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Sort durations to calculate 95th percentile
      durations.sort((a, b) => a - b);
      const p95Index = Math.floor(durations.length * 0.95);
      const p95Duration = durations[p95Index];

      console.log(`\n📊 Performance Benchmark Results:`);
      console.log(`   • Total runs: 100`);
      console.log(`   • User stories: 50`);
      console.log(`   • Tasks: 200`);
      console.log(`   • Min: ${Math.round(durations[0])}ms`);
      console.log(`   • Max: ${Math.round(durations[durations.length - 1])}ms`);
      console.log(`   • Median: ${Math.round(durations[Math.floor(durations.length / 2)])}ms`);
      console.log(`   • 95th percentile: ${Math.round(p95Duration)}ms`);
      console.log(`   • Target: <500ms`);

      // Assert 95th percentile is under 500ms
      expect(p95Duration).toBeLessThan(500);
    });
  });

  describe('TC-034: Verify caching reduces parse time', () => {
    it('should parse tasks.md faster on second run (cache hit)', async () => {
      // Create test increment
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      const tasksContent = generateLargeTasksFile(10, 4);
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Create living docs structure
      const featureId = 'FS-047';
      const projectId = 'specweave';
      const livingDocsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', projectId, featureId);
      await fs.ensureDir(livingDocsDir);

      for (let i = 1; i <= 10; i++) {
        const usId = `us-${String(i).padStart(3, '0')}`;
        const usFile = `${usId}-test-story.md`;
        const usContent = generateUSFile(`US-${String(i).padStart(3, '0')}`);
        await fs.writeFile(path.join(livingDocsDir, usFile), usContent);
      }

      // First run (cache miss)
      const startTime1 = performance.now();
      await syncUSTasksToLivingDocs(incrementId, testDir, featureId, {});
      const duration1 = performance.now() - startTime1;

      // Check cache has entries
      const cacheStats = getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // Second run (cache hit)
      const startTime2 = performance.now();
      await syncUSTasksToLivingDocs(incrementId, testDir, featureId, {});
      const duration2 = performance.now() - startTime2;

      console.log(`\n📊 Cache Performance:`);
      console.log(`   • First run (cache miss): ${Math.round(duration1)}ms`);
      console.log(`   • Second run (cache hit): ${Math.round(duration2)}ms`);
      console.log(`   • Speedup: ${Math.round((duration1 / duration2) * 100) / 100}x`);
      console.log(`   • Cache entries: ${cacheStats.size}`);

      // Second run should be significantly faster (at least 2x)
      expect(duration2).toBeLessThan(duration1 / 2);
    });
  });

  describe('Incremental Sync Performance', () => {
    it('should skip unchanged US files (incremental sync)', async () => {
      // Create test increment
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      const tasksContent = generateLargeTasksFile(5, 4);
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Create living docs structure
      const featureId = 'FS-047';
      const projectId = 'specweave';
      const livingDocsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', projectId, featureId);
      await fs.ensureDir(livingDocsDir);

      for (let i = 1; i <= 5; i++) {
        const usId = `us-${String(i).padStart(3, '0')}`;
        const usFile = `${usId}-test-story.md`;
        const usContent = generateUSFile(`US-${String(i).padStart(3, '0')}`);
        await fs.writeFile(path.join(livingDocsDir, usFile), usContent);
      }

      // First sync (all files updated)
      const result1 = await syncUSTasksToLivingDocs(incrementId, testDir, featureId, {});
      expect(result1.updatedFiles.length).toBe(5);

      // Second sync without changes (should skip all files)
      const result2 = await syncUSTasksToLivingDocs(incrementId, testDir, featureId, {});
      expect(result2.updatedFiles.length).toBe(0);

      console.log(`\n📊 Incremental Sync:`);
      console.log(`   • First sync: ${result1.updatedFiles.length} files updated`);
      console.log(`   • Second sync: ${result2.updatedFiles.length} files updated (skipped)`);
      console.log(`   • Incremental sync working: ✅`);
    });
  });
});

/**
 * Generate large tasks.md file for performance testing
 *
 * @param numUserStories - Number of user stories
 * @param tasksPerUS - Tasks per user story
 * @returns tasks.md content
 */
function generateLargeTasksFile(numUserStories: number, tasksPerUS: number): string {
  const totalTasks = numUserStories * tasksPerUS;

  let content = `---
total_tasks: ${totalTasks}
completed: 0
test_mode: test-after
coverage_target: 90
---

# Tasks: Performance Test

`;

  let taskIndex = 1;

  for (let usIndex = 1; usIndex <= numUserStories; usIndex++) {
    const usId = `US-${String(usIndex).padStart(3, '0')}`;

    content += `## User Story: ${usId} - Test Story ${usIndex}\n\n`;
    content += `**Linked ACs**: AC-${usId}-01, AC-${usId}-02\n`;
    content += `**Tasks**: ${tasksPerUS} total, 0 completed\n\n`;

    for (let taskNum = 1; taskNum <= tasksPerUS; taskNum++) {
      const taskId = `T-${String(taskIndex).padStart(3, '0')}`;

      content += `### ${taskId}: Test Task ${taskIndex}\n\n`;
      content += `**User Story**: ${usId}\n`;
      content += `**Satisfies ACs**: AC-${usId}-01\n`;
      content += `**Status**: [ ] pending\n`;
      content += `**Priority**: P1 (Important)\n`;
      content += `**Estimated Effort**: 2 hours\n\n`;
      content += `**Description**: This is a test task for performance benchmarking.\n\n`;
      content += `**Implementation Steps**:\n`;
      content += `1. Step one\n`;
      content += `2. Step two\n\n`;
      content += `---\n\n`;

      taskIndex++;
    }
  }

  return content;
}

/**
 * Generate User Story file for performance testing
 *
 * @param usId - User Story ID
 * @returns US file content
 */
function generateUSFile(usId: string): string {
  return `---
id: ${usId}
title: "Test User Story"
status: active
---

# User Story: ${usId} - Test User Story

**As a** developer
**I want** to test sync performance
**So that** increments complete faster

## Acceptance Criteria

- [ ] **AC-${usId}-01**: First acceptance criterion
- [ ] **AC-${usId}-02**: Second acceptance criterion

## Tasks

_No tasks defined for this user story_

## Related Documentation

- [Feature Specification](../FEATURE.md)
`;
}
