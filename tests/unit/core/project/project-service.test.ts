/**
 * Unit tests for ProjectService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectService } from '../../../../src/core/project/project-service.js';

// Mock fs module
vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('ProjectService', () => {
  const testProjectRoot = '/test/project';
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    // Clear singleton instances before each test
    ProjectService.clearAllInstances();
    vi.clearAllMocks();
  });

  afterEach(() => {
    ProjectService.clearAllInstances();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for same project root', () => {
      const instance1 = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const instance2 = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      expect(instance1).toBe(instance2);
    });

    it('should return different instances for different project roots', () => {
      const instance1 = ProjectService.getInstance('/project1', mockLogger as any);
      const instance2 = ProjectService.getInstance('/project2', mockLogger as any);

      expect(instance1).not.toBe(instance2);
    });

    it('should normalize paths when creating instances', () => {
      // Note: path.normalize does NOT remove trailing slashes on all platforms
      // So we test with actual normalization cases like '..' resolution
      const instance1 = ProjectService.getInstance('/test/project', mockLogger as any);
      const instance2 = ProjectService.getInstance('/test/foo/../project', mockLogger as any);

      // Path normalization should resolve '..' and make these the same
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should mark as initialized after initialize()', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      expect(service.isInitialized()).toBe(false);

      // Mock fs to return no config files
      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      await service.initialize();

      expect(service.isInitialized()).toBe(true);
    });

    it('should only initialize once', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      await service.initialize();
      await service.initialize(); // Second call should be no-op

      // Debug log should only show once
      expect(mockLogger.debug).toHaveBeenCalledWith('Initializing ProjectService...');
      expect(mockLogger.info).toHaveBeenCalledWith('ProjectService initialized');
    });
  });

  describe('Registry Access', () => {
    it('should provide access to registry', () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const registry = service.getRegistry();

      expect(registry).toBeDefined();
      expect(registry.getEventBus).toBeDefined();
    });

    it('should provide access to event bus', () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const eventBus = service.getEventBus();

      expect(eventBus).toBeDefined();
      expect(eventBus.emit).toBeDefined();
    });
  });

  describe('Increment Event Bridging', () => {
    it('should handle increment.done event type', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      await service.initialize();

      // Should not throw even if no project is found for increment
      await expect(
        service.emitIncrementEvent('increment.done', '0145-test-increment')
      ).resolves.not.toThrow();
    });

    it('should parse event data with US ID format', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      await service.initialize();

      // Event data format: INC_ID:US_ID
      await expect(
        service.emitIncrementEvent('user-story.completed', '0145-test:US-001')
      ).resolves.not.toThrow();
    });

    it('should auto-initialize if not initialized', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      expect(service.isInitialized()).toBe(false);

      await service.emitIncrementEvent('increment.created', '0145-test');

      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('Instance Cleanup', () => {
    it('should clear specific instance', () => {
      const instance = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      expect(instance).toBeDefined();

      ProjectService.clearInstance(testProjectRoot);

      // New getInstance should create a new instance
      const newInstance = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      expect(newInstance).not.toBe(instance);
    });

    it('should clear all instances', () => {
      const instance1 = ProjectService.getInstance('/project1', mockLogger as any);
      const instance2 = ProjectService.getInstance('/project2', mockLogger as any);

      ProjectService.clearAllInstances();

      const newInstance1 = ProjectService.getInstance('/project1', mockLogger as any);
      const newInstance2 = ProjectService.getInstance('/project2', mockLogger as any);

      expect(newInstance1).not.toBe(instance1);
      expect(newInstance2).not.toBe(instance2);
    });
  });
});
