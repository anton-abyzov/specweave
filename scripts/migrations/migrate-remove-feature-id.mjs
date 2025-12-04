#!/usr/bin/env node
/**
 * Migration Script: Remove Redundant feature_id from Metadata
 *
 * This script removes the following redundant fields from all metadata.json files:
 * - feature_id (snake_case)
 * - featureId (camelCase)
 * - relatedIncrements (unused)
 *
 * These fields are redundant because:
 * - Feature ID is derived from increment number: 0081 → FS-081
 * - relatedIncrements was never used in code
 *
 * @see ADR-0140 for rationale
 * @see Increment 0087-remove-redundant-feature-id
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECWEAVE_ROOT = path.resolve(__dirname, '..');
const INCREMENTS_DIR = path.join(SPECWEAVE_ROOT, '.specweave/increments');

function processMetadataFile(metadataPath) {
  const result = {
    file: metadataPath,
    modified: false,
    fieldsRemoved: [],
    error: null,
  };

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    // Track fields to remove
    const fieldsToRemove = ['feature_id', 'featureId', 'relatedIncrements'];

    for (const field of fieldsToRemove) {
      if (field in metadata) {
        delete metadata[field];
        result.fieldsRemoved.push(field);
        result.modified = true;
      }
    }

    if (result.modified) {
      // Write back with consistent formatting
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

function findMetadataFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const subDir = path.join(dir, entry.name);
      const metadataPath = path.join(subDir, 'metadata.json');

      if (fs.existsSync(metadataPath)) {
        files.push(metadataPath);
      }

      // Recurse into subdirectories (for _archive)
      if (entry.name === '_archive') {
        files.push(...findMetadataFiles(subDir));
      }
    }
  }

  return files;
}

function main() {
  console.log('🔄 Migration: Remove Redundant feature_id from Metadata\n');
  console.log(`   Root: ${SPECWEAVE_ROOT}`);
  console.log(`   Increments: ${INCREMENTS_DIR}\n`);

  // Find all metadata.json files
  const metadataFiles = findMetadataFiles(INCREMENTS_DIR);
  console.log(`📁 Found ${metadataFiles.length} metadata.json files\n`);

  let modified = 0;
  let errors = 0;
  const allFieldsRemoved = {};

  for (const file of metadataFiles) {
    const result = processMetadataFile(file);
    const relativePath = path.relative(SPECWEAVE_ROOT, file);

    if (result.error) {
      console.log(`❌ ${relativePath}: ${result.error}`);
      errors++;
    } else if (result.modified) {
      console.log(`✅ ${relativePath}: removed [${result.fieldsRemoved.join(', ')}]`);
      modified++;

      for (const field of result.fieldsRemoved) {
        allFieldsRemoved[field] = (allFieldsRemoved[field] || 0) + 1;
      }
    } else {
      // Already clean, don't log to reduce noise
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total files: ${metadataFiles.length}`);
  console.log(`   Modified: ${modified}`);
  console.log(`   Already clean: ${metadataFiles.length - modified - errors}`);
  console.log(`   Errors: ${errors}`);

  if (Object.keys(allFieldsRemoved).length > 0) {
    console.log('\n   Fields removed:');
    for (const [field, count] of Object.entries(allFieldsRemoved)) {
      console.log(`   - ${field}: ${count} occurrences`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('   Run "git diff" to review changes');
  console.log('   Run "npm test" to verify nothing broke');
}

main();
