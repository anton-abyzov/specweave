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

  it('names the test switch and version wherever it claims a Claude Code to Codex handoff', () => {
    // Retested on 1.0.191 on 4 November 2026, with the Claude limit simulated by the test switch.
    expect(copy).toMatch(/Claude Code nears its limit, Codex picks up the same thread/);
    expect(copy).toMatch(/Codex \(SpecWithCode 1\.0\.191\)[^']*test switch|test switch[^']*Codex \(SpecWithCode 1\.0\.191\)/);
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

  it('draws only tested handoffs in the hero diagram', () => {
    const stage = read('components/code/FlowStage.tsx');
    const scenes = stage.slice(stage.indexOf('const SCENES'), stage.indexOf('const ease'));
    // Handoffs: Claude Code to Codex Free in the free scene only; subscriptions route new tasks.
    const free = scenes.slice(scenes.indexOf('free:'), scenes.indexOf('subs:'));
    const subs = scenes.slice(scenes.indexOf('subs:'));
    expect(free.match(/then: \{/g)?.length).toBe(1);
    expect(free).toMatch(/mark: 'claude'[^\n]*\n[^\n]*\n\s*then: \{mark: 'openai'[^}]*plan: 'Free ChatGPT account'/);
    expect(subs).not.toMatch(/then: \{/);
    expect(subs).not.toMatch(/deepseek|DeepSeek/);
    expect(subs).toMatch(/routed: \{task: '[^']+', to: 'copilot'/);
    // One free Codex account: no thread starts on a second free account.
    expect(free.match(/plan: 'Free ChatGPT account'/g)?.length).toBe(1);
    // No dated "real run" labels on an illustration.
    expect(stage.slice(stage.indexOf('export type Flow'))).not.toMatch(/real (run|capture)/i);
  });

  it('keeps the hero flow running under reduced motion', () => {
    // The scene clock and the beaded connectors are the explanation; only decorative motion may stop.
    const stage = read('components/code/FlowStage.tsx');
    expect(stage).not.toMatch(/matchMedia/);
    const css = read('components/code/FlowStage.module.css');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const flowing of ['.chat::after', '.threads::before', '.threads li::before', '.threadBusy::after', '.segDot', '.spin']) {
      expect(reduced).not.toMatch(new RegExp(`${flowing.replace(/[.:]/g, '\\$&')}[^{]*\{[^}]*animation: none`));
    }
  });

  it('links the Chrome extension from the hero, by its one shared URL', () => {
    expect(page).toMatch(/import \{CHROME_EXTENSION_URL\} from '\.\.\/components\/home\/chrome'/);
    expect(page).toMatch(/href=\{CHROME_EXTENSION_URL\} target="_blank" rel="noopener"/);
    expect(page).not.toMatch(/chromewebstore\.google\.com/);
  });

  it('has a translation entry for every piece of hero diagram copy', () => {
    const stage = read('components/code/FlowStage.tsx');
    const scenes = stage.slice(stage.indexOf('const SCENES'), stage.indexOf('const ease'));
    const copy = stage.slice(stage.indexOf('function flowCopy'), stage.indexOf('function useFlowText'));
    const keys = new Set([...copy.matchAll(/^\s*'([^']+)': translate\(/gm)].map(m => m[1]));
    // Plan names that are product names stay as written.
    const brands = new Set(['Claude Max', 'Claude Max · Opus 5.5', 'ChatGPT Pro', 'Copilot Free', 'Copilot Pro+']);
    const texts = [
      ...[...scenes.matchAll(/\b(?:task|plan|goal|result|atLimit): '([^']+)'/g)].map(m => m[1]),
      ...[...scenes.matchAll(/steps: \[([^\]]+)\]/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])),
    ];
    expect(texts.length).toBeGreaterThan(30);
    const missing = texts.filter(text => !keys.has(text) && !brands.has(text));
    expect(missing).toEqual([]);
  });

  it('never compares SpecWithCode with T3 Code or calls it a fork', () => {
    expect(copy).not.toMatch(/T3 Code|t3code/i);
    expect(copy).not.toMatch(/\bfork(ed)? of\b/i);
  });

  it('redirects /studio to the canonical /code page', () => {
    expect(read('../docusaurus.config.ts')).toMatch(/\{from: \['\/studio'\], to: '\/code'\}/);
  });
});
