// Docusaurus plugin: one page per published tutorial at /tutorials/<slug>/.
// Routes come from src/data/tutorials.json, so a guide cannot exist without a URL and a URL
// cannot exist without real media. Planned tutorials get no page.
'use strict';

const fs = require('fs');
const path = require('path');
const {transcriptByChapter} = require('./transcript');

const DATA = 'src/data/tutorials.json';
const EXTRAS = 'src/data/tutorial-extras.json';
/** Terminal captures shown on a guide page come only from the recorded runs under this folder. */
const CAPTURE_ROOT = 'video/tutorials';
const CAPTURE_LINES = 20;
const COMPONENT = '@site/src/components/TutorialVideo/TutorialGuide.tsx';

module.exports = function tutorialPages(context) {
  const dataFile = path.join(context.siteDir, DATA);
  const extrasFile = path.join(context.siteDir, EXTRAS);
  const staticFile = sitePath => path.join(context.siteDir, 'static', sitePath.replace(/^\//, ''));
  const repoRoot = path.resolve(context.siteDir, '..');

  // A capture is a real, already redacted run: keep the command, exit code, the first lines of
  // stdout and when it ran. A path outside video/tutorials/ or a missing file fails the build.
  const loadCapture = (slug, {file, label}) => {
    const target = path.resolve(repoRoot, file);
    const rel = path.relative(path.join(repoRoot, CAPTURE_ROOT), target);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !file.endsWith('.json')) {
      throw new Error(`Tutorial ${slug}: capture ${file} must be a JSON file under ${CAPTURE_ROOT}/`);
    }
    if (!fs.existsSync(target)) throw new Error(`Tutorial ${slug}: missing capture ${file}`);
    const run = JSON.parse(fs.readFileSync(target, 'utf8'));
    const lines = String(run.stdout ?? '').replace(/\s+$/, '').split('\n');
    return {
      label,
      command: run.command,
      exitCode: typeof run.exitCode === 'number' ? run.exitCode : null,
      stdout: lines.slice(0, CAPTURE_LINES).join('\n'),
      truncated: lines.length > CAPTURE_LINES,
      capturedAt: run.capturedAt,
    };
  };

  return {
    name: 'tutorial-pages',

    getPathsToWatch() {
      return [dataFile, extrasFile];
    },

    async loadContent() {
      const catalogue = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (catalogue.schemaVersion !== 2) throw new Error(`${DATA}: expected schemaVersion 2`);
      const extras = JSON.parse(fs.readFileSync(extrasFile, 'utf8'));
      if (extras.schemaVersion !== 1) throw new Error(`${EXTRAS}: expected schemaVersion 1`);
      for (const slug of Object.keys(extras.guides)) {
        if (!catalogue.tutorials.some(t => t.slug === slug)) throw new Error(`${EXTRAS}: ${slug} is not a published tutorial`);
      }
      return catalogue.tutorials.map(tutorial => {
        const extra = extras.guides[tutorial.slug] ?? {};
        const {video} = tutorial;
        for (const asset of [video.src, video.poster, video.captionsVtt]) {
          // Videos are served from R2, not static/ (src/lib/media.ts); verify-tutorials checks they are published.
          if (/^\/video\/.+\.(mp4|webm|mov)$/.test(asset)) continue;
          if (!fs.existsSync(staticFile(asset))) {
            throw new Error(`Tutorial ${tutorial.slug}: missing static file ${asset}`);
          }
        }
        const transcript = tutorial.transcript === 'captions'
          ? transcriptByChapter(fs.readFileSync(staticFile(video.captionsVtt), 'utf8'), video.chapters)
          : [];
        const captures = (extra.captures ?? []).map(ref => loadCapture(tutorial.slug, ref));
        // Sitemap lastmod: the latest of first publication, the guide template change and the guide's own edit.
        const lastUpdatedAt = Math.max(
          ...[video.publishedAt, extras.guidesUpdatedAt, extra.updatedAt].filter(Boolean).map(Date.parse),
        );
        return {slug: tutorial.slug, transcript, captures, lastUpdatedAt};
      });
    },

    async contentLoaded({content, actions}) {
      const base = context.siteConfig.baseUrl.replace(/\/$/, '');
      for (const {slug, transcript, captures, lastUpdatedAt} of content) {
        actions.addRoute({
          path: `${base}/tutorials/${slug}/`,
          component: COMPONENT,
          exact: true,
          props: {slug, transcript, captures},
          // @docusaurus/plugin-sitemap reads lastUpdatedAt for <lastmod>.
          metadata: {sourceFilePath: path.relative(context.siteDir, dataFile), lastUpdatedAt},
        });
      }
    },
  };
};
