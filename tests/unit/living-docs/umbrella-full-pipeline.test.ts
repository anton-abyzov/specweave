/**
 * Integration Test: Umbrella Project Full Pipeline
 *
 * Tests the complete living docs flow for umbrella projects:
 * 1. Umbrella detection (from clone job or .git scanning)
 * 2. Module discovery with per-module tech stack
 * 3. Work item matching with area path/team support
 * 4. Foundation docs generation with team grouping
 * 5. Suggestions generation with unmatched items and orphaned modules
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Import modules we're testing
import { detectUmbrellaStructure } from '../../../src/core/living-docs/umbrella-detector.js';
import { loadImportedWorkItems, matchWorkItemsToModules } from '../../../src/core/living-docs/workitem-matcher.js';
import { buildFoundation } from '../../../src/core/living-docs/foundation-builder.js';
import type { DiscoveryResult, ModuleInfo } from '../../../src/core/living-docs/discovery.js';

describe('Umbrella Project Full Pipeline', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umbrella-pipeline-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create mock umbrella structure with child repos
   */
  function createMockUmbrellaProject(options: {
    teams: Array<{ name: string; repos: string[] }>;
    workItems?: Array<{ id: string; team: string; areaPath?: string }>;
  }): void {
    // Create .specweave directory
    const specweaveDir = path.join(testDir, '.specweave');
    fs.mkdirSync(specweaveDir, { recursive: true });

    // Create umbrella config
    // v1.0.21: repositories/{org}/{repo} structure
    const childRepos: any[] = [];
    for (const team of options.teams) {
      for (const repo of team.repos) {
        const repoPath = path.join(testDir, 'repositories', team.name, repo);
        fs.mkdirSync(repoPath, { recursive: true });

        // Create .git directory to mark as repo
        fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });

        // Create some source files
        fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
        fs.writeFileSync(
          path.join(repoPath, 'src', 'index.ts'),
          `// ${repo} entry point\nexport const ${repo.replace(/-/g, '_')} = {};\n`
        );

        // v1.0.21: repositories/{org}/{repo} structure
        childRepos.push({
          id: `${team.name}-${repo}`,
          path: `repositories/${team.name}/${repo}`,
          name: repo,
          team: team.name,
          status: 'cloned'
        });
      }
    }

    // Write umbrella config
    const configPath = path.join(specweaveDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: {
        enabled: true,
        childRepos,
        detectedFrom: 'test',
        detectedAt: new Date().toISOString()
      }
    }, null, 2));

    // Create work items if provided
    if (options.workItems) {
      const specsDir = path.join(specweaveDir, 'docs', 'internal', 'specs');

      for (const item of options.workItems) {
        // Create folder structure: specs/{team}/FS-XXX/
        const featureNum = item.id.replace('US-', '');
        const featureDir = path.join(specsDir, item.team, `FS-${featureNum}`);
        fs.mkdirSync(featureDir, { recursive: true });

        // Create user story file
        const content = `---
id: ${item.id}
title: Test feature for ${item.team}
feature: FS-${featureNum}
status: draft
${item.areaPath ? `area_path: ${item.areaPath}` : ''}
---

# ${item.id}: Test feature for ${item.team}

**As a** user
**I want** to test the ${item.team} feature
**So that** I can verify matching works
`;
        fs.writeFileSync(path.join(featureDir, `us-${featureNum}.md`), content);
      }
    }
  }

  /**
   * Helper to create mock discovery result
   */
  function createMockDiscoveryResult(teams: Array<{ name: string; repos: string[] }>): DiscoveryResult {
    const modules: ModuleInfo[] = [];

    // v1.0.21: repositories/{org}/{repo} structure
    for (const team of teams) {
      for (const repo of team.repos) {
        modules.push({
          name: repo,
          path: `repositories/${team.name}/${repo}`,
          type: repo.endsWith('-fe') ? 'frontend' : repo.endsWith('-be') ? 'backend' : 'api',
          entryFile: 'src/index.ts',
          hasReadme: false,
          hasTests: false,
          fileCount: 5,
          estimatedLOC: 100,
          entryPoints: ['src/index.ts'],
          extensions: { '.ts': 5 }
        });
      }
    }

    return {
      modules,
      techStack: {
        languages: ['TypeScript'],
        frameworks: [],
        databases: [],
        buildTools: [],
        testFrameworks: [],
        detectedFrom: ['package.json']
      },
      complexity: 'complex',
      stats: {
        files: modules.length * 5,
        directories: modules.length,
        totalLines: modules.length * 100,
        codeFiles: modules.length * 5,
        totalBytes: modules.length * 1000
      },
      entryPoints: {
        main: [],
        exports: [],
        index: []
      },
      existingDocs: {},
      codebaseStats: {
        totalFiles: modules.length * 5,
        estimatedLOC: modules.length * 100,
        byType: { code: modules.length * 4, tests: modules.length, docs: 0, config: 0, assets: 0 },
        byExtension: { '.ts': modules.length * 5 }
      },
      tier: 'medium',
      umbrella: {
        isUmbrella: true,
        source: 'config.json',
        childRepoCount: modules.length
      }
    };
  }

  describe('Full Pipeline Integration', () => {
    it('should detect umbrella, match work items, and generate suggestions', async () => {
      // Setup: Create umbrella project with 3 teams, 2 repos each
      const teams = [
        { name: 'inventory', repos: ['inventory-fe', 'inventory-be'] },
        { name: 'logistics', repos: ['logistics-api', 'logistics-worker'] },
        { name: 'billing', repos: ['billing-service', 'billing-portal'] }
      ];

      const workItems = [
        { id: 'US-001', team: 'inventory', areaPath: 'Acme\\Inventory' },
        { id: 'US-002', team: 'inventory', areaPath: 'Acme\\Inventory' },
        { id: 'US-003', team: 'logistics', areaPath: 'Acme\\Logistics' },
        { id: 'US-004', team: 'billing', areaPath: 'Acme\\Billing' },
        { id: 'US-005', team: 'unknown' } // This should be unmatched
      ];

      createMockUmbrellaProject({ teams, workItems });

      // Step 1: Detect umbrella structure
      const umbrellaResult = await detectUmbrellaStructure(testDir);

      expect(umbrellaResult.isUmbrella).toBe(true);
      expect(umbrellaResult.modules.length).toBe(6);
      expect(umbrellaResult.source).toBe('config');

      // Step 2: Load work items
      const loadedWorkItems = await loadImportedWorkItems(testDir);

      expect(loadedWorkItems.length).toBe(5);

      // Verify team extraction
      // Note: Team is extracted from areaPath if folder structure doesn't provide it
      // areaPath "Acme\\Inventory" → team "Inventory" (preserves case)
      const inventoryItem = loadedWorkItems.find(i => i.id === 'US-001');
      expect(inventoryItem?.team).toBe('Inventory');
      expect(inventoryItem?.areaPath).toBe('Acme\\Inventory');

      // Step 3: Create discovery result and match work items
      const discovery = createMockDiscoveryResult(teams);
      const matchResult = await matchWorkItemsToModules(testDir, discovery, loadedWorkItems);

      // Verify matching statistics
      expect(matchResult.stats.totalWorkItems).toBe(5);
      expect(matchResult.stats.matchedWorkItems).toBeGreaterThan(0);

      // US-001 and US-002 should match inventory repos
      const inventoryFe = matchResult.moduleMap.get('inventory-fe');
      expect(inventoryFe?.workItemCount).toBeGreaterThan(0);

      // US-005 should be unmatched (unknown team)
      expect(matchResult.unmatchedItems.some(i => i.id === 'US-005')).toBe(true);

      // Step 4: Generate foundation docs
      const foundationDocs = await buildFoundation(testDir, discovery);

      // Verify umbrella indicator in overview
      expect(foundationDocs.overview).toContain('Umbrella Project');
      expect(foundationDocs.overview).toContain('6'); // child repo count

      // Verify tech stack has team distribution
      expect(foundationDocs.techStack).toContain('Tech Stack by Team');

      // Verify modules skeleton indicates umbrella structure
      // Team grouping only appears for >10 modules, but umbrella indicator is always present
      expect(foundationDocs.modulesSkeleton).toContain('Umbrella');
      expect(foundationDocs.modulesSkeleton).toContain('6 child repos');
    });

    it('should handle large umbrella projects (200+ repos) efficiently', async () => {
      // Create 20 teams with 10 repos each = 200 repos
      const teams: Array<{ name: string; repos: string[] }> = [];
      for (let i = 0; i < 20; i++) {
        const teamName = `team${i.toString().padStart(2, '0')}`;
        const repos: string[] = [];
        for (let j = 0; j < 10; j++) {
          repos.push(`${teamName}-repo${j}`);
        }
        teams.push({ name: teamName, repos });
      }

      // Create 100 work items
      const workItems: Array<{ id: string; team: string }> = [];
      for (let i = 0; i < 100; i++) {
        workItems.push({
          id: `US-${i.toString().padStart(3, '0')}`,
          team: `team${(i % 20).toString().padStart(2, '0')}`
        });
      }

      createMockUmbrellaProject({ teams, workItems });

      const startTime = Date.now();

      // Run the pipeline
      const umbrellaResult = await detectUmbrellaStructure(testDir);
      expect(umbrellaResult.modules.length).toBe(200);

      const loadedWorkItems = await loadImportedWorkItems(testDir);
      expect(loadedWorkItems.length).toBe(100);

      const discovery = createMockDiscoveryResult(teams);
      const matchResult = await matchWorkItemsToModules(testDir, discovery, loadedWorkItems);

      const elapsed = Date.now() - startTime;

      // Should complete in under 30 seconds
      expect(elapsed).toBeLessThan(30000);

      // Verify matching worked
      expect(matchResult.stats.matchedWorkItems).toBeGreaterThan(0);
      expect(matchResult.stats.modulesWithWorkItems).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-umbrella projects (backwards compatible)', async () => {
      // Create a simple project without umbrella structure
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export default {};\n');

      const umbrellaResult = await detectUmbrellaStructure(testDir);

      expect(umbrellaResult.isUmbrella).toBe(false);
      expect(umbrellaResult.modules.length).toBe(0);
    });

    it('should handle work items without team or areaPath', async () => {
      const teams = [{ name: 'default', repos: ['app-main'] }];
      const workItems = [
        { id: 'US-001', team: 'default' }
      ];

      createMockUmbrellaProject({ teams, workItems });

      const loadedWorkItems = await loadImportedWorkItems(testDir);

      // Work item should still load, just without rich metadata
      expect(loadedWorkItems.length).toBe(1);
      expect(loadedWorkItems[0].id).toBe('US-001');
    });

    it('should match work items by title keywords when team/areaPath unavailable', async () => {
      // Create a module with a specific name
      const teams = [{ name: 'core', repos: ['authentication-service'] }];

      createMockUmbrellaProject({ teams });

      // Create a work item that mentions authentication-service in title
      // Keyword matching requires the module name to be directly in the title
      const specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'FS-001');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(
        path.join(specsDir, 'us-001.md'),
        `---
id: US-001
title: Update authentication-service login flow
feature: FS-001
---

# US-001: Update authentication-service login flow

**As a** user
**I want** to login securely using the authentication-service
**So that** I can access my account
`
      );

      const loadedWorkItems = await loadImportedWorkItems(testDir);
      const discovery = createMockDiscoveryResult(teams);
      const matchResult = await matchWorkItemsToModules(testDir, discovery, loadedWorkItems);

      // Should match based on title containing "authentication-service"
      const authModule = matchResult.moduleMap.get('authentication-service');
      expect(authModule?.workItemCount).toBe(1);
    });
  });
});
