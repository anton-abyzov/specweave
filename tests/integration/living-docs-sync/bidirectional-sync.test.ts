/**
 * Bidirectional Sync Integration Tests
 *
 * CRITICAL: Validates that external tool status ALWAYS wins in conflicts
 * and that increment vs spec lifecycles are properly separated.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  ConflictResolver,
  loadSpecMetadata,
  performBidirectionalSync,
  ExternalStatus,
  SpecStatus
} from '../../../plugins/specweave-ado/lib/conflict-resolver';

describe('Bidirectional Sync with Living Docs', () => {
  let testDir: string;
  let specPath: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'tests', 'tmp', `sync-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create test spec
    specPath = path.join(testDir, 'spec-001-auth.md');
    incrementPath = path.join(testDir, 'increment-0010');
  });

  afterEach(async () => {
    // Clean up
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Conflict Resolution - External Wins', () => {
    test('should prefer external status over local status', async () => {
      const resolver = new ConflictResolver();

      const localStatus: SpecStatus = 'implemented';
      const externalStatus: ExternalStatus = {
        tool: 'ado',
        status: 'In QA',
        mappedStatus: 'in-qa',
        lastModified: new Date().toISOString()
      };

      const resolution = resolver.resolveStatusConflict(localStatus, externalStatus);

      expect(resolution.resolution).toBe('external');
      expect(resolution.resolvedValue).toBe('in-qa');
      expect(resolution.reason).toContain('QA and stakeholder decisions');
    });

    test('should handle all status conflict scenarios correctly', async () => {
      const resolver = new ConflictResolver();

      const scenarios = [
        {
          local: 'implemented' as SpecStatus,
          external: { tool: 'ado' as const, status: 'In QA', mappedStatus: 'in-qa' as SpecStatus },
          expected: 'in-qa'
        },
        {
          local: 'complete' as SpecStatus,
          external: { tool: 'ado' as const, status: 'Active', mappedStatus: 'in-progress' as SpecStatus },
          expected: 'in-progress' // Reopened - external wins
        },
        {
          local: 'draft' as SpecStatus,
          external: { tool: 'ado' as const, status: 'Closed', mappedStatus: 'complete' as SpecStatus },
          expected: 'complete' // Jumped ahead - external wins
        }
      ];

      for (const scenario of scenarios) {
        const resolution = resolver.resolveStatusConflict(
          scenario.local,
          { ...scenario.external, lastModified: new Date().toISOString() }
        );

        expect(resolution.resolvedValue).toBe(scenario.expected);
        expect(resolution.resolution).toBe('external');
      }
    });

    test('should apply resolutions to spec file', async () => {
      // Create test spec
      const specContent = `---
id: spec-001
title: OAuth Implementation
status: implemented
priority: P1
externalLinks:
  ado:
    featureId: 123
    featureUrl: https://dev.azure.com/org/proj/_workitems/edit/123
---

# OAuth Implementation

Test content`;

      await fs.writeFile(specPath, specContent);

      const resolver = new ConflictResolver();
      const resolutions = [
        {
          field: 'status',
          localValue: 'implemented',
          externalValue: 'In QA',
          resolution: 'external' as const,
          resolvedValue: 'in-qa',
          reason: 'External tool reflects QA and stakeholder decisions',
          timestamp: new Date().toISOString()
        }
      ];

      await resolver.applyResolutions(specPath, resolutions);

      // Verify the spec was updated
      const updatedContent = await fs.readFile(specPath, 'utf-8');
      expect(updatedContent).toContain('status: in-qa');
      expect(updatedContent).toContain('syncedAt:');
    });
  });

  describe('Increment vs Spec Lifecycle', () => {
    test('increment can be closed while spec is still in QA', async () => {
      // Increment status (closed)
      const incrementMetadata = {
        id: '0010-oauth-implementation',
        status: 'closed',
        tasksComplete: 10,
        tasksTotal: 10,
        testsPass: true,
        closedAt: '2025-11-10T10:00:00Z'
      };

      await fs.ensureDir(incrementPath);
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), incrementMetadata);

      // Spec status (in-qa - from external)
      const specContent = `---
id: spec-001
status: in-qa
externalLinks:
  ado:
    featureId: 123
    lastExternalStatus: In QA
---`;

      await fs.writeFile(specPath, specContent);

      // Validate the states are different and this is correct
      const spec = await loadSpecMetadata(specPath);
      const increment = await fs.readJson(path.join(incrementPath, 'metadata.json'));

      expect(increment.status).toBe('closed');
      expect(spec.status).toBe('in-qa');

      // This difference is VALID and expected
      expect(increment.status).not.toBe(spec.status);
    });

    test('spec status should update from external without affecting closed increment', async () => {
      // Closed increment
      const incrementMetadata = {
        id: '0010-oauth-implementation',
        status: 'closed',
        closedAt: '2025-11-09T10:00:00Z'
      };

      await fs.ensureDir(incrementPath);
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), incrementMetadata);

      // Initial spec (implemented)
      const specContent = `---
id: spec-001
title: OAuth Implementation
status: implemented
externalLinks:
  ado:
    featureId: 123
    featureUrl: https://dev.azure.com/org/proj/_workitems/edit/123
---

# Content`;

      await fs.writeFile(specPath, specContent);

      // Simulate external status change
      const externalStatus: ExternalStatus = {
        tool: 'ado',
        status: 'In QA',
        mappedStatus: 'in-qa',
        lastModified: new Date().toISOString()
      };

      await performBidirectionalSync(specPath, externalStatus);

      // Check spec was updated
      const updatedSpec = await loadSpecMetadata(specPath);
      expect(updatedSpec.status).toBe('in-qa');

      // Check increment is still closed
      const increment = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(increment.status).toBe('closed');
    });
  });

  describe('Status Mapping', () => {
    test('should correctly map ADO statuses to local', () => {
      const resolver = new ConflictResolver();

      const mappings = [
        { external: 'New', expected: 'draft' },
        { external: 'Active', expected: 'in-progress' },
        { external: 'Resolved', expected: 'implemented' },
        { external: 'Closed', expected: 'complete' },
        { external: 'In QA', expected: 'in-qa' },
        { external: 'In Review', expected: 'in-qa' },
        { external: 'Blocked', expected: 'blocked' }
      ];

      for (const { external, expected } of mappings) {
        const mapped = resolver.mapExternalStatus('ado', external);
        expect(mapped).toBe(expected);
      }
    });

    test('should correctly map local statuses to ADO', () => {
      const resolver = new ConflictResolver();

      const mappings = [
        { local: 'draft' as SpecStatus, expected: 'New' },
        { local: 'in-progress' as SpecStatus, expected: 'Active' },
        { local: 'implemented' as SpecStatus, expected: 'Resolved' },
        { local: 'complete' as SpecStatus, expected: 'Closed' },
        { local: 'in-qa' as SpecStatus, expected: 'In QA' }
      ];

      for (const { local, expected } of mappings) {
        const mapped = resolver.mapLocalStatus('ado', local);
        expect(mapped).toBe(expected);
      }
    });
  });

  describe('Validation of Implementation', () => {
    test('should detect incorrect conflict resolution patterns', () => {
      const resolver = new ConflictResolver();

      // Incorrect implementation - local wins
      const incorrectCode = `
        if (conflict) {
          spec.status = localStatus; // Local wins - WRONG!
          resolution: 'local'
        }
      `;

      const validation = resolver.validateImplementation(incorrectCode);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContain('Local status should never win in conflicts');
      expect(validation.violations).toContain('Resolution should be "external" for status conflicts');
    });

    test('should validate correct conflict resolution patterns', () => {
      const resolver = new ConflictResolver();

      // Correct implementation - external wins
      const correctCode = `
        if (conflict) {
          spec.status = externalStatus; // EXTERNAL WINS
          console.log('External status applied');
          resolution: 'external'
        }
      `;

      const validation = resolver.validateImplementation(correctCode);

      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('Real-World Scenarios', () => {
    test('Scenario: Bug found after increment completion', async () => {
      // Initial state: Increment closed, spec complete
      const closedIncrement = {
        id: '0010-oauth-implementation',
        status: 'closed',
        closedAt: '2025-11-01T10:00:00Z'
      };

      await fs.ensureDir(incrementPath);
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), closedIncrement);

      const initialSpec = `---
id: spec-001
status: complete
externalLinks:
  ado:
    featureId: 123
---`;

      await fs.writeFile(specPath, initialSpec);

      // Bug found - ADO reopened
      const externalStatus: ExternalStatus = {
        tool: 'ado',
        status: 'Active', // Reopened
        mappedStatus: 'in-progress',
        lastModified: new Date().toISOString()
      };

      await performBidirectionalSync(specPath, externalStatus);

      // Verify spec updated
      const spec = await loadSpecMetadata(specPath);
      expect(spec.status).toBe('in-progress');

      // Verify increment still closed (correct!)
      const increment = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(increment.status).toBe('closed');

      // Create new increment for fix
      const newIncrementPath = path.join(testDir, 'increment-0011');
      await fs.ensureDir(newIncrementPath);
      await fs.writeJson(path.join(newIncrementPath, 'metadata.json'), {
        id: '0011-oauth-bugfix',
        status: 'in-progress',
        parentSpec: 'spec-001'
      });
    });

    test('Scenario: Long QA cycle after development', async () => {
      // Week 1: Development complete
      const incrementMetadata = {
        id: '0015-payment-integration',
        status: 'closed',
        closedAt: '2025-11-01T10:00:00Z'
      };

      await fs.ensureDir(incrementPath);
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), incrementMetadata);

      const specContent = `---
id: spec-003
status: implemented
externalLinks:
  ado:
    featureId: 456
---`;

      await fs.writeFile(specPath, specContent);

      // Week 2-3: QA Testing
      let externalStatus: ExternalStatus = {
        tool: 'ado',
        status: 'In QA',
        mappedStatus: 'in-qa',
        lastModified: '2025-11-14T10:00:00Z'
      };

      await performBidirectionalSync(specPath, externalStatus);

      let spec = await loadSpecMetadata(specPath);
      expect(spec.status).toBe('in-qa');

      // Week 6: Final approval
      externalStatus = {
        tool: 'ado',
        status: 'Closed',
        mappedStatus: 'complete',
        lastModified: '2025-11-28T10:00:00Z'
      };

      await performBidirectionalSync(specPath, externalStatus);

      spec = await loadSpecMetadata(specPath);
      expect(spec.status).toBe('complete');

      // Increment stayed closed throughout (correct!)
      const increment = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(increment.status).toBe('closed');
      expect(increment.closedAt).toBe('2025-11-01T10:00:00Z'); // Unchanged
    });
  });

  describe('Sync Report Generation', () => {
    test('should generate comprehensive sync report', async () => {
      const resolver = new ConflictResolver();

      // Simulate multiple resolutions
      resolver.resolveStatusConflict('implemented' as SpecStatus, {
        tool: 'ado',
        status: 'In QA',
        mappedStatus: 'in-qa',
        lastModified: new Date().toISOString()
      });

      resolver.resolvePriorityConflict('P2', 'P1');

      const report = resolver.generateReport();

      expect(report).toContain('Conflict Resolution Report');
      expect(report).toContain('Total Resolutions: 2');
      expect(report).toContain('EXTERNAL WINS');
      expect(report).toContain('All conflicts resolved with external tool priority');
    });
  });
});