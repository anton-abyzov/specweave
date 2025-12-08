/**
 * Integration tests for Umbrella Detection + Discovery
 *
 * Tests the full flow: umbrella detection → discovery → tech stack detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runDiscovery } from '../../../src/core/living-docs/discovery.js';

describe('umbrella-discovery-integration', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umbrella-discovery-'));
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('discovery with umbrella project', () => {
    it('should detect umbrella and use child repos as modules', async () => {
      // Create umbrella structure with multiple repos
      const frontendRepo = path.join(testDir, 'acme', 'inventory-fe');
      const backendRepo = path.join(testDir, 'acme', 'inventory-be');

      // Frontend repo (React + TypeScript)
      fs.mkdirSync(path.join(frontendRepo, '.git'), { recursive: true });
      fs.mkdirSync(path.join(frontendRepo, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(frontendRepo, 'package.json'),
        JSON.stringify({
          name: 'inventory-fe',
          dependencies: { react: '^18.0.0' },
          devDependencies: { typescript: '^5.0.0', vite: '^5.0.0', vitest: '^1.0.0' },
        })
      );
      fs.writeFileSync(path.join(frontendRepo, 'README.md'), '# Inventory Manager Frontend');
      fs.writeFileSync(path.join(frontendRepo, 'src', 'App.tsx'), 'export default function App() {}');

      // Backend repo (C#/.NET)
      fs.mkdirSync(path.join(backendRepo, '.git'), { recursive: true });
      fs.mkdirSync(path.join(backendRepo, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(backendRepo, 'ProductHub.Api.csproj'),
        `<Project>
          <ItemGroup>
            <PackageReference Include="Microsoft.AspNetCore" />
          </ItemGroup>
        </Project>`
      );
      fs.writeFileSync(path.join(backendRepo, 'src', 'Program.cs'), 'class Program {}');

      // Run discovery
      const result = await runDiscovery(testDir, []);

      // Verify umbrella detection
      expect(result.umbrella?.isUmbrella).toBe(true);
      expect(result.umbrella?.source).toBe('git-scan');
      expect(result.umbrella?.childRepoCount).toBe(2);

      // Verify modules
      expect(result.modules.length).toBe(2);

      const feModule = result.modules.find(m => m.name === 'inventory-fe');
      const beModule = result.modules.find(m => m.name === 'inventory-be');

      expect(feModule).toBeDefined();
      expect(beModule).toBeDefined();
      expect(feModule!.hasReadme).toBe(true);
      expect(beModule!.hasReadme).toBe(false);

      // Verify tech stack detection
      expect(result.techStack.languages).toContain('TypeScript');
      expect(result.techStack.languages).toContain('C#');
      expect(result.techStack.frameworks).toContain('React');
      expect(result.techStack.frameworks).toContain('ASP.NET Core');
      expect(result.techStack.buildTools).toContain('Vite');
      expect(result.techStack.testFrameworks).toContain('Vitest');
    });

    it('should aggregate tech stack from multiple child repos', async () => {
      // Create 4 repos with different tech stacks
      const repos = [
        {
          name: 'react-app',
          pkg: { dependencies: { react: '^18.0.0', next: '^14.0.0' } },
        },
        {
          name: 'vue-app',
          pkg: { dependencies: { vue: '^3.0.0' }, devDependencies: { vite: '^5.0.0' } },
        },
        {
          name: 'express-api',
          pkg: { dependencies: { express: '^4.0.0' }, devDependencies: { jest: '^29.0.0' } },
        },
        {
          name: 'nestjs-api',
          pkg: { dependencies: { '@nestjs/core': '^10.0.0' } },
        },
      ];

      for (const repo of repos) {
        const repoPath = path.join(testDir, 'org', repo.name);
        fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
        fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify(repo.pkg));
      }

      const result = await runDiscovery(testDir, []);

      // All frameworks should be detected
      expect(result.techStack.frameworks).toContain('React');
      expect(result.techStack.frameworks).toContain('Next.js');
      expect(result.techStack.frameworks).toContain('Vue');
      expect(result.techStack.frameworks).toContain('Express');
      expect(result.techStack.frameworks).toContain('NestJS');

      // Build tools and test frameworks
      expect(result.techStack.buildTools).toContain('Vite');
      expect(result.techStack.testFrameworks).toContain('Jest');
    });

    it('should persist umbrella config after discovery', async () => {
      // Create minimal umbrella
      const repo1 = path.join(testDir, 'repo1');
      const repo2 = path.join(testDir, 'repo2');

      fs.mkdirSync(path.join(repo1, '.git'), { recursive: true });
      fs.mkdirSync(path.join(repo2, '.git'), { recursive: true });

      await runDiscovery(testDir, []);

      // Check config.json was created
      const configPath = path.join(testDir, '.specweave', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.umbrella?.enabled).toBe(true);
      expect(config.umbrella?.childRepos.length).toBe(2);
    });

    it('should work with clone job config', async () => {
      const jobId = 'integration-test-job';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Create job config with specific repos
      const jobConfig = {
        jobId,
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'service-a', path: 'services/service-a', cloneUrl: 'https://...', team: 'platform' },
          { owner: 'org', name: 'service-b', path: 'services/service-b', cloneUrl: 'https://...', team: 'platform' },
        ],
        startedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(jobDir, 'config.json'), JSON.stringify(jobConfig));

      // Create the repos on disk
      for (const repo of jobConfig.repositories) {
        const repoPath = path.join(testDir, repo.path);
        fs.mkdirSync(repoPath, { recursive: true });
        fs.writeFileSync(path.join(repoPath, 'index.js'), 'module.exports = {};');
      }

      const result = await runDiscovery(testDir, []);

      // Should use clone job config
      expect(result.umbrella?.isUmbrella).toBe(true);
      expect(result.umbrella?.source).toBe('clone-job');
      expect(result.modules.length).toBe(2);
    });
  });

  describe('discovery with standard project', () => {
    it('should not detect umbrella for single repo', async () => {
      // Create standard project structure
      fs.mkdirSync(path.join(testDir, '.git'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src', 'components'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src', 'utils'), { recursive: true });

      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          dependencies: { react: '^18.0.0' },
        })
      );
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export * from "./components";');

      const result = await runDiscovery(testDir, []);

      // Should not detect umbrella
      expect(result.umbrella?.isUmbrella).toBe(false);
      expect(result.umbrella?.source).toBe('none');

      // Should still detect modules from src structure
      expect(result.modules.length).toBeGreaterThan(0);
    });
  });

  describe('performance with large umbrella', () => {
    it('should handle 50+ repos efficiently', async () => {
      // Create 50 repos
      for (let i = 0; i < 50; i++) {
        const repoPath = path.join(testDir, 'repos', `service-${i.toString().padStart(3, '0')}`);
        fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
        fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
        fs.writeFileSync(
          path.join(repoPath, 'package.json'),
          JSON.stringify({ name: `service-${i}`, dependencies: { express: '^4.0.0' } })
        );
        fs.writeFileSync(path.join(repoPath, 'src', 'index.js'), `module.exports = ${i};`);
      }

      const startTime = Date.now();
      const result = await runDiscovery(testDir, []);
      const duration = Date.now() - startTime;

      expect(result.umbrella?.isUmbrella).toBe(true);
      expect(result.modules.length).toBe(50);
      expect(duration).toBeLessThan(30000); // Under 30 seconds

      // Should detect Express from all repos
      expect(result.techStack.frameworks).toContain('Express');
    });
  });
});
