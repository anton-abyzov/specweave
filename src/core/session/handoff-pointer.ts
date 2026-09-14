/** Portable in-project pointers; explicit absolute external destinations stay absolute. */
import fs from 'node:fs';
import path from 'node:path';
import { DOC_FORMAT_MARKER, LEGACY_DOC_FORMAT_MARKER } from './handoff-doc-format.js';

function inside(relative: string): boolean {
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function serializeHandoffPointer(root: string, docPath: string): string {
  const absolute = path.resolve(docPath);
  const relative = path.relative(path.resolve(root), absolute);
  return inside(relative) ? relative.replace(/\\/g, '/') : absolute;
}

/** Read only a bounded tail: owned handoff documents end with their format marker. */
function isOwnedHandoff(file: string): boolean {
  let fd: number | undefined;
  try {
    if (!fs.statSync(file).isFile()) return false;
    fd = fs.openSync(file, 'r');
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return false;
    const buffer = Buffer.alloc(Math.min(stat.size, 8192));
    const read = fs.readSync(fd, buffer, 0, buffer.length, Math.max(0, stat.size - buffer.length));
    const tail = buffer.subarray(0, read).toString('utf8');
    return [DOC_FORMAT_MARKER, LEGACY_DOC_FORMAT_MARKER].some(marker => tail.includes(`<!-- ${marker} -->`));
  } catch { return false; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

/** Broken, foreign, escaping relative and relocated foreign-platform paths are ignored. */
export function resolveHandoffPointer(root: string, pointer: string): string | null {
  if (!pointer || pointer.length > 4096 || /[\u0000-\u001f]/.test(pointer)) return null;
  const absolute = path.isAbsolute(pointer);
  if (!absolute && (path.win32.isAbsolute(pointer) || path.posix.isAbsolute(pointer))) return null;
  if (!absolute && pointer.split(/[\\/]/).includes('..')) return null;
  const candidate = path.resolve(root, pointer);
  if (!absolute) {
    if (!inside(path.relative(path.resolve(root), candidate))) return null;
    // A relative pointer must not escape through a symlink either.
    try {
      if (!inside(path.relative(fs.realpathSync(root), fs.realpathSync(candidate)))) return null;
    } catch { return null; }
  }
  return isOwnedHandoff(candidate) ? candidate : null;
}
