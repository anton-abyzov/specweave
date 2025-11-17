/**
 * Integration Tests for update-status-line.sh Hook
 *
 * Tests the bash script that updates status line cache based on task completion.
 * Verifies support for multiple task completion formats:
 * - Legacy: [x] at line start
 * - Legacy: **Status**: [x] inline
 * - Current: **Completed**: <date>
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { StatusLineCache } from '../../../src/core/status-line/types.js';

describe('update-status-line.sh hook', () => {
  let tempDir: string;
  let hookScript: string;

  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));

    // Create required directories
    fs.mkdirSync(path.join(tempDir, '.specweave/state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave/increments'), { recursive: true });

    // Path to hook script (from project root)
    hookScript = path.join(
      process.cwd(),
      'plugins/specweave/hooks/lib/update-status-line.sh'
    );
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper: Create increment with metadata and tasks
   */
  function createIncrement(
    id: string,
    status: string,
    tasksContent: string
  ): void {
    const incrementDir = path.join(tempDir, '.specweave/increments', id);
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create metadata.json
    const metadata = {
      id,
      status,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create tasks.md
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);
  }

  /**
   * Helper: Run update-status-line.sh hook
   */
  function runHook(): void {
    execSync(`bash "${hookScript}"`, {
      cwd: tempDir,
      env: { ...process.env, PROJECT_ROOT: tempDir }
    });
  }

  /**
   * Helper: Read status line cache
   */
  function readCache(): StatusLineCache {
    const cacheFile = path.join(tempDir, '.specweave/state/status-line.json');
    const content = fs.readFileSync(cacheFile, 'utf8');
    return JSON.parse(content);
  }

  describe('Task completion format detection', () => {
    it('should detect **Completed**: <date> format (current)', () => {
      const tasksContent = `# Tasks

## Module 1

### T-001: Task one
**Effort**: 2h | **AC**: AC-US1-01
**Completed**: 2025-11-16

**Acceptance Criteria**:
- [x] Criterion 1
- [x] Criterion 2

---

### T-002: Task two
**Effort**: 3h | **AC**: AC-US1-02

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

### T-003: Task three
**Effort**: 1h | **AC**: AC-US1-03
**Completed**: 2025-11-15

**Acceptance Criteria**:
- [x] Criterion 1
`;

      createIncrement('0001-test-increment', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current).toBeDefined();
      expect(cache.current?.id).toBe('0001-test-increment');
      expect(cache.current?.name).toBe('test-increment');
      expect(cache.current?.total).toBe(3); // 3 task headers
      expect(cache.current?.completed).toBe(2); // 2 **Completed**: markers
      expect(cache.current?.percentage).toBe(66); // 2/3 = 66%
      expect(cache.openCount).toBe(1);
    });

    it('should detect [x] at line start format (legacy)', () => {
      const tasksContent = `# Tasks

### T-001: Task one
[x] Implementation complete

---

### T-002: Task two
[ ] Implementation pending

---

### T-003: Task three
[x] Implementation complete
`;

      createIncrement('0002-legacy-format', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(3);
      expect(cache.current?.completed).toBe(2); // 2 [x] at line start
      expect(cache.current?.percentage).toBe(66);
    });

    it('should detect **Status**: [x] format (legacy)', () => {
      const tasksContent = `# Tasks

### T-001: Task one
**Status**: [x] Complete

---

### T-002: Task two
**Status**: [ ] Pending

---

### T-003: Task three
**Status**: [x] Complete
`;

      createIncrement('0003-status-format', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(3);
      expect(cache.current?.completed).toBe(2); // 2 **Status**: [x]
      expect(cache.current?.percentage).toBe(66);
    });

    it('should handle mixed completion formats', () => {
      const tasksContent = `# Tasks

### T-001: Legacy [x] format
[x] Implementation complete

---

### T-002: Legacy Status format
**Status**: [x] Complete

---

### T-003: Current Completed format
**Completed**: 2025-11-16

---

### T-004: Incomplete task
[ ] Not done yet
`;

      createIncrement('0004-mixed-formats', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(4);
      expect(cache.current?.completed).toBe(3); // 1 + 1 + 1 from each format
      expect(cache.current?.percentage).toBe(75); // 3/4 = 75%
    });
  });

  describe('Multiple increments', () => {
    it('should select oldest active increment as current', () => {
      // Create 3 increments with different timestamps
      const now = new Date();
      const older = new Date(now.getTime() - 86400000); // 1 day ago
      const oldest = new Date(now.getTime() - 172800000); // 2 days ago

      createIncrement('0001-oldest', 'active', '### T-001: Task\n**Completed**: 2025-11-16');
      createIncrement('0002-older', 'active', '### T-001: Task');
      createIncrement('0003-newest', 'active', '### T-001: Task');

      // Update timestamps in metadata
      const metadata1 = JSON.parse(
        fs.readFileSync(
          path.join(tempDir, '.specweave/increments/0001-oldest/metadata.json'),
          'utf8'
        )
      );
      metadata1.created = oldest.toISOString();
      fs.writeFileSync(
        path.join(tempDir, '.specweave/increments/0001-oldest/metadata.json'),
        JSON.stringify(metadata1, null, 2)
      );

      const metadata2 = JSON.parse(
        fs.readFileSync(
          path.join(tempDir, '.specweave/increments/0002-older/metadata.json'),
          'utf8'
        )
      );
      metadata2.created = older.toISOString();
      fs.writeFileSync(
        path.join(tempDir, '.specweave/increments/0002-older/metadata.json'),
        JSON.stringify(metadata2, null, 2)
      );

      runHook();

      const cache = readCache();

      expect(cache.current?.id).toBe('0001-oldest');
      expect(cache.openCount).toBe(3); // All 3 are active
    });

    it('should count all open increments (active/in-progress/planning)', () => {
      createIncrement('0001-active', 'active', '### T-001: Task');
      createIncrement('0002-in-progress', 'in-progress', '### T-001: Task');
      createIncrement('0003-planning', 'planning', '### T-001: Task');
      createIncrement('0004-completed', 'completed', '### T-001: Task'); // Should not count
      createIncrement('0005-paused', 'paused', '### T-001: Task'); // Should not count

      runHook();

      const cache = readCache();

      expect(cache.openCount).toBe(3); // Only active, in-progress, planning
    });
  });

  describe('Edge cases', () => {
    it('should handle increment with no tasks', () => {
      createIncrement('0001-no-tasks', 'active', '# Tasks\n\nNo tasks yet.');

      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(0);
      expect(cache.current?.completed).toBe(0);
      expect(cache.current?.percentage).toBe(0);
    });

    it('should handle increment with all tasks complete', () => {
      const tasksContent = `# Tasks

### T-001: Task one
**Completed**: 2025-11-16

---

### T-002: Task two
**Completed**: 2025-11-15
`;

      createIncrement('0001-all-complete', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(2);
      expect(cache.current?.completed).toBe(2);
      expect(cache.current?.percentage).toBe(100);
    });

    it('should handle no open increments', () => {
      createIncrement('0001-completed', 'completed', '### T-001: Task');
      createIncrement('0002-paused', 'paused', '### T-001: Task');

      runHook();

      const cache = readCache();

      expect(cache.current).toBeNull();
      expect(cache.openCount).toBe(0);
    });

    it('should handle tasks with emoji in headers', () => {
      const tasksContent = `# Tasks

### T-001: 🧠 Smart task with emoji
**Completed**: 2025-11-16

---

### T-002: ⚡ Fast task
**Completed**: 2025-11-15

---

### T-003: 💎 Premium task
**Status**: [ ] Pending
`;

      createIncrement('0001-emoji-tasks', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(3);
      expect(cache.current?.completed).toBe(2); // Only T-001 and T-002
    });

    it('should handle tasks with complex headers (priority, effort, AC)', () => {
      const tasksContent = `# Tasks

### T-001: 🧠 Create VisionAnalyzer base class and interfaces (P1)
**Effort**: 2h | **AC**: AC-US1-01, AC-US1-06
**Completed**: 2025-11-16

**Description**: Create TypeScript interfaces and base class.

**Acceptance Criteria**:
- [x] VisionInsights interface defined
- [x] MarketCategory enum defined

---

### T-002: 🧠 Implement keyword extraction (P1)
**Effort**: 2h | **AC**: AC-US1-01
**Completed**: 2025-11-16

---

### T-003: ⚡ Simple task (P2)
**Effort**: 1h | **AC**: AC-US1-02

**Acceptance Criteria**:
- [ ] Not done yet
`;

      createIncrement('0001-complex-headers', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.total).toBe(3);
      expect(cache.current?.completed).toBe(2); // T-001 and T-002
      expect(cache.current?.percentage).toBe(66);
    });
  });

  describe('Cache structure', () => {
    it('should write cache with correct schema', () => {
      createIncrement('0001-test', 'active', '### T-001: Task\n**Completed**: 2025-11-16');
      runHook();

      const cache = readCache();

      expect(cache).toHaveProperty('current');
      expect(cache).toHaveProperty('openCount');
      expect(cache).toHaveProperty('lastUpdate');

      expect(cache.current).toHaveProperty('id');
      expect(cache.current).toHaveProperty('name');
      expect(cache.current).toHaveProperty('total');
      expect(cache.current).toHaveProperty('completed');
      expect(cache.current).toHaveProperty('percentage');

      expect(typeof cache.openCount).toBe('number');
      expect(typeof cache.lastUpdate).toBe('string');

      // Validate ISO timestamp format (bash script uses %S without milliseconds)
      const timestamp = new Date(cache.lastUpdate);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false); // Valid date
      expect(cache.lastUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
    });

    it('should update lastUpdate timestamp', async () => {
      createIncrement('0001-test', 'active', '### T-001: Task');
      runHook();

      const cache1 = readCache();
      const timestamp1 = new Date(cache1.lastUpdate);

      // Wait for at least 1 second (bash script uses %S which has 1-second granularity)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Run again
      runHook();

      const cache2 = readCache();
      const timestamp2 = new Date(cache2.lastUpdate);

      expect(timestamp2.getTime()).toBeGreaterThan(timestamp1.getTime());
    });
  });

  describe('Real-world scenarios', () => {
    it('should match actual increment 0037 format', () => {
      // This is the exact format from .specweave/increments/0037-project-specific-tasks/tasks.md
      const tasksContent = `# Tasks: Strategic Init & Project-Specific Architecture

**Increment**: 0037-project-specific-tasks
**Feature**: FS-037
**Total Tasks**: 85
**Estimated Effort**: 78-107 hours

---

## Module 1: Vision & Market Research Engine (8 tasks)

### T-001: 🧠 Create VisionAnalyzer base class and interfaces (P1)
**Effort**: 2h | **AC**: AC-US1-01, AC-US1-06
**Completed**: 2025-11-16

**Description**: Create TypeScript interfaces and base class for vision analysis.

**Acceptance Criteria**:
- [x] VisionInsights interface defined with all fields
- [x] MarketCategory enum with 13+ categories

---

### T-002: 🧠 Implement keyword extraction using pattern matching (P1)
**Effort**: 2h | **AC**: AC-US1-01
**Completed**: 2025-11-16

**Description**: Implement intelligent keyword extraction.

---

### T-003: 🧠 Implement market category detection (P1)
**Effort**: 2h | **AC**: AC-US1-02

**Description**: Detect market category from vision.

**Acceptance Criteria**:
- [ ] Pattern matching algorithm
- [ ] Return MarketCategory enum
`;

      createIncrement('0037-project-specific-tasks', 'active', tasksContent);
      runHook();

      const cache = readCache();

      expect(cache.current?.id).toBe('0037-project-specific-tasks');
      expect(cache.current?.name).toBe('project-specific-tasks');
      expect(cache.current?.total).toBe(3); // T-001, T-002, T-003
      expect(cache.current?.completed).toBe(2); // Only T-001 and T-002 have **Completed**:
      expect(cache.current?.percentage).toBe(66); // 2/3 ≈ 66%
    });
  });
});
