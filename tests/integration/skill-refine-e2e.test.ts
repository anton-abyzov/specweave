/**
 * Skill-refinement end-to-end integration test (0671 — T-022).
 *
 * Walks the full flow:
 *   1. A mock judge-llm-report.json rejects a fixture increment and cites
 *      the skill `sw:architect` in its findings.
 *   2. The judge-llm emitter path (modelled here by directly invoking
 *      `appendRefinementSignal` with data extracted from the report) writes
 *      a refinement signal into `.specweave/state/skill-signals.json`.
 *   3. `aggregate()` gathers signals for `sw:architect`.
 *   4. `proposeDiff()` is invoked against a stubbed Anthropic client. The
 *      stub returns a JSON payload whose diff body references one of the
 *      evidence excerpts from the judge report — verifying that the
 *      prompt carries the evidence all the way through.
 *   5. `--dry-run` is modelled by asserting that no writes occurred on the
 *      SKILL.md fixture and no ledger entry was written.
 *
 * No real Anthropic API calls — the SDK is replaced via vi.hoisted() +
 * vi.mock() following the pattern in tests/integration/prompt-caching.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const { messagesCreateMock } = vi.hoisted(() => {
  return { messagesCreateMock: vi.fn() };
});

// Replace the SDK at module-resolution time so any downstream import picks up
// the stub. The skill-refine code accepts an injected client, but we mock the
// SDK too so that future refactors which `new Anthropic()` internally still
// hit the stub instead of the network.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = { create: messagesCreateMock };
  },
}));

import { appendRefinementSignal } from '../../src/core/skill-signals/writer.js';
import { aggregate } from '../../src/core/skill-refine/aggregator.js';
import { proposeDiff } from '../../src/core/skill-refine/haiku-diff.js';
import type { HaikuClientLike } from '../../src/core/skill-refine/haiku-diff.js';

const FIXTURES = join(__dirname, '..', 'fixtures', '0671');

interface JudgeFinding {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  attributableSkill?: string;
}

interface JudgeReport {
  incrementId: string;
  verdict: string;
  findings: JudgeFinding[];
}

function loadJudgeReport(): JudgeReport {
  return JSON.parse(readFileSync(join(FIXTURES, 'judge-llm-report.json'), 'utf-8'));
}

function loadSkillMd(): string {
  return readFileSync(join(FIXTURES, 'skill-architect-SKILL.md'), 'utf-8');
}

function mkWorkspace(): { dir: string; signalsPath: string; skillPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'sw-refine-e2e-'));
  const signalsPath = join(dir, '.specweave', 'state', 'skill-signals.json');
  const skillPath = join(dir, 'skills', 'architect', 'SKILL.md');
  // The skill fixture is copied into the workspace so we can verify later
  // that --dry-run did NOT mutate it.
  const { mkdirSync } = require('fs') as typeof import('fs');
  mkdirSync(join(dir, 'skills', 'architect'), { recursive: true });
  writeFileSync(skillPath, loadSkillMd(), 'utf-8');
  return { dir, signalsPath, skillPath };
}

describe('skill-refine end-to-end (0671)', () => {
  beforeEach(() => {
    messagesCreateMock.mockReset();
  });

  it('flows: judge-llm report → signal → aggregate → Haiku diff references evidence (dry-run, no writes)', async () => {
    const ws = mkWorkspace();
    const report = loadJudgeReport();

    // 1. judge-llm emitter side — for each finding that names a skill,
    //    append a refinement signal. In production this is done by the
    //    sw:judge-llm post-processing step (T-004). The fixture carries
    //    `attributableSkill` already-resolved by the attribution heuristic
    //    in src/core/skill-attribution.ts; here we honour it directly.
    const attributableFindings = report.findings.filter((f) => !!f.attributableSkill);
    expect(attributableFindings.length).toBeGreaterThan(0);

    for (const f of attributableFindings) {
      await appendRefinementSignal(ws.signalsPath, {
        source: 'judge-llm',
        targetSkill: f.attributableSkill!,
        severity: f.severity,
        incrementId: report.incrementId,
        evidence: f.description,
      });
    }

    // 2. aggregate — the input the Haiku prompt consumes.
    const agg = await aggregate(ws.signalsPath, 'sw:architect', { lastNIncrements: 5 });
    expect(agg.totalSignals).toBe(attributableFindings.length);
    expect(agg.bySource['judge-llm']).toBe(attributableFindings.length);
    expect(agg.incrementIds).toContain(report.incrementId);

    // 3. Stub Anthropic client — capture the request so we can assert
    //    evidence is carried into the prompt.
    let capturedUserPrompt = '';
    const stubbedDiff = `--- a/SKILL.md
+++ b/SKILL.md
@@ -10,3 +10,5 @@
 Always split persistence from transport into separate services.
+
+Exception: for features expected to handle under 100 req/min, a single-service design is preferred.
`;
    const client: HaikuClientLike = {
      messages: {
        create: async (args) => {
          capturedUserPrompt = args.messages[0]?.content ?? '';
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  diff: stubbedDiff,
                  rationale:
                    'Relax always-split guidance for low-traffic features (2 signals from 9991-fixture-refine).',
                }),
              },
            ],
          };
        },
      },
    };

    const mtimeBefore = statSync(ws.skillPath).mtimeMs;

    // 4. Run the Haiku diff step. This is what `sw:skill-refine --dry-run`
    //    does — generate the diff, print it, do not write.
    const result = await proposeDiff({
      client,
      skillMd: readFileSync(ws.skillPath, 'utf-8'),
      aggregate: agg,
    });

    expect(result.diff).toContain('under 100 req/min');
    expect(result.rationale).toMatch(/low-traffic|9991-fixture-refine/i);

    // 4a. Verify an evidence excerpt from the judge report is actually
    //     present in the Haiku prompt. This is the "references the
    //     original evidence" check called out in the AC for T-022.
    const firstEvidence = attributableFindings[0].description;
    // Take a distinctive 8-word slice so the assertion is insensitive to
    // whitespace normalization.
    const excerpt = firstEvidence.split(/\s+/).slice(0, 8).join(' ');
    expect(capturedUserPrompt).toContain(excerpt);

    // 5. --dry-run invariants: SKILL.md was NOT mutated; no ledger file
    //    was created.
    expect(statSync(ws.skillPath).mtimeMs).toBe(mtimeBefore);
    expect(existsSync(join(ws.dir, '.specweave', 'state', 'skill-refinements.json'))).toBe(false);

    rmSync(ws.dir, { recursive: true, force: true });
  });

  it('returns empty-signal aggregate when no refinements target the requested skill', async () => {
    const ws = mkWorkspace();
    // Seed a refinement for a different skill.
    await appendRefinementSignal(ws.signalsPath, {
      source: 'judge-llm',
      targetSkill: 'sw:pm',
      severity: 'low',
      incrementId: '9991-fixture-refine',
      evidence: 'sw:pm advised skipping ACs',
    });

    const agg = await aggregate(ws.signalsPath, 'sw:architect', { lastNIncrements: 5 });
    expect(agg.totalSignals).toBe(0);
    expect(agg.evidence).toEqual([]);

    rmSync(ws.dir, { recursive: true, force: true });
  });
});
