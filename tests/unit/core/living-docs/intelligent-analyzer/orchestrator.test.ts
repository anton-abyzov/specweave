/**
 * Intelligent Analyzer Orchestrator Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runIntelligentAnalysis, loadCheckpoint } from '../../../../../src/core/living-docs/intelligent-analyzer/index.js';

describe('intelligent-analyzer orchestrator', () => {
  let testDir: string;
  let projectPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-test-'));
    projectPath = testDir;

    // Create .specweave directory structure
    fs.mkdirSync(path.join(testDir, '.specweave', 'docs', 'internal'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('runIntelligentAnalysis', () => {
    it('should complete all phases for simple repos', async () => {
      // Create two simple repos
      const repo1 = path.join(testDir, 'repos', 'api-service');
      const repo2 = path.join(testDir, 'repos', 'web-app');
      fs.mkdirSync(repo1, { recursive: true });
      fs.mkdirSync(repo2, { recursive: true });

      fs.writeFileSync(path.join(repo1, 'README.md'), '# API Service\n\nHandles REST API requests.');
      fs.writeFileSync(path.join(repo1, 'package.json'), '{"name": "api-service", "dependencies": {"express": "^4.0.0"}}');
      fs.writeFileSync(path.join(repo1, 'index.ts'), 'import express from "express"; export const app = express();');

      fs.writeFileSync(path.join(repo2, 'README.md'), '# Web App\n\nFrontend application.');
      fs.writeFileSync(path.join(repo2, 'package.json'), '{"name": "web-app", "dependencies": {"react": "^18.0.0"}}');

      const repos = [
        { name: 'api-service', path: repo1 },
        { name: 'web-app', path: repo2 },
      ];

      const log = vi.fn();
      const onProgress = vi.fn();

      const result = await runIntelligentAnalysis({
        projectPath,
        repos,
        onProgress,
        log,
      });

      // Check results
      expect(result.repoAnalyses.size).toBe(2);
      expect(result.savedFiles.length).toBeGreaterThan(0);
      expect(result.checkpoint.deepAnalysisComplete).toBe(true);
      expect(result.checkpoint.clusteringComplete).toBe(true);
      expect(result.checkpoint.architectureComplete).toBe(true);
      expect(result.checkpoint.inconsistenciesComplete).toBe(true);
    });

    it('should create expected output directories', async () => {
      const repo1 = path.join(testDir, 'repos', 'service-a');
      fs.mkdirSync(repo1, { recursive: true });
      fs.writeFileSync(path.join(repo1, 'README.md'), '# Service A');

      const repos = [{ name: 'service-a', path: repo1 }];

      const log = vi.fn();
      await runIntelligentAnalysis({
        projectPath,
        repos,
        log,
      });

      // Check directories exist
      expect(fs.existsSync(path.join(projectPath, '.specweave/docs/internal/repos'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, '.specweave/docs/internal/organization'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, '.specweave/docs/internal/architecture'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, '.specweave/docs/internal/temp'))).toBe(true);
    });

    it('should save checkpoint after each phase', async () => {
      const repo1 = path.join(testDir, 'repos', 'my-repo');
      fs.mkdirSync(repo1, { recursive: true });
      fs.writeFileSync(path.join(repo1, 'README.md'), '# My Repo');

      const repos = [{ name: 'my-repo', path: repo1 }];
      const log = vi.fn();

      await runIntelligentAnalysis({
        projectPath,
        repos,
        log,
      });

      const checkpoint = loadCheckpoint(projectPath);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.deepAnalysisComplete).toBe(true);
    });
  });

  describe('loadCheckpoint', () => {
    it('should return null when no checkpoint exists', () => {
      const checkpoint = loadCheckpoint(projectPath);
      expect(checkpoint).toBeNull();
    });

    it('should load existing checkpoint', async () => {
      // Create a checkpoint manually
      const tempPath = path.join(projectPath, '.specweave/docs/internal/temp');
      fs.mkdirSync(tempPath, { recursive: true });
      fs.writeFileSync(
        path.join(tempPath, 'intelligent-analysis-checkpoint.json'),
        JSON.stringify({ phase: 'C', deepAnalysisComplete: true })
      );

      const checkpoint = loadCheckpoint(projectPath);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.phase).toBe('C');
      expect(checkpoint!.deepAnalysisComplete).toBe(true);
    });
  });
});
