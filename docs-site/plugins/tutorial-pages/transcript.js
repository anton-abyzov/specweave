// Builds a readable transcript from a WebVTT caption file, grouped by the video's chapters.
// The captions are the real narration (or the descriptive on-screen captions of a silent
// video), so nothing here is written by hand or guessed.
'use strict';

function seconds(stamp) {
  const parts = stamp.trim().split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** WebVTT text -> [{start, text}] in file order. NOTE blocks, tags and [bracketed] sound cues are dropped. */
function parseVtt(vtt) {
  const cues = [];
  const blocks = vtt.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timing = lines.findIndex(line => line.includes('-->'));
    if (timing === -1) continue;
    const start = seconds(lines[timing].split('-->')[0]);
    const text = lines
      .slice(timing + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text && Number.isFinite(start)) cues.push({start, text});
  }
  return cues;
}

/** Cues -> one section per chapter: [{start, title, text}]. Empty chapters are kept out. */
function transcriptByChapter(vtt, chapters) {
  const cues = parseVtt(vtt);
  const sections = (chapters.length ? chapters : [{start: 0, title: 'Transcript'}]).map((chapter, i, all) => {
    const end = all[i + 1] ? all[i + 1].start : Infinity;
    const text = cues
      .filter(cue => cue.start + 0.05 >= chapter.start && cue.start + 0.05 < end)
      .map(cue => cue.text)
      .join(' ')
      .replace(/\s+([,.;:?])/g, '$1')
      .trim();
    return {start: chapter.start, title: chapter.title, text};
  });
  return sections.filter(section => section.text);
}

module.exports = {parseVtt, transcriptByChapter};
