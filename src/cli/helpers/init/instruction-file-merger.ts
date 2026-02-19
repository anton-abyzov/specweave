/**
 * Instruction File Merger - Smart CLAUDE.md/AGENTS.md merge
 * Updates SW sections, preserves user content
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

export type TemplateType = 'claude' | 'agents';

export interface TemplateSection {
  id: string;
  order: number;
  required: boolean;
  content: string;
}

export interface MergeResult {
  content: string;
  action: 'created' | 'merged' | 'preserved';
  updated: string[];
  added: string[];
  preserved: number;
  warnings: string[];
}

const META_RE = /<!-- SW:META template="(\w+)" version="([\d.]+)" sections="([^"]*)" -->/;
const START_RE = /<!-- SW:SECTION:(\w+) version="([\d.]+)" -->/;
const END_RE = /<!-- SW:END:(\w+) -->/;

interface ParsedFile {
  meta: { template: TemplateType; version: string; sections: string[] } | null;
  swSections: Map<string, { id: string; startLine: number; endLine: number }>;
  userSegments: Array<{ content: string; afterSection: string | null; beforeSection: string | null }>;
  isLegacy: boolean;
  errors: string[];
}

function parseFile(content: string): ParsedFile {
  const lines = content.split('\n');
  const result: ParsedFile = {
    meta: null,
    swSections: new Map(),
    userSegments: [],
    isLegacy: true,
    errors: []
  };

  const m = content.match(META_RE);
  if (m) {
    result.meta = {
      template: m[1] as TemplateType,
      version: m[2],
      sections: m[3].split(',').filter(Boolean)
    };
    result.isLegacy = false;
  }

  const starts = new Map<string, number>();
  const ends = new Map<string, number>();

  lines.forEach((l, i) => {
    const s = l.match(START_RE);
    if (s) {
      starts.set(s[1], i);
      result.isLegacy = false;
    }
    const e = l.match(END_RE);
    if (e) ends.set(e[1], i);
  });

  const ranges: Array<{ id: string; start: number; end: number }> = [];

  for (const [id, start] of starts) {
    const end = ends.get(id);
    if (!end || end < start) {
      result.errors.push(`${id}: bad markers`);
      continue;
    }
    result.swSections.set(id, { id, startLine: start, endLine: end });
    ranges.push({ id, start, end });
  }

  ranges.sort((a, b) => a.start - b.start);

  if (!result.isLegacy && ranges.length) {
    const metaLine = lines.findIndex(l => META_RE.test(l));
    let cur = metaLine >= 0 ? metaLine + 1 : 0;

    for (let i = 0; i < ranges.length; i++) {
      if (cur < ranges[i].start) {
        const seg = lines.slice(cur, ranges[i].start).join('\n').trim();
        if (seg) {
          result.userSegments.push({
            content: seg,
            afterSection: i > 0 ? ranges[i - 1].id : null,
            beforeSection: ranges[i].id
          });
        }
      }
      cur = ranges[i].end + 1;
    }

    if (cur < lines.length) {
      const seg = lines.slice(cur).join('\n').trim();
      if (seg) {
        result.userSegments.push({
          content: seg,
          afterSection: ranges[ranges.length - 1].id,
          beforeSection: null
        });
      }
    }
  }

  return result;
}

function wrap(id: string, c: string, v: string): string {
  return `<!-- SW:SECTION:${id} version="${v}" -->\n${c}\n<!-- SW:END:${id} -->`;
}

function genMeta(t: TemplateType, v: string, s: string[]): string {
  return `<!-- SW:META template="${t}" version="${v}" sections="${s.join(',')}" -->`;
}

function fresh(secs: TemplateSection[], t: TemplateType, v: string, name: string): string {
  const sorted = [...secs].sort((a, b) => a.order - b.order);
  const parts = [genMeta(t, v, sorted.map(s => s.id)), ''];

  for (const s of sorted) {
    parts.push(wrap(s.id, s.content.replace(/\{PROJECT_NAME\}/g, name), v));
    parts.push('');
  }

  return parts.join('\n').trim() + '\n';
}

export function mergeInstructionFile(
  existing: string | null,
  secs: TemplateSection[],
  type: TemplateType,
  ver: string,
  name: string
): MergeResult {
  if (!existing) {
    return {
      content: fresh(secs, type, ver, name),
      action: 'created',
      updated: [],
      added: secs.map(s => s.id),
      preserved: 0,
      warnings: []
    };
  }

  const p = parseFile(existing);

  if (p.isLegacy) {
    const f = fresh(secs, type, ver, name);
    return {
      content: `${f}\n---\n<!-- ↓ ORIGINAL ↓ -->\n\n${existing}\n`,
      action: 'merged',
      updated: [],
      added: secs.map(s => s.id),
      preserved: 1,
      warnings: ['Legacy preserved below']
    };
  }

  if (p.errors.length) {
    return {
      content: existing,
      action: 'preserved',
      updated: [],
      added: [],
      preserved: 0,
      warnings: ['Fix manually', ...p.errors]
    };
  }

  const prev = new Set(p.meta?.sections || []);
  const exist = new Set(p.swSections.keys());

  const upd: TemplateSection[] = [];
  const add: TemplateSection[] = [];
  const skip: string[] = [];

  for (const s of secs) {
    if (exist.has(s.id)) {
      upd.push(s);
    } else if (prev.has(s.id)) {
      if (s.required) add.push(s);
      else skip.push(s.id);
    } else {
      add.push(s);
    }
  }

  const all = [...upd, ...add].sort((a, b) => a.order - b.order);
  const els: Array<{ c: string; o: number }> = [];

  els.push({ c: genMeta(type, ver, all.map(s => s.id)), o: -1000 });

  for (const s of all) {
    els.push({
      c: wrap(s.id, s.content.replace(/\{PROJECT_NAME\}/g, name), ver),
      o: s.order
    });
  }

  for (const seg of p.userSegments) {
    let o: number;
    if (seg.afterSection) {
      const ts = secs.find(s => s.id === seg.afterSection);
      o = ts ? ts.order + 0.5 : 9999;
    } else if (seg.beforeSection) {
      const ts = secs.find(s => s.id === seg.beforeSection);
      o = ts ? ts.order - 0.5 : -999;
    } else {
      o = 9999;
    }
    els.push({ c: seg.content, o });
  }

  els.sort((a, b) => a.o - b.o);

  return {
    content: els.map(e => e.c).join('\n\n').trim() + '\n',
    action: 'merged',
    updated: upd.map(s => s.id),
    added: add.map(s => s.id),
    preserved: p.userSegments.length,
    warnings: skip.length ? [`Skipped: ${skip.join(', ')}`] : []
  };
}

/**
 * Strip all SW-managed sections from an instruction file, returning only user content.
 * Returns null if no user content remains (file was 100% SW-managed or empty).
 */
export function stripSwSections(content: string): string | null {
  if (!content || !content.trim()) return null;

  const parsed = parseFile(content);

  // Legacy file or file with no SW markers — it's all user content
  if (parsed.isLegacy && parsed.swSections.size === 0) {
    return content.trim() || null;
  }

  // Has SW sections — extract only user segments
  if (parsed.userSegments.length === 0) return null;

  const userContent = parsed.userSegments.map(s => s.content).join('\n\n').trim();
  return userContent || null;
}

export function parseTemplateSections(content: string): TemplateSection[] {
  const secs: TemplateSection[] = [];
  const lines = content.split('\n');
  let cur: { id: string; ord: number; req: boolean; lines: string[] } | null = null;
  let ord = 0;

  for (const l of lines) {
    const d = l.match(/<!-- SECTION:(\w+)(?:\s+(required))? -->/);
    if (d) {
      if (cur) {
        secs.push({
          id: cur.id,
          order: cur.ord,
          required: cur.req,
          content: cur.lines.join('\n').trim()
        });
      }
      cur = { id: d[1], ord: ord++, req: d[2] === 'required', lines: [] };
      continue;
    }

    if (l.match(/<!-- \/SECTION -->/)) {
      if (cur) {
        secs.push({
          id: cur.id,
          order: cur.ord,
          required: cur.req,
          content: cur.lines.join('\n').trim()
        });
      }
      cur = null;
      continue;
    }

    if (cur) cur.lines.push(l);
  }

  if (cur) {
    secs.push({
      id: cur.id,
      order: cur.ord,
      required: cur.req,
      content: cur.lines.join('\n').trim()
    });
  }

  return secs;
}

export function getPackageVersion(): string {
  try {
    let d = path.dirname(new URL(import.meta.url).pathname);
    for (let i = 0; i < 10; i++) {
      const p = path.join(d, 'package.json');
      if (fs.existsSync(p)) {
        const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (j.name === 'specweave') return j.version;
      }
      d = path.dirname(d);
    }
  } catch {
    // ignore
  }
  return '0.0.0';
}
