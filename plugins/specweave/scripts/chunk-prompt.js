#!/usr/bin/env node
/**
 * Prompt Chunking for Auto Mode
 *
 * Analyzes a prompt and generates an increment plan for user approval.
 *
 * Usage: node chunk-prompt.js "prompt text" [options]
 *
 * Options:
 *   --yes           Auto-approve plan (skip user approval)
 *   --json          Output as JSON
 *   --project-path  Project root path (default: cwd)
 *
 * Exit codes:
 *   0: Success - plan saved to state
 *   1: Error
 *   2: Cancelled by user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve project root (look for .specweave directory)
function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, '.specweave'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

// Dynamic import of built modules
async function loadModules(projectPath) {
  // Try multiple paths for the built modules
  const possiblePaths = [
    path.join(projectPath, 'dist/src/core/auto/prompt-chunker.js'),
    path.join(projectPath, 'node_modules/specweave/dist/src/core/auto/prompt-chunker.js'),
    // For development
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/src/core/auto/prompt-chunker.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const chunker = await import(p);
      const plannerPath = p.replace('prompt-chunker', 'increment-planner');
      const approvalPath = p.replace('prompt-chunker', 'plan-approval');
      const planner = await import(plannerPath);
      const approval = await import(approvalPath);
      return { chunker, planner, approval };
    }
  }

  throw new Error('Could not find built modules. Run `npm run build` first.');
}

// Parse arguments
const args = process.argv.slice(2);
let prompt = '';
let autoApprove = false;
let jsonOutput = false;
let projectPath = process.cwd();

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--yes' || arg === '-y') {
    autoApprove = true;
  } else if (arg === '--json') {
    jsonOutput = true;
  } else if (arg === '--project-path') {
    projectPath = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Prompt Chunking for Auto Mode

Usage: node chunk-prompt.js "prompt text" [options]

Options:
  --yes, -y       Auto-approve plan (skip user approval)
  --json          Output as JSON
  --project-path  Project root path (default: cwd)
  --help, -h      Show this help

Examples:
  node chunk-prompt.js "Build e-commerce with auth, products, cart, checkout"
  node chunk-prompt.js "Build dashboard" --yes
`);
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    prompt = arg;
  }
}

if (!prompt) {
  console.error('Error: No prompt provided');
  console.error('Usage: node chunk-prompt.js "prompt text"');
  process.exit(1);
}

// Find project root
projectPath = findProjectRoot(projectPath);

async function main() {
  try {
    const { chunker, planner, approval } = await loadModules(projectPath);

    // Analyze prompt
    const analysis = chunker.analyzePrompt(prompt);

    if (analysis.features.length === 0) {
      console.error('No features detected in prompt. Please provide a more detailed description.');
      process.exit(1);
    }

    // Plan increments
    const plan = planner.planIncrements(analysis.features);

    // Validate plan
    const validation = approval.validatePlan(plan);
    if (!validation.valid) {
      console.error('Plan validation failed:');
      for (const issue of validation.issues) {
        console.error(`  - ${issue}`);
      }
      process.exit(1);
    }

    // Display warnings if any
    const warnings = validation.issues.filter(i => i.startsWith('Warning:'));
    if (warnings.length > 0 && !jsonOutput) {
      console.log('\n⚠️  Warnings:');
      for (const warning of warnings) {
        console.log(`   ${warning}`);
      }
    }

    // Output plan
    if (jsonOutput) {
      console.log(JSON.stringify({
        prompt,
        analysis: {
          totalFeatures: analysis.totalFeatures,
          totalComplexity: analysis.totalComplexity,
          recommendedIncrements: analysis.recommendedIncrements,
        },
        plan: {
          increments: plan.increments.map(inc => ({
            id: inc.id,
            name: inc.name,
            estimatedTasks: inc.estimatedTasks,
            features: inc.features.map(f => f.name),
            dependencies: inc.dependencies,
          })),
          totalTasks: plan.totalTasks,
          estimatedDuration: plan.estimatedDuration,
        },
        autoApprove,
      }, null, 2));
    } else {
      // Display formatted plan
      console.log(approval.formatPlanDisplay(plan, {
        showDetails: true,
        showDependencies: true,
        format: 'text',
      }));

      // Show approval prompt
      if (!autoApprove) {
        console.log(approval.generateApprovalPrompt(plan));
      }
    }

    // Save plan to state
    approval.savePlanToState(plan, projectPath);

    // Log approval if auto-approved
    if (autoApprove) {
      approval.logApprovedPlan(plan, projectPath);
      console.log('\n✅ Plan auto-approved (--yes flag)');
    }

    // Output increment IDs for shell script consumption
    if (!jsonOutput) {
      console.log('\n📋 Generated Increment IDs:');
      for (const inc of plan.increments) {
        console.log(`  ${inc.id}`);
      }
    }

    // Write increment IDs to a temp file for shell script to read
    const idsFile = path.join(projectPath, '.specweave/state/chunked-increments.txt');
    fs.writeFileSync(idsFile, plan.increments.map(i => i.id).join('\n'));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
