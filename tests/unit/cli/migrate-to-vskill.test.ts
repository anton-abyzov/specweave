/**
 * Unit tests for migrate-to-vskill command
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 *
 * Tests migration from claude plugin install to vskill lockfile:
 * - TC-023: Lockfile creation from installed plugins
 * - TC-024: Existing plugin files preserved
 * - TC-025: Init detects marketplace installation and offers migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks — must be declared before vi.mock calls
const {
  mockExistsSync,
  mockReaddirSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockStatSync,
  mockRmSync,
  mockHomedir,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockReaddirSync: vi.fn().mockReturnValue([]),
  mockReadFileSync: vi.fn().mockReturnValue(''),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockStatSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
  mockRmSync: vi.fn(),
  mockHomedir: vi.fn().mockReturnValue('/home/testuser'),
}));

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
  rmSync: mockRmSync,
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    statSync: mockStatSync,
    rmSync: mockRmSync,
  },
}));

vi.mock('node:os', () => ({
  homedir: mockHomedir,
  default: {
    homedir: mockHomedir,
  },
}));

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    default: actual,
  };
});

// Import AFTER mocks are set up
import { migrateToVskill, shouldOfferMigration } from '../../../src/cli/commands/migrate-to-vskill.js';

describe('migrate-to-vskill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHomedir.mockReturnValue('/home/testuser');
  });

  describe('TC-023: Lockfile creation from installed plugins', () => {
    it('should create vskill.lock with entries for all discovered plugin directories', () => {
      // Given: 5 plugin directories in ~/.claude/plugins/cache/specweave/
      const pluginDirs = ['sw', 'sw-frontend', 'sw-backend', 'sw-testing', 'sw-github'];

      // The cache directory exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        // Each plugin directory exists
        if (pluginDirs.some(d => p.endsWith(`/cache/specweave/${d}`))) return true;
        // No existing vskill.lock
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      // List plugin directories
      mockReaddirSync.mockImplementation((p: string, opts?: unknown) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return pluginDirs.map(name => ({
            name,
            isDirectory: () => true,
            isFile: () => false,
          }));
        }
        // Each plugin directory contains some files
        if (pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`))) {
          return [
            { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
            { name: 'hooks.json', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      // File contents for hash computation
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('SKILL.md')) return '# Skill content';
        if (typeof p === 'string' && p.endsWith('hooks.json')) return '{"hooks":[]}';
        return '';
      });

      mockStatSync.mockImplementation((p: string) => ({
        isDirectory: () => pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
        isFile: () => !pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
      }));

      // When: migrateToVskill() runs
      const result = migrateToVskill();

      // Then: vskill.lock is created with 5 entries
      expect(mockWriteFileSync).toHaveBeenCalled();

      // Parse the written lockfile
      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).endsWith('vskill.lock')
      );
      expect(writeCall).toBeDefined();

      const lockContent = JSON.parse(writeCall![1] as string);
      expect(lockContent.version).toBe(1);
      expect(Object.keys(lockContent.skills)).toHaveLength(5);

      // Each entry has a content hash (SHA-256)
      for (const name of pluginDirs) {
        const entry = lockContent.skills[name];
        expect(entry).toBeDefined();
        expect(entry.sha).toBeTruthy();
        expect(entry.sha).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
        expect(entry.marketplace).toBe('specweave');
        expect(entry.pluginDir).toBe(true);
        expect(entry.installedPath).toContain(`/cache/specweave/${name}`);
      }

      // Result should indicate success
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(5);
    });

    it('should handle empty cache directory gracefully', () => {
      // Given: cache directory exists but is empty
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);

      // When: migrateToVskill() runs
      const result = migrateToVskill();

      // Then: result indicates no plugins found
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
    });

    it('should handle missing cache directory gracefully', () => {
      // Given: no cache directory
      mockExistsSync.mockReturnValue(false);

      // When: migrateToVskill() runs
      const result = migrateToVskill();

      // Then: result indicates no plugins found
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
    });
  });

  describe('TC-024: Existing plugin files preserved', () => {
    it('should not delete or move any plugin files during migration', () => {
      // Given: plugins already cached at expected location
      const pluginDirs = ['sw', 'sw-frontend'];

      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (pluginDirs.some(d => p.endsWith(`/cache/specweave/${d}`))) return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return pluginDirs.map(name => ({
            name,
            isDirectory: () => true,
            isFile: () => false,
          }));
        }
        if (pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`))) {
          return [
            { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue('# content');
      mockStatSync.mockImplementation((p: string) => ({
        isDirectory: () => pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
        isFile: () => !pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
      }));

      // When: migration runs
      migrateToVskill();

      // Then: no plugin files are deleted or moved
      expect(mockRmSync).not.toHaveBeenCalled();

      // Verify writeFileSync is only called for vskill.lock, not for plugin files
      const writeCalls = mockWriteFileSync.mock.calls;
      for (const call of writeCalls) {
        const filePath = call[0] as string;
        expect(filePath).not.toContain('/cache/specweave/sw/');
        expect(filePath).not.toContain('/cache/specweave/sw-frontend/');
      }
    });
  });

  describe('TC-025: Detection of marketplace installation for migration', () => {
    it('should return true when marketplace plugins exist but no vskill.lock', () => {
      // Given: marketplace-based plugins installed (files exist in cache), no vskill.lock
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return [
            { name: 'sw', isDirectory: () => true, isFile: () => false },
            { name: 'sw-frontend', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [];
      });

      // When: detection check runs
      const result = shouldOfferMigration();

      // Then: returns true indicating migration is available
      expect(result).toBe(true);
    });

    it('should return false when vskill.lock already exists', () => {
      // Given: vskill.lock already exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return true;
        return false;
      });

      // When: detection check runs
      const result = shouldOfferMigration();

      // Then: returns false — already migrated
      expect(result).toBe(false);
    });

    it('should return false when no marketplace plugins exist', () => {
      // Given: no cache directory
      mockExistsSync.mockReturnValue(false);

      // When: detection check runs
      const result = shouldOfferMigration();

      // Then: returns false — nothing to migrate
      expect(result).toBe(false);
    });

    it('should return false when cache directory is empty', () => {
      // Given: cache exists but is empty
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);

      // When: detection check runs
      const result = shouldOfferMigration();

      // Then: returns false — nothing to migrate
      expect(result).toBe(false);
    });
  });

  describe('dry run mode', () => {
    it('should not write lockfile when dryRun is true', () => {
      // Given: plugins exist
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('/cache/specweave/sw')) return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return [{ name: 'sw', isDirectory: () => true, isFile: () => false }];
        }
        if (typeof p === 'string' && p.endsWith('/cache/specweave/sw')) {
          return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true }];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue('# content');
      mockStatSync.mockReturnValue({ isDirectory: () => true, isFile: () => false });

      // When: migration runs with dryRun
      const result = migrateToVskill({ dryRun: true });

      // Then: no file writes
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBeGreaterThan(0);
    });
  });
});
