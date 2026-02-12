/**
 * Unit tests for detect-intent command
 *
 * Tests the helper functions (scanActiveIncrementsForDetection, findProjectRoot,
 * getProjectConfig, isPluginAutoLoadEnabled, isIncrementAssistEnabled,
 * getIncrementConfidenceThreshold) indirectly through the exported
 * detectIntentCommand function.
 *
 * Strategy: Since most functions are module-level (not exported), we test them
 * through detectIntentCommand by mocking detectPluginsViaLLM and setting up
 * temp directories with configs and increments. The module-level cachedConfig
 * variable is handled by re-importing the module fresh in each describe block
 * or by structuring tests to account for caching.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Hoist mock functions so they can be referenced inside vi.mock
const { mockDetectPluginsViaLLM, mockLogInfo, mockLogError } = vi.hoisted(() => ({
  mockDetectPluginsViaLLM: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogError: vi.fn(),
}));

// Mock the LLM detector module
vi.mock('../../../../src/core/lazy-loading/llm-plugin-detector.js', () => ({
  detectPluginsViaLLM: mockDetectPluginsViaLLM,
}));

// Mock the failure logger
vi.mock('../../../../src/core/lazy-loading/failure-logger.js', () => ({
  logInfo: mockLogInfo,
  logError: mockLogError,
}));

/** Helper: create a unique temp directory */
function createTempDir(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const dir = path.join(os.tmpdir(), `detect-intent-test-${prefix}-${Date.now()}-${random}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Helper: create a .specweave project structure in a directory */
function createSpecweaveProject(root: string, config?: Record<string, unknown>): void {
  const swDir = path.join(root, '.specweave');
  fs.mkdirSync(swDir, { recursive: true });
  if (config) {
    fs.writeFileSync(path.join(swDir, 'config.json'), JSON.stringify(config), 'utf-8');
  }
}

/** Helper: create an increment with metadata */
function createIncrement(root: string, name: string, metadata: Record<string, unknown>): void {
  const incDir = path.join(root, '.specweave', 'increments', name);
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify(metadata), 'utf-8');
}

/** Helper: return a successful LLM detection result with no plugins */
function emptyLLMResult() {
  return {
    success: true,
    plugins: [],
    confidence: 0,
    reasoning: 'No plugins needed',
    durationMs: 50,
  };
}

/** Helper: return a successful LLM detection result with plugins */
function pluginLLMResult(plugins: string[], confidence = 0.9) {
  return {
    success: true,
    plugins,
    confidence,
    reasoning: 'Detected plugins',
    durationMs: 100,
  };
}

/** Helper: return a failed LLM detection result */
function failedLLMResult(error = 'LLM timeout') {
  return {
    success: false,
    plugins: [],
    confidence: 0,
    error,
    durationMs: 15000,
  };
}

describe('detect-intent command', () => {
  let tempDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalCwd = process.cwd();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDetectPluginsViaLLM.mockReset();
    mockLogInfo.mockReset();
    mockLogError.mockReset();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * We need to re-import the module for each major test group to reset
   * the module-level cachedConfig variable. vi.resetModules() clears the
   * module cache so we get a fresh import with cachedConfig = null.
   */
  async function importFresh() {
    vi.resetModules();

    // Re-mock after resetModules since it clears the module registry
    vi.doMock('../../../../src/core/lazy-loading/llm-plugin-detector.js', () => ({
      detectPluginsViaLLM: mockDetectPluginsViaLLM,
    }));
    vi.doMock('../../../../src/core/lazy-loading/failure-logger.js', () => ({
      logInfo: mockLogInfo,
      logError: mockLogError,
    }));

    const mod = await import('../../../../src/cli/commands/detect-intent.js');
    return mod;
  }

  // ─────────────────────────────────────────────────────────
  // findProjectRoot tests (tested via detectIntentCommand behavior)
  // ─────────────────────────────────────────────────────────
  describe('findProjectRoot', () => {
    it('should find .specweave in current directory', async () => {
      tempDir = createTempDir('find-root-cwd');
      createSpecweaveProject(tempDir);
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      // Should succeed (not skip) because config exists (default to enabled)
      expect(result.skipped).toBeUndefined();
    });

    it('should find .specweave in parent directory', async () => {
      tempDir = createTempDir('find-root-parent');
      createSpecweaveProject(tempDir);
      const childDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(childDir, { recursive: true });
      process.chdir(childDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
    });

    it('should return null when no .specweave anywhere (defaults enabled)', async () => {
      tempDir = createTempDir('find-root-none');
      process.chdir(tempDir);
      // No .specweave dir -> findProjectRoot returns null -> config is null -> defaults to enabled

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      // Plugin auto-load defaults to true when no config
      expect(result.skipped).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────
  // isPluginAutoLoadEnabled tests
  // ─────────────────────────────────────────────────────────
  describe('isPluginAutoLoadEnabled', () => {
    it('should default to enabled when no config file', async () => {
      tempDir = createTempDir('autoload-no-config');
      createSpecweaveProject(tempDir); // .specweave dir but no config.json
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
      expect(mockDetectPluginsViaLLM).toHaveBeenCalled();
    });

    it('should default to enabled when config has no pluginAutoLoad', async () => {
      tempDir = createTempDir('autoload-no-key');
      createSpecweaveProject(tempDir, { someOtherKey: true });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
      expect(mockDetectPluginsViaLLM).toHaveBeenCalled();
    });

    it('should be enabled when pluginAutoLoad.enabled is true', async () => {
      tempDir = createTempDir('autoload-true');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { enabled: true } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
      expect(mockDetectPluginsViaLLM).toHaveBeenCalled();
    });

    it('should skip detection when pluginAutoLoad.enabled is false', async () => {
      tempDir = createTempDir('autoload-false');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { enabled: false } });
      process.chdir(tempDir);

      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBe(true);
      expect(result.detected).toBe(false);
      expect(result.plugins).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(mockDetectPluginsViaLLM).not.toHaveBeenCalled();
    });

    it('should log skip message when auto-load disabled', async () => {
      tempDir = createTempDir('autoload-false-log');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { enabled: false } });
      process.chdir(tempDir);

      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'detect-intent',
        'Plugin auto-load disabled via config, skipping',
        expect.objectContaining({ configSetting: 'pluginAutoLoad.enabled: false' })
      );
    });

    it('should be enabled when pluginAutoLoad exists but enabled is undefined', async () => {
      tempDir = createTempDir('autoload-undef');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { suggestOnly: true } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
      expect(mockDetectPluginsViaLLM).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // isIncrementAssistEnabled tests
  // ─────────────────────────────────────────────────────────
  describe('isIncrementAssistEnabled', () => {
    it('should default to enabled when no config', async () => {
      tempDir = createTempDir('incassist-no-config');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.9,
          mandatory: false,
          suggestedName: 'test-feature',
          reasoning: 'New feature detected',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build a login page');
      // Should include increment (not skipped)
      expect(result.incrementSkipped).toBeUndefined();
      expect(result.increment).toBeDefined();
    });

    it('should default to enabled when config has no incrementAssist key', async () => {
      tempDir = createTempDir('incassist-no-key');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { enabled: true } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.9,
          mandatory: false,
          suggestedName: 'test-feature',
          reasoning: 'New feature detected',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build a login page');
      expect(result.incrementSkipped).toBeUndefined();
      expect(result.increment).toBeDefined();
    });

    it('should be enabled when incrementAssist.enabled is true', async () => {
      tempDir = createTempDir('incassist-true');
      createSpecweaveProject(tempDir, { incrementAssist: { enabled: true } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.9,
          mandatory: false,
          suggestedName: 'my-feature',
          reasoning: 'Feature work',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('create a dashboard');
      expect(result.incrementSkipped).toBeUndefined();
      expect(result.increment).toBeDefined();
    });

    it('should skip increment when incrementAssist.enabled is false', async () => {
      tempDir = createTempDir('incassist-false');
      createSpecweaveProject(tempDir, { incrementAssist: { enabled: false } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.9,
          mandatory: false,
          suggestedName: 'my-feature',
          reasoning: 'Feature work',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('create a dashboard');
      expect(result.incrementSkipped).toBe(true);
      expect(result.increment).toBeUndefined();
    });

    it('should log skip when increment assist disabled', async () => {
      tempDir = createTempDir('incassist-false-log');
      createSpecweaveProject(tempDir, { incrementAssist: { enabled: false } });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'detect-intent',
        'Increment assist disabled via config',
        expect.objectContaining({ configSetting: 'incrementAssist.enabled: false' })
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // getIncrementConfidenceThreshold tests
  // ─────────────────────────────────────────────────────────
  describe('getIncrementConfidenceThreshold', () => {
    it('should default to 0.7 when no config', async () => {
      tempDir = createTempDir('threshold-no-config');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.65, // Below 0.7 default threshold
          mandatory: false,
          suggestedName: 'low-confidence',
          reasoning: 'Maybe a feature',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('maybe do something');
      // Confidence 0.65 < 0.7 default threshold -> not included
      expect(result.increment).toBeUndefined();
    });

    it('should default to 0.7 when config has no incrementAssist key', async () => {
      tempDir = createTempDir('threshold-no-key');
      createSpecweaveProject(tempDir, { someKey: true });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.65,
          mandatory: false,
          suggestedName: 'low-confidence',
          reasoning: 'Maybe a feature',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('maybe do something');
      expect(result.increment).toBeUndefined();
    });

    it('should use custom threshold 0.5', async () => {
      tempDir = createTempDir('threshold-custom');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 0.5 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.55, // Above custom 0.5 threshold
          mandatory: false,
          suggestedName: 'low-but-ok',
          reasoning: 'Probably a feature',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build something');
      expect(result.increment).toBeDefined();
      expect(result.increment!.confidence).toBe(0.55);
    });

    it('should fall back to 0.7 when threshold is above 1', async () => {
      tempDir = createTempDir('threshold-above-1');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 1.5 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.65, // Below 0.7 default
          mandatory: false,
          suggestedName: 'test',
          reasoning: 'Test',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build something');
      // 0.65 < 0.7 (default) -> not included
      expect(result.increment).toBeUndefined();
    });

    it('should fall back to 0.7 when threshold is below 0', async () => {
      tempDir = createTempDir('threshold-below-0');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: -0.1 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.65,
          mandatory: false,
          suggestedName: 'test',
          reasoning: 'Test',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build something');
      expect(result.increment).toBeUndefined();
    });

    it('should fall back to 0.7 when threshold is not a number', async () => {
      tempDir = createTempDir('threshold-nan');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 'high' },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.65,
          mandatory: false,
          suggestedName: 'test',
          reasoning: 'Test',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build something');
      expect(result.increment).toBeUndefined();
    });

    it('should accept threshold of exactly 0', async () => {
      tempDir = createTempDir('threshold-zero');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 0 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.01,
          mandatory: false,
          suggestedName: 'barely',
          reasoning: 'Very low confidence',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('maybe build something');
      expect(result.increment).toBeDefined();
    });

    it('should accept threshold of exactly 1', async () => {
      tempDir = createTempDir('threshold-one');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 1 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.99,
          mandatory: false,
          suggestedName: 'high',
          reasoning: 'Almost certain',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build something');
      // 0.99 < 1 -> not included
      expect(result.increment).toBeUndefined();
    });

    it('should log when recommendation is below threshold', async () => {
      tempDir = createTempDir('threshold-below-log');
      createSpecweaveProject(tempDir, {
        incrementAssist: { enabled: true, confidenceThreshold: 0.9 },
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.5,
          mandatory: false,
          suggestedName: 'test',
          reasoning: 'Test',
        },
      });
      const mod = await importFresh();

      await mod.detectIntentCommand('build something');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'detect-intent',
        'Increment recommendation below threshold',
        expect.objectContaining({
          confidence: 0.5,
          threshold: 0.9,
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // scanActiveIncrementsForDetection tests
  // ─────────────────────────────────────────────────────────
  describe('scanActiveIncrementsForDetection', () => {
    it('should return empty when no .specweave directory', async () => {
      tempDir = createTempDir('scan-no-sw');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      // The activeIncrements passed to LLM should be empty
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        [] // empty active increments
      );
    });

    it('should return empty when no increments directory', async () => {
      tempDir = createTempDir('scan-no-inc-dir');
      createSpecweaveProject(tempDir);
      // .specweave exists but no increments/ subfolder
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should skip directories starting with underscore', async () => {
      tempDir = createTempDir('scan-skip-underscore');
      createSpecweaveProject(tempDir);
      const incDir = path.join(tempDir, '.specweave', 'increments');
      fs.mkdirSync(incDir, { recursive: true });

      // Create _archive directory (should be skipped)
      const archiveDir = path.join(incDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '0001-old-feature'), { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, '0001-old-feature', 'metadata.json'),
        JSON.stringify({ status: 'active', title: 'Old' })
      );

      // Create _abandoned directory (should be skipped)
      const abandonedDir = path.join(incDir, '_abandoned');
      fs.mkdirSync(abandonedDir, { recursive: true });

      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should skip entries without metadata.json', async () => {
      tempDir = createTempDir('scan-skip-no-meta');
      createSpecweaveProject(tempDir);
      const incDir = path.join(tempDir, '.specweave', 'increments');
      fs.mkdirSync(incDir, { recursive: true });

      // Create increment directory without metadata.json
      fs.mkdirSync(path.join(incDir, '0001-no-metadata'), { recursive: true });
      fs.writeFileSync(path.join(incDir, '0001-no-metadata', 'spec.md'), '# Spec');

      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should include increments with status=active', async () => {
      tempDir = createTempDir('scan-active');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-active-feature', {
        status: 'active',
        title: 'Active Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        [
          {
            id: '0001-active-feature',
            name: 'Active Feature',
            type: 'feature',
            status: 'active',
          },
        ]
      );
    });

    it('should include increments with status=in-progress', async () => {
      tempDir = createTempDir('scan-inprogress');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0002-wip', {
        status: 'in-progress',
        title: 'Work In Progress',
        type: 'bugfix',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        [
          {
            id: '0002-wip',
            name: 'Work In Progress',
            type: 'bugfix',
            status: 'in-progress',
          },
        ]
      );
    });

    it('should include increments with status=completed', async () => {
      tempDir = createTempDir('scan-completed');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0003-done', {
        status: 'completed',
        title: 'Done Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        [
          {
            id: '0003-done',
            name: 'Done Feature',
            type: 'feature',
            status: 'completed',
          },
        ]
      );
    });

    it('should include increments with status=ready_for_review', async () => {
      tempDir = createTempDir('scan-review');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0004-review', {
        status: 'ready_for_review',
        title: 'Review Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        [
          {
            id: '0004-review',
            name: 'Review Feature',
            type: 'feature',
            status: 'ready_for_review',
          },
        ]
      );
    });

    it('should exclude increments with status=archived', async () => {
      tempDir = createTempDir('scan-archived');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0005-archived', {
        status: 'archived',
        title: 'Archived Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should exclude increments with status=abandoned', async () => {
      tempDir = createTempDir('scan-abandoned');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0006-abandoned', {
        status: 'abandoned',
        title: 'Abandoned Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should exclude increments with status=backlog', async () => {
      tempDir = createTempDir('scan-backlog');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0007-backlog', {
        status: 'backlog',
        title: 'Backlog Feature',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should handle invalid JSON in metadata gracefully', async () => {
      tempDir = createTempDir('scan-bad-json');
      createSpecweaveProject(tempDir);
      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-bad');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), '{invalid json!!!}');

      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      // Should not throw, should just skip the bad entry
      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });

    it('should use meta.title for name (priority 1)', async () => {
      tempDir = createTempDir('scan-title');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-feat', {
        status: 'active',
        title: 'My Title',
        name: 'My Name',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        expect.arrayContaining([
          expect.objectContaining({ name: 'My Title' }),
        ])
      );
    });

    it('should use meta.name when title is missing (priority 2)', async () => {
      tempDir = createTempDir('scan-name');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-feat', {
        status: 'active',
        name: 'My Name',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        expect.arrayContaining([
          expect.objectContaining({ name: 'My Name' }),
        ])
      );
    });

    it('should use entry.name when title and name are missing (priority 3)', async () => {
      tempDir = createTempDir('scan-entry-name');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-fallback-name', {
        status: 'active',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        expect.arrayContaining([
          expect.objectContaining({ name: '0001-fallback-name' }),
        ])
      );
    });

    it('should default type to feature when not in metadata', async () => {
      tempDir = createTempDir('scan-default-type');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-no-type', {
        status: 'active',
        title: 'No Type',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        expect.arrayContaining([
          expect.objectContaining({ type: 'feature' }),
        ])
      );
    });

    it('should default status to unknown when not in metadata', async () => {
      tempDir = createTempDir('scan-default-status');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-no-status', {
        title: 'No Status',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        expect.arrayContaining([
          expect.objectContaining({ status: 'unknown' }),
        ])
      );
    });

    it('should handle mixed statuses correctly', async () => {
      tempDir = createTempDir('scan-mixed');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-active', { status: 'active', title: 'Active' });
      createIncrement(tempDir, '0002-archived', { status: 'archived', title: 'Archived' });
      createIncrement(tempDir, '0003-inprog', { status: 'in-progress', title: 'InProg' });
      createIncrement(tempDir, '0004-abandoned', { status: 'abandoned', title: 'Abandoned' });
      createIncrement(tempDir, '0005-backlog', { status: 'backlog', title: 'Backlog' });
      createIncrement(tempDir, '0006-completed', { status: 'completed', title: 'Completed' });

      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      const callArgs = mockDetectPluginsViaLLM.mock.calls[0];
      const activeIncrements = callArgs[2] as Array<{ id: string; status: string }>;

      // Should include: active, in-progress, completed (3)
      // Should exclude: archived, abandoned, backlog (3)
      expect(activeIncrements).toHaveLength(3);
      const ids = activeIncrements.map((i) => i.id);
      expect(ids).toContain('0001-active');
      expect(ids).toContain('0003-inprog');
      expect(ids).toContain('0006-completed');
      expect(ids).not.toContain('0002-archived');
      expect(ids).not.toContain('0004-abandoned');
      expect(ids).not.toContain('0005-backlog');
    });

    it('should skip files (non-directory entries) in increments dir', async () => {
      tempDir = createTempDir('scan-skip-files');
      createSpecweaveProject(tempDir);
      const incDir = path.join(tempDir, '.specweave', 'increments');
      fs.mkdirSync(incDir, { recursive: true });

      // Create a file (not directory) in increments
      fs.writeFileSync(path.join(incDir, 'README.md'), '# Increments');

      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(mockDetectPluginsViaLLM).toHaveBeenCalledWith(
        'test prompt',
        15000,
        []
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // getProjectConfig caching and error handling
  // ─────────────────────────────────────────────────────────
  describe('getProjectConfig', () => {
    it('should handle invalid JSON in config.json gracefully', async () => {
      tempDir = createTempDir('config-bad-json');
      const swDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(swDir, { recursive: true });
      fs.writeFileSync(path.join(swDir, 'config.json'), '{not valid json!!!}');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      // Should not throw, config returns null -> defaults to enabled
      const result = await mod.detectIntentCommand('test prompt');
      expect(result.skipped).toBeUndefined();
      expect(mockDetectPluginsViaLLM).toHaveBeenCalled();
    });

    it('should return null when .specweave exists but no config.json', async () => {
      tempDir = createTempDir('config-missing');
      createSpecweaveProject(tempDir); // No config passed
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      // No config -> defaults to enabled
      expect(result.skipped).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────
  // detectIntentCommand integration tests
  // ─────────────────────────────────────────────────────────
  describe('detectIntentCommand integration', () => {
    it('should return correct structure for successful detection', async () => {
      tempDir = createTempDir('integration-success');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(pluginLLMResult(['sw-frontend', 'sw-testing'], 0.95));
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build a React component with tests');
      expect(result.detected).toBe(true);
      expect(result.plugins).toEqual(['sw-frontend', 'sw-testing']);
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBe('Detected plugins');
      expect(result.latencyMs).toBe(100);
    });

    it('should set detected=false when no plugins found', async () => {
      tempDir = createTempDir('integration-no-plugins');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('just chatting');
      expect(result.detected).toBe(false);
      expect(result.plugins).toEqual([]);
    });

    it('should handle LLM failure gracefully', async () => {
      tempDir = createTempDir('integration-failure');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(failedLLMResult('API timeout'));
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test prompt');
      expect(result.detected).toBe(false);
      expect(result.installMessage).toBe('API timeout');
      expect(mockLogError).toHaveBeenCalledWith(
        'detect-intent',
        'LLM detection failed',
        expect.any(Error),
        expect.objectContaining({
          prompt: expect.any(String),
          durationMs: 15000,
        })
      );
    });

    it('should output JSON to console when not silent', async () => {
      tempDir = createTempDir('integration-output');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('detected');
      expect(parsed).toHaveProperty('plugins');
    });

    it('should suppress console output in silent mode', async () => {
      tempDir = createTempDir('integration-silent');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt', { silent: true });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should suppress console output in silent mode when skipped', async () => {
      tempDir = createTempDir('integration-silent-skip');
      createSpecweaveProject(tempDir, { pluginAutoLoad: { enabled: false } });
      process.chdir(tempDir);

      const mod = await importFresh();

      await mod.detectIntentCommand('test prompt', { silent: true });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle --install flag (deprecated)', async () => {
      tempDir = createTempDir('integration-install');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(pluginLLMResult(['sw-frontend']));
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build React app', { install: true });
      expect(result.installed).toBe(false);
      expect(result.installMessage).toContain('Plugin auto-install removed');
    });

    it('should not set install fields when --install used but no plugins', async () => {
      tempDir = createTempDir('integration-install-empty');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(emptyLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('just chatting', { install: true });
      expect(result.installed).toBeUndefined();
      expect(result.installMessage).toBeUndefined();
    });

    it('should include skill routing when LLM provides it', async () => {
      tempDir = createTempDir('integration-routing');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...pluginLLMResult(['sw-frontend']),
        routing: {
          skills: [
            {
              name: 'frontend-architect',
              plugin: 'sw-frontend',
              fullName: 'sw-frontend:frontend-architect',
              priority: 'primary',
              invokeWhen: 'after_increment',
              reason: 'React component work',
            },
          ],
          workflow: {
            suggestPlanMode: true,
            phases: ['plan', 'implement', 'test'],
          },
          confidence: 0.85,
          reasoning: 'Frontend work detected',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build a React dashboard');
      expect(result.routing).toBeDefined();
      expect(result.routing!.skills).toHaveLength(1);
      expect(result.routing!.skills[0].fullName).toBe('sw-frontend:frontend-architect');
      expect(result.routing!.workflow.suggestPlanMode).toBe(true);
    });

    it('should not include routing when skills array is empty', async () => {
      tempDir = createTempDir('integration-routing-empty');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        routing: {
          skills: [],
          workflow: { suggestPlanMode: false, phases: [] },
          confidence: 0,
          reasoning: 'No skills needed',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('hello');
      expect(result.routing).toBeUndefined();
    });

    it('should include skill invocation when LLM provides it', async () => {
      tempDir = createTempDir('integration-invocation');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...pluginLLMResult(['sw-ml']),
        skillInvocation: {
          skill: 'sw-ml:ml-engineer',
          reason: 'Machine learning task detected',
          mandatory: true,
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('train a PyTorch model');
      expect(result.skillInvocation).toBeDefined();
      expect(result.skillInvocation!.skill).toBe('sw-ml:ml-engineer');
      expect(result.skillInvocation!.mandatory).toBe(true);
    });

    it('should include LSP recommendation when LLM provides it', async () => {
      tempDir = createTempDir('integration-lsp');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        lsp: {
          needed: true,
          operation: 'references',
          language: 'typescript',
          warmupRequired: true,
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('find all references to UserService');
      expect(result.lsp).toBeDefined();
      expect(result.lsp!.needed).toBe(true);
      expect(result.lsp!.operation).toBe('references');
      expect(result.lsp!.language).toBe('typescript');
    });

    it('should include increment recommendation when above threshold', async () => {
      tempDir = createTempDir('integration-increment');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.9,
          mandatory: false,
          suggestedName: 'user-dashboard',
          reasoning: 'New feature work',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('build a user dashboard');
      expect(result.increment).toBeDefined();
      expect(result.increment!.action).toBe('new');
      expect(result.increment!.suggestedName).toBe('user-dashboard');
      expect(result.increment!.mandatory).toBe(false);
    });

    it('should include increment with mandatory flag from LLM', async () => {
      tempDir = createTempDir('integration-mandatory');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'new',
          confidence: 0.95,
          mandatory: true,
          suggestedName: 'critical-feature',
          reasoning: 'Complex feature requires tracking',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('implement OAuth2 with PKCE');
      expect(result.increment!.mandatory).toBe(true);
    });

    it('should include increment with reopen action and relatedKeyword', async () => {
      tempDir = createTempDir('integration-reopen');
      createSpecweaveProject(tempDir);
      createIncrement(tempDir, '0001-auth', {
        status: 'active',
        title: 'Authentication',
        type: 'feature',
      });
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue({
        ...emptyLLMResult(),
        increment: {
          action: 'reopen',
          confidence: 0.85,
          mandatory: false,
          relatedKeyword: 'auth',
          reasoning: 'Related to existing auth increment',
        },
      });
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('fix the auth login bug');
      expect(result.increment).toBeDefined();
      expect(result.increment!.action).toBe('reopen');
      expect(result.increment!.relatedKeyword).toBe('auth');
    });

    it('should handle LLM failure output in silent mode', async () => {
      tempDir = createTempDir('integration-failure-silent');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(failedLLMResult());
      const mod = await importFresh();

      const result = await mod.detectIntentCommand('test', { silent: true });
      expect(result.detected).toBe(false);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log analytics for successful detection', async () => {
      tempDir = createTempDir('integration-analytics');
      process.chdir(tempDir);

      mockDetectPluginsViaLLM.mockResolvedValue(pluginLLMResult(['sw-frontend']));
      const mod = await importFresh();

      await mod.detectIntentCommand('build React app');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'detect-intent',
        'LLM detection complete',
        expect.objectContaining({
          detected: true,
          plugins: ['sw-frontend'],
        })
      );
    });

    it('should truncate prompt in error log to 100 chars', async () => {
      tempDir = createTempDir('integration-truncate');
      process.chdir(tempDir);

      const longPrompt = 'A'.repeat(200);
      mockDetectPluginsViaLLM.mockResolvedValue(failedLLMResult('timeout'));
      const mod = await importFresh();

      await mod.detectIntentCommand(longPrompt, { silent: true });
      expect(mockLogError).toHaveBeenCalledWith(
        'detect-intent',
        'LLM detection failed',
        expect.any(Error),
        expect.objectContaining({
          prompt: 'A'.repeat(100),
        })
      );
    });
  });
});
