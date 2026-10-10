import {loadFont as loadSerif} from '@remotion/google-fonts/Newsreader';
import {loadFont as loadSans} from '@remotion/google-fonts/IBMPlexSans';
import {loadFont as loadMono} from '@remotion/google-fonts/IBMPlexMono';

// Same type and colors as spec-weave.com (Newsreader + IBM Plex Sans on paper).
const serif = loadSerif('normal', {weights: ['400', '500'], subsets: ['latin']});
loadSerif('italic', {weights: ['400'], subsets: ['latin']});
const sans = loadSans('normal', {weights: ['400', '500', '600'], subsets: ['latin']});
const mono = loadMono('normal', {weights: ['400', '500'], subsets: ['latin']});

export const FONT = {
  serif: serif.fontFamily,
  sans: sans.fontFamily,
  mono: mono.fontFamily,
};

export const C = {
  paper: '#f6f4ee',
  card: '#fdfcf9',
  ink: '#20231c',
  muted: '#6b6f63',
  line: '#d9dccf',
  olive: '#596b45',
  oliveSoft: '#e8eddf',
  rust: '#b1411c',
  rustSoft: '#f6e3da',
  terminal: '#1d1f1a',
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
