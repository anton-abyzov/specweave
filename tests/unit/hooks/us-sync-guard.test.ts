/**
 * US Sync Guard Tests
 *
 * Regression tests for TodoWrite crash bug (v0.25.1)
 * Ensures SKIP_US_SYNC flag properly prevents unguarded sync cascade
 *
 * Bug: US completion orchestrator called livingDocsSync.syncIncrement()
 * without checking SKIP_US_SYNC, causing infinite recursion → crash
 *
 * Fix: Added SKIP_US_SYNC=true to post-task-completion hook (line 463)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

describe('US Sync Guard (v0.25.1 Regression)', () => {
  describe('post-task-completion.sh', () => {
    it('should export SKIP_US_SYNC=true', () => {
      const hookPath = path.join(
        projectRoot,
        'plugins/specweave/hooks/post-task-completion.sh'
      );

      const result = execSync(`grep -n "export SKIP_US_SYNC=true" "${hookPath}"`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('SKIP_US_SYNC=true');
      expect(result).toMatch(/\d+:.*export SKIP_US_SYNC=true/); // Has line number
    });

    it('should export SKIP_US_SYNC before executing consolidated-sync', () => {
      const hookPath = path.join(
        projectRoot,
        'plugins/specweave/hooks/post-task-completion.sh'
      );

      const skipLine = execSync(
        `grep -n "export SKIP_US_SYNC=true" "${hookPath}" | cut -d: -f1`,
        { encoding: 'utf-8' }
      ).trim();

      // Find the actual node execution line (not just comments)
      const consolidatedLine = execSync(
        `grep -n "node.*CONSOLIDATED_SCRIPT" "${hookPath}" | head -1 | cut -d: -f1`,
        { encoding: 'utf-8' }
      ).trim();

      const skipLineNum = parseInt(skipLine, 10);
      const consolidatedLineNum = parseInt(consolidatedLine, 10);

      expect(skipLineNum).toBeLessThan(consolidatedLineNum);
    });
  });

  describe('us-completion-orchestrator.js', () => {
    it('should check SKIP_US_SYNC before processing', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.js'
      );

      const result = execSync(
        `grep -n "SKIP_US_SYNC" "${orchestratorPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('SKIP_US_SYNC');
      expect(result).toMatch(/process\.env\.SKIP_US_SYNC/);
    });

    it('should exit early when SKIP_US_SYNC=true', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.js'
      );

      // Check for early return when SKIP_US_SYNC is true
      const result = execSync(
        `grep -A 2 "SKIP_US_SYNC === 'true'" "${orchestratorPath}"`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('return');
      expect(result).toContain('skipped');
    });

    it('should not call syncIncrement when SKIP_US_SYNC=true', () => {
      const orchestratorPath = path.join(
        projectRoot,
        'plugins/specweave/lib/hooks/us-completion-orchestrator.js'
      );

      // Find line number of SKIP_US_SYNC check
      const skipCheckLine = execSync(
        `grep -n "SKIP_US_SYNC === 'true'" "${orchestratorPath}" | cut -d: -f1`,
        { encoding: 'utf-8' }
      ).trim();

      // Find line number of syncIncrement call
      const syncLine = execSync(
        `grep -n "livingDocsSync.syncIncrement" "${orchestratorPath}" | cut -d: -f1`,
        { encoding: 'utf-8' }
      ).trim();

      const skipLineNum = parseInt(skipCheckLine, 10);
      const syncLineNum = parseInt(syncLine, 10);

      // syncIncrement should be called AFTER SKIP check
      expect(syncLineNum).toBeGreaterThan(skipLineNum);
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
    it('should be v0.25.1', () => {
      const packagePath = path.join(projectRoot, 'package.json');

      const result = execSync(`grep '"version"' "${packagePath}" | head -1`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('0.25.1');
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
