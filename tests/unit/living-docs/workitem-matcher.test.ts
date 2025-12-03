/**
 * Unit tests for Work Item Matcher - Umbrella Project Support (v0.31.0+)
 *
 * Tests the enhanced matching logic for umbrella projects:
 * - Area path matching (ADO: "Acme\\Inventory" → "inventory-*")
 * - Team-based matching (folder structure to repo prefix)
 * - File path structure matching
 * - Combined scoring algorithm
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Import the module we're testing
import {
  loadImportedWorkItems,
  matchWorkItemsToModules,
  type WorkItem,
  type WorkItemMatchResult
} from '../../../src/core/living-docs/workitem-matcher.js';
import type { DiscoveryResult, ModuleInfo } from '../../../src/core/living-docs/discovery.js';

describe('WorkItem Matcher - Umbrella Support', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workitem-matcher-test-'));
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseUserStoryFile - Team and AreaPath Extraction', () => {
    it('should extract team from folder structure', async () => {
      // Create: specs/acme/inventory/FS-001/us-001.md
      const featureDir = path.join(specsDir, 'acme', 'inventory', 'FS-001');
      fs.mkdirSync(featureDir, { recursive: true });
      fs.writeFileSync(
        path.join(featureDir, 'us-001.md'),
        `---
id: US-001
title: Asset tracking feature
feature: FS-001
status: draft
---

# US-001: Asset tracking feature

**As a** user
**I want** to track assets
**So that** I can manage inventory
`
      );

      const workItems = await loadImportedWorkItems(testDir);

      expect(workItems).toHaveLength(1);
      expect(workItems[0].team).toBe('inventory');
      expect(workItems[0].id).toBe('US-001');
    });

    it('should extract areaPath from frontmatter', async () => {
      // Create user story with ADO area_path in frontmatter
      const featureDir = path.join(specsDir, 'FS-002');
      fs.mkdirSync(featureDir, { recursive: true });
      fs.writeFileSync(
        path.join(featureDir, 'us-002.md'),
        `---
id: US-002
title: Data export feature
feature: FS-002
area_path: Acme\\DataPlatform\\Export
external_source: ado
---

# US-002: Data export feature
`
      );

      const workItems = await loadImportedWorkItems(testDir);

      expect(workItems).toHaveLength(1);
      expect(workItems[0].areaPath).toBe('Acme\\DataPlatform\\Export');
      // Team should be derived from areaPath when not in folder structure
      expect(workItems[0].team).toBe('DataPlatform');
    });

    it('should handle multiple areaPath frontmatter keys', async () => {
      const featureDir = path.join(specsDir, 'FS-003');
      fs.mkdirSync(featureDir, { recursive: true });

      // Test with system_area_path (ADO API field name)
      fs.writeFileSync(
        path.join(featureDir, 'us-003.md'),
        `---
id: US-003
title: Test feature
system_area_path: Project\\Team\\SubArea
---

# US-003
`
      );

      const workItems = await loadImportedWorkItems(testDir);

      expect(workItems).toHaveLength(1);
      expect(workItems[0].areaPath).toBe('Project\\Team\\SubArea');
      expect(workItems[0].team).toBe('Team');
    });
  });

  describe('Area Path Matching', () => {
    const createModules = (): ModuleInfo[] => [
      {
        name: 'inventory-fe',
        path: 'acme/inventory-fe',
        type: 'frontend',
        entryFile: 'src/index.ts',
        hasReadme: true
      },
      {
        name: 'inventory-be',
        path: 'acme/inventory-be',
        type: 'backend',
        entryFile: 'src/main.ts',
        hasReadme: true
      },
      {
        name: 'dataplatform-api',
        path: 'acme/dataplatform-api',
        type: 'api',
        entryFile: 'src/app.ts',
        hasReadme: false
      },
      {
        name: 'unrelated-service',
        path: 'other/unrelated-service',
        type: 'backend',
        entryFile: 'main.go',
        hasReadme: false
      }
    ];

    const createDiscoveryResult = (modules: ModuleInfo[]): DiscoveryResult => ({
      modules,
      techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
      complexity: 'simple',
      stats: {
        files: 0,
        directories: 0,
        totalLines: 0,
        codeFiles: 0,
        totalBytes: 0
      }
    });

    it('should match area path to repos with same prefix', async () => {
      const workItem: WorkItem = {
        id: 'US-001',
        featureId: 'FS-001',
        title: 'Asset tracking',
        filePath: '/test/specs/acme/inventory/FS-001/us-001.md',
        keywords: ['asset', 'tracking'],
        areaPath: 'Acme\\Inventory',
        team: 'inventory'
      };

      const modules = createModules();
      const discovery = createDiscoveryResult(modules);

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // Should match inventory-fe and inventory-be, but not unrelated-service
      const inventoryFe = result.moduleMap.get('inventory-fe');
      const inventoryBe = result.moduleMap.get('inventory-be');
      const unrelated = result.moduleMap.get('unrelated-service');

      expect(inventoryFe?.workItemCount).toBeGreaterThan(0);
      expect(inventoryBe?.workItemCount).toBeGreaterThan(0);
      expect(unrelated?.workItemCount).toBe(0);

      // Check match scores include area path reasons
      const feMatch = inventoryFe?.matches[0];
      expect(feMatch?.reasons.some(r => r.includes('area path'))).toBe(true);
    });

    it('should handle escaped backslashes in area path', async () => {
      const workItem: WorkItem = {
        id: 'US-002',
        featureId: 'FS-002',
        title: 'Data platform feature',
        filePath: '/test/specs/FS-002/us-002.md',
        keywords: ['data', 'platform'],
        areaPath: 'Acme\\\\DataPlatform\\\\Export', // Double escaped
        team: 'dataplatform'
      };

      const modules = createModules();
      const discovery = createDiscoveryResult(modules);

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      const dataplatformApi = result.moduleMap.get('dataplatform-api');
      expect(dataplatformApi?.workItemCount).toBeGreaterThan(0);
    });
  });

  describe('Team-Based Matching', () => {
    it('should match team name to repo prefix', async () => {
      const modules: ModuleInfo[] = [
        {
          name: 'logistics-frontend',
          path: 'teams/logistics/frontend',
          type: 'frontend',
          entryFile: 'src/index.tsx',
          hasReadme: true
        },
        {
          name: 'logistics-backend',
          path: 'teams/logistics/backend',
          type: 'backend',
          entryFile: 'src/main.py',
          hasReadme: true
        }
      ];

      const workItem: WorkItem = {
        id: 'US-010',
        featureId: 'FS-010',
        title: 'Shipping optimization',
        filePath: '/test/specs/logistics/FS-010/us-010.md',
        keywords: ['shipping', 'optimization'],
        team: 'logistics'
      };

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('logistics-frontend')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('logistics-backend')?.workItemCount).toBe(1);
    });
  });

  describe('File Path Structure Matching', () => {
    it('should match specs folder to module path', async () => {
      const modules: ModuleInfo[] = [
        {
          name: 'payments-service',
          path: 'acme/payments-service',
          type: 'backend',
          entryFile: 'src/main.ts',
          hasReadme: true
        }
      ];

      const workItem: WorkItem = {
        id: 'US-020',
        featureId: 'FS-020',
        title: 'Payment processing',
        // Path: specs/{org}/{team}/... → should match {org}/{team}-*
        filePath: '/project/.specweave/docs/internal/specs/acme/payments/FS-020/us-020.md',
        keywords: ['payment', 'processing']
      };

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // Should match based on org "acme" in path
      const payments = result.moduleMap.get('payments-service');
      expect(payments?.workItemCount).toBe(1);
      expect(payments?.matches[0].reasons.some(r => r.includes('acme'))).toBe(true);
    });
  });

  describe('Combined Scoring', () => {
    it('should combine area path and team scores', async () => {
      const modules: ModuleInfo[] = [
        {
          name: 'inventory-api',
          path: 'warehouse/inventory-api',
          type: 'api',
          entryFile: 'src/app.ts',
          hasReadme: true
        },
        {
          name: 'other-api',
          path: 'other/api',
          type: 'api',
          entryFile: 'src/app.ts',
          hasReadme: false
        }
      ];

      // Work item with both areaPath and team set
      const workItem: WorkItem = {
        id: 'US-030',
        featureId: 'FS-030',
        title: 'Inventory management',
        filePath: '/test/specs/warehouse/inventory/FS-030/us-030.md',
        keywords: ['inventory', 'management'],
        areaPath: 'Warehouse\\Inventory\\Tracking',
        team: 'inventory'
      };

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      const inventoryApi = result.moduleMap.get('inventory-api');
      const otherApi = result.moduleMap.get('other-api');

      // inventory-api should have much higher score due to combined matching
      expect(inventoryApi?.matches[0]?.score).toBeGreaterThan(50);
      expect(otherApi?.workItemCount).toBe(0);
    });

    it('should still work with keyword matching as fallback', async () => {
      const modules: ModuleInfo[] = [
        {
          name: 'authentication',
          path: 'src/authentication',
          type: 'backend',
          entryFile: 'src/auth.ts',
          hasReadme: true
        }
      ];

      // Work item without team or areaPath, but with keyword match
      const workItem: WorkItem = {
        id: 'US-040',
        featureId: 'FS-040',
        title: 'User authentication flow',
        filePath: '/test/specs/FS-040/us-040.md',
        keywords: ['user', 'authentication', 'flow']
      };

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      const authModule = result.moduleMap.get('authentication');
      expect(authModule?.workItemCount).toBe(1);
      expect(authModule?.matches[0].reasons.some(r => r.includes('keyword'))).toBe(true);
    });
  });

  describe('Module Name Normalization', () => {
    it('should match despite -fe, -be, -api suffixes', async () => {
      const modules: ModuleInfo[] = [
        { name: 'billing-fe', path: 'billing/fe', type: 'frontend', entryFile: 'src/index.tsx', hasReadme: true },
        { name: 'billing-be', path: 'billing/be', type: 'backend', entryFile: 'src/main.ts', hasReadme: true },
        { name: 'billing-api', path: 'billing/api', type: 'api', entryFile: 'src/app.ts', hasReadme: true }
      ];

      const workItem: WorkItem = {
        id: 'US-050',
        featureId: 'FS-050',
        title: 'Invoice generation',
        filePath: '/test/specs/billing/FS-050/us-050.md',
        keywords: ['invoice', 'generation'],
        team: 'billing'
      };

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // All three billing modules should match
      expect(result.moduleMap.get('billing-fe')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-be')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-api')?.workItemCount).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle 200+ modules efficiently', async () => {
      // Create 200 mock modules
      const modules: ModuleInfo[] = [];
      for (let i = 0; i < 200; i++) {
        modules.push({
          name: `module-${i}`,
          path: `team-${i % 20}/module-${i}`,
          type: 'backend',
          entryFile: 'src/main.ts',
          hasReadme: i % 3 === 0
        });
      }

      // Create 50 work items
      const workItems: WorkItem[] = [];
      for (let i = 0; i < 50; i++) {
        workItems.push({
          id: `US-${i}`,
          featureId: `FS-${i % 10}`,
          title: `Feature ${i}`,
          filePath: `/test/specs/team-${i % 20}/FS-${i % 10}/us-${i}.md`,
          keywords: ['feature', `module-${i}`],
          team: `team-${i % 20}`
        });
      }

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'complex',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const startTime = Date.now();
      const result = await matchWorkItemsToModules(testDir, discovery, workItems);
      const elapsed = Date.now() - startTime;

      // Should complete in under 5 seconds
      expect(elapsed).toBeLessThan(5000);
      expect(result.stats.totalWorkItems).toBe(50);
      expect(result.stats.matchedWorkItems).toBeGreaterThan(0);
    });
  });

  describe('Unmatched Items', () => {
    it('should collect unmatched items for suggestions', async () => {
      const modules: ModuleInfo[] = [
        { name: 'specific-module', path: 'specific', type: 'backend', entryFile: 'main.ts', hasReadme: true }
      ];

      const workItems: WorkItem[] = [
        {
          id: 'US-100',
          featureId: 'FS-100',
          title: 'Completely unrelated feature',
          filePath: '/test/specs/unknown/FS-100/us-100.md',
          keywords: ['unrelated', 'random']
        }
      ];

      const discovery: DiscoveryResult = {
        modules,
        techStack: { frameworks: [], languages: [], databases: [], buildTools: [] },
        complexity: 'simple',
        stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 }
      };

      const result = await matchWorkItemsToModules(testDir, discovery, workItems);

      expect(result.unmatchedItems).toHaveLength(1);
      expect(result.unmatchedItems[0].id).toBe('US-100');
      expect(result.stats.unmatchedWorkItems).toBe(1);
    });
  });
});
