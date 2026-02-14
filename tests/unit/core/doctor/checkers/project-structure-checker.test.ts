/**
 * Tests for ProjectStructureChecker - unknown folder detection and nested .specweave
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectStructureChecker } from '../../../../../src/core/doctor/checkers/project-structure-checker.js';

describe('ProjectStructureChecker', () => {
  let tmpDir: string;
  let checker: ProjectStructureChecker;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-checker-'));
    checker = new ProjectStructureChecker();

    // Create minimal .specweave structure
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('unknown underscore folder detection', () => {
    it('should pass when only recognized lifecycle folders exist', async () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_archive'));
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_abandoned'));
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_paused'));
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_backlog'));

      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('pass');
    });

    it('should warn when _analysis folder exists', async () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_analysis'));

      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('warn');
      expect(folderCheck!.message).toContain('_analysis');
    });

    it('should warn when any unknown underscore folder exists', async () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_temp'));

      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('warn');
      expect(folderCheck!.message).toContain('_temp');
    });

    it('should pass with empty increments directory', async () => {
      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('pass');
    });
  });

  describe('nested .specweave detection', () => {
    it('should warn when .specweave exists inside increments', async () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '.specweave'), { recursive: true });

      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('warn');
      expect(folderCheck!.message).toContain('.specweave');
    });

    it('should pass when no .specweave exists inside increments', async () => {
      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('pass');
    });
  });

  describe('combined detection', () => {
    it('should report both unknown folders and nested .specweave', async () => {
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '_analysis'));
      fs.mkdirSync(path.join(tmpDir, '.specweave', 'increments', '.specweave'), { recursive: true });

      const result = await checker.check(tmpDir, {});
      const folderCheck = result.checks.find(c => c.name === 'Increment folder hygiene');
      expect(folderCheck).toBeDefined();
      expect(folderCheck!.status).toBe('warn');
      expect(folderCheck!.details).toBeDefined();
      expect(folderCheck!.details!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
