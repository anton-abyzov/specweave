import {describe, it, expect} from 'vitest';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {GATE_TIMES, HANDOFF_TIMES, LEDGER, LEDGER_TIMES, PICKUP, PLAN_TIMES, SPEC_LINES, VERIFY_LINES} from '../components/home/story/data';
import {HOME_ICONS} from '../components/home/HomeIcon';

// The home page's #how story: four self-running stages on one example increment.
const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stages = read('src/components/home/story/Stages.tsx');
const story = read('src/components/home/story/Story.tsx');
const css = read('src/components/home/story/story.module.css');
const home = read('src/pages/index.tsx');

describe('home story', () => {
  it('writes the example in the formats specweave reads', () => {
    const criteria = SPEC_LINES.filter((l) => l.kind === 'ac');
    const tasks = SPEC_LINES.filter((l) => l.kind === 'task');
    const metas = SPEC_LINES.filter((l) => l.kind === 'meta');
    expect(criteria).toHaveLength(2);
    for (const l of criteria) expect(l.text).toMatch(/^- \[ \] AC-\d{2}: \S/);
    expect(tasks).toHaveLength(2);
    for (const l of tasks) expect(l.text).toMatch(/^### T-\d{2} \S/);
    expect(metas).toHaveLength(tasks.length);
    for (const l of metas) expect(l.text).toMatch(/^- AC: AC-\d{2}(, AC-\d{2})* \| Files: \S+ \| Test: \S/);
    // Every criterion is covered by a task, which is what the plan stage's last line says.
    for (const l of criteria) expect(metas.some((m) => m.text.includes(l.text.slice(6, 11)))).toBe(true);
    expect(SPEC_LINES.some((l) => l.text === '## Acceptance Criteria')).toBe(true);
  });

  it('keeps the ledger one JSON object per line, in time order, ending with Codex finishing the task', () => {
    for (const line of LEDGER) {
      const round = JSON.parse(JSON.stringify(line));
      expect(Object.keys(round).slice(0, 4)).toEqual(['t', 'e', 'by', 'at']);
      expect(round.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    const times = LEDGER.map((l) => Date.parse(l.at));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(LEDGER.find((l) => l.e === 'handoff')).toMatchObject({t: '*', by: 'claude@cloud'});
    expect(LEDGER[LEDGER.length - 1]).toMatchObject({t: 'T-02', e: 'done', by: 'codex@laptop'});
  });

  it('keeps the pickup, verify and review lines in the CLI formats', () => {
    expect(PICKUP[0][0]).toBe('Picked up the handoff from claude@cloud (out of tokens): applied 7 uncommitted files.');
    expect(PICKUP.find(([, next]) => next)?.[0]).toBe('Next: T-02 Restore the draft on return');
    expect(VERIFY_LINES.map(([text]) => text)).toEqual(['ok   npm test (exit 0)', 'ok   npm run lint (exit 0)', 'ok   npm run build (exit 0)', 'ACs 2/2 · tasks 2/2 done (0 skipped)', 'PASS → reports/verify.md']);
    expect(stages).toContain('Verdict: fix first → reports/review-codex.md');
    expect(stages).toContain('Verdict: ship → reports/review-codex.md');
  });

  it('plays every stage as rising step times and rests on the last step', () => {
    for (const times of [PLAN_TIMES, LEDGER_TIMES, HANDOFF_TIMES, GATE_TIMES]) {
      expect([...times].sort((a, b) => a - b)).toEqual([...times]);
      expect(new Set(times).size).toBe(times.length);
    }
    expect(Math.max(...SPEC_LINES.map((l) => l.at))).toBeLessThanOrEqual(PLAN_TIMES.length);
    // The server render and reduced motion start from, and return to, the complete picture.
    const clock = read('src/components/home/story/useSteps.ts');
    expect(clock).toMatch(/useState\(total\)/);
    expect(clock).toMatch(/prefers-reduced-motion: reduce/);
    expect(clock).toMatch(/const rest = \(\) => \{ stop\(\); setLive\(false\); setStep\(total\); \};/);
  });

  it('animates only under data-live and stops under reduced motion', () => {
    const animated = css.split('}').filter((rule) => /\banimation(-name)?:/.test(rule) && !/animation: none/.test(rule));
    expect(animated.length).toBeGreaterThan(10);
    for (const rule of animated) expect(rule, rule).toMatch(/\[data-live\]|\.scene:not\(:last-child\)::before/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.stage \*,/);
    expect(css).toMatch(/\.stage \[data-on="0"\] \{\s*visibility: hidden;/);
  });

  it('uses only Weave tokens for colour, apart from the logo plates', () => {
    const hex = css.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    expect(hex.sort()).toEqual(['#241523', '#f4f2f1']);
  });

  it('shows four scenes in order and keeps the section ids', () => {
    const order = ['icon="plan"', 'icon="ledger"', 'icon="handoff"', 'icon="verify"'].map((s) => story.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const id of ['family', 'how', 'proof', 'app', 'tutorials', 'built-with']) expect(home).toContain(`id="${id}"`);
    expect(home).not.toContain('HomeHandoff');
  });

  it('ships every icon and logo it names', () => {
    for (const name of HOME_ICONS) expect(existsSync(join(root, 'static/img/home/icons', `${name}.webp`)), name).toBe(true);
    for (const [, file] of stages.matchAll(/file: '([a-z]+)'/g)) expect(existsSync(join(root, 'static/img/studio/providers', `${file}.svg`)), file).toBe(true);
    for (const [, name] of (home + story + read('src/components/home/FamilyCards.tsx') + read('src/components/home/MeasuredPlanning.tsx')).matchAll(/HomeIcon name="([a-z]+)"/g)) expect(HOME_ICONS as readonly string[]).toContain(name);
  });

  it('carries every story string in every locale, with its placeholders and no em dash', () => {
    const source = stages + story;
    const ids = [...new Set([...source.matchAll(/id[:=] ?['"](home\.story\.[a-zA-Z.]+)['"]/g)].map((m) => m[1]))];
    expect(ids.length).toBeGreaterThanOrEqual(21);
    const english = (id: string) => new RegExp(`id[:=] ?['"]${id.replace(/\./g, '\\.')}['"][^>]*?(?:message: '([^']*)'|>\\{?'?([^<]*?)'?\\}?</Translate>)`, 's').exec(source);
    for (const loc of ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-CN']) {
      const msgs = JSON.parse(read(`i18n/${loc}/code.json`));
      for (const id of ids) {
        const message: string | undefined = msgs[id]?.message;
        expect(message, `${loc} ${id}`).toBeTruthy();
        expect(message, `${loc} ${id}`).not.toContain('—');
        const en = english(id);
        for (const placeholder of (en?.[1] ?? en?.[2] ?? '').match(/\{[a-z]+\}/g) ?? []) expect(message, `${loc} ${id}`).toContain(placeholder);
      }
    }
  });
});
