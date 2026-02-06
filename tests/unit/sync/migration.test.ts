import { describe, it, expect } from 'vitest';
import {
  planMigration,
  mapEToplatformSuffix,
  type MigrationPlan,
  type MigrationItem,
} from '../../../src/sync/migration.js';

describe('E-to-Platform Suffix Migration', () => {
  describe('mapEToplatformSuffix', () => {
    it('should map github source to G suffix (AC-US3-01)', () => {
      expect(mapEToplatformSuffix('github')).toBe('G');
    });

    it('should map jira source to J suffix (AC-US3-02)', () => {
      expect(mapEToplatformSuffix('jira')).toBe('J');
    });

    it('should map ado source to A suffix', () => {
      expect(mapEToplatformSuffix('ado')).toBe('A');
    });

    it('should return E for unknown source (AC-US3-03)', () => {
      expect(mapEToplatformSuffix('unknown')).toBe('E');
    });

    it('should return E for undefined source', () => {
      expect(mapEToplatformSuffix(undefined)).toBe('E');
    });
  });

  describe('planMigration', () => {
    it('should create migration plan from E-suffix items', () => {
      const items: MigrationItem[] = [
        { id: 'FS-042E', source: 'github', folderPath: '.specweave/increments/0042E-auth-flow' },
        { id: 'US-004E', source: 'jira', folderPath: undefined },
        { id: 'T-010E', source: 'ado', folderPath: undefined },
      ];

      const plan = planMigration(items);

      expect(plan.renames).toHaveLength(3);
      expect(plan.renames[0]).toEqual({
        oldId: 'FS-042E',
        newId: 'FS-042G',
        oldFolder: '.specweave/increments/0042E-auth-flow',
        newFolder: '.specweave/increments/0042G-auth-flow',
        source: 'github',
      });
      expect(plan.renames[1].newId).toBe('US-004J');
      expect(plan.renames[2].newId).toBe('T-010A');
    });

    it('should keep unknown source items as E with warning (AC-US3-03)', () => {
      const items: MigrationItem[] = [
        { id: 'FS-099E', source: 'unknown', folderPath: '.specweave/increments/0099E-mystery' },
      ];

      const plan = planMigration(items);
      expect(plan.renames).toHaveLength(0);
      expect(plan.warnings).toHaveLength(1);
      expect(plan.warnings[0]).toContain('FS-099E');
      expect(plan.warnings[0]).toContain('unknown');
    });

    it('should handle items without folders', () => {
      const items: MigrationItem[] = [
        { id: 'US-005E', source: 'github', folderPath: undefined },
      ];

      const plan = planMigration(items);
      expect(plan.renames[0].oldFolder).toBeUndefined();
      expect(plan.renames[0].newFolder).toBeUndefined();
    });

    it('should handle empty item list', () => {
      const plan = planMigration([]);
      expect(plan.renames).toHaveLength(0);
      expect(plan.warnings).toHaveLength(0);
    });

    it('should rename folder correctly preserving name part', () => {
      const items: MigrationItem[] = [
        { id: 'FS-010E', source: 'jira', folderPath: '.specweave/increments/0010E-user-auth-module' },
      ];

      const plan = planMigration(items);
      expect(plan.renames[0].newFolder).toBe('.specweave/increments/0010J-user-auth-module');
    });
  });
});
