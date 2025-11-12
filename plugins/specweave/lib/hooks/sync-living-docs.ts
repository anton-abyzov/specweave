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
      // Simple mode: Copy spec to living docs (legacy)
      console.log('📋 Using simple sync mode (legacy)');
      specCopied = await copyIncrementSpecToLivingDocs(incrementId);
      changedDocs = detectChangedDocs();
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
 */
async function intelligentSyncLivingDocs(
  incrementId: string,
  config: Config
): Promise<{ success: boolean; changedFiles: string[] }> {
  try {
    // Dynamic import to avoid circular dependencies
    const { syncIncrement } = await import('../../../../src/core/living-docs/index.js');

    console.log('   📖 Parsing and classifying spec sections...');

    const result = await syncIncrement(incrementId, {
      verbose: false, // We'll log our own summary
      dryRun: false,
      parser: {
        preserveCodeBlocks: true,
        preserveLinks: true,
        preserveImages: true,
      },
      distributor: {
        generateFrontmatter: true,
        preserveOriginal: config.livingDocs?.intelligent?.preserveOriginal ?? true,
      },
      linker: {
        generateBacklinks: config.livingDocs?.intelligent?.generateCrossLinks ?? true,
        updateExisting: true,
      },
    });

    // Log summary
    console.log(`   ✅ Intelligent sync complete:`);
    console.log(`      Project: ${result.project.name} (${(result.project.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`      Files created: ${result.distribution.summary.filesCreated}`);
    console.log(`      Files updated: ${result.distribution.summary.filesUpdated}`);
    console.log(`      Cross-links: ${result.links.length}`);
    console.log(`      Duration: ${result.duration}ms`);

    // Collect changed file paths
    const changedFiles = [
      ...result.distribution.created.map((f) => f.path),
      ...result.distribution.updated.map((f) => f.path),
    ];

    return {
      success: result.success,
      changedFiles,
    };
  } catch (error) {
    console.error(`   ❌ Intelligent sync failed: ${error}`);
    console.error('   Falling back to simple sync mode...');

    // Fallback to simple mode
    const copied = await copyIncrementSpecToLivingDocs(incrementId);
    return {
      success: copied,
      changedFiles: copied ? [path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs', `spec-${incrementId}.md`)] : [],
    };
  }
}

/**
 * Copy increment spec to living docs (legacy/simple mode)
 * Returns true if spec was copied, false if skipped
 */
async function copyIncrementSpecToLivingDocs(incrementId: string): Promise<boolean> {
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
