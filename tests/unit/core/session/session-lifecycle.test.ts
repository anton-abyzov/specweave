import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  clearStaleAutoFiles,
  resetPressureFiles,
  writeBaselineHealth,
  cleanOrphaned,
} from '../../../../src/core/session/session-lifecycle.js';

describe('core/session/session-lifecycle', () => {
  let tmpDir: string;
  let stateDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-lifecycle-'));
    projectRoot = tmpDir;
    stateDir = path.join(tmpDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001
  describe('clearStaleAutoFiles', () => {
    it('should delete auto-mode files older than 24h', () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(autoFile, '{}');
      // Set mtime to 25h ago
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(autoFile, staleTime, staleTime);

      // Also create associated files
      fs.writeFileSync(path.join(stateDir, '.stop-auto-dedup'), '');
      fs.writeFileSync(path.join(stateDir, '.stop-auto-turns'), '');

      const cleaned = clearStaleAutoFiles(stateDir);
      expect(cleaned).toBeGreaterThan(0);
      expect(fs.existsSync(autoFile)).toBe(false);
      expect(fs.existsSync(path.join(stateDir, '.stop-auto-dedup'))).toBe(false);
    });

    it('should not delete auto-mode files newer than 24h', () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(autoFile, '{}');
      // Default mtime is now — well within 24h

      const cleaned = clearStaleAutoFiles(stateDir);
      expect(cleaned).toBe(0);
      expect(fs.existsSync(autoFile)).toBe(true);
    });

    it('should return 0 when no auto-mode.json exists', () => {
      const cleaned = clearStaleAutoFiles(stateDir);
      expect(cleaned).toBe(0);
    });
  });

  // TC-002
  describe('resetPressureFiles', () => {
    it('should remove context-pressure.json and prompt-health-alert.json', () => {
      fs.writeFileSync(path.join(stateDir, 'context-pressure.json'), '{}');
      fs.writeFileSync(path.join(stateDir, 'prompt-health-alert.json'), '{}');

      const result = resetPressureFiles(stateDir);
      expect(result).toBe(true);
      expect(fs.existsSync(path.join(stateDir, 'context-pressure.json'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, 'prompt-health-alert.json'))).toBe(false);
    });

    it('should return true even if files do not exist', () => {
      const result = resetPressureFiles(stateDir);
      expect(result).toBe(true);
    });
  });

  // TC-003
  describe('writeBaselineHealth', () => {
    it('should create prompt-health.json with valid JSON', () => {
      const timestamp = new Date().toISOString();
      const result = writeBaselineHealth(projectRoot, stateDir, timestamp);

      expect(result).not.toBeNull();
      expect(result!.warningLevel).toBe('normal');
      expect(result!.checkedAt).toBe(timestamp);

      const healthPath = path.join(stateDir, 'prompt-health.json');
      expect(fs.existsSync(healthPath)).toBe(true);
      const written = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
      expect(written.baseline).toBeTypeOf('number');
      expect(written.warningLevel).toBe('normal');
    });

    it('should account for CLAUDE.md size', () => {
      fs.writeFileSync(path.join(projectRoot, 'CLAUDE.md'), 'x'.repeat(1000));
      const result = writeBaselineHealth(projectRoot, stateDir, new Date().toISOString());
      expect(result).not.toBeNull();
      expect(result!.claudeMdSize).toBe(1000);
    });
  });

  // TC-004 — createSessionDir tested via session-state-manager (existing module)

  // TC-005
  describe('cleanOrphaned', () => {
    it('should remove stale lock files', () => {
      const lockPath = path.join(stateDir, '.lock');
      fs.writeFileSync(lockPath, '');
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(lockPath, staleTime, staleTime);

      const result = cleanOrphaned(stateDir);
      expect(result).toBe(true);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should not remove fresh lock files', () => {
      const lockPath = path.join(stateDir, '.lock');
      fs.writeFileSync(lockPath, '');

      const result = cleanOrphaned(stateDir);
      expect(result).toBe(true);
      expect(fs.existsSync(lockPath)).toBe(true);
    });

    it('should return true when no lock files exist', () => {
      const result = cleanOrphaned(stateDir);
      expect(result).toBe(true);
    });
  });
});
