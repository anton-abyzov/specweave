/**
 * Unit Tests for Mobile Detection Rules in project-detector.ts
 *
 * Verifies that all 4 mobile detection rules (react-native, expo, ios, android)
 * detect correctly and map to plugins: [] (no phantom 'mobile' plugin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

import {
  detectProjectType,
  getRecommendedPlugins,
  getDetectionRules,
} from '../../../../src/core/lazy-loading/project-detector.js';

describe('project-detector mobile detection rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: nothing exists, nothing readable
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
  });

  // ========== React Native ==========

  describe('react-native detection', () => {
    it('should detect react-native from package.json dependency with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('package.json')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: { 'react-native': '^0.72.0' } });
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('react-native');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should detect react-native from metro.config.js with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('metro.config.js')
      );

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('react-native');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should not detect react-native when no markers present', () => {
      const result = detectProjectType('/fake/project');
      expect(result.types).not.toContain('react-native');
    });
  });

  // ========== Expo ==========

  describe('expo detection', () => {
    it('should detect expo from package.json dependency with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('package.json')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({ dependencies: { expo: '~49.0.0' } });
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('expo');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should detect expo from app.json with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('app.json')
      );

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('expo');
      expect(result.plugins).not.toContain('mobile');
    });
  });

  // ========== iOS ==========

  describe('ios detection', () => {
    it('should detect ios from ios/ directory with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('/ios')
      );

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('ios');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should detect ios from Podfile with plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('Podfile')
      );

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('ios');
      expect(result.plugins).not.toContain('mobile');
    });
  });

  // ========== Android ==========

  describe('android detection', () => {
    it('should detect android when build.gradle contains com.android', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('build.gradle') || p.endsWith('/android')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('build.gradle')) {
          return "apply plugin: 'com.android.application'";
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('android');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should detect android when build.gradle.kts contains com.android', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('build.gradle.kts') || p.endsWith('/android')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('build.gradle.kts')) {
          return 'plugins { id("com.android.application") }';
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('android');
      expect(result.plugins).not.toContain('mobile');
    });

    it('should not detect android when build.gradle lacks com.android', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('build.gradle')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('build.gradle')) {
          return "apply plugin: 'java'";
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      // android dir doesn't exist AND build.gradle lacks com.android
      expect(result.types).not.toContain('android');
    });

    it('should handle empty build.gradle gracefully (fileContains returns false)', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('build.gradle')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('build.gradle')) {
          return '';
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).not.toContain('android');
    });
  });

  // ========== Combined detection ==========

  describe('combined mobile detection', () => {
    it('should detect both expo and react-native when both present, plugins []', () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('package.json')
      );
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return JSON.stringify({
            dependencies: { expo: '~49.0.0', 'react-native': '^0.72.0' },
          });
        }
        throw new Error('ENOENT');
      });

      const result = detectProjectType('/fake/project');
      expect(result.types).toContain('react-native');
      expect(result.types).toContain('expo');
      expect(result.plugins).not.toContain('mobile');
    });
  });

  // ========== getDetectionRules / getRecommendedPlugins ==========

  describe('getDetectionRules - mobile rules have empty plugins', () => {
    it('all mobile rules should have plugins: []', () => {
      const rules = getDetectionRules();
      const mobileTypes = ['react-native', 'expo', 'ios', 'android'];

      for (const mobileType of mobileTypes) {
        const rule = rules.find((r) => r.type === mobileType);
        expect(rule, `rule for ${mobileType} should exist`).toBeDefined();
        expect(rule!.plugins, `${mobileType} should have empty plugins`).toEqual([]);
      }
    });
  });

  describe('getRecommendedPlugins - mobile types yield no plugins', () => {
    it('should return empty array for mobile-only types', () => {
      const plugins = getRecommendedPlugins(['react-native', 'expo', 'ios', 'android']);
      expect(plugins).toEqual([]);
      expect(plugins).not.toContain('mobile');
    });
  });
});
