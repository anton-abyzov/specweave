#!/usr/bin/env node
/**
 * Plugin Manifest Validation Script
 *
 * Validates all plugin.json manifests to ensure:
 * - All required fields are present
 * - Repository field is a string (not an object)
 * - Consistent metadata across plugins
 *
 * Usage:
 *   node scripts/validate-plugin-manifests.js
 *   npm run validate:plugins
 */

const fs = require('fs');
const path = require('path');

const pluginsDir = 'plugins';
const requiredFields = ['name', 'description', 'version', 'author', 'repository', 'homepage', 'license', 'keywords'];

function validatePlugins() {
  const plugins = fs.readdirSync(pluginsDir);
  let hasErrors = false;
  let validCount = 0;
  let warningCount = 0;

  console.log('🔍 Validating plugin manifests...\n');

  plugins.forEach(plugin => {
    const manifestPath = path.join(pluginsDir, plugin, '.claude-plugin', 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      console.log(`❌ ${plugin}: manifest not found`);
      hasErrors = true;
      return;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const missing = requiredFields.filter(field => !manifest[field]);

      if (missing.length === 0) {
        console.log(`✅ ${plugin}: all required fields present`);
        validCount++;
      } else {
        console.log(`⚠️  ${plugin}: missing fields: ${missing.join(', ')}`);
        warningCount++;
      }

      // Check repository format
      if (manifest.repository && typeof manifest.repository !== 'string') {
        console.log(`   ⛔ ${plugin}: repository must be a string, not an object`);
        hasErrors = true;
      }

      // Check author format
      if (manifest.author && typeof manifest.author === 'object' && !manifest.author.name) {
        console.log(`   ⛔ ${plugin}: author.name is required`);
        hasErrors = true;
      }
    } catch (error) {
      console.log(`❌ ${plugin}: invalid JSON - ${error.message}`);
      hasErrors = true;
    }
  });

  console.log('\n' + '═'.repeat(60));
  console.log('Summary:');
  console.log(`  ✅ Valid: ${validCount}`);
  console.log(`  ⚠️  Warnings: ${warningCount}`);
  console.log('═'.repeat(60));

  if (hasErrors) {
    console.error('\n❌ Validation failed! Fix the errors above.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.warn('\n⚠️  Validation passed with warnings. Consider fixing them.');
    process.exit(0);
  } else {
    console.log('\n✅ All plugin manifests are valid!');
    process.exit(0);
  }
}

// Run validation
validatePlugins();
