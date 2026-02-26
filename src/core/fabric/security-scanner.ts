/**
 * Security scanner for SKILL.md files.
 * Detects destructive commands, remote code execution, credential access,
 * prompt injection, frontmatter issues, and network access patterns.
 */

import { FabricSecurityScanResult, FabricSecurityFinding } from './registry-schema.js';

/** Safe DCI patterns — the canonical skill-memories lookup */
const SAFE_DCI_CONTEXTS = [
  /^\s*!\s*`for\s+d\s+in\s+\.specweave\/skill-memories/,
];

/** Temp-dir path patterns (reused across short-form and long-form rm) */
const TEMP_DIR_PATTERNS = [
  /\$\{?TMPDIR\}?/i,
  /\$\{?TMP\}?/i,
  /\/tmp\//i,
  /os\.tmpdir/i,
];

/** Context for safe-path detection (rm in temp dirs, etc.) */
const SAFE_RM_CONTEXTS = TEMP_DIR_PATTERNS.map(p => new RegExp(`rm\\s+-rf?\\s+["']?${p.source}`, p.flags));

/** Safe contexts for long-form rm flags (--force, --recursive) */
const SAFE_RM_LONG_FORM_CONTEXTS = TEMP_DIR_PATTERNS.map(p => new RegExp(`rm\\s+--(?:force|recursive)\\b[^\\n]*${p.source}`, p.flags));

interface PatternCheck {
  pattern: RegExp;
  severity: FabricSecurityFinding['severity'];
  category: string;
  message: string;
  /** If provided, the finding is suppressed when a safe-context regex matches the line */
  safeContexts?: RegExp[];
}

const PATTERN_CHECKS: PatternCheck[] = [
  // --- Destructive commands (high) ---
  {
    pattern: /\brm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r|\brm\s+-rf\b|\brm\s+-f\b/,
    severity: 'high',
    category: 'destructive-command',
    message: 'Destructive rm command detected (rm -rf / rm -f)',
    safeContexts: SAFE_RM_CONTEXTS,
  },
  {
    pattern: /\brm\s+--force\b|\brm\s+--recursive\b/,
    severity: 'high',
    category: 'destructive-command',
    message: 'Destructive rm command detected (long-form flags)',
    safeContexts: SAFE_RM_LONG_FORM_CONTEXTS,
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
  {
    pattern: /\bdd\s+if=.*\bof=\/dev\//,
    severity: 'critical',
    category: 'destructive-command',
    message: 'dd disk wipe command detected',
  },
  {
    pattern: /\bmkfs\b/,
    severity: 'critical',
    category: 'destructive-command',
    message: 'mkfs filesystem format command detected',
  },
  {
    pattern: /\bRemove-Item\b.*-Recurse.*-Force|\bRemove-Item\b.*-Force.*-Recurse/i,
    severity: 'critical',
    category: 'destructive-command',
    message: 'PowerShell Remove-Item -Recurse -Force detected',
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
  {
    pattern: /\bInvoke-Expression\b/i,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'PowerShell Invoke-Expression detected (remote code execution)',
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

  // --- Dangerous permissions (medium) ---
  {
    pattern: /\bchmod\s+(-R\s+)?777\b/,
    severity: 'medium',
    category: 'dangerous-permissions',
    message: 'chmod 777 detected (world-writable permissions)',
  },

  // --- Prompt injection (high) ---
  {
    pattern: /^\s*<\/?system>/,
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
    safeContexts: [
      /\byou\s+are\s+now\s+(ready|done|in|able|going|set|finished|complete|configured|running|connected|logged|signed|inside|using|looking|viewing|working|editing|on)\b/i,
    ],
  },
  {
    pattern: /\boverride\s+system\s+prompt\b/i,
    severity: 'high',
    category: 'prompt-injection',
    message: '"Override system prompt" detected (prompt injection)',
  },

  // --- Obfuscation (critical) ---
  {
    pattern: /\batob\s*\(/,
    severity: 'critical',
    category: 'obfuscation',
    message: 'atob() base64 decode detected (potential obfuscation)',
  },
  {
    pattern: /\bbtoa\s*\(/,
    severity: 'critical',
    category: 'obfuscation',
    message: 'btoa() base64 encode detected (potential obfuscation)',
  },
  {
    pattern: /\bbase64\s+(-[dD]|--decode)\b/,
    severity: 'critical',
    category: 'obfuscation',
    message: 'Shell base64 decode command detected (potential obfuscation)',
  },
  {
    pattern: /\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){3,}/,
    severity: 'critical',
    category: 'obfuscation',
    message: 'Hex escape sequence detected (potential obfuscation)',
  },
  {
    pattern: /unzip\s+-P\b|7z\s+.*-p[^\s]/i,
    severity: 'critical',
    category: 'obfuscation',
    message: 'Password-protected archive extraction detected',
  },

  // --- Credential path access (high) ---
  {
    pattern: /~\/\.ssh\/|\/\.ssh\//,
    severity: 'high',
    category: 'credential-access',
    message: 'SSH directory access detected (~/.ssh/)',
  },
  {
    pattern: /~\/\.aws\/|\/\.aws\//,
    severity: 'high',
    category: 'credential-access',
    message: 'AWS credentials directory access detected (~/.aws/)',
  },
  {
    pattern: /\.ethereum\/|\.solana\/|wallet\.dat/i,
    severity: 'high',
    category: 'credential-access',
    message: 'Cryptocurrency wallet path access detected',
  },

  // --- Memory poisoning (critical) ---
  {
    pattern: /(?:write|echo|cat|>>?)\s+.*(?:CLAUDE\.md|AGENTS\.md|\.claude\/)/i,
    severity: 'critical',
    category: 'memory-poisoning',
    message: 'Agent configuration file write detected (CLAUDE.md/.claude/)',
  },
  {
    pattern: /(?:write|echo|cat|>>?)\s+.*(?:SOUL\.md|MEMORY\.md)/i,
    severity: 'critical',
    category: 'memory-poisoning',
    message: 'Agent memory file write detected (SOUL.md/MEMORY.md)',
  },

  // --- Data exfiltration (high) ---
  {
    pattern: /curl\s+.*(-d\b|--data\b)/,
    severity: 'high',
    category: 'data-exfiltration',
    message: 'curl data upload detected (potential exfiltration)',
  },

  // --- Generic pipe to shell (critical) ---
  {
    pattern: /\|\s*(ba)?sh\b/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'Pipe to shell detected (| bash / | sh)',
  },

  // --- Extended RCE (critical) ---
  {
    pattern: /new\s+Function\s*\(/,
    severity: 'critical',
    category: 'remote-code-execution',
    message: 'new Function() constructor detected (dynamic code generation)',
  },

  // --- DCI Block Abuse (critical) ---
  // DCI blocks are shell commands in SKILL.md executed via ! prefix.
  {
    pattern: /^\s*!\s*`[^`]*(?:~\/\.ssh\/|~\/\.aws\/|\.env\b|\.gnupg\/)/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block reads credential files (~/.ssh/, ~/.aws/, .env)',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\b(?:curl|wget)\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block uses curl/wget for network access',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\b(?:fetch|nc|ncat|netcat)\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block uses fetch or netcat for network access',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*(?:>\s*.*(?:CLAUDE\.md|AGENTS\.md|\.claude\/|\.specweave\/))/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block writes to agent config files (CLAUDE.md, AGENTS.md, .claude/)',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*(?:tee|sed\s+-i|echo\s+.*>>)\s*.*(?:CLAUDE\.md|AGENTS\.md|\.claude\/)/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block modifies agent config via tee/sed/echo append',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\b(?:base64\s+(?:-[dD]|--decode)|atob\s*\()/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block contains base64 decoding (obfuscation)',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){3,}/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block contains hex escape sequences (obfuscation)',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\beval\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block uses eval for code execution',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\b(?:curl|wget)\b[^`]*\|\s*(?:ba|z|da|k)?sh\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block pipes downloaded content to shell (download-and-execute)',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*(?:\/dev\/tcp\/|bash\s+-i\s+>&|mkfifo|nc\s+-[a-z]*e)/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block establishes a reverse shell connection',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\bsudo\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block uses sudo for privilege escalation',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*\brm\s+-[a-zA-Z]*r[a-zA-Z]*f/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block executes destructive rm -rf command',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*(?:cat|less|head|tail|strings)\s+[^`]*(?:~\/\.|\/home\/[^`]*\.)/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block reads from home directory sensitive paths',
    safeContexts: SAFE_DCI_CONTEXTS,
  },
  {
    pattern: /^\s*!\s*`[^`]*(?:cat|tar|zip)\s+[^|`]*\|\s*(?:curl|wget|nc)\b/,
    severity: 'critical',
    category: 'dci-abuse',
    message: 'DCI block pipes local data to a network command',
    safeContexts: SAFE_DCI_CONTEXTS,
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

/** All malicious DCI pattern regexes for the two-pass safe check */
const MALICIOUS_DCI_REGEXES: RegExp[] = PATTERN_CHECKS
  .filter(c => c.category === 'dci-abuse')
  .map(c => new RegExp(c.pattern.source, c.pattern.flags));

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

  // Pre-scan: check if fenced code blocks are balanced.
  // If unclosed (odd number of ``` lines), downgrading is disabled to prevent bypass.
  const fenceCount = lines.filter(l => /^```/.test(l)).length;
  const codeBlocksBalanced = fenceCount % 2 === 0;

  // Scan each line against pattern checks
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track fenced code blocks (``` with optional language specifier)
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Check for inline suppression comment on previous line
    const prevLine = i > 0 ? lines[i - 1] : '';
    if (/<!--\s*scanner:ignore-next-line\s*-->/.test(prevLine)) {
      continue;
    }

    for (const check of PATTERN_CHECKS) {
      if (check.pattern.test(line)) {
        // Check if this is a safe context (e.g., rm in temp dirs)
        if (check.safeContexts) {
          const isSafe = check.safeContexts.some(ctx => ctx.test(line));
          if (isSafe) {
            // For DCI safe contexts: also verify no malicious DCI pattern matches
            // (prevents appended-command bypass after safe prefix)
            if (check.category === 'dci-abuse') {
              const hasMaliciousDci = MALICIOUS_DCI_REGEXES.some(p => p.test(line));
              if (hasMaliciousDci) {
                // Not actually safe — fall through to report finding
              } else {
                continue;
              }
            } else {
              continue;
            }
          }
        }

        // Downgrade severity inside balanced fenced code blocks only.
        // DCI-abuse findings are NEVER downgraded — DCI blocks execute even inside code fences.
        const severity = (inCodeBlock && codeBlocksBalanced && check.category !== 'dci-abuse')
          ? 'info' as const
          : check.severity;

        findings.push({
          severity,
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
