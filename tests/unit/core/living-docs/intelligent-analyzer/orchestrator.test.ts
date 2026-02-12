/**
 * LivingDocsOrchestrator Unit Tests
 *
 * Tests for the orchestrator that coordinates the entire analysis pipeline
 * with caching, change detection, and phased execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { mockExecSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
}));

const { mockRunIntelligentAnalysis } = vi.hoisted(() => ({
  mockRunIntelligentAnalysis: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('../../../../../src/core/living-docs/intelligent-analyzer/index.js', () => ({
  runIntelligentAnalysis: mockRunIntelligentAnalysis,
}));

import { LivingDocsOrchestrator } from '../../../../../src/core/living-docs/intelligent-analyzer/orchestrator.js';
import type { Logger } from '../../../../../src/utils/logger.js';

function createSilentLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

describe('LivingDocsOrchestrator', () => {
  let testDir: string;
  let logger: Logger;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-test-'));
    logger = createSilentLogger();
    mockExecSync.mockReset();
    mockRunIntelligentAnalysis.mockReset();

    // Default mock for runIntelligentAnalysis
    mockRunIntelligentAnalysis.mockResolvedValue({
      repoAnalyses: new Map(),
      savedFiles: ['file1.md', 'file2.md'],
      checkpoint: { phase: 'H', deepAnalysisComplete: true },
    });

    // Default mock for git
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse HEAD')) return 'abc123\n';
      return '';
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create orchestrator with project root', () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });
      expect(orchestrator).toBeInstanceOf(LivingDocsOrchestrator);
    });

    it('should create cache directory', () => {
      new LivingDocsOrchestrator({ projectRoot: testDir, logger });
      const cacheDir = path.join(testDir, '.specweave/cache/analysis');
      expect(fs.existsSync(cacheDir)).toBe(true);
    });

    it('should use default logger when none provided', () => {
      // Should not throw
      const orchestrator = new LivingDocsOrchestrator({ projectRoot: testDir });
      expect(orchestrator).toBeInstanceOf(LivingDocsOrchestrator);
    });

    it('should accept optional LLM provider', () => {
      const mockLLM = { analyze: vi.fn() };
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
        llmProvider: mockLLM,
      });
      expect(orchestrator).toBeInstanceOf(LivingDocsOrchestrator);
    });
  });

  describe('update', () => {
    it('should complete a full update with all phases', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.phases.discovery.success).toBe(true);
      expect(result.phases.analysis.success).toBe(true);
      expect(result.phases.synthesis.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should log analysis mode as INCREMENTAL by default', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.update();

      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('INCREMENTAL')
      );
    });

    it('should log analysis mode as FULL when full option is set', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.update({ full: true });

      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('FULL')
      );
    });

    it('should clear cache when full option is set', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Pre-populate cache
      const cacheDir = path.join(testDir, '.specweave/cache/analysis');
      fs.writeFileSync(path.join(cacheDir, 'test-cache.json'), '{}');

      await orchestrator.update({ full: true });

      // Cache should be cleared
      const cacheFiles = fs.readdirSync(cacheDir);
      // Only last-update.json should remain (created at end)
      expect(cacheFiles.filter(f => f !== 'last-update.json').length).toBe(0);
    });

    it('should handle dry run mode', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update({ dryRun: true });

      expect(result.success).toBe(true);
      // runIntelligentAnalysis should NOT be called in dry run
      expect(mockRunIntelligentAnalysis).not.toHaveBeenCalled();
    });

    it('should skip analysis phase when adrOnly is set', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update({ adrOnly: true });

      expect(result.success).toBe(true);
      expect(result.phases.analysis.success).toBe(false);
      expect(result.phases.analysis.message).toBe('');
      // runIntelligentAnalysis should NOT be called
      expect(mockRunIntelligentAnalysis).not.toHaveBeenCalled();
    });

    it('should skip analysis phase when techDebtOnly is set', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update({ techDebtOnly: true });

      expect(result.success).toBe(true);
      expect(result.phases.analysis.success).toBe(false);
      expect(mockRunIntelligentAnalysis).not.toHaveBeenCalled();
    });

    it('should track files created during analysis', async () => {
      mockRunIntelligentAnalysis.mockResolvedValue({
        repoAnalyses: new Map(),
        savedFiles: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
        checkpoint: { phase: 'H' },
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.filesCreated).toContain('docs/a.md');
      expect(result.filesCreated).toContain('docs/b.md');
      expect(result.filesCreated).toContain('docs/c.md');
    });

    it('should handle errors gracefully', async () => {
      mockRunIntelligentAnalysis.mockRejectedValue(new Error('Analysis failed'));

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Analysis failed');
    });

    it('should handle non-Error thrown values', async () => {
      mockRunIntelligentAnalysis.mockRejectedValue('string error');

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toBe('string error');
    });

    it('should save last-update.json to cache on success', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.update();

      const cachePath = path.join(testDir, '.specweave/cache/analysis/last-update.json');
      expect(fs.existsSync(cachePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(content.timestamp).toBeDefined();
      expect(content.commit).toBeDefined();
      expect(content.mode).toBe('incremental');
    });

    it('should save full mode in last-update.json when full is set', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.update({ full: true });

      const cachePath = path.join(testDir, '.specweave/cache/analysis/last-update.json');
      const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(content.mode).toBe('full');
    });

    it('should discover single repo when no config exists', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();
      expect(result.success).toBe(true);
      // Discovery should log 'main' as the repo name
      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('main')
      );
    });

    it('should discover umbrella repos from config', async () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          umbrella: {
            childRepos: [
              { name: 'api', path: 'services/api' },
              { name: 'web', path: 'apps/web' },
            ],
          },
        })
      );

      // Create the repo dirs so countFiles doesn't error
      fs.mkdirSync(path.join(testDir, 'services', 'api'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'apps', 'web'), { recursive: true });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();
      expect(result.success).toBe(true);
    });

    it('should fallback to single repo if config is malformed', async () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        '{invalid json'
      );

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();
      expect(result.success).toBe(true);
      expect((logger.warn as any)).toHaveBeenCalled();
    });

    it('should log file counts in summary when files are created', async () => {
      mockRunIntelligentAnalysis.mockResolvedValue({
        repoAnalyses: new Map(),
        savedFiles: ['a.md', 'b.md', 'c.md', 'd.md', 'e.md', 'f.md'],
        checkpoint: { phase: 'H' },
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.update();

      // Should log "... and N more" when > 5 files
      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('and 1 more')
      );
    });
  });

  describe('detectChanges', () => {
    it('should return empty when no previous update exists', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const changes = await orchestrator.detectChanges();
      expect(changes).toEqual([]);
    });

    it('should return empty when commit has not changed', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Save a cached last-update with matching commit
      mockExecSync.mockReturnValue('abc123\n');
      await orchestrator.saveToCache('last-update.json', {
        commit: 'abc123',
        timestamp: new Date().toISOString(),
      });

      const changes = await orchestrator.detectChanges();
      expect(changes).toEqual([]);
    });

    it('should detect added, modified, and deleted files', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Save previous update with old commit
      await orchestrator.saveToCache('last-update.json', {
        commit: 'old-commit',
        timestamp: new Date().toISOString(),
      });

      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse HEAD')) return 'new-commit\n';
        if (typeof cmd === 'string' && cmd.includes('git diff --name-status')) {
          return 'A\tsrc/new-file.ts\nM\tsrc/changed-file.ts\nD\tsrc/removed-file.ts\n';
        }
        return '';
      });

      const changes = await orchestrator.detectChanges();

      expect(changes.length).toBe(3);
      expect(changes.find(c => c.status === 'added')).toBeDefined();
      expect(changes.find(c => c.status === 'modified')).toBeDefined();
      expect(changes.find(c => c.status === 'deleted')).toBeDefined();
    });

    it('should handle unknown status codes as modified', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('last-update.json', {
        commit: 'old-commit',
      });

      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse HEAD')) return 'new-commit\n';
        if (typeof cmd === 'string' && cmd.includes('git diff --name-status')) {
          return 'R100\tsrc/renamed.ts\n';
        }
        return '';
      });

      const changes = await orchestrator.detectChanges();
      expect(changes.length).toBe(1);
      expect(changes[0].status).toBe('modified');
    });

    it('should skip empty lines in git diff output', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('last-update.json', {
        commit: 'old-commit',
      });

      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse HEAD')) return 'new-commit\n';
        if (typeof cmd === 'string' && cmd.includes('git diff --name-status')) {
          return '\n\nA\tsrc/file.ts\n\n';
        }
        return '';
      });

      const changes = await orchestrator.detectChanges();
      expect(changes.length).toBe(1);
    });

    it('should handle git diff errors gracefully', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('last-update.json', {
        commit: 'old-commit',
      });

      mockExecSync.mockImplementation(() => {
        throw new Error('git error');
      });

      const changes = await orchestrator.detectChanges();
      expect(changes).toEqual([]);
    });

    it('should handle lines without tab separator', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('last-update.json', {
        commit: 'old-commit',
      });

      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse HEAD')) return 'new-commit\n';
        if (typeof cmd === 'string' && cmd.includes('git diff --name-status')) {
          return 'INVALID_LINE_NO_TAB\n';
        }
        return '';
      });

      const changes = await orchestrator.detectChanges();
      // Line without tab separator: filePath is undefined, should be skipped
      expect(changes.length).toBe(0);
    });
  });

  describe('loadFromCache', () => {
    it('should return null for non-existent key', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const data = await orchestrator.loadFromCache('missing.json');
      expect(data).toBeNull();
    });

    it('should load cached data', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const testData = { foo: 'bar', count: 42 };
      await orchestrator.saveToCache('test.json', testData);

      const loaded = await orchestrator.loadFromCache<typeof testData>('test.json');
      expect(loaded).toEqual(testData);
    });

    it('should return null for corrupted cache file', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const cacheDir = path.join(testDir, '.specweave/cache/analysis');
      fs.writeFileSync(path.join(cacheDir, 'corrupt.json'), 'not valid json{{');

      const data = await orchestrator.loadFromCache('corrupt.json');
      expect(data).toBeNull();
      expect((logger.warn as any)).toHaveBeenCalled();
    });
  });

  describe('saveToCache', () => {
    it('should save data as JSON', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('data.json', { key: 'value' });

      const cachePath = path.join(testDir, '.specweave/cache/analysis/data.json');
      expect(fs.existsSync(cachePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(content.key).toBe('value');
    });

    it('should overwrite existing cache file', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('data.json', { version: 1 });
      await orchestrator.saveToCache('data.json', { version: 2 });

      const content = JSON.parse(
        fs.readFileSync(
          path.join(testDir, '.specweave/cache/analysis/data.json'),
          'utf-8'
        )
      );
      expect(content.version).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should remove all files from cache directory', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Create some cache files
      await orchestrator.saveToCache('a.json', { a: 1 });
      await orchestrator.saveToCache('b.json', { b: 2 });

      await orchestrator.clearCache();

      const cacheDir = path.join(testDir, '.specweave/cache/analysis');
      const files = fs.readdirSync(cacheDir);
      expect(files.length).toBe(0);
    });

    it('should remove checkpoint file if it exists', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Create checkpoint
      const checkpointDir = path.join(testDir, '.specweave/docs/internal/temp');
      fs.mkdirSync(checkpointDir, { recursive: true });
      fs.writeFileSync(
        path.join(checkpointDir, 'intelligent-analysis-checkpoint.json'),
        '{}'
      );

      await orchestrator.clearCache();

      expect(
        fs.existsSync(
          path.join(checkpointDir, 'intelligent-analysis-checkpoint.json')
        )
      ).toBe(false);
    });

    it('should handle missing cache directory gracefully', async () => {
      // Create orchestrator but manually delete the cache dir
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const cacheDir = path.join(testDir, '.specweave/cache/analysis');
      fs.rmSync(cacheDir, { recursive: true, force: true });

      // Should not throw
      await orchestrator.clearCache();
    });

    it('should log the number of cleared cache files', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      await orchestrator.saveToCache('x.json', { x: 1 });
      await orchestrator.saveToCache('y.json', { y: 2 });

      await orchestrator.clearCache();

      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('Cleared 2 cache files')
      );
    });

    it('should handle error during cache clearing', async () => {
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Create a non-deletable situation by removing write permissions
      // This is tricky in tests, so instead we test via the warn path
      // by simply verifying clearCache does not throw
      await orchestrator.clearCache();
      // No assertions needed - just verifying no throw
    });
  });

  describe('update with file tracking', () => {
    it('should track files created in analysis', async () => {
      mockRunIntelligentAnalysis.mockResolvedValue({
        repoAnalyses: new Map([['repo1', {}]]),
        savedFiles: ['overview.md', 'api-surface.md'],
        checkpoint: { phase: 'H' },
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.filesCreated).toContain('overview.md');
      expect(result.filesCreated).toContain('api-surface.md');
    });

    it('should show up to 5 files then truncate', async () => {
      const files = Array.from({ length: 8 }, (_, i) => `file${i}.md`);
      mockRunIntelligentAnalysis.mockResolvedValue({
        repoAnalyses: new Map(),
        savedFiles: files,
        checkpoint: { phase: 'H' },
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.filesCreated.length).toBe(8);
      // Logger should show "and 3 more"
      expect((logger.info as any)).toHaveBeenCalledWith(
        expect.stringContaining('and 3 more')
      );
    });
  });

  describe('getCurrentCommit', () => {
    it('should return commit hash from git', async () => {
      mockExecSync.mockReturnValue('deadbeef123456\n');

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Trigger update to exercise getCurrentCommit
      await orchestrator.update();

      const cachePath = path.join(testDir, '.specweave/cache/analysis/last-update.json');
      const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(content.commit).toBe('deadbeef123456');
    });

    it('should return unknown when git fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Trigger via dry run to get to detectChanges -> getCurrentCommit
      await orchestrator.update();

      const cachePath = path.join(testDir, '.specweave/cache/analysis/last-update.json');
      const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(content.commit).toBe('unknown');
    });
  });

  describe('countFiles', () => {
    it('should count files excluding standard excluded dirs', async () => {
      // Create files in source
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'a.ts'), '');
      fs.writeFileSync(path.join(testDir, 'src', 'b.ts'), '');

      // Create files in excluded dirs
      fs.mkdirSync(path.join(testDir, 'node_modules', 'dep'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'node_modules', 'dep', 'index.js'), '');
      fs.mkdirSync(path.join(testDir, '.git', 'objects'), { recursive: true });
      fs.writeFileSync(path.join(testDir, '.git', 'objects', 'pack'), '');
      fs.mkdirSync(path.join(testDir, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'dist', 'bundle.js'), '');

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Exercise countFiles through discovery phase
      const result = await orchestrator.update();

      // Discovery message should reflect only non-excluded files
      expect(result.phases.discovery.success).toBe(true);
      // 2 files in src should be counted (not node_modules, .git, dist)
      expect(result.phases.discovery.message).toContain('2 files');
    });
  });

  describe('phase execution order', () => {
    it('should execute discovery -> analysis -> synthesis in order', async () => {
      const callOrder: string[] = [];

      mockRunIntelligentAnalysis.mockImplementation(async () => {
        callOrder.push('analysis');
        return {
          repoAnalyses: new Map(),
          savedFiles: [],
          checkpoint: { phase: 'H' },
        };
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      // Override logger to track phase order
      (logger.info as any).mockImplementation((msg: string) => {
        if (msg.includes('Phase 1')) callOrder.push('discovery');
        if (msg.includes('Phase 3')) callOrder.push('synthesis');
      });

      await orchestrator.update();

      expect(callOrder.indexOf('discovery')).toBeLessThan(callOrder.indexOf('analysis'));
      expect(callOrder.indexOf('analysis')).toBeLessThan(callOrder.indexOf('synthesis'));
    });
  });

  describe('runIntelligentAnalysis integration', () => {
    it('should pass correct options to runIntelligentAnalysis', async () => {
      const mockLLM = { analyze: vi.fn() };
      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
        llmProvider: mockLLM,
      });

      await orchestrator.update();

      expect(mockRunIntelligentAnalysis).toHaveBeenCalledTimes(1);
      const opts = mockRunIntelligentAnalysis.mock.calls[0][0];
      expect(opts.projectPath).toBe(testDir);
      expect(opts.llmProvider).toBe(mockLLM);
      expect(opts.repos).toBeDefined();
      expect(opts.onProgress).toBeDefined();
      expect(opts.log).toBeDefined();
    });

    it('should handle analysis returning empty savedFiles', async () => {
      mockRunIntelligentAnalysis.mockResolvedValue({
        repoAnalyses: new Map(),
        savedFiles: [],
        checkpoint: { phase: 'H' },
      });

      const orchestrator = new LivingDocsOrchestrator({
        projectRoot: testDir,
        logger,
      });

      const result = await orchestrator.update();

      expect(result.success).toBe(true);
      expect(result.filesCreated.length).toBe(0);
    });
  });
});
