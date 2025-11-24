/**
 * US Sync Guard Tests
 *
 * v0.26.1: Tests for automatic US sync restoration with smart throttling
 * v0.25.1: Regression tests for TodoWrite crash bug (emergency SKIP_US_SYNC fix)
 *
 * Evolution:
 * - v0.25.1: Added SKIP_US_SYNC=true as emergency fix (manual sync required)
 * - v0.26.1: Removed SKIP_US_SYNC, restored automatic sync with:
 *   * Smart throttle (60s window prevents spam)
 *   * SKIP_EXTERNAL_SYNC guard at LivingDocsSync layer
 *   * fs.writeFile() confirmed to NOT trigger hooks
 *
 * See:
 * - FS-WRITEFILE-HOOK-TEST-RESULTS-2025-11-24.md (test validation)
 * - ADR-0129 (US Sync Guard Rails)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

describe('US Sync Guard (v0.26.1 - Automatic Sync Restoration)', () => {
  describe('post-task-completion.sh', () => {
    it('should NOT export SKIP_US_SYNC (removed in v0.26.1)', () => {
      const hookPath = path.join(
        projectRoot,
        'plugins/specweave/hooks/post-task-completion.sh'
      );

      let result;
      try {
        result = execSync(`grep -n "export SKIP_US_SYNC=true" "${hookPath}"`, {
          encoding: 'utf-8'
        });
      } catch (error) {
        // grep exits with code 1 when no match found (expected!)
        result = '';
      }

      // Should NOT find the export (it was removed in v0.26.1)
      expect(result).toBe('');
    });

    it('should have comment explaining SKIP_US_SYNC removal', () => {
      const hookPath = path.join(
        projectRoot,
        'plugins/specweave/hooks/post-task-completion.sh'
      );

      const result = execSync(`grep -n "v0.26.1: SKIP_US_SYNC removed" "${hookPath}"`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('v0.26.1');
      expect(result).toContain('SKIP_US_SYNC removed');
    });

    it('should still export SKIP_GITHUB_SYNC (GitHub sync only on completion)', () => {
      const hookPath = path.join(
        projectRoot,
        'plugins/specweave/hooks/post-task-completion.sh'
      );

      const result = execSync(`grep -n "export SKIP_GITHUB_SYNC=true" "${hookPath}"`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('SKIP_GITHUB_SYNC=true');
    });
  });

  describe('us-completion-orchestrator.ts (v0.26.1 TypeScript version)', () => {
    it('should import USSyncThrottle', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.ts'
      );

      const result = execSync(
        `grep -n "import.*USSyncThrottle" "${orchestratorPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('USSyncThrottle');
      expect(result).toContain('us-sync-throttle');
    });

    it('should call throttle.shouldSkipSync()', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.ts'
      );

      const result = execSync(
        `grep -n "throttle.shouldSkipSync" "${orchestratorPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('shouldSkipSync');
    });

    it('should call throttle.recordSync() on success', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.ts'
      );

      const result = execSync(
        `grep -n "throttle.recordSync" "${orchestratorPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('recordSync');
    });

    it('should NOT check SKIP_US_SYNC (removed in v0.26.1)', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.ts'
      );

      let result;
      try {
        result = execSync(
          `grep -n "SKIP_US_SYNC" "${orchestratorPath}"`,
          { encoding: 'utf-8' }
        );
      } catch (error) {
        // grep exits with code 1 when no match found (expected!)
        result = '';
      }

      // Should NOT find SKIP_US_SYNC references
      expect(result).toBe('');
    });
  });

  describe('Throttle Module', () => {
    it('should have throttle module implementation', () => {
      const throttlePath = path.join(projectRoot, 'src/core/us-sync-throttle.ts');

      const result = execSync(`test -f "${throttlePath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have throttle unit tests', () => {
      const testPath = path.join(
        projectRoot,
        'tests/unit/core/us-sync-throttle.test.ts'
      );

      const result = execSync(`test -f "${testPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('throttle module should define USSyncThrottle class', () => {
      const throttlePath = path.join(projectRoot, 'src/core/us-sync-throttle.ts');

      const result = execSync(
        `grep -n "export class USSyncThrottle" "${throttlePath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('USSyncThrottle');
    });

    it('throttle module should have 60-second default window', () => {
      const throttlePath = path.join(projectRoot, 'src/core/us-sync-throttle.ts');

      const result = execSync(
        `grep -n "60000" "${throttlePath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('60000');
    });
  });

  describe('SKIP_EXTERNAL_SYNC Guard (v0.25.2)', () => {
    it('LivingDocsSync should check SKIP_EXTERNAL_SYNC before external tool sync', () => {
      const syncPath = path.join(
        projectRoot,
        'src/core/living-docs/living-docs-sync.ts'
      );

      const result = execSync(
        `grep -n "SKIP_EXTERNAL_SYNC" "${syncPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('SKIP_EXTERNAL_SYNC');
      expect(result).toContain('process.env.SKIP_EXTERNAL_SYNC');
    });

    it('LivingDocsSync should skip syncToExternalTools when SKIP_EXTERNAL_SYNC=true', () => {
      const syncPath = path.join(
        projectRoot,
        'src/core/living-docs/living-docs-sync.ts'
      );

      const result = execSync(
        `grep -A 2 "process.env.SKIP_EXTERNAL_SYNC" "${syncPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('syncToExternalTools');
    });
  });

  describe('Unguarded Sync Detection', () => {
    it('should have detection script', () => {
      const scriptPath = path.join(projectRoot, 'scripts/detect-unguarded-sync.sh');

      const result = execSync(`test -f "${scriptPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('detection script should be executable', () => {
      const scriptPath = path.join(projectRoot, 'scripts/detect-unguarded-sync.sh');

      const result = execSync(`test -x "${scriptPath}" && echo "executable"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('executable');
    });
  });

  describe('Documentation', () => {
    it('should have fs.writeFile test results document', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/increments/0053-safe-feature-deletion/reports/FS-WRITEFILE-HOOK-TEST-RESULTS-2025-11-24.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have executive summary document', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/increments/0053-safe-feature-deletion/reports/EXECUTIVE-SUMMARY-CRASH-FIX-2025-11-24.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have root cause analysis document', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/increments/0053-safe-feature-deletion/reports/ROOT-CAUSE-ANALYSIS-TODOWRITE-CRASH-2025-11-24.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have emergency recovery guide', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/docs/internal/emergency-procedures/TODOWRITE-CRASH-RECOVERY.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have ADR-0129', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/docs/internal/architecture/adr/0129-us-sync-guard-rails.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('should have audit report', () => {
      const docPath = path.join(
        projectRoot,
        '.specweave/increments/0053-safe-feature-deletion/reports/UNGUARDED-SYNC-AUDIT-2025-11-24.md'
      );

      const result = execSync(`test -f "${docPath}" && echo "exists"`, {
        encoding: 'utf-8'
      });

      expect(result.trim()).toBe('exists');
    });

    it('CLAUDE.md should document TodoWrite crash', () => {
      const claudePath = path.join(projectRoot, 'CLAUDE.md');

      const result = execSync(`grep -c "TodoWrite Crash" "${claudePath}"`, {
        encoding: 'utf-8'
      });

      expect(parseInt(result.trim(), 10)).toBeGreaterThan(0);
    });
  });

  describe('Version', () => {
    it('should be v0.26.x (beyond emergency fix)', () => {
      const packagePath = path.join(projectRoot, 'package.json');

      const result = execSync(`grep '"version"' "${packagePath}" | head -1`, {
        encoding: 'utf-8'
      });

      expect(result).toMatch(/0\.26\.\d+/);
    });
  });

  describe('CHANGELOG', () => {
    it('should document v0.25.1 emergency hotfix', () => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');

      const result = execSync(`grep -c "\\[0.25.1\\]" "${changelogPath}"`, {
        encoding: 'utf-8'
      });

      expect(parseInt(result.trim(), 10)).toBeGreaterThan(0);
    });

    it('should mention TodoWrite crash in CHANGELOG', () => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');

      const result = execSync(`grep -c "TodoWrite Crash" "${changelogPath}"`, {
        encoding: 'utf-8'
      });

      expect(parseInt(result.trim(), 10)).toBeGreaterThan(0);
    });
  });
});
