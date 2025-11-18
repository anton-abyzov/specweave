import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateStatusSync,
  calculateSeverity,
  formatReport,
  DesyncSeverity,
} from '../../../src/cli/commands/validate-status-sync.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

// Mock dependencies
vi.mock('../../../src/core/increment/metadata-manager.js');
vi.mock('../../../src/core/increment/spec-frontmatter-updater.js');

import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';

const mockGetAll = vi.mocked(MetadataManager.getAll);
const mockReadStatus = vi.mocked(SpecFrontmatterUpdater.readStatus);

describe('validate-status-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateSeverity', () => {
    it('should return CRITICAL for metadata=completed, spec=active', () => {
      const result = calculateSeverity(IncrementStatus.COMPLETED, IncrementStatus.ACTIVE);

      expect(result.severity).toBe(DesyncSeverity.CRITICAL);
      expect(result.impact).toContain('Status line shows completed');
    });

    it('should return CRITICAL for metadata=paused, spec=active', () => {
      const result = calculateSeverity(IncrementStatus.PAUSED, IncrementStatus.ACTIVE);

      expect(result.severity).toBe(DesyncSeverity.CRITICAL);
      expect(result.impact).toContain('Status line shows');
    });

    it('should return CRITICAL for metadata=abandoned, spec=active', () => {
      const result = calculateSeverity(IncrementStatus.ABANDONED, IncrementStatus.ACTIVE);

      expect(result.severity).toBe(DesyncSeverity.CRITICAL);
      expect(result.impact).toContain('Status line shows');
    });

    it('should return HIGH for metadata=active, spec=completed', () => {
      const result = calculateSeverity(IncrementStatus.ACTIVE, IncrementStatus.COMPLETED);

      expect(result.severity).toBe(DesyncSeverity.HIGH);
      expect(result.impact).toContain('Active increment appears completed');
    });

    it('should return HIGH for metadata=active, spec=paused', () => {
      const result = calculateSeverity(IncrementStatus.ACTIVE, IncrementStatus.PAUSED);

      expect(result.severity).toBe(DesyncSeverity.HIGH);
      expect(result.impact).toContain('Active increment appears');
    });

    it('should return MEDIUM for metadata=paused, spec=completed', () => {
      const result = calculateSeverity(IncrementStatus.PAUSED, IncrementStatus.COMPLETED);

      expect(result.severity).toBe(DesyncSeverity.MEDIUM);
      expect(result.impact).toContain('Workflow state confusion');
    });

    it('should return LOW for other combinations', () => {
      const result = calculateSeverity(IncrementStatus.PLANNING, IncrementStatus.BACKLOG);

      expect(result.severity).toBe(DesyncSeverity.LOW);
      expect(result.impact).toContain('Minor status inconsistency');
    });
  });

  describe('validateStatusSync', () => {
    it('should detect desyncs when metadata.status !== spec.status', async () => {
      // Mock increments
      mockGetAll.mockReturnValue([
        {
          id: '0038-test',
          status: IncrementStatus.COMPLETED,
          type: 'feature',
          created: '2024-01-01',
          lastActivity: '2024-01-01',
        },
        {
          id: '0041-test',
          status: IncrementStatus.COMPLETED,
          type: 'feature',
          created: '2024-01-02',
          lastActivity: '2024-01-02',
        },
      ]);

      // Mock spec.md reads (desynced)
      mockReadStatus.mockImplementation(async (id: string) => {
        if (id === '0038-test') return IncrementStatus.ACTIVE; // Desync!
        if (id === '0041-test') return IncrementStatus.ACTIVE; // Desync!
        return IncrementStatus.COMPLETED;
      });

      const result = await validateStatusSync();

      expect(result.total).toBe(2);
      expect(result.synced).toBe(0);
      expect(result.desynced).toBe(2);
      expect(result.desyncs).toHaveLength(2);
      expect(result.desyncs[0].incrementId).toBe('0038-test');
      expect(result.desyncs[0].metadataStatus).toBe(IncrementStatus.COMPLETED);
      expect(result.desyncs[0].specStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.desyncs[0].severity).toBe(DesyncSeverity.CRITICAL);
    });

    it('should report zero desyncs when all synced', async () => {
      mockGetAll.mockReturnValue([
        {
          id: '0042-test',
          status: IncrementStatus.ACTIVE,
          type: 'feature',
          created: '2024-01-03',
          lastActivity: '2024-01-03',
        },
      ]);

      mockReadStatus.mockResolvedValue(IncrementStatus.ACTIVE); // Synced!

      const result = await validateStatusSync();

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.desynced).toBe(0);
      expect(result.desyncs).toHaveLength(0);
    });

    it('should skip increments with missing spec.md', async () => {
      mockGetAll.mockReturnValue([
        {
          id: '0001-missing',
          status: IncrementStatus.COMPLETED,
          type: 'feature',
          created: '2024-01-01',
          lastActivity: '2024-01-01',
        },
        {
          id: '0002-valid',
          status: IncrementStatus.COMPLETED,
          type: 'feature',
          created: '2024-01-02',
          lastActivity: '2024-01-02',
        },
      ]);

      mockReadStatus.mockImplementation(async (id: string) => {
        if (id === '0001-missing') return null; // Missing spec.md
        return IncrementStatus.COMPLETED;
      });

      const result = await validateStatusSync();

      expect(result.total).toBe(2);
      expect(result.synced).toBe(1); // 0002 synced, 0001 skipped
      expect(result.desynced).toBe(0);
    });

    it('should sort desyncs by severity (CRITICAL > HIGH > MEDIUM > LOW)', async () => {
      mockGetAll.mockReturnValue([
        { id: '0001-low', status: IncrementStatus.PLANNING, type: 'feature', created: '2024-01-01', lastActivity: '2024-01-01' },
        { id: '0002-critical', status: IncrementStatus.COMPLETED, type: 'feature', created: '2024-01-02', lastActivity: '2024-01-02' },
        { id: '0003-high', status: IncrementStatus.ACTIVE, type: 'feature', created: '2024-01-03', lastActivity: '2024-01-03' },
        { id: '0004-medium', status: IncrementStatus.PAUSED, type: 'feature', created: '2024-01-04', lastActivity: '2024-01-04' },
      ]);

      mockReadStatus.mockImplementation(async (id: string) => {
        if (id === '0001-low') return IncrementStatus.BACKLOG; // LOW
        if (id === '0002-critical') return IncrementStatus.ACTIVE; // CRITICAL
        if (id === '0003-high') return IncrementStatus.COMPLETED; // HIGH
        if (id === '0004-medium') return IncrementStatus.COMPLETED; // MEDIUM
        return IncrementStatus.ACTIVE;
      });

      const result = await validateStatusSync();

      expect(result.desyncs).toHaveLength(4);
      expect(result.desyncs[0].severity).toBe(DesyncSeverity.CRITICAL);
      expect(result.desyncs[1].severity).toBe(DesyncSeverity.HIGH);
      expect(result.desyncs[2].severity).toBe(DesyncSeverity.MEDIUM);
      expect(result.desyncs[3].severity).toBe(DesyncSeverity.LOW);
    });
  });

  describe('formatReport', () => {
    it('should format success report when no desyncs', () => {
      const result = {
        total: 10,
        synced: 10,
        desynced: 0,
        desyncs: [],
      };

      const report = formatReport(result);

      expect(report).toContain('Total increments scanned: 10');
      expect(report).toContain('Synced (✅): 10');
      expect(report).toContain('Desynced (❌): 0');
      expect(report).toContain('✅ All increments in sync');
    });

    it('should format desync report with all fields', () => {
      const result = {
        total: 2,
        synced: 0,
        desynced: 2,
        desyncs: [
          {
            incrementId: '0038-test',
            metadataStatus: IncrementStatus.COMPLETED,
            specStatus: IncrementStatus.ACTIVE,
            severity: DesyncSeverity.CRITICAL,
            impact: 'Status line broken',
            fix: 'npx specweave repair-status-desync 0038-test',
          },
        ],
      };

      const report = formatReport(result);

      expect(report).toContain('0038-test');
      expect(report).toContain('CRITICAL');
      expect(report).toContain('metadata.json: "completed"');
      expect(report).toContain('spec.md: "active"');
      expect(report).toContain('Status line broken');
      expect(report).toContain('npx specweave repair-status-desync');
    });

    it('should include repair instructions when desyncs found', () => {
      const result = {
        total: 1,
        synced: 0,
        desynced: 1,
        desyncs: [
          {
            incrementId: '0001-test',
            metadataStatus: IncrementStatus.COMPLETED,
            specStatus: IncrementStatus.ACTIVE,
            severity: DesyncSeverity.CRITICAL,
            impact: 'Test',
            fix: 'Test fix',
          },
        ],
      };

      const report = formatReport(result);

      expect(report).toContain('To repair all desyncs');
      expect(report).toContain('npx specweave repair-status-desync --all');
      expect(report).toContain('--dry-run');
    });
  });
});
