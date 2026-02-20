/**
 * Unit tests: SKILL.md Security Self-Scan (increment 0244)
 * Tests detection rules, parser, scanner, and report generation.
 */

import { describe, it, expect } from 'vitest';
import { SKILL_SECURITY_RULES } from '../../../../src/core/skill-security/rules.js';
import { extractCodeBlocks, extractBashBlocks } from '../../../../src/core/skill-security/parser.js';
import { scanSkillMd } from '../../../../src/core/skill-security/scanner.js';
import { toBatchJson } from '../../../../src/core/skill-security/reporter.js';
import type { BatchScanEntry } from '../../../../src/core/skill-security/reporter.js';

// ─── T-001: Detection rules as structured data ──────────────────────────────

describe('T-001: Detection rules as structured data', () => {
  it('each rule has id, category, severity, pattern (regex), and suggestedFix', () => {
    expect(SKILL_SECURITY_RULES.length).toBeGreaterThan(0);

    for (const rule of SKILL_SECURITY_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low', 'info']).toContain(rule.severity);
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.suggestedFix).toBeTruthy();
    }
  });

  it('includes all 4 Gen Agent Trust Hub categories', () => {
    const ids = new Set(SKILL_SECURITY_RULES.map(r => r.id));
    expect(ids.has('CREDENTIALS_UNSAFE')).toBe(true);
    expect(ids.has('DATA_EXFILTRATION')).toBe(true);
    expect(ids.has('COMMAND_EXECUTION')).toBe(true);
    expect(ids.has('PROMPT_INJECTION')).toBe(true);
  });

  it('CREDENTIALS_UNSAFE rules have MEDIUM severity', () => {
    const rules = SKILL_SECURITY_RULES.filter(r => r.id === 'CREDENTIALS_UNSAFE');
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.severity).toBe('medium');
    }
  });

  it('COMMAND_EXECUTION rules have LOW severity', () => {
    const rules = SKILL_SECURITY_RULES.filter(r => r.id === 'COMMAND_EXECUTION');
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.severity).toBe('low');
    }
  });

  it('PROMPT_INJECTION rules have LOW severity', () => {
    const rules = SKILL_SECURITY_RULES.filter(r => r.id === 'PROMPT_INJECTION');
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.severity).toBe('low');
    }
  });
});

// ─── T-002: SKILL.md parser ─────────────────────────────────────────────────

describe('T-002: SKILL.md parser', () => {
  it('extracts 3 bash blocks with correct line numbers', () => {
    const markdown = [
      '# My Skill',
      '',
      '```bash',           // line 3
      'echo "hello"',      // line 4
      '```',               // line 5
      '',
      'Some text',
      '',
      '```bash',           // line 9
      'curl $URL',         // line 10
      '```',               // line 11
      '',
      '```sh',             // line 13
      'eval $CMD',         // line 14
      '```',               // line 15
    ].join('\n');

    const blocks = extractBashBlocks(markdown);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].startLine).toBe(3);
    expect(blocks[0].lang).toBe('bash');
    expect(blocks[1].startLine).toBe(9);
    expect(blocks[2].lang).toBe('sh');
  });

  it('returns empty array when no code blocks present', () => {
    const blocks = extractCodeBlocks('# Skill\n\nJust text here.');
    expect(blocks).toHaveLength(0);
  });

  it('extracts non-bash blocks too (extractCodeBlocks)', () => {
    const markdown = '```typescript\nconst x = 1;\n```\n';
    const blocks = extractCodeBlocks(markdown);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].lang).toBe('typescript');
    expect(blocks[0].content).toBe('const x = 1;');
  });

  it('extractBashBlocks filters to only bash/sh/shell/empty', () => {
    const markdown = [
      '```typescript',
      'const x = 1;',
      '```',
      '```bash',
      'echo $VAR',
      '```',
      '```shell',
      'ls -la',
      '```',
    ].join('\n');

    const blocks = extractBashBlocks(markdown);
    expect(blocks).toHaveLength(2);
    expect(blocks.every(b => ['bash', 'shell', 'sh', ''].includes(b.lang))).toBe(true);
  });

  it('handles unclosed code blocks gracefully', () => {
    const markdown = '```bash\necho hello\n';
    const blocks = extractCodeBlocks(markdown);
    expect(blocks).toHaveLength(0); // unclosed block not returned
  });
});

// ─── T-003: CREDENTIALS_UNSAFE detector ─────────────────────────────────────

describe('T-003: CREDENTIALS_UNSAFE detector', () => {
  it('flags CREDENTIALS_UNSAFE when bash snippet uses cat >> .env', () => {
    const skillMd = [
      '# Setup Skill',
      '',
      '```bash',
      'cat >> .env << EOF',
      'API_TOKEN=secret123',
      'EOF',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'CREDENTIALS_UNSAFE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('flags CREDENTIALS_UNSAFE when skill instructs to provide API token', () => {
    const skillMd = [
      '# Jira Sync Skill',
      '',
      'Please provide your API token to continue.',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'CREDENTIALS_UNSAFE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('flags echo of credential assignment in bash block', () => {
    const skillMd = [
      '# Config Skill',
      '',
      '```bash',
      'echo API_KEY=secret >> config.env',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'CREDENTIALS_UNSAFE');
    expect(finding).toBeDefined();
  });

  it('passes when skill only checks credential presence', () => {
    const skillMd = [
      '# Good Skill',
      '',
      '```bash',
      'if grep -q "API_KEY" .env; then',
      '  echo "Key found"',
      'fi',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const credFinding = result.findings.find(f => f.ruleId === 'CREDENTIALS_UNSAFE');
    expect(credFinding).toBeUndefined();
  });
});

// ─── T-004: DATA_EXFILTRATION detector ──────────────────────────────────────

describe('T-004: DATA_EXFILTRATION detector', () => {
  it('flags DATA_EXFILTRATION when curl uses a $DOMAIN variable URL', () => {
    const skillMd = [
      '# API Skill',
      '',
      '```bash',
      'curl $DOMAIN/api/endpoint',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'DATA_EXFILTRATION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('flags DATA_EXFILTRATION when fetch() uses a variable URL', () => {
    const skillMd = [
      '# Fetch Skill',
      '',
      '```bash',
      'fetch($API_URL)',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'DATA_EXFILTRATION');
    expect(finding).toBeDefined();
  });

  it('does not flag curl with a hardcoded HTTPS URL', () => {
    const skillMd = [
      '# Safe Skill',
      '',
      '```bash',
      'curl https://api.example.com/data',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'DATA_EXFILTRATION');
    expect(finding).toBeUndefined();
  });
});

// ─── T-005: COMMAND_EXECUTION detector ──────────────────────────────────────

describe('T-005: COMMAND_EXECUTION detector', () => {
  it('flags COMMAND_EXECUTION for unquoted $VAR in command argument', () => {
    const skillMd = [
      '# Deploy Skill',
      '',
      '```bash',
      'deploy $APP_NAME --env production',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'COMMAND_EXECUTION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('low');
  });

  it('flags COMMAND_EXECUTION for eval with variable argument', () => {
    const skillMd = [
      '# Dangerous Skill',
      '',
      '```bash',
      'eval $USER_COMMAND',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'COMMAND_EXECUTION');
    expect(finding).toBeDefined();
  });

  it('flags COMMAND_EXECUTION for sh -c with variable', () => {
    const skillMd = [
      '# Shell Skill',
      '',
      '```bash',
      'sh -c $SCRIPT_PATH',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'COMMAND_EXECUTION');
    expect(finding).toBeDefined();
  });
});

// ─── T-006: PROMPT_INJECTION detector ───────────────────────────────────────

describe('T-006: PROMPT_INJECTION detector', () => {
  it('flags PROMPT_INJECTION when user input variable is interpolated', () => {
    const skillMd = [
      '# Query Skill',
      '',
      'Process the user request: $USER_INPUT',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'PROMPT_INJECTION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('low');
  });

  it('flags PROMPT_INJECTION for QUERY variable without boundary markers', () => {
    const skillMd = [
      '# Search Skill',
      '',
      '```bash',
      'search --query $QUERY --index main',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    const finding = result.findings.find(f => f.ruleId === 'PROMPT_INJECTION');
    expect(finding).toBeDefined();
  });
});

// ─── T-007: Scan report with exit codes ─────────────────────────────────────

describe('T-007: Scan report with exit codes', () => {
  it('returns exit code 0 and passed=true when no findings', () => {
    const result = scanSkillMd('# Clean Skill\n\nNo issues here.');
    expect(result.exitCode).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('returns exit code 1 when only medium/low findings', () => {
    const skillMd = [
      '# Skill with medium',
      '',
      'Please provide your API token.',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    expect(result.exitCode).toBe(1);
    expect(result.passed).toBe(true); // medium/low = passed but concerns
  });

  it('returns exit code 2 when critical/high findings exist', () => {
    // Use a pattern that triggers the existing Tier-1 scanner's critical detection
    // The internal scanner also works alongside — but let's force medium (2=fail requires crit/high)
    // For this test, we override rules to include a critical rule
    const criticalRule = {
      id: 'TEST_CRITICAL',
      category: 'test',
      severity: 'critical' as const,
      pattern: /CRITICAL_TEST_PATTERN/,
      message: 'Test critical finding',
      suggestedFix: 'Fix it',
    };

    const result = scanSkillMd('CRITICAL_TEST_PATTERN\n', [criticalRule]);
    expect(result.exitCode).toBe(2);
    expect(result.passed).toBe(false);
  });

  it('report includes file, line, category, severity, suggestedFix', () => {
    const skillMd = [
      '# Skill',
      '',
      '```bash',
      'curl $DOMAIN/api',
      '```',
    ].join('\n');

    const result = scanSkillMd(skillMd);
    expect(result.findings.length).toBeGreaterThan(0);

    const f = result.findings[0];
    expect(f.ruleId).toBeTruthy();
    expect(f.category).toBeTruthy();
    expect(f.severity).toBeTruthy();
    expect(f.suggestedFix).toBeTruthy();
    expect(f.line).toBeGreaterThan(0);
    expect(f.matchedText).toBeTruthy();
  });
});

// ─── T-009: Batch scan JSON export ──────────────────────────────────────────

describe('T-009: Batch scan JSON export', () => {
  it('exports batch results as valid JSON with per-skill stats', () => {
    const entries: BatchScanEntry[] = [
      {
        file: 'plugins/specweave/skills/auto/SKILL.md',
        result: {
          exitCode: 0,
          passed: true,
          findings: [],
        },
      },
      {
        file: 'plugins/specweave-jira/skills/jira-sync/SKILL.md',
        result: {
          exitCode: 1,
          passed: true,
          findings: [
            {
              ruleId: 'CREDENTIALS_UNSAFE',
              category: 'credentials-unsafe',
              severity: 'medium',
              message: 'Test finding',
              suggestedFix: 'Fix it',
              line: 10,
              matchedText: 'example',
            },
          ],
        },
      },
    ];

    const json = toBatchJson(entries);
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);

    expect(parsed[0].file).toBe('plugins/specweave/skills/auto/SKILL.md');
    expect(parsed[0].exitCode).toBe(0);
    expect(parsed[0].counts.medium).toBe(0);

    expect(parsed[1].file).toContain('jira-sync');
    expect(parsed[1].exitCode).toBe(1);
    expect(parsed[1].counts.medium).toBe(1);
  });
});
