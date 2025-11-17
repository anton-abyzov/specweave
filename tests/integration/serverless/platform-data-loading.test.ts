import { describe, it, expect } from 'vitest';
import { PlatformDataLoader } from '../../../src/core/serverless/platform-data-loader';

describe('Platform Data Loading Integration', () => {
  let loader: PlatformDataLoader;

  beforeEach(() => {
    loader = new PlatformDataLoader();
  });

  describe('testLoadAllPlatforms', () => {
    it('should load all 5 platforms successfully', async () => {
      const platforms = await loader.loadAll();

      expect(platforms).toBeDefined();
      expect(platforms.length).toBe(5);

      const platformIds = platforms.map(p => p.id);
      expect(platformIds).toContain('aws-lambda');
      expect(platformIds).toContain('azure-functions');
      expect(platformIds).toContain('gcp-cloud-functions');
      expect(platformIds).toContain('firebase');
      expect(platformIds).toContain('supabase');
    });
  });

  describe('testQueryByPricing', () => {
    it('should filter platforms by free tier limits', async () => {
      const platforms = await loader.loadAll();

      // Find platforms with at least 1M free requests per month
      const generousFreeTier = platforms.filter(p => 
        p.pricing.freeTier.requests >= 1000000
      );

      expect(generousFreeTier.length).toBeGreaterThan(0);

      // AWS Lambda should have generous free tier (1M requests/month)
      const awsLambda = generousFreeTier.find(p => p.id === 'aws-lambda');
      expect(awsLambda).toBeDefined();
    });
  });

  describe('testQueryByFeatures', () => {
    it('should filter platforms by runtime support', async () => {
      const platforms = await loader.loadAll();

      // Find platforms that support Node.js or JavaScript/TypeScript
      const jsPlatforms = platforms.filter(p =>
        p.features.runtimes.some(r =>
          r.toLowerCase().includes('node') ||
          r.toLowerCase().includes('javascript') ||
          r.toLowerCase().includes('typescript')
        )
      );

      expect(jsPlatforms.length).toBe(5); // All platforms should support JS/TS

      // Find platforms that support Python
      const pythonPlatforms = platforms.filter(p =>
        p.features.runtimes.some(r => r.toLowerCase().includes('python'))
      );

      expect(pythonPlatforms.length).toBeGreaterThanOrEqual(3); // At least AWS, Azure, GCP
    });
  });

  describe('testLoadById', () => {
    it('should load a specific platform by ID', async () => {
      const platform = await loader.loadById('aws-lambda');

      expect(platform).toBeDefined();
      expect(platform?.id).toBe('aws-lambda');
      expect(platform?.name).toBe('AWS Lambda');
    });

    it('should return undefined for unknown platform ID', async () => {
      const platform = await loader.loadById('unknown-platform');

      expect(platform).toBeUndefined();
    });
  });

  describe('testGetAllPlatforms', () => {
    it('should return all loaded platforms', async () => {
      await loader.loadAll();
      const platforms = loader.getAllPlatforms();

      expect(platforms.length).toBe(5);
    });
  });
});
