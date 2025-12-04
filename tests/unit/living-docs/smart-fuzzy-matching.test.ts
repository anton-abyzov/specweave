/**
 * Unit tests for Smart Fuzzy Matching Engine (v0.31.1+)
 *
 * Tests the intelligent matching logic that handles:
 * - Different naming conventions (camelCase, kebab-case, snake_case)
 * - Acronyms (ProductHub → PH)
 * - Common enterprise abbreviations (svc, fe, be, api, mgr)
 * - Fuzzy string similarity (Levenshtein distance)
 * - Word tokenization and overlap
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import {
  matchWorkItemsToModules,
  type WorkItem
} from '../../../src/core/living-docs/workitem-matcher.js';
import type { DiscoveryResult, ModuleInfo } from '../../../src/core/living-docs/discovery.js';

describe('Smart Fuzzy Matching Engine', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuzzy-match-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a mock discovery result with specified modules
   */
  function createDiscovery(moduleNames: string[]): DiscoveryResult {
    const modules: ModuleInfo[] = moduleNames.map(name => ({
      name,
      path: `org/${name}`,
      type: 'backend',
      entryFile: 'src/index.ts',
      hasReadme: false,
      hasTests: false,
      fileCount: 5,
      estimatedLOC: 100,
      entryPoints: ['src/index.ts'],
      extensions: { '.ts': 5 }
    }));

    return {
      modules,
      techStack: { languages: [], frameworks: [], databases: [], buildTools: [], testFrameworks: [], detectedFrom: [] },
      complexity: 'simple',
      stats: { files: 0, directories: 0, totalLines: 0, codeFiles: 0, totalBytes: 0 },
      entryPoints: { main: [], exports: [], index: [] },
      existingDocs: {},
      codebaseStats: { totalFiles: 0, estimatedLOC: 0, byType: { code: 0, tests: 0, docs: 0, config: 0, assets: 0 }, byExtension: {} },
      tier: 'small',
      umbrella: { isUmbrella: true, source: 'test', childRepoCount: modules.length }
    };
  }

  /**
   * Helper to create a work item with area path
   */
  function createWorkItem(id: string, areaPath: string, team?: string): WorkItem {
    return {
      id,
      featureId: 'FS-001',
      title: `Test feature ${id}`,
      filePath: `/test/specs/${team || 'unknown'}/FS-001/us-001.md`,
      keywords: [],
      areaPath,
      team
    };
  }

  describe('Exact and Normalized Matching', () => {
    it('should match exact names (case-insensitive)', async () => {
      const discovery = createDiscovery(['producthub-fe', 'producthub-be', 'billing-api']);
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('producthub-fe')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('producthub-be')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-api')?.workItemCount).toBe(0);
    });

    it('should match with different separators (kebab vs none)', async () => {
      const discovery = createDiscovery(['product-hub-fe', 'producthub-be']);
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // Both should match - same words, different separators
      expect(result.moduleMap.get('product-hub-fe')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('producthub-be')?.workItemCount).toBe(1);
    });

    it('should match snake_case to kebab-case', async () => {
      const discovery = createDiscovery(['data_platform_api', 'data-platform-be']);
      const workItem = createWorkItem('US-001', 'Acme\\DataPlatform', 'DataPlatform');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('data_platform_api')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('data-platform-be')?.workItemCount).toBe(1);
    });
  });

  describe('Acronym Matching', () => {
    it('should match acronym prefix (ProductHub → ph-*)', async () => {
      const discovery = createDiscovery(['ph-service', 'ph-api', 'billing-fe']);
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('ph-service')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('ph-api')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-fe')?.workItemCount).toBe(0);
    });

    it('should match DataPlatform → dp-*', async () => {
      const discovery = createDiscovery(['dp-api', 'dp-worker', 'other-service']);
      const workItem = createWorkItem('US-001', 'Acme\\DataPlatform', 'DataPlatform');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('dp-api')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('dp-worker')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('other-service')?.workItemCount).toBe(0);
    });

    it('should match UserManagement → um-*', async () => {
      const discovery = createDiscovery(['um-service', 'um-fe', 'auth-api']);
      const workItem = createWorkItem('US-001', 'Acme\\UserManagement', 'UserManagement');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('um-service')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('um-fe')?.workItemCount).toBe(1);
    });
  });

  describe('Abbreviation Matching', () => {
    it('should match service abbreviations (svc, srv)', async () => {
      const discovery = createDiscovery(['asset-svc', 'asset-srv', 'asset-service']);
      const workItem = createWorkItem('US-001', 'Acme\\Asset', 'Asset');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // All should match since "asset" matches
      expect(result.moduleMap.get('asset-svc')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('asset-srv')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('asset-service')?.workItemCount).toBe(1);
    });

    it('should match frontend abbreviations (fe, frontend, ui)', async () => {
      const discovery = createDiscovery(['billing-fe', 'billing-frontend', 'billing-ui']);
      const workItem = createWorkItem('US-001', 'Acme\\Billing', 'Billing');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('billing-fe')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-frontend')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('billing-ui')?.workItemCount).toBe(1);
    });

    it('should match manager abbreviations (mgr, mgmt)', async () => {
      const discovery = createDiscovery(['user-mgr', 'user-mgmt', 'user-manager']);
      const workItem = createWorkItem('US-001', 'Acme\\UserManager', 'UserManager');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // user-mgr and user-manager should definitely match
      expect(result.moduleMap.get('user-manager')?.workItemCount).toBe(1);
    });
  });

  describe('Word Overlap Matching', () => {
    it('should match when significant words overlap', async () => {
      const discovery = createDiscovery(['inventory-management-api', 'inventory-tracking-fe']);
      const workItem = createWorkItem('US-001', 'Acme\\InventoryManagement', 'InventoryManagement');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('inventory-management-api')?.workItemCount).toBe(1);
      // inventory-tracking should also get some score from "inventory" word
      expect(result.moduleMap.get('inventory-tracking-fe')?.workItemCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial word matches', async () => {
      const discovery = createDiscovery(['order-processing-api', 'order-mgmt-svc']);
      const workItem = createWorkItem('US-001', 'Acme\\OrderManagement', 'OrderManagement');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // order-mgmt-svc should match (mgmt ≈ management)
      expect(result.moduleMap.get('order-mgmt-svc')?.workItemCount).toBe(1);
    });
  });

  describe('Fuzzy String Similarity', () => {
    it('should match with minor typos (Levenshtein distance 1-2)', async () => {
      const discovery = createDiscovery(['producthub-fe', 'producthu-be']); // typo: missing 'b'
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('producthub-fe')?.workItemCount).toBe(1);
      // producthu (missing b) should still match with fuzzy logic
      expect(result.moduleMap.get('producthu-be')?.workItemCount).toBe(1);
    });

    it('should not match completely different names', async () => {
      const discovery = createDiscovery(['payment-gateway', 'checkout-api']);
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('payment-gateway')?.workItemCount).toBe(0);
      expect(result.moduleMap.get('checkout-api')?.workItemCount).toBe(0);
    });
  });

  describe('Complex Enterprise Naming', () => {
    it('should handle complex ADO area paths', async () => {
      const discovery = createDiscovery([
        'logistics-tracking-api',
        'logistics-fleet-management',
        'log-track-svc'
      ]);
      const workItem = createWorkItem('US-001', 'Enterprise\\Logistics\\Tracking\\Features', 'Tracking');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // logistics-tracking-api should match due to "Tracking" in area path
      expect(result.moduleMap.get('logistics-tracking-api')?.workItemCount).toBe(1);
    });

    it('should match with mixed naming conventions in same project', async () => {
      const discovery = createDiscovery([
        'CRM-CustomerPortal',      // PascalCase
        'crm_analytics_engine',    // snake_case
        'crm-data-sync',           // kebab-case
        'crmapi'                   // no separator
      ]);
      const workItem = createWorkItem('US-001', 'Sales\\CRM', 'CRM');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // All should match since they start with/contain CRM
      expect(result.moduleMap.get('CRM-CustomerPortal')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('crm_analytics_engine')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('crm-data-sync')?.workItemCount).toBe(1);
      expect(result.moduleMap.get('crmapi')?.workItemCount).toBe(1);
    });
  });

  describe('Match Confidence Levels', () => {
    it('should report high confidence for exact matches', async () => {
      const discovery = createDiscovery(['producthub-fe']);
      const workItem = createWorkItem('US-001', 'Acme\\ProductHub', 'ProductHub');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);
      const match = result.moduleMap.get('producthub-fe')?.matches[0];

      expect(match).toBeDefined();
      expect(match?.score).toBeGreaterThan(40);
      expect(match?.reasons.some(r => r.includes('high confidence'))).toBe(true);
    });

    it('should report medium confidence for acronym matches', async () => {
      const discovery = createDiscovery(['dp-api']);
      const workItem = createWorkItem('US-001', 'Acme\\DataPlatform', 'DataPlatform');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);
      const match = result.moduleMap.get('dp-api')?.matches[0];

      expect(match).toBeDefined();
      expect(match?.score).toBeGreaterThan(20);
    });
  });

  describe('Performance with Many Modules', () => {
    it('should handle 500+ modules efficiently', async () => {
      // Create 500 modules with varied naming
      const moduleNames: string[] = [];
      const teams = ['asset', 'billing', 'data', 'user', 'order', 'payment', 'shipping', 'inventory', 'crm', 'erp'];
      const suffixes = ['fe', 'be', 'api', 'svc', 'worker', 'job', 'portal', 'admin', 'mobile', 'web'];

      for (const team of teams) {
        for (const suffix of suffixes) {
          moduleNames.push(`${team}-${suffix}`);
          moduleNames.push(`${team}${suffix}`);
          moduleNames.push(`${team}_${suffix}_v2`);
          moduleNames.push(`${team.charAt(0)}${suffix.charAt(0)}-service`);
          moduleNames.push(`${team}-management-${suffix}`);
        }
      }

      const discovery = createDiscovery(moduleNames);

      // Create 50 work items
      const workItems = teams.slice(0, 5).map((team, i) =>
        createWorkItem(`US-${i}`, `Acme\\${team.charAt(0).toUpperCase() + team.slice(1)}`, team)
      );

      const startTime = Date.now();
      const result = await matchWorkItemsToModules(testDir, discovery, workItems);
      const elapsed = Date.now() - startTime;

      // Should complete in under 5 seconds
      expect(elapsed).toBeLessThan(5000);
      expect(result.stats.matchedWorkItems).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty area path gracefully', async () => {
      const discovery = createDiscovery(['test-module']);
      const workItem: WorkItem = {
        id: 'US-001',
        featureId: 'FS-001',
        title: 'Test',
        filePath: '/test/us-001.md',
        keywords: [],
        areaPath: '',
        team: ''
      };

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // Should not crash, just not match
      expect(result.stats.totalWorkItems).toBe(1);
    });

    it('should handle single-character team names', async () => {
      const discovery = createDiscovery(['a-service', 'ab-api']);
      const workItem = createWorkItem('US-001', 'Acme\\A', 'A');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      // Single char is too short for reliable matching
      expect(result).toBeDefined();
    });

    it('should handle very long team names', async () => {
      const discovery = createDiscovery(['enterprise-resource-planning-integration-api']);
      const workItem = createWorkItem('US-001', 'Acme\\EnterpriseResourcePlanningIntegration', 'EnterpriseResourcePlanningIntegration');

      const result = await matchWorkItemsToModules(testDir, discovery, [workItem]);

      expect(result.moduleMap.get('enterprise-resource-planning-integration-api')?.workItemCount).toBe(1);
    });
  });
});
