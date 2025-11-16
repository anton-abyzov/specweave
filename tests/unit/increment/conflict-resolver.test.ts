/**
 * Unit tests for ConflictResolver
 *
 * Tests conflict resolution, content merging, and report generation.
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import * as path from 'path';
import {
  resolveConflict,
  mergeContent,
  resolveAllDuplicates,
  type ResolveOptions
} from '../../../src/core/increment/conflict-resolver.js';
import type { Duplicate, IncrementLocation } from '../../../src/core/increment/duplicate-detector.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import {
  createTestDir,
  cleanupTestDir,
  createTestIncrement,
  createMockLocation
} from '../../helpers/increment-test-helpers.js';

describe('ConflictResolver', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDir('conflict-resolver-test');
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe('resolveConflict', () => {
    it('should resolve conflict with merge enabled', async () => {
      // Create duplicate increments
      const winnerPath = await createTestIncrement(testDir, 'active', '0001-winner', {
        status: IncrementStatus.ACTIVE,
        hasReports: true
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0001-loser', {
        status: IncrementStatus.COMPLETED,
        hasReports: true
      });

      const duplicate: Duplicate = {
        incrementNumber: '0001',
        locations: [
          {
            path: winnerPath,
            name: '0001-winner',
            status: IncrementStatus.ACTIVE,
            lastActivity: '2025-11-14T10:00:00Z',
            fileCount: 5,
            totalSize: 5000,
            hasReports: true,
            hasGitHubLink: false
          },
          {
            path: loserPath,
            name: '0001-loser',
            status: IncrementStatus.COMPLETED,
            lastActivity: '2025-11-13T10:00:00Z',
            fileCount: 3,
            totalSize: 3000,
            hasReports: true,
            hasGitHubLink: false
          }
        ],
        recommendedWinner: {
          path: winnerPath,
          name: '0001-winner',
          status: IncrementStatus.ACTIVE,
          lastActivity: '2025-11-14T10:00:00Z',
          fileCount: 5,
          totalSize: 5000,
          hasReports: true,
          hasGitHubLink: false
        },
        losingVersions: [{
          path: loserPath,
          name: '0001-loser',
          status: IncrementStatus.COMPLETED,
          lastActivity: '2025-11-13T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: true,
          hasGitHubLink: false
        }],
        resolutionReason: 'Active status'
      };

      const result = await resolveConflict(duplicate, {
        merge: true,
        force: true,
        dryRun: false
      });

      expect(result.winner).toBe(winnerPath);
      expect(result.merged.length).toBeGreaterThan(0);
      expect(result.deleted).toContain(loserPath);
      expect(result.reportPath).toContain('DUPLICATE-RESOLUTION');
      expect(result.dryRun).toBe(false);

      // Verify loser was deleted
      expect(await fs.pathExists(loserPath)).toBe(false);

      // Verify winner still exists
      expect(await fs.pathExists(winnerPath)).toBe(true);

      // Verify resolution report was created
      expect(await fs.pathExists(result.reportPath)).toBe(true);
    });

    it('should not modify filesystem in dry-run mode', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0002-winner', {
        status: IncrementStatus.ACTIVE
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0002-loser', {
        status: IncrementStatus.COMPLETED
      });

      const duplicate: Duplicate = {
        incrementNumber: '0002',
        locations: [
          createMockLocation('0002-winner', IncrementStatus.ACTIVE, '2025-11-14T10:00:00Z'),
          createMockLocation('0002-loser', IncrementStatus.COMPLETED, '2025-11-13T10:00:00Z')
        ],
        recommendedWinner: {
          path: winnerPath,
          name: '0002-winner',
          status: IncrementStatus.ACTIVE,
          lastActivity: '2025-11-14T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: false,
          hasGitHubLink: false
        },
        losingVersions: [{
          path: loserPath,
          name: '0002-loser',
          status: IncrementStatus.COMPLETED,
          lastActivity: '2025-11-13T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: false,
          hasGitHubLink: false
        }],
        resolutionReason: 'Active status'
      };

      const result = await resolveConflict(duplicate, {
        merge: true,
        dryRun: true
      });

      expect(result.dryRun).toBe(true);

      // Verify nothing was deleted
      expect(await fs.pathExists(loserPath)).toBe(true);
      expect(await fs.pathExists(winnerPath)).toBe(true);

      // Report should not be created in dry-run
      expect(await fs.pathExists(result.reportPath)).toBe(false);
    });

    it('should skip merge when merge flag is false', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0003-winner');
      const loserPath = await createTestIncrement(testDir, '_archive', '0003-loser', {
        hasReports: true
      });

      const duplicate: Duplicate = {
        incrementNumber: '0003',
        locations: [],
        recommendedWinner: {
          path: winnerPath,
          name: '0003-winner',
          status: IncrementStatus.ACTIVE,
          lastActivity: '2025-11-14T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: false,
          hasGitHubLink: false
        },
        losingVersions: [{
          path: loserPath,
          name: '0003-loser',
          status: IncrementStatus.COMPLETED,
          lastActivity: '2025-11-13T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: true,
          hasGitHubLink: false
        }],
        resolutionReason: 'Active status'
      };

      const result = await resolveConflict(duplicate, {
        merge: false,
        force: true
      });

      expect(result.merged).toEqual([]);
    });
  });

  describe('mergeContent', () => {
    it('should copy all reports from loser to winner', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0004-winner', {
        hasReports: true
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0004-loser', {
        hasReports: true
      });

      // Add extra reports to loser
      await fs.writeFile(
        path.join(loserPath, 'reports', 'extra-report.md'),
        '# Extra Report'
      );

      const winner: IncrementLocation = {
        path: winnerPath,
        name: '0004-winner',
        status: IncrementStatus.ACTIVE,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 5,
        totalSize: 5000,
        hasReports: true,
        hasGitHubLink: false
      };

      const losers: IncrementLocation[] = [{
        path: loserPath,
        name: '0004-loser',
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-13T10:00:00Z',
        fileCount: 4,
        totalSize: 4000,
        hasReports: true,
        hasGitHubLink: false
      }];

      const merged = await mergeContent(winner, losers, { dryRun: false });

      expect(merged.length).toBeGreaterThan(0);

      // Verify extra report was copied
      const extraReportPath = path.join(winnerPath, 'reports', 'extra-report.md');
      expect(await fs.pathExists(extraReportPath)).toBe(true);
    });

    it('should rename conflicting report files with timestamp', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0005-winner', {
        hasReports: true
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0005-loser', {
        hasReports: true
      });

      // Create same-named report in both
      const reportName = 'same-report.md';
      await fs.writeFile(
        path.join(winnerPath, 'reports', reportName),
        '# Winner Report'
      );
      await fs.writeFile(
        path.join(loserPath, 'reports', reportName),
        '# Loser Report'
      );

      const winner: IncrementLocation = {
        path: winnerPath,
        name: '0005-winner',
        status: IncrementStatus.ACTIVE,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 5,
        totalSize: 5000,
        hasReports: true,
        hasGitHubLink: false
      };

      const losers: IncrementLocation[] = [{
        path: loserPath,
        name: '0005-loser',
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-13T10:00:00Z',
        fileCount: 4,
        totalSize: 4000,
        hasReports: true,
        hasGitHubLink: false
      }];

      const merged = await mergeContent(winner, losers, { dryRun: false });

      // Should have merged with renamed file
      const mergedReport = merged.find(f => f.includes('same-report') && f.includes('MERGED'));
      expect(mergedReport).toBeDefined();
    });

    it('should merge metadata external links', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0006-winner', {
        hasGitHubLink: true
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0006-loser');

      // Add JIRA link to loser
      const loserMetadata = await fs.readJson(path.join(loserPath, 'metadata.json'));
      loserMetadata.jira = {
        issue: 'PROJ-123',
        url: 'https://jira.example.com/browse/PROJ-123'
      };
      await fs.writeJson(path.join(loserPath, 'metadata.json'), loserMetadata, { spaces: 2 });

      const winner: IncrementLocation = {
        path: winnerPath,
        name: '0006-winner',
        status: IncrementStatus.ACTIVE,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 5,
        totalSize: 5000,
        hasReports: false,
        hasGitHubLink: true
      };

      const losers: IncrementLocation[] = [{
        path: loserPath,
        name: '0006-loser',
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-13T10:00:00Z',
        fileCount: 4,
        totalSize: 4000,
        hasReports: false,
        hasGitHubLink: false
      }];

      await mergeContent(winner, losers, { dryRun: false });

      // Verify merged metadata has both GitHub and JIRA
      const mergedMetadata = await fs.readJson(path.join(winnerPath, 'metadata.json'));
      expect(mergedMetadata.github).toBeDefined();
      expect(mergedMetadata.jira).toBeDefined();
      expect(mergedMetadata.jira.issue).toBe('PROJ-123');
    });

    it('should not modify filesystem in dry-run mode', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0007-winner');
      const loserPath = await createTestIncrement(testDir, '_archive', '0007-loser', {
        hasReports: true
      });

      const winner: IncrementLocation = {
        path: winnerPath,
        name: '0007-winner',
        status: IncrementStatus.ACTIVE,
        lastActivity: '2025-11-14T10:00:00Z',
        fileCount: 3,
        totalSize: 3000,
        hasReports: false,
        hasGitHubLink: false
      };

      const losers: IncrementLocation[] = [{
        path: loserPath,
        name: '0007-loser',
        status: IncrementStatus.COMPLETED,
        lastActivity: '2025-11-13T10:00:00Z',
        fileCount: 4,
        totalSize: 4000,
        hasReports: true,
        hasGitHubLink: false
      }];

      const merged = await mergeContent(winner, losers, { dryRun: true });

      // Should return list of what would be merged
      expect(merged.length).toBeGreaterThan(0);

      // But winner should not have reports folder created
      const winnerReportsDir = path.join(winnerPath, 'reports');
      expect(await fs.pathExists(winnerReportsDir)).toBe(false);
    });
  });

  describe('resolveAllDuplicates', () => {
    it('should resolve multiple duplicates in batch', async () => {
      // Create two sets of duplicates
      const winner1 = await createTestIncrement(testDir, 'active', '0008-winner1', {
        status: IncrementStatus.ACTIVE
      });
      const loser1 = await createTestIncrement(testDir, '_archive', '0008-loser1', {
        status: IncrementStatus.COMPLETED
      });

      const winner2 = await createTestIncrement(testDir, 'active', '0009-winner2', {
        status: IncrementStatus.ACTIVE
      });
      const loser2 = await createTestIncrement(testDir, '_archive', '0009-loser2', {
        status: IncrementStatus.COMPLETED
      });

      const duplicates: Duplicate[] = [
        {
          incrementNumber: '0008',
          locations: [],
          recommendedWinner: {
            path: winner1,
            name: '0008-winner1',
            status: IncrementStatus.ACTIVE,
            lastActivity: '2025-11-14T10:00:00Z',
            fileCount: 3,
            totalSize: 3000,
            hasReports: false,
            hasGitHubLink: false
          },
          losingVersions: [{
            path: loser1,
            name: '0008-loser1',
            status: IncrementStatus.COMPLETED,
            lastActivity: '2025-11-13T10:00:00Z',
            fileCount: 3,
            totalSize: 3000,
            hasReports: false,
            hasGitHubLink: false
          }],
          resolutionReason: 'Active status'
        },
        {
          incrementNumber: '0009',
          locations: [],
          recommendedWinner: {
            path: winner2,
            name: '0009-winner2',
            status: IncrementStatus.ACTIVE,
            lastActivity: '2025-11-14T10:00:00Z',
            fileCount: 3,
            totalSize: 3000,
            hasReports: false,
            hasGitHubLink: false
          },
          losingVersions: [{
            path: loser2,
            name: '0009-loser2',
            status: IncrementStatus.COMPLETED,
            lastActivity: '2025-11-13T10:00:00Z',
            fileCount: 3,
            totalSize: 3000,
            hasReports: false,
            hasGitHubLink: false
          }],
          resolutionReason: 'Active status'
        }
      ];

      const results = await resolveAllDuplicates(duplicates, {
        merge: true,
        force: true
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.deleted.length > 0)).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should create resolution report with all details', async () => {
      const winnerPath = await createTestIncrement(testDir, 'active', '0010-winner', {
        status: IncrementStatus.ACTIVE
      });
      const loserPath = await createTestIncrement(testDir, '_archive', '0010-loser', {
        status: IncrementStatus.COMPLETED
      });

      const duplicate: Duplicate = {
        incrementNumber: '0010',
        locations: [],
        recommendedWinner: {
          path: winnerPath,
          name: '0010-winner',
          status: IncrementStatus.ACTIVE,
          lastActivity: '2025-11-14T10:00:00Z',
          fileCount: 5,
          totalSize: 5000,
          hasReports: true,
          hasGitHubLink: true
        },
        losingVersions: [{
          path: loserPath,
          name: '0010-loser',
          status: IncrementStatus.COMPLETED,
          lastActivity: '2025-11-13T10:00:00Z',
          fileCount: 3,
          totalSize: 3000,
          hasReports: false,
          hasGitHubLink: false
        }],
        resolutionReason: 'Active status, Most recent activity'
      };

      const result = await resolveConflict(duplicate, {
        merge: true,
        force: true
      });

      // Verify report was created
      expect(await fs.pathExists(result.reportPath)).toBe(true);

      // Verify report content
      const reportContent = await fs.readFile(result.reportPath, 'utf-8');
      expect(reportContent).toContain('Duplicate Resolution Report');
      expect(reportContent).toContain('0010');
      expect(reportContent).toContain('Active status');
      expect(reportContent).toContain('0010-winner');
      expect(reportContent).toContain('0010-loser');
    });
  });
});
