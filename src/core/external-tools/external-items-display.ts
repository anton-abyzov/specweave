/**
 * External Items Display Utilities - OPTIMIZED FOR SCALE
 *
 * Compact formats for 1000+ items:
 * - Status: "📋 EXT: 1.2k" (super compact)
 * - Summary: "GH:450 JI:380 ADO:417"
 * - Details: Paginated table
 */

import chalk from 'chalk';
import {
  ExternalItemsCounts,
  ExternalItemsSummary,
  ExternalItem,
  PaginatedItemsResult,
  STALE_THRESHOLD_DAYS,
} from './types.js';

/**
 * Format large numbers compactly (1234 -> "1.2k")
 */
function formatCount(n: number): string {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  } else if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
function formatAge(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ============================================================================
// TIER 1: Super compact for status line
// ============================================================================

/**
 * Format: "📋 1.2k" or "📋 4" - for status line
 */
export function formatCompactCount(counts: ExternalItemsCounts): string {
  if (counts.grandTotal === 0) return '';
  return `📋 ${formatCount(counts.grandTotal)}`;
}

// ============================================================================
// TIER 2: Brief summary for status command section
// ============================================================================

/**
 * Format: "GH:450 JI:380 ADO:417"
 */
export function formatBriefSummary(counts: ExternalItemsCounts): string {
  const parts: string[] = [];

  if (counts.github.configured && counts.github.total > 0) {
    parts.push(`GH:${formatCount(counts.github.total)}`);
  }
  if (counts.jira.configured && counts.jira.total > 0) {
    parts.push(`JI:${formatCount(counts.jira.total)}`);
  }
  if (counts.ado.configured && counts.ado.total > 0) {
    parts.push(`ADO:${formatCount(counts.ado.total)}`);
  }

  return parts.join(' ');
}

/**
 * Display external items section for status command
 * Shows: 📋 External: 1.2k open (GH:450 JI:380 ADO:417)
 */
export function displayStatusSection(summary: ExternalItemsSummary): void {
  const hasAny = summary.github.configured || summary.jira.configured || summary.ado.configured;
  if (!hasAny) return;

  const total = summary.grandTotal;
  if (total === 0) {
    console.log(chalk.gray('📋 External: 0 open'));
    return;
  }

  const breakdown = formatBriefSummary(summary);
  const countText = formatCount(total);

  console.log(chalk.cyan.bold(`📋 External: ${countText} open`) + chalk.gray(` (${breakdown})`));

  // Show hint for large counts
  if (total > 50) {
    console.log(chalk.gray(`   Run /sw:external for details (paginated)`));
  }
  console.log('');
}

// ============================================================================
// TIER 3: Detailed dashboard (paginated)
// ============================================================================

/**
 * Display paginated items result
 */
export function displayPaginatedItems(result: PaginatedItemsResult, provider: string): void {
  const divider = '─'.repeat(65);

  console.log(chalk.cyan.bold(`\n${provider} Items (${result.total} total, page ${result.page}/${result.totalPages})`));
  console.log(chalk.gray(divider));

  if (result.items.length === 0) {
    console.log(chalk.gray('  No items found'));
  } else {
    for (const item of result.items) {
      const staleMarker = item.isStale ? chalk.yellow(' ⚠️') : '';
      const ageText = chalk.gray(formatAge(item.age));

      // Truncate title if too long
      const maxLen = 42;
      const title = item.title.length > maxLen
        ? item.title.slice(0, maxLen - 3) + '...'
        : item.title;

      console.log(`  ${chalk.white(item.id.padEnd(8))} ${title.padEnd(maxLen)} ${ageText}${staleMarker}`);
    }
  }

  console.log(chalk.gray(divider));

  if (result.hasMore) {
    const nextOffset = result.page * result.pageSize;
    console.log(chalk.gray(`Page ${result.page}/${result.totalPages} | Next: --offset ${nextOffset}`));
  }
  console.log('');
}

/**
 * Display summary dashboard header
 */
export function displayDashboardHeader(summary: ExternalItemsSummary): void {
  const divider = '═'.repeat(65);

  console.log(chalk.cyan.bold(`\n${divider}`));
  console.log(chalk.cyan.bold('                    External Items Dashboard'));
  console.log(chalk.cyan.bold(divider));
  console.log('');

  // Summary line
  const total = summary.grandTotal;
  console.log(chalk.white.bold(`Total: ${formatCount(total)} open items`));
  console.log('');

  // Provider breakdown
  if (summary.github.configured) {
    const count = formatCount(summary.github.total);
    console.log(`  GitHub:  ${count} issues`);
  } else {
    console.log(chalk.gray('  GitHub:  not configured'));
  }

  if (summary.jira.configured) {
    const count = formatCount(summary.jira.total);
    console.log(`  JIRA:    ${count} issues`);
  } else {
    console.log(chalk.gray('  JIRA:    not configured'));
  }

  if (summary.ado.configured) {
    const count = formatCount(summary.ado.total);
    console.log(`  ADO:     ${count} work items`);
  } else {
    console.log(chalk.gray('  ADO:     not configured'));
  }

  console.log('');

  // Usage hints
  if (total > 0) {
    console.log(chalk.gray('View items:'));
    console.log(chalk.gray('  /sw:external --provider github --limit 20'));
    console.log(chalk.gray('  /sw:external --provider jira --offset 20'));
  }

  // Last updated
  const lastUpdated = new Date(summary.lastUpdated);
  const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
  const timeAgo = minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`;
  console.log(chalk.gray(`\nLast updated: ${timeAgo} (--refresh to update)`));
  console.log('');
}

/**
 * Format notification for increment planning
 */
export function formatPlanningNotification(counts: ExternalItemsCounts): string | null {
  if (counts.grandTotal === 0) return null;
  return `⚠️ ${formatCount(counts.grandTotal)} unaddressed external items. Run /sw:external to view.`;
}

/**
 * Format progress footer line
 */
export function formatProgressFooter(counts: ExternalItemsCounts): string | null {
  if (counts.grandTotal === 0) return null;
  return `📋 ${formatCount(counts.grandTotal)} external items open`;
}
