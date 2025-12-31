#!/usr/bin/env node
/**
 * Instant Background Jobs Status
 *
 * Executed by UserPromptSubmit hook for /sw:jobs
 * Bypasses LLM entirely - output shown directly to user
 *
 * Usage: node jobs.js [--all] [--id <jobId>] [--help]
 */

import fs from 'fs';
import path from 'path';

// Handle --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SpecWeave Instant Jobs

USAGE
  node plugins/specweave/scripts/jobs.js [options]
  specweave jobs [options]

OPTIONS
  --help, -h     Show this help message
  --all          Show all jobs including completed
  --id <jobId>   Show details for specific job

DESCRIPTION
  Shows background job status (imports, cloning, sync operations).
  This script bypasses LLM processing for instant results (<100ms).

EXECUTION PATHS
  1. Claude Code:  /sw:jobs  (hook intercepts, <100ms)
  2. Any LLM:      Skill instructs to run this script (~2s)
  3. Terminal:     specweave jobs (~500ms)

EXAMPLES
  node plugins/specweave/scripts/jobs.js
  node plugins/specweave/scripts/jobs.js --all
  node plugins/specweave/scripts/jobs.js --id abc123
  specweave jobs --all
`);
  process.exit(0);
}

const cwd = process.cwd();
const stateFile = path.join(cwd, '.specweave/state/background-jobs.json');
const args = process.argv.slice(2);

// Parse arguments
const showAll = args.includes('--all');
const idIndex = args.indexOf('--id');
const specificId = idIndex !== -1 ? args[idIndex + 1] : null;

// Check if state file exists
if (!fs.existsSync(stateFile)) {
  console.log('No background jobs found.');
  console.log('Jobs are created during `specweave init` when importing large datasets.');
  process.exit(0);
}

// Read and parse state
let state;
try {
  state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
} catch (e) {
  console.log('Error reading jobs state:', e.message);
  process.exit(1);
}

const jobs = state.jobs || [];

// If specific job requested, check before general empty check
if (specificId) {
  const job = jobs.find(j => j.id === specificId || j.id.startsWith(specificId));
  if (!job) {
    console.log(`Job not found: ${specificId}`);
    process.exit(1);
  }
  
  console.log(`\n📦 Job Details: ${job.id}\n`);
  console.log(`Type: ${job.type}`);
  console.log(`Status: ${job.status}`);
  console.log(`Started: ${job.startedAt}`);
  console.log(`Updated: ${job.updatedAt}`);
  
  const p = job.progress || {};
  const current = p.current ?? 0;
  const total = p.total ?? 0;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  console.log(`Progress: ${current}/${total} (${pct}%)`);

  if (job.error) {
    console.log(`Error: ${job.error}`);
  }
  process.exit(0);
}

// General empty check (only if no specific ID was requested)
if (jobs.length === 0) {
  console.log('No background jobs found.');
  process.exit(0);
}

// Group by status
const running = jobs.filter(j => j.status === 'running');
const paused = jobs.filter(j => j.status === 'paused');
const failed = jobs.filter(j => j.status === 'failed');
const completed = jobs.filter(j => j.status === 'completed');

console.log('\n📋 Background Jobs\n');

// Running
if (running.length > 0) {
  console.log(`🔄 Running (${running.length}):`);
  for (const job of running) {
    const p = job.progress || {};
    const current = p.current ?? 0;
    const total = p.total ?? 0;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
    const rate = elapsed > 0 ? (current / elapsed).toFixed(1) : '0';
    console.log(`  [${job.id.slice(0,8)}] ${job.type}`);
    console.log(`     Progress: ${current}/${total} (${pct}%) | Rate: ${rate}/s`);
  }
  console.log('');
}

// Paused
if (paused.length > 0) {
  console.log(`⏸️  Paused (${paused.length}):`);
  for (const job of paused) {
    const p = job.progress || {};
    const current = p.current ?? 0;
    const total = p.total ?? 0;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    console.log(`  [${job.id.slice(0,8)}] ${job.type} - ${pct}%`);
  }
  console.log('');
}

// Failed
if (failed.length > 0) {
  console.log(`❌ Failed (${failed.length}):`);
  for (const job of failed) {
    console.log(`  [${job.id.slice(0,8)}] ${job.type}`);
    if (job.error) {
      console.log(`     Error: ${job.error}`);
    }
  }
  console.log('');
}

// Completed (only if --all)
if (showAll && completed.length > 0) {
  console.log(`✅ Completed (${completed.length}):`);
  for (const job of completed.slice(0, 10)) {
    console.log(`  [${job.id.slice(0,8)}] ${job.type} - ${job.progress.current} items`);
  }
  if (completed.length > 10) {
    console.log(`  ... and ${completed.length - 10} more`);
  }
  console.log('');
}

// Summary if no active jobs
if (running.length === 0 && paused.length === 0 && failed.length === 0) {
  if (completed.length > 0) {
    console.log(`No active jobs. ${completed.length} completed (use --all to see).`);
  } else {
    console.log('No jobs found.');
  }
}

// Help
console.log('💡 Commands:');
console.log('   specweave jobs --id <id>   View job details');
console.log('   specweave jobs --all       Show completed jobs');
