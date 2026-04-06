import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPendingTasks, scanAutoSession } from '../../../../src/core/session/auto-scanner.js';

describe('core/session/auto-scanner', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-auto-'));
    projectRoot = tmpDir;
    stateDir = path.join(tmpDir, '.specweave', 'state');
    configPath = path.join(tmpDir, '.specweave', 'config.json');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-008
  describe('scanPendingTasks', () => {
    it('should return pending task counts from active increments', () => {
      const incDir = path.join(projectRoot, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active' }),
      );
      fs.writeFileSync(
        path.join(incDir, 'tasks.md'),
        '## Tasks\n- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3\n',
      );

      const result = scanPendingTasks(projectRoot);
      expect(result.pending).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.incrementIds).toContain('0001-test');
    });

    it('should skip increments with non-active status', () => {
      const incDir = path.join(projectRoot, '.specweave', 'increments', '0002-done');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'completed' }),
      );
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '- [ ] Task 1\n');

      const result = scanPendingTasks(projectRoot);
      expect(result.pending).toBe(0);
      expect(result.incrementIds).toHaveLength(0);
    });

    it('should return empty when no increments dir exists', () => {
      const result = scanPendingTasks(projectRoot);
      expect(result.pending).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.incrementIds).toHaveLength(0);
    });

    it('should aggregate across multiple active increments', () => {
      for (const name of ['0001-a', '0002-b']) {
        const incDir = path.join(projectRoot, '.specweave', 'increments', name);
        fs.mkdirSync(incDir, { recursive: true });
        fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ status: 'active' }));
        fs.writeFileSync(path.join(incDir, 'tasks.md'), '- [ ] T1\n- [x] T2\n');
      }

      const result = scanPendingTasks(projectRoot);
      expect(result.pending).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.incrementIds).toHaveLength(2);
    });
  });

  describe('scanAutoSession', () => {
    it('should return inactive when no auto-mode.json exists', () => {
      const result = scanAutoSession(stateDir, projectRoot, configPath);
      expect(result.active).toBe(false);
    });

    it('should return active with pending tasks when session exists', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-mode.json'),
        JSON.stringify({ active: true }),
      );
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({}));

      const incDir = path.join(projectRoot, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ status: 'active' }));
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '- [ ] T1\n');

      const result = scanAutoSession(stateDir, projectRoot, configPath);
      expect(result.active).toBe(true);
      expect(result.stale).toBe(false);
      expect(result.pendingTasks.pending).toBe(1);
    });
  });
});
