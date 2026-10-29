import {describe, it, expect} from 'vitest';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {
  PATHS,
  PLANNED,
  REQUIRED_AGENTS,
  TUTORIALS,
  agentLabel,
  buildGuideJsonLd,
  buildHubJsonLd,
  buildVideoJsonLd,
  formatDate,
  formatDuration,
  getTutorial,
  guidePath,
  inboundLinks,
  isoDuration,
  legacyRedirect,
  matchesProduct,
  matchesQuery,
  parseStart,
  pathsFor,
  resolvePath,
  tutorialUrl,
} from '../tutorials';
import {parseVtt, transcriptByChapter} from '../../../plugins/tutorial-pages/transcript';

const staticDir = join(process.cwd(), 'static');
const origin = 'https://spec-weave.com';

describe('tutorial catalogue v2', () => {
  it('covers every required agent with a published or planned tutorial', () => {
    for (const agent of REQUIRED_AGENTS) {
      expect(TUTORIALS.some(t => t.agent === agent) || PLANNED.some(p => p.agent === agent)).toBe(true);
    }
  });

  it('plays every published tutorial from first-party files with captions and ordered chapters', () => {
    expect(TUTORIALS.length).toBeGreaterThanOrEqual(5);
    for (const t of TUTORIALS) {
      for (const path of [t.src, t.poster, t.captionsVtt]) {
        expect(path).toMatch(/^\/[^/]/);
        expect(existsSync(join(staticDir, path.slice(1)))).toBe(true);
      }
      expect(readFileSync(join(staticDir, t.captionsVtt.slice(1)), 'utf8').startsWith('WEBVTT')).toBe(true);
      expect(t.chapters[0].start).toBe(0);
      const starts = t.chapters.map(c => c.start);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
      expect(Math.max(...starts)).toBeLessThan(t.durationSeconds);
      // Flat media fields mirror the nested video record for older callers.
      expect(t.src).toBe(t.video.src);
      expect(t.chapters).toBe(t.video.chapters);
    }
  });

  it('gives every guide an outcome, steps and real related links', () => {
    for (const t of TUTORIALS) {
      expect(t.outcome.length).toBeGreaterThan(10);
      expect(t.steps.length).toBeGreaterThanOrEqual(2);
      expect(['cli', 'specwithcode']).toContain(t.product);
      for (const slug of t.related) expect(getTutorial(slug)).toBeDefined();
      expect(`${t.title} ${t.outcome} ${t.steps.join(' ')}`).not.toMatch(/!/);
    }
  });

  it('keeps planned tutorials free of media and out of the published list', () => {
    for (const p of PLANNED) {
      expect(getTutorial(p.slug)).toBeUndefined();
      for (const key of ['src', 'poster', 'captionsVtt', 'video', 'chapters']) expect(p).not.toHaveProperty(key);
    }
  });

  it('uses unique slugs across published and planned', () => {
    const slugs = [...TUTORIALS, ...PLANNED].map(t => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('resolves learning paths into published steps and a count of planned ones', () => {
    expect(PATHS.map(p => p.title)).toEqual(['Run work across agents', 'Run SpecWithCode', 'Ship a skill']);
    for (const path of PATHS) {
      const {published, planned} = resolvePath(path);
      expect(published.length + planned.length).toBe(path.steps.length);
      if (!path.url) expect(published.length).toBeGreaterThan(0);
    }
    expect(pathsFor('specweave-workflow').map(p => p.id)).toEqual(['run-work-across-agents']);
    expect(pathsFor('find-and-install-a-skill')).toEqual([]);
  });

  it('keeps the per-agent first-task episodes planned while they are re-recorded', () => {
    const agents = PLANNED.filter(p => p.slug.startsWith('specwithcode-') && p.agent).map(p => p.agent);
    expect(agents).toEqual(['claude-code', 'codex', 'opencode', 'grok', 'antigravity', 'cursor']);
  });

  it('links every published guide from another guide or a learning path', () => {
    for (const t of TUTORIALS) expect(inboundLinks(t.slug), t.slug).toBeGreaterThan(0);
  });

  it('gives every guide its own description', () => {
    const descriptions = TUTORIALS.map(t => t.seoDescription ?? t.summary);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('pins every chapter note to a real chapter start', () => {
    const noted = TUTORIALS.filter(t => t.chapterNotes?.length);
    expect(noted.map(t => t.slug)).toContain('how-specwithcode-works');
    for (const t of noted) {
      for (const note of t.chapterNotes!) expect(t.chapters.map(c => c.start)).toContain(note.start);
    }
  });

  it('filters by product and by every word of a query', () => {
    const workflow = getTutorial('specweave-workflow')!;
    const memory = getTutorial('memory-and-usage')!;
    expect(matchesProduct(workflow, 'cli')).toBe(true);
    expect(matchesProduct(memory, 'cli')).toBe(false);
    expect(matchesProduct(memory, 'all')).toBe(true);
    expect(matchesQuery(workflow, 'hand off')).toBe(true);
    expect(matchesQuery(workflow, 'HAND clone')).toBe(true);
    expect(matchesQuery(workflow, 'grok')).toBe(false);
    expect(agentLabel(getTutorial('specwithcode-tour')!)).toBe('Claude Code and Codex');
    expect(agentLabel(memory)).toBe('Any agent');
  });

  it('formats durations and dates for people and for schema.org', () => {
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(89.9)).toBe('1:29');
    expect(isoDuration(61)).toBe('PT1M1S');
    expect(isoDuration(120)).toBe('PT2M');
    expect(isoDuration(28)).toBe('PT28S');
    expect(formatDate('2026-10-12')).toBe('12 October 2026');
  });
});

describe('guide URLs and old deep links', () => {
  it('gives each guide its own page and chapter URLs', () => {
    expect(guidePath('specwithcode-tour')).toBe('/tutorials/specwithcode-tour/');
    expect(tutorialUrl(origin, 'specwithcode-tour', 4.6)).toBe('https://spec-weave.com/tutorials/specwithcode-tour/?t=4');
  });

  it('redirects ?v=<slug>&t=<s> to the guide page, and ignores unknown slugs', () => {
    expect(legacyRedirect('?v=specwithcode-tour&t=31')).toBe('/tutorials/specwithcode-tour/#t=31');
    expect(legacyRedirect('?v=memory-and-usage')).toBe('/tutorials/memory-and-usage/');
    expect(legacyRedirect('?v=specwithcode-cursor')).toBeNull();
    expect(legacyRedirect('?product=cli')).toBeNull();
  });

  it('reads a start time from the query or the hash', () => {
    expect(parseStart('?t=31', '')).toBe(31);
    expect(parseStart('', '#t=15')).toBe(15);
    expect(parseStart('', '#video')).toBeUndefined();
    expect(parseStart('?t=abc', '')).toBeUndefined();
  });
});

describe('structured data', () => {
  it('emits a VideoObject with chapter clips for tutorials with a first public time', () => {
    const data = buildVideoJsonLd(TUTORIALS, origin);
    expect(data['@graph']).toHaveLength(TUTORIALS.filter(t => t.publishedAt).length);
    const tour = data['@graph'].find(v => v.name === getTutorial('specwithcode-tour')!.title)!;
    expect(tour.contentUrl).toBe('https://media.spec-weave.com/video/studio-tutorial.mp4');
    expect(tour.thumbnailUrl).toEqual(['https://spec-weave.com/img/studio/poster-tour-20261015.jpg']);
    expect(tour.duration).toBe('PT1M1S');
    expect(tour).not.toHaveProperty('embedUrl');
    expect(tour.description).toBe(getTutorial('specwithcode-tour')!.seoDescription);
    expect(tour.hasPart[1]).toMatchObject({'@type': 'Clip', startOffset: 4, endOffset: 15, url: 'https://spec-weave.com/tutorials/specwithcode-tour/?t=4'});
    expect(tour.uploadDate).toBe('2026-10-10T05:08:31Z');
    for (const video of data['@graph']) {
      expect(video.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
    }
  });

  it('leaves a video out of the schema until it has a first public time', () => {
    const tour = getTutorial('specwithcode-tour')!;
    expect(buildVideoJsonLd([{...tour, publishedAt: null}], origin)['@graph']).toEqual([]);
    const guide = buildGuideJsonLd({...tour, publishedAt: null}, origin);
    expect(guide['@graph'][0]).not.toHaveProperty('video');
  });

  it('describes a guide page as a TechArticle with its video and breadcrumbs', () => {
    const t = getTutorial('specweave-workflow')!;
    const [article, crumbs] = buildGuideJsonLd(t, origin)['@graph'] as any[];
    expect(article['@type']).toBe('TechArticle');
    expect(article.url).toBe('https://spec-weave.com/tutorials/specweave-workflow/');
    expect(article.video['@type']).toBe('VideoObject');
    expect(article.video.hasPart).toHaveLength(t.chapters.length);
    expect(crumbs.itemListElement.map((i: any) => i.name)).toEqual(['Home', 'Tutorials', t.title]);
  });

  it('puts the caption transcript in the VideoObject', () => {
    const t = getTutorial('specweave-workflow')!;
    const transcript = [{start: 0, title: 'One', text: 'First line.'}, {start: 5, title: 'Two', text: 'Second line.'}];
    const [article] = buildGuideJsonLd(t, origin, transcript)['@graph'] as any[];
    expect(article.video.transcript).toBe('First line. Second line.');
    expect(buildGuideJsonLd(t, origin)['@graph'][0]).not.toHaveProperty('video.transcript');
  });

  it('lists every guide page on the hub without repeating the videos', () => {
    const [page] = buildHubJsonLd(TUTORIALS, origin)['@graph'] as any[];
    expect(page.mainEntity.itemListElement).toHaveLength(TUTORIALS.length);
    expect(JSON.stringify(page)).not.toContain('VideoObject');
  });
});

describe('transcripts from captions', () => {
  it('parses cues and drops NOTE blocks, tags and bracketed sound cues', () => {
    const vtt = 'WEBVTT\n\nNOTE written by hand\n\n00:00:00.000 --> 00:00:02.000\n[No sound] Hello <b>there</b>\n\n00:01:05.500 --> 00:01:07.000\nLater line';
    expect(parseVtt(vtt)).toEqual([{start: 0, text: 'Hello there'}, {start: 65.5, text: 'Later line'}]);
  });

  it('groups the real caption file of every published tutorial by chapter', () => {
    for (const t of TUTORIALS) {
      const sections = transcriptByChapter(readFileSync(join(staticDir, t.captionsVtt.slice(1)), 'utf8'), t.chapters);
      expect(sections.length).toBeGreaterThan(0);
      for (const s of sections) expect(t.chapters.some(c => c.start === s.start && c.title === s.title)).toBe(true);
    }
  });
});
