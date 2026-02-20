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

    it('should handle increment.completed as alias for increment.done', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);

      const fsNative = await import('../../../../src/utils/fs-native.js');
      vi.mocked(fsNative.existsSync).mockReturnValue(false);

      await service.initialize();

      // increment.completed should be accepted without throwing
      await expect(
        service.emitIncrementEvent('increment.completed', '0250-test-increment')
      ).resolves.not.toThrow();
    });

    it('should trigger requestSync for increment.completed event', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const fsNative = await import('../../../../src/utils/fs-native.js');

      vi.mocked(fsNative.existsSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) return true;
        if (s.endsWith('config.json')) return true;
        if (s.endsWith('.env')) return false;
        return false;
      });
      vi.mocked(fsNative.readFileSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) {
          return 'project: test-project\n\n# Test\n';
        }
        if (s.endsWith('config.json')) {
          return JSON.stringify({ sync: { enabled: true } });
        }
        return '';
      });

      await service.initialize();

      const registry = service.getRegistry();
      const requestSyncSpy = vi.spyOn(registry, 'requestSync').mockResolvedValue();

      // increment.completed must trigger same sync as increment.done
      await service.emitIncrementEvent('increment.completed', '0250-test');

      expect(requestSyncSpy).toHaveBeenCalledWith('test-project', ['github', 'ado', 'jira']);
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

  describe('getProjectForIncrement Fallback Chain', () => {
    it('should fall back to config project when spec.md has no project field', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const fsNative = await import('../../../../src/utils/fs-native.js');

      // Mock: spec.md exists but has NO project field
      vi.mocked(fsNative.existsSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) return true;
        if (s.endsWith('config.json')) return true;
        if (s.endsWith('.env')) return false;
        return false;
      });
      vi.mocked(fsNative.readFileSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) {
          return '# 0206: Test Increment\n\n## User Stories\n\n### US-001: Test\n';
        }
        if (s.endsWith('config.json')) {
          return JSON.stringify({
            project: { name: 'specweave' },
            sync: {
              enabled: true,
              github: { enabled: true, owner: 'test-owner', repo: 'test-repo' },
            },
          });
        }
        return '';
      });

      await service.initialize();

      // Spy on registry.requestSync
      const registry = service.getRegistry();
      const requestSyncSpy = vi.spyOn(registry, 'requestSync').mockResolvedValue();

      await service.emitIncrementEvent('increment.done', '0206-test-increment');

      // MUST call requestSync - not silently drop the event
      expect(requestSyncSpy).toHaveBeenCalled();
    });

    it('should derive project ID from sync.github.owner/repo when project.name is missing', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const fsNative = await import('../../../../src/utils/fs-native.js');

      vi.mocked(fsNative.existsSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) return true;
        if (s.endsWith('config.json')) return true;
        if (s.endsWith('.env')) return false;
        return false;
      });
      vi.mocked(fsNative.readFileSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) {
          return '# Test\n\nNo project field here.\n';
        }
        if (s.endsWith('config.json')) {
          return JSON.stringify({
            sync: {
              enabled: true,
              github: { enabled: true, owner: 'my-org', repo: 'my-repo' },
            },
          });
        }
        return '';
      });

      await service.initialize();

      const registry = service.getRegistry();
      const requestSyncSpy = vi.spyOn(registry, 'requestSync').mockResolvedValue();

      await service.emitIncrementEvent('increment.created', '0206-test');

      // Should derive project from github owner/repo, not return null
      expect(requestSyncSpy).toHaveBeenCalled();
    });

    it('should still work when spec.md HAS a project field (no regression)', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const fsNative = await import('../../../../src/utils/fs-native.js');

      vi.mocked(fsNative.existsSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) return true;
        if (s.endsWith('config.json')) return true;
        if (s.endsWith('.env')) return false;
        return false;
      });
      vi.mocked(fsNative.readFileSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) {
          return 'project: my-existing-project\n\n# Test Increment\n';
        }
        if (s.endsWith('config.json')) {
          return JSON.stringify({ sync: { enabled: true } });
        }
        return '';
      });

      await service.initialize();

      const registry = service.getRegistry();
      const requestSyncSpy = vi.spyOn(registry, 'requestSync').mockResolvedValue();

      await service.emitIncrementEvent('increment.done', '0206-test');

      // Should find project from spec.md field
      expect(requestSyncSpy).toHaveBeenCalledWith('my-existing-project', expect.any(Array));
    });

    it('should handle increment.sync event type as catch-all', async () => {
      const service = ProjectService.getInstance(testProjectRoot, mockLogger as any);
      const fsNative = await import('../../../../src/utils/fs-native.js');

      vi.mocked(fsNative.existsSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) return true;
        if (s.endsWith('config.json')) return true;
        if (s.endsWith('.env')) return false;
        return false;
      });
      vi.mocked(fsNative.readFileSync).mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('spec.md')) {
          return 'project: test-project\n\n# Test\n';
        }
        if (s.endsWith('config.json')) {
          return JSON.stringify({ sync: { enabled: true } });
        }
        return '';
      });

      await service.initialize();

      const registry = service.getRegistry();
      const requestSyncSpy = vi.spyOn(registry, 'requestSync').mockResolvedValue();

      // increment.sync is sent by stop-sync.sh - must be handled
      await service.emitIncrementEvent('increment.sync' as any, '0206-test');

      expect(requestSyncSpy).toHaveBeenCalledWith('test-project', ['github', 'ado', 'jira']);
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
