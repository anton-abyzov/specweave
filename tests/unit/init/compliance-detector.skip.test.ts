import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for ComplianceDetector
 */

import { describe, it, expect } from 'vitest';
import { detectCompliance } from '../../../src/init/compliance/ComplianceDetector.js.js';

describe('ComplianceDetector', () => {
  describe('detectCompliance', () => {
    it('should detect HIPAA for healthcare data in US', () => {
      const result = detectCompliance(['healthcare'], ['US']);

      const hipaa = result.standards.find((s: any) => s.id === 'HIPAA');
      expect(hipaa).toBeDefined();
      expect(hipaa?.name).toContain('Health Insurance');
      expect(result.teamRequirements).toContain('auth-team');
      expect(result.teamRequirements).toContain('data-team');
    });

    it('should detect PCI-DSS for payment data globally', () => {
      const result = detectCompliance(['payment'], ['global']);

      const pci = result.standards.find((s: any) => s.id === 'PCI-DSS');
      expect(pci).toBeDefined();
      expect(result.teamRequirements).toContain('payments-team');
    });

    it('should detect GDPR for personal data in EU', () => {
      const result = detectCompliance(['personal'], ['EU']);

      const gdpr = result.standards.find((s: any) => s.id === 'GDPR');
      expect(gdpr).toBeDefined();
      expect(result.teamRequirements).toContain('dpo');
      expect(result.teamRequirements).toContain('privacy-engineering');
    });

    it('should detect FedRAMP for government data in US', () => {
      const result = detectCompliance(['government'], ['US']);

      const fedramp = result.standards.find((s: any) => s.id === 'FedRAMP');
      expect(fedramp).toBeDefined();
      expect(result.teamRequirements).toContain('ciso');
      expect(result.teamRequirements).toContain('devsecops-team');
    });

    it('should detect FERPA for student data in US', () => {
      const result = detectCompliance(['student'], ['US']);

      const ferpa = result.standards.find((s: any) => s.id === 'FERPA');
      expect(ferpa).toBeDefined();
    });

    it('should detect COPPA for children data in US', () => {
      const result = detectCompliance(['children'], ['US']);

      const coppa = result.standards.find((s: any) => s.id === 'COPPA');
      expect(coppa).toBeDefined();
    });

    it('should detect multiple standards for healthcare + payment', () => {
      const result = detectCompliance(['healthcare', 'payment'], ['US']);

      expect(result.standards.length).toBeGreaterThan(1);
      expect(result.standards.some((s: any) => s.id === 'HIPAA')).toBe(true);
      expect(result.standards.some((s: any) => s.id === 'PCI-DSS')).toBe(true);
    });

    it('should return no standards for non-sensitive data', () => {
      const result = detectCompliance([], ['US']);

      expect(result.standards).toEqual([]);
      expect(result.teamRequirements).toEqual([]);
      expect(result.totalCostEstimate).toBe('$0/month');
    });

    it('should generate recommendations for HIPAA', () => {
      const result = detectCompliance(['healthcare'], ['US']);

      expect(result.recommendations.length).toBeGreaterThan(0);
      const hasHipaaRecommendation = result.recommendations.some((r: any) =>
        r.includes('HIPAA')
      );
      expect(hasHipaaRecommendation).toBe(true);
    });

    it('should recommend Stripe for PCI-DSS', () => {
      const result = detectCompliance(['payment'], ['global']);

      const hasStripeRecommendation = result.recommendations.some((r: any) =>
        r.toLowerCase().includes('stripe') || r.toLowerCase().includes('paypal')
      );
      expect(hasStripeRecommendation).toBe(true);
    });

    it('should calculate cost estimate', () => {
      const result = detectCompliance(['healthcare', 'payment'], ['US']);

      expect(result.totalCostEstimate).toBeDefined();
      expect(result.totalCostEstimate).toMatch(/\$\d+/);
    });
  });
});
