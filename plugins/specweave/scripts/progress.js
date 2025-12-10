#!/usr/bin/env node
/**
 * Instant Increment Progress
 *
 * Executed by UserPromptSubmit hook for /specweave:progress
 * Bypasses LLM entirely - output shown directly to user
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
  1. Claude Code:  /specweave:progress  (hook intercepts, <100ms)
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
    const taskMatches = content.match(/### T-\d+/g);
    totalTasks = taskMatches ? taskMatches.length : 0;
    
    const completedMatches = content.match(/\*\*Status\*\*:\s*\[x\]/gi);
    completedTasks = completedMatches ? completedMatches.length : 0;
  }
  
  return {
    id: folder,
    status: metadata.status || 'unknown',
    type: metadata.type || 'feature',
    totalTasks,
    completedTasks,
    percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
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
  process.exit(0);
}

// Show all active increments
const increments = incrementFolders.map(parseIncrement);
const readyForReview = increments.filter(i => i.status === 'ready_for_review');
const active = increments.filter(i => ['active', 'planning', 'backlog'].includes(i.status));
const paused = increments.filter(i => i.status === 'paused');

console.log('\n📊 Increment Progress\n');

// Show ready_for_review FIRST (needs attention!)
if (readyForReview.length > 0) {
  console.log(`👀 Ready for Review (${readyForReview.length}):`);
  for (const inc of readyForReview) {
    const bar = createProgressBar(inc.percentage, 15);
    console.log(`  ${inc.id}`);
    console.log(`     ${bar} ${inc.completedTasks}/${inc.totalTasks} (${inc.percentage}%)`);
    console.log(`     → /specweave:done ${inc.id}`);
  }
  console.log('');
}

if (active.length > 0) {
  console.log(`🔄 Active (${active.length}):`);
  for (const inc of active) {
    const bar = createProgressBar(inc.percentage, 15);
    console.log(`  ${inc.id}`);
    console.log(`     ${bar} ${inc.completedTasks}/${inc.totalTasks} (${inc.percentage}%)`);
  }
  console.log('');
}

if (paused.length > 0) {
  console.log(`⏸️  Paused (${paused.length}):`);
  for (const inc of paused) {
    console.log(`  ${inc.id} - ${inc.percentage}%`);
  }
  console.log('');
}

// Summary section
if (readyForReview.length > 0 || active.length > 0 || paused.length > 0) {
  console.log('─'.repeat(40));
  const parts = [];
  if (readyForReview.length > 0) parts.push(`${readyForReview.length} ready for review`);
  if (active.length > 0) parts.push(`${active.length} active`);
  if (paused.length > 0) parts.push(`${paused.length} paused`);
  console.log(`Summary: ${parts.join(', ')}`);
  console.log('');

  if (readyForReview.length > 0) {
    console.log('💡 Run /specweave:done <id> to close reviewed increments');
  } else {
    console.log('💡 For details: /specweave:progress <incrementId>');
  }
} else {
  console.log('No active increments.');
  const completed = increments.filter(i => i.status === 'completed');
  if (completed.length > 0) {
    console.log(`${completed.length} completed increment(s).`);
  }
  console.log('');
  console.log('💡 Run /specweave:increment to start new work');
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
