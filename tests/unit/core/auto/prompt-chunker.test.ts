/**
 * Tests for prompt-chunker module
 */

import { describe, it, expect } from 'vitest';
import { extractFeatures, analyzePrompt, type Feature } from '../../../../src/core/auto/prompt-chunker.js';

describe('prompt-chunker', () => {
  describe('extractFeatures', () => {
    it('should extract features from e-commerce prompt', () => {
      const prompt = 'Build e-commerce with auth, products, cart, checkout';
      const features = extractFeatures(prompt);

      expect(features).toHaveLength(4);
      expect(features.map((f) => f.name)).toContain('auth');
      expect(features.map((f) => f.name)).toContain('products');
      expect(features.map((f) => f.name)).toContain('cart');
      expect(features.map((f) => f.name)).toContain('checkout');
    });

    it('should handle AND separator', () => {
      const prompt = 'Add authentication and user profiles';
      const features = extractFeatures(prompt);

      expect(features).toHaveLength(2);
      expect(features[0].name).toMatch(/auth/);
      expect(features[1].name).toMatch(/user/);
    });

    it('should handle comma separator', () => {
      const prompt = 'Create forms, validation, error handling';
      const features = extractFeatures(prompt);

      expect(features).toHaveLength(3);
    });

    it('should estimate complexity correctly', () => {
      const prompt = 'Add login button and payment processing';
      const features = extractFeatures(prompt);

      const buttonFeature = features.find((f) => f.keywords.includes('button'));
      const paymentFeature = features.find((f) => f.keywords.includes('payment'));

      expect(buttonFeature?.complexity).toBe('simple');
      expect(paymentFeature?.complexity).toBe('complex');
    });

    it('should identify auth as foundational', () => {
      const prompt = 'Build app with auth, products, checkout';
      const features = extractFeatures(prompt);

      const authFeature = features.find((f) => f.name.includes('auth'));
      const productFeature = features.find((f) => f.name.includes('product'));

      expect(authFeature?.dependencies).toHaveLength(0);
      expect(productFeature?.dependencies).toContain(authFeature!.name);
    });

    it('should handle payment dependencies', () => {
      const prompt = 'Create products, cart, and checkout flow';
      const features = extractFeatures(prompt);

      const checkoutFeature = features.find((f) => f.name.includes('checkout'));
      const productFeature = features.find((f) => f.name.includes('product'));
      const cartFeature = features.find((f) => f.name.includes('cart'));

      // Checkout should depend on products/cart
      expect(checkoutFeature?.dependencies).toContain(productFeature!.name);
      expect(checkoutFeature?.dependencies).toContain(cartFeature!.name);
    });

    it('should skip tiny fragments', () => {
      const prompt = 'Build app with a, b, and meaningful feature';
      const features = extractFeatures(prompt);

      // Should skip 'a' and 'b' but include 'meaningful feature'
      expect(features.length).toBeLessThan(4);
    });

    it('should normalize whitespace', () => {
      const prompt = 'Build   app\nwith   auth\n  and    products';
      const features = extractFeatures(prompt);

      expect(features).toHaveLength(2); // auth, products (skip 'app')
    });
  });

  describe('analyzePrompt', () => {
    it('should return full analysis', () => {
      const prompt = 'Build e-commerce with auth, products, cart, checkout';
      const analysis = analyzePrompt(prompt);

      expect(analysis.features).toHaveLength(4);
      expect(analysis.totalComplexity).toBeGreaterThan(0);
      expect(analysis.recommendedIncrements).toBeGreaterThan(0);
    });

    it('should recommend 1 increment for simple prompts', () => {
      const prompt = 'Add login button';
      const analysis = analyzePrompt(prompt);

      expect(analysis.recommendedIncrements).toBe(1);
    });

    it('should recommend multiple increments for complex prompts', () => {
      const prompt =
        'Build e-commerce with auth, user profiles, products, categories, cart, wishlist, checkout, payment, order history, admin dashboard';
      const analysis = analyzePrompt(prompt);

      expect(analysis.recommendedIncrements).toBeGreaterThanOrEqual(2);
    });

    it('should calculate total complexity correctly', () => {
      const prompt = 'Add simple button and complex payment';
      const analysis = analyzePrompt(prompt);

      // Simple = ~3 tasks, complex = ~12 tasks
      expect(analysis.totalComplexity).toBeGreaterThan(10);
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompt', () => {
      const features = extractFeatures('');
      expect(features).toHaveLength(0);
    });

    it('should handle single word prompt', () => {
      const features = extractFeatures('auth');
      expect(features).toHaveLength(1);
      expect(features[0].name).toBe('auth');
    });

    it('should handle prompt with only verbs', () => {
      const features = extractFeatures('Build create implement');
      // Should extract something or return empty
      expect(Array.isArray(features)).toBe(true);
    });

    it('should handle special characters', () => {
      const prompt = 'Build API endpoints (REST + GraphQL)';
      const features = extractFeatures(prompt);

      expect(features.length).toBeGreaterThan(0);
    });
  });
});
