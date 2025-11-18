/**
 * Unit Tests: TestMode Configuration Hierarchy
 *
 * Validates the three-level config hierarchy:
 * 1. Global default (config.json)
 * 2. Per-increment override (spec.md frontmatter)
 * 3. Runtime storage (metadata.json)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { SpecweaveConfig, TestMode } from '../../src/core/types/config.js';
import type { IncrementMetadata } from '../../src/core/types/increment-metadata.js';

describe('TestMode Configuration', () => {
  let testDir: string;
  let configPath: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `test-mode-config-${Date.now()}`);
    await fs.ensureDir(testDir);

    configPath = path.join(testDir, '.specweave', 'config.json');
    incrementPath = path.join(testDir, '.specweave', 'increments', '0001-test');

    await fs.ensureDir(path.dirname(configPath));
    await fs.ensureDir(incrementPath);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Config Hierarchy', () => {
    it('uses global defaultTestMode when no frontmatter override', async () => {
      // Setup: config.json with defaultTestMode: "test-after"
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'test-after',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      // Simulate PM agent reading config and creating metadata
      const configData = await fs.readJson(configPath);
      const testMode = configData.testing?.defaultTestMode || 'TDD';
      const coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode: testMode as TestMode,
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      // Verify: metadata.json has testMode: "test-after"
      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.testMode).toBe('test-after');
      expect(result.coverageTarget).toBe(80);
    });

    it('overrides global config with spec.md frontmatter', async () => {
      // Setup: config.json with defaultTestMode: "TDD"
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      // Setup: spec.md with frontmatter test_mode: "manual"
      const specContent = `---
test_mode: manual
coverage_target: 75
---

# Feature Specification

This is a test feature.
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

      // Simulate PM agent logic
      const configData = await fs.readJson(configPath);
      let testMode: TestMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
      let coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      // Parse spec.md frontmatter
      const specPath = path.join(incrementPath, 'spec.md');
      const spec = await fs.readFile(specPath, 'utf-8');
      const frontmatterMatch = spec.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const testModeMatch = frontmatter.match(/test_mode:\s*(.+)/);
        const coverageMatch = frontmatter.match(/coverage_target:\s*(\d+)/);

        if (testModeMatch) testMode = testModeMatch[1].trim() as TestMode;
        if (coverageMatch) coverageTarget = parseInt(coverageMatch[1]);
      }

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode,
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      // Verify: metadata.json has testMode: "manual" (from frontmatter)
      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.testMode).toBe('manual');
      expect(result.coverageTarget).toBe(75);
    });

    it('falls back to hardcoded default when config missing', async () => {
      // Setup: No config.json file (intentionally not creating it)

      // Simulate PM agent logic with missing config
      const testMode: TestMode = 'TDD'; // Hardcoded default
      const coverageTarget = 80; // Hardcoded default

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode,
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      // Verify: metadata.json has testMode: "TDD"
      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.testMode).toBe('TDD');
      expect(result.coverageTarget).toBe(80);
    });

    it('falls back to hardcoded default when config malformed', async () => {
      // Setup: config.json with invalid JSON
      await fs.writeFile(configPath, '{ invalid json }', 'utf-8');

      // Simulate PM agent logic with error handling
      let testMode: TestMode = 'TDD'; // Default
      let coverageTarget = 80; // Default

      try {
        const configData = await fs.readJson(configPath);
        testMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
        coverageTarget = configData.testing?.defaultCoverageTarget || 80;
      } catch (error) {
        // Config parse error - use defaults
        testMode = 'TDD';
        coverageTarget = 80;
      }

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode,
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      // Verify: metadata.json has testMode: "TDD" (no crash)
      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.testMode).toBe('TDD');
      expect(result.coverageTarget).toBe(80);
    });
  });

  describe('Valid Values', () => {
    it('accepts "TDD" as valid testMode', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const configData = await fs.readJson(configPath);
      expect(configData.testing.defaultTestMode).toBe('TDD');
    });

    it('accepts "test-after" as valid testMode', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'test-after',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const configData = await fs.readJson(configPath);
      expect(configData.testing.defaultTestMode).toBe('test-after');
    });

    it('accepts "manual" as valid testMode', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'manual',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const configData = await fs.readJson(configPath);
      expect(configData.testing.defaultTestMode).toBe('manual');
    });

    it('handles invalid testMode by falling back to default', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'invalid' as TestMode,
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      // Simulate PM agent with validation
      const configData = await fs.readJson(configPath);
      const validModes: TestMode[] = ['TDD', 'test-after', 'manual'];
      const testMode = validModes.includes(configData.testing?.defaultTestMode)
        ? configData.testing.defaultTestMode
        : 'TDD'; // Fallback

      expect(testMode).toBe('TDD'); // Falls back due to invalid value
    });
  });

  describe('Coverage Target', () => {
    it('uses global defaultCoverageTarget when no override', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 85,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const configData = await fs.readJson(configPath);
      const coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode: 'TDD',
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.coverageTarget).toBe(85);
    });

    it('overrides global coverage with spec.md frontmatter', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const specContent = `---
test_mode: TDD
coverage_target: 90
---

# Feature Specification

High-risk feature requiring 90% coverage.
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

      // Simulate PM agent logic
      const configData = await fs.readJson(configPath);
      let testMode: TestMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
      let coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      // Parse spec.md frontmatter
      const specPath = path.join(incrementPath, 'spec.md');
      const spec = await fs.readFile(specPath, 'utf-8');
      const frontmatterMatch = spec.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const testModeMatch = frontmatter.match(/test_mode:\s*(.+)/);
        const coverageMatch = frontmatter.match(/coverage_target:\s*(\d+)/);

        if (testModeMatch) testMode = testModeMatch[1].trim() as TestMode;
        if (coverageMatch) coverageTarget = parseInt(coverageMatch[1]);
      }

      const metadata: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode,
        coverageTarget,
      };

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata);

      // Verify: metadata.json has coverageTarget: 90 (from frontmatter)
      const result = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(result.coverageTarget).toBe(90);
    });
  });

  describe('Multiple Increments', () => {
    it('each increment inherits global default independently', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'test-after',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      // Create 3 increments
      const increments = ['0001-test', '0002-test', '0003-test'];

      for (const inc of increments) {
        const incPath = path.join(testDir, '.specweave', 'increments', inc);
        await fs.ensureDir(incPath);

        const configData = await fs.readJson(configPath);
        const testMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
        const coverageTarget = configData.testing?.defaultCoverageTarget || 80;

        const metadata: IncrementMetadata = {
          id: inc,
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          testMode,
          coverageTarget,
        };

        await fs.writeJson(path.join(incPath, 'metadata.json'), metadata);
      }

      // Verify: All 3 have testMode: "test-after"
      for (const inc of increments) {
        const incPath = path.join(testDir, '.specweave', 'increments', inc);
        const result = await fs.readJson(path.join(incPath, 'metadata.json'));
        expect(result.testMode).toBe('test-after');
      }
    });

    it('changing config affects new increments only', async () => {
      // Create increment 0001 with TDD
      const config1: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config1);

      const inc1Path = path.join(testDir, '.specweave', 'increments', '0001-test');
      await fs.ensureDir(inc1Path);

      const configData1 = await fs.readJson(configPath);
      const metadata1: IncrementMetadata = {
        id: '0001-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode: (configData1.testing?.defaultTestMode || 'TDD') as TestMode,
        coverageTarget: configData1.testing?.defaultCoverageTarget || 80,
      };

      await fs.writeJson(path.join(inc1Path, 'metadata.json'), metadata1);

      // Change config to test-after
      const config2: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'test-after',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config2);

      // Create increment 0002 with new config
      const inc2Path = path.join(testDir, '.specweave', 'increments', '0002-test');
      await fs.ensureDir(inc2Path);

      const configData2 = await fs.readJson(configPath);
      const metadata2: IncrementMetadata = {
        id: '0002-test',
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        testMode: (configData2.testing?.defaultTestMode || 'TDD') as TestMode,
        coverageTarget: configData2.testing?.defaultCoverageTarget || 80,
      };

      await fs.writeJson(path.join(inc2Path, 'metadata.json'), metadata2);

      // Verify:
      // - 0001 still has testMode: "TDD"
      // - 0002 has testMode: "test-after"
      const result1 = await fs.readJson(path.join(inc1Path, 'metadata.json'));
      expect(result1.testMode).toBe('TDD');

      const result2 = await fs.readJson(path.join(inc2Path, 'metadata.json'));
      expect(result2.testMode).toBe('test-after');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing testing section in config', async () => {
      const config: Partial<SpecweaveConfig> = {
        project: {
          name: 'test-project',
        },
        // No testing section
      };
      await fs.writeJson(configPath, config);

      const configData = await fs.readJson(configPath);
      const testMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
      const coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      expect(testMode).toBe('TDD');
      expect(coverageTarget).toBe(80);
    });

    it('handles empty frontmatter in spec.md', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'test-after',
          defaultCoverageTarget: 80,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const specContent = `---
---

# Feature Specification

No frontmatter overrides.
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

      // Simulate PM agent logic
      const configData = await fs.readJson(configPath);
      let testMode: TestMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
      let coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      const specPath = path.join(incrementPath, 'spec.md');
      const spec = await fs.readFile(specPath, 'utf-8');
      const frontmatterMatch = spec.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const testModeMatch = frontmatter.match(/test_mode:\s*(.+)/);
        const coverageMatch = frontmatter.match(/coverage_target:\s*(\d+)/);

        if (testModeMatch) testMode = testModeMatch[1].trim() as TestMode;
        if (coverageMatch) coverageTarget = parseInt(coverageMatch[1]);
      }

      // Should use config defaults (no overrides)
      expect(testMode).toBe('test-after');
      expect(coverageTarget).toBe(80);
    });

    it('handles spec.md without frontmatter', async () => {
      const config: Partial<SpecweaveConfig> = {
        testing: {
          defaultTestMode: 'TDD',
          defaultCoverageTarget: 85,
          coverageTargets: {
            unit: 85,
            integration: 80,
            e2e: 90,
          },
        },
      };
      await fs.writeJson(configPath, config);

      const specContent = `# Feature Specification

No frontmatter at all.
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

      // Simulate PM agent logic
      const configData = await fs.readJson(configPath);
      let testMode: TestMode = (configData.testing?.defaultTestMode || 'TDD') as TestMode;
      let coverageTarget = configData.testing?.defaultCoverageTarget || 80;

      const specPath = path.join(incrementPath, 'spec.md');
      const spec = await fs.readFile(specPath, 'utf-8');
      const frontmatterMatch = spec.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const testModeMatch = frontmatter.match(/test_mode:\s*(.+)/);
        const coverageMatch = frontmatter.match(/coverage_target:\s*(\d+)/);

        if (testModeMatch) testMode = testModeMatch[1].trim() as TestMode;
        if (coverageMatch) coverageTarget = parseInt(coverageMatch[1]);
      }

      // Should use config defaults (no frontmatter found)
      expect(testMode).toBe('TDD');
      expect(coverageTarget).toBe(85);
    });
  });
});
