/**
 * Increment Completion Living Docs Trigger Tests
 *
 * Tests that living docs updates are ONLY triggered on increment.done event,
 * NOT on task.updated or spec.updated events.
 *
 * Key verification:
 * - task.updated → NO living-docs-handler call
 * - spec.updated → NO living-docs-handler call
 * - increment.done → YES living-specs-handler call (includes codebase rescan)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Increment Completion Living Docs Trigger', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-inc-done-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('processor.sh Event Routing', () => {
    // NOTE: processor.sh was removed in v1.0.155 - hook architecture simplified
    // These tests are skipped when the file doesn't exist
    const processorPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/queue/processor.sh'
    );
    const processorExists = fs.existsSync(processorPath);

    it.skipIf(!processorExists)('should NOT route task.updated to living-docs-handler', () => {
      // Read processor.sh and verify task.updated does NOT call living-docs-handler
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Find the task.updated case block
      const taskUpdatedMatch = processorContent.match(/task\.updated\)([\s\S]*?);;/);
      expect(taskUpdatedMatch).toBeTruthy();

      const taskUpdatedBlock = taskUpdatedMatch![1];

      // Should NOT contain living-docs-handler
      expect(taskUpdatedBlock).not.toContain('living-docs-handler.sh');

      // Should contain ac-validation-handler and github-sync-handler
      expect(taskUpdatedBlock).toContain('ac-validation-handler.sh');
      expect(taskUpdatedBlock).toContain('github-sync-handler.sh');

      // v1.0.144: Should contain project-bridge-handler for universal external sync
      expect(taskUpdatedBlock).toContain('project-bridge-handler.sh');
    });

    it.skipIf(!processorExists)('should NOT route spec.updated to living-docs-handler', () => {
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Find the spec.updated case block
      const specUpdatedMatch = processorContent.match(/spec\.updated\)([\s\S]*?);;/);
      expect(specUpdatedMatch).toBeTruthy();

      const specUpdatedBlock = specUpdatedMatch![1];

      // Should NOT contain living-docs-handler
      expect(specUpdatedBlock).not.toContain('living-docs-handler.sh');

      // Should contain ac-validation-handler and github-sync-handler
      expect(specUpdatedBlock).toContain('ac-validation-handler.sh');
      expect(specUpdatedBlock).toContain('github-sync-handler.sh');

      // v1.0.144: Should contain project-bridge-handler for universal external sync
      expect(specUpdatedBlock).toContain('project-bridge-handler.sh');
    });

    it.skipIf(!processorExists)('should route increment.done to living-specs-handler', () => {
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Find the increment lifecycle events case block
      const incLifecycleMatch = processorContent.match(
        /increment\.created\|increment\.done\|increment\.archived\|increment\.reopened\)([\s\S]*?);;/
      );
      expect(incLifecycleMatch).toBeTruthy();

      const incLifecycleBlock = incLifecycleMatch![1];

      // Should contain living-specs-handler (which handles codebase rescan on done)
      expect(incLifecycleBlock).toContain('living-specs-handler.sh');
    });

    it.skipIf(!processorExists)('should have correct comment about living docs only on increment.done', () => {
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Should have comment explaining the change (v1.0.144)
      expect(processorContent).toContain('Living docs sync ONLY happens on increment.done');
    });
  });

  describe('living-specs-handler.sh Codebase Rescan', () => {
    it('should call launch-codebase-rescan.js on increment.done', () => {
      const handlerPath = path.join(
        process.cwd(),
        'plugins/specweave/hooks/v2/handlers/living-specs-handler.sh'
      );
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');

      // Should have codebase rescan section
      expect(handlerContent).toContain('CODEBASE RESCAN');
      expect(handlerContent).toContain('launch-codebase-rescan.js');

      // Should be inside increment.done case
      const incrementDoneMatch = handlerContent.match(/increment\.done\)([\s\S]*?);;/);
      expect(incrementDoneMatch).toBeTruthy();

      const incrementDoneBlock = incrementDoneMatch![1];
      expect(incrementDoneBlock).toContain('RESCAN_SCRIPT');
      expect(incrementDoneBlock).toContain('launch-codebase-rescan.js');
    });

    it('should call sync-living-docs.js on increment.done', () => {
      const handlerPath = path.join(
        process.cwd(),
        'plugins/specweave/hooks/v2/handlers/living-specs-handler.sh'
      );
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');

      // Should call sync-living-docs.js on increment.done
      const incrementDoneMatch = handlerContent.match(/increment\.done\)([\s\S]*?);;/);
      expect(incrementDoneMatch).toBeTruthy();

      const incrementDoneBlock = incrementDoneMatch![1];
      expect(incrementDoneBlock).toContain('SYNC_SCRIPT');
      expect(incrementDoneBlock).toContain('sync-living-docs.js');
    });

    it('should call sync-increment-closure.js on increment.done', () => {
      const handlerPath = path.join(
        process.cwd(),
        'plugins/specweave/hooks/v2/handlers/living-specs-handler.sh'
      );
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');

      // Should call sync-increment-closure.js to close external issues
      const incrementDoneMatch = handlerContent.match(/increment\.done\)([\s\S]*?);;/);
      expect(incrementDoneMatch).toBeTruthy();

      const incrementDoneBlock = incrementDoneMatch![1];
      expect(incrementDoneBlock).toContain('CLOSURE_SCRIPT');
      expect(incrementDoneBlock).toContain('sync-increment-closure.js');
    });
  });

  describe('launch-codebase-rescan.ts Full Scan Mode', () => {
    it('should use full depth for codebase rescan', () => {
      const launchPath = path.join(
        process.cwd(),
        'plugins/specweave/lib/hooks/launch-codebase-rescan.ts'
      );
      const launchContent = fs.readFileSync(launchPath, 'utf-8');

      // Should use 'full' depth, not 'quick'
      expect(launchContent).toContain("depth: 'full'");

      // Should have comment explaining v1.0.144 change
      expect(launchContent).toContain('v1.0.144');
      expect(launchContent).toContain('comprehensive living docs update');
    });

    it('should NOT use quick depth anymore', () => {
      const launchPath = path.join(
        process.cwd(),
        'plugins/specweave/lib/hooks/launch-codebase-rescan.ts'
      );
      const launchContent = fs.readFileSync(launchPath, 'utf-8');

      // Find the launchCodebaseRescanJob call
      const launchCallMatch = launchContent.match(/launchCodebaseRescanJob\(\{[\s\S]*?\}\)/);
      expect(launchCallMatch).toBeTruthy();

      const launchCall = launchCallMatch![0];

      // Should NOT have depth: 'quick' in the call
      expect(launchCall).not.toContain("depth: 'quick'");
      expect(launchCall).toContain("depth: 'full'");
    });
  });

  describe('Event Routing Comments', () => {
    // NOTE: processor.sh was removed in v1.0.155 - these tests are skipped
    const processorPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/queue/processor.sh'
    );
    const processorExists = fs.existsSync(processorPath);

    it.skipIf(!processorExists)('should document that task.updated does not trigger living docs', () => {
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Should have routing comments section with task.updated
      expect(processorContent).toContain('# Event routing (EDA v2):');

      // Find the task.updated comment line specifically
      const taskCommentLine = processorContent.match(/# - task\.updated[^\n]*/);
      expect(taskCommentLine).toBeTruthy();

      // task.updated comment should NOT mention living-docs-handler
      expect(taskCommentLine![0]).not.toContain('living-docs-handler');
    });

    it.skipIf(!processorExists)('should document that spec.updated does not trigger living docs', () => {
      const processorContent = fs.readFileSync(processorPath, 'utf-8');

      // Should have routing comments section with spec.updated
      expect(processorContent).toContain('# Event routing (EDA v2):');

      // Find the spec.updated comment line specifically
      const specCommentLine = processorContent.match(/# - spec\.updated[^\n]*/);
      expect(specCommentLine).toBeTruthy();

      // spec.updated comment should NOT mention living-docs-handler
      expect(specCommentLine![0]).not.toContain('living-docs-handler');
    });
  });
});

describe('Living Docs Handler Throttling', () => {
  it('living-docs-handler.sh should have throttling mechanism', () => {
    // The handler still exists for backward compatibility but is no longer called
    // from task/spec events. Verify throttling is in place for any future use.
    const handlerPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/handlers/living-docs-handler.sh'
    );

    if (fs.existsSync(handlerPath)) {
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');

      // Should have throttling
      expect(handlerContent).toContain('THROTTLE');
      expect(handlerContent).toContain('60'); // 60 second throttle window
    }
  });
});
