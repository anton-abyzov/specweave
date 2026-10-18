import {describe, it, expect} from 'vitest';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {
  AGENTS,
  TUTORIALS,
  agentLabel,
  buildVideoJsonLd,
  formatDuration,
  isoDuration,
  matchesFilter,
} from '../tutorials';

const staticDir = join(process.cwd(), 'static');

describe('tutorial catalogue', () => {
  it('has one SpecWithCode tutorial per agent; upcoming ones claim no media yet', () => {
    const perAgent = TUTORIALS.filter(t => AGENTS.some(a => a.id === t.agent));
    expect(perAgent.map(t => t.agent).sort()).toEqual(AGENTS.map(a => a.id).sort());
    const upcoming = TUTORIALS.filter(t => t.status === 'coming-soon');
    for (const t of upcoming) {
      expect(t.src).toBeNull();
      expect(t.poster).toBeNull();
      expect(t.captionsVtt).toBeNull();
      expect(t.durationSeconds).toBeNull();
      expect(t.chapters).toEqual([]);
    }
  });

  it('plays every published tutorial from first-party files with captions and ordered chapters', () => {
    const published = TUTORIALS.filter(t => t.status === 'published');
    expect(published.length).toBeGreaterThanOrEqual(5);
    for (const t of published) {
      for (const path of [t.src, t.poster, t.captionsVtt]) {
        expect(path).toMatch(/^\/[^/]/);
        expect(existsSync(join(staticDir, path!.slice(1)))).toBe(true);
      }
      expect(readFileSync(join(staticDir, t.captionsVtt!.slice(1)), 'utf8').startsWith('WEBVTT')).toBe(true);
      expect(t.chapters[0].start).toBe(0);
      const starts = t.chapters.map(c => c.start);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
      expect(Math.max(...starts)).toBeLessThan(t.durationSeconds!);
    }
  });

  it('uses unique slugs', () => {
    expect(new Set(TUTORIALS.map(t => t.slug)).size).toBe(TUTORIALS.length);
  });

  it('filters by agent, including multi-agent tutorials that show that agent', () => {
    const tour = TUTORIALS.find(t => t.slug === 'specwithcode-tour')!;
    expect(matchesFilter(tour, 'codex')).toBe(true);
    expect(matchesFilter(tour, 'grok')).toBe(false);
    expect(matchesFilter(tour, 'basics')).toBe(false);
    expect(agentLabel(tour)).toBe('Claude Code + Codex');
    const memory = TUTORIALS.find(t => t.slug === 'memory-and-usage')!;
    expect(matchesFilter(memory, 'basics')).toBe(true);
    expect(agentLabel(memory)).toBe('Any agent');
  });

  it('formats durations for people and for schema.org', () => {
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(89.9)).toBe('1:29');
    expect(isoDuration(61)).toBe('PT1M1S');
    expect(isoDuration(120)).toBe('PT2M');
    expect(isoDuration(28)).toBe('PT28S');
  });

  it('emits VideoObject data with chapter clips for published tutorials only', () => {
    const data = buildVideoJsonLd(TUTORIALS, 'https://spec-weave.com');
    const published = TUTORIALS.filter(t => t.status === 'published');
    expect(data['@graph']).toHaveLength(published.length);
    const tour = data['@graph'].find(v => v.name === 'SpecWithCode in 60 seconds')!;
    expect(tour.contentUrl).toBe('https://spec-weave.com/video/studio-tutorial.mp4');
    expect(tour.thumbnailUrl).toEqual(['https://spec-weave.com/img/studio/poster-tour-20261015.jpg']);
    expect(tour.duration).toBe('PT1M1S');
    expect(tour.hasPart[1]).toMatchObject({'@type': 'Clip', startOffset: 4, endOffset: 15, url: 'https://spec-weave.com/tutorials/?v=specwithcode-tour&t=4'});
    expect(tour.uploadDate).toBe('2026-10-10T05:08:31Z');
    for (const video of data['@graph']) {
      expect(video.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
    }
  });

  it('leaves a published video out of the schema until it has a first public time', () => {
    const tour = TUTORIALS.find(t => t.slug === 'specwithcode-tour')!;
    expect(buildVideoJsonLd([{...tour, publishedAt: null}], 'https://spec-weave.com')['@graph']).toEqual([]);
  });
});
