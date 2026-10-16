import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

// Guardrails for the SpecWithCode landing page (/code): savings stay qualified,
// screenshots stay real, and motion has a complete resting state.
describe('SpecWithCode landing page', () => {
  const page = read('pages/code.tsx');
  const value = read('components/ecosystem/SubscriptionValue.tsx');
  const flow = read('components/ecosystem/CoordinatorFlow.tsx');
  const why = read('components/ecosystem/WhySpecWithCode.tsx');
  const copy = [page, value, flow, why].join('\n');

  it('never promises a fixed savings multiplier', () => {
    expect(copy).not.toMatch(/\b\d+\s*[x×]\s*(cheaper|less|savings?)/i);
    expect(copy).not.toMatch(/(cheaper|save)[^.]{0,30}\b\d+\s*[x×]/i);
  });

  it('qualifies subscription value with limits, workload and enterprise billing', () => {
    expect(value).toMatch(/depends on your plan, model, limits and workload/);
    expect(value).toMatch(/not a quote or a promised multiplier/);
    expect(value).toMatch(/Enterprise plans can bill differently/);
  });

  it('keeps the cloud-provider qualification beside the download', () => {
    expect(page).toMatch(/Cloud models still receive prompts and relevant context/);
  });

  it('uses only published, real captures for screenshots', () => {
    const imgs = [...copy.matchAll(/\/img\/studio\/([\w.-]+\.(?:webp|png))/g)].map(m => m[1]);
    expect(imgs.length).toBeGreaterThan(4);
    for (const img of imgs) expect(fs.existsSync(path.resolve(__dirname, '../../static/img/studio', img))).toBe(true);
  });

  it('starts the coordinator diagram in its final state for no-JS and reduced motion', () => {
    expect(flow).toMatch(/useState\(3\)/);
    expect(flow).toMatch(/prefers-reduced-motion: reduce/);
  });

  it('sources every competitor cell in the comparison and dates the check', () => {
    const rows = why.slice(why.indexOf('const ROWS'), why.indexOf('function Src'));
    for (const block of rows.split('cells: [').slice(1)) {
      const cells = block.split(/,\n/).slice(1, 3);
      for (const cell of cells) expect(cell).toMatch(/<Src href="https:\/\//);
    }
    expect(why).toMatch(/const CHECKED = '\d{1,2} \w+ \d{4}'/);
  });

  it('describes SpecWeave increments as optional and read-only', () => {
    expect(why).toMatch(/Optional and read-only/);
    expect(why).not.toMatch(/every thread (gets|creates) (a|an) (spec|increment)/i);
  });

  it('redirects /studio to the canonical /code page', () => {
    expect(read('../docusaurus.config.ts')).toMatch(/\{from: \['\/studio'\], to: '\/code'\}/);
  });
});
