/**
 * Unit tests for Umbrella Repository Detector
 *
 * Tests detection of umbrella/multi-repo project structures.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectUmbrellaStructure,
  loadFromCloneJob,
  loadFromUmbrellaConfig,
  scanForChildRepos,
  persistUmbrellaConfig,
  type UmbrellaConfig,
} from '../../../src/core/living-docs/umbrella-detector.js';

describe('umbrella-detector', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umbrella-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('scanForChildRepos', () => {
    it('should detect child repos with .git directories', async () => {
      // Create umbrella structure
      const repo1 = path.join(testDir, 'org', 'repo-one');
      const repo2 = path.join(testDir, 'org', 'repo-two');

      fs.mkdirSync(path.join(repo1, '.git'), { recursive: true });
      fs.mkdirSync(path.join(repo2, '.git'), { recursive: true });

      // Add some files
      fs.writeFileSync(path.join(repo1, 'package.json'), '{}');
      fs.writeFileSync(path.join(repo2, 'package.json'), '{}');

      const result = await scanForChildRepos(testDir);

      expect(result.isUmbrella).toBe(true);
      expect(result.modules.length).toBe(2);
      expect(result.source).toBe('git-scan');
    });

    it('should not detect umbrella with only root .git', async () => {
      // Create single repo structure
      fs.mkdirSync(path.join(testDir, '.git'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

      const result = await scanForChildRepos(testDir);

      expect(result.isUmbrella).toBe(false);
      expect(result.modules.length).toBe(0);
    });

    it('should extract team name from repo path', async () => {
      // Create repos with team naming pattern
      const feRepo = path.join(testDir, 'acme', 'inventory-fe');
      const beRepo = path.join(testDir, 'acme', 'inventory-be');

      fs.mkdirSync(path.join(feRepo, '.git'), { recursive: true });
      fs.mkdirSync(path.join(beRepo, '.git'), { recursive: true });

      const result = await scanForChildRepos(testDir);

      expect(result.isUmbrella).toBe(true);
      expect(result.config?.childRepos.length).toBe(2);

      // Both should have team "inventory"
      const feConfig = result.config?.childRepos.find(r => r.name === 'inventory-fe');
      const beConfig = result.config?.childRepos.find(r => r.name === 'inventory-be');

      expect(feConfig?.team).toBe('inventory');
      expect(beConfig?.team).toBe('inventory');
    });

    it('should skip node_modules and other ignored directories', async () => {
      // Create real repo
      const realRepo = path.join(testDir, 'my-repo');
      fs.mkdirSync(path.join(realRepo, '.git'), { recursive: true });

      // Create node_modules with nested git (should be ignored)
      const nodeModuleRepo = path.join(testDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(path.join(nodeModuleRepo, '.git'), { recursive: true });

      // Need another repo to trigger umbrella detection
      const anotherRepo = path.join(testDir, 'another-repo');
      fs.mkdirSync(path.join(anotherRepo, '.git'), { recursive: true });

      const result = await scanForChildRepos(testDir);

      expect(result.isUmbrella).toBe(true);
      // Should only find real repos, not node_modules
      expect(result.modules.length).toBe(2);
      expect(result.modules.find(m => m.name === 'some-pkg')).toBeUndefined();
    });
  });

  describe('loadFromCloneJob', () => {
    it('should load repos from clone job config', async () => {
      const jobId = 'test-job-123';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Create job config
      const jobConfig = {
        jobId,
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'repo-one', path: 'org/repo-one', cloneUrl: 'https://...' },
          { owner: 'org', name: 'repo-two', path: 'org/repo-two', cloneUrl: 'https://...' },
        ],
        startedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(jobDir, 'config.json'), JSON.stringify(jobConfig));

      // Create the repos on disk
      fs.mkdirSync(path.join(testDir, 'org', 'repo-one'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'org', 'repo-two'), { recursive: true });

      const result = await loadFromCloneJob(testDir, jobId);

      expect(result.isUmbrella).toBe(true);
      expect(result.source).toBe('clone-job');
      expect(result.config?.childRepos.length).toBe(2);
    });

    it('should return empty result for non-existent job', async () => {
      const result = await loadFromCloneJob(testDir, 'non-existent-job');

      expect(result.isUmbrella).toBe(false);
      expect(result.modules.length).toBe(0);
    });
  });

  describe('loadFromUmbrellaConfig', () => {
    it('should load repos from config.json umbrella section', async () => {
      // Create config.json with umbrella section
      const config = {
        umbrella: {
          enabled: true,
          childRepos: [
            { id: 'repo-one', path: 'org/repo-one', name: 'repo-one' },
            { id: 'repo-two', path: 'org/repo-two', name: 'repo-two' },
          ],
        },
      };
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify(config)
      );

      // Create the repos on disk
      fs.mkdirSync(path.join(testDir, 'org', 'repo-one'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'org', 'repo-two'), { recursive: true });

      const result = await loadFromUmbrellaConfig(testDir);

      expect(result.isUmbrella).toBe(true);
      expect(result.source).toBe('config');
      expect(result.modules.length).toBe(2);
    });

    it('should return empty for disabled umbrella config', async () => {
      const config = {
        umbrella: {
          enabled: false,
          childRepos: [],
        },
      };
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify(config)
      );

      const result = await loadFromUmbrellaConfig(testDir);

      expect(result.isUmbrella).toBe(false);
    });
  });

  describe('detectUmbrellaStructure', () => {
    it('should prioritize clone job config over git scan', async () => {
      const jobId = 'test-job-456';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Create job config with 2 repos
      const jobConfig = {
        jobId,
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'from-job', path: 'org/from-job', cloneUrl: 'https://...' },
        ],
        startedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(jobDir, 'config.json'), JSON.stringify(jobConfig));

      // Create repo on disk
      fs.mkdirSync(path.join(testDir, 'org', 'from-job', '.git'), { recursive: true });

      // Also create a repo not in job config
      fs.mkdirSync(path.join(testDir, 'org', 'from-scan', '.git'), { recursive: true });

      const result = await detectUmbrellaStructure(testDir, jobId);

      expect(result.isUmbrella).toBe(true);
      expect(result.source).toBe('clone-job');
      // Should only have repo from job config
      expect(result.config?.childRepos.length).toBe(1);
      expect(result.config?.childRepos[0].name).toBe('from-job');
    });

    it('should fall back to git scan when no job exists', async () => {
      // Create repos without job config
      fs.mkdirSync(path.join(testDir, 'repo-a', '.git'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'repo-b', '.git'), { recursive: true });

      const result = await detectUmbrellaStructure(testDir);

      expect(result.isUmbrella).toBe(true);
      expect(result.source).toBe('git-scan');
      expect(result.modules.length).toBe(2);
    });
  });

  describe('persistUmbrellaConfig', () => {
    it('should write umbrella config to config.json', async () => {
      const umbrellaConfig: UmbrellaConfig = {
        enabled: true,
        childRepos: [
          { id: 'test-repo', path: 'org/test-repo', name: 'test-repo' },
        ],
        detectedFrom: 'clone-job',
        detectedAt: new Date().toISOString(),
      };

      await persistUmbrellaConfig(testDir, umbrellaConfig);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedConfig.umbrella.enabled).toBe(true);
      expect(savedConfig.umbrella.childRepos.length).toBe(1);
    });

    it('should preserve existing config.json content', async () => {
      // Create existing config
      const existingConfig = {
        project: { name: 'test-project' },
        testing: { defaultTestMode: 'TDD' },
      };
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify(existingConfig)
      );

      const umbrellaConfig: UmbrellaConfig = {
        enabled: true,
        childRepos: [],
        detectedFrom: 'git-scan',
      };

      await persistUmbrellaConfig(testDir, umbrellaConfig);

      const savedConfig = JSON.parse(
        fs.readFileSync(path.join(testDir, '.specweave', 'config.json'), 'utf-8')
      );

      // Should have both old and new config
      expect(savedConfig.project.name).toBe('test-project');
      expect(savedConfig.testing.defaultTestMode).toBe('TDD');
      expect(savedConfig.umbrella.enabled).toBe(true);
    });
  });

  describe('module conversion', () => {
    it('should populate ModuleInfo with correct stats', async () => {
      // Create repo with files
      const repoPath = path.join(testDir, 'my-repo');
      fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });

      // Add files
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{ "name": "test" }');
      fs.writeFileSync(path.join(repoPath, 'README.md'), '# Test');
      fs.writeFileSync(path.join(repoPath, 'src', 'index.ts'), 'export const x = 1;');
      fs.writeFileSync(path.join(repoPath, 'src', 'utils.ts'), 'export function foo() {}');

      // Need another repo to trigger umbrella
      const repo2Path = path.join(testDir, 'other-repo');
      fs.mkdirSync(path.join(repo2Path, '.git'), { recursive: true });

      const result = await scanForChildRepos(testDir);

      const myRepo = result.modules.find(m => m.name === 'my-repo');
      expect(myRepo).toBeDefined();
      expect(myRepo!.hasReadme).toBe(true);
      expect(myRepo!.fileCount).toBeGreaterThan(0);
      expect(myRepo!.extensions).toHaveProperty('.ts');
    });
  });

  describe('performance', () => {
    it('should handle 100+ repos efficiently', async () => {
      // Create 100 repos
      for (let i = 0; i < 100; i++) {
        const repoPath = path.join(testDir, 'repos', `repo-${i.toString().padStart(3, '0')}`);
        fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
        fs.writeFileSync(path.join(repoPath, 'index.js'), `module.exports = ${i};`);
      }

      const startTime = Date.now();
      const result = await detectUmbrellaStructure(testDir);
      const duration = Date.now() - startTime;

      expect(result.isUmbrella).toBe(true);
      expect(result.modules.length).toBe(100);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
      expect(result.stats.detectionTimeMs).toBeLessThan(30000);
    });
  });
});
