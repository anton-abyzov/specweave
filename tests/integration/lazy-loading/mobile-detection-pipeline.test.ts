/**
 * Integration Tests for Mobile Detection Pipeline
 *
 * Uses real temp directories and real files (no mocking).
 * Validates the full detectProjectType pipeline for mobile projects.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectProjectType } from '../../../src/core/lazy-loading/project-detector.js';

describe('mobile detection pipeline (integration)', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-mobile-detect-'));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it('should detect react-native from package.json with plugins []', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ dependencies: { 'react-native': '^0.72.0' } })
    );

    const result = detectProjectType(dir);
    expect(result.types).toContain('react-native');
    expect(result.plugins).not.toContain('mobile');
    // plugins should be empty array or contain only non-mobile entries
    for (const p of result.plugins) {
      expect(p).not.toBe('mobile');
    }
  });

  it('should detect android from build.gradle with com.android.application', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'build.gradle'),
      "apply plugin: 'com.android.application'\n"
    );
    // Also create android/ dir so dirExists check passes
    fs.mkdirSync(path.join(dir, 'android'));

    const result = detectProjectType(dir);
    expect(result.types).toContain('android');
    expect(result.plugins).not.toContain('mobile');
  });

  it('should NOT detect android from build.gradle with only java plugin', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, 'build.gradle'),
      "apply plugin: 'java'\n"
    );

    const result = detectProjectType(dir);
    expect(result.types).not.toContain('android');
  });

  it('should detect no mobile types in an empty directory', () => {
    const dir = makeTmpDir();
    const mobileTypes = ['react-native', 'expo', 'ios', 'android'];

    const result = detectProjectType(dir);
    for (const mt of mobileTypes) {
      expect(result.types).not.toContain(mt);
    }
    expect(result.plugins).not.toContain('mobile');
  });
});
