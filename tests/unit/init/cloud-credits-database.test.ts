import { describe, it, expect } from 'vitest';
import { CLOUD_CREDITS_DATABASE } from '../../../src/init/architecture/CloudCreditsDatabase.js';
import type { CloudCredit } from '../../../src/init/architecture/types.js';

/**
 * Unit tests for Cloud Credits Database
 *
 * Tests the cloud credit programs database to ensure all entries
 * have valid structure and reasonable values.
 */

describe('CloudCreditsDatabase', () => {
  describe('Database structure', () => {
    it('should have cloud credits entries', () => {
      expect(Array.isArray(CLOUD_CREDITS_DATABASE)).toBe(true);
      expect(CLOUD_CREDITS_DATABASE.length).toBeGreaterThan(0);
    });

    it('should have all required fields for each entry', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        expect(credit).toHaveProperty('provider');
        expect(credit).toHaveProperty('amount');
        expect(credit).toHaveProperty('duration');

        expect(typeof credit.provider).toBe('string');
        expect(typeof credit.amount).toBe('string');
        expect(typeof credit.duration).toBe('string');
      });
    });

    it('should have non-empty provider names', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        expect(credit.provider.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty amounts', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        expect(credit.amount.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty durations', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        expect(credit.duration.length).toBeGreaterThan(0);
      });
    });

    it('should have optional requirements field', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        if (credit.requirements) {
          expect(typeof credit.requirements).toBe('string');
        }
      });
    });

    it('should have optional URL field', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        if (credit.url) {
          expect(typeof credit.url).toBe('string');
          expect(credit.url).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe('AWS Activate programs', () => {
    it('should include AWS Activate Portfolio', () => {
      const awsPortfolio = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'AWS Activate (Portfolio)'
      );

      expect(awsPortfolio).toBeDefined();
      expect(awsPortfolio?.amount).toBe('$1,000');
      expect(awsPortfolio?.duration).toBe('12 months');
      expect(awsPortfolio?.requirements).toContain('Incubator');
    });

    it('should include AWS Activate Portfolio Plus', () => {
      const awsPortfolioPlus = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'AWS Activate (Portfolio Plus)'
      );

      expect(awsPortfolioPlus).toBeDefined();
      expect(awsPortfolioPlus?.amount).toBe('$5,000');
      expect(awsPortfolioPlus?.duration).toBe('12 months');
      expect(awsPortfolioPlus?.requirements).toContain('Y Combinator');
    });

    it('should include AWS Activate Founders', () => {
      const awsFounders = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'AWS Activate (Founders)'
      );

      expect(awsFounders).toBeDefined();
      expect(awsFounders?.amount).toBe('$100,000');
      expect(awsFounders?.duration).toBe('12 months');
      expect(awsFounders?.requirements).toContain('VC-backed');
      expect(awsFounders?.requirements).toContain('Series A+');
    });

    it('should have AWS Activate URL', () => {
      const awsCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('AWS Activate')
      );

      awsCredits.forEach((credit) => {
        expect(credit.url).toBe('https://aws.amazon.com/activate/');
      });
    });
  });

  describe('Azure for Startups programs', () => {
    it('should include Azure for Startups Standard', () => {
      const azureStandard = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'Azure for Startups (Standard)'
      );

      expect(azureStandard).toBeDefined();
      expect(azureStandard?.amount).toBe('$1,000');
      expect(azureStandard?.duration).toBe('90 days');
      expect(azureStandard?.requirements).toBe('Self-service signup');
    });

    it('should include Azure for Startups Founders Hub', () => {
      const azureFounders = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'Azure for Startups (Founders Hub)'
      );

      expect(azureFounders).toBeDefined();
      expect(azureFounders?.amount).toBe('$100,000');
      expect(azureFounders?.duration).toBe('180 days');
      expect(azureFounders?.requirements).toContain('VC-backed');
    });

    it('should have Azure for Startups URL', () => {
      const azureCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Azure for Startups')
      );

      azureCredits.forEach((credit) => {
        expect(credit.url).toContain('azure.microsoft.com');
      });
    });
  });

  describe('Google Cloud for Startups programs', () => {
    it('should include Google Cloud for Startups Standard', () => {
      const gcpStandard = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'Google Cloud for Startups (Standard)'
      );

      expect(gcpStandard).toBeDefined();
      expect(gcpStandard?.amount).toBe('$2,000');
      expect(gcpStandard?.duration).toBe('24 months');
      expect(gcpStandard?.requirements).toBe('Self-service signup');
    });

    it('should include Google Cloud for Startups Startup tier', () => {
      const gcpStartup = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'Google Cloud for Startups (Startup)'
      );

      expect(gcpStartup).toBeDefined();
      expect(gcpStartup?.amount).toBe('$100,000');
      expect(gcpStartup?.duration).toBe('24 months');
      expect(gcpStartup?.requirements).toContain('Series A');
    });

    it('should include Google Cloud for Startups Scale tier', () => {
      const gcpScale = CLOUD_CREDITS_DATABASE.find(
        (c) => c.provider === 'Google Cloud for Startups (Scale)'
      );

      expect(gcpScale).toBeDefined();
      expect(gcpScale?.amount).toBe('$350,000');
      expect(gcpScale?.duration).toBe('24 months');
      expect(gcpScale?.requirements).toContain('Series B+');
    });

    it('should have Google Cloud for Startups URL', () => {
      const gcpCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Google Cloud for Startups')
      );

      gcpCredits.forEach((credit) => {
        expect(credit.url).toBe('https://cloud.google.com/startup');
      });
    });
  });

  describe('Other providers', () => {
    it('should include Vercel Pro credits', () => {
      const vercel = CLOUD_CREDITS_DATABASE.find((c) =>
        c.provider.includes('Vercel Pro')
      );

      expect(vercel).toBeDefined();
      expect(vercel?.amount).toBe('$20/month');
      expect(vercel?.duration).toBe('6 months');
      expect(vercel?.requirements).toContain('Startup');
    });

    it('should include Supabase Pro credits', () => {
      const supabase = CLOUD_CREDITS_DATABASE.find((c) =>
        c.provider.includes('Supabase Pro')
      );

      expect(supabase).toBeDefined();
      expect(supabase?.amount).toBe('$25/month');
      expect(supabase?.duration).toBe('12 months');
      expect(supabase?.requirements).toContain('startup');
    });

    it('should include Stripe Atlas credits', () => {
      const stripe = CLOUD_CREDITS_DATABASE.find((c) =>
        c.provider.includes('Stripe Atlas')
      );

      expect(stripe).toBeDefined();
      expect(stripe?.amount).toBe('$5,000 payment processing');
      expect(stripe?.duration).toBe('12 months');
      expect(stripe?.requirements).toContain('Stripe Atlas');
    });
  });

  describe('Credit amount validation', () => {
    it('should have amounts in standard format', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        // Amount should contain $ or be a number with /month suffix
        const hasValidFormat =
          credit.amount.includes('$') ||
          credit.amount.includes('/month') ||
          !isNaN(parseInt(credit.amount));

        expect(hasValidFormat).toBe(true);
      });
    });

    it('should have at least 3 programs with $100K+ credits', () => {
      const highValuePrograms = CLOUD_CREDITS_DATABASE.filter((credit) => {
        const amount = credit.amount;
        return (
          amount.includes('$100,000') ||
          amount.includes('$350,000') ||
          (amount.includes('K') && parseInt(amount.replace(/[^\d]/g, '')) >= 100)
        );
      });

      expect(highValuePrograms.length).toBeGreaterThanOrEqual(3);
    });

    it('should have programs for bootstrapped startups (low barrier)', () => {
      const lowBarrierPrograms = CLOUD_CREDITS_DATABASE.filter((credit) =>
        credit.requirements?.toLowerCase().includes('self-service')
      );

      expect(lowBarrierPrograms.length).toBeGreaterThan(0);
    });

    it('should have programs for VC-backed startups', () => {
      const vcBackedPrograms = CLOUD_CREDITS_DATABASE.filter((credit) =>
        credit.requirements?.toLowerCase().includes('vc-backed')
      );

      expect(vcBackedPrograms.length).toBeGreaterThan(0);
    });
  });

  describe('Duration validation', () => {
    it('should have durations in standard format (months or days)', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        const validDuration =
          credit.duration.includes('month') || credit.duration.includes('day');

        expect(validDuration).toBe(true);
      });
    });

    it('should have at least one program with 12+ months duration', () => {
      const longDurationPrograms = CLOUD_CREDITS_DATABASE.filter((credit) => {
        const duration = credit.duration;
        if (duration.includes('12 months') || duration.includes('24 months')) {
          return true;
        }
        const months = parseInt(duration.replace(/[^\d]/g, ''));
        return months >= 12;
      });

      expect(longDurationPrograms.length).toBeGreaterThan(0);
    });
  });

  describe('Provider coverage', () => {
    it('should include all major cloud providers', () => {
      const providers = CLOUD_CREDITS_DATABASE.map((c) => c.provider);

      const hasAWS = providers.some((p) => p.includes('AWS'));
      const hasAzure = providers.some((p) => p.includes('Azure'));
      const hasGCP = providers.some((p) => p.includes('Google Cloud'));

      expect(hasAWS).toBe(true);
      expect(hasAzure).toBe(true);
      expect(hasGCP).toBe(true);
    });

    it('should include startup-friendly platforms', () => {
      const providers = CLOUD_CREDITS_DATABASE.map((c) => c.provider);

      const hasVercel = providers.some((p) => p.includes('Vercel'));
      const hasSupabase = providers.some((p) => p.includes('Supabase'));

      expect(hasVercel).toBe(true);
      expect(hasSupabase).toBe(true);
    });

    it('should have at least 7 programs total', () => {
      expect(CLOUD_CREDITS_DATABASE.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('URL validation', () => {
    it('should have valid HTTPS URLs where provided', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        if (credit.url) {
          expect(credit.url).toMatch(/^https:\/\//);
        }
      });
    });

    it('should have URLs for major cloud providers', () => {
      const awsCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('AWS')
      );
      const azureCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Azure')
      );
      const gcpCredits = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Google Cloud')
      );

      awsCredits.forEach((credit) => {
        expect(credit.url).toBeDefined();
      });

      azureCredits.forEach((credit) => {
        expect(credit.url).toBeDefined();
      });

      gcpCredits.forEach((credit) => {
        expect(credit.url).toBeDefined();
      });
    });
  });

  describe('Requirements validation', () => {
    it('should have requirements for most programs', () => {
      const programsWithRequirements = CLOUD_CREDITS_DATABASE.filter(
        (c) => c.requirements && c.requirements.length > 0
      );

      // At least 80% of programs should have requirements
      const percentage =
        (programsWithRequirements.length / CLOUD_CREDITS_DATABASE.length) * 100;
      expect(percentage).toBeGreaterThanOrEqual(80);
    });

    it('should have clear requirements text', () => {
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        if (credit.requirements) {
          expect(credit.requirements.length).toBeGreaterThan(5);
        }
      });
    });
  });

  describe('Tiered programs', () => {
    it('should have tiered AWS Activate programs', () => {
      const awsPrograms = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('AWS Activate')
      );

      expect(awsPrograms.length).toBeGreaterThanOrEqual(3);

      const amounts = awsPrograms.map((p) => p.amount);
      expect(amounts).toContain('$1,000');
      expect(amounts).toContain('$5,000');
      expect(amounts).toContain('$100,000');
    });

    it('should have tiered Google Cloud programs', () => {
      const gcpPrograms = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Google Cloud for Startups')
      );

      expect(gcpPrograms.length).toBeGreaterThanOrEqual(3);

      const amounts = gcpPrograms.map((p) => p.amount);
      expect(amounts).toContain('$2,000');
      expect(amounts).toContain('$100,000');
      expect(amounts).toContain('$350,000');
    });

    it('should have tiered Azure programs', () => {
      const azurePrograms = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('Azure for Startups')
      );

      expect(azurePrograms.length).toBeGreaterThanOrEqual(2);

      const amounts = azurePrograms.map((p) => p.amount);
      expect(amounts).toContain('$1,000');
      expect(amounts).toContain('$100,000');
    });
  });

  describe('Database usability', () => {
    it('should be easy to filter by provider', () => {
      const awsPrograms = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.provider.includes('AWS')
      );

      expect(awsPrograms.length).toBeGreaterThan(0);
      awsPrograms.forEach((program) => {
        expect(program.provider).toContain('AWS');
      });
    });

    it('should be easy to filter by credit amount', () => {
      const highValuePrograms = CLOUD_CREDITS_DATABASE.filter((c) =>
        c.amount.includes('$100,000')
      );

      expect(highValuePrograms.length).toBeGreaterThan(0);
    });

    it('should be easy to filter by requirements', () => {
      const selfServicePrograms = CLOUD_CREDITS_DATABASE.filter(
        (c) => c.requirements?.toLowerCase().includes('self-service')
      );

      expect(selfServicePrograms.length).toBeGreaterThan(0);
    });

    it('should be easy to sort by amount (parsing needed)', () => {
      // Test that amounts can be parsed for sorting
      CLOUD_CREDITS_DATABASE.forEach((credit) => {
        const numberMatch = credit.amount.match(/[\d,]+/);
        expect(numberMatch).not.toBeNull();
      });
    });
  });

  describe('Real-world applicability', () => {
    it('should cover bootstrapped startups', () => {
      const bootstrappedOptions = CLOUD_CREDITS_DATABASE.filter(
        (c) =>
          c.requirements?.toLowerCase().includes('self-service') ||
          c.amount.includes('$20/month') ||
          c.amount.includes('$25/month')
      );

      expect(bootstrappedOptions.length).toBeGreaterThan(0);
    });

    it('should cover VC-backed startups', () => {
      const vcBackedOptions = CLOUD_CREDITS_DATABASE.filter(
        (c) =>
          c.requirements?.toLowerCase().includes('vc-backed') ||
          c.requirements?.toLowerCase().includes('series')
      );

      expect(vcBackedOptions.length).toBeGreaterThan(0);
    });

    it('should cover incubator-backed startups', () => {
      const incubatorOptions = CLOUD_CREDITS_DATABASE.filter(
        (c) =>
          c.requirements?.toLowerCase().includes('incubator') ||
          c.requirements?.toLowerCase().includes('accelerator') ||
          c.requirements?.toLowerCase().includes('y combinator')
      );

      expect(incubatorOptions.length).toBeGreaterThan(0);
    });
  });
});
