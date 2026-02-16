import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const { mockScanSkillContent, mockJudgeFn } = vi.hoisted(() => ({
  mockScanSkillContent: vi.fn(),
  mockJudgeFn: vi.fn(),
}));

vi.mock('../../../../src/core/fabric/security-scanner.js', () => ({
  scanSkillContent: mockScanSkillContent,
}));

vi.mock('../../../../src/core/fabric/security-judge.js', () => ({
  SecurityJudge: class {
    judge = mockJudgeFn;
  },
}));

const { judgeSkillCommand } = await import('../../../../src/cli/commands/judge-skill.js');

describe('judgeSkillCommand', () => {
  let tmpDir: string;
  let skillFile: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-skill-test-'));
    skillFile = path.join(tmpDir, 'SKILL.md');
    fs.writeFileSync(skillFile, '# Test Skill\n\nHarmless content.');
  });

  it('runs Tier 1 + Tier 2 for clean file', async () => {
    mockScanSkillContent.mockReturnValue({ passed: true, findings: [] });
    mockJudgeFn.mockResolvedValue({
      verdict: 'PASS',
      score: 92,
      summary: 'Clean skill',
      threats: [],
      mitigations: [],
      duration_ms: 3000,
    });

    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await judgeSkillCommand(skillFile, {});

    expect(mockScanSkillContent).toHaveBeenCalled();
    expect(mockJudgeFn).toHaveBeenCalled();

    mockLog.mockRestore();
  });

  it('blocks at Tier 1 for critical findings (skips LLM)', async () => {
    mockScanSkillContent.mockReturnValue({
      passed: false,
      findings: [{ severity: 'critical', category: 'remote-code-execution', message: 'Pipe to shell', line: 5 }],
    });

    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await judgeSkillCommand(skillFile, {});

    expect(mockScanSkillContent).toHaveBeenCalled();
    expect(mockJudgeFn).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockLog.mockRestore();
    mockExit.mockRestore();
  });

  it('outputs JSON when --json flag is set', async () => {
    mockScanSkillContent.mockReturnValue({ passed: true, findings: [] });
    mockJudgeFn.mockResolvedValue({
      verdict: 'PASS',
      score: 90,
      summary: 'Clean',
      threats: [],
      mitigations: [],
      duration_ms: 1000,
    });

    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await judgeSkillCommand(skillFile, { json: true });

    const jsonCall = mockLog.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('"verdict"'),
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0]);
    expect(parsed.tier1).toBeDefined();
    expect(parsed.tier2).toBeDefined();

    mockLog.mockRestore();
  });

  it('errors when file does not exist', async () => {
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await judgeSkillCommand('/nonexistent/SKILL.md', {});

    expect(mockExit).toHaveBeenCalledWith(1);
    mockError.mockRestore();
    mockExit.mockRestore();
  });

  it('--scan-only flag skips LLM', async () => {
    mockScanSkillContent.mockReturnValue({ passed: true, findings: [] });

    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await judgeSkillCommand(skillFile, { scanOnly: true });

    expect(mockScanSkillContent).toHaveBeenCalled();
    expect(mockJudgeFn).not.toHaveBeenCalled();

    mockLog.mockRestore();
  });
});
