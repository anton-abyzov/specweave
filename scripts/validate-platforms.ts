#!/usr/bin/env ts-node
/**
 * Validation script for serverless platform knowledge base
 *
 * Comprehensive validation of platform JSON files:
 * 1. Schema validation (all files conform to schema.json)
 * 2. Data freshness check (lastVerified dates within 30 days)
 * 3. Pricing structure validation (freeTier and payAsYouGo)
 * 4. Free tier completeness (all required fields present)
 * 5. Startup programs validation
 *
 * Usage:
 *   npx ts-node scripts/validate-platforms.ts
 *   npm run validate:platforms
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platformsDir = path.join(__dirname, '../plugins/specweave/knowledge-base/serverless/platforms');

interface FreeTier {
  requests: number;
  computeGbSeconds: number;
  dataTransferGb: number;
}

interface PayAsYouGo {
  requestsPer1M: number;
  computePerGbSecond: number;
  dataTransferPerGb: number;
}

interface Pricing {
  freeTier: FreeTier;
  payAsYouGo: PayAsYouGo;
}

interface Features {
  runtimes: string[];
  coldStartMs: number;
  maxExecutionMinutes: number;
  maxMemoryMb: number;
}

interface Ecosystem {
  integrations: string[];
  sdks: string[];
  communitySize: string;
}

interface LockIn {
  portability: string;
  migrationComplexity: string;
  vendorLockIn: string;
}

interface StartupProgram {
  name: string;
  credits: number;
  duration: string;
}

interface Platform {
  id: string;
  name: string;
  provider: string;
  pricing: Pricing;
  features: Features;
  ecosystem: Ecosystem;
  lockIn: LockIn;
  startupPrograms: StartupProgram[];
  lastVerified: string;
}

/**
 * Validate platform data structure
 */
function validatePlatformStructure(platform: any, filename: string): string[] {
  const errors: string[] = [];

  // Required top-level fields
  const requiredFields = ['id', 'name', 'provider', 'pricing', 'features', 'ecosystem', 'lockIn', 'startupPrograms', 'lastVerified'];
  for (const field of requiredFields) {
    if (!(field in platform)) {
      errors.push(`  - Missing required field: ${field}`);
    }
  }

  // Validate pricing structure
  if (platform.pricing) {
    if (!platform.pricing.freeTier) {
      errors.push('  - Missing pricing.freeTier');
    } else {
      const freeTierFields = ['requests', 'computeGbSeconds', 'dataTransferGb'];
      for (const field of freeTierFields) {
        if (!(field in platform.pricing.freeTier) || typeof platform.pricing.freeTier[field] !== 'number') {
          errors.push(`  - Pricing.freeTier missing or invalid field: ${field}`);
        }
      }
      if (platform.pricing.freeTier.requests < 0 || platform.pricing.freeTier.computeGbSeconds < 0 || platform.pricing.freeTier.dataTransferGb < 0) {
        errors.push('  - Free tier values must be non-negative');
      }
    }

    if (!platform.pricing.payAsYouGo) {
      errors.push('  - Missing pricing.payAsYouGo');
    } else {
      const payAsYouGoFields = ['requestsPer1M', 'computePerGbSecond', 'dataTransferPerGb'];
      for (const field of payAsYouGoFields) {
        if (!(field in platform.pricing.payAsYouGo) || typeof platform.pricing.payAsYouGo[field] !== 'number') {
          errors.push(`  - Pricing.payAsYouGo missing or invalid field: ${field}`);
        }
      }
      if (platform.pricing.payAsYouGo.requestsPer1M < 0 || platform.pricing.payAsYouGo.computePerGbSecond < 0 || platform.pricing.payAsYouGo.dataTransferPerGb < 0) {
        errors.push('  - Pay-as-you-go values must be non-negative');
      }
    }
  }

  // Validate features
  if (platform.features) {
    if (!Array.isArray(platform.features.runtimes) || platform.features.runtimes.length === 0) {
      errors.push('  - Features.runtimes must be a non-empty array');
    }
    if (typeof platform.features.coldStartMs !== 'number' || platform.features.coldStartMs < 0) {
      errors.push('  - Features.coldStartMs must be a non-negative number');
    }
    if (typeof platform.features.maxExecutionMinutes !== 'number' || platform.features.maxExecutionMinutes <= 0) {
      errors.push('  - Features.maxExecutionMinutes must be a positive number');
    }
    if (typeof platform.features.maxMemoryMb !== 'number' || platform.features.maxMemoryMb <= 0) {
      errors.push('  - Features.maxMemoryMb must be a positive number');
    }
  }

  // Validate ecosystem
  if (platform.ecosystem) {
    if (!Array.isArray(platform.ecosystem.integrations) || platform.ecosystem.integrations.length === 0) {
      errors.push('  - Ecosystem.integrations must be a non-empty array');
    }
    if (!Array.isArray(platform.ecosystem.sdks) || platform.ecosystem.sdks.length === 0) {
      errors.push('  - Ecosystem.sdks must be a non-empty array');
    }
    const validCommunitySizes = ['small', 'medium', 'large', 'very-large'];
    if (!validCommunitySizes.includes(platform.ecosystem.communitySize)) {
      errors.push(`  - Ecosystem.communitySize must be one of: ${validCommunitySizes.join(', ')}`);
    }
  }

  // Validate lockIn
  if (platform.lockIn) {
    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(platform.lockIn.portability)) {
      errors.push(`  - LockIn.portability must be one of: ${validLevels.join(', ')}`);
    }
    if (!validLevels.includes(platform.lockIn.migrationComplexity)) {
      errors.push(`  - LockIn.migrationComplexity must be one of: ${validLevels.join(', ')}`);
    }
    if (typeof platform.lockIn.vendorLockIn !== 'string' || platform.lockIn.vendorLockIn.length === 0) {
      errors.push('  - LockIn.vendorLockIn must be a non-empty string');
    }
  }

  // Validate startup programs
  if (!Array.isArray(platform.startupPrograms)) {
    errors.push('  - StartupPrograms must be an array');
  } else {
    platform.startupPrograms.forEach((program: any, idx: number) => {
      if (!program.name || typeof program.name !== 'string') {
        errors.push(`  - StartupPrograms[${idx}].name must be a non-empty string`);
      }
      if (typeof program.credits !== 'number' || program.credits < 0) {
        errors.push(`  - StartupPrograms[${idx}].credits must be a non-negative number`);
      }
      if (!program.duration || typeof program.duration !== 'string') {
        errors.push(`  - StartupPrograms[${idx}].duration must be a non-empty string`);
      }
    });
  }

  // Validate lastVerified format (YYYY-MM-DD)
  if (platform.lastVerified) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(platform.lastVerified)) {
      errors.push('  - lastVerified must be in YYYY-MM-DD format');
    }
  }

  return errors;
}

// Get all platform files
const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json')).sort();

// Validation statistics
let totalPlatforms = 0;
let passedValidation = 0;
let failedValidation = 0;
let stalePlatforms: string[] = [];
let validationErrors: { file: string; errors: string[] }[] = [];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const today = new Date();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Serverless Platform Data Validation                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Validate each platform
for (const file of platformFiles) {
  const filePath = path.join(platformsDir, file);
  totalPlatforms++;
  let errors: string[] = [];

  try {
    const platformData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const platform = platformData as Platform;

    // 1. Validate platform structure (schema validation)
    errors = validatePlatformStructure(platform, file);

    if (errors.length > 0) {
      console.error(`\n❌ ${file}: Validation errors`);
      errors.forEach(err => console.error(err));
      failedValidation++;
      validationErrors.push({ file, errors });
      continue;
    }

    // 2. Check data freshness (lastVerified)
    const lastVerifiedDate = new Date(platform.lastVerified);
    const ageMs = today.getTime() - lastVerifiedDate.getTime();
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    if (ageMs > THIRTY_DAYS_MS) {
      stalePlatforms.push(`${platform.name} (${ageDays} days old - last verified: ${platform.lastVerified})`);
      console.warn(`⚠️  ${file}: Data is stale (${ageDays} days old - last verified: ${platform.lastVerified})`);
    } else {
      console.log(`✅ ${file}`);
    }

    passedValidation++;
  } catch (error) {
    console.error(`\n❌ ${file}: Failed to parse JSON`);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  - ${errorMsg}`);
    failedValidation++;
    validationErrors.push({ file, errors: [errorMsg] });
  }
}

// Print summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Validation Summary                                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`📊 Total Platforms: ${totalPlatforms}`);
console.log(`✅ Passed: ${passedValidation}`);
console.log(`❌ Failed: ${failedValidation}`);
console.log(`⚠️  Stale (>30 days): ${stalePlatforms.length}\n`);

if (stalePlatforms.length > 0) {
  console.log('⚠️  Stale Platforms:');
  stalePlatforms.forEach(p => console.log(`  - ${p}`));
  console.log('');
}

if (validationErrors.length > 0) {
  console.log('❌ Validation Errors:');
  validationErrors.forEach(({ file, errors }) => {
    console.log(`\n  ${file}:`);
    errors.forEach(err => console.log(`    ${err}`));
  });
  console.log('');
}

// Exit with appropriate code
if (failedValidation > 0) {
  console.error('❌ Validation FAILED! Please fix errors above.');
  process.exit(1);
} else if (stalePlatforms.length > 0) {
  console.warn('⚠️  Validation PASSED with warnings. Some platform data is stale.');
  console.warn('    Please update and verify current pricing/features.\n');
  process.exit(0);
} else {
  console.log('✅ All platform data validated successfully!\n');
  process.exit(0);
}
