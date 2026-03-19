/**
 * Unit tests for type simplification (increment 0581, T-008)
 *
 * TDD red phase: These tests assert the simplified type shapes.
 * Before T-001 through T-007, these tests FAIL (red).
 * After T-001 through T-007, they PASS (green).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../../../../src');

describe('Type simplification (0581)', () => {
  describe('RepositoryHosting in init/types.ts', () => {
    const filePath = path.join(SRC_ROOT, 'cli/helpers/init/types.ts');

    it('should NOT contain -single suffix values', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Match type definition block for RepositoryHosting
      const typeBlock = extractTypeBlock(content, 'RepositoryHosting');
      expect(typeBlock).not.toContain('-single');
    });

    it('should NOT contain -multirepo suffix values', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepositoryHosting');
      expect(typeBlock).not.toContain('-multirepo');
    });

    it('should contain exactly github, bitbucket, ado, local, other', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepositoryHosting');
      expect(typeBlock).toContain("'github'");
      expect(typeBlock).toContain("'bitbucket'");
      expect(typeBlock).toContain("'ado'");
      expect(typeBlock).toContain("'local'");
      expect(typeBlock).toContain("'other'");
    });
  });

  describe('RepositoryHosting in issue-tracker/types.ts', () => {
    const filePath = path.join(SRC_ROOT, 'cli/helpers/issue-tracker/types.ts');

    it('should NOT contain -single suffix values', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepositoryHosting');
      expect(typeBlock).not.toContain('-single');
    });

    it('should NOT contain -multirepo suffix values', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepositoryHosting');
      expect(typeBlock).not.toContain('-multirepo');
    });
  });

  describe('RepoArchitecture in repo-structure-manager.ts', () => {
    const filePath = path.join(SRC_ROOT, 'core/repo-structure/repo-structure-manager.ts');

    it('should NOT contain single as a value', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepoArchitecture');
      // Must not have 'single' as a standalone union member
      // But 'multi-repo' contains 'single' as substring, so check carefully
      const members = typeBlock.match(/'[^']+'/g) || [];
      expect(members).not.toContain("'single'");
    });

    it('should contain multi-repo, monorepo, parent', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'RepoArchitecture');
      expect(typeBlock).toContain("'multi-repo'");
      expect(typeBlock).toContain("'monorepo'");
      expect(typeBlock).toContain("'parent'");
    });
  });

  describe('SetupArchitecture in setup-state-manager.ts', () => {
    const filePath = path.join(SRC_ROOT, 'core/repo-structure/setup-state-manager.ts');

    it('should NOT contain single as a value', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'SetupArchitecture');
      const members = typeBlock.match(/'[^']+'/g) || [];
      expect(members).not.toContain("'single'");
    });

    it('should contain multi-repo, parent, monorepo', () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const typeBlock = extractTypeBlock(content, 'SetupArchitecture');
      expect(typeBlock).toContain("'multi-repo'");
      expect(typeBlock).toContain("'parent'");
      expect(typeBlock).toContain("'monorepo'");
    });
  });

  describe('single-project-migrator.ts should not exist', () => {
    it('should be deleted', () => {
      const filePath = path.join(SRC_ROOT, 'core/config/single-project-migrator.ts');
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('config-manager.ts should not import single-project-migrator', () => {
    it('should not reference single-project-migrator', () => {
      const filePath = path.join(SRC_ROOT, 'core/config/config-manager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('single-project-migrator');
      expect(content).not.toContain('detectAndMigrateSingleProject');
    });
  });

  describe('init.ts should not have isMultiRepo or multiProject.enabled write', () => {
    it('should not declare isMultiRepo', () => {
      const filePath = path.join(SRC_ROOT, 'cli/commands/init.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toMatch(/let\s+isMultiRepo/);
    });

    it('should not write multiProject.enabled', () => {
      const filePath = path.join(SRC_ROOT, 'cli/commands/init.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('multiProject');
    });
  });
});

/**
 * Extract a type alias block from source content.
 * Matches: export type Name = ...;
 */
function extractTypeBlock(content: string, typeName: string): string {
  const regex = new RegExp(`export\\s+type\\s+${typeName}\\s*=[^;]+;`, 's');
  const match = content.match(regex);
  return match ? match[0] : '';
}
