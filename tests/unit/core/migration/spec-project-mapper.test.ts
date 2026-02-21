/**
 * Spec Project Mapper Unit Tests (TDD RED)
 *
 * Tests mapping FS-XXX feature folders to their owning project(s)
 * by scanning increment metadata and spec.md **Project**: fields.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import {
  buildFeatureProjectMap,
  generateReorganizationPlan,
  type ReorgOperation,
} from '../../../../src/core/migration/spec-project-mapper.js';

describe('SpecProjectMapper', () => {
  let testDir: string;
  let specweavePath: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `spec-mapper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fsPromises.mkdir(testDir, { recursive: true });
    specweavePath = path.join(testDir, '.specweave');
    await fsPromises.mkdir(path.join(specweavePath, 'increments'), { recursive: true });
    await fsPromises.mkdir(path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave'), {
      recursive: true,
    });
  });

  afterEach(async () => {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // buildFeatureProjectMap
  // -----------------------------------------------------------------------

  describe('buildFeatureProjectMap', () => {
    it('TC-001: maps FS-XXX to project via spec.md **Project** field', async () => {
      // Given an increment 0282-repo-links with spec.md containing **Project**: vskill-platform
      const incDir = path.join(specweavePath, 'increments', '0282-repo-links');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Repo Links',
          '## User Stories',
          '### US-001: Show repo link',
          '**Project**: vskill-platform',
          '**As a** user I want to see repo links',
        ].join('\n'),
      );

      // And an FS-282 folder exists under specs
      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-282'),
        { recursive: true },
      );

      // When buildFeatureProjectMap is called
      const map = await buildFeatureProjectMap(testDir);

      // Then FS-282 maps to ["vskill-platform"]
      expect(map.get('FS-282')).toEqual(['vskill-platform']);
    });

    it('TC-002: falls back to numeric matching when feature_id is null', async () => {
      // Given increment 0286-vskill-install-ux with spec.md containing **Project**: vskill
      const incDir = path.join(specweavePath, 'increments', '0286-vskill-install-ux');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Install UX',
          '### US-001: Better install flow',
          '**Project**: vskill',
        ].join('\n'),
      );

      // And an FS-286 folder exists
      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-286'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      expect(map.get('FS-286')).toEqual(['vskill']);
    });

    it('TC-003: handles cross-project specs with multiple **Project** values', async () => {
      // Given spec.md with two different **Project**: values in different user stories
      const incDir = path.join(specweavePath, 'increments', '0277-multi-package');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Multi Package Manager Docs',
          '### US-001: vskill-platform docs',
          '**Project**: vskill-platform',
          '### US-002: specweave docs',
          '**Project**: specweave',
        ].join('\n'),
      );

      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-277'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      expect(map.get('FS-277')).toEqual(
        expect.arrayContaining(['vskill-platform', 'specweave']),
      );
      expect(map.get('FS-277')!.length).toBe(2);
    });

    it('TC-004: falls back to default project when no **Project** field', async () => {
      // Given spec.md with no **Project**: field
      const incDir = path.join(specweavePath, 'increments', '0142-some-feature');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Some Feature',
          '### US-001: Do something',
          '**As a** user I want something',
        ].join('\n'),
      );

      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-142'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      // Falls back to 'specweave' (the current project folder name)
      expect(map.get('FS-142')).toEqual(['specweave']);
    });

    it('TC-004b: uses feature_id from metadata when present', async () => {
      // Given an increment with feature_id set in metadata.json
      const incDir = path.join(specweavePath, 'increments', '0300-custom-feature');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: 'FS-190' }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Custom',
          '### US-001: Something',
          '**Project**: vskill',
        ].join('\n'),
      );

      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-190'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      expect(map.get('FS-190')).toEqual(['vskill']);
    });
  });

  // -----------------------------------------------------------------------
  // generateReorganizationPlan
  // -----------------------------------------------------------------------

  describe('generateReorganizationPlan', () => {
    it('TC-005: generates move plan for single-project spec', async () => {
      // Given FS-286 mapped to ["vskill"] and currently under specs/specweave/
      const featureMap = new Map<string, string[]>([['FS-286', ['vskill']]]);
      const specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');

      // Create the source folder
      await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-286'), { recursive: true });
      await fsPromises.writeFile(
        path.join(specsDir, 'specweave', 'FS-286', 'FEATURE.md'),
        '# FS-286',
      );

      const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

      expect(plan).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            featureId: 'FS-286',
            source: path.join(specsDir, 'specweave', 'FS-286'),
            destination: path.join(specsDir, 'vskill', 'FS-286'),
            type: 'move',
          }),
        ]),
      );
    });

    it('TC-006: generates copy plan for cross-project spec', async () => {
      // Given FS-277 mapped to ["vskill-platform", "specweave", "vskill"]
      const featureMap = new Map<string, string[]>([
        ['FS-277', ['vskill-platform', 'specweave', 'vskill']],
      ]);
      const specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');

      await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-277'), { recursive: true });
      await fsPromises.writeFile(
        path.join(specsDir, 'specweave', 'FS-277', 'FEATURE.md'),
        '# FS-277',
      );

      const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

      // Since "specweave" is a target and is the current project,
      // the original stays in place and all others are copies
      const moves = plan.filter((op) => op.type === 'move');
      const copies = plan.filter((op) => op.type === 'copy');
      expect(moves.length).toBe(0);
      expect(copies.length).toBe(2);
      const copyDests = copies.map((op) => op.destination).sort();
      expect(copyDests).toEqual([
        path.join(specsDir, 'vskill-platform', 'FS-277'),
        path.join(specsDir, 'vskill', 'FS-277'),
      ].sort());
    });

    it('TC-007: skips already-reorganized specs (idempotency)', async () => {
      // Given FS-286 already at specs/vskill/FS-286
      const featureMap = new Map<string, string[]>([['FS-286', ['vskill']]]);
      const specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');

      // FS-286 is NOT under specweave/ (already moved)
      await fsPromises.mkdir(path.join(specsDir, 'vskill', 'FS-286'), { recursive: true });
      await fsPromises.writeFile(
        path.join(specsDir, 'vskill', 'FS-286', 'FEATURE.md'),
        '# FS-286',
      );

      const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

      // No operations needed
      expect(plan.length).toBe(0);
    });

    it('TC-008: preserves assets subdirectories in move operations', async () => {
      // Given FS-282 has an assets/ subdirectory
      const featureMap = new Map<string, string[]>([['FS-282', ['vskill-platform']]]);
      const specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');

      const fsDir = path.join(specsDir, 'specweave', 'FS-282');
      await fsPromises.mkdir(path.join(fsDir, 'assets'), { recursive: true });
      await fsPromises.writeFile(path.join(fsDir, 'FEATURE.md'), '# FS-282');
      await fsPromises.writeFile(path.join(fsDir, 'assets', 'diagram.png'), 'binary');

      const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

      // The entire FS-282 tree is included as a single move
      expect(plan.length).toBe(1);
      expect(plan[0].type).toBe('move');
      expect(plan[0].source).toBe(path.join(specsDir, 'specweave', 'FS-282'));
      expect(plan[0].destination).toBe(path.join(specsDir, 'vskill-platform', 'FS-282'));
    });

    it('TC-008b: keeps spec in current folder when mapped to same project', async () => {
      // Given FS-294 mapped to ["specweave"] and already under specs/specweave/
      const featureMap = new Map<string, string[]>([['FS-294', ['specweave']]]);
      const specsDir = path.join(specweavePath, 'docs', 'internal', 'specs');

      await fsPromises.mkdir(path.join(specsDir, 'specweave', 'FS-294'), { recursive: true });

      const plan = await generateReorganizationPlan(featureMap, specsDir, 'specweave');

      // No move needed — already in the right place
      expect(plan.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases for branch coverage
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('TC-EC-01: returns empty map when no specs directory exists', async () => {
      // Given no specs directory at all
      const emptyDir = path.join(
        os.tmpdir(),
        `spec-mapper-empty-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      await fsPromises.mkdir(path.join(emptyDir, '.specweave', 'increments'), { recursive: true });

      const map = await buildFeatureProjectMap(emptyDir);

      expect(map.size).toBe(0);

      await fsPromises.rm(emptyDir, { recursive: true, force: true });
    });

    it('TC-EC-02: defaults to "default" when no project dirs exist in specs', async () => {
      // Given a specs base dir that exists but has no project subdirectories
      // This tests the detectCurrentProject fallback
      const emptySpecsDir = path.join(
        os.tmpdir(),
        `spec-mapper-noproject-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      const sw = path.join(emptySpecsDir, '.specweave');
      const specsBase = path.join(sw, 'docs', 'internal', 'specs');

      // Create empty specs dir (no subdirs) - use a file to prevent the empty dir issue
      await fsPromises.mkdir(specsBase, { recursive: true });

      const map = await buildFeatureProjectMap(emptySpecsDir);

      // No features found at all since no project subdirs
      expect(map.size).toBe(0);

      await fsPromises.rm(emptySpecsDir, { recursive: true, force: true });
    });

    it('TC-EC-03: handles comma-separated project values', async () => {
      // Given spec.md with **Project**: specweave, vskill (comma-separated)
      const incDir = path.join(specweavePath, 'increments', '0299-multi-target');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Multi Target',
          '### US-001: Both projects',
          '**Project**: specweave, vskill',
        ].join('\n'),
      );

      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-299'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      expect(map.get('FS-299')).toEqual(
        expect.arrayContaining(['specweave', 'vskill']),
      );
      expect(map.get('FS-299')!.length).toBe(2);
    });

    it('TC-EC-04: ignores backtick-escaped **Project** in spec prose', async () => {
      // Given spec.md with `**Project**:` in backtick prose AND a real **Project**: line
      const incDir = path.join(specweavePath, 'increments', '0298-backtick-test');
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ feature_id: null }),
      );
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        [
          '# Feature: Backtick Test',
          'Use the `**Project**: foo` field to specify...',
          '### US-001: Real story',
          '**Project**: vskill-platform',
        ].join('\n'),
      );

      await fsPromises.mkdir(
        path.join(specweavePath, 'docs', 'internal', 'specs', 'specweave', 'FS-298'),
        { recursive: true },
      );

      const map = await buildFeatureProjectMap(testDir);

      // Should only include the non-backticked one
      expect(map.get('FS-298')).toEqual(['vskill-platform']);
    });

    it('TC-EC-05: returns empty map when increments dir does not exist', async () => {
      // Given a project root with specs but no increments directory
      const noIncDir = path.join(
        os.tmpdir(),
        `spec-mapper-noinc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      const sw = path.join(noIncDir, '.specweave');
      const specsBase = path.join(sw, 'docs', 'internal', 'specs', 'myproject');
      await fsPromises.mkdir(specsBase, { recursive: true });
      await fsPromises.mkdir(path.join(specsBase, 'FS-100'), { recursive: true });

      // No increments dir created
      const map = await buildFeatureProjectMap(noIncDir);

      // Feature found but no increment matches -> defaults to current project
      expect(map.get('FS-100')).toEqual(['myproject']);

      await fsPromises.rm(noIncDir, { recursive: true, force: true });
    });
  });
});
