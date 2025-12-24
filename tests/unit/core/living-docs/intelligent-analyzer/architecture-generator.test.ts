/**
 * Architecture Generator Unit Tests
 *
 * Tests for ADR detection and generation including the v1.0.48 fix
 * for unique ADR ID generation across all sources.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateArchitecture, saveArchitecture } from '../../../../../src/core/living-docs/intelligent-analyzer/architecture-generator.js';
import type { RepoAnalysis } from '../../../../../src/core/living-docs/intelligent-analyzer/types.js';

describe('architecture-generator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-gen-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/architecture/adr'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/architecture/diagrams'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('saveArchitecture', () => {
    it('should save ADR index inside adr/ folder (v1.0.48 fix)', async () => {
      const result = {
        c4Context: 'C4Context\n  title Test',
        c4Container: 'C4Container\n  title Test',
        dataFlow: 'flowchart TD\n  A --> B',
        detectedAdrs: [],
        existingAdrs: [],
        confidence: 'medium' as const,
      };

      const savedFiles = await saveArchitecture(testDir, result);

      // Index should be inside adr/ folder, not at parent level
      const adrIndexPath = path.join(testDir, '.specweave/docs/internal/architecture/adr/index.md');
      const oldIndexPath = path.join(testDir, '.specweave/docs/internal/architecture/adr-index.md');

      expect(fs.existsSync(adrIndexPath)).toBe(true);
      expect(savedFiles).toContain(adrIndexPath);
      // Old location should not exist
      expect(fs.existsSync(oldIndexPath)).toBe(false);
    });

    it('should clean up old adr-index.md if it exists', async () => {
      // Create old index file
      const oldIndexPath = path.join(testDir, '.specweave/docs/internal/architecture/adr-index.md');
      fs.writeFileSync(oldIndexPath, '# Old Index');

      const result = {
        c4Context: 'C4Context\n  title Test',
        c4Container: 'C4Container\n  title Test',
        dataFlow: 'flowchart TD\n  A --> B',
        detectedAdrs: [],
        existingAdrs: [],
        confidence: 'medium' as const,
      };

      await saveArchitecture(testDir, result);

      // Old location should be cleaned up
      expect(fs.existsSync(oldIndexPath)).toBe(false);
    });

    it('should not overwrite existing ADR files with same ID (v1.0.48 safety)', async () => {
      // Pre-create an ADR with ID 0001
      const existingAdrPath = path.join(testDir, '.specweave/docs/internal/architecture/adr/0001-existing-decision.md');
      fs.writeFileSync(existingAdrPath, '# 0001: Existing Decision\n\n**Status**: Accepted');

      const result = {
        c4Context: 'C4Context\n  title Test',
        c4Container: 'C4Container\n  title Test',
        dataFlow: 'flowchart TD\n  A --> B',
        detectedAdrs: [
          {
            id: '0001-detected-pattern',
            title: 'Detected Pattern',
            pattern: 'Test Pattern',
            status: 'Detected' as const,
            context: 'Test context',
            decision: 'Test decision',
            consequences: ['Test consequence'],
            evidence: [{ repo: 'test', files: [], description: 'Test' }],
            confidence: 'medium' as const,
          },
        ],
        existingAdrs: [
          { file: '0001-existing-decision.md', id: '0001', title: 'Existing', status: 'Accepted', content: '' },
        ],
        confidence: 'medium' as const,
      };

      await saveArchitecture(testDir, result);

      // Existing ADR should not be overwritten
      const existingContent = fs.readFileSync(existingAdrPath, 'utf-8');
      expect(existingContent).toContain('Existing Decision');
      expect(existingContent).not.toContain('Detected Pattern');

      // Detected ADR with conflicting ID should NOT be written
      const detectedPath = path.join(testDir, '.specweave/docs/internal/architecture/adr/0001-detected-pattern.md');
      expect(fs.existsSync(detectedPath)).toBe(false);
    });

    it('should generate ADR index with both existing and detected sections', async () => {
      const result = {
        c4Context: 'C4Context\n  title Test',
        c4Container: 'C4Container\n  title Test',
        dataFlow: 'flowchart TD\n  A --> B',
        detectedAdrs: [
          {
            id: '0002-new-pattern',
            title: 'New Pattern',
            pattern: 'Test Pattern',
            status: 'Detected' as const,
            context: 'Test context',
            decision: 'Test decision',
            consequences: ['Test consequence'],
            evidence: [{ repo: 'test', files: [], description: 'Test' }],
            confidence: 'medium' as const,
          },
        ],
        existingAdrs: [
          { file: 'docs/adr/0001-tech-stack.md', id: '0001', title: 'Tech Stack', status: 'Accepted', content: '' },
        ],
        confidence: 'medium' as const,
      };

      await saveArchitecture(testDir, result);

      const indexContent = fs.readFileSync(
        path.join(testDir, '.specweave/docs/internal/architecture/adr/index.md'),
        'utf-8'
      );

      expect(indexContent).toContain('Existing ADRs (Found in Codebase)');
      expect(indexContent).toContain('Detected ADRs (Auto-Generated)');
      expect(indexContent).toContain('Tech Stack');
      expect(indexContent).toContain('New Pattern');
    });

    it('should show helpful message when no ADRs detected', async () => {
      const result = {
        c4Context: 'C4Context\n  title Test',
        c4Container: 'C4Container\n  title Test',
        dataFlow: 'flowchart TD\n  A --> B',
        detectedAdrs: [],
        existingAdrs: [],
        confidence: 'medium' as const,
      };

      await saveArchitecture(testDir, result);

      const indexContent = fs.readFileSync(
        path.join(testDir, '.specweave/docs/internal/architecture/adr/index.md'),
        'utf-8'
      );

      expect(indexContent).toContain('No ADRs Detected');
      expect(indexContent).toContain('Create ADRs Manually');
      expect(indexContent).toContain('# 0001-decision-title');
    });
  });

  describe('generateArchitecture', () => {
    it('should scan for existing ADRs in codebase', async () => {
      // Create a mock ADR in the project
      const adrDir = path.join(testDir, 'docs/adr');
      fs.mkdirSync(adrDir, { recursive: true });
      fs.writeFileSync(
        path.join(adrDir, '0001-use-typescript.md'),
        '# 0001: Use TypeScript\n\n**Status**: Accepted\n\n## Context\nWe need type safety.\n\n## Decision\nUse TypeScript.'
      );

      const repoAnalyses = new Map<string, RepoAnalysis>();
      const orgResult = { teams: [], microservices: [], domains: [], crossCutting: [], hypotheses: [] };
      const log = vi.fn();
      const onProgress = vi.fn();

      const result = await generateArchitecture(repoAnalyses, orgResult, testDir, null, onProgress, log);

      expect(result.existingAdrs.length).toBe(1);
      expect(result.existingAdrs[0].id).toBe('0001');
      expect(result.existingAdrs[0].title).toContain('TypeScript');
    });

    it('should not scan .specweave generated ADRs as existing', async () => {
      // Create ADR in generated folder (should be skipped)
      const generatedAdrDir = path.join(testDir, '.specweave/docs/internal/architecture/adr');
      fs.mkdirSync(generatedAdrDir, { recursive: true });
      fs.writeFileSync(
        path.join(generatedAdrDir, '0001-generated.md'),
        '# 0001: Generated ADR\n\n**Status**: Detected'
      );

      const repoAnalyses = new Map<string, RepoAnalysis>();
      const orgResult = { teams: [], microservices: [], domains: [], crossCutting: [], hypotheses: [] };
      const log = vi.fn();
      const onProgress = vi.fn();

      const result = await generateArchitecture(repoAnalyses, orgResult, testDir, null, onProgress, log);

      // Should not pick up generated ADRs
      expect(result.existingAdrs.length).toBe(0);
    });
  });
});
