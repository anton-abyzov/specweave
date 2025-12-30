/**
 * Auto Configuration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadAutoConfig,
  saveAutoConfig,
  isAutoEnabled,
  getEffectiveMode,
} from '../../../src/core/auto/config.js';
import { DEFAULT_AUTO_CONFIG } from '../../../src/core/auto/types.js';

describe('Auto Config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadAutoConfig', () => {
    it('should return defaults when no config file exists', () => {
      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('defaults');
      expect(result.config).toEqual(DEFAULT_AUTO_CONFIG);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return defaults when config has no auto section', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }), 'utf-8');

      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('defaults');
      expect(result.config.enabled).toBe(true);
    });

    it('should merge partial config with defaults', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 50,
            coverageThreshold: 90,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('merged');
      expect(result.config.maxIterations).toBe(50);
      expect(result.config.coverageThreshold).toBe(90);
      expect(result.config.testCommand).toBe('npm test'); // Default preserved
    });

    it('should warn for invalid maxIterations', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 0,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('maxIterations must be >= 1, using default (500)');
      expect(result.config.maxIterations).toBe(500);
    });

    it('should cap maxIterations at 5000', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 10000,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('maxIterations exceeds 5000, capping at 5000');
      expect(result.config.maxIterations).toBe(5000);
    });

    it('should throw for invalid JSON', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, 'invalid json{', 'utf-8');

      expect(() => loadAutoConfig(tempDir)).toThrow('Failed to load auto config');
    });

    it('should merge humanGated config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            humanGated: {
              patterns: ['custom-deploy', 'danger'],
              timeout: 3600,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.humanGated.patterns).toEqual(['custom-deploy', 'danger']);
      expect(result.config.humanGated.timeout).toBe(3600);
    });

    it('should merge circuitBreakers config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            circuitBreakers: {
              failureThreshold: 5,
              resetTimeout: 600,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.circuitBreakers.failureThreshold).toBe(5);
      expect(result.config.circuitBreakers.resetTimeout).toBe(600);
    });
  });

  describe('saveAutoConfig', () => {
    it('should create config file when none exists', () => {
      saveAutoConfig(tempDir, { maxIterations: 75 });

      const configPath = path.join(tempDir, '.specweave/config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.auto.maxIterations).toBe(75);
    });

    it('should merge with existing config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          auto: { enabled: true },
        }),
        'utf-8'
      );

      saveAutoConfig(tempDir, { maxIterations: 75 });

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.project.name).toBe('test');
      expect(content.auto.enabled).toBe(true);
      expect(content.auto.maxIterations).toBe(75);
    });
  });

  describe('isAutoEnabled', () => {
    it('should return true by default', () => {
      expect(isAutoEnabled(tempDir)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      expect(isAutoEnabled(tempDir)).toBe(false);
    });
  });

  describe('getEffectiveMode', () => {
    it('should return auto mode by default', () => {
      const result = getEffectiveMode(tempDir, {});

      expect(result.mode).toBe('auto');
      expect(result.simple).toBe(false);
    });

    it('should return manual mode when --manual flag set', () => {
      const result = getEffectiveMode(tempDir, { manual: true });

      expect(result.mode).toBe('manual');
    });

    it('should return auto mode when --auto flag set', () => {
      // Disable in config
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      const result = getEffectiveMode(tempDir, { auto: true });

      expect(result.mode).toBe('auto');
    });

    it('should set simple mode when --simple flag set', () => {
      const result = getEffectiveMode(tempDir, { auto: true, simple: true });

      expect(result.mode).toBe('auto');
      expect(result.simple).toBe(true);
    });

    it('should use config default when no flags', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      const result = getEffectiveMode(tempDir, {});

      expect(result.mode).toBe('manual');
    });
  });
});
