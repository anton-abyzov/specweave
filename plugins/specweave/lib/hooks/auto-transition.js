#!/usr/bin/env node
import { AutoTransitionManager } from "../vendor/core/increment/auto-transition-manager.js";
async function main() {
  const event = process.argv[2];
  const incrementId = process.argv[3];
  const force = process.argv.includes("--force");
  if (!event || !incrementId) {
    console.error("Usage: auto-transition.ts <event> <increment-id> [--force]");
    console.error("Events: spec-created, tasks-created, task-started, auto-correct");
    console.error("Example: node auto-transition.ts spec-created 0039-ultra-smart-next-command");
    process.exit(1);
  }
  const projectRoot = process.cwd();
  const manager = new AutoTransitionManager(projectRoot);
  let result;
  try {
    switch (event) {
      case "spec-created":
        result = await manager.handleSpecCreated(incrementId);
        break;
      case "tasks-created":
        result = await manager.handleTasksCreated(incrementId);
        break;
      case "task-started":
        result = await manager.handleTaskStarted(incrementId);
        break;
      case "auto-correct":
        result = await manager.autoCorrect(incrementId, force);
        break;
      default:
        console.error(`\u274C Unknown event: ${event}`);
        console.error("Valid events: spec-created, tasks-created, task-started, auto-correct");
        process.exit(1);
    }
    if (result.transitioned) {
      console.log(`\u2705 Auto-transition: ${result.from} \u2192 ${result.to}`);
      console.log(`   Reason: ${result.reason}`);
    } else {
      console.log(`\u2139\uFE0F  No transition: ${result.reason}`);
    }
    process.exit(0);
  } catch (error) {
    console.error("\u274C Auto-transition error:", error);
    process.exit(1);
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
