/**
 * Unit tests for feature-id-collision.ts
 *
 * Tests the collision detection system that prevents FS-XXX vs FS-XXXE conflicts.
 * Uses real filesystem temp dirs for accurate before/after state verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  findNextAvailableInternalId,
  findNextAvailableInternalIdSync,
  checkFeatureIdCollision,
  findNextAvailableUSId,
  isUSIdUsed,
  validateIncrementNumberUnique,
  findDuplicateIncrementNumbers,
  getAllProjectFSIds,
  findNextAvailableIdForProject,
} from '../../../src/utils/feature-id-collision.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-fid-collision-'));
});

afterEach(async () => {
  await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

/** Helper: create directory structure */
function mkdirp(relativePath: string): void {
  fs.mkdirSync(path.join(tmpDir, relativePath), { recursive: true });
}

/** Helper: write a file */
function writeFile(relativePath: string, content: string = ''): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
  debug: () => {},
};

describe('findNextAvailableInternalId', () => {
  it('should return baseNumber when project folder does not exist', async () => {
    const result = await findNextAvailableInternalId(1, tmpDir, 'nonexistent', { logger: silentLogger });
    expect(result).toBe(1);
  });

  it('should return baseNumber when no collisions exist', async () => {
    mkdirp('my-project');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(1);
  });

  it('should skip internal collision', async () => {
    mkdirp('my-project/FS-001');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(2);
  });

  it('should skip external collision (FS-001E)', async () => {
    mkdirp('my-project/FS-001E');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(2);
  });

  it('should skip both internal and external collisions', async () => {
    mkdirp('my-project/FS-001');
    mkdirp('my-project/FS-002E');
    mkdirp('my-project/FS-003');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(4);
  });

  it('should skip archived collisions', async () => {
    mkdirp('my-project/_archive/FS-001');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(2);
  });

  it('should skip orphan references', async () => {
    mkdirp('my-project/_orphans');
    writeFile('my-project/_orphans/us-001e-login.md', '---\nfeatureId: FS-001E\n---\n');
    const result = await findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger });
    expect(result).toBe(2);
  });

  it('should handle hierarchical project paths', async () => {
    mkdirp('acme/backend/FS-001');
    const result = await findNextAvailableInternalId(1, tmpDir, 'acme/backend', { logger: silentLogger });
    expect(result).toBe(2);
  });

  it('should throw on max iterations', async () => {
    // Create collisions for numbers 1-5
    for (let i = 1; i <= 5; i++) {
      mkdirp(`my-project/FS-${String(i).padStart(3, '0')}`);
    }
    await expect(
      findNextAvailableInternalId(1, tmpDir, 'my-project', { logger: silentLogger, maxIterations: 3 })
    ).rejects.toThrow(/Unable to find available feature ID/);
  });
});

describe('findNextAvailableInternalIdSync', () => {
  it('should return baseNumber when no collisions', () => {
    mkdirp('my-project');
    expect(findNextAvailableInternalIdSync(1, tmpDir, 'my-project', { logger: silentLogger })).toBe(1);
  });

  it('should skip collision', () => {
    mkdirp('my-project/FS-001E');
    expect(findNextAvailableInternalIdSync(1, tmpDir, 'my-project', { logger: silentLogger })).toBe(2);
  });
});

describe('checkFeatureIdCollision', () => {
  it('should report no collision when project folder missing', () => {
    const result = checkFeatureIdCollision(1, tmpDir, 'nonexistent');
    expect(result.hasCollision).toBe(false);
    expect(result.internalExists).toBe(false);
    expect(result.externalExists).toBe(false);
  });

  it('should detect internal collision', () => {
    mkdirp('my-project/FS-001');
    const result = checkFeatureIdCollision(1, tmpDir, 'my-project');
    expect(result.hasCollision).toBe(true);
    expect(result.internalExists).toBe(true);
    expect(result.externalExists).toBe(false);
  });

  it('should detect external collision', () => {
    mkdirp('my-project/FS-001E');
    const result = checkFeatureIdCollision(1, tmpDir, 'my-project');
    expect(result.hasCollision).toBe(true);
    expect(result.externalExists).toBe(true);
    expect(result.internalExists).toBe(false);
  });

  it('should detect archive collision', () => {
    mkdirp('my-project/_archive/FS-001');
    const result = checkFeatureIdCollision(1, tmpDir, 'my-project');
    expect(result.hasCollision).toBe(true);
    expect(result.archiveExists).toBe(true);
  });

  it('should detect orphan collision', () => {
    mkdirp('my-project/_orphans');
    writeFile('my-project/_orphans/FS-001E-item.md', '');
    const result = checkFeatureIdCollision(1, tmpDir, 'my-project');
    expect(result.hasCollision).toBe(true);
    expect(result.orphanHasId).toBe(true);
  });

  it('should report no collision for unused number', () => {
    mkdirp('my-project/FS-001');
    const result = checkFeatureIdCollision(2, tmpDir, 'my-project');
    expect(result.hasCollision).toBe(false);
  });
});

describe('findNextAvailableUSId', () => {
  it('should return 1 when project folder does not exist', () => {
    expect(findNextAvailableUSId(path.join(tmpDir, 'nonexistent'), { logger: silentLogger })).toBe(1);
  });

  it('should return 1 when no US files exist', () => {
    mkdirp('project/FS-001');
    expect(findNextAvailableUSId(path.join(tmpDir, 'project'), { logger: silentLogger })).toBe(1);
  });

  it('should return next after existing US file', () => {
    mkdirp('project/FS-001');
    writeFile('project/FS-001/us-001-login.md', '');
    writeFile('project/FS-001/us-002-signup.md', '');
    expect(findNextAvailableUSId(path.join(tmpDir, 'project'), { logger: silentLogger })).toBe(3);
  });

  it('should scan external features (US-XXXE)', () => {
    mkdirp('project/FS-001E');
    writeFile('project/FS-001E/us-005e-import.md', '');
    expect(findNextAvailableUSId(path.join(tmpDir, 'project'), { logger: silentLogger })).toBe(6);
  });

  it('should scan orphans folder', () => {
    mkdirp('project/_orphans');
    writeFile('project/_orphans/us-010-orphaned.md', '');
    expect(findNextAvailableUSId(path.join(tmpDir, 'project'), { logger: silentLogger })).toBe(11);
  });

  it('should scan archive folder', () => {
    mkdirp('project/_archive/FS-001');
    writeFile('project/_archive/FS-001/us-007-archived.md', '');
    expect(findNextAvailableUSId(path.join(tmpDir, 'project'), { logger: silentLogger })).toBe(8);
  });
});

describe('isUSIdUsed', () => {
  it('should return false for nonexistent project', () => {
    expect(isUSIdUsed(1, path.join(tmpDir, 'nonexistent'))).toBe(false);
  });

  it('should return true for used US-ID', () => {
    mkdirp('project/FS-001');
    writeFile('project/FS-001/us-003-feature.md', '');
    expect(isUSIdUsed(3, path.join(tmpDir, 'project'))).toBe(true);
  });

  it('should return false for unused US-ID', () => {
    mkdirp('project/FS-001');
    writeFile('project/FS-001/us-003-feature.md', '');
    expect(isUSIdUsed(5, path.join(tmpDir, 'project'))).toBe(false);
  });
});

describe('validateIncrementNumberUnique', () => {
  it('should return unique when increments folder missing', () => {
    const result = validateIncrementNumberUnique(1, path.join(tmpDir, 'nonexistent'));
    expect(result.isUnique).toBe(true);
  });

  it('should return unique for unused number', () => {
    mkdirp('increments/0001-feature-a');
    const result = validateIncrementNumberUnique(2, path.join(tmpDir, 'increments'));
    expect(result.isUnique).toBe(true);
  });

  it('should detect duplicate increment number', () => {
    mkdirp('increments/0001-feature-a');
    const result = validateIncrementNumberUnique(1, path.join(tmpDir, 'increments'));
    expect(result.isUnique).toBe(false);
    expect(result.existingIncrement).toBe('0001-feature-a');
  });

  it('should detect duplicate in archive', () => {
    mkdirp('increments/_archive/0001-old-feature');
    const result = validateIncrementNumberUnique(1, path.join(tmpDir, 'increments'));
    expect(result.isUnique).toBe(false);
    expect(result.existingIncrement).toContain('_archive');
  });

  it('should skip _archive folder in main scan', () => {
    mkdirp('increments/_archive');
    const result = validateIncrementNumberUnique(1, path.join(tmpDir, 'increments'));
    expect(result.isUnique).toBe(true);
  });
});

describe('findDuplicateIncrementNumbers', () => {
  it('should return empty map when no increments', () => {
    const result = findDuplicateIncrementNumbers(path.join(tmpDir, 'nonexistent'));
    expect(result.size).toBe(0);
  });

  it('should return empty map when no duplicates', () => {
    mkdirp('increments/0001-feature-a');
    mkdirp('increments/0002-feature-b');
    const result = findDuplicateIncrementNumbers(path.join(tmpDir, 'increments'));
    expect(result.size).toBe(0);
  });

  it('should detect duplicate increment numbers', () => {
    mkdirp('increments/0001-feature-a');
    mkdirp('increments/0001-feature-b');
    const result = findDuplicateIncrementNumbers(path.join(tmpDir, 'increments'));
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(expect.arrayContaining(['0001-feature-a', '0001-feature-b']));
  });
});

describe('getAllProjectFSIds', () => {
  it('should return empty set for nonexistent specs path', () => {
    const result = getAllProjectFSIds(path.join(tmpDir, 'nonexistent'), 'my-project');
    expect(result.size).toBe(0);
  });

  it('should find FS-IDs in 1-level structure', () => {
    mkdirp('specs/my-project/FS-001');
    mkdirp('specs/my-project/FS-003E');
    const result = getAllProjectFSIds(path.join(tmpDir, 'specs'), 'my-project');
    expect(result).toEqual(new Set([1, 3]));
  });

  it('should find FS-IDs in 2-level structure', () => {
    mkdirp('specs/board-1/my-project/FS-001');
    mkdirp('specs/board-2/my-project/FS-005');
    const result = getAllProjectFSIds(path.join(tmpDir, 'specs'), 'my-project');
    expect(result).toEqual(new Set([1, 5]));
  });

  it('should include archived FS-IDs', () => {
    mkdirp('specs/my-project/FS-001');
    mkdirp('specs/my-project/_archive/FS-002');
    const result = getAllProjectFSIds(path.join(tmpDir, 'specs'), 'my-project');
    expect(result).toEqual(new Set([1, 2]));
  });
});

describe('findNextAvailableIdForProject', () => {
  it('should return baseNumber when no IDs used', () => {
    const result = findNextAvailableIdForProject(1, path.join(tmpDir, 'specs'), 'my-project', { logger: silentLogger });
    expect(result).toBe(1);
  });

  it('should skip used IDs across multiple locations', () => {
    mkdirp('specs/my-project/FS-001');
    mkdirp('specs/board-1/my-project/FS-002');
    const result = findNextAvailableIdForProject(1, path.join(tmpDir, 'specs'), 'my-project', { logger: silentLogger });
    expect(result).toBe(3);
  });
});
