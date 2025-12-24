/**
 * Mermaid Generator Unit Tests
 *
 * Tests for diagram generation including the v1.0.48 fix for
 * consistent filename generation in index links.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MermaidGenerator, generateMermaidDiagrams } from '../../../../../src/core/living-docs/diagrams/mermaid-generator.js';

describe('MermaidGenerator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/architecture/diagrams'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should create diagrams folder structure', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        features: [],
        teams: [],
      });

      const result = await generator.generate();

      expect(fs.existsSync(path.join(testDir, '.specweave/docs/internal/architecture/diagrams'))).toBe(true);
      expect(result.savedFiles).toContain(path.join(testDir, '.specweave/docs/internal/architecture/diagrams/index.md'));
    });

    it('should generate team-organization.md with matching index link (v1.0.48 fix)', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        teams: [
          { name: 'Platform Team', repos: ['api', 'web'], members: [] },
        ],
      });

      const result = await generator.generate();

      // Verify the file is created with correct name
      const diagramsPath = path.join(testDir, '.specweave/docs/internal/architecture/diagrams');
      expect(fs.existsSync(path.join(diagramsPath, 'team-organization.md'))).toBe(true);

      // Verify the index links to the correct file
      const indexContent = fs.readFileSync(path.join(diagramsPath, 'index.md'), 'utf-8');
      expect(indexContent).toContain('./team-organization.md');
      expect(indexContent).not.toContain('./team-org-chart.md'); // Old wrong filename
    });

    it('should generate feature hierarchy diagram', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        features: [
          {
            featureId: 'FS-001',
            featureName: 'User Auth',
            project: 'backend',
            status: 'active',
            userStories: [
              { id: 'US-001', title: 'Login', status: 'completed' },
              { id: 'US-002', title: 'Logout', status: 'active' },
            ],
          },
        ],
      });

      const result = await generator.generate();

      const diagramsPath = path.join(testDir, '.specweave/docs/internal/architecture/diagrams');
      expect(fs.existsSync(path.join(diagramsPath, 'feature-hierarchy.md'))).toBe(true);

      const content = fs.readFileSync(path.join(diagramsPath, 'feature-hierarchy.md'), 'utf-8');
      expect(content).toContain('flowchart TB');
      expect(content).toContain('FS-001');
    });

    it('should set explicit filename on all diagrams', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        features: [{ featureId: 'FS-001', featureName: 'Test', project: 'p1', status: 'active', userStories: [] }],
        teams: [{ name: 'Team1', repos: ['r1'], members: [] }],
        repoAnalyses: new Map([
          ['repo1', {
            name: 'repo1', path: '/repo1', purpose: 'API service', keyConcepts: [],
            mainApis: [], patternsUsed: [], internalDependencies: [], externalDependencies: [],
            filesAnalyzed: 5, confidence: 'medium', analyzedAt: new Date().toISOString(), observations: [],
          }],
        ]),
      });

      const result = await generator.generate();

      // All generated files should have consistent naming
      const diagramsPath = path.join(testDir, '.specweave/docs/internal/architecture/diagrams');
      const files = fs.readdirSync(diagramsPath);

      // Check that index references match actual files
      const indexContent = fs.readFileSync(path.join(diagramsPath, 'index.md'), 'utf-8');

      for (const file of files) {
        if (file !== 'index.md') {
          // Index should reference each diagram file
          expect(indexContent).toContain(`./${file}`);
        }
      }
    });
  });

  describe('index generation', () => {
    it('should use explicit filename when available', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        teams: [{ name: 'Core Team', repos: ['core'], members: [] }],
      });

      await generator.generate();

      const indexPath = path.join(testDir, '.specweave/docs/internal/architecture/diagrams/index.md');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should use consistent naming
      expect(indexContent).toContain('[Team Organization](./team-organization.md)');
    });

    it('should include all generated diagrams in index', async () => {
      const generator = new MermaidGenerator({
        projectPath: testDir,
        projectName: 'test-project',
        features: [{ featureId: 'FS-001', featureName: 'Test', project: 'p1', status: 'active', userStories: [] }],
        teams: [{ name: 'Team1', repos: ['r1'], members: [] }],
      });

      const result = await generator.generate();

      const indexPath = path.join(testDir, '.specweave/docs/internal/architecture/diagrams/index.md');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should list all diagrams
      expect(indexContent).toContain('Available Diagrams');
      expect(indexContent).toContain('| Diagram | Type | Description |');
    });
  });
});
