/**
 * Integration tests for auto-transition hooks
 *
 * Tests the full lifecycle of automatic status transitions:
 * - BACKLOG → PLANNING (when spec.md created)
 * - PLANNING → ACTIVE (when tasks.md created)
 * - PLANNING → ACTIVE (when task started)
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { AutoTransitionManager } from '../../src/core/increment/auto-transition-manager.js';
import { MetadataManager } from '../../src/core/increment/metadata-manager.js';
import { IncrementStatus, IncrementType, createDefaultMetadata } from '../../src/core/types/increment-metadata.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Auto-Transition Integration Tests', () => {
  let tempDir: string;
  let manager: AutoTransitionManager;
  let metadataManager: MetadataManager;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    const incrementsDir = path.join(tempDir, '.specweave/increments');
    fs.mkdirSync(incrementsDir, { recursive: true });

    manager = new AutoTransitionManager(tempDir);
    metadataManager = new MetadataManager(tempDir);
  });

  afterEach(() => {
    // Cleanup: remove temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Full lifecycle: BACKLOG → PLANNING → ACTIVE', () => {
    it('should auto-transition through full lifecycle', async () => {
      const incrementId = '0001-test-feature';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Step 1: Create increment in BACKLOG
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.BACKLOG;  // Override default PLANNING
      await metadataManager.write(incrementId, metadata);

      let current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.BACKLOG);

      // Step 2: Create spec.md → should transition to PLANNING
      const specPath = path.join(incrementPath, 'spec.md');
      fs.writeFileSync(specPath, '# Test Spec\n\nThis is a test specification.');

      const result1 = await manager.handleSpecCreated(incrementId);
      expect(result1.transitioned).toBe(true);
      expect(result1.from).toBe(IncrementStatus.BACKLOG);
      expect(result1.to).toBe(IncrementStatus.PLANNING);

      current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.PLANNING);

      // Step 3: Create tasks.md → should transition to ACTIVE
      const tasksPath = path.join(incrementPath, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Tasks\n\n- [ ] Task 1\n- [ ] Task 2');

      const result2 = await manager.handleTasksCreated(incrementId);
      expect(result2.transitioned).toBe(true);
      expect(result2.from).toBe(IncrementStatus.PLANNING);
      expect(result2.to).toBe(IncrementStatus.ACTIVE);

      current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.ACTIVE);
    });
  });

  describe('Auto-correct based on artifacts', () => {
    it('should detect and fix status mismatch (BACKLOG but has spec.md)', async () => {
      const incrementId = '0002-mismatched-status';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in BACKLOG
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.BACKLOG;
      await metadataManager.write(incrementId, metadata);

      // Create spec.md (but don't update status)
      const specPath = path.join(incrementPath, 'spec.md');
      fs.writeFileSync(specPath, '# Spec');

      // Auto-correct should detect mismatch
      const result = await manager.autoCorrect(incrementId);
      expect(result.transitioned).toBe(true);
      expect(result.from).toBe(IncrementStatus.BACKLOG);
      expect(result.to).toBe(IncrementStatus.PLANNING);

      const current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.PLANNING);
    });

    it('should detect and fix status mismatch (PLANNING but has tasks.md)', async () => {
      const incrementId = '0003-planning-with-tasks';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in PLANNING
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.PLANNING;
      await metadataManager.write(incrementId, metadata);

      // Create tasks.md
      const tasksPath = path.join(incrementPath, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Tasks\n\n- [ ] Task 1');

      // Auto-correct should detect mismatch
      const result = await manager.autoCorrect(incrementId);
      expect(result.transitioned).toBe(true);
      expect(result.from).toBe(IncrementStatus.PLANNING);
      expect(result.to).toBe(IncrementStatus.ACTIVE);

      const current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.ACTIVE);
    });

    it('should NOT transition if status already correct', async () => {
      const incrementId = '0004-correct-status';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in ACTIVE
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.ACTIVE;
      await metadataManager.write(incrementId, metadata);

      // Create tasks.md (matches ACTIVE)
      const tasksPath = path.join(incrementPath, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Tasks');

      // Auto-correct should do nothing
      const result = await manager.autoCorrect(incrementId);
      expect(result.transitioned).toBe(false);
      expect(result.reason).toContain('Status already correct');
    });
  });

  describe('Task started transitions', () => {
    it('should transition PLANNING → ACTIVE when task started', async () => {
      const incrementId = '0005-task-started';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in PLANNING
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.PLANNING;
      await metadataManager.write(incrementId, metadata);

      // Simulate task started
      const result = await manager.handleTaskStarted(incrementId);
      expect(result.transitioned).toBe(true);
      expect(result.from).toBe(IncrementStatus.PLANNING);
      expect(result.to).toBe(IncrementStatus.ACTIVE);

      const current = await metadataManager.read(incrementId);
      expect(current.status).toBe(IncrementStatus.ACTIVE);
    });

    it('should NOT transition if already ACTIVE', async () => {
      const incrementId = '0006-already-active';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in ACTIVE
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.ACTIVE;
      await metadataManager.write(incrementId, metadata);

      // Simulate task started
      const result = await manager.handleTaskStarted(incrementId);
      expect(result.transitioned).toBe(false);
      expect(result.reason).toContain('Already in active');
    });
  });

  describe('Phase detection accuracy', () => {
    it('should correctly detect BACKLOG (no artifacts)', async () => {
      const incrementId = '0007-empty';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      const phase = await manager.detectPhase(incrementId);
      expect(phase).toBe(IncrementStatus.BACKLOG);
    });

    it('should correctly detect PLANNING (spec.md only)', async () => {
      const incrementId = '0008-spec-only';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      const specPath = path.join(incrementPath, 'spec.md');
      fs.writeFileSync(specPath, '# Spec');

      const phase = await manager.detectPhase(incrementId);
      expect(phase).toBe(IncrementStatus.PLANNING);
    });

    it('should correctly detect PLANNING (plan.md only)', async () => {
      const incrementId = '0009-plan-only';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      const planPath = path.join(incrementPath, 'plan.md');
      fs.writeFileSync(planPath, '# Plan');

      const phase = await manager.detectPhase(incrementId);
      expect(phase).toBe(IncrementStatus.PLANNING);
    });

    it('should correctly detect ACTIVE (tasks.md exists)', async () => {
      const incrementId = '0010-tasks-exists';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      const tasksPath = path.join(incrementPath, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Tasks');

      const phase = await manager.detectPhase(incrementId);
      expect(phase).toBe(IncrementStatus.ACTIVE);
    });

    it('should prioritize tasks.md (detect ACTIVE even if spec/plan exist)', async () => {
      const incrementId = '0011-all-artifacts';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create all artifacts
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(incrementPath, 'plan.md'), '# Plan');
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), '# Tasks');

      const phase = await manager.detectPhase(incrementId);
      expect(phase).toBe(IncrementStatus.ACTIVE);  // tasks.md takes precedence
    });
  });

  describe('Error handling', () => {
    it('should handle missing increment gracefully', async () => {
      const result = await manager.handleSpecCreated('9999-nonexistent');
      expect(result.transitioned).toBe(false);
      expect(result.reason).toContain('Error');
    });

    it('should handle invalid transition gracefully', async () => {
      const incrementId = '0012-completed';
      const incrementPath = path.join(tempDir, '.specweave/increments', incrementId);
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create increment in COMPLETED (can't transition to PLANNING normally)
      const metadata = createDefaultMetadata(incrementId, IncrementType.FEATURE);
      metadata.status = IncrementStatus.COMPLETED;
      await metadataManager.write(incrementId, metadata);

      // Try to create spec.md (would want PLANNING, but transition is invalid)
      const result = await manager.handleSpecCreated(incrementId);
      expect(result.transitioned).toBe(false);
    });
  });
});
