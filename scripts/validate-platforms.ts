#!/usr/bin/env ts-node
/**
 * Validation script for serverless platform knowledge base
 * Checks that all platform JSONs conform to schema and are up-to-date
 */

import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

const ajv = new Ajv();

const schemaPath = path.join(__dirname, '../plugins/specweave/knowledge-base/serverless/schema.json');
const platformsDir = path.join(__dirname, '../plugins/specweave/knowledge-base/serverless/platforms');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

const platformFiles = fs.readdirSync(platformsDir).filter(f => f.endsWith('.json'));

let hasErrors = false;

console.log('🔍 Validating serverless platform data...\n');

for (const file of platformFiles) {
  const filePath = path.join(platformsDir, file);
  const platform = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Validate against schema
  const valid = validate(platform);
  if (!valid) {
    console.error(`❌ ${file}: Schema validation failed`);
    console.error(validate.errors);
    hasErrors = true;
    continue;
  }

  // Check data freshness
  const lastVerified = new Date(platform.lastVerified);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (lastVerified < thirtyDaysAgo) {
    console.warn(`⚠️  ${file}: Data is stale (last verified: ${platform.lastVerified})`);
  } else {
    console.log(`✅ ${file}: Valid (last verified: ${platform.lastVerified})`);
  }
}

if (hasErrors) {
  console.error('\n❌ Validation failed! Please fix errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All platform data validated successfully!');
  process.exit(0);
}
