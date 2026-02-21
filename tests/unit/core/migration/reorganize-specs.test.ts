/**
 * Reorganize Specs Unit Tests (TDD RED)
 *
 * Tests the --reorganize-specs execution logic: physically moving folders
 * and updating config.json with multiProject.enabled = true.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import path from 'path';
import os from 'os';
import {
  reorganizeSpecs,
  buildFeatureProjectMap,
  generateReorganizationPlan,
} from '../../../../src/core/migration/spec-project-mapper.js';
import type { ReorgOperation } from '../../../../src/core/migration/spec-project-mapper.js';

describe('reorganizeSpecs', () => {
  let testDir: string;
  let specweavePath: string;
  let specsDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `reorg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    specweavePath = path.join(testDir, '.specweave');
    specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');
    configPath = path.join(specweavePath, 'config.json');

    // Create base structure
    await fsPromises.mkdir(path.join(specsDir, 'specweave'), { recursive: true });
    await fsPromises.writeFile(
      configPath,
      JSON.stringify({
        version: '2.0',
        multiProject: { enabled: false },
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'specweave', path: 'repositories/anton-abyzov/specweave', prefix: 'SPE' },
            { id: 'vskill', path: 'repositories/anton-abyzov/vskill', prefix: 'VSK' },
            { id: 'vskill-platform', path: 'repositories/anton-abyzov/vskill-platform', prefix: 'VPL' },
          ],
        },
      }),
    );
  });

  afterEach(async () => {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  it('TC-011: moves FS-XXX folder to correct project directory', async () => {
    // Given a source folder and a plan with one move
    const srcDir = path.join(specsDir, 'specweave', 'FS-286');
    await fsPromises.mkdir(srcDir, { recursive: true });
    await fsPromises.writeFile(path.join(srcDir, 'FEATURE.md'), '# FS-286');

    const plan: ReorgOperation[] = [
      {
        featureId: 'FS-286',
        source: srcDir,
        destination: path.join(specsDir, 'vskill', 'FS-286'),
        type: 'move',
      },
    ];

    // When reorganizeSpecs is called with execute: true
    await reorganizeSpecs(plan, configPath, { execute: true });

    // Then the folder is moved and source no longer exists
    expect(fs.existsSync(path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'))).toBe(true);
    expect(fs.existsSync(srcDir)).toBe(false);
  });

  it('TC-012: creates target project directory if missing', async () => {
    // Given target specs/vskill/ does not exist
    const srcDir = path.join(specsDir, 'specweave', 'FS-286');
    await fsPromises.mkdir(srcDir, { recursive: true });
    await fsPromises.writeFile(path.join(srcDir, 'FEATURE.md'), '# FS-286');

    expect(fs.existsSync(path.join(specsDir, 'vskill'))).toBe(false);

    const plan: ReorgOperation[] = [
      {
        featureId: 'FS-286',
        source: srcDir,
        destination: path.join(specsDir, 'vskill', 'FS-286'),
        type: 'move',
      },
    ];

    await reorganizeSpecs(plan, configPath, { execute: true });

    // Then specs/vskill/ was created before the move
    expect(fs.existsSync(path.join(specsDir, 'vskill'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'))).toBe(true);
  });

  it('TC-013: sets multiProject.enabled to true in config.json', async () => {
    // Given multiProject.enabled: false in config
    const config = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    expect(config.multiProject.enabled).toBe(false);

    const plan: ReorgOperation[] = [];

    // When reorganizeSpecs() completes (even with empty plan)
    await reorganizeSpecs(plan, configPath, { execute: true });

    // Then config.json has multiProject.enabled: true
    const updated = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    expect(updated.multiProject.enabled).toBe(true);
  });

  it('TC-014: skips config update when multiProject already enabled', async () => {
    // Given multiProject.enabled: true already
    const config = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    config.multiProject.enabled = true;
    const originalJson = JSON.stringify(config, null, 2);
    await fsPromises.writeFile(configPath, originalJson);

    const plan: ReorgOperation[] = [];
    await reorganizeSpecs(plan, configPath, { execute: true });

    // Then config.json content is unchanged
    const afterJson = await fsPromises.readFile(configPath, 'utf-8');
    expect(afterJson).toBe(originalJson);
  });

  it('TC-015: handles cross-project copy operations', async () => {
    // Given FS-277 needs to be copied to multiple projects
    const srcDir = path.join(specsDir, 'specweave', 'FS-277');
    await fsPromises.mkdir(path.join(srcDir, 'assets'), { recursive: true });
    await fsPromises.writeFile(path.join(srcDir, 'FEATURE.md'), '# FS-277');
    await fsPromises.writeFile(path.join(srcDir, 'assets', 'img.png'), 'binary');

    const plan: ReorgOperation[] = [
      {
        featureId: 'FS-277',
        source: srcDir,
        destination: path.join(specsDir, 'vskill-platform', 'FS-277'),
        type: 'copy',
      },
      {
        featureId: 'FS-277',
        source: srcDir,
        destination: path.join(specsDir, 'vskill', 'FS-277'),
        type: 'copy',
      },
    ];

    await reorganizeSpecs(plan, configPath, { execute: true });

    // Then FS-277 exists in all three project directories
    expect(fs.existsSync(path.join(specsDir, 'specweave', 'FS-277', 'FEATURE.md'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'vskill-platform', 'FS-277', 'FEATURE.md'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'vskill', 'FS-277', 'FEATURE.md'))).toBe(true);
    // Assets copied too
    expect(fs.existsSync(path.join(specsDir, 'vskill-platform', 'FS-277', 'assets', 'img.png'))).toBe(true);
  });

  it('TC-016: dry-run mode does not move files or update config', async () => {
    const srcDir = path.join(specsDir, 'specweave', 'FS-286');
    await fsPromises.mkdir(srcDir, { recursive: true });
    await fsPromises.writeFile(path.join(srcDir, 'FEATURE.md'), '# FS-286');

    const plan: ReorgOperation[] = [
      {
        featureId: 'FS-286',
        source: srcDir,
        destination: path.join(specsDir, 'vskill', 'FS-286'),
        type: 'move',
      },
    ];

    // When execute: false (dry-run)
    await reorganizeSpecs(plan, configPath, { execute: false });

    // Then nothing changes
    expect(fs.existsSync(srcDir)).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'vskill', 'FS-286'))).toBe(false);
    const config = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    expect(config.multiProject.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-005: Post-reorganization verification tests
// ---------------------------------------------------------------------------

describe('Post-reorganization living-docs verification', () => {
  let testDir: string;
  let specweavePath: string;
  let specsDir: string;
  let configPath: string;
  let incrementsDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `reorg-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    specweavePath = path.join(testDir, '.specweave');
    specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');
    configPath = path.join(specweavePath, 'config.json');
    incrementsDir = path.join(specweavePath, 'increments');

    // Create base umbrella structure with multiple project folders (post-reorganization state)
    await fsPromises.mkdir(path.join(specsDir, 'specweave'), { recursive: true });
    await fsPromises.mkdir(path.join(specsDir, 'vskill'), { recursive: true });
    await fsPromises.mkdir(path.join(specsDir, 'vskill-platform'), { recursive: true });
    await fsPromises.mkdir(incrementsDir, { recursive: true });

    // Config with multiProject.enabled = true (post-reorganization)
    await fsPromises.writeFile(
      configPath,
      JSON.stringify({
        version: '2.0',
        multiProject: { enabled: true },
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'specweave', path: 'repositories/anton-abyzov/specweave', prefix: 'SPE' },
            { id: 'vskill', path: 'repositories/anton-abyzov/vskill', prefix: 'VSK' },
            { id: 'vskill-platform', path: 'repositories/anton-abyzov/vskill-platform', prefix: 'VPL' },
          ],
        },
      }),
    );
  });

  afterEach(async () => {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  it('TC-016b: sync-progress finds specs in per-project folders after reorganization', async () => {
    // Given specs reorganized to per-project folders
    // FS-286 under vskill/, FS-282 under vskill-platform/, FS-142 under specweave/
    await fsPromises.mkdir(path.join(specsDir, 'vskill', 'FS-286'), { recursive: true });
    await fsPromises.writeFile(path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'), '# FS-286');
    await fsPromises.mkdir(path.join(specsDir, 'vskill-platform', 'FS-282'), { recursive: true });
    await fsPromises.writeFile(path.join(specsDir, 'vskill-platform', 'FS-282', 'FEATURE.md'), '# FS-282');
    await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-142'), { recursive: true });
    await fsPromises.writeFile(path.join(specsDir, 'specweave', 'FS-142', 'FEATURE.md'), '# FS-142');

    // Create matching increments
    const inc286Dir = path.join(incrementsDir, '0286-vskill-install-ux');
    await fsPromises.mkdir(inc286Dir, { recursive: true });
    await fsPromises.writeFile(path.join(inc286Dir, 'metadata.json'), JSON.stringify({ feature_id: null }));
    await fsPromises.writeFile(
      path.join(inc286Dir, 'spec.md'),
      '# Feature: Install UX\n### US-001: Better install\n**Project**: vskill',
    );

    const inc282Dir = path.join(incrementsDir, '0282-repo-links');
    await fsPromises.mkdir(inc282Dir, { recursive: true });
    await fsPromises.writeFile(path.join(inc282Dir, 'metadata.json'), JSON.stringify({ feature_id: null }));
    await fsPromises.writeFile(
      path.join(inc282Dir, 'spec.md'),
      '# Feature: Repo Links\n### US-001: Show links\n**Project**: vskill-platform',
    );

    const inc142Dir = path.join(incrementsDir, '0142-some-feature');
    await fsPromises.mkdir(inc142Dir, { recursive: true });
    await fsPromises.writeFile(path.join(inc142Dir, 'metadata.json'), JSON.stringify({ feature_id: null }));
    await fsPromises.writeFile(
      path.join(inc142Dir, 'spec.md'),
      '# Feature: Some Feature\n### US-001: Do stuff\n**Project**: specweave',
    );

    // When we build the feature map and generate a plan
    const featureMap = await buildFeatureProjectMap(testDir);
    const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

    // Then each feature is correctly mapped to its project
    expect(featureMap.get('FS-286')).toEqual(['vskill']);
    expect(featureMap.get('FS-282')).toEqual(['vskill-platform']);
    expect(featureMap.get('FS-142')).toEqual(['specweave']);

    // And the plan has no operations for FS-142 (already in specweave/)
    // FS-286 and FS-282 are NOT under specweave/ so they have no source to move
    // (they are already in their correct per-project folders)
    expect(plan.length).toBe(0);
  });

  it('TC-017: living-docs builder recognizes multi-project structure with per-project spec folders', async () => {
    // Given multiProject.enabled = true in config
    const config = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    expect(config.multiProject.enabled).toBe(true);

    // And specs exist under per-project directories
    await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-142'), { recursive: true });
    await fsPromises.writeFile(
      path.join(specsDir, 'specweave', 'FS-142', 'FEATURE.md'),
      '# FS-142 Feature',
    );
    await fsPromises.mkdir(path.join(specsDir, 'vskill', 'FS-286'), { recursive: true });
    await fsPromises.writeFile(
      path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'),
      '# FS-286 Feature',
    );
    await fsPromises.mkdir(path.join(specsDir, 'vskill-platform', 'FS-282'), { recursive: true });
    await fsPromises.writeFile(
      path.join(specsDir, 'vskill-platform', 'FS-282', 'FEATURE.md'),
      '# FS-282 Feature',
    );

    // When scanning for feature folders in the multi-project structure
    const projectDirs = await fsPromises.readdir(specsDir, { withFileTypes: true });
    const foundSpecs: Record<string, string[]> = {};

    for (const dir of projectDirs) {
      if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
      const projectPath = path.join(specsDir, dir.name);
      const entries = await fsPromises.readdir(projectPath, { withFileTypes: true });
      const features = entries
        .filter((e) => e.isDirectory() && /^FS-\d+/.test(e.name))
        .map((e) => e.name);
      if (features.length > 0) {
        foundSpecs[dir.name] = features;
      }
    }

    // Then specs are found under each project subdirectory
    expect(foundSpecs).toEqual({
      specweave: ['FS-142'],
      vskill: ['FS-286'],
      'vskill-platform': ['FS-282'],
    });
  });

  it('TC-017b: full reorganization + verification cycle is idempotent', async () => {
    // Given a centralized structure (pre-reorganization) with multiProject disabled
    await fsPromises.writeFile(
      configPath,
      JSON.stringify({
        version: '2.0',
        multiProject: { enabled: false },
        umbrella: { enabled: true, childRepos: [] },
      }),
    );

    // Set up FS-286 under specweave/ (centralized)
    await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-286'), { recursive: true });
    await fsPromises.writeFile(
      path.join(specsDir, 'specweave', 'FS-286', 'FEATURE.md'),
      '# FS-286',
    );

    // Set up increment
    const incDir = path.join(incrementsDir, '0286-install-ux');
    await fsPromises.mkdir(incDir, { recursive: true });
    await fsPromises.writeFile(path.join(incDir, 'metadata.json'), JSON.stringify({ feature_id: null }));
    await fsPromises.writeFile(
      path.join(incDir, 'spec.md'),
      '# Feature: Install UX\n### US-001: Better install\n**Project**: vskill',
    );

    // Step 1: Build map and generate plan
    const featureMap = await buildFeatureProjectMap(testDir);
    const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');
    expect(plan.length).toBe(1);
    expect(plan[0].type).toBe('move');

    // Step 2: Execute reorganization
    await reorganizeSpecs(plan, configPath, { execute: true });

    // Verify move happened
    expect(fs.existsSync(path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'specweave', 'FS-286'))).toBe(false);

    // Verify config updated
    const updatedConfig = JSON.parse(await fsPromises.readFile(configPath, 'utf-8'));
    expect(updatedConfig.multiProject.enabled).toBe(true);

    // Step 3: Run again (idempotency check)
    const featureMap2 = await buildFeatureProjectMap(testDir);
    const plan2 = await generateReorganizationPlan(featureMap2, specsDir, 'specweave');

    // No operations needed on second run
    expect(plan2.length).toBe(0);
  });
});
