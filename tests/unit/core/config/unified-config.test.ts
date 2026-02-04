/**
 * Unified Config Type Tests
 *
 * Tests for the consolidated configuration type that merges
 * SpecweaveConfig (project/increment management) with
 * SpecWeaveConfig (sync/research features).
 *
 * TDD RED PHASE: These tests should FAIL until the unified type is created.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from './config-manager.js';
import type { UnifiedSpecWeaveConfig } from './types.js';

describe('UnifiedSpecWeaveConfig', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-unified-config-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    configPath = path.join(tempDir, '.specweave', 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Type completeness', () => {
    it('should include multiProject from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        multiProject: {
          enabled: true,
          projects: {
            'backend-api': {
              name: 'Backend API',
              techStack: ['Node.js', 'TypeScript'],
            },
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.multiProject).toBeDefined();
      expect(loaded.multiProject?.enabled).toBe(true);
      expect(loaded.multiProject?.projects?.['backend-api']?.name).toBe('Backend API');
    });

    it('should include limits from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        limits: {
          maxActiveIncrements: 2,
          hardCap: 5,
          allowEmergencyInterrupt: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.limits).toBeDefined();
      expect(loaded.limits?.maxActiveIncrements).toBe(2);
      expect(loaded.limits?.hardCap).toBe(5);
    });

    it('should include testing from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 70,
            e2e: 60,
          },
          tddEnforcement: 'strict',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.testing).toBeDefined();
      expect(loaded.testing?.defaultTestMode).toBe('TDD');
      expect(loaded.testing?.tddEnforcement).toBe('strict');
    });

    it('should include archiving from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        archiving: {
          keepLast: 10,
          autoArchive: true,
          archiveAfterDays: 30,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.archiving).toBeDefined();
      expect(loaded.archiving?.keepLast).toBe(10);
      expect(loaded.archiving?.autoArchive).toBe(true);
    });

    it('should include pluginAutoLoad from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        pluginAutoLoad: {
          enabled: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.pluginAutoLoad).toBeDefined();
      expect(loaded.pluginAutoLoad?.enabled).toBe(true);
    });

    it('should include incrementAssist from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        incrementAssist: {
          enabled: true,
          suggestNewIncrement: true,
          confidenceThreshold: 0.8,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.incrementAssist).toBeDefined();
      expect(loaded.incrementAssist?.enabled).toBe(true);
      expect(loaded.incrementAssist?.confidenceThreshold).toBe(0.8);
    });

    it('should include planning with deepInterview from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        planning: {
          deepInterview: {
            enabled: true,
            minQuestions: 10,
            categories: ['architecture', 'security'],
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.planning).toBeDefined();
      expect(loaded.planning?.deepInterview?.enabled).toBe(true);
      expect(loaded.planning?.deepInterview?.minQuestions).toBe(10);
    });

    it('should include sync/issueTracker from SpecWeaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        sync: {
          enabled: true,
          direction: 'bidirectional',
          autoSync: true,
          includeStatus: true,
          autoApplyLabels: true,
        },
        issueTracker: {
          provider: 'github',
          owner: 'myorg',
          repo: 'myrepo',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.sync).toBeDefined();
      expect(loaded.sync?.enabled).toBe(true);
      expect(loaded.issueTracker).toBeDefined();
      expect(loaded.issueTracker?.provider).toBe('github');
    });

    it('should include repository from SpecWeaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        repository: {
          provider: 'github',
          organization: 'myorg',
          gitUrlFormat: 'ssh',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.repository).toBeDefined();
      expect(loaded.repository?.provider).toBe('github');
      expect(loaded.repository?.gitUrlFormat).toBe('ssh');
    });

    it('should include livingDocs from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        livingDocs: {
          copyBasedSync: {
            enabled: true,
            autoGenerate: true,
          },
          threeLayerSync: {
            enabled: true,
            autoSync: true,
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.livingDocs).toBeDefined();
      expect(loaded.livingDocs?.copyBasedSync?.enabled).toBe(true);
    });

    it('should include apiDocs from SpecweaveConfig', async () => {
      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        apiDocs: {
          enabled: true,
          openApiPath: 'api/openapi.yaml',
          generatePostman: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager(tempDir);
      const loaded = await manager.read();

      expect(loaded.apiDocs).toBeDefined();
      expect(loaded.apiDocs?.enabled).toBe(true);
      expect(loaded.apiDocs?.openApiPath).toBe('api/openapi.yaml');
    });
  });

  describe('ConfigManager method aliases', () => {
    it('should have load() as alias for readSync()', () => {
      const manager = new ConfigManager(tempDir);

      // Both methods should exist and return the same result
      expect(typeof manager.load).toBe('function');
      expect(typeof manager.readSync).toBe('function');

      const loadResult = manager.load();
      const readSyncResult = manager.readSync();

      expect(loadResult).toEqual(readSyncResult);
    });

    it('should have loadAsync() as alias for read()', async () => {
      const manager = new ConfigManager(tempDir);

      // Both methods should exist and return the same result
      expect(typeof manager.loadAsync).toBe('function');
      expect(typeof manager.read).toBe('function');

      const loadAsyncResult = await manager.loadAsync();
      manager.clearCache();
      const readResult = await manager.read();

      expect(loadAsyncResult).toEqual(readResult);
    });

    it('should have save() as alias for write()', async () => {
      const manager = new ConfigManager(tempDir);

      // Both methods should exist
      expect(typeof manager.save).toBe('function');
      expect(typeof manager.write).toBe('function');

      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        multiProject: { enabled: false },
      };

      // save() should work the same as write()
      await manager.save(config);
      const loaded = await manager.read();

      expect(loaded.multiProject?.enabled).toBe(false);
    });

    it('should have saveSync() method for synchronous saving', () => {
      const manager = new ConfigManager(tempDir);

      expect(typeof manager.saveSync).toBe('function');

      const config: UnifiedSpecWeaveConfig = {
        version: '2.0',
        limits: { maxActiveIncrements: 3 },
      };

      manager.saveSync(config);
      const loaded = manager.load();

      expect(loaded.limits?.maxActiveIncrements).toBe(3);
    });
  });

  describe('Backward compatibility', () => {
    it('should work with existing consumers using load()', () => {
      // This test simulates how project-manager.ts uses ConfigManager
      const manager = new ConfigManager(tempDir);
      const config = manager.load();

      // Should have access to multiProject
      expect(config.multiProject).toBeDefined();
    });

    it('should work with existing consumers using loadAsync()', async () => {
      // This test simulates how hierarchy-mapper.ts uses ConfigManager
      const manager = new ConfigManager(tempDir);
      const config = await manager.loadAsync();

      // Should have access to multiProject
      expect(config.multiProject).toBeDefined();
    });

    it('should merge defaults properly for both schema properties', async () => {
      // Write minimal config
      fs.writeFileSync(configPath, JSON.stringify({ version: '2.0' }, null, 2));

      const manager = new ConfigManager(tempDir);
      const config = await manager.read();

      // Should have defaults from both schemas
      expect(config.version).toBe('2.0');

      // Sync-related defaults (from SpecWeaveConfig)
      expect(config.repository?.provider).toBeDefined();

      // Project/increment defaults (from SpecweaveConfig)
      // These would come from the merged DEFAULT_CONFIG
      expect(config.limits).toBeDefined();
      expect(config.testing).toBeDefined();
    });
  });
});
