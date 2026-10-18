// Docusaurus plugin: one page per published tutorial at /tutorials/<slug>/.
// Routes come from src/data/tutorials.json, so a guide cannot exist without a URL and a URL
// cannot exist without real media. Planned tutorials get no page.
'use strict';

const fs = require('fs');
const path = require('path');
const {transcriptByChapter} = require('./transcript');

const DATA = 'src/data/tutorials.json';
const COMPONENT = '@site/src/components/TutorialVideo/TutorialGuide.tsx';

module.exports = function tutorialPages(context) {
  const dataFile = path.join(context.siteDir, DATA);
  const staticFile = sitePath => path.join(context.siteDir, 'static', sitePath.replace(/^\//, ''));

  return {
    name: 'tutorial-pages',

    getPathsToWatch() {
      return [dataFile];
    },

    async loadContent() {
      const catalogue = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (catalogue.schemaVersion !== 2) throw new Error(`${DATA}: expected schemaVersion 2`);
      return catalogue.tutorials.map(tutorial => {
        const {video} = tutorial;
        for (const asset of [video.src, video.poster, video.captionsVtt]) {
          if (!fs.existsSync(staticFile(asset))) {
            throw new Error(`Tutorial ${tutorial.slug}: missing static file ${asset}`);
          }
        }
        const transcript = tutorial.transcript === 'captions'
          ? transcriptByChapter(fs.readFileSync(staticFile(video.captionsVtt), 'utf8'), video.chapters)
          : [];
        return {slug: tutorial.slug, transcript};
      });
    },

    async contentLoaded({content, actions}) {
      const base = context.siteConfig.baseUrl.replace(/\/$/, '');
      for (const {slug, transcript} of content) {
        actions.addRoute({
          path: `${base}/tutorials/${slug}/`,
          component: COMPONENT,
          exact: true,
          props: {slug, transcript},
        });
      }
    },
  };
};
