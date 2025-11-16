#!/usr/bin/env tsx
/**
 * Migrate Feature-Level Issues to User Story Issues
 *
 * Problem: Old architecture created Feature-level issues like:
 * - [FS-033] Duplicate Increment Prevention System (GitHub Issue)
 *
 * Correct architecture (Universal Hierarchy):
 * - FS-033 (GitHub Milestone)
 * - [FS-033][US-001] Prevent Duplicate Locations (GitHub Issue)
 * - [FS-033][US-002] Auto-Detect Conflicts (GitHub Issue)
 * - ... etc
 *
 * This script:
 * 1. Finds all Feature-level issues (title matches `[FS-XXX]` without `[US-XXX]`)
 * 2. Closes them with migration comment
 * 3. Creates proper User Story issues using GitHubFeatureSync
 *
 * Usage:
 *   npx tsx scripts/migrate-feature-issues-to-user-stories.ts
 *   npx tsx scripts/migrate-feature-issues-to-user-stories.ts --dry-run
 *   npx tsx scripts/migrate-feature-issues-to-user-stories.ts --feature FS-033
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

interface FeatureLevelIssue {
  number: number;
  title: string;
  url: string;
  featureId: string;
  state: 'open' | 'closed';
}

class FeatureIssueMigrator {
  private dryRun: boolean;
  private featureFilter: string | null;

  constructor(dryRun: boolean = false, featureFilter: string | null = null) {
    this.dryRun = dryRun;
    this.featureFilter = featureFilter;
  }

  /**
   * Main migration process
   */
  async migrate(): Promise<void> {
    console.log('🔍 Scanning for Feature-level GitHub issues...\n');

    // 1. Find all Feature-level issues
    const featureIssues = await this.findFeatureLevelIssues();

    if (featureIssues.length === 0) {
      console.log('✅ No Feature-level issues found! Migration not needed.');
      return;
    }

    console.log(`\n📋 Found ${featureIssues.length} Feature-level issues:\n`);
    for (const issue of featureIssues) {
      console.log(`   - Issue #${issue.number}: ${issue.title}`);
      console.log(`     Feature: ${issue.featureId}`);
      console.log(`     State: ${issue.state}`);
      console.log(`     URL: ${issue.url}`);
      console.log('');
    }

    if (this.dryRun) {
      console.log('🏃 DRY RUN MODE - No changes will be made');
      console.log('\nTo execute migration, run without --dry-run flag');
      return;
    }

    // 2. Confirm migration
    console.log('\n⚠️  This migration will:');
    console.log('   1. Close all Feature-level issues with migration comment');
    console.log('   2. Create proper User Story issues (one per us-*.md file)');
    console.log('   3. Update Feature Milestones');
    console.log('\nPress Ctrl+C to cancel, or Enter to continue...');

    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    // 3. Close Feature-level issues
    console.log('\n🔒 Closing Feature-level issues...\n');
    for (const issue of featureIssues) {
      await this.closeFeatureIssue(issue);
    }

    // 4. Sync Features to create User Story issues
    console.log('\n🚀 Creating User Story issues...\n');
    const uniqueFeatures = [...new Set(featureIssues.map((i) => i.featureId))];

    for (const featureId of uniqueFeatures) {
      await this.syncFeature(featureId);
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Closed ${featureIssues.length} Feature-level issues`);
    console.log(`   Synced ${uniqueFeatures.length} Features to create User Story issues`);
  }

  /**
   * Find all Feature-level issues in GitHub
   *
   * Searches for issues matching:
   * - Title starts with [FS-XXX]
   * - Title does NOT contain [US-XXX] (User Story issues are OK)
   */
  private async findFeatureLevelIssues(): Promise<FeatureLevelIssue[]> {
    const issues: FeatureLevelIssue[] = [];

    try {
      // Search GitHub for all issues with [FS- prefix
      const { stdout } = await execAsync(
        'gh issue list --search "[FS-" --state all --json number,title,url,state --limit 1000'
      );

      const allIssues = JSON.parse(stdout);

      for (const issue of allIssues) {
        // Check if title matches [FS-XXX] pattern WITHOUT [US-XXX]
        const featureMatch = issue.title.match(/^\[FS-(\d+)\]/);
        const userStoryMatch = issue.title.match(/\[US-\d+\]/);

        if (featureMatch && !userStoryMatch) {
          // This is a Feature-level issue (WRONG architecture!)
          const featureId = `FS-${featureMatch[1]}`;

          // Apply feature filter if specified
          if (this.featureFilter && featureId !== this.featureFilter) {
            continue;
          }

          issues.push({
            number: issue.number,
            title: issue.title,
            url: issue.url,
            featureId,
            state: issue.state,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to search GitHub issues:', error.message);
      throw error;
    }

    return issues;
  }

  /**
   * Close a Feature-level issue with migration comment
   */
  private async closeFeatureIssue(issue: FeatureLevelIssue): Promise<void> {
    const comment = `**🔄 Migrating to Universal Hierarchy**

This issue was created using the old architecture where Features mapped to GitHub Issues.

**New Architecture (Universal Hierarchy v0.19.0+)**:
- ✅ **Feature** (${issue.featureId}) → GitHub **Milestone** (Container)
- ✅ **User Story** (US-001, US-002, etc.) → GitHub **Issue** (Trackable item)
- ✅ **Tasks** (T-001, T-002, etc.) → **Checkboxes** in User Story issue body

**What's Next**:
This issue is being closed and replaced with:
1. **Milestone**: ${issue.featureId} (Container for all User Stories)
2. **Individual User Story Issues**: One issue per US-* file in specs

**Benefits**:
- 🎯 Granular tracking: Each User Story is independently trackable
- 💬 Better discussions: Team can comment on specific User Stories
- ✅ Independent completion: Close User Stories as they finish
- 📊 Scalable: Large features with 20+ User Stories remain manageable

---

🤖 Auto-closed by SpecWeave Migration Script
`;

    try {
      if (issue.state === 'open') {
        console.log(`   🔒 Closing Issue #${issue.number}: ${issue.title}`);
        execSync(
          `gh issue close ${issue.number} --comment "${comment.replace(/"/g, '\\"')}"`,
          { stdio: 'inherit' }
        );
      } else {
        console.log(`   ℹ️  Issue #${issue.number} already closed, adding comment`);
        execSync(
          `gh issue comment ${issue.number} --body "${comment.replace(/"/g, '\\"')}"`,
          { stdio: 'inherit' }
        );
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to close Issue #${issue.number}:`, error.message);
    }
  }

  /**
   * Sync Feature to GitHub using new GitHubFeatureSync
   */
  private async syncFeature(featureId: string): Promise<void> {
    console.log(`   📦 Syncing Feature ${featureId}...`);

    try {
      // Use the slash command to sync
      execSync(`/specweave-github:sync-epic ${featureId}`, { stdio: 'inherit' });
    } catch (error: any) {
      console.error(`   ❌ Failed to sync Feature ${featureId}:`, error.message);
      console.error(`   💡 Try manual sync: /specweave-github:sync-epic ${featureId}`);
    }
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const featureIndex = args.indexOf('--feature');
const featureFilter = featureIndex >= 0 ? args[featureIndex + 1] : null;

// Run migration
const migrator = new FeatureLevelMigrator(dryRun, featureFilter);
migrator.migrate().catch((error) => {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
});
