/**
 * Test script to verify Acceptance Criteria extraction works correctly
 *
 * This script tests the fix for missing checkable tasks in GitHub issues.
 */

import { EpicContentBuilder } from '../../../plugins/specweave-github/lib/epic-content-builder.js';
import * as path from 'path';

async function testAcceptanceCriteriaExtraction() {
  console.log('🧪 Testing Acceptance Criteria Extraction...\n');

  // Test with FS-031 (the problematic epic)
  const projectRoot = path.join(process.cwd());
  const epicFolder = path.join(
    projectRoot,
    '.specweave/docs/internal/specs/_features/FS-031'
  );

  console.log(`📁 Epic folder: ${epicFolder}\n`);

  const builder = new EpicContentBuilder(epicFolder, projectRoot);

  try {
    const issueBody = await builder.buildIssueBody();

    console.log('✅ Issue body generated successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(issueBody);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Verify Acceptance Criteria are present
    const hasAcceptanceCriteria = issueBody.includes('**Acceptance Criteria**:');
    const hasAC_US2_01 = issueBody.includes('**AC-US2-01**:');
    const hasAC_US2_02 = issueBody.includes('**AC-US2-02**:');
    const hasCheckboxes = /- \[[x\s]\] \*\*AC-/.test(issueBody);

    console.log('🔍 Validation Results:');
    console.log(`   ${hasAcceptanceCriteria ? '✅' : '❌'} Contains "Acceptance Criteria" section`);
    console.log(`   ${hasAC_US2_01 ? '✅' : '❌'} Contains AC-US2-01`);
    console.log(`   ${hasAC_US2_02 ? '✅' : '❌'} Contains AC-US2-02`);
    console.log(`   ${hasCheckboxes ? '✅' : '❌'} AC items have checkboxes`);

    if (hasAcceptanceCriteria && hasAC_US2_01 && hasAC_US2_02 && hasCheckboxes) {
      console.log('\n🎉 SUCCESS: Acceptance Criteria are correctly extracted!\n');
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: Acceptance Criteria extraction is incomplete!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

testAcceptanceCriteriaExtraction();
