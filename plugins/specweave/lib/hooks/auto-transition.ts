#!/usr/bin/env node

/**
 * Auto-Transition Hook Handler
 *
 * CLI wrapper for AutoTransitionManager
 * Called by bash hooks to trigger status transitions
 *
 * Events:
 * - spec-created: When spec.md is created (BACKLOG → PLANNING)
 * - tasks-created: When tasks.md is created (PLANNING/BACKLOG → ACTIVE)
 * - task-started: When first task is started (PLANNING → ACTIVE)
 * - auto-correct: Fix status based on artifacts
 *
 * Usage:
 *   node auto-transition.ts spec-created 0039-ultra-smart-next-command
 *   node auto-transition.ts tasks-created 0039-ultra-smart-next-command
 *   node auto-transition.ts task-started 0039-ultra-smart-next-command
 *   node auto-transition.ts auto-correct 0039-ultra-smart-next-command
 */

import { AutoTransitionManager } from '../vendor/core/increment/auto-transition-manager.js';

async function main() {
  const event = process.argv[2];
  const incrementId = process.argv[3];
  const force = process.argv.includes('--force');

  if (!event || !incrementId) {
    console.error('Usage: auto-transition.ts <event> <increment-id> [--force]');
    console.error('Events: spec-created, tasks-created, task-started, auto-correct');
    console.error('Example: node auto-transition.ts spec-created 0039-ultra-smart-next-command');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const manager = new AutoTransitionManager(projectRoot);

  let result;

  try {
    switch (event) {
      case 'spec-created':
        result = await manager.handleSpecCreated(incrementId);
        break;

      case 'tasks-created':
        result = await manager.handleTasksCreated(incrementId);
        break;

      case 'task-started':
        result = await manager.handleTaskStarted(incrementId);
        break;

      case 'auto-correct':
        result = await manager.autoCorrect(incrementId, force);
        break;

      default:
        console.error(`❌ Unknown event: ${event}`);
        console.error('Valid events: spec-created, tasks-created, task-started, auto-correct');
        process.exit(1);
    }

    // Display result
    if (result.transitioned) {
      console.log(`✅ Auto-transition: ${result.from} → ${result.to}`);
      console.log(`   Reason: ${result.reason}`);
    } else {
      console.log(`ℹ️  No transition: ${result.reason}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Auto-transition error:', error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
