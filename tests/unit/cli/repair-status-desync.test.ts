import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  repairDesync,
  repairStatusDesync,
  createBackup,
  writeAuditLog,
  formatRepairReport,
} from '../../../src/cli/commands/repair-status-desync.js';
import { DesyncSeverity } from '../../../src/cli/commands/validate-status-sync.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

// Mock dependencies
vi.mock('../../../src/cli/commands/validate-status-sync.js');
vi.mock('../../../src/core/increment/spec-frontmatter-updater.js');
vi.mock('fs-extra', () => ({
  default: {
    copyFile: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn(),
  },
  copyFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
}));

import { validateStatusSync } from '../../../src/cli/commands/validate-status-sync.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import fs from 'fs-extra';

const mockValidateStatusSync = vi.mocked(validateStatusSync);
const mockUpdateStatus = vi.mocked(SpecFrontmatterUpdater.updateStatus);
const mockCopyFile = vi.mocked(fs.copyFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockEnsureDir = vi.mocked(fs.ensureDir);

describe('repair-status-desync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create backup with timestamp', async () => {
      mockCopyFile.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

      const backupPath = await createBackup('0038-test');

      expect(mockCopyFile).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/increments/0038-test/spec.md'),
        expect.stringMatching(/spec\.md\.backup-/)
      );
      expect(backupPath).toMatch(/spec\.md\.backup-/);
    });

    it('should use ISO timestamp format', async () => {
      mockCopyFile.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

      const backupPath = await createBackup('0001-test');

      // Timestamp should be in format: YYYY-MM-DDTHH-MM-SS-MMMZ
      expect(backupPath).toMatch(/backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });
  });

  describe('repairDesync', () => {
    const mockDesync = {
      incrementId: '0038-test',
      metadataStatus: IncrementStatus.COMPLETED,
      specStatus: IncrementStatus.ACTIVE,
      severity: DesyncSeverity.CRITICAL,
      impact: 'Test impact',
      fix: 'Test fix',
    };

    it('should update spec.md to match metadata.json', async () => {
      mockCopyFile.mockResolvedValue(undefined);
      mockUpdateStatus.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

      const result = await repairDesync(mockDesync);

      expect(mockUpdateStatus).toHaveBeenCalledWith('0038-test', IncrementStatus.COMPLETED);
      expect(result.success).toBe(true);
      expect(result.oldStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.newStatus).toBe(IncrementStatus.COMPLETED);
    });

    it('should create backup before repair by default', async () => {
      mockCopyFile.mockResolvedValue(undefined);
      mockUpdateStatus.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

      const result = await repairDesync(mockDesync);

      expect(mockCopyFile).toHaveBeenCalled();
      expect(result.backupPath).toMatch(/backup-/);
    });

    it('should skip backup when createBackup=false', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);

      const result = await repairDesync(mockDesync, { createBackup: false });

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(result.backupPath).toBeUndefined();
    });

    it('should return success=false on error', async () => {
      mockCopyFile.mockResolvedValue(undefined);
      mockUpdateStatus.mockRejectedValue(new Error('Test error'));
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

      const result = await repairDesync(mockDesync);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });

    it('should preview changes in dry-run mode without modifying', async () => {
      const result = await repairDesync(mockDesync, { dryRun: true });

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.oldStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.newStatus).toBe(IncrementStatus.COMPLETED);
    });

    it('should not create backup in dry-run mode', async () => {
      const result = await repairDesync(mockDesync, { dryRun: true, createBackup: true });

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(result.backupPath).toBeUndefined();
    });
  });

  describe('repairStatusDesync', () => {
    const mockDesyncs = [
      {
        incrementId: '0038-test',
        metadataStatus: IncrementStatus.COMPLETED,
        specStatus: IncrementStatus.ACTIVE,
        severity: DesyncSeverity.CRITICAL,
        impact: 'Test 1',
        fix: 'Fix 1',
      },
      {
        incrementId: '0041-test',
        metadataStatus: IncrementStatus.COMPLETED,
        specStatus: IncrementStatus.ACTIVE,
        severity: DesyncSeverity.CRITICAL,
        impact: 'Test 2',
        fix: 'Fix 2',
      },
    ];

    beforeEach(() => {
      mockValidateStatusSync.mockResolvedValue({
        total: 2,
        synced: 0,
        desynced: 2,
        desyncs: mockDesyncs,
      });
      mockCopyFile.mockResolvedValue(undefined);
      mockUpdateStatus.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
    });

    it('should repair all desyncs when --all flag provided', async () => {
      const result = await repairStatusDesync({ all: true });

      expect(result.total).toBe(2);
      expect(result.repaired).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockUpdateStatus).toHaveBeenCalledTimes(2);
    });

    it('should repair specific increment by ID', async () => {
      const result = await repairStatusDesync({ incrementId: '0038-test' });

      expect(result.total).toBe(1);
      expect(result.repaired).toBe(1);
      expect(result.results[0].incrementId).toBe('0038-test');
      expect(mockUpdateStatus).toHaveBeenCalledWith('0038-test', IncrementStatus.COMPLETED);
    });

    it('should throw error if incrementId not found', async () => {
      await expect(repairStatusDesync({ incrementId: '9999-missing' })).rejects.toThrow(
        'No desync found for increment 9999-missing'
      );
    });

    it('should throw error if neither --all nor incrementId provided', async () => {
      await expect(repairStatusDesync({})).rejects.toThrow(
        'Must specify either --all or <incrementId>'
      );
    });

    it('should count successful and failed repairs', async () => {
      mockUpdateStatus
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Test error')); // Second fails

      const result = await repairStatusDesync({ all: true });

      expect(result.total).toBe(2);
      expect(result.repaired).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should skip repairs in dry-run mode', async () => {
      const result = await repairStatusDesync({ all: true, dryRun: true });

      expect(result.total).toBe(2);
      expect(result.repaired).toBe(2);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockCopyFile).not.toHaveBeenCalled();
    });
  });

  describe('writeAuditLog', () => {
    const mockResults = [
      {
        incrementId: '0038-test',
        oldStatus: 'active',
        newStatus: 'completed',
        success: true,
        backupPath: '/path/to/backup',
      },
      {
        incrementId: '0041-test',
        oldStatus: 'active',
        newStatus: 'completed',
        success: false,
        error: 'Test error',
      },
    ];

    beforeEach(() => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
    });

    it('should create audit log with all repair results', async () => {
      const logPath = await writeAuditLog(mockResults);

      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/logs')
      );
      expect(mockWriteFile).toHaveBeenCalled();
      expect(logPath).toMatch(/status-desync-repair-.*\.json/);
    });

    it('should write JSON format with all fields', async () => {
      await writeAuditLog(mockResults);

      const writeCall = mockWriteFile.mock.calls[0];
      const logContent = JSON.parse(writeCall[1] as string);

      expect(logContent).toHaveLength(2);
      expect(logContent[0]).toMatchObject({
        incrementId: '0038-test',
        oldStatus: 'active',
        newStatus: 'completed',
        success: true,
        backupPath: '/path/to/backup',
      });
      expect(logContent[0]).toHaveProperty('timestamp');
    });

    it('should include error field for failed repairs', async () => {
      await writeAuditLog(mockResults);

      const writeCall = mockWriteFile.mock.calls[0];
      const logContent = JSON.parse(writeCall[1] as string);

      expect(logContent[1].error).toBe('Test error');
    });
  });

  describe('formatRepairReport', () => {
    it('should format success report for normal mode', () => {
      const result = {
        total: 2,
        repaired: 2,
        failed: 0,
        results: [
          {
            incrementId: '0038-test',
            oldStatus: 'active',
            newStatus: 'completed',
            success: true,
            backupPath: '/path/to/backup',
          },
        ],
      };

      const report = formatRepairReport(result, false);

      expect(report).toContain('Total desyncs: 2');
      expect(report).toContain('Repaired: 2');
      expect(report).toContain('✅ Repaired 0038-test');
      expect(report).toContain('Backup: /path/to/backup');
      expect(report).toContain('2 desync(s) repaired successfully');
    });

    it('should format dry-run report', () => {
      const result = {
        total: 2,
        repaired: 2,
        failed: 0,
        results: [
          {
            incrementId: '0038-test',
            oldStatus: 'active',
            newStatus: 'completed',
            success: true,
          },
        ],
      };

      const report = formatRepairReport(result, true);

      expect(report).toContain('DRY RUN');
      expect(report).toContain('Would repair: 2');
      expect(report).toContain('DRY RUN: Would update 0038-test');
      expect(report).toContain('To apply these changes');
    });

    it('should show failed repairs', () => {
      const result = {
        total: 2,
        repaired: 1,
        failed: 1,
        results: [
          {
            incrementId: '0038-test',
            oldStatus: 'active',
            newStatus: 'completed',
            success: false,
            error: 'Test error',
          },
        ],
      };

      const report = formatRepairReport(result, false);

      expect(report).toContain('Failed: 1');
      expect(report).toContain('❌ Failed 0038-test');
      expect(report).toContain('Error: Test error');
    });
  });
});
