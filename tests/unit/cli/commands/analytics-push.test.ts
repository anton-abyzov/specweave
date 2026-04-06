import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { analyticsPushCommand } from '../../../../src/cli/commands/analytics-push.js';

describe('cli/commands/analytics-push', () => {
  let tmpDir: string;
  let projectRoot: string;
  let analyticsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-analytics-push-'));
    projectRoot = tmpDir;
    fs.mkdirSync(path.join(projectRoot, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0' }),
    );
    analyticsDir = path.join(projectRoot, '.specweave', 'state', 'analytics');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001: skill event with correct fields
  it('should write skill event with correct timestamp and type', async () => {
    const result = await analyticsPushCommand({
      type: 'skill',
      name: 'sw:pm',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(true);
    expect(result.eventsWritten).toBe(1);

    const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.type).toBe('skill');
    expect(parsed.name).toBe('sw:pm');
    expect(parsed.timestamp).toBeDefined();
    // Auto-extracted plugin from sw: prefix
    expect(parsed.plugin).toBe('specweave');
  });

  // TC-002: skill with explicit plugin
  it('should use provided plugin flag', async () => {
    const result = await analyticsPushCommand({
      type: 'skill',
      name: 'sw:pm',
      plugin: 'specweave',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(true);

    const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.plugin).toBe('specweave');
  });

  // TC-003: agent event
  it('should write agent event', async () => {
    const result = await analyticsPushCommand({
      type: 'agent',
      name: 'general',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(true);

    const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.type).toBe('agent');
    expect(parsed.name).toBe('general');
  });

  // TC-004: missing --type
  it('should fail when --type is missing', async () => {
    const result = await analyticsPushCommand({
      name: 'sw:pm',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(false);
    expect(result.eventsWritten).toBe(0);
  });

  // TC-005: missing --name
  it('should fail when --name is missing', async () => {
    const result = await analyticsPushCommand({
      type: 'skill',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(false);
    expect(result.eventsWritten).toBe(0);
  });

  // TC-006: analytics dir created on first write
  it('should create analytics directory on first write', async () => {
    expect(fs.existsSync(analyticsDir)).toBe(false);

    const result = await analyticsPushCommand({
      type: 'agent',
      name: 'explorer',
      projectRoot,
      silent: true,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(analyticsDir)).toBe(true);
    expect(fs.existsSync(path.join(analyticsDir, 'events.jsonl'))).toBe(true);
  });

  it('should fail for non-specweave project', async () => {
    const result = await analyticsPushCommand({
      type: 'skill',
      name: 'test',
      projectRoot: path.join(tmpDir, 'nope'),
      silent: true,
    });
    expect(result.success).toBe(false);
  });
});
