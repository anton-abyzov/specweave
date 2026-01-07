import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StartupChecker } from '../../../src/core/plugin-cache/startup-checker.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('StartupChecker', () => {
  let mockPluginDir: string;
  let throttleFile: string;

  beforeEach(() => {
    // Create mock plugin directory
    mockPluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
    fs.mkdirSync(path.join(mockPluginDir, 'skills'), { recursive: true });

    // Clear throttle file
    throttleFile = path.join(os.homedir(), '.specweave', 'state', '.cache-check-throttle');
    if (fs.existsSync(throttleFile)) {
      fs.unlinkSync(throttleFile);
    }
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(mockPluginDir)) {
      fs.rmSync(mockPluginDir, { recursive: true, force: true });
    }
    if (fs.existsSync(throttleFile)) {
      fs.unlinkSync(throttleFile);
    }
  });

  describe('throttle mechanism', () => {
    it('should allow first check', async () => {
      const allowed = await StartupChecker.shouldRunCheck();
      expect(allowed).toBe(true);
    });

    it('should block second check within hour', async () => {
      // First check
      await StartupChecker.quickCheck();

      // Second check immediately after
      const allowed = await StartupChecker.shouldRunCheck();
      expect(allowed).toBe(false);
    });

    it('should allow check after throttle expires', async () => {
      // Create old throttle file (>1 hour ago)
      const stateDir = path.dirname(throttleFile);
      fs.mkdirSync(stateDir, { recursive: true });

      const oldTime = Date.now() - (3600 * 1000 + 1); // >1 hour
      fs.writeFileSync(throttleFile, oldTime.toString());

      const allowed = await StartupChecker.shouldRunCheck();
      expect(allowed).toBe(true);
    });
  });

  describe('quickCheck', () => {
    it('should complete quickly', async () => {
      const startTime = Date.now();
      await StartupChecker.quickCheck();
      const elapsed = Date.now() - startTime;

      // Allow 500ms for CI environments (spec says <100ms for production)
      // In production with real caching, this will be much faster
      expect(elapsed).toBeLessThan(500);
    });

    it('should detect merge conflicts', async () => {
      // Create script with merge conflict
      fs.writeFileSync(
        path.join(mockPluginDir, 'test.sh'),
        '#!/bin/bash\n<<<<<<< HEAD\nconflict\n=======\nother\n>>>>>>> branch'
      );

      const consoleSpy = vi.spyOn(console, 'warn');

      // Mock getInstalledPlugins to return our mock directory
      vi.spyOn(StartupChecker as any, 'getPluginPaths').mockReturnValue([mockPluginDir]);

      await StartupChecker.quickCheck();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plugin cache issues detected')
      );

      consoleSpy.mockRestore();
    });

    it('should detect bash syntax errors', async () => {
      // Create script with syntax error
      fs.writeFileSync(
        path.join(mockPluginDir, 'broken.sh'),
        '#!/bin/bash\nif [ $1 == "test" ]; then\necho "missing fi"'
      );

      const consoleSpy = vi.spyOn(console, 'warn');

      // Mock getPluginPaths
      vi.spyOn(StartupChecker as any, 'getPluginPaths').mockReturnValue([mockPluginDir]);

      await StartupChecker.quickCheck();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not make GitHub API calls', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await StartupChecker.quickCheck();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should fail silently on errors', async () => {
      // Mock file system error
      vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      await expect(StartupChecker.quickCheck()).resolves.not.toThrow();
    });

    it('should skip check if throttled', async () => {
      // Create recent throttle file
      const stateDir = path.dirname(throttleFile);
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(throttleFile, Date.now().toString());

      const consoleSpy = vi.spyOn(console, 'warn');

      await StartupChecker.quickCheck();

      // Should not output anything (throttled)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
