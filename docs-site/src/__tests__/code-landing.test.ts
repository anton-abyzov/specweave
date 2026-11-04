import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

// Guardrails for the SpecWithCode landing page (/code, specwithcode.com): claims stay
// within what was tested, screenshots stay real, and brand rules hold.
describe('SpecWithCode landing page', () => {
  const page = read('pages/code.tsx');
  // Visible copy only: the header comment records test notes and is allowed to name what not to claim.
  const start = page.indexOf('const SITE');
  const copy = page.slice(start);

  it('finds the visible copy to check', () => {
    expect(start).toBeGreaterThan(-1);
  });

  it('never promises a fixed savings multiplier', () => {
    expect(copy).not.toMatch(/\b\d+\s*[x×]\s*(cheaper|less|savings?)/i);
    expect(copy).not.toMatch(/(cheaper|save)[^.]{0,30}\b\d+\s*[x×]/i);
  });

  it('keeps the cloud-provider qualification on the page', () => {
    expect(page).toMatch(/Cloud models still receive prompts and relevant context/);
  });

  it('uses only published, real captures for screenshots', () => {
    const imgs = [...copy.matchAll(/\/img\/studio\/([\w.-]+\.(?:webp|png))/g)].map(m => m[1]);
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    for (const img of imgs) expect(fs.existsSync(path.resolve(__dirname, '../../static/img/studio', img))).toBe(true);
  });

  it('says source available, never open source', () => {
    expect(copy).toMatch(/source available/i);
    expect(copy).not.toMatch(/open[- ]source/i);
  });

  it('never implies token resale or free Claude Code', () => {
    expect(copy).toMatch(/never resells tokens/);
    expect(copy).not.toMatch(/free Claude( Code)?\b/i);
  });

  it('does not claim a Claude Code to Codex handoff, which is not yet retested', () => {
    expect(copy).not.toMatch(/Claude( Code)?[^.]{0,60}(continues|moves|hands?)[^.]{0,20}(on|to) Codex/i);
    expect(copy).not.toMatch(/uses them first/);
  });

  it('marks the handoff capture as a test-switch limit, not a real one', () => {
    expect(copy).not.toMatch(/Claude( Code)? hit its (usage )?limit/i);
    expect(copy).toMatch(/test switch/);
  });

  it('shows a provider logo that exists for each provider it names', () => {
    for (const mark of ['claude', 'openai', 'deepseek']) {
      expect(fs.existsSync(path.resolve(__dirname, '../../static/img/studio/providers', `${mark}.svg`))).toBe(true);
      expect(copy).toMatch(new RegExp(`marks\\.${mark}`));
    }
  });

  it('never compares SpecWithCode with T3 Code or calls it a fork', () => {
    expect(copy).not.toMatch(/T3 Code|t3code/i);
    expect(copy).not.toMatch(/\bfork(ed)? of\b/i);
  });

  it('redirects /studio to the canonical /code page', () => {
    expect(read('../docusaurus.config.ts')).toMatch(/\{from: \['\/studio'\], to: '\/code'\}/);
  });
});
