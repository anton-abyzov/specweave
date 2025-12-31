/**
 * Tests for increment-planner module
 */

import { describe, it, expect } from 'vitest';
import { planIncrements, type IncrementPlan } from '../../../../src/core/auto/increment-planner.js';
import type { Feature } from '../../../../src/core/auto/prompt-chunker.js';

describe('increment-planner', () => {
  describe('planIncrements', () => {
    it('should create single increment for simple features', () => {
      const features: Feature[] = [
        {
          name: 'login',
          description: 'login form',
          complexity: 'simple',
          estimatedTasks: 3,
          dependencies: [],
          keywords: ['login'],
        },
        {
          name: 'signup',
          description: 'signup form',
          complexity: 'simple',
          estimatedTasks: 4,
          dependencies: [],
          keywords: ['signup'],
        },
      ];

      const plan = planIncrements(features);

      expect(plan.increments).toHaveLength(1);
      expect(plan.increments[0].estimatedTasks).toBe(7);
      expect(plan.totalFeatures).toBe(2);
      expect(plan.totalTasks).toBe(7);
    });

    it('should split into multiple increments when exceeding max tasks', () => {
      const features: Feature[] = [
        {
          name: 'auth',
          description: 'authentication',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: [],
          keywords: ['auth'],
        },
        {
          name: 'products',
          description: 'product catalog',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: ['auth'],
          keywords: ['products'],
        },
        {
          name: 'cart',
          description: 'shopping cart',
          complexity: 'medium',
          estimatedTasks: 7,
          dependencies: ['auth', 'products'],
          keywords: ['cart'],
        },
      ];

      const plan = planIncrements(features);

      // Should create 2-3 increments (auth alone, products+cart if they fit)
      expect(plan.increments.length).toBeGreaterThanOrEqual(2);

      // No increment should exceed 15 tasks
      for (const increment of plan.increments) {
        expect(increment.estimatedTasks).toBeLessThanOrEqual(15);
      }
    });

    it('should respect feature dependencies in increment order', () => {
      const features: Feature[] = [
        {
          name: 'checkout',
          description: 'checkout flow',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: ['cart', 'auth'],
          keywords: ['checkout'],
        },
        {
          name: 'auth',
          description: 'authentication',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: [],
          keywords: ['auth'],
        },
        {
          name: 'cart',
          description: 'shopping cart',
          complexity: 'medium',
          estimatedTasks: 7,
          dependencies: ['auth'],
          keywords: ['cart'],
        },
      ];

      const plan = planIncrements(features);

      // Auth should come first (no dependencies)
      const authIncrement = plan.increments.find((inc) =>
        inc.features.some((f) => f.name === 'auth')
      );
      const checkoutIncrement = plan.increments.find((inc) =>
        inc.features.some((f) => f.name === 'checkout')
      );

      expect(authIncrement).toBeDefined();
      expect(checkoutIncrement).toBeDefined();
      expect(authIncrement!.priority).toBeLessThan(checkoutIncrement!.priority);
    });

    it('should identify dependencies between increments', () => {
      const features: Feature[] = [
        {
          name: 'auth',
          description: 'authentication',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: [],
          keywords: ['auth'],
        },
        {
          name: 'products',
          description: 'product catalog',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: ['auth'],
          keywords: ['products'],
        },
      ];

      const plan = planIncrements(features);

      if (plan.increments.length > 1) {
        const productIncrement = plan.increments.find((inc) =>
          inc.features.some((f) => f.name === 'products')
        );

        // Product increment should depend on auth increment
        expect(productIncrement?.dependencies.length).toBeGreaterThan(0);
      }
    });

    it('should generate readable increment names', () => {
      const features: Feature[] = [
        {
          name: 'user-auth',
          description: 'user authentication',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: [],
          keywords: ['auth'],
        },
      ];

      const plan = planIncrements(features);

      expect(plan.increments[0].name).toMatch(/auth/i);
      expect(plan.increments[0].id).toMatch(/^0001-/);
    });

    it('should estimate duration correctly', () => {
      const features: Feature[] = [
        {
          name: 'simple-feature',
          description: 'simple feature',
          complexity: 'simple',
          estimatedTasks: 3,
          dependencies: [],
          keywords: ['simple'],
        },
      ];

      const plan = planIncrements(features);

      expect(plan.estimatedDuration).toBeDefined();
      expect(typeof plan.estimatedDuration).toBe('string');
    });

    it('should handle single feature', () => {
      const features: Feature[] = [
        {
          name: 'login',
          description: 'login form',
          complexity: 'simple',
          estimatedTasks: 5,
          dependencies: [],
          keywords: ['login'],
        },
      ];

      const plan = planIncrements(features);

      expect(plan.increments).toHaveLength(1);
      expect(plan.increments[0].features).toHaveLength(1);
    });

    it('should throw error for empty features array', () => {
      expect(() => planIncrements([])).toThrow('No features provided');
    });

    it('should prefer single deliverable per increment', () => {
      const features: Feature[] = [
        {
          name: 'auth',
          description: 'authentication',
          complexity: 'complex',
          estimatedTasks: 10,
          dependencies: [],
          keywords: ['auth'],
        },
        {
          name: 'products',
          description: 'products',
          complexity: 'medium',
          estimatedTasks: 7,
          dependencies: ['auth'],
          keywords: ['products'],
        },
        {
          name: 'checkout',
          description: 'checkout',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: ['auth', 'products'],
          keywords: ['checkout'],
        },
      ];

      const plan = planIncrements(features);

      // Each increment should ideally have distinct deliverable
      expect(plan.increments.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate correct totals', () => {
      const features: Feature[] = [
        {
          name: 'feature-1',
          description: 'f1',
          complexity: 'simple',
          estimatedTasks: 5,
          dependencies: [],
          keywords: [],
        },
        {
          name: 'feature-2',
          description: 'f2',
          complexity: 'medium',
          estimatedTasks: 7,
          dependencies: [],
          keywords: [],
        },
        {
          name: 'feature-3',
          description: 'f3',
          complexity: 'complex',
          estimatedTasks: 12,
          dependencies: [],
          keywords: [],
        },
      ];

      const plan = planIncrements(features);

      expect(plan.totalFeatures).toBe(3);
      expect(plan.totalTasks).toBe(24);
    });
  });
});
