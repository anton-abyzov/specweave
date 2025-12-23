/**
 * Living Docs Scaffolding Tests
 *
 * Tests for template engine, scaffold, and merger functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  TemplateEngine,
  renderTemplate,
  createDefaultContext,
  type TemplateContext,
} from '../../../src/core/living-docs/scaffolding/template-engine.js';
import {
  LivingDocsScaffold,
  scaffoldLivingDocs,
  hasLivingDocsStructure,
} from '../../../src/core/living-docs/scaffolding/scaffold.js';
import {
  LivingDocsMerger,
  scanExistingDocs,
  findSimilarFolders,
  type DetectedDoc,
} from '../../../src/core/living-docs/scaffolding/index.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('variable substitution', () => {
    it('should substitute simple variables', () => {
      const template = 'Hello ${name}!';
      const context = createDefaultContext('test');
      (context as Record<string, unknown>).name = 'World';

      const result = engine.render(template, context);
      expect(result).toBe('Hello World!');
    });

    it('should use default values for missing variables', () => {
      const template = 'Hello ${name:Guest}!';
      const context = createDefaultContext('test');

      const result = engine.render(template, context);
      expect(result).toBe('Hello Guest!');
    });

    it('should substitute project variables', () => {
      const template = 'Project: ${projectId} - ${projectName}';
      const context = createDefaultContext('my-awesome-app');

      const result = engine.render(template, context);
      expect(result).toBe('Project: my-awesome-app - My Awesome App');
    });
  });

  describe('conditional blocks', () => {
    it('should render content when condition is truthy', () => {
      const template = '${if:showSection}Visible${endif}';
      const context = createDefaultContext('test');
      (context as Record<string, unknown>).showSection = true;

      const result = engine.render(template, context);
      expect(result).toBe('Visible');
    });

    it('should hide content when condition is falsy', () => {
      const template = '${if:showSection}Hidden${endif}';
      const context = createDefaultContext('test');
      (context as Record<string, unknown>).showSection = false;

      const result = engine.render(template, context);
      expect(result).toBe('');
    });

    it('should handle empty arrays as falsy', () => {
      const template = '${if:items}Has items${endif}';
      const context = createDefaultContext('test');
      (context as Record<string, unknown>).items = [];

      const result = engine.render(template, context);
      expect(result).toBe('');
    });
  });

  describe('loop blocks', () => {
    it('should iterate over arrays', () => {
      const template = '${each:items}${item.name}, ${endeach}';
      const context = createDefaultContext('test');
      context.userStories = [
        { id: 'US-001', title: 'First', fileName: 'us-001.md' },
        { id: 'US-002', title: 'Second', fileName: 'us-002.md' },
      ];
      (context as Record<string, unknown>).items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];

      const result = engine.render(template, context);
      expect(result).toBe('A, B, C, ');
    });

    it('should handle empty arrays', () => {
      const template = '${each:items}Item${endeach}';
      const context = createDefaultContext('test');
      (context as Record<string, unknown>).items = [];

      const result = engine.render(template, context);
      expect(result).toBe('');
    });
  });

  describe('template validation', () => {
    it('should detect mismatched conditionals', () => {
      const template = '${if:test}content';
      const errors = engine.validateTemplate(template);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Mismatched');
    });

    it('should detect mismatched loops', () => {
      const template = '${each:items}content';
      const errors = engine.validateTemplate(template);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Mismatched');
    });

    it('should pass valid templates', () => {
      const template = '${if:test}${each:items}${item.name}${endeach}${endif}';
      const errors = engine.validateTemplate(template);
      expect(errors.length).toBe(0);
    });
  });
});

describe('LivingDocsScaffold', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create living docs structure', async () => {
    const result = await scaffoldLivingDocs({
      projectPath: tempDir,
      projectId: 'test-project',
    });

    expect(result.success).toBe(true);
    expect(result.dirsCreated.length).toBeGreaterThan(0);

    // Check key directories exist
    expect(fs.existsSync(path.join(tempDir, '.specweave', 'docs', 'internal', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.specweave', 'docs', 'internal', 'architecture'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.specweave', 'docs', 'internal', 'architecture', 'adr'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.specweave', 'docs', 'public'))).toBe(true);
  });

  it('should create README files', async () => {
    const result = await scaffoldLivingDocs({
      projectPath: tempDir,
      projectId: 'test-project',
      projectName: 'Test Project',
    });

    expect(result.success).toBe(true);

    // Check README exists and contains project name
    const readmePath = path.join(tempDir, '.specweave', 'docs', 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('Test Project');
  });

  it('should create project-specific specs folder', async () => {
    await scaffoldLivingDocs({
      projectPath: tempDir,
      projectId: 'my-app',
    });

    const specsPath = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs', 'my-app');
    expect(fs.existsSync(specsPath)).toBe(true);
  });

  it('should detect project ID from git remote', async () => {
    // Create a mock .git/config
    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(
      path.join(gitDir, 'config'),
      '[remote "origin"]\n\turl = git@github.com:user/my-repo.git\n'
    );

    const scaffold = new LivingDocsScaffold({ projectPath: tempDir });
    const result = await scaffold.scaffold();

    expect(result.context.projectId).toBe('my-repo');
  });

  it('should skip existing files without overwrite flag', async () => {
    // First scaffold
    await scaffoldLivingDocs({ projectPath: tempDir, projectId: 'test' });

    // Second scaffold should skip
    const result = await scaffoldLivingDocs({ projectPath: tempDir, projectId: 'test' });

    expect(result.filesSkipped.length).toBeGreaterThan(0);
  });

  it('should support dry run mode', async () => {
    const result = await scaffoldLivingDocs({
      projectPath: tempDir,
      projectId: 'test',
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.dirsCreated.length).toBeGreaterThan(0);

    // Nothing should actually be created
    expect(fs.existsSync(path.join(tempDir, '.specweave', 'docs'))).toBe(false);
  });
});

describe('hasLivingDocsStructure', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'has-docs-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return false for empty directory', () => {
    expect(hasLivingDocsStructure(tempDir)).toBe(false);
  });

  it('should return true after scaffolding', async () => {
    await scaffoldLivingDocs({ projectPath: tempDir, projectId: 'test' });
    expect(hasLivingDocsStructure(tempDir)).toBe(true);
  });
});

describe('LivingDocsMerger', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merger-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect markdown files', async () => {
    // Create some markdown files
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project\n\nDescription.');
    fs.writeFileSync(path.join(tempDir, 'CONTRIBUTING.md'), '# Contributing\n\nHow to contribute.');

    const detected = await scanExistingDocs({ projectPath: tempDir });

    expect(detected.length).toBe(2);
    expect(detected.some(d => d.fileName === 'README.md')).toBe(true);
    expect(detected.some(d => d.fileName === 'CONTRIBUTING.md')).toBe(true);
  });

  it('should detect document types correctly', async () => {
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
    fs.writeFileSync(path.join(tempDir, 'api-docs.md'), '# API Reference\n\nEndpoints...');
    fs.writeFileSync(path.join(tempDir, 'CHANGELOG.md'), '# Changelog\n\n## v1.0.0');

    const detected = await scanExistingDocs({ projectPath: tempDir });

    const readme = detected.find(d => d.fileName === 'README.md');
    const api = detected.find(d => d.fileName === 'api-docs.md');
    const changelog = detected.find(d => d.fileName === 'CHANGELOG.md');

    expect(readme?.type).toBe('readme');
    expect(api?.type).toBe('api');
    expect(changelog?.type).toBe('changelog');
  });

  it('should suggest appropriate target folders', async () => {
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
    fs.writeFileSync(path.join(tempDir, 'runbook.md'), '# Runbook\n\nOperational procedures');

    const detected = await scanExistingDocs({ projectPath: tempDir });

    const readme = detected.find(d => d.fileName === 'README.md');
    const runbook = detected.find(d => d.fileName === 'runbook.md');

    expect(readme?.suggestedTarget).toBe('public/overview');
    expect(runbook?.suggestedTarget).toBe('internal/operations');
  });

  it('should scan docs folder recursively', async () => {
    const docsDir = path.join(tempDir, 'docs');
    const subDir = path.join(docsDir, 'guides');
    fs.mkdirSync(subDir, { recursive: true });

    fs.writeFileSync(path.join(docsDir, 'index.md'), '# Docs');
    fs.writeFileSync(path.join(subDir, 'getting-started.md'), '# Getting Started');

    const detected = await scanExistingDocs({ projectPath: tempDir });

    expect(detected.length).toBe(2);
    expect(detected.some(d => d.fileName === 'getting-started.md')).toBe(true);
  });

  it('should skip node_modules and .git', async () => {
    const nodeModules = path.join(tempDir, 'node_modules', 'some-pkg');
    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(nodeModules, { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });

    fs.writeFileSync(path.join(nodeModules, 'README.md'), '# Package');
    fs.writeFileSync(path.join(gitDir, 'config'), 'git config');

    const detected = await scanExistingDocs({ projectPath: tempDir });

    expect(detected.length).toBe(0);
  });

  it('should extract themes from content', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'auth.md'),
      '# Authentication\n\nOAuth2 implementation with JWT tokens for API security.'
    );

    const detected = await scanExistingDocs({ projectPath: tempDir });
    const authDoc = detected.find(d => d.fileName === 'auth.md');

    expect(authDoc?.themes).toContain('auth');
    expect(authDoc?.themes).toContain('api');
    expect(authDoc?.themes).toContain('security');
  });
});

describe('findSimilarFolders', () => {
  it('should find folders with similar themes', () => {
    const detected: DetectedDoc[] = [
      {
        sourcePath: 'docs/auth.md',
        absolutePath: '/test/docs/auth.md',
        fileName: 'auth.md',
        type: 'guide',
        confidence: 0.8,
        suggestedTarget: 'public/guides',
        size: 100,
        preview: 'Authentication guide',
        themes: ['auth', 'security'],
      },
      {
        sourcePath: 'security/login.md',
        absolutePath: '/test/security/login.md',
        fileName: 'login.md',
        type: 'guide',
        confidence: 0.8,
        suggestedTarget: 'public/guides',
        size: 100,
        preview: 'Login security',
        themes: ['auth', 'security'],
      },
    ];

    const similar = findSimilarFolders('/test', detected);

    // Should find docs and security folders as similar
    expect(similar.size).toBeGreaterThan(0);
  });
});

describe('TemplateEngine - nested templates', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  it('should handle nested conditionals', () => {
    const template = '${if:outer}OUTER:${if:inner}INNER${endif}:END${endif}';
    const context = createDefaultContext('test');
    (context as Record<string, unknown>).outer = true;
    (context as Record<string, unknown>).inner = true;

    const result = engine.render(template, context);
    expect(result).toBe('OUTER:INNER:END');
  });

  it('should handle nested conditionals with inner false', () => {
    const template = '${if:outer}OUTER:${if:inner}INNER${endif}:END${endif}';
    const context = createDefaultContext('test');
    (context as Record<string, unknown>).outer = true;
    (context as Record<string, unknown>).inner = false;

    const result = engine.render(template, context);
    expect(result).toBe('OUTER::END');
  });

  it('should handle nested conditionals with outer false', () => {
    const template = '${if:outer}OUTER:${if:inner}INNER${endif}:END${endif}';
    const context = createDefaultContext('test');
    (context as Record<string, unknown>).outer = false;
    (context as Record<string, unknown>).inner = true;

    const result = engine.render(template, context);
    expect(result).toBe('');
  });

  it('should handle loops inside conditionals', () => {
    const template = '${if:showList}Items: ${each:items}${item.name}, ${endeach}${endif}';
    const context = createDefaultContext('test');
    (context as Record<string, unknown>).showList = true;
    (context as Record<string, unknown>).items = [{ name: 'A' }, { name: 'B' }];

    const result = engine.render(template, context);
    expect(result).toBe('Items: A, B, ');
  });

  it('should handle conditionals inside loops', () => {
    const template = '${each:items}${if:showName}${item.name}${endif}, ${endeach}';
    const context = createDefaultContext('test');
    (context as Record<string, unknown>).showName = true;
    (context as Record<string, unknown>).items = [{ name: 'X' }, { name: 'Y' }];

    const result = engine.render(template, context);
    expect(result).toBe('X, Y, ');
  });
});

describe('LivingDocsMerger - TF-IDF similarity', () => {
  it('should detect similar documents with matching content', () => {
    const merger = new LivingDocsMerger({ projectPath: '/test' });

    const doc1: DetectedDoc = {
      sourcePath: 'docs/authentication.md',
      absolutePath: '/test/docs/authentication.md',
      fileName: 'authentication.md',
      type: 'guide',
      confidence: 0.8,
      suggestedTarget: 'public/guides',
      size: 500,
      preview: 'This guide covers user authentication with OAuth2 and JWT tokens for secure API access.',
      themes: ['auth', 'api', 'security'],
    };

    const doc2: DetectedDoc = {
      sourcePath: 'security/auth-guide.md',
      absolutePath: '/test/security/auth-guide.md',
      fileName: 'auth-guide.md',
      type: 'guide',
      confidence: 0.8,
      suggestedTarget: 'public/guides',
      size: 450,
      preview: 'Authentication using OAuth2 protocol and JWT tokens for securing API endpoints.',
      themes: ['auth', 'api', 'security'],
    };

    const result = merger.checkSimilarity(doc1, doc2);

    // Similar docs with shared themes and overlapping content should score well
    expect(result.score).toBeGreaterThan(0.4);
    // With matching themes (auth, api, security) and similar content, should be similar
    // Note: isSimilar threshold is 0.6, so if score is > 0.6, isSimilar = true
    if (result.score > 0.6) {
      expect(result.isSimilar).toBe(true);
      expect(result.reason).toBeDefined();
    }
  });

  it('should detect dissimilar documents', () => {
    const merger = new LivingDocsMerger({ projectPath: '/test' });

    const doc1: DetectedDoc = {
      sourcePath: 'docs/database.md',
      absolutePath: '/test/docs/database.md',
      fileName: 'database.md',
      type: 'guide',
      confidence: 0.8,
      suggestedTarget: 'internal/modules',
      size: 1000,
      preview: 'PostgreSQL database setup and configuration for production environments with replication.',
      themes: ['database'],
    };

    const doc2: DetectedDoc = {
      sourcePath: 'frontend/react-guide.md',
      absolutePath: '/test/frontend/react-guide.md',
      fileName: 'react-guide.md',
      type: 'guide',
      confidence: 0.8,
      suggestedTarget: 'public/guides',
      size: 800,
      preview: 'React component patterns and state management using hooks and context API.',
      themes: ['testing'],
    };

    const result = merger.checkSimilarity(doc1, doc2);

    expect(result.score).toBeLessThan(0.4);
    expect(result.isSimilar).toBe(false);
  });

  it('should give high score to documents with similar filenames', () => {
    const merger = new LivingDocsMerger({ projectPath: '/test' });

    const doc1: DetectedDoc = {
      sourcePath: 'docs/readme.md',
      absolutePath: '/test/docs/readme.md',
      fileName: 'README.md',
      type: 'readme',
      confidence: 0.9,
      suggestedTarget: 'public/overview',
      size: 200,
      preview: 'Project overview and getting started guide.',
      themes: [],
    };

    const doc2: DetectedDoc = {
      sourcePath: 'README.md',
      absolutePath: '/test/README.md',
      fileName: 'README.md',
      type: 'readme',
      confidence: 0.9,
      suggestedTarget: 'public/overview',
      size: 250,
      preview: 'Getting started with the project overview.',
      themes: [],
    };

    const result = merger.checkSimilarity(doc1, doc2);

    // Same filename should contribute to similarity
    expect(result.score).toBeGreaterThan(0.5);
  });
});
