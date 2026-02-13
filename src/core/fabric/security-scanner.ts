/**
 * Security scanner for SKILL.md files.
 * Detects destructive commands, remote code execution, credential access,
 * prompt injection, frontmatter issues, and network access patterns.
 */

import { FabricSecurityScanResult, FabricSecurityFinding } from './registry-schema.js';

/** Context for safe-path detection (rm in temp dirs, etc.) */
const SAFE_RM_CONTEXTS = [
  /rm\s+-rf?\s+["']?\$\{?TMPDIR\}?/i,
  /rm\s+-rf?\s+["']?\$\{?TMP\}?/i,
  /rm\s+-rf?\s+["']?\/tmp\//i,
  /rm\s+-rf?\s+["']?\$\{?tmpdir\}?/i,
  /rm\s+-rf?\s+["']?os\.tmpdir/i,
];

interface PatternCheck {
  pattern: RegExp;
  severity: FabricSecurityFinding['severity'];
  category: string;
  message: string;
  /** If provided, the finding is suppressed when a safe-context regex matches the line */
  safeContexts?: RegExp[];
}

const PATTERN_CHECKS: PatternCheck[] = [
  // --- Destructive commands (critical) ---
  {
    pattern: /\brm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r|\brm\s+-rf\b|\brm\s+-f\b/,
    severity: 'critical',
    category: 'destructive-command',
    message: 'Destructive rm command detected (rm -rf / rm -f)',
    safeContexts: SAFE_RM_CONTEXTS,
  },
  {
    pattern: /\bformat\s+[a-zA-Z]:/i,
    severity: 'critical',
    category: 'destructive-command',
    message: 'Disk format command detected',
  },
  {
    pattern: /\bDROP\s+(TABLE|DATABASE)\b/i,
    severity: 'critical',
    category: 'destructive-command',
    message: 'SQL DROP statement detected',
  },

  // --- Remote code execution (critical) ---
  {
    pattern: /curl\s+[^\n|]*\|\s*(ba)?sh/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'curl piped to shell detected (curl | bash)',
  },
  {
    pattern: /wget\s+[^\n|]*\|\s*(ba)?sh/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'wget piped to shell detected (wget | bash)',
  },
  {
    pattern: /\beval\s*\(/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'eval() call detected',
  },
  {
    pattern: /\bexec\s*\(/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'exec() call detected',
  },
  {
    pattern: /\bchild_process\b/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'child_process usage detected',
  },

  // --- Credential access (high) ---
  {
    pattern: /\bcat\s+[^\n]*\.env\b|readFile[^\n]*\.env\b|fs\.[^\n]*\.env\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'Direct .env file reading pattern detected',
  },
  {
    pattern: /\bGITHUB_TOKEN\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'Direct GITHUB_TOKEN access detected',
  },
  {
    pattern: /\bAWS_SECRET\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'Direct AWS_SECRET access detected',
  },
  {
    pattern: /\bAPI_KEY\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'Direct API_KEY access detected',
  },
  {
    pattern: /\bcredentials\.json\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'credentials.json file access detected',
  },
  {
    pattern: /\bsecrets\.yaml\b/,
    severity: 'high',
    category: 'credential-access',
    message: 'secrets.yaml file access detected',
  },

  // --- Prompt injection (high) ---
  {
    pattern: /^<\/?system>/,
    severity: 'high',
    category: 'prompt-injection',
    message: 'System tag detected (potential prompt injection)',
  },
  {
    pattern: /\bignore\s+previous\s+instructions\b/i,
    severity: 'high',
    category: 'prompt-injection',
    message: '"Ignore previous instructions" detected (prompt injection)',
  },
  {
    pattern: /\byou\s+are\s+now\b/i,
    severity: 'high',
    category: 'prompt-injection',
    message: '"You are now" detected (potential prompt injection)',
  },
  {
    pattern: /\boverride\s+system\s+prompt\b/i,
    severity: 'high',
    category: 'prompt-injection',
    message: '"Override system prompt" detected (prompt injection)',
  },

  // --- Network access (info) ---
  {
    pattern: /\bfetch\s*\(/,
    severity: 'info',
    category: 'network-access',
    message: 'fetch() call detected',
  },
  {
    pattern: /\bhttp\.get\s*\(/,
    severity: 'info',
    category: 'network-access',
    message: 'http.get() call detected',
  },
  {
    pattern: /\baxios\b/,
    severity: 'info',
    category: 'network-access',
    message: 'axios usage detected',
  },
  {
    pattern: /https?:\/\/[^\s"')}\]]+/,
    severity: 'info',
    category: 'network-access',
    message: 'External URL reference detected',
  },
];

/**
 * Checks if a SKILL.md YAML frontmatter contains a `name:` field.
 * This is a medium-severity issue because it strips the plugin namespace prefix.
 */
function checkFrontmatterName(content: string): FabricSecurityFinding | null {
  // Frontmatter is between the first pair of --- delimiters
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  const frontmatterBody = frontmatterMatch[1];
  const frontmatterLines = frontmatterBody.split('\n');
  // content starts at line 2 (after the opening ---)
  const frontmatterStartLine = 2;

  for (let i = 0; i < frontmatterLines.length; i++) {
    const line = frontmatterLines[i];
    // Match `name:` at start of line (YAML key)
    if (/^name\s*:/.test(line.trim())) {
      return {
        severity: 'medium',
        category: 'frontmatter-issue',
        message: 'name: field in YAML frontmatter strips plugin namespace prefix',
        line: frontmatterStartLine + i,
      };
    }
  }

  return null;
}

/**
 * Scans a SKILL.md file content for security issues.
 * Returns pass/fail with detailed findings.
 */
export function scanSkillContent(content: string): FabricSecurityScanResult {
  const findings: FabricSecurityFinding[] = [];
  const lines = content.split('\n');

  // Check frontmatter for name: field
  const frontmatterFinding = checkFrontmatterName(content);
  if (frontmatterFinding) {
    findings.push(frontmatterFinding);
  }

  // Scan each line against pattern checks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const check of PATTERN_CHECKS) {
      if (check.pattern.test(line)) {
        // Check if this is a safe context (e.g., rm in temp dirs)
        if (check.safeContexts) {
          const isSafe = check.safeContexts.some(ctx => ctx.test(line));
          if (isSafe) continue;
        }

        findings.push({
          severity: check.severity,
          category: check.category,
          message: check.message,
          line: lineNum,
        });
      }
    }
  }

  return {
    passed: !findings.some(f => f.severity === 'critical' || f.severity === 'high'),
    findings,
  };
}
