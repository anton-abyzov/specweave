/**
 * Unit tests for Increment Generator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateSpecFromDiscrepancies,
  linkDiscrepanciesToIncrement,
  resolveDiscrepanciesOnCompletion,
  getNextIncrementId,
  generateIncrementFromDiscrepancies,
} from '../../../../src/core/discrepancy/increment-generator.js';
import { BrownfieldDiscrepancy } from '../../../../src/core/discrepancy/brownfield-types.js';
import { BrownfieldDiscrepancyManager } from '../../../../src/core/discrepancy/brownfield-manager.js';

describe('Increment Generator', () => {
  let testDir: string;
  const silentLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inc-gen-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'increments'), { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (testDir) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createTestDiscrepancy = (overrides: Partial<BrownfieldDiscrepancy> = {}): BrownfieldDiscrepancy => ({
    id: 'DISC-0001',
    type: 'missing-docs',
    status: 'pending',
    priority: 'high',
    module: 'auth-service',
    summary: 'Missing documentation for login function',
    details: 'The login function lacks JSDoc comments and usage examples.',
    codeLocation: 'src/auth/login.ts:45',
    docLocation: null,
    evidence: { type: 'code-analysis', data: {} },
    source: 'brownfield-analysis',
    confidence: 95,
    detectedAt: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    ...overrides,
  });

  describe('generateSpecFromDiscrepancies', () => {
    it('should generate a spec with discrepancy context', async () => {
      const discrepancies = [
        createTestDiscrepancy({ id: 'DISC-0001', summary: 'Missing login docs' }),
        createTestDiscrepancy({ id: 'DISC-0002', summary: 'Stale API docs', type: 'stale-docs' }),
      ];

      const spec = await generateSpecFromDiscrepancies(discrepancies, '0087-auth-docs');

      expect(spec).toContain('increment: 0087-auth-docs');
      expect(spec).toContain('status: planning');
      expect(spec).toContain('type: documentation');
      expect(spec).toContain('DISC-0001');
      expect(spec).toContain('DISC-0002');
      expect(spec).toContain('Missing login docs');
      expect(spec).toContain('auth-service');
    });

    it('should use custom title if provided', async () => {
      const discrepancies = [createTestDiscrepancy()];
      const spec = await generateSpecFromDiscrepancies(discrepancies, '0088-custom', 'Custom Title');

      expect(spec).toContain('# Custom Title');
    });

    it('should include code locations in affected files section', async () => {
      const discrepancies = [
        createTestDiscrepancy({ codeLocation: 'src/auth/login.ts:45' }),
        createTestDiscrepancy({ id: 'DISC-0002', codeLocation: 'src/auth/logout.ts:20' }),
      ];

      const spec = await generateSpecFromDiscrepancies(discrepancies, '0089-auth');

      expect(spec).toContain('src/auth/login.ts:45');
      expect(spec).toContain('src/auth/logout.ts:20');
    });
  });

  describe('getNextIncrementId', () => {
    it('should return 0001 for empty increments folder', () => {
      const id = getNextIncrementId(testDir);
      expect(id).toBe('0001');
    });

    it('should return next sequential ID', () => {
      fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '0005-feature'), { recursive: true });
      fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '0010-another'), { recursive: true });

      const id = getNextIncrementId(testDir);
      expect(id).toBe('0011');
    });

    it('should ignore non-numeric folders', () => {
      fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '0003-feature'), { recursive: true });
      fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '_archive'), { recursive: true });
      fs.mkdirSync(path.join(testDir, '.specweave', 'increments', 'temp'), { recursive: true });

      const id = getNextIncrementId(testDir);
      expect(id).toBe('0004');
    });
  });

  describe('linkDiscrepanciesToIncrement', () => {
    it('should link discrepancies to an increment', async () => {
      const manager = new BrownfieldDiscrepancyManager(testDir, { logger: silentLogger });

      // Create discrepancies
      await manager.createDiscrepancy({
        type: 'missing-docs',
        priority: 'high',
        module: 'auth',
        summary: 'Test 1',
        details: 'Test details 1',
        evidence: { type: 'code-analysis', data: {} },
        source: 'brownfield-analysis',
        confidence: 90,
        status: 'pending',
        autoDetected: true,
        detectedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      });
      await manager.createDiscrepancy({
        type: 'stale-docs',
        priority: 'medium',
        module: 'auth',
        summary: 'Test 2',
        details: 'Test details 2',
        evidence: { type: 'code-analysis', data: {} },
        source: 'brownfield-analysis',
        confidence: 85,
        status: 'pending',
        autoDetected: true,
        detectedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      });

      const linked = await linkDiscrepanciesToIncrement(
        testDir,
        ['DISC-0001', 'DISC-0002'],
        '0087-auth-docs',
        { logger: silentLogger }
      );

      expect(linked).toBe(2);

      // Verify discrepancies are linked
      const disc1 = await manager.getDiscrepancy('DISC-0001');
      const disc2 = await manager.getDiscrepancy('DISC-0002');
      expect(disc1?.incrementId).toBe('0087-auth-docs');
      expect(disc2?.incrementId).toBe('0087-auth-docs');
      expect(disc1?.status).toBe('in-progress');
      expect(disc2?.status).toBe('in-progress');
    });

    it('should handle non-existent discrepancy IDs gracefully', async () => {
      const linked = await linkDiscrepanciesToIncrement(
        testDir,
        ['DISC-9999'],
        '0087-auth-docs',
        { logger: silentLogger }
      );

      expect(linked).toBe(0);
    });
  });

  describe('resolveDiscrepanciesOnCompletion', () => {
    it('should resolve in-progress discrepancies linked to increment', async () => {
      const manager = new BrownfieldDiscrepancyManager(testDir, { logger: silentLogger });

      // Create and link discrepancy
      await manager.createDiscrepancy({
        type: 'missing-docs',
        priority: 'high',
        module: 'auth',
        summary: 'Test',
        details: 'Test details',
        evidence: { type: 'code-analysis', data: {} },
        source: 'brownfield-analysis',
        confidence: 90,
        status: 'pending',
        autoDetected: true,
        detectedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      });
      await manager.linkToIncrement('DISC-0001', '0087-test');

      const resolved = await resolveDiscrepanciesOnCompletion(
        testDir,
        '0087-test',
        { logger: silentLogger }
      );

      expect(resolved).toBe(1);

      const disc = await manager.getDiscrepancy('DISC-0001');
      expect(disc?.status).toBe('resolved');
      expect(disc?.resolution?.type).toBe('doc-updated');
    });

    it('should return 0 when no discrepancies linked to increment', async () => {
      const resolved = await resolveDiscrepanciesOnCompletion(
        testDir,
        '0099-nonexistent',
        { logger: silentLogger }
      );

      expect(resolved).toBe(0);
    });
  });

  describe('generateIncrementFromDiscrepancies', () => {
    it('should create increment folder with spec and metadata', async () => {
      const manager = new BrownfieldDiscrepancyManager(testDir, { logger: silentLogger });

      await manager.createDiscrepancy({
        type: 'missing-docs',
        priority: 'high',
        module: 'payment-service',
        summary: 'Missing docs for processPayment',
        details: 'processPayment function lacks documentation',
        evidence: { type: 'code-analysis', data: {} },
        source: 'brownfield-analysis',
        confidence: 90,
        status: 'pending',
        autoDetected: true,
        detectedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      });

      const result = await generateIncrementFromDiscrepancies({
        discrepancyIds: ['DISC-0001'],
        projectPath: testDir,
        logger: silentLogger,
      });

      expect(result.success).toBe(true);
      expect(result.incrementId).toMatch(/^0001-payment-service-docs$/);
      expect(result.discrepanciesLinked).toBe(1);

      // Verify files created
      expect(fs.existsSync(path.join(result.incrementPath, 'spec.md'))).toBe(true);
      expect(fs.existsSync(path.join(result.incrementPath, 'metadata.json'))).toBe(true);

      // Verify metadata content
      const metadata = JSON.parse(
        fs.readFileSync(path.join(result.incrementPath, 'metadata.json'), 'utf-8')
      );
      expect(metadata.status).toBe('planning');
      expect(metadata.linkedDiscrepancies).toContain('DISC-0001');
    });

    it('should fail when no valid discrepancies provided', async () => {
      const result = await generateIncrementFromDiscrepancies({
        discrepancyIds: ['DISC-9999'],
        projectPath: testDir,
        logger: silentLogger,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid discrepancies found');
    });

    it('should warn but include non-pending discrepancies', async () => {
      const manager = new BrownfieldDiscrepancyManager(testDir, { logger: silentLogger });

      await manager.createDiscrepancy({
        type: 'missing-docs',
        priority: 'high',
        module: 'api',
        summary: 'Test',
        details: 'Test details',
        evidence: { type: 'code-analysis', data: {} },
        source: 'brownfield-analysis',
        confidence: 90,
        status: 'pending',
        autoDetected: true,
        detectedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      });
      // Already link it (making it in-progress)
      await manager.linkToIncrement('DISC-0001', 'existing-increment');

      const result = await generateIncrementFromDiscrepancies({
        discrepancyIds: ['DISC-0001'],
        projectPath: testDir,
        logger: silentLogger,
      });

      // Should still work but with warning
      expect(result.success).toBe(true);
      expect(silentLogger.warn).toHaveBeenCalled();
    });
  });
});
