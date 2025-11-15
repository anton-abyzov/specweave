#!/usr/bin/env node

/**
 * SpecWeave Living Docs Auto-Sync
 *
 * Automatically syncs living documentation after task completion.
 *
 * Supports two modes:
 * 1. Simple mode: Copy spec.md to living docs (legacy)
 * 2. Intelligent mode: Parse, classify, and distribute content (v0.18.0+)
 *
 * Usage:
 *   node dist/hooks/lib/sync-living-docs.js <incrementId>
 *
 * Example:
 *   node dist/hooks/lib/sync-living-docs.js 0006-llm-native-i18n
 *
 * What it does:
 * 1. Checks if sync_living_docs enabled in config
 * 2. Detects sync mode (simple or intelligent)
 * 3. Runs appropriate sync strategy
 * 4. Syncs to external tools (GitHub/Jira/ADO)
 * 5. Logs sync actions
 *
 * @author SpecWeave Team
 * @version 2.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

interface Config {
  hooks?: {
    post_task_completion?: {
      sync_living_docs?: boolean;
    };
  };
  livingDocs?: {
    intelligent?: {
      enabled?: boolean;
      splitByCategory?: boolean;
      generateCrossLinks?: boolean;
      preserveOriginal?: boolean;
      classificationConfidenceThreshold?: number;
      fallbackProject?: string;
    };
  };
}

/**
 * Main function - sync living docs for given increment
 */
async function syncLivingDocs(incrementId: string): Promise<void> {
  try {
    console.log(`\n📚 Checking living docs sync for increment: ${incrementId}`);

    // 1. Load config
    const configPath = path.join(process.cwd(), '.specweave', 'config.json');
    let config: Config = {};

    if (fs.existsSync(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    }

    // 2. Check if sync enabled
    const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;

    if (!syncEnabled) {
      console.log('ℹ️  Living docs sync disabled in config');
      console.log('   To enable: Set hooks.post_task_completion.sync_living_docs = true');
      return;
    }

    console.log('✅ Living docs sync enabled');

    // 3. Determine sync mode (simple or intelligent)
    const intelligentEnabled = config.livingDocs?.intelligent?.enabled ?? false;

    let specCopied = false;
    let changedDocs: string[] = [];

    if (intelligentEnabled) {
      // Intelligent mode: Parse, classify, and distribute
      console.log('🧠 Using intelligent sync mode (v0.18.0+)');
      const result = await intelligentSyncLivingDocs(incrementId, config);
      specCopied = result.success;
      changedDocs = result.changedFiles;
    } else {
      // Hierarchical distribution mode: Epic + User Stories (v2.1)
      console.log('📊 Using hierarchical distribution mode (v2.1 - Epic + User Stories)');
      const result = await hierarchicalDistribution(incrementId);
      specCopied = result.success;
      changedDocs = result.changedFiles;
    }

    if (changedDocs.length === 0 && !specCopied) {
      console.log('ℹ️  No living docs changed');
      return;
    }

    console.log(`📄 Changed/created ${changedDocs.length} file(s)`);

    // 4. Sync to GitHub if configured
    await syncToGitHub(incrementId, changedDocs);

    console.log('✅ Living docs sync complete\n');

  } catch (error) {
    console.error('❌ Error syncing living docs:', error);
    // Don't exit with error - this is best-effort
  }
}

/**
 * Intelligent sync using the new architecture (v0.18.0+)
 *
 * NOTE: syncIncrement not yet implemented, fallback to hierarchical distribution
 */
async function intelligentSyncLivingDocs(
  incrementId: string,
  config: Config
): Promise<{ success: boolean; changedFiles: string[] }> {
  console.log('   ⚠️  Intelligent sync not yet fully implemented');
  console.log('   Falling back to hierarchical distribution mode...');

  // Fallback to hierarchical distribution
  return await hierarchicalDistribution(incrementId);
}

/**
 * Hierarchical distribution using new architecture (v2.1 - Epic + User Stories)
 *
 * Distributes increment spec into hierarchical structure:
 * - Epic file (SPEC-###.md) - High-level summary (50-80 lines)
 * - User story files (us-###.md) - Detailed requirements (80-120 lines each)
 * - Links to tasks.md for implementation details
 */
async function hierarchicalDistribution(
  incrementId: string
): Promise<{ success: boolean; changedFiles: string[] }> {
  try {
    // Dynamic import to avoid circular dependencies
    const { SpecDistributor } = await import('../../../../src/core/living-docs/index.js');

    console.log('   📊 Parsing and distributing spec into hierarchical structure...');

    const projectRoot = process.cwd();
    const distributor = new SpecDistributor(projectRoot, {
      overwriteExisting: false,
      createBackups: true,
    });

    const result = await distributor.distribute(incrementId);

    if (!result.success) {
      console.error(`   ❌ Distribution failed with errors:`);
      for (const error of result.errors) {
        console.error(`      - ${error}`);
      }
      return { success: false, changedFiles: [] };
    }

    // Log summary
    console.log(`   ✅ Hierarchical distribution complete:`);
    console.log(`      Epic ID: ${result.specId}`);
    console.log(`      User Stories: ${result.totalStories}`);
    console.log(`      Files created: ${result.totalFiles}`);
    console.log(`      Epic: ${path.basename(result.epicPath)}`);
    console.log(`      User story files: ${result.userStoryPaths.length}`);

    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Warnings:`);
      for (const warning of result.warnings) {
        console.log(`      - ${warning}`);
      }
    }

    // Update acceptance criteria status based on completed tasks
    console.log('   📊 Updating acceptance criteria status from completed tasks...');
    await distributor.updateAcceptanceCriteriaStatus(incrementId);

    // Collect changed file paths
    const changedFiles = [result.epicPath, ...result.userStoryPaths];

    return {
      success: true,
      changedFiles,
    };
  } catch (error) {
    console.error(`   ❌ Hierarchical distribution failed: ${error}`);
    console.error((error as Error).stack);

    // Fallback to simple mode
    console.error('   Falling back to simple sync mode...');
    const copied = await copyIncrementSpecToLivingDocs(incrementId);
    return {
      success: copied,
      changedFiles: copied ? [path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs', `spec-${incrementId}.md`)] : [],
    };
  }
}

/**
 * Extract and merge living docs (v2.0 - NO DUPLICATION!)
 *
 * NEW ARCHITECTURE:
 * - Living docs = Permanent EPIC (GitHub Project, Jira Epic, ADO Feature)
 * - Increment spec = Temporary ITERATION (GitHub Issue, Jira Story, ADO User Story)
 *
 * What this does:
 * 1. Parse increment spec (extract user stories ONLY)
 * 2. Check if living docs spec exists
 * 3. If exists: Merge new user stories (avoid duplicates)
 * 4. If not: Create new living docs spec
 * 5. Generate links to architecture/ADRs (NO duplication!)
 * 6. Update implementation history
 *
 * What this DOESN'T do:
 * - ❌ Copy architecture details (those live in architecture/)
 * - ❌ Copy ADR content (those live in architecture/adr/)
 * - ❌ Copy success metrics (those live in increment reports)
 * - ❌ Copy future enhancements (those live in roadmap)
 *
 * Returns true if living docs updated, false if skipped
 */
async function extractAndMergeLivingDocs(incrementId: string): Promise<boolean> {
  try {
    // Import parser utilities
    const {
      parseIncrementSpec,
      parseLivingDocsSpec,
      extractSpecId,
      mergeUserStories,
      generateRelatedDocsLinks,
      writeLivingDocsSpec,
    } = await import('../../../../src/utils/spec-parser.js');

    const projectRoot = process.cwd();
    const incrementSpecPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    // Check if increment spec exists
    if (!fs.existsSync(incrementSpecPath)) {
      console.log(`⚠️  Increment spec not found: ${incrementSpecPath}`);
      return false;
    }

    console.log(`   📖 Parsing increment spec: ${incrementId}`);

    // 1. Parse increment spec (extract user stories)
    const incrementSpec = await parseIncrementSpec(incrementSpecPath);

    if (incrementSpec.userStories.length === 0) {
      console.log(`ℹ️  No user stories found in increment spec, skipping sync`);
      return false;
    }

    console.log(`   ✅ Found ${incrementSpec.userStories.length} user stories in increment`);

    // 2. Determine living docs spec ID
    const specId = incrementSpec.implementsSpec || extractSpecId(incrementId);
    const livingDocsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');
    const livingDocsPath = path.join(livingDocsDir, `${specId}-${incrementId.replace(/^\d+-/, '')}.md`);

    // 3. Check if living docs spec exists
    const livingDocsExists = fs.existsSync(livingDocsPath);

    if (livingDocsExists) {
      console.log(`   📚 Living docs spec exists, merging user stories...`);

      // MERGE MODE: Add new user stories to existing spec
      const livingSpec = await parseLivingDocsSpec(livingDocsPath);

      // Merge user stories (adds new, updates existing)
      const mergedStories = mergeUserStories(
        livingSpec.userStories,
        incrementSpec.userStories,
        incrementId
      );

      const newStoriesCount = mergedStories.length - livingSpec.userStories.length;

      // Update implementation history
      const existingEntry = livingSpec.implementationHistory.find(e => e.increment === incrementId);

      if (!existingEntry) {
        livingSpec.implementationHistory.push({
          increment: incrementId,
          stories: incrementSpec.userStories.map(s => s.id),
          status: 'complete',
          date: new Date().toISOString().split('T')[0],
        });
      } else {
        // Update existing entry
        existingEntry.status = 'complete';
        existingEntry.date = new Date().toISOString().split('T')[0];
      }

      // Update user stories
      livingSpec.userStories = mergedStories;

      // Update last_updated
      livingSpec.lastUpdated = new Date().toISOString().split('T')[0];

      // Write updated spec
      await writeLivingDocsSpec(livingDocsPath, livingSpec);

      console.log(`   ✅ Merged ${newStoriesCount} new user stories into living docs`);
      console.log(`   ✅ Updated implementation history for ${incrementId}`);

    } else {
      console.log(`   📝 Creating new living docs spec: ${specId}`);

      // CREATE MODE: First increment for this spec
      const relatedDocs = generateRelatedDocsLinks(incrementSpec, projectRoot);

      const livingSpec = {
        id: specId,
        title: incrementSpec.title,
        featureArea: extractFeatureArea(incrementSpec.title),
        overview: incrementSpec.overview,
        userStories: incrementSpec.userStories.map(story => ({
          ...story,
          implementedIn: incrementId,
          status: 'complete' as const,
        })),
        implementationHistory: [
          {
            increment: incrementId,
            stories: incrementSpec.userStories.map(s => s.id),
            status: 'complete' as const,
            date: new Date().toISOString().split('T')[0],
          },
        ],
        relatedDocs,
        externalLinks: {} as { github?: string; jira?: string; ado?: string },
        priority: incrementSpec.priority,
        status: 'active',
        created: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      // Ensure directory exists
      await fs.ensureDir(livingDocsDir);

      // Write new spec
      await writeLivingDocsSpec(livingDocsPath, livingSpec);

      console.log(`   ✅ Created new living docs spec: ${specId}`);
      console.log(`   ✅ Added ${incrementSpec.userStories.length} user stories`);
      console.log(`   ✅ Generated links to ${relatedDocs.architecture.length} architecture docs`);
      console.log(`   ✅ Generated links to ${relatedDocs.adrs.length} ADRs`);
    }

    return true;

  } catch (error) {
    console.error(`❌ Error extracting/merging living docs: ${error}`);
    console.error((error as Error).stack);
    return false;
  }
}

/**
 * Extract feature area from title
 */
function extractFeatureArea(title: string): string {
  // Simple heuristic: Use title as feature area
  // Can be customized later based on keywords
  return title.replace(/^(Increment \d+:\s*)?/, '').trim();
}

/**
 * Copy increment spec to living docs (DEPRECATED - use extractAndMergeLivingDocs instead)
 * Returns true if spec was copied, false if skipped
 */
async function copyIncrementSpecToLivingDocs(incrementId: string): Promise<boolean> {
  console.warn('⚠️  Using deprecated copyIncrementSpecToLivingDocs (simple mode)');
  console.warn('   Consider enabling intelligent mode to avoid duplication');

  try {
    const incrementSpecPath = path.join(process.cwd(), '.specweave', 'increments', incrementId, 'spec.md');
    const livingDocsPath = path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs', `spec-${incrementId}.md`);

    // Check if increment spec exists
    if (!fs.existsSync(incrementSpecPath)) {
      console.log(`⚠️  Increment spec not found: ${incrementSpecPath}`);
      return false;
    }

    // Check if living docs spec already exists and is identical
    if (fs.existsSync(livingDocsPath)) {
      const incrementContent = await fs.readFile(incrementSpecPath, 'utf-8');
      const livingDocsContent = await fs.readFile(livingDocsPath, 'utf-8');

      if (incrementContent === livingDocsContent) {
        console.log(`ℹ️  Living docs spec already up-to-date: spec-${incrementId}.md`);
        return false;
      }
    }

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(livingDocsPath));

    // Copy spec to living docs
    await fs.copy(incrementSpecPath, livingDocsPath);

    console.log(`✅ Copied increment spec to living docs: spec-${incrementId}.md`);
    return true;

  } catch (error) {
    console.error(`❌ Error copying increment spec: ${error}`);
    return false;
  }
}

/**
 * Detect changed documentation files via git diff
 */
function detectChangedDocs(): string[] {
  try {
    // Get changed files in .specweave/docs/
    const output = execSync('git diff --name-only .specweave/docs/ 2>/dev/null || true', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    if (!output) {
      return [];
    }

    // Filter to only .md files
    const files = output
      .split('\n')
      .filter((f) => f.endsWith('.md'))
      .filter((f) => f.length > 0);

    return files;
  } catch (error) {
    console.warn('⚠️  Could not detect git changes:', error);
    return [];
  }
}

/**
 * Sync changed docs to GitHub
 */
async function syncToGitHub(incrementId: string, changedDocs: string[]): Promise<void> {
  try {
    console.log('\n🔄 Syncing to GitHub...');

    // Dynamic import to avoid circular dependencies
    const {
      loadIncrementMetadata,
      detectRepo,
      collectLivingDocs,
      updateIssueLivingDocs,
      postArchitectureComment
    } = await import('../../../specweave-github/lib/github-issue-updater.js');

    // 1. Load metadata
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log('ℹ️  No GitHub issue linked, skipping GitHub sync');
      return;
    }

    // 2. Detect repository
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log('⚠️  Could not detect GitHub repository, skipping GitHub sync');
      return;
    }

    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;

    console.log(`   Syncing to ${owner}/${repo}#${issueNumber}`);

    // 3. Collect all living docs
    const livingDocs = await collectLivingDocs(incrementId);

    // 4. Update issue with living docs section
    if (livingDocs.specs.length > 0 || livingDocs.architecture.length > 0 || livingDocs.diagrams.length > 0) {
      await updateIssueLivingDocs(issueNumber, livingDocs, owner, repo);
    }

    // 5. Post comments for newly created architecture docs
    for (const docPath of changedDocs) {
      if (docPath.includes('/architecture/')) {
        await postArchitectureComment(issueNumber, docPath, owner, repo);
      }
    }

    console.log('✅ GitHub sync complete');

  } catch (error) {
    console.error('❌ Error syncing to GitHub:', error);
    console.error('   (Non-blocking - continuing...)');
  }
}

// CLI entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('❌ Usage: sync-living-docs <incrementId>');
    console.error('   Example: sync-living-docs 0006-llm-native-i18n');
    process.exit(1);
  }

  syncLivingDocs(incrementId).catch((error) => {
    console.error('❌ Fatal error:', error);
    // Don't exit with error code - best-effort sync
  });
}

export { syncLivingDocs };
