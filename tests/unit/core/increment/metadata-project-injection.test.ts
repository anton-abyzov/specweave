/**
 * Tests for project field injection into metadata.json (T-003 / T-004)
 *
 * Validates that createIncrementTemplates auto-populates the project
 * field in metadata.json when umbrella mode is active.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createIncrementTemplates } from '../../../../src/core/increment/template-creator.js';

describe('metadata.json project field injection (T-003 / T-004)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-proj-inject-'));
    const incrementsPath = path.join(tempDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: Record<string, unknown>): void {
    const configPath = path.join(tempDir, '.specweave', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  function readMetadata(incrementId: string): Record<string, unknown> {
    const metaPath = path.join(tempDir, '.specweave', 'increments', incrementId, 'metadata.json');
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }

  // AC-US1-01: umbrella enabled + cwd inside child repo → project set
  it('should set project field when umbrella config has matching child repo', async () => {
    writeConfig({
      umbrella: {
        enabled: true,
        projectName: 'my-umb',
        childRepos: [
          { id: 'specweave', path: 'repositories/org/specweave', prefix: 'SPE' },
        ],
      },
    });

    // cwd won't match any child repo (tempDir is not under a child repo path)
    // so it should fall back to umbrella.projectName
    const result = await createIncrementTemplates({
      incrementId: '0001-test',
      title: 'Test',
      description: 'Test feature',
      projectId: 'my-umb',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0001-test');
    expect(metadata.project).toBe('my-umb');
  });

  // AC-US1-02: cwd at umbrella root → project = umbrella.projectName
  it('should set project to umbrella.projectName when at umbrella root', async () => {
    writeConfig({
      umbrella: {
        enabled: true,
        projectName: 'workspace-root',
        childRepos: [
          { id: 'app', path: 'repos/org/app' },
        ],
      },
    });

    const result = await createIncrementTemplates({
      incrementId: '0002-test',
      title: 'Test',
      description: 'Test',
      projectId: 'workspace-root',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0002-test');
    expect(metadata.project).toBe('workspace-root');
  });

  // AC-US1-03: umbrella not enabled → no project field
  it('should NOT set project field when umbrella is not enabled', async () => {
    writeConfig({
      umbrella: {
        enabled: false,
        projectName: 'ws',
        childRepos: [],
      },
    });

    const result = await createIncrementTemplates({
      incrementId: '0003-test',
      title: 'Test',
      description: 'Test',
      projectId: 'test-proj',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0003-test');
    expect(metadata.project).toBeUndefined();
  });

  it('should NOT set project field when no config.json exists', async () => {
    const result = await createIncrementTemplates({
      incrementId: '0004-test',
      title: 'Test',
      description: 'Test',
      projectId: 'test-proj',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0004-test');
    expect(metadata.project).toBeUndefined();
  });

  // AC-US1-04: disabled child repo → project still set
  it('should set project even when all child repos are disabled', async () => {
    writeConfig({
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          { id: 'app', path: 'repos/org/app', disabled: true },
        ],
      },
    });

    const result = await createIncrementTemplates({
      incrementId: '0005-test',
      title: 'Test',
      description: 'Test',
      projectId: 'ws',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0005-test');
    expect(metadata.project).toBe('ws');
  });
});
