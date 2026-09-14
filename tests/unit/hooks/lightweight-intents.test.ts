import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IntentStore } from '../../../src/dashboard/server/data/intent-store.js';
import { handle } from '../../../src/core/hooks/handlers/session-start.js';
import { createContext } from '../../../src/core/hooks/handlers/utils.js';
import { buildWorkHandoff } from '../../../src/core/session/work-handoff.js';

const roots: string[] = [];
function project() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sw-intent-context-'));
  roots.push(root);
  mkdirSync(path.join(root, '.specweave/state'), { recursive: true });
  writeFileSync(path.join(root, '.specweave/config.json'), '{}');
  return root;
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

describe('lightweight intent continuity', () => {
  it('discovers pending intents at SessionStart with no active increment', async () => {
    const root = project();
    const store = new IntentStore(root);
    const pending = store.create({ title: 'Keep exported dates readable', state: 'active' });
    const done = store.create({ title: 'Completed old request' });
    store.update(done.id, { revision: done.revision, state: 'done' });
    const before = readFileSync(path.join(root, '.specweave/intents/board.jsonl'), 'utf8');
    const result = await handle({}, createContext(root));
    const text = result.hookSpecificOutput?.additionalContext ?? '';
    expect(text).toContain('1 open intent');
    expect(text).toContain(pending.id);
    expect(text).toContain('Keep exported dates readable');
    expect(text).toContain('.specweave/intents/board.jsonl');
    expect(text).not.toContain('Completed old request');
    expect(readFileSync(path.join(root, '.specweave/intents/board.jsonl'), 'utf8')).toBe(before);
  });

  it('carries intent context into the scrubbed inline handoff and discovers the saved handoff', async () => {
    const root = project();
    const secret = 'ghp_' + 'a'.repeat(36);
    const pending = new IntentStore(root).create({ title: 'Fix export ' + secret, state: 'blocked' });
    const handoff = await buildWorkHandoff(root, { summary: 'Waiting for the sample file.', inline: true });
    expect(handoff.docMarkdown).toContain('Waiting for the sample file.');
    expect(handoff.docMarkdown).toContain(pending.id);
    expect(handoff.docMarkdown).toContain('board.jsonl');
    expect(handoff.docMarkdown).not.toContain(secret);
    expect(handoff.docMarkdown).toMatch(/redactions: [1-9]/);
    expect(handoff.pastePrompt).toContain(pending.id);
    expect(handoff.pastePrompt).not.toContain(secret);
    const session = await handle({}, createContext(root));
    expect(session.hookSpecificOutput?.additionalContext).toContain('Last handoff: .handoff/HANDOFF.md');
    expect(session.hookSpecificOutput?.additionalContext).not.toContain(secret);
  });

  it('keeps startup context bounded while pointing to remaining intents', async () => {
    const root = project();
    const store = new IntentStore(root);
    for (let i = 0; i < 8; i++) store.create({ title: `Request ${i} ` + 'x'.repeat(150), state: 'backlog' });
    const result = await handle({}, createContext(root));
    const text = result.hookSpecificOutput?.additionalContext ?? '';
    expect(text).toContain('8 open intents');
    expect(text).toContain('+5 more');
    expect(text.length).toBeLessThan(1000);
  });
});


describe('intent discovery fallbacks', () => {
  it('preserves valid history around interrupted records without claiming a complete count', async () => {
    const root = project();
    const intent = new IntentStore(root).create({ title: 'Still actionable' });
    const file = path.join(root, '.specweave/intents/board.jsonl');
    writeFileSync(file, readFileSync(file, 'utf8') + '{interrupted');
    const result = await handle({}, createContext(root));
    const text = result.hookSpecificOutput?.additionalContext ?? '';
    expect(text).toContain(intent.id);
    expect(text).toContain('counts may be incomplete');
  });

  it('points to an oversized board without scanning or inventing empty progress', async () => {
    const root = project();
    mkdirSync(path.join(root, '.specweave/intents'));
    writeFileSync(path.join(root, '.specweave/intents/board.jsonl'), 'x'.repeat(2 * 1024 * 1024 + 1));
    const result = await handle({}, createContext(root));
    const text = result.hookSpecificOutput?.additionalContext ?? '';
    expect(text).toContain('.specweave/intents/board.jsonl');
    expect(text).toContain('summary unavailable');
    expect(text).not.toContain('0 open');
  });
});
