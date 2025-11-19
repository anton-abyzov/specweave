import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../..');

// Import using absolute paths
const { UserStoryContentBuilder } = await import(path.join(projectRoot, 'dist/plugins/specweave-github/lib/user-story-content-builder.js'));
const { execFileNoThrow } = await import(path.join(projectRoot, 'dist/src/utils/execFileNoThrow.js'));
const userStoryPath = path.join(projectRoot, '.specweave/docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md');

console.log('🔍 Finding user story: FS-031/US-004');
console.log(`   📄 Path: ${userStoryPath}\n`);

console.log('📖 Parsing user story content...');
const builder = new UserStoryContentBuilder(userStoryPath, projectRoot);
const content = await builder.parse();

console.log(`   ✅ Feature: ${content.featureId}`);
console.log(`   ✅ User Story: ${content.frontmatter.id} - ${content.frontmatter.title}`);
console.log(`   ✅ Status: ${content.frontmatter.status}`);
console.log(`   ✅ Acceptance Criteria: ${content.acceptanceCriteria.length} (${content.acceptanceCriteria.filter(ac => ac.completed).length} completed)`);
console.log(`   ✅ Tasks: ${content.tasks.length} (${content.tasks.filter(t => t.status).length} completed)\n`);

console.log('🔍 Searching for existing GitHub issue...');
const searchResult = await execFileNoThrow('gh', [
  'issue',
  'list',
  '--search',
  '[FS-031][US-004]',
  '--json',
  'number,title',
  '--jq',
  '.[0]'
]);

if (searchResult.exitCode !== 0 || !searchResult.stdout.trim()) {
  console.error('   ❌ Issue not found');
  process.exit(1);
}

const issue = JSON.parse(searchResult.stdout);
console.log(`   🔗 Found issue #${issue.number}: ${issue.title}\n`);

console.log('📝 Building updated issue body...');
const issueBody = await builder.buildIssueBody();
console.log(`   ✅ Generated ${issueBody.length} characters`);

console.log(`\n🚀 Updating GitHub issue #${issue.number}...`);
const updateResult = await execFileNoThrow('gh', [
  'issue',
  'edit',
  issue.number.toString(),
  '--body',
  issueBody
]);

if (updateResult.exitCode !== 0) {
  console.error(`   ❌ Failed to update: ${updateResult.stderr}`);
  process.exit(1);
}

console.log('   ✅ Updated successfully!\n');

const urlResult = await execFileNoThrow('gh', [
  'issue',
  'view',
  issue.number.toString(),
  '--json',
  'url',
  '--jq',
  '.url'
]);

console.log(`🔗 View issue: ${urlResult.stdout.trim()}`);
console.log('\n✨ Done! The issue now includes:');
console.log('   - ✅ Checkable acceptance criteria');
console.log('   - ✅ Task connections to increment tasks.md');
console.log('   - ✅ Progress tracking (percentages)');
console.log('   - ✅ User story description');
