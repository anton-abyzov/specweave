import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const { mockScanSkillContent } = vi.hoisted(() => ({
  mockScanSkillContent: vi.fn(),
}));

vi.mock('../../../../src/core/fabric/security-scanner.js', () => ({
  scanSkillContent: mockScanSkillContent,
}));

// Dynamic import after mocking
const { scanSkillCommand } = await import('../../../../src/cli/commands/scan-skill.js');

describe('scanSkillCommand', () => {
  let tmpDir: string;
  let skillFile: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-skill-test-'));
    skillFile = path.join(tmpDir, 'SKILL.md');
    fs.writeFileSync(skillFile, '# Test Skill\n\nHarmless content.');
  });

  it('reads file and calls scanSkillContent', async () => {
    mockScanSkillContent.mockReturnValue({ passed: true, findings: [] });

    await scanSkillCommand(skillFile, {});

    expect(mockScanSkillContent).toHaveBeenCalledWith('# Test Skill\n\nHarmless content.');
  });

  it('exits with code 1 when scan fails', async () => {
    mockScanSkillContent.mockReturnValue({
      passed: false,
      findings: [{ severity: 'critical', category: 'destructive-command', message: 'rm -rf detected', line: 3 }],
    });

    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await scanSkillCommand(skillFile, {});

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('exits with code 0 when scan passes', async () => {
    mockScanSkillContent.mockReturnValue({ passed: true, findings: [] });

    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await scanSkillCommand(skillFile, {});

    expect(mockExit).not.toHaveBeenCalled();
    mockExit.mockRestore();
  });

  it('outputs JSON when --json flag is set', async () => {
    const scanResult = {
      passed: false,
      findings: [{ severity: 'critical', category: 'obfuscation', message: 'atob() detected', line: 5 }],
    };
    mockScanSkillContent.mockReturnValue(scanResult);

    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await scanSkillCommand(skillFile, { json: true });

    const jsonCall = mockLog.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('"passed"'),
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0]);
    expect(parsed.passed).toBe(false);
    expect(parsed.findings).toHaveLength(1);

    mockLog.mockRestore();
    mockExit.mockRestore();
  });

  it('errors when file does not exist', async () => {
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    await scanSkillCommand('/nonexistent/SKILL.md', {});

    expect(mockExit).toHaveBeenCalledWith(1);
    mockError.mockRestore();
    mockExit.mockRestore();
  });
});
