import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUmbrellaRoot, findProjectRoot } from '../../utils/find-project-root.js';
import { findSourceDir } from '../helpers/init/path-utils.js';
import { ProjectHubStore, HubError } from '../../core/project-hub/store.js';
import { projectBrief } from '../../core/project-hub/brief.js';
import { IntentStore, WorkError } from '../../dashboard/server/data/intent-store.js';

export interface ProjectOptions {
  root?: string; name?: string; goal?: string; contextFile?: string; revision?: number;
  title?: string; summary?: string; state?: string; increment?: string; intent?: string;
  location?: string; cadence?: string; instructionsFile?: string; routine?: string;
  harness?: string; model?: string; session?: string; effort?: string; note?: string; json?: boolean;
}
function readInput(file?: string): string {
  if (!file) return '';
  if (fs.statSync(file).size > 64000) throw new HubError('Input file exceeds 64 KiB');
  return fs.readFileSync(file, 'utf8');
}
const HUB_MARKER = '<!-- specweave:project-hub -->';

/** Explicit opt-in works in an ordinary folder and never rewrites a user's config or instructions. */
function initialize(root: string, options: ProjectOptions): void {
  if (!options.name?.trim() || !options.goal?.trim()) throw new HubError('init requires --name and --goal');
  // Validate before creating any project files.
  if (options.name.length > 180 || options.goal.length > 2000) throw new HubError('Name or goal is too long');
  fs.mkdirSync(root, { recursive: true });
  for (const p of ['.specweave', '.agents', '.agents/skills']) {
    const target = path.join(root, p);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new HubError(`Refusing symlink: ${p}`);
  }
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  const config = path.join(root, '.specweave/config.json');
  if (!fs.existsSync(config)) fs.writeFileSync(config, JSON.stringify({ project: { name: options.name }, adapters: { default: 'codex' } }, null, 2) + '\n', { flag: 'wx' });
  const agents = path.join(root, 'AGENTS.md');
  if (fs.existsSync(agents) && fs.lstatSync(agents).isSymbolicLink()) throw new HubError('Refusing symlink: AGENTS.md');
  const existing = fs.existsSync(agents) ? fs.readFileSync(agents, 'utf8') : '';
  if (!existing.includes(HUB_MARKER)) fs.appendFileSync(agents, `\n${HUB_MARKER}\n## Shared project context\nRead .specweave/project/hub.json for the project goal, shared context, artifacts and routine definitions. Run \`specweave project show\` for current work and \`specweave project brief\` for a fresh coordinator brief. Use native task tools only within user authorization. Routines are definitions until configured in the host scheduler.\n<!-- /specweave:project-hub -->\n`);
  const source = path.join(findSourceDir('plugins/specweave', path.dirname(fileURLToPath(import.meta.url))), 'skills/project/SKILL.md');
  const target = path.join(root, '.agents/skills/sw-project/SKILL.md');
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fs.readFileSync(source, 'utf8').replace(/^---\n/, '---\nname: sw-project\n'), { flag: 'wx' });
  }
}

export function runProjectCommand(action: string, options: ProjectOptions = {}, cwd = process.cwd()): unknown {
  const root = options.root ? path.resolve(cwd, options.root) : findUmbrellaRoot(cwd) ?? findProjectRoot(cwd) ?? cwd;
  const hub = new ProjectHubStore(root);
  if (action === 'init') {
    const context = readInput(options.contextFile);
    if (context.length > 16000) throw new HubError('Context exceeds 16000 characters');
    initialize(root, options);
    const current = hub.read();
    // Re-running init must not replace an existing hub.
    if (current.revision > 0) return { root, hub: current, existing: true };
    return { root, hub: hub.saveProfile({ revision: 0, name: options.name, goal: options.goal, context }) };
  }
  if (!fs.existsSync(path.join(root, '.specweave/config.json'))) throw new HubError('No project found. Run specweave project init --name ... --goal ...');
  const work = new IntentStore(root);
  const current = hub.read();
  if (action === 'show') return { root, hub: current, work: work.board(), scheduling: 'Definitions only; configure schedules in the native host.' };
  if (action === 'set') return hub.saveProfile({ revision: options.revision, name: options.name ?? current.name, goal: options.goal ?? current.goal,
    context: options.contextFile ? readInput(options.contextFile) : current.context });
  if (action === 'brief') {
    const intent = options.intent ? work.board().items.find(item => item.id === options.intent) : undefined;
    if (options.intent && !intent) throw new HubError('Work item not found', 404);
    return projectBrief(current, { harness: options.harness, intent, routineId: options.routine });
  }
  if (action === 'work-add') return work.create({ title: options.title, summary: options.summary, incrementId: options.increment });
  if (action === 'work-update') {
    if (!options.intent) throw new HubError('--intent is required');
    const patch: Record<string, unknown> = { revision: options.revision };
    for (const key of ['title', 'summary', 'state'] as const) if (options[key] !== undefined) patch[key] = options[key];
    if (options.increment !== undefined) patch.incrementId = options.increment;
    return work.update(options.intent, patch);
  }
  if (action === 'work-record') {
    if (!options.intent) throw new HubError('--intent is required');
    return work.addExecution(options.intent, { revision: options.revision, harness: options.harness, model: options.model,
      sessionId: options.session, effort: options.effort, note: options.note, actor: process.env.SPECWEAVE_AGENT ?? 'user' });
  }
  if (action === 'artifact-add') return hub.addArtifact({ revision: options.revision, title: options.title, location: options.location, intentId: options.intent }, work.board().items.map(item => item.id));
  if (action === 'artifact-remove') return hub.remove('artifact', options.location ?? '', options.revision);
  if (action === 'routine-add') return hub.addRoutine({ revision: options.revision, title: options.title, cadence: options.cadence, instructions: readInput(options.instructionsFile) });
  if (action === 'routine-remove') return hub.remove('routine', options.routine ?? '', options.revision);
  throw new HubError(`Unknown project action: ${action}`);
}

export async function projectCommand(action: string, options: ProjectOptions): Promise<void> {
  try {
    const result = runProjectCommand(action, options);
    console.log(typeof result === 'string' && !options.json ? result : JSON.stringify(result, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) console.log(JSON.stringify({ ok: false, error: message }));
    else console.error(message);
    process.exitCode = error instanceof HubError || error instanceof WorkError ? error.status === 409 ? 3 : 1 : 1;
  }
}
