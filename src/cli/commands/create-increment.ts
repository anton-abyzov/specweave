/**
 * Create Increment Command
 *
 * CLI bridge for createIncrementTemplates() - creates template files
 * for new increments that must be completed via PM/Architect skills.
 *
 * Short form (what CLAUDE.md/AGENTS.md document):
 *   specweave create-increment "Add login form"
 * Long form (explicit id / project):
 *   specweave create-increment --id "0042-login" --title "Login" --description "..." --project "my-app"
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
import { slugify } from '../../utils/string-utils.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import * as fs from '../../utils/fs-native.js';


export interface CreateIncrementOptions {
  id?: string;
  autoId?: boolean;
  name?: string;
  title: string;
  /** Defaults to the title. */
  description?: string;
  /** Defaults to config `project.name`, else the project folder name. */
  project?: string;
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

  /**
   * Id of an increment this one replaces. The old increment is abandoned with
   * `Superseded by <new id>` and the new one records `supersedes`.
   */
  supersedes?: string;
}

/**
 * Abandon the superseded increment and record the link on the new one.
 * Never fails increment creation: a bad reference is reported and skipped.
 *
 * Reads and writes metadata.json directly — MetadataManager rejects the
 * "planned" status the template creator writes.
 */
function applySupersedes(ref: string, newId: string, projectRoot: string): void {
  const resolved = resolveIncrementId(ref, projectRoot);
  if (!resolved || Array.isArray(resolved)) {
    console.error(chalk.yellow(
      Array.isArray(resolved)
        ? `⚠️  --supersedes ${ref} is ambiguous (${resolved.join(', ')}); skipped`
        : `⚠️  --supersedes ${ref}: increment not found; skipped`
    ));
    return;
  }
  const metaPath = (incrementId: string): string =>
    path.join(projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
  const patch = (incrementId: string, fields: Record<string, unknown>): void => {
    const file = metaPath(incrementId);
    const meta = JSON.parse(fs.readFileSync(file, 'utf-8'));
    fs.writeFileSync(file, JSON.stringify({ ...meta, ...fields }, null, 2) + '\n');
  };
  try {
    const now = new Date().toISOString();
    patch(resolved, {
      status: 'abandoned',
      abandonedReason: `Superseded by ${newId}`,
      abandonedAt: now,
      lastActivity: now,
    });
    patch(newId, { supersedes: resolved });
    console.log(chalk.gray(`  Superseded ${resolved} (abandoned)`));
  } catch (err) {
    console.error(chalk.yellow(`⚠️  Could not supersede ${resolved}: ${err instanceof Error ? err.message : err}`));
  }
}

export async function createIncrementCommand(options: CreateIncrementOptions): Promise<void> {
  const {
    id,
    title,
    board,
    type,
    priority,
    json = false,
    projectRoot: rawProjectRoot,
    parallel = false,
  } = options;

  if (id && options.autoId) {
    throw new Error('Cannot use both --id and --auto-id. Use one or the other.');
  }
  if (!title || !title.trim()) {
    throw new Error('A title is required: specweave create-increment "Add login form"');
  }

  // `specweave create-increment "Add login form"` is the short form: no --id means
  // auto-id, and the folder suffix is a slug of the title.
  const autoId = id ? false : true;
  const name = options.name ?? (autoId ? slugify(title) : undefined);
  if (autoId && !name) {
    throw new Error('Could not derive an increment name from the title; pass --name.');
  }
  const description = options.description ?? title;

  // Resolve effective root: umbrella root in multi-repo, local root in single-repo
  const projectRoot = rawProjectRoot || resolveEffectiveRoot(process.cwd());

  // Resolve increment ID: explicit or placeholder (template-creator handles atomic ID when autoId=true)
  const resolvedId = autoId ? '' : id!;

  let testMode: string | undefined;
  let coverageTarget: number | undefined;
  let deepInterview: 'off' | 'warn' | undefined;
  let configProjectName: string | undefined;
  try {
    const config = await readConfig(projectRoot);
    testMode = config?.testing?.mode;
    coverageTarget = config?.testing?.coverage?.unit;
    deepInterview = config?.planning?.deepInterview;
    configProjectName = config?.project?.name;
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
    projectId: options.project ?? configProjectName ?? path.basename(projectRoot),
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

  if (options.supersedes) applySupersedes(options.supersedes, finalId, projectRoot);

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
