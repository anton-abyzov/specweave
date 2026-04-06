import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { analyticsPushCommand } from '../../../src/cli/commands/analytics-push.js';

describe('integration: analytics push', () => {
  let tmpDir: string;
  let projectRoot: string;
  let analyticsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-int-analytics-'));
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

  // TC-001: sequential pushes produce ordered JSONL
  it('should write 3 sequential events as 3 ordered JSONL lines', async () => {
    await analyticsPushCommand({ type: 'skill', name: 'sw:pm', projectRoot, silent: true });
    await analyticsPushCommand({ type: 'agent', name: 'explorer', projectRoot, silent: true });
    await analyticsPushCommand({ type: 'skill', name: 'sw:do', projectRoot, silent: true });

    const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(3);

    const event1 = JSON.parse(lines[0]);
    const event2 = JSON.parse(lines[1]);
    const event3 = JSON.parse(lines[2]);

    expect(event1.name).toBe('sw:pm');
    expect(event1.type).toBe('skill');
    expect(event2.name).toBe('explorer');
    expect(event2.type).toBe('agent');
    expect(event3.name).toBe('sw:do');
    expect(event3.type).toBe('skill');
  });

  // TC-002: concurrent writes produce valid JSONL (atomic append)
  it('should handle concurrent writes without corruption', async () => {
    const promises = [
      analyticsPushCommand({ type: 'skill', name: 'sw:pm', projectRoot, silent: true }),
      analyticsPushCommand({ type: 'agent', name: 'explorer', projectRoot, silent: true }),
    ];

    const results = await Promise.all(promises);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    // Both should be valid JSON
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed.name).toBeDefined();
      expect(parsed.type).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    }
  });

  it('should create analytics dir from scratch', async () => {
    expect(fs.existsSync(analyticsDir)).toBe(false);

    await analyticsPushCommand({ type: 'skill', name: 'test', projectRoot, silent: true });

    expect(fs.existsSync(analyticsDir)).toBe(true);
    expect(fs.existsSync(path.join(analyticsDir, 'events.jsonl'))).toBe(true);
  });
});
