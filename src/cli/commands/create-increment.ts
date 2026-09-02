/**
 * Create Increment Command
 *
 * CLI bridge for createIncrementTemplates() - creates template files
 * for new increments that must be completed via PM/Architect skills.
 *
 * This command is invoked by the increment SKILL.md:
 *   specweave create-increment --id "XXXX-name" --title "Title" --description "Desc" --project "my-app"
 *
 * @module create-increment
 */

import * as path from 'path';
import chalk from 'chalk';
import { createIncrementTemplates } from '../../core/increment/template-creator.js';
import { LifecycleHookDispatcher } from '../../core/hooks/LifecycleHookDispatcher.js';
import { readConfig } from '../../core/config/config-manager.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { initInterviewStateFile } from './interview.js';


export interface CreateIncrementOptions {
  id?: string;
  autoId?: boolean;
  name?: string;
  title: string;
  description: string;
  project: string;
  board?: string;
  type?: string;
  priority?: string;
  json?: boolean;
  projectRoot?: string;
  /**
   * Opt into 3-agent fan-out planning (0669 Wave 2, AC-US4-03).
   * Default is single-agent planning; skills override when user-story
   * count ≥ 10 or the feature description contains "parallel" /
   * "team lead" / "fan out". When true, the increment skill hands
   * the plan off to the team-lead skill for multi-agent authoring.
   */
  parallel?: boolean;
}

export async function createIncrementCommand(options: CreateIncrementOptions): Promise<void> {
  const {
    id,
    autoId,
    name,
    title,
    description,
    project,
    board,
    type,
    priority,
    json = false,
    projectRoot: rawProjectRoot,
    parallel = false,
  } = options;

  // Validate: either --id OR (--auto-id + --name) must be provided
  if (id && autoId) {
    throw new Error('Cannot use both --id and --auto-id. Use one or the other.');
  }
  if (!id && !autoId) {
    throw new Error('Either --id or (--auto-id + --name) is required.');
  }
  if (autoId && !name) {
    throw new Error('--auto-id requires --name to generate the increment ID.');
  }

  // Resolve effective root: umbrella root in multi-repo, local root in single-repo
  const projectRoot = rawProjectRoot || resolveEffectiveRoot(process.cwd());

  // Resolve increment ID: explicit or placeholder (template-creator handles atomic ID when autoId=true)
  const resolvedId = autoId ? '' : id!;

  // Read testing config to pass testMode and coverageTarget
  let testMode: string | undefined;
  let coverageTarget: number | undefined;
  let deepInterview: 'off' | 'warn' | undefined;
  try {
    const config = await readConfig(projectRoot);
    testMode = config?.testing?.mode;
    coverageTarget = config?.testing?.coverage?.unit;
    deepInterview = config?.planning?.deepInterview;
  } catch (error) {
    // Config reading can fail for missing file (expected) or malformed JSON (unexpected)
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('JSON') || msg.includes('parse')) {
      console.error(chalk.yellow(`⚠️  Config parse error, using defaults: ${msg}`));
    }
    // Fallback to template-creator defaults
  }

  const result = await createIncrementTemplates({
    incrementId: resolvedId,
    title,
    description,
    projectId: project,
    boardId: board,
    type,
    priority,
    testMode,
    coverageTarget,
    projectRoot,
    autoId,
    name,
    parallel,
  });

  if (!result.success) {
    if (json) {
      console.log(JSON.stringify({ success: false, error: result.error }));
    } else {
      console.error(chalk.red(`Failed to create increment: ${result.error}`));
    }
    throw new Error(result.error);
  }

  // Update resolvedId from result in case auto-id retry changed it
  const finalId = autoId
    ? path.basename(result.incrementPath)
    : resolvedId;

  // 2.0: deep interview is advisory. `warn` seeds the interview state file so
  // the planning skill can track which categories it has covered; nothing blocks.
  if (deepInterview === 'warn') {
    try {
      initInterviewStateFile(projectRoot, finalId);
    } catch (err) {
      console.error(chalk.yellow(
        `⚠️  Failed to initialize interview state: ${err instanceof Error ? err.message : err}`
      ));
    }
  }

  // Await post-increment-planning hooks to ensure GitHub/JIRA/ADO sync completes
  try {
    await LifecycleHookDispatcher.onIncrementPlanned(projectRoot, finalId);
  } catch (error: any) {
    // Log but don't fail increment creation
    console.error(chalk.yellow(`⚠️  Post-planning sync warning: ${error.message}`));
  }

  if (json) {
    console.log(JSON.stringify({
      success: true,
      incrementPath: result.incrementPath,
      createdFiles: result.createdFiles,
      nextSteps: result.nextSteps,
    }));
  } else {
    console.log(chalk.green(`\nIncrement created: ${finalId}`));
    console.log(`  Path: ${result.incrementPath}`);
    console.log(`  Files: ${result.createdFiles.join(', ')}`);
    console.log(chalk.blue('\nNext steps:'));
    result.nextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
  }
}
