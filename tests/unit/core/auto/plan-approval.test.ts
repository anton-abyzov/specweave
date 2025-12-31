/**
 * Tests for Plan Approval module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  formatPlanDisplay,
  generateApprovalPrompt,
  validatePlan,
  logApprovedPlan,
  savePlanToState,
  loadPlanFromState,
  clearPlanFromState,
  applyPlanModification,
} from '../../../../src/core/auto/plan-approval.js';
import type { PlanningResult, IncrementPlan } from '../../../../src/core/auto/increment-planner.js';
import type { Feature } from '../../../../src/core/auto/prompt-chunker.js';

describe('plan-approval', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-approval-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave/state'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/logs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Helper to create a feature
  function createFeature(name: string, complexity: 'simple' | 'medium' | 'complex' = 'medium'): Feature {
    const tasks = complexity === 'simple' ? 3 : complexity === 'medium' ? 7 : 12;
    return {
      name,
      description: `${name} feature`,
      complexity,
      estimatedTasks: tasks,
      dependencies: [],
      keywords: [name],
    };
  }

  // Helper to create an increment
  function createIncrement(
    id: string,
    name: string,
    features: Feature[],
    dependencies: string[] = []
  ): IncrementPlan {
    return {
      id,
      name,
      description: features.map((f) => f.name).join(', '),
      features,
      estimatedTasks: features.reduce((sum, f) => sum + f.estimatedTasks, 0),
      dependencies,
      priority: parseInt(id.split('-')[0], 10),
    };
  }

  // Helper to create a planning result
  function createPlan(increments: IncrementPlan[]): PlanningResult {
    const features = increments.flatMap((i) => i.features);
    return {
      increments,
      totalFeatures: features.length,
      totalTasks: increments.reduce((sum, i) => sum + i.estimatedTasks, 0),
      estimatedDuration: '1-2 days',
    };
  }

  describe('formatPlanDisplay', () => {
    it('should format plan in text format', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
        createIncrement('0002-products', 'Products', [createFeature('products', 'medium')], ['0001-auth']),
      ]);

      const output = formatPlanDisplay(plan, { format: 'text' });

      expect(output).toContain('📋 Increment Plan');
      expect(output).toContain('Total Features: 2');
      expect(output).toContain('Increments: 2');
      expect(output).toContain('Authentication');
      expect(output).toContain('Products');
      expect(output).toContain('0001-auth');
      expect(output).toContain('0002-products');
    });

    it('should format plan in markdown format', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      const output = formatPlanDisplay(plan, { format: 'markdown' });

      expect(output).toContain('## 📋 Increment Plan');
      expect(output).toContain('| # | Name |');
      expect(output).toContain('| 1 | Authentication |');
    });

    it('should format plan in JSON format', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      const output = formatPlanDisplay(plan, { format: 'json' });
      const parsed = JSON.parse(output);

      expect(parsed.increments).toHaveLength(1);
      expect(parsed.totalFeatures).toBe(1);
    });

    it('should show dependencies when enabled', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
        createIncrement('0002-checkout', 'Checkout', [createFeature('checkout', 'complex')], ['0001-auth']),
      ]);

      const output = formatPlanDisplay(plan, { showDependencies: true });

      expect(output).toContain('Depends on');
      expect(output).toContain('0001-auth');
    });

    it('should show feature details when enabled', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [
          createFeature('login', 'medium'),
          createFeature('signup', 'medium'),
        ]),
      ]);

      const output = formatPlanDisplay(plan, { showDetails: true });

      expect(output).toContain('Feature Breakdown');
      expect(output).toContain('login');
      expect(output).toContain('signup');
    });
  });

  describe('generateApprovalPrompt', () => {
    it('should generate approval options', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      const prompt = generateApprovalPrompt(plan);

      expect(prompt).toContain('Approve');
      expect(prompt).toContain('Modify');
      expect(prompt).toContain('Cancel');
      expect(prompt).toContain('--yes');
    });
  });

  describe('validatePlan', () => {
    it('should validate valid plan', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      const result = validatePlan(plan);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect empty plan', () => {
      const plan = createPlan([]);

      const result = validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Plan has no increments');
    });

    it('should detect increment with no features', () => {
      const plan = createPlan([
        {
          id: '0001-empty',
          name: 'Empty',
          description: '',
          features: [],
          estimatedTasks: 0,
          dependencies: [],
          priority: 1,
        },
      ]);

      const result = validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('no features'))).toBe(true);
    });

    it('should detect missing dependencies', () => {
      const plan = createPlan([
        createIncrement('0002-checkout', 'Checkout', [createFeature('checkout')], ['0001-missing']),
      ]);

      const result = validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('non-existent increment'))).toBe(true);
    });

    it('should warn about large increments', () => {
      const largeFeatures = Array.from({ length: 5 }, (_, i) =>
        createFeature(`feature-${i}`, 'complex')
      ); // 5 * 12 = 60 tasks

      const plan = createPlan([createIncrement('0001-large', 'Large', largeFeatures)]);

      const result = validatePlan(plan);

      // Should be valid but have warnings
      expect(result.valid).toBe(true);
      expect(result.issues.some((i) => i.includes('Warning') && i.includes('consider splitting'))).toBe(
        true
      );
    });
  });

  describe('logApprovedPlan', () => {
    it('should log approved plan to file', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      logApprovedPlan(plan, testDir);

      // Check plan log file was created
      const logFiles = fs.readdirSync(path.join(testDir, '.specweave/logs'));
      const planLogFile = logFiles.find((f) => f.startsWith('plan-approved-'));
      expect(planLogFile).toBeDefined();

      // Check sessions log was appended
      const sessionsLog = fs.readFileSync(
        path.join(testDir, '.specweave/logs/auto-sessions.log'),
        'utf-8'
      );
      expect(sessionsLog).toContain('plan_approved');
    });
  });

  describe('savePlanToState / loadPlanFromState / clearPlanFromState', () => {
    it('should save and load plan from state', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      savePlanToState(plan, testDir);

      const loaded = loadPlanFromState(testDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.plan.totalFeatures).toBe(1);
      expect(loaded!.plan.increments[0].id).toBe('0001-auth');
    });

    it('should return null when no saved plan exists', () => {
      const loaded = loadPlanFromState(testDir);
      expect(loaded).toBeNull();
    });

    it('should clear saved plan', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
      ]);

      savePlanToState(plan, testDir);
      expect(loadPlanFromState(testDir)).not.toBeNull();

      clearPlanFromState(testDir);
      expect(loadPlanFromState(testDir)).toBeNull();
    });
  });

  describe('applyPlanModification', () => {
    it('should merge increments', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
        createIncrement('0002-products', 'Products', [createFeature('products', 'medium')]),
      ]);

      const modified = applyPlanModification(plan, {
        type: 'merge',
        incrementIds: ['0001-auth', '0002-products'],
        newName: 'Auth & Products',
      });

      expect(modified.increments).toHaveLength(1);
      expect(modified.increments[0].name).toBe('Auth & Products');
      expect(modified.increments[0].features).toHaveLength(2);
    });

    it('should remove increments', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
        createIncrement('0002-products', 'Products', [createFeature('products', 'medium')]),
      ]);

      const modified = applyPlanModification(plan, {
        type: 'remove',
        incrementIds: ['0002-products'],
      });

      expect(modified.increments).toHaveLength(1);
      expect(modified.increments[0].id).toBe('0001-auth');
    });

    it('should reorder increments', () => {
      const plan = createPlan([
        createIncrement('0001-auth', 'Authentication', [createFeature('auth', 'complex')]),
        createIncrement('0002-products', 'Products', [createFeature('products', 'medium')]),
        createIncrement('0003-checkout', 'Checkout', [createFeature('checkout', 'complex')]),
      ]);

      const modified = applyPlanModification(plan, {
        type: 'reorder',
        incrementIds: ['0003-checkout', '0001-auth', '0002-products'],
      });

      expect(modified.increments[0].id).toBe('0003-checkout');
      expect(modified.increments[1].id).toBe('0001-auth');
      expect(modified.increments[2].id).toBe('0002-products');
    });
  });
});
