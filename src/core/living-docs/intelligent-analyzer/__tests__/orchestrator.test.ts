/**
 * Tests for LivingDocsOrchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LivingDocsOrchestrator } from '../orchestrator.js';

describe('LivingDocsOrchestrator', () => {
  let tempDir: string;
  let orchestrator: LivingDocsOrchestrator;

  beforeEach(() => {
    // Create temp project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'living-docs-test-'));

    // Create .specweave structure
    fs.mkdirSync(path.join(tempDir, '.specweave/config.json'), { recursive: true });

    orchestrator = new LivingDocsOrchestrator({
      projectRoot: tempDir,
    });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create cache directory', () => {
      const cacheDir = path.join(tempDir, '.specweave/cache/analysis');
      expect(fs.existsSync(cacheDir)).toBe(true);
    });
  });

  describe('detectChanges', () => {
    it('should return empty array when no last update exists', async () => {
      const changes = await orchestrator.detectChanges();
      expect(changes).toEqual([]);
    });
  });

  describe('loadFromCache', () => {
    it('should return null when cache file does not exist', async () => {
      const result = await orchestrator.loadFromCache('nonexistent.json');
      expect(result).toBeNull();
    });

    it('should load data from cache file', async () => {
      const testData = { foo: 'bar', timestamp: new Date().toISOString() };
      await orchestrator.saveToCache('test.json', testData);

      const loaded = await orchestrator.loadFromCache<typeof testData>('test.json');
      expect(loaded).toEqual(testData);
    });
  });

  describe('saveToCache', () => {
    it('should save data to cache file', async () => {
      const testData = { test: 'data', count: 42 };
      await orchestrator.saveToCache('test-save.json', testData);

      const cacheFile = path.join(tempDir, '.specweave/cache/analysis/test-save.json');
      expect(fs.existsSync(cacheFile)).toBe(true);

      const loaded = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      expect(loaded).toEqual(testData);
    });
  });

  describe('update (dry-run)', () => {
    it('should complete successfully in dry-run mode', async () => {
      const result = await orchestrator.update({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
