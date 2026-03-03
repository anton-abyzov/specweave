/**
 * ProjectResolutionService Tests
 *
 * Tests for centralized project resolution with priority-based fallback.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProjectResolutionService, ResolvedProject } from '../../../../src/core/project/project-resolution.js';
import { ConfigManager } from '../../../../src/core/config/config-manager.js';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock fs for unit tests
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn()
    }
  };
});

describe('ProjectResolutionService', () => {
  let service: ProjectResolutionService;
  let mockConfigManager: {
    read: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
  };
  const mockLogger = {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigManager = {
      read: vi.fn(),
      load: vi.fn()
    };

    service = new ProjectResolutionService('/test/root', {
      logger: mockLogger,
      configManager: mockConfigManager as unknown as ConfigManager
    });
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('resolveFromPerUSFields', () => {
    it('resolves from single **Project**: field with high confidence', async () => {
      const spec = `
# Increment Spec

## User Stories

### US-001: Feature
**Project**: my-app
**Priority**: P1

**As a** user...
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-app');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('per-us');
      expect(result.reasoning).toContain('Single project found in US fields: my-app');
    });

    it('handles multiple projects (cross-project increment) with medium confidence', async () => {
      const spec = `
### US-001: Frontend
**Project**: web-app
**As a** user...

### US-002: Backend
**Project**: api-service
**As a** developer...
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('web-app');
      expect(result.confidence).toBe('medium');
      expect(result.source).toBe('per-us');
      expect(result.reasoning.some(r => r.includes('Multiple projects found'))).toBe(true);
    });

    it('deduplicates repeated project names', async () => {
      const spec = `
### US-001: Feature A
**Project**: my-app

### US-002: Feature B
**Project**: my-app

### US-003: Feature C
**Project**: my-app
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-app');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('per-us');
    });

    it('handles case-insensitive project names', async () => {
      const spec = `
### US-001: Feature
**Project**: My-App
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-app');
    });
  });

  describe('resolveFromConfig', () => {
    it('uses config.project.name in single-project mode', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'my-project' }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-project');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('config');
    });

    it('skips config fallback in multi-project mode', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: true, projects: {} }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      // Should fall through to fallback since multi-project mode has no per-US and no detection
      expect(result.source).toBe('fallback');
    });

    it('returns null when project.name is missing', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: {}
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.source).toBe('fallback');
      expect(result.projectId).toBe('default');
    });
  });

  describe('resolveFromIntelligentDetection', () => {
    it('matches project ID in spec content (high score)', async () => {
      const spec = `
# Increment: Frontend Improvements

This increment improves the frontend-app experience.
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: {
          enabled: true,
          projects: {
            'frontend-app': { name: 'Frontend', keywords: [] },
            'backend-api': { name: 'Backend', keywords: [] }
          }
        }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('frontend-app');
      expect(result.confidence).toBe('medium');
      expect(result.source).toBe('detection');
    });

    it('matches project keywords (lower score)', async () => {
      const spec = `
# Increment: Database Optimization

This increment improves database queries and performance.
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: {
          enabled: true,
          projects: {
            'frontend-app': { name: 'Frontend', keywords: ['react', 'ui'] },
            'backend-api': { name: 'Backend', keywords: ['database', 'api', 'performance'] }
          }
        }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('backend-api');
      expect(result.source).toBe('detection');
    });

    it('returns null when no keywords match', async () => {
      const spec = `
# Increment: Generic Feature

No project-specific keywords here.
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: {
          enabled: true,
          projects: {
            'frontend-app': { name: 'Frontend', keywords: ['react'] }
          }
        }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.source).toBe('fallback');
    });
  });

  describe('getAvailableProjects umbrella fallback (AC-US3-04)', () => {
    it('falls back to childRepos names when umbrella enabled and multiProject absent', async () => {
      const spec = `
# Increment: VSkill Feature

This increment improves vskill functionality.
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'specweave', name: 'SpecWeave', path: 'repositories/org/specweave', prefix: 'SW' },
            { id: 'vskill', name: 'VSkill', path: 'repositories/org/vskill', prefix: 'VS' },
          ],
        },
      });

      const result = await service.resolveProjectForIncrement('0001-vskill-feature');

      // Should use detection with the umbrella childRepos as available projects
      expect(result.projectId).toBe('vskill');
      expect(result.source).toBe('detection');
    });

    it('returns populated projects list normally when multiProject is configured', async () => {
      const spec = `
# Increment: Frontend Feature

This increment improves the frontend-app.
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: {
          enabled: true,
          projects: {
            'frontend-app': { name: 'Frontend', keywords: [] },
            'backend-api': { name: 'Backend', keywords: [] },
          },
        },
      });

      const result = await service.resolveProjectForIncrement('0001-frontend-feature');

      expect(result.projectId).toBe('frontend-app');
      expect(result.source).toBe('detection');
    });
  });

  describe('resolveFallback', () => {
    it('returns "default" with low confidence', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: true, projects: {} }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('default');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('fallback');
      expect(result.reasoning).toContain('Using fallback project: default');
    });
  });

  describe('caching', () => {
    it('caches resolved projects', async () => {
      const spec = `**Project**: my-app`;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      await service.resolveProjectForIncrement('0001-test');
      await service.resolveProjectForIncrement('0001-test');

      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only called once
    });

    it('clears cache on demand', async () => {
      const spec = `**Project**: my-app`;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      await service.resolveProjectForIncrement('0001-test');
      service.clearCache();
      await service.resolveProjectForIncrement('0001-test');

      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('reports correct cache statistics', async () => {
      const spec = `**Project**: my-app`;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      await service.resolveProjectForIncrement('0001-test');
      await service.resolveProjectForIncrement('0002-auth');

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('0001-test');
      expect(stats.keys).toContain('0002-auth');
    });
  });

  describe('extractProjectsFromUSFields', () => {
    it('extracts single project', () => {
      const content = '**Project**: frontend-app\n**As a** user...';
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toEqual(['frontend-app']);
    });

    it('extracts multiple unique projects', () => {
      const content = `
**Project**: web-app
**As a** user...

**Project**: api-service
**As a** developer...
      `;
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toContain('web-app');
      expect(projects).toContain('api-service');
      expect(projects.length).toBe(2);
    });

    it('deduplicates repeated projects', () => {
      const content = `
**Project**: my-app

**Project**: my-app

**Project**: my-app
      `;
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toEqual(['my-app']);
    });

    it('returns empty array when no projects found', () => {
      const content = 'No project fields here';
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toEqual([]);
    });

    it('handles mixed case', () => {
      const content = '**Project**: My-App';
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toEqual(['my-app']);
    });

    it('handles project names with numbers', () => {
      const content = '**Project**: app-v2';
      const projects = service.extractProjectsFromUSFields(content);

      expect(projects).toEqual(['app-v2']);
    });
  });

  describe('resolveProjectFromContent', () => {
    it('resolves from content directly without increment ID', async () => {
      const content = '**Project**: my-project';

      const result = await service.resolveProjectFromContent(content);

      expect(result.projectId).toBe('my-project');
      expect(result.source).toBe('per-us');
    });

    it('falls back to config when no per-US fields', async () => {
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'config-project' }
      });

      const result = await service.resolveProjectFromContent('No project field');

      expect(result.projectId).toBe('config-project');
      expect(result.source).toBe('config');
    });
  });

  describe('getAllProjectsForIncrement', () => {
    it('returns all unique projects from user stories', async () => {
      const spec = `
**Project**: frontend
**Project**: backend
**Project**: shared
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const projects = await service.getAllProjectsForIncrement('0001-test');

      expect(projects).toContain('frontend');
      expect(projects).toContain('backend');
      expect(projects).toContain('shared');
      expect(projects.length).toBe(3);
    });

    it('returns resolved project when spec cannot be read', async () => {
      vi.mocked(fs.readFile)
        .mockRejectedValueOnce(new Error('Not found')) // getAllProjects
        .mockRejectedValueOnce(new Error('Not found')); // resolveProject per-US

      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'fallback-project' }
      });

      const projects = await service.getAllProjectsForIncrement('0001-test');

      expect(projects).toEqual(['fallback-project']);
    });
  });

  describe('resolution priority chain', () => {
    it('prefers per-US over config', async () => {
      const spec = '**Project**: per-us-project';
      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'config-project' }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('per-us-project');
      expect(result.source).toBe('per-us');
    });

    it('prefers config over detection in single-project mode', async () => {
      const spec = 'No project fields but mentions frontend';
      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'config-project' }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('config-project');
      expect(result.source).toBe('config');
    });

    it('uses detection in multi-project mode when no per-US fields', async () => {
      const spec = 'This increment improves the frontend-app performance';
      vi.mocked(fs.readFile).mockResolvedValue(spec);
      mockConfigManager.read.mockResolvedValue({
        multiProject: {
          enabled: true,
          projects: {
            'frontend-app': { name: 'Frontend', keywords: [] },
            'backend-api': { name: 'Backend', keywords: [] }
          }
        }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('frontend-app');
      expect(result.source).toBe('detection');
    });
  });

  describe('edge cases', () => {
    it('handles empty spec content', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');
      mockConfigManager.read.mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'config-project' }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('config-project');
    });

    it('handles config read failure gracefully', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('No project field');
      mockConfigManager.read.mockRejectedValue(new Error('Config error'));

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('default');
      expect(result.source).toBe('fallback');
    });

    it('handles special characters in project names (kebab-case only)', async () => {
      const spec = '**Project**: my-special-app-123';
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-special-app-123');
    });

    it('ignores malformed project fields', async () => {
      const spec = `
**Project**:
**Project**:
**Project**:valid-project
      `;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('valid-project');
    });
  });
});
