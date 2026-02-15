#!/usr/bin/env node
/**
 * Instant Increment Progress (Node.js fallback)
 *
 * Executed by UserPromptSubmit hook for /sw:progress when jq is unavailable.
 * Reads files directly (no cache needed). Bypasses LLM entirely.
 *
 * Usage: node progress.js [incrementId] [--help]
 */

import fs from 'fs';
import path from 'path';

// Handle --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SpecWeave Instant Progress

USAGE
  node plugins/specweave/scripts/progress.js [incrementId] [options]
  specweave status --verbose

OPTIONS
  --help, -h     Show this help message
  [incrementId]  Show progress for specific increment (e.g., 0045)

DESCRIPTION
  Shows task completion progress for active increments with visual progress bars.
  This script bypasses LLM processing for instant results (<100ms).

EXECUTION PATHS
  1. Claude Code:  /sw:progress  (hook intercepts, <100ms)
  2. Any LLM:      Skill instructs to run this script (~2s)
  3. Terminal:     specweave status --verbose (~500ms)

EXAMPLES
  node plugins/specweave/scripts/progress.js
  node plugins/specweave/scripts/progress.js 0045
  specweave status --verbose
`);
  process.exit(0);
}

const cwd = process.cwd();
const incrementsDir = path.join(cwd, '.specweave/increments');
const args = process.argv.slice(2);
const specificId = args[0];

// Check if increments directory exists
if (!fs.existsSync(incrementsDir)) {
  console.log('No SpecWeave project found (missing .specweave/increments/)');
  process.exit(0);
}

// Find increments
const entries = fs.readdirSync(incrementsDir, { withFileTypes: true });
const incrementFolders = entries
  .filter(e => e.isDirectory() && !e.name.startsWith('_') && /^\d{4}/.test(e.name))
  .map(e => e.name);

if (incrementFolders.length === 0) {
  console.log('No increments found.');
  process.exit(0);
}

// Parse increment data
function parseIncrement(folder) {
  const metaPath = path.join(incrementsDir, folder, 'metadata.json');
  const tasksPath = path.join(incrementsDir, folder, 'tasks.md');
  const specPath = path.join(incrementsDir, folder, 'spec.md');

  let metadata = { status: 'unknown' };
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {}
  }

  let totalTasks = 0;
  let completedTasks = 0;

  if (fs.existsSync(tasksPath)) {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    const headingTasks = (content.match(/^#{2,} T-\d+/gm) || []).length;
    const checklistTasks = (content.match(/^- \[[x ]\] T-\d+/gm) || []).length;
    totalTasks = headingTasks + checklistTasks;

    const completedStatus = (content.match(/\*\*Status\*\*:\s*\[x\]/gi) || []).length;
    const completedDate = (content.match(/\*\*Completed\*\*:\s*\d/gi) || []).length;
    const completedChecklist = (content.match(/^- \[x\] T-\d+/gm) || []).length;
    completedTasks = completedStatus + completedDate + completedChecklist;
  }

  let totalAcs = 0;
  let completedAcs = 0;
  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const acMatches = specContent.match(/- \[.\] \*\*AC-/g);
    totalAcs = acMatches ? acMatches.length : 0;
    const acDone = specContent.match(/- \[x\] \*\*AC-/g);
    completedAcs = acDone ? acDone.length : 0;
  }

  // Get last activity from newest file mtime
  let lastActivity = 0;
  try {
    if (fs.existsSync(metaPath)) lastActivity = Math.max(lastActivity, fs.statSync(metaPath).mtimeMs);
    if (fs.existsSync(tasksPath)) lastActivity = Math.max(lastActivity, fs.statSync(tasksPath).mtimeMs);
    if (fs.existsSync(specPath)) lastActivity = Math.max(lastActivity, fs.statSync(specPath).mtimeMs);
  } catch {}

  return {
    id: folder,
    status: metadata.status || 'unknown',
    type: metadata.type || 'feature',
    priority: metadata.priority || 'P1',
    totalTasks,
    completedTasks,
    totalAcs,
    completedAcs,
    percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    lastActivity
  };
}

// Helpers
function createProgressBar(pct, width = 20) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function formatStatus(status) {
  const icons = {
    'active': '🔄 active',
    'planning': '📝 planning',
    'backlog': '📋 backlog',
    'ready_for_review': '👀 ready for review',
    'paused': '⏸️ paused',
    'completed': '✅ completed',
    'abandoned': '❌ abandoned'
  };
  return icons[status] || status;
}

// If specific increment requested
if (specificId) {
  const folder = incrementFolders.find(f => f === specificId || f.startsWith(specificId));
  if (!folder) {
    console.log(`Increment not found: ${specificId}`);
    process.exit(1);
  }

  const inc = parseIncrement(folder);
  const bar = createProgressBar(inc.percentage);

  console.log(`\n📊 Progress: ${inc.id}\n`);
  console.log(`Status: ${formatStatus(inc.status)}`);
  console.log(`Type: ${inc.type}`);
  console.log(`Tasks: ${inc.completedTasks}/${inc.totalTasks} (${inc.percentage}%)`);
  console.log(`Progress: ${bar}`);
  if (inc.totalAcs > 0) {
    const acPct = Math.round((inc.completedAcs / inc.totalAcs) * 100);
    console.log(`ACs: ${inc.completedAcs}/${inc.totalAcs} (${acPct}%)`);
  }
  process.exit(0);
}

// Show all active increments
const increments = incrementFolders.map(parseIncrement);

// Categorize increments
const needsClosure = increments
  .filter(i => ['active', 'planning', 'planned'].includes(i.status) && i.totalTasks > 0 && i.completedTasks === i.totalTasks)
  .sort((a, b) => b.lastActivity - a.lastActivity);

const readyForReview = increments
  .filter(i => i.status === 'ready_for_review')
  .sort((a, b) => b.lastActivity - a.lastActivity);

const active = increments
  .filter(i => ['active', 'planning', 'planned'].includes(i.status) &&
    (i.totalTasks > 0 || i.totalAcs > 0) &&
    !(i.totalTasks > 0 && i.completedTasks === i.totalTasks))
  .sort((a, b) => b.lastActivity - a.lastActivity);

const emptyActive = increments
  .filter(i => ['active', 'planning', 'planned'].includes(i.status) && i.totalTasks === 0 && i.totalAcs === 0);

const backlog = increments
  .filter(i => i.status === 'backlog')
  .sort((a, b) => b.lastActivity - a.lastActivity);

const paused = increments.filter(i => i.status === 'paused');

console.log('\n📊 Increment Progress\n');

// Section 1: Needs Closure
if (needsClosure.length > 0) {
  console.log('⚠️  Needs Closure (100% tasks done):');
  for (const inc of needsClosure) {
    console.log(`  ${inc.id} → /sw:done ${inc.id}`);
  }
  console.log('');
}

// Section 2: Ready for Review
if (readyForReview.length > 0) {
  console.log('👀 Ready for Review:');
  for (const inc of readyForReview) {
    const bar = createProgressBar(inc.percentage, 12);
    const priBadge = inc.priority === 'P0' ? '🔴' : inc.priority === 'P1' ? '🟠' : '';
    let acInfo = '';
    if (inc.totalAcs > 0) {
      const acPct = Math.round((inc.completedAcs / inc.totalAcs) * 100);
      acInfo = ` | ${inc.completedAcs}/${inc.totalAcs} ACs (${acPct}%)`;
    }
    console.log(`  ${priBadge} ${inc.id}`);
    console.log(`     ${bar} ${inc.completedTasks}/${inc.totalTasks} tasks${acInfo}`);
    console.log(`     → /sw:done ${inc.id}`);
  }
  console.log('');
}

// Section 3: Active (with work, not done, not empty)
if (active.length > 0) {
  console.log('🔄 Active:');
  for (const inc of active) {
    const bar = createProgressBar(inc.percentage, 12);
    const priBadge = inc.priority === 'P0' ? '🔴' : inc.priority === 'P1' ? '🟠' : '';
    const statusInd = ['planning', 'planned'].includes(inc.status) ? ' (📝 planning)' : '';
    let acInfo = '';
    if (inc.totalAcs > 0) {
      const acPct = Math.round((inc.completedAcs / inc.totalAcs) * 100);
      acInfo = ` | ${inc.completedAcs}/${inc.totalAcs} ACs (${acPct}%)`;
    }
    console.log(`  ${priBadge} ${inc.id}${statusInd}`);
    console.log(`     ${bar} ${inc.completedTasks}/${inc.totalTasks} tasks${acInfo}`);
  }
  console.log('');
}

// Section 4: Planning (no tasks) — collapsed
if (emptyActive.length > 0) {
  const ids = emptyActive.map(i => i.id).join(', ');
  console.log(`📝 Planning (no tasks): ${ids}`);
  console.log('');
}

// Section 5: Backlog
if (backlog.length > 0) {
  console.log('📋 Backlog:');
  for (const inc of backlog) {
    const priBadge = inc.priority === 'P0' ? '🔴' : inc.priority === 'P1' ? '🟠' : '';
    console.log(`  ${priBadge} ${inc.id} - ${inc.percentage}% planned`);
  }
  console.log('');
}

// Section 6: Paused
if (paused.length > 0) {
  console.log(`⏸️  Paused (${paused.length}):`);
  for (const inc of paused) {
    console.log(`  ${inc.id} - ${inc.percentage}% tasks`);
  }
  console.log('');
}

// Summary
const totalActionable = needsClosure.length + readyForReview.length + active.length + emptyActive.length + backlog.length + paused.length;
if (totalActionable > 0) {
  console.log('─'.repeat(40));
  const parts = [];
  if (needsClosure.length > 0) parts.push(`${needsClosure.length} needs closure`);
  if (readyForReview.length > 0) parts.push(`${readyForReview.length} ready for review`);
  if (active.length > 0) parts.push(`${active.length} active`);
  if (emptyActive.length > 0) parts.push(`${emptyActive.length} planning`);
  if (backlog.length > 0) parts.push(`${backlog.length} backlog`);
  if (paused.length > 0) parts.push(`${paused.length} paused`);
  console.log(`Summary: ${parts.join(', ')}`);
  console.log('');

  if (needsClosure.length > 0) {
    console.log('💡 Run /sw:done <id> to close completed increments');
  } else if (readyForReview.length > 0) {
    console.log('💡 Run /sw:done <id> to close reviewed increments');
  } else {
    console.log('💡 For details: /sw:progress <incrementId>');
  }
} else {
  console.log('No active increments.');
  const completed = increments.filter(i => i.status === 'completed');
  if (completed.length > 0) {
    console.log(`${completed.length} completed increment(s).`);
  }
  console.log('');
  console.log('💡 Run /sw:increment to start new work');
}
