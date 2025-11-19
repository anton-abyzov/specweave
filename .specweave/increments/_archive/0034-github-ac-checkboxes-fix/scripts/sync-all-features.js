// Bulk sync ALL Features to GitHub using GitHubFeatureSync
import { GitHubClientV2 } from './plugins/specweave-github/lib/github-client-v2.js';
import { GitHubFeatureSync } from './plugins/specweave-github/lib/github-feature-sync.js';
import * as path from 'path';
import { readdirSync } from 'fs';

async function syncAllFeatures() {
  const projectRoot = process.cwd();
  const featuresDir = path.join(projectRoot, '.specweave/docs/internal/specs/_features');

  // Detect repository
  const repo = await GitHubClientV2.detectRepo(projectRoot);
  const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);

  // Initialize FeatureSync
  const specsDir = path.join(projectRoot, '.specweave/docs/internal/specs');
  const featureSync = new GitHubFeatureSync(client, specsDir, projectRoot);

  // Find all Feature folders
  const features = readdirSync(featuresDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('FS-'))
    .map(dirent => dirent.name);

  console.log(`\n🚀 Bulk Sync: Found ${features.length} Features to sync`);
  console.log('   Features:', features.join(', '), '\n');

  let totalIssuesCreated = 0;
  let totalIssuesUpdated = 0;
  let totalUserStories = 0;

  // Sync each Feature
  for (const featureId of features) {
    try {
      console.log('\n' + '='.repeat(60));
      const result = await featureSync.syncFeatureToGitHub(featureId);

      console.log(`\n   ✅ ${featureId} synced successfully!`);
      console.log(`      Milestone #${result.milestoneNumber}: ${result.milestoneUrl}`);
      console.log(`      User Stories: ${result.userStoriesProcessed}`);
      console.log(`      Issues Created: ${result.issuesCreated}`);
      console.log(`      Issues Updated: ${result.issuesUpdated}`);

      totalIssuesCreated += result.issuesCreated;
      totalIssuesUpdated += result.issuesUpdated;
      totalUserStories += result.userStoriesProcessed;

    } catch (error) {
      console.error(`\n   ❌ Failed to sync ${featureId}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 Bulk Sync Complete!');
  console.log(`   Features Synced: ${features.length}`);
  console.log(`   Total User Stories: ${totalUserStories}`);
  console.log(`   Total Issues Created: ${totalIssuesCreated}`);
  console.log(`   Total Issues Updated: ${totalIssuesUpdated}\n`);
}

syncAllFeatures().catch(console.error);
