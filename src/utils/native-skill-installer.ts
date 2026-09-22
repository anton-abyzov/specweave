import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Install native skills without treating a global content hash as a local receipt. */
export function installNativeSkills(
  skills: Array<{ name: string; sourceDir: string }>,
  projectRoot: string,
  normalize: (content: string, name: string) => string,
): { skipped: boolean; targetDir: string; backups: string[] } {
  const root = path.resolve(projectRoot);
  const targetDir = path.join(root, '.agents/skills');
  const backups: string[] = [];
  const plans: Array<{ target: string; files: Array<{ file: string; bytes: Buffer; mode: number }>; changed: boolean }> = [];
  function safe(relative: string): void {
    let current = root;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      let stat;
      try { stat = fs.lstatSync(current); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      if (stat.isSymbolicLink()) throw new Error(`Refusing symlink skill destination: ${current}`);
    }
  }
  // Preflight every destination before any mutation, including dangling links.
  safe('.agents/skills');
  safe('.specweave/state/skill-backups');
  for (const skill of skills) {
    if (!/^[a-zA-Z0-9_-]+$/.test(skill.name)) throw new Error(`Invalid native skill name: ${skill.name}`);
    const target = path.join(targetDir, skill.name);
    safe(path.relative(root, target));
    const files: Array<{ file: string; bytes: Buffer; mode: number }> = [];
    const walk = (dir: string, prefix = ''): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(prefix, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Refusing symlink skill source: ${file}`);
        if (entry.isDirectory()) walk(path.join(dir, entry.name), file);
        else if (entry.isFile()) {
          safe(path.relative(root, path.join(target, file)));
          const bytes = fs.readFileSync(path.join(dir, entry.name));
          files.push({ file, mode: fs.statSync(path.join(dir, entry.name)).mode & 0o777, bytes: file === 'SKILL.md' ? Buffer.from(normalize(bytes.toString('utf8'), skill.name)) : bytes });
        }
      }
    };
    walk(skill.sourceDir);
    const changed = files.some(({ file, bytes, mode }) => {
      try { return !fs.readFileSync(path.join(target, file)).equals(bytes) || (fs.statSync(path.join(target, file)).mode & 0o777) !== mode; } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
        throw error;
      }
    });
    plans.push({ target, files, changed });
  }
  for (const plan of plans.filter(p => p.changed)) {
    if (fs.existsSync(plan.target)) {
      const backup = path.join(root, '.specweave/state/skill-backups', randomUUID(), path.basename(plan.target));
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.cpSync(plan.target, backup, { recursive: true, dereference: false, errorOnExist: true, force: false });
      backups.push(backup);
    }
    for (const { file, bytes, mode } of plan.files) {
      const destination = path.join(plan.target, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes, { mode });
      fs.chmodSync(destination, mode);
    }
  }
  return { skipped: plans.every(p => !p.changed), targetDir, backups };
}
