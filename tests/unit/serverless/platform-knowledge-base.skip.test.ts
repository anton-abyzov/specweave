import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('Platform Knowledge Base', () => {
  let schema: any;
  let platforms: any[];
  const ajv = new Ajv();
  addFormats(ajv); // Add date format support

  beforeAll(() => {
    // Load schema
    const schemaPath = path.join(__dirname, '../../../plugins/specweave/knowledge-base/serverless/schema.json');
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Load all platform data
    const platformsDir = path.join(__dirname, '../../../plugins/specweave/knowledge-base/serverless/platforms');
    const platformFiles = ['aws-lambda.json', 'azure-functions.json', 'gcp-cloud-functions.json', 'firebase.json', 'supabase.json'];

    platforms = platformFiles.map(file => {
      const filePath = path.join(platformsDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
  });

  describe('testSchemaValidation', () => {
    it('should validate all platforms against schema', () => {
      const validate = ajv.compile(schema);

      platforms.forEach(platform => {
        const valid = validate(platform);
        expect(valid).toBe(true);
        if (!valid) {
          console.error('Validation errors for', platform.id, ':', validate.errors);
        }
      });
    });

    it('should have all required fields in schema', () => {
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('pricing');
      expect(schema.required).toContain('features');
      expect(schema.required).toContain('ecosystem');
      expect(schema.required).toContain('lockIn');
      expect(schema.required).toContain('lastVerified');
    });
  });

  describe('testDataFreshness', () => {
    it('should have lastVerified date in each platform', () => {
      platforms.forEach(platform => {
        expect(platform.lastVerified).toBeDefined();
        expect(typeof platform.lastVerified).toBe('string');

        // Validate date format (YYYY-MM-DD)
        expect(platform.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Validate date is parseable
        const date = new Date(platform.lastVerified);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });

    it('should warn if lastVerified is more than 30 days old', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      platforms.forEach(platform => {
        const lastVerifiedDate = new Date(platform.lastVerified);
        if (lastVerifiedDate < thirtyDaysAgo) {
          console.warn(`⚠️  Platform ${platform.id} data is stale (last verified: ${platform.lastVerified})`);
        }
      });
    });
  });

  describe('testPricingDataStructure', () => {
    it('should have free tier pricing data', () => {
      platforms.forEach(platform => {
        expect(platform.pricing.freeTier).toBeDefined();
        expect(platform.pricing.freeTier.requests).toBeDefined();
        expect(platform.pricing.freeTier.computeGbSeconds).toBeDefined();
        expect(platform.pricing.freeTier.dataTransferGb).toBeDefined();
      });
    });

    it('should have pay-as-you-go pricing data', () => {
      platforms.forEach(platform => {
        expect(platform.pricing.payAsYouGo).toBeDefined();
        expect(platform.pricing.payAsYouGo.requestsPer1M).toBeDefined();
        expect(platform.pricing.payAsYouGo.computePerGbSecond).toBeDefined();
        expect(platform.pricing.payAsYouGo.dataTransferPerGb).toBeDefined();
      });
    });
  });

  describe('testFeatureComparison', () => {
    it('should have runtime support data', () => {
      platforms.forEach(platform => {
        expect(platform.features.runtimes).toBeDefined();
        expect(Array.isArray(platform.features.runtimes)).toBe(true);
        expect(platform.features.runtimes.length).toBeGreaterThan(0);
      });
    });

    it('should have cold start time data', () => {
      platforms.forEach(platform => {
        expect(platform.features.coldStartMs).toBeDefined();
        expect(typeof platform.features.coldStartMs).toBe('number');
        expect(platform.features.coldStartMs).toBeGreaterThan(0);
      });
    });

    it('should have max execution duration data', () => {
      platforms.forEach(platform => {
        expect(platform.features.maxExecutionMinutes).toBeDefined();
        expect(typeof platform.features.maxExecutionMinutes).toBe('number');
        expect(platform.features.maxExecutionMinutes).toBeGreaterThan(0);
      });
    });
  });

  describe('testEcosystemData', () => {
    it('should have integrations list', () => {
      platforms.forEach(platform => {
        expect(platform.ecosystem.integrations).toBeDefined();
        expect(Array.isArray(platform.ecosystem.integrations)).toBe(true);
      });
    });

    it('should have SDKs list', () => {
      platforms.forEach(platform => {
        expect(platform.ecosystem.sdks).toBeDefined();
        expect(Array.isArray(platform.ecosystem.sdks)).toBe(true);
        expect(platform.ecosystem.sdks.length).toBeGreaterThan(0);
      });
    });

    it('should have community size indicator', () => {
      platforms.forEach(platform => {
        expect(platform.ecosystem.communitySize).toBeDefined();
        expect(['small', 'medium', 'large', 'very-large']).toContain(platform.ecosystem.communitySize);
      });
    });
  });

  describe('testLockInRiskAssessment', () => {
    it('should have portability score', () => {
      platforms.forEach(platform => {
        expect(platform.lockIn.portability).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(platform.lockIn.portability);
      });
    });

    it('should have migration complexity', () => {
      platforms.forEach(platform => {
        expect(platform.lockIn.migrationComplexity).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(platform.lockIn.migrationComplexity);
      });
    });

    it('should have vendor lock-in description', () => {
      platforms.forEach(platform => {
        expect(platform.lockIn.vendorLockIn).toBeDefined();
        expect(typeof platform.lockIn.vendorLockIn).toBe('string');
        expect(platform.lockIn.vendorLockIn.length).toBeGreaterThan(0);
      });
    });
  });
});
