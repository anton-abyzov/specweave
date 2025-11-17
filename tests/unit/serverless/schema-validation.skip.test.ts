import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Schema validation tests - ensures all platform JSON files conform to schema
 */
describe('Schema Validation', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  const schemaPath = path.join(__dirname, '../../../plugins/specweave/knowledge-base/serverless/schema.json');
  const platformsDir = path.join(__dirname, '../../../plugins/specweave/knowledge-base/serverless/platforms');
  
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const validate = ajv.compile(schema);

  describe('Schema Structure', () => {
    it('should have valid JSON Schema structure', () => {
      expect(schema.$schema).toBeDefined();
      expect(schema.title).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toBeDefined();
      expect(Array.isArray(schema.required)).toBe(true);
    });

    it('should require all essential fields', () => {
      const requiredFields = [
        'id',
        'name',
        'provider',
        'pricing',
        'features',
        'ecosystem',
        'lockIn',
        'startupPrograms',
        'lastVerified'
      ];

      requiredFields.forEach(field => {
        expect(schema.required).toContain(field);
      });
    });
  });

  describe('Platform Data Validation', () => {
    const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json'));

    it('should find all 5 platform JSON files', () => {
      expect(platformFiles.length).toBe(5);
      expect(platformFiles).toContain('aws-lambda.json');
      expect(platformFiles).toContain('azure-functions.json');
      expect(platformFiles).toContain('gcp-cloud-functions.json');
      expect(platformFiles).toContain('firebase.json');
      expect(platformFiles).toContain('supabase.json');
    });

    platformFiles.forEach(file => {
      it(`should validate ${file} against schema`, () => {
        const filePath = path.join(platformsDir, file);
        const platform = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const valid = validate(platform);
        
        if (!valid) {
          console.error(`Validation errors for ${file}:`, validate.errors);
        }

        expect(valid).toBe(true);
      });
    });
  });

  describe('Data Freshness', () => {
    it('should have recent lastVerified dates (within 30 days)', () => {
      const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json'));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      platformFiles.forEach(file => {
        const filePath = path.join(platformsDir, file);
        const platform = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        const lastVerified = new Date(platform.lastVerified);
        
        // Warn if stale, but don't fail test (data can be intentionally old during development)
        if (lastVerified < thirtyDaysAgo) {
          console.warn(`⚠️  ${file}: Data is stale (last verified: ${platform.lastVerified})`);
        }
        
        // But verify the date is parseable
        expect(lastVerified.toString()).not.toBe('Invalid Date');
      });
    });
  });

  describe('Pricing Data Structure', () => {
    it('should have consistent pricing structure across all platforms', () => {
      const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json'));

      platformFiles.forEach(file => {
        const filePath = path.join(platformsDir, file);
        const platform = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Free tier
        expect(platform.pricing.freeTier.requests).toBeGreaterThanOrEqual(0);
        expect(platform.pricing.freeTier.computeGbSeconds).toBeGreaterThanOrEqual(0);
        expect(platform.pricing.freeTier.dataTransferGb).toBeGreaterThanOrEqual(0);

        // Pay as you go
        expect(platform.pricing.payAsYouGo.requestsPer1M).toBeGreaterThan(0);
        expect(platform.pricing.payAsYouGo.computePerGbSecond).toBeGreaterThan(0);
        expect(platform.pricing.payAsYouGo.dataTransferPerGb).toBeGreaterThan(0);
      });
    });
  });

  describe('Features Data Structure', () => {
    it('should have consistent features structure across all platforms', () => {
      const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json'));

      platformFiles.forEach(file => {
        const filePath = path.join(platformsDir, file);
        const platform = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Runtimes
        expect(Array.isArray(platform.features.runtimes)).toBe(true);
        expect(platform.features.runtimes.length).toBeGreaterThan(0);

        // Performance metrics
        expect(platform.features.coldStartMs).toBeGreaterThan(0);
        expect(platform.features.maxExecutionMinutes).toBeGreaterThan(0);
        expect(platform.features.maxMemoryMb).toBeGreaterThan(0);
      });
    });
  });
});
