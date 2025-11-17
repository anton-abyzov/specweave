/**
 * Unit tests for ServerlessSavingsCalculator
 *
 * Tests T-025: Serverless cost savings calculation
 * - $1,520/month total potential savings across 5 use cases
 * - Detailed trade-off analysis for each use case
 * - Confidence-based recommendations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ServerlessSavingsCalculator,
  calculateTotalSavings,
  type ServerlessOption,
  type ServerlessSavingsAnalysis
} from '../../../src/init/team/ServerlessSavingsCalculator.js';

describe('ServerlessSavingsCalculator', () => {
  let calculator: ServerlessSavingsCalculator;

  beforeEach(() => {
    calculator = new ServerlessSavingsCalculator();
  });

  describe('getAllOptions', () => {
    it('should return all 5 serverless options', () => {
      const options = calculator.getAllOptions();

      expect(options).toHaveLength(5);

      const useCases = options.map(o => o.useCase);
      expect(useCases).toContain('Authentication');
      expect(useCases).toContain('File Uploads');
      expect(useCases).toContain('Image Processing');
      expect(useCases).toContain('Email Sending');
      expect(useCases).toContain('Background Jobs');
    });

    it('should have correct savings for each use case', () => {
      const options = calculator.getAllOptions();

      const auth = options.find(o => o.useCase === 'Authentication')!;
      const fileUploads = options.find(o => o.useCase === 'File Uploads')!;
      const imageProcessing = options.find(o => o.useCase === 'Image Processing')!;
      const email = options.find(o => o.useCase === 'Email Sending')!;
      const backgroundJobs = options.find(o => o.useCase === 'Background Jobs')!;

      expect(auth.savings).toBe(185);
      expect(fileUploads.savings).toBe(480);
      expect(imageProcessing.savings).toBe(490);
      expect(email.savings).toBe(85);
      expect(backgroundJobs.savings).toBe(280);

      // Total should be $1,520/month
      const totalSavings = auth.savings + fileUploads.savings + imageProcessing.savings +
        email.savings + backgroundJobs.savings;
      expect(totalSavings).toBe(1520);
    });

    it('should have all required fields for each option', () => {
      const options = calculator.getAllOptions();

      for (const option of options) {
        expect(option.useCase).toBeTruthy();
        expect(option.traditionalCost).toBeGreaterThan(0);
        expect(option.serverlessCost).toBeGreaterThan(0);
        expect(option.savings).toBeGreaterThan(0);
        expect(option.service).toBeTruthy();
        expect(option.tradeoffs).toBeInstanceOf(Array);
        expect(option.tradeoffs.length).toBeGreaterThan(0);
        expect(option.recommendedWhen).toBeInstanceOf(Array);
        expect(option.recommendedWhen.length).toBeGreaterThan(0);
        expect(option.notRecommendedWhen).toBeInstanceOf(Array);
        expect(option.notRecommendedWhen.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getOption', () => {
    it('should find option by exact use case name', () => {
      const auth = calculator.getOption('Authentication');
      expect(auth).toBeDefined();
      expect(auth?.useCase).toBe('Authentication');
    });

    it('should find option by normalized variations', () => {
      expect(calculator.getOption('auth')?.useCase).toBe('Authentication');
      expect(calculator.getOption('AUTH')?.useCase).toBe('Authentication');
      expect(calculator.getOption('login')?.useCase).toBe('Authentication');
      expect(calculator.getOption('user-auth')?.useCase).toBe('Authentication');

      expect(calculator.getOption('file-upload')?.useCase).toBe('File Uploads');
      expect(calculator.getOption('files')?.useCase).toBe('File Uploads');
      expect(calculator.getOption('storage')?.useCase).toBe('File Uploads');

      expect(calculator.getOption('images')?.useCase).toBe('Image Processing');
      expect(calculator.getOption('image-resize')?.useCase).toBe('Image Processing');

      expect(calculator.getOption('email')?.useCase).toBe('Email Sending');
      expect(calculator.getOption('notifications')?.useCase).toBe('Email Sending');

      expect(calculator.getOption('jobs')?.useCase).toBe('Background Jobs');
      expect(calculator.getOption('queue')?.useCase).toBe('Background Jobs');
      expect(calculator.getOption('workers')?.useCase).toBe('Background Jobs');
    });

    it('should return undefined for unknown use case', () => {
      const unknown = calculator.getOption('unknown-service');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getSavings', () => {
    it('should return savings for known use case', () => {
      expect(calculator.getSavings('auth')).toBe(185);
      expect(calculator.getSavings('file-uploads')).toBe(480);
      expect(calculator.getSavings('image-processing')).toBe(490);
      expect(calculator.getSavings('email')).toBe(85);
      expect(calculator.getSavings('background-jobs')).toBe(280);
    });

    it('should return 0 for unknown use case', () => {
      expect(calculator.getSavings('unknown')).toBe(0);
    });
  });

  describe('calculateSavings', () => {
    it('should calculate total savings for single use case', () => {
      const analysis = calculator.calculateSavings(['auth']);

      expect(analysis.totalSavings).toBe(185);
      expect(analysis.breakdown).toHaveLength(1);
      expect(analysis.breakdown[0].useCase).toBe('Authentication');
    });

    it('should calculate total savings for multiple use cases', () => {
      const analysis = calculator.calculateSavings(['auth', 'file-uploads', 'email']);

      expect(analysis.totalSavings).toBe(185 + 480 + 85); // 750
      expect(analysis.breakdown).toHaveLength(3);

      const useCases = analysis.breakdown.map(b => b.useCase);
      expect(useCases).toContain('Authentication');
      expect(useCases).toContain('File Uploads');
      expect(useCases).toContain('Email Sending');
    });

    it('should calculate total savings for all use cases ($1,520)', () => {
      const analysis = calculator.calculateSavings([
        'auth',
        'file-uploads',
        'image-processing',
        'email',
        'background-jobs'
      ]);

      expect(analysis.totalSavings).toBe(1520);
      expect(analysis.breakdown).toHaveLength(5);
    });

    it('should handle duplicate use cases (automatically deduped)', () => {
      const analysis = calculator.calculateSavings(['auth', 'auth']);

      // Implementation automatically dedupes (returns unique options only)
      expect(analysis.breakdown).toHaveLength(1);
      expect(analysis.totalSavings).toBe(185);
    });

    it('should normalize use case names', () => {
      const analysis = calculator.calculateSavings(['AUTH', 'File Upload', 'notifications']);

      expect(analysis.totalSavings).toBe(185 + 480 + 85);
      expect(analysis.breakdown).toHaveLength(3);
    });

    it('should ignore unknown use cases', () => {
      const analysis = calculator.calculateSavings(['auth', 'unknown-service', 'email']);

      expect(analysis.totalSavings).toBe(185 + 85);
      expect(analysis.breakdown).toHaveLength(2);
    });
  });

  describe('Recommendations', () => {
    it('should recommend serverless for high savings (>= $500)', () => {
      const analysis = calculator.calculateSavings(['file-uploads', 'image-processing']);

      expect(analysis.totalSavings).toBeGreaterThanOrEqual(500);
      expect(analysis.recommendation).toBe('serverless');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.9);
      expect(analysis.rationale).toContain('saves');
      expect(analysis.rationale).toContain('Significant cost reduction');
    });

    it('should recommend hybrid for moderate savings ($200-500)', () => {
      const analysis = calculator.calculateSavings(['file-uploads']);

      expect(analysis.totalSavings).toBeGreaterThanOrEqual(200);
      expect(analysis.totalSavings).toBeLessThan(500);
      expect(analysis.recommendation).toBe('hybrid');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.85);
      expect(analysis.rationale).toContain('hybrid');
    });

    it('should recommend hybrid for low savings ($100-200)', () => {
      const analysis = calculator.calculateSavings(['auth']);

      expect(analysis.totalSavings).toBeGreaterThanOrEqual(100);
      expect(analysis.totalSavings).toBeLessThan(200);
      expect(analysis.recommendation).toBe('hybrid');
      expect(analysis.confidence).toBeLessThan(0.85);
      expect(analysis.rationale).toContain('Modest savings');
    });

    it('should recommend traditional for minimal savings (< $100)', () => {
      const analysis = calculator.calculateSavings(['email']);

      expect(analysis.totalSavings).toBeLessThan(100);
      expect(analysis.recommendation).toBe('traditional');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.7);
      expect(analysis.rationale).toContain('Minimal savings');
    });

    it('should recommend traditional for no applicable use cases', () => {
      const analysis = calculator.calculateSavings([]);

      expect(analysis.totalSavings).toBe(0);
      expect(analysis.recommendation).toBe('traditional');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.8);
      expect(analysis.rationale).toContain('No serverless-optimized use cases');
    });

    it('should recommend serverless for all use cases ($1,520 savings)', () => {
      const analysis = calculator.calculateSavings([
        'auth',
        'file-uploads',
        'image-processing',
        'email',
        'background-jobs'
      ]);

      expect(analysis.totalSavings).toBe(1520);
      expect(analysis.recommendation).toBe('serverless');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Serverless Options Validation', () => {
    it('should have AWS Cognito for authentication', () => {
      const auth = calculator.getOption('auth')!;

      expect(auth.service).toContain('AWS Cognito');
      expect(auth.alternatives).toContain('Auth0');
      expect(auth.alternatives).toContain('Firebase Auth');
    });

    it('should have S3 + Lambda for file uploads', () => {
      const fileUploads = calculator.getOption('file-uploads')!;

      expect(fileUploads.service).toContain('S3');
      expect(fileUploads.service).toContain('Lambda');
      expect(fileUploads.alternatives).toContain('Cloudflare R2 + Workers');
    });

    it('should have Lambda + Cloudinary for image processing', () => {
      const imageProcessing = calculator.getOption('image-processing')!;

      expect(imageProcessing.service).toContain('Lambda');
      expect(imageProcessing.service).toContain('Cloudinary');
      expect(imageProcessing.alternatives).toContain('Imgix');
      expect(imageProcessing.savings).toBe(490);
    });

    it('should have SendGrid/SES for email', () => {
      const email = calculator.getOption('email')!;

      expect(email.service).toContain('SendGrid');
      expect(email.service).toContain('SES');
      expect(email.alternatives).toContain('Mailgun');
      expect(email.alternatives).toContain('Postmark');
      expect(email.savings).toBe(85);
    });

    it('should have Lambda + SQS for background jobs', () => {
      const backgroundJobs = calculator.getOption('background-jobs')!;

      expect(backgroundJobs.service).toContain('Lambda');
      expect(backgroundJobs.service).toContain('SQS');
      expect(backgroundJobs.savings).toBe(280);
    });
  });

  describe('Trade-offs', () => {
    it('should have trade-offs for each option', () => {
      const options = calculator.getAllOptions();

      for (const option of options) {
        expect(option.tradeoffs.length).toBeGreaterThan(0);
        expect(option.tradeoffs.some(t => t.length > 10)).toBe(true); // Non-empty tradeoffs
      }
    });

    it('should have recommended and not-recommended scenarios', () => {
      const options = calculator.getAllOptions();

      for (const option of options) {
        expect(option.recommendedWhen.length).toBeGreaterThan(0);
        expect(option.notRecommendedWhen.length).toBeGreaterThan(0);
      }
    });
  });

  describe('formatReport', () => {
    it('should format empty analysis', () => {
      const analysis = calculator.calculateSavings([]);
      const report = calculator.formatReport(analysis);

      expect(report).toContain('# Serverless Cost Savings Analysis');
      expect(report).toContain('**Total Potential Savings**: $0/month');
      expect(report).toContain('**Recommendation**: TRADITIONAL');
    });

    it('should format single use case analysis', () => {
      const analysis = calculator.calculateSavings(['auth']);
      const report = calculator.formatReport(analysis);

      expect(report).toContain('**Total Potential Savings**: $185/month');
      expect(report).toContain('### Authentication');
      expect(report).toContain('**Service**: AWS Cognito');
      expect(report).toContain('**Savings**: $185/month');
      expect(report).toContain('**Recommended When**:');
      expect(report).toContain('**NOT Recommended When**:');
      expect(report).toContain('**Trade-offs**:');
    });

    it('should format comprehensive analysis with all use cases', () => {
      const analysis = calculator.calculateSavings([
        'auth',
        'file-uploads',
        'image-processing',
        'email',
        'background-jobs'
      ]);
      const report = calculator.formatReport(analysis);

      expect(report).toContain('**Total Potential Savings**: $1520/month');
      expect(report).toContain('**Recommendation**: SERVERLESS');

      expect(report).toContain('### Authentication');
      expect(report).toContain('### File Uploads');
      expect(report).toContain('### Image Processing');
      expect(report).toContain('### Email Sending');
      expect(report).toContain('### Background Jobs');

      expect(report).toContain('AWS Cognito');
      expect(report).toContain('S3 + Lambda');
      expect(report).toContain('Lambda + Cloudinary');
      expect(report).toContain('SendGrid / AWS SES');
      expect(report).toContain('AWS Lambda + SQS');
    });

    it('should include alternatives in report', () => {
      const analysis = calculator.calculateSavings(['auth']);
      const report = calculator.formatReport(analysis);

      expect(report).toContain('Alternatives**: Auth0, Firebase Auth, Supabase Auth');
    });
  });

  describe('Quick Helper: calculateTotalSavings', () => {
    it('should calculate total savings quickly', () => {
      const total = calculateTotalSavings(['auth', 'file-uploads', 'email']);

      expect(total).toBe(185 + 480 + 85);
    });

    it('should return 0 for empty array', () => {
      const total = calculateTotalSavings([]);

      expect(total).toBe(0);
    });

    it('should handle all use cases', () => {
      const total = calculateTotalSavings([
        'auth',
        'file-uploads',
        'image-processing',
        'email',
        'background-jobs'
      ]);

      expect(total).toBe(1520);
    });
  });

  describe('Cost Validation', () => {
    it('should have traditional cost > serverless cost for all use cases', () => {
      const options = calculator.getAllOptions();

      for (const option of options) {
        expect(option.traditionalCost).toBeGreaterThan(option.serverlessCost);
        expect(option.savings).toBe(option.traditionalCost - option.serverlessCost);
      }
    });

    it('should have reasonable cost ranges', () => {
      const options = calculator.getAllOptions();

      for (const option of options) {
        // Traditional cost should be at least $100/month
        expect(option.traditionalCost).toBeGreaterThanOrEqual(100);

        // Serverless cost should be reasonable
        expect(option.serverlessCost).toBeGreaterThan(0);
        expect(option.serverlessCost).toBeLessThan(option.traditionalCost);

        // Savings should be meaningful
        expect(option.savings).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive use cases', () => {
      const analysis1 = calculator.calculateSavings(['AUTH', 'FILE-UPLOADS']);
      const analysis2 = calculator.calculateSavings(['auth', 'file-uploads']);

      expect(analysis1.totalSavings).toBe(analysis2.totalSavings);
    });

    it('should handle whitespace in use cases', () => {
      const analysis = calculator.calculateSavings([' auth ', '  file-uploads  ']);

      expect(analysis.totalSavings).toBe(185 + 480);
    });

    it('should handle unknown use cases gracefully', () => {
      const analysis = calculator.calculateSavings(['unknown1', 'unknown2', 'unknown3']);

      expect(analysis.totalSavings).toBe(0);
      expect(analysis.breakdown).toHaveLength(0);
      expect(analysis.recommendation).toBe('traditional');
    });
  });
});
