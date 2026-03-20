/**
 * Tests for project field injection into metadata.json (T-003 / T-004)
 *
 * Validates that createIncrementTemplates auto-populates the project
 * field in metadata.json using the workspace config.
 *
 * Updated to use new workspace config format (no umbrella.enabled flag).
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

  // AC-US1-01: workspace config with repos → project set to workspace name (cwd not in any repo)
  it('should set project field when workspace config is present', async () => {
    writeConfig({
      workspace: {
        name: 'my-umb',
        repos: [
          { id: 'specweave', path: 'repositories/org/specweave', prefix: 'SPE' },
        ],
      },
    });

    const result = await createIncrementTemplates({
      incrementId: '0001-test',
      title: 'Test',
      description: 'Test feature',
      projectId: 'my-umb',
      projectRoot: tempDir,
    });

    expect(result.success).toBe(true);
    const metadata = readMetadata('0001-test');
    // cwd won't match any child repo path, so falls back to workspace.name
    expect(metadata.project).toBe('my-umb');
  });

  // AC-US1-02: workspace name is the default project when cwd is at workspace root
  it('should set project to workspace.name when at workspace root', async () => {
    writeConfig({
      workspace: {
        name: 'workspace-root',
        repos: [
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

  // When workspace section is absent but other config exists → no project field
  it('should NOT set project field when workspace section is absent', async () => {
    writeConfig({
      project: { name: 'legacy-project' },
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

  // AC-US1-04: workspace with repos (even disabled) → project still set from workspace.name
  it('should set project even when all repos are present but cwd is at workspace root', async () => {
    writeConfig({
      workspace: {
        name: 'ws',
        repos: [
          { id: 'app', path: 'repos/org/app' },
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
