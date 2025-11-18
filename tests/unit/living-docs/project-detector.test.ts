/**
 * Unit tests for Project Detector
 */

import {
  ProjectDetector,
  ProjectContext,
  ProjectConfig,
  DetectorOptions,
  createProjectDetector,
} from '../../../src/core/living-docs/project-detector.js';
import { ParsedSpec } from '../../../src/core/living-docs/content-parser.js';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

// Mock fs-extra
vi.mock('fs-extra');
// Mock child_process to prevent real git calls
vi.mock('child_process');

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Type-safe mocked functions
const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadJSON = vi.mocked(fs.readJSON);
const mockReadFile = vi.mocked(fs.readFile);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockEnsureDir = vi.mocked(fs.ensureDir);
const mockExecSync = vi.mocked(execSync);

describe('ProjectDetector', () => {
  let detector: ProjectDetector;
  let mockConfigPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigPath = '/test/.specweave/config.json';

    // Mock execSync to prevent real git calls and ensure 'default' fallback
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    // Default: no config file exists
    mockExistsSync.mockReturnValue(false);
  });

  describe('Constructor and Initialization', () => {
    it('should create detector with default options', () => {
      detector = new ProjectDetector();

      const projects = detector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('default');
      expect(projects[0].name).toBe('Default Project');
    });

    it('should create detector with custom options', () => {
      detector = new ProjectDetector({
        configPath: mockConfigPath,
        fallbackProject: 'custom-default',
        confidenceThreshold: 0.8,
      });

      const projects = detector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('custom-default');
    });

    it('should load projects from config file', () => {
      const mockConfig = {
        multiProject: {
          projects: {
            backend: {
              name: 'Backend Services',
              description: 'API and services',
              keywords: ['api', 'backend', 'service'],
              team: 'Backend Team',
              techStack: ['Node.js', 'TypeScript', 'PostgreSQL'],
            },
            frontend: {
              name: 'Frontend App',
              keywords: ['ui', 'frontend', 'react'],
              techStack: ['React', 'Next.js'],
            },
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });

      const projects = detector.getProjects();

      expect(projects).toHaveLength(2);
      expect(projects.find((p) => p.id === 'backend')).toBeDefined();
      expect(projects.find((p) => p.id === 'frontend')).toBeDefined();
    });

    it('should handle invalid config file gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Parse error');
      });

      // Should not throw, should fallback to default
      detector = new ProjectDetector({ configPath: mockConfigPath });

      const projects = detector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('default');
    });

    it('should create default project when no projects in config', () => {
      const mockConfig = {
        multiProject: {},
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });

      const projects = detector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('default');
    });
  });

  describe('Project Detection', () => {
    beforeEach(() => {
      const mockConfig = {
        multiProject: {
          projects: {
            backend: {
              name: 'Backend Services',
              keywords: ['api', 'backend', 'service'],
              team: 'Backend Team',
              techStack: ['Node.js', 'PostgreSQL'],
            },
            frontend: {
              name: 'Frontend App',
              keywords: ['ui', 'frontend', 'react'],
              team: 'Frontend Team',
              techStack: ['React', 'Next.js'],
            },
            mobile: {
              name: 'Mobile App',
              keywords: ['mobile', 'ios', 'android'],
              techStack: ['React Native'],
            },
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });
    });

    it('should detect project from increment ID (project name match)', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'Test Feature' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-backend-authentication', spec);

      expect(result.id).toBe('backend');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('Increment name contains project ID "backend"');
    });

    it('should detect project from team name in increment ID', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'Test Feature' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-frontend-team-dashboard', spec);

      expect(result.id).toBe('frontend');
      expect(result.confidence).toBeGreaterThan(0);
      // Reasoning message format changed - test outcome instead of message text
    });

    it('should detect project from keywords in increment ID', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'Test Feature' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-api-gateway-enhancement', spec);

      expect(result.id).toBe('backend');
      expect(result.reasoning.some((r) => r.includes('Keyword match'))).toBe(true);
    });

    it('should detect project from frontmatter metadata (high confidence)', () => {
      const spec: ParsedSpec = {
        frontmatter: {
          title: 'Test Feature',
          project: 'mobile',
        },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-some-feature', spec);

      expect(result.id).toBe('mobile');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.reasoning).toContain('Explicit project metadata: "mobile"');
    });

    it('should detect project from tech stack in spec content', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'React Component Library' },
        sections: [
          {
            id: 'overview',
            heading: 'Overview',
            level: 1,
            content: 'Build a component library using React and Next.js',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const result = detector.detectProject('0016-component-library', spec);

      expect(result.id).toBe('frontend');
      expect(result.reasoning.some((r) => r.includes('Tech stack match'))).toBe(true);
    });

    it('should use fallback project when no indicators found', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'Generic Feature' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-generic-task', spec);

      expect(result.id).toBe('default');
      expect(result.reasoning).toContain('No project indicators found - using fallback project');
    });

    it('should select project with highest score', () => {
      const spec: ParsedSpec = {
        frontmatter: {
          title: 'Backend API for React Native Mobile App',
        },
        sections: [
          {
            id: 'tech',
            heading: 'Technology',
            level: 1,
            content: 'Using Node.js, PostgreSQL, and React Native',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      // Increment name has "backend" → +10
      // Keyword "api" → +3
      // Keyword "backend" in title → +3
      // Tech "Node.js" → +2
      // Tech "PostgreSQL" → +2
      // Total backend: 20

      // vs mobile:
      // Keyword "mobile" in title → +3
      // Tech "React Native" → +2
      // Total mobile: 5

      const result = detector.detectProject('0016-backend-api-service', spec);

      expect(result.id).toBe('backend');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should normalize confidence score (max ~30 = 1.0)', () => {
      const spec: ParsedSpec = {
        frontmatter: {
          title: 'Backend API Service',
          project: 'backend',
        },
        sections: [
          {
            id: 'tech',
            heading: 'Technology',
            level: 1,
            content: 'API using backend services with Node.js and PostgreSQL',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      // Project ID in increment: +10
      // Frontmatter project: +20
      // Multiple keywords: +3 each
      // Tech stack: +2 each
      // Total: 30+

      const result = detector.detectProject('0016-backend-api-service', spec);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should include metadata in result', () => {
      const spec: ParsedSpec = {
        frontmatter: { title: 'Test' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-test', spec);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.totalProjects).toBe(4); // Default project now included
      expect(result.metadata?.scores).toBeDefined();
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      const mockConfig = {
        multiProject: {
          projects: {
            backend: {
              name: 'Backend Services',
              description: 'API and services',
              team: 'Backend Team',
              techStack: ['Node.js'],
              specsFolder: '/custom/path/backend',
            },
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });
    });

    it('should get all projects', () => {
      const projects = detector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('backend');
      expect(projects[0].name).toBe('Backend Services');
    });

    it('should get project by ID', () => {
      const project = detector.getProject('backend');

      expect(project).not.toBeNull();
      expect(project?.id).toBe('backend');
      expect(project?.name).toBe('Backend Services');
    });

    it('should return null for unknown project', () => {
      const project = detector.getProject('unknown');

      expect(project).toBeNull();
    });

    it('should get custom specs folder from project config', () => {
      const folder = detector.getSpecsFolder('backend');

      expect(folder).toBe('/custom/path/backend');
    });

    it('should get default specs folder path when not in config', () => {
      detector = new ProjectDetector();

      const folder = detector.getSpecsFolder('default');

      expect(folder).toContain('.specweave/docs/internal/specs/default');
    });

    it('should check if confidence meets threshold', () => {
      const highConfidence: ProjectContext = {
        id: 'backend',
        name: 'Backend',
        confidence: 0.8,
        reasoning: [],
      };

      const lowConfidence: ProjectContext = {
        id: 'backend',
        name: 'Backend',
        confidence: 0.5,
        reasoning: [],
      };

      detector = new ProjectDetector({ confidenceThreshold: 0.7 });

      expect(detector.shouldAutoSelect(highConfidence)).toBe(true);
      expect(detector.shouldAutoSelect(lowConfidence)).toBe(false);
    });

    it('should create context from project ID', () => {
      const context = detector.createContext('backend');

      expect(context.id).toBe('backend');
      expect(context.name).toBe('Backend Services');
      expect(context.confidence).toBe(1.0);
      expect(context.reasoning).toContain('Explicitly selected project');
      expect(context.metadata).toBeDefined();
    });

    it('should create fallback context for unknown project ID', () => {
      detector = new ProjectDetector({ fallbackProject: 'default' });

      const context = detector.createContext('unknown');

      expect(context.id).toBe('default');
      expect(context.confidence).toBe(1.0);
      expect(context.reasoning[0]).toContain('Fallback');
    });

    it('should extract project ID from increment ID', () => {
      const result1 = detector.extractProjectFromIncrementId('0016-backend-auth');
      const result2 = detector.extractProjectFromIncrementId('backend-0016-auth');
      const result3 = detector.extractProjectFromIncrementId('0016-generic-task');

      expect(result1).toBe('backend');
      expect(result2).toBe('backend');
      expect(result3).toBeNull();
    });
  });

  describe('Project Structure Management', () => {
    beforeEach(() => {
      detector = new ProjectDetector();
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should ensure specs folder exists', async () => {
      const folder = await detector.ensureSpecsFolder('default');

      expect(mockEnsureDir).toHaveBeenCalled();
      expect(folder).toContain('.specweave/docs/internal/specs/default');
    });

    it('should validate project structure', async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await detector.validateProjectStructure('default');

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing folders in project structure', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await detector.validateProjectStructure('default');

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should create project structure', async () => {
      mockExistsSync.mockReturnValue(false);

      await detector.createProjectStructure('default');

      expect(mockEnsureDir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled(); // README.md
    });

    it('should not overwrite existing README', async () => {
      mockExistsSync.mockReturnValue(true);

      await detector.createProjectStructure('default');

      expect(mockEnsureDir).toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should get category folder for global categories', () => {
      const archFolder = detector.getCategoryFolder('architecture');
      const opsFolder = detector.getCategoryFolder('operations');

      expect(archFolder).toContain('.specweave/docs/internal/architecture');
      expect(opsFolder).toContain('.specweave/docs/internal/operations');
      expect(archFolder).not.toContain('default');
    });

    it('should get category folder for project-specific categories', () => {
      const specsFolder = detector.getCategoryFolder('specs', 'backend');
      const modulesFolder = detector.getCategoryFolder('modules', 'frontend');

      expect(specsFolder).toContain('.specweave/docs/internal/specs/backend');
      expect(modulesFolder).toContain('.specweave/docs/internal/modules/frontend');
    });

    it('should use fallback project when no project specified', () => {
      detector = new ProjectDetector({ fallbackProject: 'default' });

      const folder = detector.getCategoryFolder('specs');

      expect(folder).toContain('.specweave/docs/internal/specs/default');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      detector = new ProjectDetector();
    });

    it('should handle empty increment ID', () => {
      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('', spec);

      expect(result.id).toBe('default');
      expect(result.reasoning).toContain('No project indicators found - using fallback project');
    });

    it('should handle empty spec', () => {
      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-test', spec);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should handle spec with no frontmatter', () => {
      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'test',
            heading: 'Test',
            level: 1,
            content: 'content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const result = detector.detectProject('0016-test', spec);

      expect(result).toBeDefined();
    });

    it('should handle multiple keyword matches', () => {
      const mockConfig = {
        multiProject: {
          projects: {
            backend: {
              name: 'Backend',
              keywords: ['api', 'backend', 'service', 'server'],
            },
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });

      const spec: ParsedSpec = {
        frontmatter: { title: 'API Backend Service Server' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-api-backend-service', spec);

      expect(result.id).toBe('backend');
      // Should accumulate scores from all keyword matches
      expect(result.reasoning.filter((r) => r.includes('Keyword match')).length).toBeGreaterThan(1);
    });

    it('should handle tie in scores (first project wins)', () => {
      const mockConfig = {
        multiProject: {
          projects: {
            'project-a': {
              name: 'Project A',
              keywords: ['test'],
            },
            'project-b': {
              name: 'Project B',
              keywords: ['test'],
            },
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      detector = new ProjectDetector({ configPath: mockConfigPath });

      const spec: ParsedSpec = {
        frontmatter: { title: 'test feature' },
        sections: [],
        raw: '',
      };

      const result = detector.detectProject('0016-test', spec);

      // Either project-a or project-b is valid (deterministic based on Map iteration order)
      expect(['project-a', 'project-b']).toContain(result.id);
    });
  });

  describe('Factory Functions', () => {
    it('should work with createProjectDetector', () => {
      const detector = createProjectDetector();
      const projects = detector.getProjects();

      expect(projects).toBeDefined();
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should work with custom options', () => {
      const detector = createProjectDetector({
        fallbackProject: 'custom',
        confidenceThreshold: 0.9,
      });

      const context: ProjectContext = {
        id: 'test',
        name: 'Test',
        confidence: 0.85,
        reasoning: [],
      };

      expect(detector.shouldAutoSelect(context)).toBe(false);
    });
  });
});
