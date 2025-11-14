#!/usr/bin/env tsx
/**
 * Direct GitHub Issue Update Script
 *
 * Updates existing GitHub issues with new content from EpicContentBuilder
 * after task migration and living docs sync.
 */

import { EpicContentBuilder } from '../../../../plugins/specweave-github/lib/epic-content-builder.js';
import { execFileNoThrow } from '../../../../src/utils/execFileNoThrow.js';
import path from 'path';

interface EpicUpdate {
  epicId: string;
  issueNumber: number;
  incrementId: string;
}

async function updateGitHubIssue(epicId: string, issueNumber: number, incrementId: string) {
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');
  const epicFolder = path.join(specsDir, epicId);

  console.log(`\n🔄 Updating GitHub issue #${issueNumber} for epic ${epicId}...`);

  // Build content using EpicContentBuilder
  const contentBuilder = new EpicContentBuilder(epicFolder, projectRoot);
  const body = await contentBuilder.buildIssueBody();

  console.log(`   📝 Generated issue body (${body.length} characters)`);
  console.log(`   📊 Preview (first 500 chars):`);
  console.log(`   ${body.substring(0, 500).replace(/\n/g, '\n   ')}...\n`);

  // Update issue via GitHub CLI (specify repo explicitly)
  const result = await execFileNoThrow('gh', [
    'issue',
    'edit',
    issueNumber.toString(),
    '--repo',
    'anton-abyzov/specweave',
    '--body',
    body,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to update issue #${issueNumber}: ${result.stderr || result.stdout}`);
  }

  console.log(`   ✅ Issue #${issueNumber} updated successfully`);
  console.log(`   🔗 https://github.com/anton-abyzov/specweave/issues/${issueNumber}`);
}

async function main() {
  const epics: EpicUpdate[] = [
    { epicId: 'FS-25-10-29-intelligent-model-selection', issueNumber: 386, incrementId: '0003' },
    { epicId: 'FS-25-11-03-plugin-architecture', issueNumber: 391, incrementId: '0004' },
    { epicId: 'FS-25-11-03-llm-native-i18n', issueNumber: 390, incrementId: '0006' },
  ];

  console.log('🚀 Direct GitHub Issue Update Script');
  console.log(`   Mode: Update existing issues with task data`);
  console.log(`   Issues: ${epics.length}`);
  console.log('');

  for (const epic of epics) {
    try {
      await updateGitHubIssue(epic.epicId, epic.issueNumber, epic.incrementId);
    } catch (error: any) {
      console.error(`\n❌ Error updating issue #${epic.issueNumber}: ${error.message}`);
    }
  }

  console.log('\n\n════════════════════════════════════════');
  console.log('✅ GitHub Issues Updated!');
  console.log('════════════════════════════════════════');
  console.log('\nUpdated issues:');
  console.log('  - https://github.com/anton-abyzov/specweave/issues/386 (Intelligent Model Selection)');
  console.log('  - https://github.com/anton-abyzov/specweave/issues/391 (Plugin Architecture)');
  console.log('  - https://github.com/anton-abyzov/specweave/issues/390 (LLM-Native i18n)');
  console.log('');
  console.log('Verify:');
  console.log('  ✓ User Stories section shows all stories with checkboxes');
  console.log('  ✓ Tasks by User Story section shows task counts');
  console.log('  ✓ Progress percentages are displayed');
  console.log('');
}

main().catch(console.error);
