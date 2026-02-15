import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PluginScanner } from '../../../src/dashboard/server/data/plugin-scanner.js';
import type { SkillUsage } from '../../../src/dashboard/types.js';

describe('PluginScanner - Skill usage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-scanner-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getSkillUsage()', () => {
    it('should return empty array when cache.json does not exist', () => {
      const scanner = new PluginScanner(testDir);
      expect(scanner.getSkillUsage()).toEqual([]);
    });
  });

  describe('getFullPluginData()', () => {
    it('should accept and return injected skill data', () => {
      const scanner = new PluginScanner(testDir);
      const skills: SkillUsage[] = [{
        name: 'sw:pm',
        plugin: 'specweave',
        count: 10,
        successCount: 9,
        failureCount: 1,
        lastUsed: '2026-02-15T00:00:00Z',
      }];

      const data = scanner.getFullPluginData(skills);

      expect(data.skills).toEqual(skills);
      expect(data.skills).toHaveLength(1);
      expect(data.skills[0].name).toBe('sw:pm');
    });

    it('should return empty skills when called without injection', () => {
      const scanner = new PluginScanner(testDir);
      const data = scanner.getFullPluginData();

      expect(data.skills).toEqual([]);
    });
  });
});
