/**
 * Tutorial catalogue for /tutorials and the shared TutorialVideo component.
 * The data lives in tutorials.json so static/video/studio-projects/verify-tutorials.mjs
 * can check it without a TypeScript toolchain.
 */
import data from './tutorials.json';

export type AgentId = 'claude-code' | 'codex' | 'opencode' | 'antigravity' | 'grok' | 'cursor';
/** `multi`: shows several agents (see agentsShown). `any`: app basics that work with every agent. */
export type TutorialAgent = AgentId | 'multi' | 'any';
export type TutorialStatus = 'published' | 'coming-soon';

export interface TutorialChapter {
  /** Seconds from the start of the video. */
  start: number;
  title: string;
}

export interface Tutorial {
  slug: string;
  title: string;
  summary: string;
  status: TutorialStatus;
  agent: TutorialAgent;
  agentsShown: AgentId[];
  durationSeconds: number | null;
  /** First-party path under static/, or null until the video is published. */
  src: string | null;
  poster: string | null;
  captionsVtt: string | null;
  audio: 'silent' | 'narrated' | null;
  /** ISO date (YYYY-MM-DD) the video was published. */
  uploadDate: string | null;
  /** Site path of the written guide that goes with the video. */
  guide: string | null;
  chapters: TutorialChapter[];
  /** Planned sections for a tutorial that is not recorded yet. */
  outline?: string[];
  note?: string;
}

export const AGENTS: ReadonlyArray<{id: AgentId; label: string}> = [
  {id: 'claude-code', label: 'Claude Code'},
  {id: 'codex', label: 'Codex'},
  {id: 'opencode', label: 'OpenCode'},
  {id: 'antigravity', label: 'Antigravity'},
  {id: 'grok', label: 'Grok'},
  {id: 'cursor', label: 'Cursor'},
];

export const TUTORIALS: readonly Tutorial[] = data.tutorials as Tutorial[];

export function agentLabel(tutorial: Pick<Tutorial, 'agent' | 'agentsShown'>): string {
  if (tutorial.agent === 'any') return 'Any agent';
  if (tutorial.agent === 'multi') {
    const names = tutorial.agentsShown.map(id => AGENTS.find(a => a.id === id)?.label ?? id);
    return names.length ? names.join(' + ') : 'Several agents';
  }
  return AGENTS.find(a => a.id === tutorial.agent)?.label ?? tutorial.agent;
}

/** Filter keys: an agent id, `basics` for app basics, or `all`. */
export type TutorialFilter = AgentId | 'basics' | 'all';

export function matchesFilter(tutorial: Tutorial, filter: TutorialFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'basics') return tutorial.agent === 'any';
  return tutorial.agent === filter || tutorial.agentsShown.includes(filter);
}

export function getTutorial(slug: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.slug === slug);
}

/** 61 -> "1:01", 89.9 -> "1:29" (whole seconds, as native players show it). */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** 61 -> "PT1M1S" (ISO 8601, as schema.org VideoObject expects). */
export function isoDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60), s = total % 60;
  return `PT${m ? `${m}M` : ''}${s || !m ? `${s}S` : ''}`;
}

/** Page URL that opens a tutorial, optionally at a time offset (used for chapter deep links). */
export function tutorialUrl(origin: string, slug: string, start?: number): string {
  const t = start ? `&t=${Math.floor(start)}` : '';
  return `${origin}/tutorials/?v=${encodeURIComponent(slug)}${t}`;
}

/** schema.org VideoObject list for every published tutorial. */
export function buildVideoJsonLd(tutorials: readonly Tutorial[], origin: string) {
  const videos = tutorials
    .filter(t => t.status === 'published' && t.src && t.poster && t.durationSeconds && t.uploadDate)
    .map(t => {
      const duration = t.durationSeconds as number;
      return {
        '@type': 'VideoObject',
        '@id': `${origin}/tutorials/#${t.slug}`,
        name: t.title,
        description: t.summary,
        thumbnailUrl: [`${origin}${t.poster}`],
        uploadDate: t.uploadDate,
        duration: isoDuration(duration),
        contentUrl: `${origin}${t.src}`,
        embedUrl: tutorialUrl(origin, t.slug),
        inLanguage: 'en',
        isAccessibleForFree: true,
        publisher: {'@type': 'Organization', name: 'SpecWeave', url: origin},
        hasPart: t.chapters.map((c, i) => ({
          '@type': 'Clip',
          name: c.title,
          startOffset: Math.floor(c.start),
          endOffset: Math.floor(t.chapters[i + 1]?.start ?? duration),
          url: tutorialUrl(origin, t.slug, c.start),
        })),
      };
    });
  return {'@context': 'https://schema.org', '@graph': videos};
}
