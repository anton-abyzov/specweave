/**
 * YouTube B-Roll Video Constants
 * Imports shared theme — no color duplication.
 */
export {COLORS, CONFIG, TIMING, BACKGROUNDS} from '../lib/theme';

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** Real verified stats from git repos (as of 2026-03-15) */
export const STATS = {
  totalCommits: 3913,
  specweaveCommits: 2594,
  vskillPlatformCommits: 581,
  vskillCommits: 393,
  umbrellaCommits: 345,
  totalReleases: 706,
  specweaveReleases: 597,
  vskillReleases: 109,
  releasesPerDay: 4,
  releasesPerMonth: 120,
  linesOfCode: 888032,
  linesOfMarkdown: 895736,
  testFiles: 828,
  sourceFiles: 3194,
  plugins: 24,
  skills: 136,
  hooks: 64,
  repos: 4,
  apps: 10,
  devMonths: 5,
} as const;
