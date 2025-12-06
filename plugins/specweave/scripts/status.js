#!/usr/bin/env node
/**
 * Instant Increment Status Overview
 *
 * Executed by UserPromptSubmit hook for /specweave:status
 * Bypasses LLM entirely - output shown directly to user
 *
 * Usage: node status.js [--help]
 */

import fs from 'fs';
import path from 'path';

// Handle --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SpecWeave Instant Status

USAGE
  node plugins/specweave/scripts/status.js [options]
  specweave status [options]

OPTIONS
  --help, -h     Show this help message

DESCRIPTION
  Shows increment status overview grouped by status (active, paused, completed, etc.).
  This script bypasses LLM processing for instant results (<100ms).

EXECUTION PATHS
  1. Claude Code:  /specweave:status  (hook intercepts, <100ms)
  2. Any LLM:      Skill instructs to run this script (~2s)
  3. Terminal:     specweave status (~500ms)

EXAMPLES
  node plugins/specweave/scripts/status.js
  specweave status
  specweave status --verbose
`);
  process.exit(0);
}

const cwd = process.cwd();
const incrementsDir = path.join(cwd, '.specweave/increments');
const archiveDir = path.join(incrementsDir, '_archive');

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

// Count archived
let archivedCount = 0;
if (fs.existsSync(archiveDir)) {
  const archived = fs.readdirSync(archiveDir, { withFileTypes: true });
  archivedCount = archived.filter(e => e.isDirectory() && /^\d{4}/.test(e.name)).length;
}

// Parse increment status
function getStatus(folder) {
  const metaPath = path.join(incrementsDir, folder, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return meta.status || 'unknown';
    } catch {}
  }
  return 'unknown';
}

// Group by status
const byStatus = {};
for (const folder of incrementFolders) {
  const status = getStatus(folder);
  if (!byStatus[status]) byStatus[status] = [];
  byStatus[status].push(folder);
}

// Display
console.log('\n📋 SpecWeave Status Overview\n');

const statusOrder = ['active', 'planning', 'in-progress', 'ready_for_review', 'paused', 'backlog', 'completed', 'abandoned'];
const statusIcons = {
  'active': '🔄',
  'planning': '📝',
  'in-progress': '⚙️',
  'ready_for_review': '👀',
  'paused': '⏸️',
  'backlog': '📋',
  'completed': '✅',
  'abandoned': '❌'
};

let hasOutput = false;

for (const status of statusOrder) {
  const items = byStatus[status];
  if (items && items.length > 0) {
    hasOutput = true;
    const icon = statusIcons[status] || '•';
    console.log(`${icon} ${status.replace('_', ' ')} (${items.length}):`);
    
    // Show first 5, summarize rest
    const toShow = items.slice(0, 5);
    for (const item of toShow) {
      console.log(`   ${item}`);
    }
    if (items.length > 5) {
      console.log(`   ... and ${items.length - 5} more`);
    }
    console.log('');
  }
}

// Handle unknown statuses
for (const status of Object.keys(byStatus)) {
  if (!statusOrder.includes(status)) {
    const items = byStatus[status];
    if (items.length > 0) {
      hasOutput = true;
      console.log(`? ${status} (${items.length}):`);
      for (const item of items.slice(0, 3)) {
        console.log(`   ${item}`);
      }
      console.log('');
    }
  }
}

if (!hasOutput) {
  console.log('No increments found.');
}

// Summary line
const total = incrementFolders.length;
const activeCount = (byStatus['active']?.length || 0) + 
                   (byStatus['planning']?.length || 0) + 
                   (byStatus['in-progress']?.length || 0);
const completedCount = byStatus['completed']?.length || 0;

console.log('─'.repeat(40));
console.log(`Total: ${total} increment(s) | Active: ${activeCount} | Completed: ${completedCount} | Archived: ${archivedCount}`);
console.log('');
console.log('💡 Commands:');
console.log('   /specweave:progress        Show task progress');
console.log('   /specweave:do              Execute current tasks');
console.log('   /specweave:done <id>       Close increment');
