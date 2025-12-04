#!/usr/bin/env ts-node

/**
 * Test Generator CLI
 *
 * Generates executable TypeScript tests from YAML test specifications.
 *
 * Usage:
 *   npm run generate:tests              # Generate all tests
 *   npm run generate:tests jira-sync    # Generate tests for specific skill
 */

import { TestGenerator } from '../src/testing/test-generator';

async function main() {
  const skillName = process.argv[2];

  const generator = new TestGenerator();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Test Generator - YAML → TypeScript              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (skillName) {
    console.log(`📦 Generating tests for skill: ${skillName}`);
    console.log('');

    const result = await generator.generateTestsForSkill(skillName);

    if (result) {
      console.log('');
      console.log('✅ Test generation complete!');
      console.log('');
      console.log(`   Skill: ${result.skillName}`);
      console.log(`   Tests: ${result.testCount}`);
      console.log(`   File: ${result.testFilePath}`);
      console.log('');
      console.log(`Run tests with: npx ts-node ${result.testFilePath}`);
    } else {
      console.log(`❌ No tests generated for ${skillName}`);
      process.exit(1);
    }
  } else {
    console.log('📦 Generating tests for ALL skills');
    console.log('');

    const results = await generator.generateAllTests();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  Generation Complete                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Generated tests for ${results.length} skills`);
    console.log('');

    if (results.length > 0) {
      console.log('Generated test files:');
      results.forEach(r => {
        console.log(`   ${r.skillName} → ${r.testCount} tests`);
      });
    }
  }
}

main().catch(error => {
  console.error('❌ Test generation failed:', error);
  process.exit(1);
});
