import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { hubSchema, type ProjectHub, type ProjectArtifact, type ProjectRoutine } from './types.js';

export const HUB_PATH = '.specweave/project/hub.json';
const MAX_BYTES = 512 * 1024;
export class HubError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function field(value: unknown, name: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || /\u0000/.test(value))
    throw new HubError(`${name} must be text, at most ${max} characters`);
  if (required && !value.trim()) throw new HubError(`${name} is required`);
  return value.trim();
}
function inside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Optional project metadata. Never scans transcripts, starts agents or runs schedules. */
export class ProjectHubStore {
  private file: string;
  constructor(private root: string) { this.file = path.join(root, HUB_PATH); }

  private checkPaths(): void {
    for (const relative of ['.specweave', '.specweave/project', HUB_PATH]) {
      const file = path.join(this.root, relative);
      try { if (fs.lstatSync(file).isSymbolicLink()) throw new HubError(`Refusing symlink: ${relative}`, 409); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }

  read(): ProjectHub {
    this.checkPaths();
    let fd: number;
    try { fd = fs.openSync(this.file, 'r'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new HubError('Project hub cannot be read', 409);
      return { version: 1, revision: 0, updatedAt: null, name: path.basename(this.root), goal: '', context: '', artifacts: [], routines: [] };
    }
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('oversized');
      const buffer = Buffer.alloc(Math.min(stat.size + 1, MAX_BYTES + 1));
      const count = fs.readSync(fd, buffer, 0, buffer.length, 0);
      if (count > MAX_BYTES) throw new Error('oversized');
      return hubSchema.parse(JSON.parse(buffer.subarray(0, count).toString('utf8')));
    } catch { throw new HubError('Project hub is corrupt or too large. Inspect .specweave/project/hub.json before editing.', 409); }
    finally { fs.closeSync(fd); }
  }

  private change(revision: unknown, update: (hub: ProjectHub) => void): ProjectHub {
    if (!fs.existsSync(path.join(this.root, '.specweave/config.json')))
      throw new HubError('Initialize this folder with specweave project init first');
    this.checkPaths();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const lock = `${this.file}.lock`;
    let fd: number;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new HubError('Project hub is being edited. Retry; if interrupted, inspect hub.json.lock before removing it.', 409);
      throw error;
    }
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      const hub = this.read();
      if (revision !== hub.revision) throw new HubError('Project changed. Refresh before saving.', 409);
      update(hub);
      hub.revision++;
      hub.updatedAt = new Date().toISOString();
      const parsed = hubSchema.safeParse(hub);
      if (!parsed.success) throw new HubError('Project hub limits exceeded or invalid fields');
      const data = JSON.stringify(parsed.data, null, 2) + '\n';
      if (Buffer.byteLength(data) > MAX_BYTES) throw new HubError('Project hub exceeds 512 KiB');
      fs.writeFileSync(temp, data, { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, this.file);
      return parsed.data;
    } finally {
      fs.closeSync(fd);
      fs.rmSync(temp, { force: true });
      fs.unlinkSync(lock);
    }
  }

  saveProfile(input: Record<string, unknown>): ProjectHub {
    return this.change(input.revision, hub => {
      hub.name = field(input.name, 'Name', 180, true);
      hub.goal = field(input.goal, 'Goal', 2000, true);
      hub.context = field(input.context ?? '', 'Context', 16000);
    });
  }

  /** File paths are relative to the project, with existing symlinks resolved before acceptance. */
  validateLocation(raw: unknown): { location: string; kind: 'file' | 'link' } {
    const location = field(raw, 'Location', 2000, true);
    if (/^https:/i.test(location)) {
      let url: URL;
      try { url = new URL(location); } catch { throw new HubError('Invalid HTTPS artifact URL'); }
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password)
        throw new HubError('Artifact links require HTTPS without embedded credentials');
      return { location: url.href, kind: 'link' };
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(location) || path.isAbsolute(location))
      throw new HubError('Use a project-relative file path or HTTPS URL');
    const root = fs.realpathSync(this.root);
    const candidate = path.resolve(root, location);
    if (!inside(root, candidate)) throw new HubError('Artifact must stay inside the project');
    let real: string;
    try { real = fs.realpathSync(candidate); } catch { throw new HubError('Artifact file does not exist'); }
    if (!inside(root, real) || !fs.statSync(real).isFile())
      throw new HubError('Artifact must be a file inside the project');
    return { location: path.relative(root, candidate).split(path.sep).join('/'), kind: 'file' };
  }

  addArtifact(input: Record<string, unknown>, knownIntentIds: string[]): ProjectHub {
    const intentId = input.intentId == null || input.intentId === '' ? null : field(input.intentId, 'Work item', 180, true);
    if (intentId && !knownIntentIds.includes(intentId)) throw new HubError('Linked work item does not exist');
    const location = this.validateLocation(input.location);
    const item: ProjectArtifact = { id: randomUUID(), title: field(input.title, 'Title', 180, true), ...location, intentId, createdAt: new Date().toISOString() };
    return this.change(input.revision, hub => { hub.artifacts.push(item); });
  }

  addRoutine(input: Record<string, unknown>): ProjectHub {
    const routine: ProjectRoutine = { id: randomUUID(), title: field(input.title, 'Title', 180, true),
      instructions: field(input.instructions, 'Instructions', 8000, true), cadence: field(input.cadence, 'Cadence', 180, true),
      enabled: true, createdAt: new Date().toISOString() };
    return this.change(input.revision, hub => { hub.routines.push(routine); });
  }

  remove(kind: 'artifact' | 'routine', id: string, revision: unknown): ProjectHub {
    return this.change(revision, hub => {
      const list = kind === 'artifact' ? hub.artifacts : hub.routines;
      const index = list.findIndex(item => item.id === id);
      if (index < 0) throw new HubError('Item not found', 404);
      list.splice(index, 1);
    });
  }
}
