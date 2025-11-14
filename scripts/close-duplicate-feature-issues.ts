#!/usr/bin/env tsx
/**
 * Close Duplicate Feature Issues
 *
 * Finds and closes duplicate [FS-*] issues, keeping only the most recent one.
 */

import { execFileSync } from 'child_process';

interface Issue {
  number: number;
  title: string;
  state: string;
  createdAt: string;
}

function main() {
  console.log('\n🔍 Finding duplicate [FS-*] issues...\n');

  // Get all [FS-*] issues
  const output = execFileSync(
    'gh',
    ['issue', 'list', '--json', 'number,title,state,createdAt', '--limit', '100', '--state', 'all'],
    { encoding: 'utf-8' }
  );

  const allIssues = JSON.parse(output) as Issue[];
  const fsIssues = allIssues.filter(i => i.title.startsWith('[FS-'));

  // Group by title
  const grouped = new Map<string, Issue[]>();
  for (const issue of fsIssues) {
    if (!grouped.has(issue.title)) {
      grouped.set(issue.title, []);
    }
    grouped.get(issue.title)!.push(issue);
  }

  // Find duplicates
  const toClose: Array<{ number: number; title: string; kept: number }> = [];

  for (const [title, issues] of grouped.entries()) {
    if (issues.length > 1) {
      // Sort by creation date (newest first)
      issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const [keep, ...close] = issues;

      // Only close OPEN duplicates
      const openDuplicates = close.filter(i => i.state === 'OPEN');

      for (const issue of openDuplicates) {
        toClose.push({
          number: issue.number,
          title: issue.title,
          kept: keep.number
        });
      }
    }
  }

  console.log(`📊 Analysis:`);
  console.log(`   Total [FS-*] issues: ${fsIssues.length}`);
  console.log(`   Unique titles: ${grouped.size}`);
  console.log(`   Duplicates to close: ${toClose.length}\n`);

  if (toClose.length === 0) {
    console.log('✅ No duplicates found!\n');
    return;
  }

  console.log('🔧 Closing duplicate issues:\n');

  for (const { number, title, kept } of toClose) {
    console.log(`   Closing #${number} (keeping #${kept})`);
    console.log(`      ${title}`);

    try {
      execFileSync(
        'gh',
        [
          'issue',
          'close',
          number.toString(),
          '--reason',
          'not planned',
          '--comment',
          `❌ Duplicate issue. Keeping #${kept} as the canonical issue for this feature.`
        ],
        { stdio: 'inherit' }
      );
    } catch (error: any) {
      console.error(`   ❌ Failed to close #${number}: ${error.message}`);
    }

    console.log();
  }

  console.log(`✅ Cleanup complete!\n`);
}

main();
