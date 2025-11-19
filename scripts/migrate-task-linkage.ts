#!/usr/bin/env tsx
/**
 * Migration Script: Add US-Task Linkage to Existing Increments
 *
 * Automatically infers User Story linkage for tasks using:
 * 1. AC-IDs mentioned in task descriptions (high confidence)
 * 2. Keyword matching with US titles (medium confidence)
 * 3. File path overlap with US scope (lower confidence)
 *
 * Usage:
 *   npx tsx scripts/migrate-task-linkage.ts <increment-id> [--dry-run] [--interactive]
 *
 * Examples:
 *   npx tsx scripts/migrate-task-linkage.ts 0043 --dry-run
 *   npx tsx scripts/migrate-task-linkage.ts 0044 --interactive
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { parseSpecContent, type SpecUserStory, type SpecAcceptanceCriterion } from '../dist/src/core/spec-content-sync.js';
import { parseTasksWithUSLinks, getAllTasks, type Task } from '../dist/src/generators/spec/task-parser.js';

interface InferenceResult {
  taskId: string;
  suggestedUS: string | null;
  suggestedACs: string[];
  confidence: number;
  reasoning: string[];
}

interface MigrationOptions {
  dryRun: boolean;
  interactive: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-apply
}

/**
 * Infer User Story linkage for a task
 */
function inferUSLinkage(
  task: Task,
  userStories: SpecUserStory[],
  projectRoot: string
): InferenceResult {
  const reasoning: string[] = [];
  let confidence = 0;
  let suggestedUS: string | null = null;
  const suggestedACs: string[] = [];

  // STRATEGY 1: AC-IDs in description (highest confidence: 95)
  const acMatches = task.description.match(/AC-US(\d+)-\d+/g);
  if (acMatches && acMatches.length > 0) {
    const acIds = [...new Set(acMatches)]; // Remove duplicates
    const usNumbers = acIds.map((ac) => ac.match(/AC-US(\d+)-/)![1]);
    const mostCommonUS = mode(usNumbers);

    suggestedUS = `US-${mostCommonUS.padStart(3, '0')}`;
    suggestedACs.push(...acIds);
    confidence = 95;
    reasoning.push(`Found ${acIds.length} AC references: ${acIds.join(', ')}`);
    return { taskId: task.id, suggestedUS, suggestedACs, confidence, reasoning };
  }

  // STRATEGY 2: Keyword matching with US titles (medium confidence: 75)
  const taskKeywords = extractKeywords(task.title + ' ' + task.description);
  let bestMatch: { us: SpecUserStory; score: number } | null = null;

  for (const us of userStories) {
    const usKeywords = extractKeywords(us.title);
    const matchScore = calculateKeywordOverlap(taskKeywords, usKeywords);
    if (matchScore > 0.3 && (!bestMatch || matchScore > bestMatch.score)) {
      bestMatch = { us, score: matchScore };
    }
  }

  if (bestMatch) {
    suggestedUS = bestMatch.us.id;
    suggestedACs.push(...bestMatch.us.acceptanceCriteria.map((ac) => ac.id));
    confidence = Math.round(bestMatch.score * 100);
    reasoning.push(
      `Keyword match with "${bestMatch.us.title}" (${Math.round(bestMatch.score * 100)}% overlap)`
    );
    return { taskId: task.id, suggestedUS, suggestedACs, confidence, reasoning };
  }

  // STRATEGY 3: File path overlap (lower confidence: 60)
  if (task.filesAffected && task.filesAffected.length > 0) {
    for (const us of userStories) {
      // Check if US mentions same files in its description or ACs
      const usText = us.title + ' ' + us.acceptanceCriteria.map((ac) => ac.description).join(' ');
      const fileOverlap = task.filesAffected.filter((file) =>
        usText.toLowerCase().includes(path.basename(file).toLowerCase())
      );

      if (fileOverlap.length > 0) {
        suggestedUS = us.id;
        confidence = 60;
        reasoning.push(`File path overlap: ${fileOverlap.join(', ')}`);
        return { taskId: task.id, suggestedUS, suggestedACs: [], confidence, reasoning };
      }
    }
  }

  // No match found
  reasoning.push('Could not confidently infer US linkage - needs manual review');
  return { taskId: task.id, suggestedUS: null, suggestedACs: [], confidence: 0, reasoning };
}

/**
 * Extract keywords from text (lowercase, remove stop words)
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'can',
    'could',
    'may',
    'might',
    'must',
    'shall',
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

/**
 * Calculate keyword overlap score (0-1)
 */
function calculateKeywordOverlap(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find most common element in array
 */
function mode(arr: string[]): string {
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let result = arr[0];

  for (const val of arr) {
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) {
      maxCount = counts[val];
      result = val;
    }
  }

  return result;
}

/**
 * Apply migration to tasks.md
 */
async function applyMigration(
  incrementPath: string,
  inferences: InferenceResult[],
  options: MigrationOptions
): Promise<void> {
  const tasksPath = path.join(incrementPath, 'tasks.md');
  let content = await fs.readFile(tasksPath, 'utf-8');

  for (const inference of inferences) {
    if (!inference.suggestedUS) continue;
    if (inference.confidence < options.confidenceThreshold) continue;

    // Find task section
    const taskRegex = new RegExp(`(### ${inference.taskId}:[^#]+)(\\n\\*\\*Description\\*\\*)`, 's');
    const match = content.match(taskRegex);

    if (match) {
      const taskHeader = match[1];
      const newFields = [
        `**User Story**: ${inference.suggestedUS}`,
        inference.suggestedACs.length > 0
          ? `**Satisfies ACs**: ${inference.suggestedACs.join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      const replacement = `${taskHeader}\n${newFields}\n\n**Description**`;
      content = content.replace(taskRegex, replacement);
    }
  }

  if (!options.dryRun) {
    await fs.writeFile(tasksPath, content, 'utf-8');
  }
}

/**
 * Main migration function
 */
async function migrateIncrement(
  incrementId: string,
  options: MigrationOptions
): Promise<void> {
  const projectRoot = process.cwd();
  const incrementPath = path.join(projectRoot, '.specweave/increments', incrementId);

  console.log(chalk.blue(`\n📦 Migrating increment: ${incrementId}\n`));

  // 1. Parse spec.md
  const specPath = path.join(incrementPath, 'spec.md');
  if (!await fs.pathExists(specPath)) {
    console.log(chalk.yellow(`⚠️  No spec.md found - skipping`));
    return;
  }

  const spec = await parseSpecContent(specPath);
  if (!spec || spec.userStories.length === 0) {
    console.log(chalk.yellow(`⚠️  No User Stories found in spec.md - skipping`));
    return;
  }

  console.log(chalk.green(`✓ Found ${spec.userStories.length} User Stories in spec.md`));

  // 2. Parse tasks.md
  const tasksPath = path.join(incrementPath, 'tasks.md');
  if (!await fs.pathExists(tasksPath)) {
    console.log(chalk.yellow(`⚠️  No tasks.md found - skipping`));
    return;
  }

  const tasksByUS = await parseTasksWithUSLinks(tasksPath);
  const tasks = getAllTasks(tasksByUS);
  const tasksNeedingMigration = tasks.filter((t) => !t.userStory);

  console.log(
    chalk.green(`✓ Found ${tasks.length} tasks, ${tasksNeedingMigration.length} need migration`)
  );

  if (tasksNeedingMigration.length === 0) {
    console.log(chalk.green(`✓ All tasks already have US linkage - nothing to migrate`));
    return;
  }

  // 3. Infer linkages
  console.log(chalk.blue(`\n🔍 Inferring US linkages...\n`));
  const inferences: InferenceResult[] = [];

  for (const task of tasksNeedingMigration) {
    const inference = inferUSLinkage(task, spec.userStories, projectRoot);
    inferences.push(inference);

    // Display inference
    const confidenceColor =
      inference.confidence >= 80
        ? chalk.green
        : inference.confidence >= 50
          ? chalk.yellow
          : chalk.red;

    console.log(`${task.id}: ${task.title}`);
    if (inference.suggestedUS) {
      console.log(
        `  → ${confidenceColor(`${inference.suggestedUS} (${inference.confidence}% confidence)`)}`
      );
      if (inference.suggestedACs.length > 0) {
        console.log(`  → ACs: ${inference.suggestedACs.join(', ')}`);
      }
    } else {
      console.log(chalk.red(`  → No suggestion (manual review required)`));
    }
    console.log(chalk.gray(`     ${inference.reasoning.join('; ')}\n`));
  }

  // 4. Apply migration
  const highConfidence = inferences.filter((i) => i.confidence >= options.confidenceThreshold);
  const needsReview = inferences.filter((i) => i.confidence < options.confidenceThreshold);

  console.log(chalk.blue(`\n📝 Migration Summary:\n`));
  console.log(`  Auto-apply (≥${options.confidenceThreshold}% confidence): ${highConfidence.length}`);
  console.log(`  Needs manual review: ${needsReview.length}`);

  if (options.dryRun) {
    console.log(chalk.yellow(`\n🔍 DRY RUN - No changes written\n`));
  } else {
    await applyMigration(incrementPath, inferences, options);
    console.log(chalk.green(`\n✅ Migration applied successfully!\n`));
  }

  if (needsReview.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Manual review needed for:`));
    for (const inf of needsReview) {
      console.log(`  - ${inf.taskId}: ${chalk.gray(inf.reasoning[0])}`);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const incrementId = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const interactive = args.includes('--interactive');
  const confidenceThreshold = parseInt(
    args.find((a) => a.startsWith('--threshold='))?.split('=')[1] || '75'
  );

  if (!incrementId) {
    console.error(chalk.red('Error: Increment ID required'));
    console.log('Usage: npx tsx scripts/migrate-task-linkage.ts <increment-id> [options]');
    console.log('Options:');
    console.log('  --dry-run           Show changes without applying');
    console.log('  --interactive       Prompt for manual review (not yet implemented)');
    console.log('  --threshold=N       Confidence threshold for auto-apply (default: 75)');
    process.exit(1);
  }

  migrateIncrement(incrementId, { dryRun, interactive, confidenceThreshold })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    });
}

export { inferUSLinkage, migrateIncrement, type InferenceResult, type MigrationOptions };
