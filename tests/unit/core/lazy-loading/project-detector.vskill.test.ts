/**
 * Tests for vskillPlugins field in project-detector.ts
 *
 * TDD RED phase: Tests define expected behavior for vskillPlugins
 * field on ProjectTypeResult and mobile detection rules.
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
  type ProjectTypeResult,
} from '../../../../src/core/lazy-loading/project-detector.js';

describe('project-detector vskillPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
  });

  it('TC-001: project with Podfile returns vskillPlugins: ["mobile"]', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('Podfile'));
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins).toBeDefined();
    expect(result.vskillPlugins).toContain('mobile');
  });

  it('TC-002: project with ios/ directory returns vskillPlugins: ["mobile"]', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('/ios'));
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins).toBeDefined();
    expect(result.vskillPlugins).toContain('mobile');
  });

  it('TC-003: package.json with react-native returns vskillPlugins: ["mobile"]', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package.json'));
    mockReadFileSync.mockReturnValue(JSON.stringify({
      dependencies: { 'react-native': '0.73.0' },
    }));
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins).toBeDefined();
    expect(result.vskillPlugins).toContain('mobile');
  });

  it('TC-004: package.json with expo returns vskillPlugins: ["mobile"]', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package.json'));
    mockReadFileSync.mockReturnValue(JSON.stringify({
      dependencies: { expo: '~50.0.0' },
    }));
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins).toBeDefined();
    expect(result.vskillPlugins).toContain('mobile');
  });

  it('TC-005: plain Node.js project returns empty vskillPlugins', () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('package.json'));
    mockReadFileSync.mockReturnValue(JSON.stringify({
      dependencies: { express: '4.18.0' },
    }));
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins ?? []).toHaveLength(0);
  });

  it('TC-006: vskillPlugins is deduplicated when multiple mobile rules match', () => {
    // Both ios/ dir and Podfile exist
    mockExistsSync.mockImplementation((p: string) =>
      p.endsWith('/ios') || p.endsWith('Podfile')
    );
    const result = detectProjectType('/test-project');
    expect(result.vskillPlugins).toBeDefined();
    // Should be deduplicated to single "mobile" entry
    const mobileCount = result.vskillPlugins!.filter(p => p === 'mobile').length;
    expect(mobileCount).toBe(1);
  });
});
