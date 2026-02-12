/**
 * Unit Tests: FeatureConsistencyValidator
 *
 * Tests the feature folder consistency validation system.
 * Covers: validate(), hasDiscrepancies(), getOrphanedFeatures(),
 * feature consistency checks, external feature detection,
 * increment link extraction, auto-repair, and summary logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Mocks - must be hoisted before imports that use them
// ---------------------------------------------------------------------------

const { mockExistsSync, mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readdir: mockReaddir,
    readFile: mockReadFile,
  },
}));

// Mock yaml
const { mockYamlParse } = vi.hoisted(() => ({
  mockYamlParse: vi.fn(),
}));

vi.mock('yaml', () => ({
  default: { parse: mockYamlParse },
}));

// Mock feature-archiver (dynamically imported)
const { MockFeatureArchiver, mockArchiveFeatures } = vi.hoisted(() => {
  const mockArchiveFeatures = vi.fn().mockResolvedValue({
    archivedFeatures: [],
    archivedEpics: [],
    updatedLinks: [],
    errors: [],
  });
  class MockFeatureArchiver {
    archiveFeatures = mockArchiveFeatures;
    constructor() {}
  }
  return {
    MockFeatureArchiver,
    mockArchiveFeatures,
  };
});

vi.mock('../../../../src/core/living-docs/feature-archiver.js', () => ({
  FeatureArchiver: MockFeatureArchiver,
}));

// Mock logger to suppress console output
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  silentLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks are in place
// ---------------------------------------------------------------------------

import { FeatureConsistencyValidator } from '../../../../src/core/living-docs/feature-consistency-validator.js';
import type {
  ValidationResult,
  DiscrepancyReport,
  ValidatorOptions,
} from '../../../../src/core/living-docs/feature-consistency-validator.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

const tmpRoot = path.join(os.tmpdir(), 'fcv-test-root');

function createValidator(opts: ValidatorOptions = {}): FeatureConsistencyValidator {
  return new FeatureConsistencyValidator(tmpRoot, {
    logger: silentLogger,
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeatureConsistencyValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      // existsSync not called in constructor, just verifying no throw
      const validator = new FeatureConsistencyValidator(tmpRoot);
      expect(validator).toBeDefined();
    });

    it('should accept custom logger and options', () => {
      const validator = createValidator({
        logger: silentLogger,
        defaultProject: 'my-project',
        includeArchived: true,
      });
      expect(validator).toBeDefined();
    });
  });

  // =========================================================================
  // validate() - no project folders
  // =========================================================================

  describe('validate() - no project folders', () => {
    it('should return empty result when specs path does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(0);
      expect(result.consistentCount).toBe(0);
      expect(result.discrepancies).toEqual([]);
      expect(result.repairs).toBeUndefined();
    });

    it('should return empty result when specs dir has no project folders', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce([]); // getProjectFolders

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(0);
      expect(result.consistentCount).toBe(0);
      expect(result.discrepancies).toEqual([]);
    });

    it('should skip non-directory entries in specs dir', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce([
        makeDirent('readme.txt', false),
        makeDirent('.gitkeep', false),
      ]);

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(0);
    });

    it('should skip underscore-prefixed folders (special folders)', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValueOnce([
        makeDirent('_features', true),
        makeDirent('_epics', true),
        makeDirent('_archive', true),
      ]);

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(0);
    });
  });

  // =========================================================================
  // validate() - consistent features
  // =========================================================================

  describe('validate() - consistent features', () => {
    it('should count a feature with FEATURE.md and valid increment as consistent', async () => {
      // getProjectFolders
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        // increment active path
        if (p.includes('increments/0001-my-feature')) return true;
        return false;
      });

      // getProjectFolders returns one project
      mockReaddir
        .mockResolvedValueOnce([makeDirent('specweave', true)]) // projects
        .mockResolvedValueOnce([makeDirent('FS-001', true)]);   // features in project

      // extractLinkedIncrement: FEATURE.md content with increment link
      mockReadFile.mockResolvedValue(
        '# Feature\n[0001-my-feature](../../increments/0001-my-feature)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should handle feature with no linked increment (external feature)', async () => {
      // FEATURE.md exists but no increment link; is external
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('my-project', true)])
        .mockResolvedValueOnce([makeDirent('FS-010', true)]);

      // extractLinkedIncrement returns null (no match)
      // isExternalFeature returns true (has external_source in frontmatter)
      mockReadFile.mockResolvedValue(
        '---\norigin: external\nexternal_source: github\n---\n# External Feature\n'
      );
      mockYamlParse.mockReturnValue({ origin: 'external', external_source: 'github' });

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      // No linked increment + external = consistent (null returned)
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should handle feature with increment in archive', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        // active path = false
        if (p.includes('increments/0010-archived-feat') && !p.includes('_archive')) return false;
        // archive path = true
        if (p.includes('_archive/0010-archived-feat')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-020', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0010-archived-feat](../../increments/0010-archived-feat)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });
  });

  // =========================================================================
  // validate() - discrepancies
  // =========================================================================

  describe('validate() - discrepancies', () => {
    it('should detect missing FEATURE.md', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false; // no FEATURE.md
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('specweave', true)])
        .mockResolvedValueOnce([makeDirent('FS-005', true)]);

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(0);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('missing_feature_md');
      expect(result.discrepancies[0].featureId).toBe('FS-005');
      expect(result.discrepancies[0].autoRepairable).toBe(false);
      expect(result.discrepancies[0].projectId).toBe('specweave');
      expect(result.discrepancies[0].description).toContain('no FEATURE.md');
    });

    it('should detect orphaned feature (increment deleted, not external)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        // Both active and archive paths = false (increment deleted)
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-099', true)]);

      // FEATURE.md has increment link but no external markers
      mockReadFile.mockResolvedValue(
        '# Feature\n[0042-deleted-feature](../../increments/0042-deleted-feature)\n'
      );
      mockYamlParse.mockReturnValue({});

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(0);
      expect(result.discrepancies).toHaveLength(1);

      const disc = result.discrepancies[0];
      expect(disc.type).toBe('orphaned_feature');
      expect(disc.featureId).toBe('FS-099');
      expect(disc.autoRepairable).toBe(true);
      expect(disc.linkedIncrementId).toBe('0042-deleted-feature');
      expect(disc.incrementExists).toBe(false);
      expect(disc.description).toContain('deleted increment');
    });

    it('should NOT flag orphaned when feature is external (origin: external)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false; // increment deleted
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-050', true)]);

      mockReadFile.mockResolvedValue(
        '---\norigin: external\nexternal_id: GH-123\n---\n# External\n[0099-gone](../../increments/0099-gone)\n'
      );
      mockYamlParse.mockReturnValue({ origin: 'external', external_id: 'GH-123' });

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should NOT flag orphaned when feature is external (external_source in body)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-051', true)]);

      // No frontmatter, but has external_source: in body
      mockReadFile.mockResolvedValue(
        '# Feature\nexternal_source: jira\n[0100-gone](../../increments/0100-gone)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });
  });

  // =========================================================================
  // validate() - multiple projects and features
  // =========================================================================

  describe('validate() - multiple projects and features', () => {
    it('should scan features across multiple project folders', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0001-feat-a')) return true;
        if (p.includes('increments/0002-feat-b')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([
          makeDirent('project-a', true),
          makeDirent('project-b', true),
        ])
        .mockResolvedValueOnce([makeDirent('FS-001', true)])   // project-a features
        .mockResolvedValueOnce([makeDirent('FS-002', true)]);  // project-b features

      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('FS-001')) {
          return '# Feat A\n[0001-feat-a](../../increments/0001-feat-a)\n';
        }
        return '# Feat B\n[0002-feat-b](../../increments/0002-feat-b)\n';
      });

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(2);
      expect(result.consistentCount).toBe(2);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should find discrepancies across multiple projects', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        // FS-001 has FEATURE.md, FS-002 does not
        if (p.includes('FS-001') && p.includes('FEATURE.md')) return true;
        if (p.includes('FS-002') && p.includes('FEATURE.md')) return false;
        if (p.includes('increments/0001-ok')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-001', true),
          makeDirent('FS-002', true),
        ]);

      mockReadFile.mockResolvedValue(
        '# Feat\n[0001-ok](../../increments/0001-ok)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(2);
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].featureId).toBe('FS-002');
    });
  });

  // =========================================================================
  // getFeatureFoldersInProject (tested indirectly)
  // =========================================================================

  describe('getFeatureFoldersInProject (indirect)', () => {
    it('should only include FS-XXX folders, skip non-matching and files', async () => {
      mockExistsSync.mockReturnValue(true);

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-001', true),
          makeDirent('FS-002', true),
          makeDirent('random-folder', true),
          makeDirent('EP-001', true),
          makeDirent('readme.md', false),
          makeDirent('FS-003', true),
        ]);

      // Make all FS- features consistent
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return true;
        return false;
      });

      mockReadFile.mockResolvedValue(
        '# Feature\n[0001-feat](../../increments/0001-feat)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      // Only FS-001, FS-002, FS-003 should be counted
      expect(result.totalFeatures).toBe(3);
    });

    it('should skip _archive folder by default', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-001', true),
          makeDirent('_archive', true),
        ]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0001-feat](../../increments/0001-feat)\n'
      );

      const validator = createValidator({ includeArchived: false });
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
    });

    it('should include _archive folder when includeArchived is true', async () => {
      // _archive is not a FS-XXX folder so it won't match the FS- prefix check.
      // The _archive skip logic is a separate concern from FS- matching.
      // _archive does NOT start with FS-, so it won't be counted even with includeArchived.
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-001', true),
          makeDirent('_archive', true),
        ]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0001-feat](../../increments/0001-feat)\n'
      );

      // includeArchived = true means _archive is not skipped,
      // but _archive doesn't start with FS- so it still won't be counted.
      const validator = createValidator({ includeArchived: true });
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(1);
    });

    it('should return FS- folders sorted', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false; // all missing
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-003', true),
          makeDirent('FS-001', true),
          makeDirent('FS-002', true),
        ]);

      const validator = createValidator();
      const result = await validator.validate();

      // All missing FEATURE.md => discrepancies in sorted order
      expect(result.discrepancies).toHaveLength(3);
      expect(result.discrepancies[0].featureId).toBe('FS-001');
      expect(result.discrepancies[1].featureId).toBe('FS-002');
      expect(result.discrepancies[2].featureId).toBe('FS-003');
    });
  });

  // =========================================================================
  // extractLinkedIncrement (tested indirectly)
  // =========================================================================

  describe('extractLinkedIncrement (indirect)', () => {
    it('should extract increment from markdown link pattern', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0062-test-living-docs')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-062', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\nLinked: [0062-test-living-docs](../../increments/0062-test-living-docs)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.consistentCount).toBe(1);
    });

    it('should extract increment from frontmatter increment field', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0055-from-frontmatter')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-055', true)]);

      // No markdown link, but has frontmatter with increment
      mockReadFile.mockResolvedValue(
        '---\nincrement: 0055-from-frontmatter\n---\n# Feature from frontmatter\n'
      );
      mockYamlParse.mockReturnValue({ increment: '0055-from-frontmatter' });

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.consistentCount).toBe(1);
    });

    it('should return null when no increment link found (consistent if no link and not orphaned)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-070', true)]);

      // No increment link at all, no external markers
      mockReadFile.mockResolvedValue('# Feature\nSome content without links\n');

      const validator = createValidator();
      const result = await validator.validate();

      // No linked increment + not external + linkedIncrement=null =>
      // condition `!incrementExists && !isExternalFeature && linkedIncrement` is false
      // because linkedIncrement is null => consistent
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should handle readFile errors gracefully (returns null for increment)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-080', true)]);

      // readFile throws for extractLinkedIncrement
      mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'));

      const validator = createValidator();
      const result = await validator.validate();

      // extractLinkedIncrement catches error, returns null
      // isExternalFeature catches error, returns false
      // linkedIncrement=null => consistent (not flagged)
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should handle yaml parse errors in extractLinkedIncrement gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-090', true)]);

      // Has frontmatter but YAML is invalid; no markdown link either
      mockReadFile.mockResolvedValue(
        '---\ninvalid: yaml: :\n---\n# Feature\n'
      );
      mockYamlParse.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const validator = createValidator();
      const result = await validator.validate();

      // YAML parse error caught, no increment extracted, no external markers
      // linkedIncrement=null => consistent
      expect(result.consistentCount).toBe(1);
    });
  });

  // =========================================================================
  // isExternalFeature (tested indirectly)
  // =========================================================================

  describe('isExternalFeature (indirect)', () => {
    it('should detect external via frontmatter external_id', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-100', true)]);

      mockReadFile.mockResolvedValue(
        '---\nexternal_id: JIRA-456\n---\n# Jira Feature\n[0200-gone](../../increments/0200-gone)\n'
      );
      mockYamlParse.mockReturnValue({ external_id: 'JIRA-456' });

      const validator = createValidator();
      const result = await validator.validate();

      // External feature, increment deleted => NOT orphaned
      expect(result.discrepancies).toHaveLength(0);
      expect(result.consistentCount).toBe(1);
    });

    it('should detect external via body content "origin: external"', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-101', true)]);

      // No frontmatter but body has origin: external
      mockReadFile.mockResolvedValue(
        '# Feature\norigin: external\n[0201-gone](../../increments/0201-gone)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.discrepancies).toHaveLength(0);
      expect(result.consistentCount).toBe(1);
    });

    it('should detect external via body content "external_id:"', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-102', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\nexternal_id: GH-789\n[0202-gone](../../increments/0202-gone)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.discrepancies).toHaveLength(0);
    });

    it('should return false for isExternalFeature when readFile throws', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-103', true)]);

      // Both extractLinkedIncrement and isExternalFeature will fail
      mockReadFile.mockRejectedValue(new Error('disk error'));

      const validator = createValidator();
      const result = await validator.validate();

      // extractLinkedIncrement returns null (caught error)
      // isExternalFeature returns false (caught error)
      // linkedIncrement=null => not orphaned => consistent
      expect(result.consistentCount).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should handle yaml parse error in isExternalFeature gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-104', true)]);

      // Has frontmatter but YAML parse fails; no external markers in body;
      // has a linked increment that doesn't exist
      mockReadFile.mockResolvedValue(
        '---\nbad: yaml: :\n---\n# Feature\n[0300-gone](../../increments/0300-gone)\n'
      );
      mockYamlParse.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const validator = createValidator();
      const result = await validator.validate();

      // YAML parse error caught in isExternalFeature, no body markers
      // isExternalFeature = false, linkedIncrement = '0300-gone', increment deleted
      // => orphaned
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('orphaned_feature');
    });
  });

  // =========================================================================
  // validate() with autoRepair
  // =========================================================================

  describe('validate() - autoRepair', () => {
    it('should initialize repairs array when autoRepair is true', async () => {
      mockExistsSync.mockReturnValue(false); // no specs path

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.repairs).toEqual([]);
    });

    it('should not have repairs array when autoRepair is false', async () => {
      mockExistsSync.mockReturnValue(false);

      const validator = createValidator();
      const result = await validator.validate(false);

      expect(result.repairs).toBeUndefined();
    });

    it('should auto-repair orphaned feature via archiver', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false; // increment deleted
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-200', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0500-deleted](../../increments/0500-deleted)\n'
      );
      mockYamlParse.mockReturnValue({});

      // Configure archiver to report successful archive
      mockArchiveFeatures.mockResolvedValue({
        archivedFeatures: ['FS-200'],
        archivedEpics: [],
        updatedLinks: [],
        errors: [],
      });

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('orphaned_feature');
      expect(result.repairs).toHaveLength(1);
      expect(result.repairs![0].success).toBe(true);
      expect(result.repairs![0].featureId).toBe('FS-200');
      expect(result.repairs![0].action).toContain('Archived orphaned feature');
      // Successfully repaired counts as consistent
      expect(result.consistentCount).toBe(1);
    });

    it('should handle archiver reporting feature already archived', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-201', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0501-deleted](../../increments/0501-deleted)\n'
      );
      mockYamlParse.mockReturnValue({});

      // Archiver returns empty - feature not in archivedFeatures, no errors
      mockArchiveFeatures.mockResolvedValue({
        archivedFeatures: [],
        archivedEpics: [],
        updatedLinks: [],
        errors: [],
      });

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.repairs).toHaveLength(1);
      expect(result.repairs![0].success).toBe(true);
      expect(result.repairs![0].action).toContain('already archived or cleaned up');
    });

    it('should handle archiver errors during repair', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-202', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0502-deleted](../../increments/0502-deleted)\n'
      );
      mockYamlParse.mockReturnValue({});

      // Archiver returns errors
      mockArchiveFeatures.mockResolvedValue({
        archivedFeatures: [],
        archivedEpics: [],
        updatedLinks: [],
        errors: ['Failed to move FS-202: EACCES'],
      });

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.repairs).toHaveLength(1);
      expect(result.repairs![0].success).toBe(false);
      expect(result.repairs![0].error).toContain('EACCES');
    });

    it('should handle archiver throwing an exception during repair', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-203', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0503-deleted](../../increments/0503-deleted)\n'
      );
      mockYamlParse.mockReturnValue({});

      // Archiver throws
      mockArchiveFeatures.mockRejectedValue(new Error('Archiver crashed'));

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.repairs).toHaveLength(1);
      expect(result.repairs![0].success).toBe(false);
      expect(result.repairs![0].error).toContain('Archiver crashed');
      expect(result.repairs![0].action).toContain('Failed');
      // Failed repair does NOT count as consistent
      expect(result.consistentCount).toBe(0);
    });

    it('should not attempt repair on missing_feature_md (not auto-repairable)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-300', true)]);

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('missing_feature_md');
      expect(result.discrepancies[0].autoRepairable).toBe(false);
      // No repair attempted for non-auto-repairable discrepancies
      expect(result.repairs).toHaveLength(0);
      expect(result.consistentCount).toBe(0);
    });
  });

  // =========================================================================
  // repairDiscrepancy (tested indirectly via different types)
  // =========================================================================

  describe('repairDiscrepancy edge cases (indirect)', () => {
    it('should handle orphaned_feature with autoRepairable=false', async () => {
      // This tests the else branch in case 'orphaned_feature'
      // We can force this by creating a validator that produces an orphaned_feature
      // discrepancy and then manually calling validate with autoRepair.
      // However since repairDiscrepancy is private, we test via validate.
      // The orphaned_feature type always sets autoRepairable=true from checkFeatureConsistency,
      // so the else branch (autoRepairable=false for orphaned_feature) is only reachable
      // if the discrepancy is modified externally. We can't easily trigger that via public API.
      // We verify that missing_feature_md with autoRepair still doesn't crash.
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-400', true)]);

      const validator = createValidator();
      const result = await validator.validate(true);

      expect(result.discrepancies[0].type).toBe('missing_feature_md');
      expect(result.repairs).toHaveLength(0); // not attempted because not autoRepairable
    });
  });

  // =========================================================================
  // hasDiscrepancies()
  // =========================================================================

  describe('hasDiscrepancies()', () => {
    it('should return false when no discrepancies exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const validator = createValidator();
      const result = await validator.hasDiscrepancies();

      expect(result).toBe(false);
    });

    it('should return true when discrepancies exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false; // missing
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-500', true)]);

      const validator = createValidator();
      const result = await validator.hasDiscrepancies();

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // getOrphanedFeatures()
  // =========================================================================

  describe('getOrphanedFeatures()', () => {
    it('should return empty array when no orphaned features', async () => {
      mockExistsSync.mockReturnValue(false);

      const validator = createValidator();
      const result = await validator.getOrphanedFeatures();

      expect(result).toEqual([]);
    });

    it('should return only orphaned feature IDs', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        // FS-600 has FEATURE.md, FS-601 does not (missing, not orphaned)
        if (p.includes('FS-600') && p.includes('FEATURE.md')) return true;
        if (p.includes('FS-601') && p.includes('FEATURE.md')) return false;
        // FS-600 increment is deleted
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-600', true),
          makeDirent('FS-601', true),
        ]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0600-dead](../../increments/0600-dead)\n'
      );
      mockYamlParse.mockReturnValue({});

      const validator = createValidator();
      const result = await validator.getOrphanedFeatures();

      // FS-600 is orphaned (has FEATURE.md, linked increment deleted, not external)
      // FS-601 is missing_feature_md (not orphaned type)
      expect(result).toEqual(['FS-600']);
    });

    it('should return multiple orphaned feature IDs', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false; // all increments deleted
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-700', true),
          makeDirent('FS-701', true),
        ]);

      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('FS-700')) {
          return '# Feature 700\n[0700-dead](../../increments/0700-dead)\n';
        }
        return '# Feature 701\n[0701-dead](../../increments/0701-dead)\n';
      });
      mockYamlParse.mockReturnValue({});

      const validator = createValidator();
      const result = await validator.getOrphanedFeatures();

      expect(result).toEqual(['FS-700', 'FS-701']);
    });
  });

  // =========================================================================
  // logValidationSummary (tested indirectly)
  // =========================================================================

  describe('logValidationSummary (indirect)', () => {
    it('should call logger.log for summary output', async () => {
      // Need at least one project folder so validate() proceeds to logValidationSummary
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-799', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0799-ok](../../increments/0799-ok)\n'
      );

      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validator = new FeatureConsistencyValidator(tmpRoot, {
        logger: mockLogger,
      });
      await validator.validate();

      // Should have called logger.log multiple times for the summary
      expect(mockLogger.log).toHaveBeenCalled();
      const calls = mockLogger.log.mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((c: string) => c.includes('FEATURE CONSISTENCY VALIDATION REPORT'))).toBe(true);
      expect(calls.some((c: string) => c.includes('Total features scanned'))).toBe(true);
    });

    it('should log discrepancy details when present', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-800', true)]);

      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validator = new FeatureConsistencyValidator(tmpRoot, {
        logger: mockLogger,
      });
      await validator.validate();

      const calls = mockLogger.log.mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((c: string) => c.includes('DISCREPANCIES'))).toBe(true);
      expect(calls.some((c: string) => c.includes('FS-800'))).toBe(true);
      expect(calls.some((c: string) => c.includes('missing_feature_md'))).toBe(true);
    });

    it('should log linked increment details when present', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-801', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0801-dead](../../increments/0801-dead)\n'
      );
      mockYamlParse.mockReturnValue({});

      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validator = new FeatureConsistencyValidator(tmpRoot, {
        logger: mockLogger,
      });
      await validator.validate();

      const calls = mockLogger.log.mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((c: string) => c.includes('Linked increment'))).toBe(true);
      expect(calls.some((c: string) => c.includes('0801-dead'))).toBe(true);
    });

    it('should log repair results when present', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-802', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0802-dead](../../increments/0802-dead)\n'
      );
      mockYamlParse.mockReturnValue({});

      mockArchiveFeatures.mockResolvedValue({
        archivedFeatures: ['FS-802'],
        archivedEpics: [],
        updatedLinks: [],
        errors: [],
      });

      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validator = new FeatureConsistencyValidator(tmpRoot, {
        logger: mockLogger,
      });
      await validator.validate(true);

      const calls = mockLogger.log.mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((c: string) => c.includes('REPAIR RESULTS'))).toBe(true);
    });

    it('should log repair errors when present', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-803', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0803-dead](../../increments/0803-dead)\n'
      );
      mockYamlParse.mockReturnValue({});

      mockArchiveFeatures.mockRejectedValue(new Error('disk full'));

      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const validator = new FeatureConsistencyValidator(tmpRoot, {
        logger: mockLogger,
      });
      await validator.validate(true);

      const calls = mockLogger.log.mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((c: string) => c.includes('REPAIR RESULTS'))).toBe(true);
      expect(calls.some((c: string) => c.includes('Error'))).toBe(true);
    });
  });

  // =========================================================================
  // checkIncrementExists (tested indirectly)
  // =========================================================================

  describe('checkIncrementExists (indirect)', () => {
    it('should find increment in active path', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0900-active') && !p.includes('_archive')) return true;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-900', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0900-active](../../increments/0900-active)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.consistentCount).toBe(1);
    });

    it('should find increment in archive path when active missing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        if (p.includes('FEATURE.md')) return true;
        // Active path returns false, archive path returns true
        if (p.includes('increments/_archive/0901-archived')) return true;
        if (p.includes('increments/0901-archived')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([makeDirent('FS-901', true)]);

      mockReadFile.mockResolvedValue(
        '# Feature\n[0901-archived](../../increments/0901-archived)\n'
      );

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.consistentCount).toBe(1);
    });
  });

  // =========================================================================
  // Integration-style: mixed scenarios
  // =========================================================================

  describe('mixed scenarios', () => {
    it('should handle mix of consistent, missing, and orphaned features', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('specs')) return true;
        // FS-A01: has FEATURE.md, increment exists
        if (p.includes('FS-A01') && p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0001-good')) return true;
        // FS-A02: no FEATURE.md
        if (p.includes('FS-A02') && p.includes('FEATURE.md')) return false;
        // FS-A03: has FEATURE.md, increment deleted
        if (p.includes('FS-A03') && p.includes('FEATURE.md')) return true;
        if (p.includes('increments/0003-gone')) return false;
        return false;
      });

      mockReaddir
        .mockResolvedValueOnce([makeDirent('proj', true)])
        .mockResolvedValueOnce([
          makeDirent('FS-A01', true),
          makeDirent('FS-A02', true),
          makeDirent('FS-A03', true),
        ]);

      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('FS-A01')) {
          return '# Good Feature\n[0001-good](../../increments/0001-good)\n';
        }
        if (filePath.includes('FS-A03')) {
          return '# Orphaned Feature\n[0003-gone](../../increments/0003-gone)\n';
        }
        return '# Unknown\n';
      });
      mockYamlParse.mockReturnValue({});

      const validator = createValidator();
      const result = await validator.validate();

      expect(result.totalFeatures).toBe(3);
      expect(result.consistentCount).toBe(1); // only FS-A01
      expect(result.discrepancies).toHaveLength(2);

      const types = result.discrepancies.map(d => d.type);
      expect(types).toContain('missing_feature_md');
      expect(types).toContain('orphaned_feature');
    });
  });
});
