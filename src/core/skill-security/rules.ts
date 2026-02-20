/**
 * Structured detection rules for SKILL.md self-scan.
 * Maps to Gen Agent Trust Hub audit categories.
 */

export interface SkillSecurityRule {
  /** Unique rule identifier (Gen Agent Trust Hub category) */
  id: string;
  /** Finding category label */
  category: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Regex pattern to match against content */
  pattern: RegExp;
  /** Human-readable description of the finding */
  message: string;
  /** Actionable fix suggestion */
  suggestedFix: string;
  /** If true, only scan inside bash/shell code blocks */
  codeBlockOnly?: boolean;
}

/**
 * CREDENTIALS_UNSAFE (MEDIUM)
 * Skills that instruct agents to collect or write secrets.
 */
const CREDENTIALS_UNSAFE_RULES: SkillSecurityRule[] = [
  {
    id: 'CREDENTIALS_UNSAFE',
    category: 'credentials-unsafe',
    severity: 'medium',
    pattern: /cat\s+>>?\s*\.env|echo\s+\w+=.*>>?\s*\.env|>>?\s*\.env\b/,
    message: 'CREDENTIALS_UNSAFE: Bash snippet writes to .env file',
    suggestedFix: 'Skills should only CHECK for credential presence (e.g., grep -q KEY .env), never write or append secrets.',
    codeBlockOnly: true,
  },
  {
    id: 'CREDENTIALS_UNSAFE',
    category: 'credentials-unsafe',
    severity: 'medium',
    pattern: /echo\s+[A-Z_][A-Z0-9_]*=/,
    message: 'CREDENTIALS_UNSAFE: Bash snippet echoes a secret variable assignment',
    suggestedFix: 'Avoid echoing credential assignments. Use grep -q to check if a key already exists.',
    codeBlockOnly: true,
  },
  {
    id: 'CREDENTIALS_UNSAFE',
    category: 'credentials-unsafe',
    severity: 'medium',
    pattern: /(?:please\s+)?(?:provide|enter|share|give|ask\s+for|supply|add)\s+(?:your\s+)?(?:api\s+)?(?:token|secret|key|password|credential|auth)/i,
    message: 'CREDENTIALS_UNSAFE: Skill instructs agent to prompt user for secrets',
    suggestedFix: 'Check for credential presence via environment variables or config files; never ask the user to type secrets.',
    codeBlockOnly: false,
  },
];

/**
 * DATA_EXFILTRATION (MEDIUM)
 * Skills that read secrets and transmit to user-controlled destinations.
 */
const DATA_EXFILTRATION_RULES: SkillSecurityRule[] = [
  {
    id: 'DATA_EXFILTRATION',
    category: 'data-exfiltration',
    severity: 'medium',
    pattern: /\bcurl\b[^\n]*\$\{?[A-Za-z_]\w*\}?/,
    message: 'DATA_EXFILTRATION: curl uses a variable URL without domain validation',
    suggestedFix: 'Validate domain strictly (allowlist of known-safe hostnames), enforce HTTPS-only, and prevent SSRF (block localhost/private IPs).',
    codeBlockOnly: true,
  },
  {
    id: 'DATA_EXFILTRATION',
    category: 'data-exfiltration',
    severity: 'medium',
    pattern: /\bfetch\s*\(\s*\$\{?[A-Za-z_]\w*\}?/,
    message: 'DATA_EXFILTRATION: fetch() uses a variable URL without domain validation',
    suggestedFix: 'Validate the URL against an allowlist of known-safe domains before making the request.',
    codeBlockOnly: true,
  },
  {
    id: 'DATA_EXFILTRATION',
    category: 'data-exfiltration',
    severity: 'medium',
    pattern: /https?:\/\/\*\.|domain\s*validation\s*allows\s*wildcards/i,
    message: 'DATA_EXFILTRATION: Domain validation allows wildcards (potential SSRF)',
    suggestedFix: 'Use strict hostname allowlists. Wildcards in domain validation enable SSRF attacks.',
    codeBlockOnly: false,
  },
];

/**
 * COMMAND_EXECUTION (LOW)
 * Bash snippets with unquoted variable interpolation or dynamic shell execution.
 */
const COMMAND_EXECUTION_RULES: SkillSecurityRule[] = [
  {
    id: 'COMMAND_EXECUTION',
    category: 'command-execution',
    severity: 'low',
    pattern: /\b(?:eval|source)\s+\$[A-Za-z_]/,
    message: 'COMMAND_EXECUTION: eval/source with variable argument enables arbitrary code execution',
    suggestedFix: 'Avoid eval/source with variable arguments. Use explicit paths or validated input.',
    codeBlockOnly: true,
  },
  {
    id: 'COMMAND_EXECUTION',
    category: 'command-execution',
    severity: 'low',
    pattern: /\bsh\s+-c\s+["']?\$[A-Za-z_]/,
    message: 'COMMAND_EXECUTION: sh -c with unquoted variable input enables shell injection',
    suggestedFix: 'Pass sh -c arguments as array elements, not interpolated strings. Validate all dynamic input before execution.',
    codeBlockOnly: true,
  },
  {
    id: 'COMMAND_EXECUTION',
    category: 'command-execution',
    severity: 'low',
    pattern: /\b\w[\w-]+\s+\$[A-Z_][A-Z0-9_]*\b(?!\s*=)/,
    message: 'COMMAND_EXECUTION: Command uses unquoted variable argument (risk of word splitting/globbing)',
    suggestedFix: 'Double-quote all variable references: use "$VARIABLE" instead of $VARIABLE in command arguments.',
    codeBlockOnly: true,
  },
];

/**
 * PROMPT_INJECTION (LOW)
 * User input interpolated without boundary markers or sanitization.
 */
const PROMPT_INJECTION_RULES: SkillSecurityRule[] = [
  {
    id: 'PROMPT_INJECTION',
    category: 'prompt-injection',
    severity: 'low',
    pattern: /\$\{?(?:USER_INPUT|USER_QUERY|INPUT|QUERY|REQUEST|USER_DATA|UNTRUSTED|RAW_INPUT)\}?/i,
    message: 'PROMPT_INJECTION: User-supplied input variable interpolated without sanitization',
    suggestedFix: 'Validate input against an allowlist regex before use. Add boundary markers (e.g., "--- USER INPUT ---") to separate trusted from untrusted content.',
    codeBlockOnly: false,
  },
  {
    id: 'PROMPT_INJECTION',
    category: 'prompt-injection',
    severity: 'low',
    pattern: /\{\{[^}]+\}\}.*without\s+(?:sanitiz|validat|escap)/i,
    message: 'PROMPT_INJECTION: Template interpolation without sanitization noted',
    suggestedFix: 'Add explicit sanitization or validation before interpolating dynamic content.',
    codeBlockOnly: false,
  },
];

/**
 * All detection rules, ordered by severity (medium → low)
 */
export const SKILL_SECURITY_RULES: SkillSecurityRule[] = [
  ...CREDENTIALS_UNSAFE_RULES,
  ...DATA_EXFILTRATION_RULES,
  ...COMMAND_EXECUTION_RULES,
  ...PROMPT_INJECTION_RULES,
];
