# RFC: Secure Skill Factory Standard

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US4-01, AC-US4-06 (T-007)

---

## Abstract

This RFC defines the **Secure Skill Factory Standard** — a specification for how AI agent skills (SKILL.md files) should be authored, verified, and distributed to prevent the supply chain attacks documented by Snyk's ToxicSkills study (36.82% flaw rate, 76 malicious payloads). The standard introduces mandatory SKILL.md sections, a forbidden patterns list, and a built-in security prompt template that skill authors must follow to qualify for verification.

---

## 1. Motivation

The AI agent skills ecosystem lacks authoring standards. Anyone can publish a SKILL.md file with arbitrary content that AI agents will interpret as executable instructions. This has led to:

- **76 confirmed malicious payloads** across ClawHub and Skills.sh (Snyk ToxicSkills, Feb 2026)
- **36.82% of 3,984 scanned skills** containing security flaws
- **Smithery breach** (June 2025): path traversal exposed 3,000+ MCP servers
- **ClawHavoc campaign**: 335 infostealer packages deploying Atomic macOS Stealer
- **Memory poisoning**: Attackers targeting SOUL.md and MEMORY.md for persistent behavioral modification

The root cause: no standard defines what a "safe" skill looks like. This RFC fills that gap.

---

## 2. Specification

### 2.1 Mandatory SKILL.md Sections

Every skill seeking verification (Tier 1+) MUST include these sections in its SKILL.md file:

#### 2.1.1 `description` (Frontmatter — REQUIRED)

```yaml
---
description: >-
  One-paragraph description of what this skill does.
  Must clearly state the skill's purpose and scope.
  Must describe WHEN the skill should be activated.
---
```

**Requirements**:
- 10-1024 characters
- Must describe both WHAT the skill does and WHEN it activates
- Must not contain instructions (instructions go in the body)
- Must not reference other skills by name (coupling risk)

#### 2.1.2 `scope` Section (Body — REQUIRED)

Declares the operational boundaries of the skill.

```markdown
## Scope

**Languages**: TypeScript, JavaScript
**Frameworks**: React 18+, Next.js 14+
**Tools Used**: Read, Grep, Glob, Bash(npm:*), Bash(npx:*)
**File Patterns**: `src/components/**/*.tsx`, `src/hooks/**/*.ts`
**Does NOT**: Modify configuration files, access network, install packages
```

**Requirements**:
- Must list languages and frameworks the skill applies to
- Must list tools the skill instructs the agent to use (maps to `allowed-tools`)
- Must list file patterns the skill operates on
- Must include a "Does NOT" clause listing out-of-scope actions
- If the skill uses `Bash`, must specify the command prefixes allowed

#### 2.1.3 `permissions` Section (Body — REQUIRED for skills using Bash/Write/Edit)

Declares what the skill needs access to and why.

```markdown
## Permissions

| Permission | Justification |
|------------|---------------|
| `Bash(npm:*)` | Running npm scripts for validation |
| `Bash(git:*)` | Checking commit history for context |
| `Write` | Generating component files |
| `Read` | Reading existing source files for context |
```

**Requirements**:
- Every tool the skill instructs the agent to use must be listed
- Each permission must have a human-readable justification
- Permissions must match the `allowed-tools` frontmatter field
- Skills that need no Bash/Write/Edit access may omit this section

**Permission Categories** (from least to most privileged):

| Level | Tools | Risk |
|-------|-------|------|
| **Read-Only** | Read, Grep, Glob | Minimal |
| **File-Modifying** | Read, Grep, Glob, Edit, Write | Medium |
| **Shell-Limited** | Above + Bash(specific-command:*) | Medium-High |
| **Shell-Unrestricted** | Above + Bash(*) | High |
| **Network-Capable** | Above + WebFetch, WebSearch | High |

#### 2.1.4 `security-notes` Section (Body — REQUIRED)

Transparently documents any security-relevant behavior.

```markdown
## Security Notes

- This skill runs `npm run validate` which executes project-local scripts
- This skill reads `.env.example` (never `.env`) for environment variable names
- This skill generates files only in `src/components/` — never in root or config dirs
- No network access required
- No credentials accessed
```

**Requirements**:
- Must disclose any shell command execution with specific commands listed
- Must disclose any file reading outside the skill's declared scope
- Must disclose any network access (even informational)
- Must state "No credentials accessed" explicitly if the skill doesn't need credentials
- Empty security notes ("No security-relevant behavior") are valid for read-only skills

### 2.2 Recommended SKILL.md Sections

These sections are not mandatory for verification but improve quality scores:

#### 2.2.1 `compatibility` Section

```markdown
## Compatibility

**Tested Agents**: Claude Code, Codex CLI, Gemini CLI, Cursor
**Requires**: `allowed-tools` support
**Not Compatible With**: Kiro CLI (no allowed-tools), Zencoder (no allowed-tools)
```

#### 2.2.2 `version-history` Section

```markdown
## Version History

- **1.2.0** (2026-02-15): Added React 19 ref-as-prop patterns
- **1.1.0** (2026-01-20): Added Server Component optimization rules
- **1.0.0** (2026-01-05): Initial release
```

#### 2.2.3 `testing` Section

```markdown
## Testing

**Given** a new React component is created
**When** the component uses state management
**Then** it should follow the Zustand selector pattern per this skill's rules

**Given** an existing component has inline styles
**When** the skill is activated
**Then** it should suggest CSS module extraction without breaking functionality
```

---

## 3. Forbidden Patterns

Skills containing these patterns will **automatically fail** Tier 1 scanning. These are drawn from SpecWeave's existing `security-scanner.ts` (26 patterns) plus additional patterns identified from the Snyk ToxicSkills study.

### 3.1 Critical — Automatic Reject

| ID | Pattern | Category | Rationale |
|----|---------|----------|-----------|
| FP-001 | `eval()` / `eval(` | Remote Code Execution | Arbitrary code execution; no legitimate use in SKILL.md |
| FP-002 | `exec()` / `exec(` | Remote Code Execution | Shell command execution without constraints |
| FP-003 | `child_process` | Remote Code Execution | Direct process spawning |
| FP-004 | `curl \| bash` / `wget \| bash` | Remote Code Execution | Remote script download and execution |
| FP-005 | `Invoke-Expression` | Remote Code Execution | PowerShell arbitrary execution |
| FP-006 | `rm -rf /` (without temp dir context) | Destructive Command | Filesystem destruction |
| FP-007 | `DROP TABLE` / `DROP DATABASE` | Destructive Command | Database destruction |
| FP-008 | `dd if=... of=/dev/` | Destructive Command | Disk wipe |
| FP-009 | `mkfs` | Destructive Command | Filesystem format |
| FP-010 | `format C:` | Destructive Command | Windows disk format |
| FP-011 | `Remove-Item -Recurse -Force` | Destructive Command | PowerShell filesystem destruction |
| FP-012 | `chmod 777` | Dangerous Permissions | World-writable (security bypass) |
| FP-013 | `<system>` tags | Prompt Injection | System prompt override attempt |
| FP-014 | "ignore previous instructions" | Prompt Injection | Instruction override attempt |
| FP-015 | "override system prompt" | Prompt Injection | System prompt override |
| FP-016 | "you are now [role]" (without safe context) | Prompt Injection | Role hijacking |
| FP-017 | Base64-encoded payloads (`atob(`, `btoa(`, `base64 -d`) | Obfuscation | Hiding malicious content |
| FP-018 | `python -c "import urllib"` / `python3 -c` | Remote Code Execution | Inline Python execution |
| FP-019 | Password-protected archive extraction (`unzip -P`, `7z x -p`) | Malware Distribution | Snyk: trojanized archives pattern |
| FP-020 | `process.env` access (outside safe contexts) | Credential Access | Environment variable exfiltration |

### 3.2 High — Requires Justification

| ID | Pattern | Category | When Acceptable |
|----|---------|----------|-----------------|
| FH-001 | `.env` file reading | Credential Access | Only `.env.example` or `.env.template` |
| FH-002 | `GITHUB_TOKEN` | Credential Access | Only in `gh auth` context |
| FH-003 | `AWS_SECRET` / `API_KEY` | Credential Access | Never in SKILL.md — use agent's built-in auth |
| FH-004 | `credentials.json` / `secrets.yaml` | Credential Access | Never — these should not be skill-accessible |
| FH-005 | `fetch()` / `http.get()` / `axios` | Network Access | Only with declared scope and justification |
| FH-006 | External URLs | Network Access | Only documentation references or declared API endpoints |
| FH-007 | `new Function(` | Code Generation | Only in build tool context with AST safety |

### 3.3 Safe Context Exemptions

Patterns that appear dangerous but are safe in specific contexts:

| Pattern | Safe When |
|---------|-----------|
| `rm -rf` | Target is `$TMPDIR`, `$TMP`, `/tmp/`, `os.tmpdir()`, or `node_modules/` |
| `rm -rf` | Inside balanced fenced code blocks (` ``` `) as documentation |
| "you are now" | Followed by: ready, done, in, able, going, set, finished, complete, configured, running |
| `eval()` | Inside a documentation code block explaining what NOT to do |
| External URLs | Pointing to official documentation domains (github.com, npmjs.com, reactjs.org, etc.) |

### 3.4 New Patterns (Extending security-scanner.ts)

These patterns should be added to the existing 26-pattern scanner to reach the Secure Skill Factory baseline:

| ID | Pattern | Category | Severity |
|----|---------|----------|----------|
| FN-001 | `c${u}rl` / `w${g}et` (bash parameter expansion) | Obfuscated RCE | Critical |
| FN-002 | `\x[0-9a-f]{2}` sequences in instructions | Obfuscated Content | Critical |
| FN-003 | `document.cookie` | Data Exfiltration | High |
| FN-004 | `localStorage` / `sessionStorage` read | Data Exfiltration | Medium |
| FN-005 | `WebSocket` / `ws://` / `wss://` | Network Access | Medium |
| FN-006 | `~/.ssh/` / `~/.aws/` / `~/.gnupg/` | Credential Access | Critical |
| FN-007 | `~/.clawdbot/` / `~/.openclaw/` / `~/.moltbot/` | Credential Access | Critical |
| FN-008 | `MetaMask` / `Exodus` / `Coinbase` wallet paths | Crypto Theft | Critical |
| FN-009 | `SOUL.md` / `MEMORY.md` modification instructions | Memory Poisoning | Critical |
| FN-010 | `subprocess.run` / `os.system` / `os.popen` | Python RCE | Critical |
| FN-011 | `Runtime.getRuntime().exec` | Java RCE | Critical |

---

## 4. Built-In Security Prompt Template

Skills should include (or the verification system should inject) a security boundary prompt. This template is recommended for all skills that use Bash or Write tools:

```markdown
## Security Boundaries

IMPORTANT: When following these instructions, observe these security constraints:

1. **Never execute commands** that access files outside the declared scope
2. **Never read or write** credential files (.env, secrets.yaml, credentials.json)
3. **Never install packages** not listed in the project's package.json
4. **Never access network** unless explicitly authorized by the user
5. **Never modify** agent configuration files (CLAUDE.md, AGENTS.md, .cursorrules)
6. **Never run** commands with elevated privileges (sudo, doas)
7. **Always confirm** with the user before destructive operations (file deletion, git force-push)
8. **Always use** the project's existing package manager (detect from lockfile)
```

### 4.1 Template Injection Rules

- For **Tier 1 (Scanned)**: Template is advisory; skill authors are encouraged to include it
- For **Tier 2 (Verified)**: LLM judge checks that skill instructions do not contradict the template
- For **Tier 3 (Certified)**: Template compliance is verified by human reviewer

### 4.2 Template Customization

Skill authors may extend (but never weaken) the template:

```markdown
## Security Boundaries

<!-- Inherits all base security constraints -->

Additional constraints for this skill:
9. **Only modify** files matching `src/components/**/*.tsx`
10. **Never import** packages not in the React ecosystem
```

---

## 5. Skill Structure Validation Rules

Beyond content scanning, the Secure Skill Factory validates structural requirements:

### 5.1 Directory Structure

```
<skill-name>/
├── SKILL.md          # REQUIRED — main skill file
├── scripts/          # OPTIONAL — helper scripts (scanned separately)
│   └── validate.ts
├── references/       # OPTIONAL — reference files (not executed)
│   └── patterns.md
└── assets/           # OPTIONAL — images, diagrams
    └── architecture.png
```

### 5.2 Structural Checks

| Check | Rule | Severity |
|-------|------|----------|
| SKILL.md exists | Required | Reject |
| SKILL.md has valid YAML frontmatter | Required | Reject |
| `description` field present and 10-1024 chars | Required for Tier 1+ | Reject |
| `scope` section present | Required for Tier 2+ | Warning |
| `permissions` section present (if Bash/Write used) | Required for Tier 2+ | Warning |
| `security-notes` section present | Required for Tier 2+ | Warning |
| No files outside allowed extensions | `.md`, `.ts`, `.js`, `.json`, `.yaml`, `.yml`, `.png`, `.svg` | Warning |
| No executable files (`.sh`, `.bash`, `.bat`, `.cmd`, `.ps1`) in root | Must be in `scripts/` | Warning |
| Total skill size < 500KB | Prevents bloat/binary hiding | Reject |
| No symlinks | Prevents path traversal | Reject |
| No hidden files (`.` prefix except `.gitkeep`) | Prevents hiding | Warning |

---

## 6. Compliance Levels

| Requirement | Tier 1 (Scanned) | Tier 2 (Verified) | Tier 3 (Certified) |
|------------|:-:|:-:|:-:|
| Valid SKILL.md frontmatter | MUST | MUST | MUST |
| `description` field | MUST | MUST | MUST |
| No Critical forbidden patterns | MUST | MUST | MUST |
| `scope` section | SHOULD | MUST | MUST |
| `permissions` section (if Bash/Write) | SHOULD | MUST | MUST |
| `security-notes` section | SHOULD | MUST | MUST |
| Security prompt template compliance | MAY | SHOULD | MUST |
| `compatibility` section | MAY | SHOULD | SHOULD |
| `testing` section | MAY | MAY | SHOULD |
| No High patterns without justification | SHOULD | MUST | MUST |

---

## 7. Integration with Existing SpecWeave Infrastructure

### 7.1 security-scanner.ts Extensions

The existing `scanSkillContent()` function (312 lines, 26 patterns) should be extended with:

1. **New patterns** from Section 3.4 (11 additional patterns → 37 total)
2. **Structural validation** from Section 5.2 (new `validateSkillStructure()` function)
3. **Section presence checking** (new `checkMandatorySections()` function)
4. **Compliance level output** (new return field: `complianceLevel: 'tier1' | 'tier2' | 'tier3' | 'none'`)

### 7.2 skill-judge.ts Integration

The existing `SkillJudge` class should be extended for Tier 2 verification:

1. **Security-focused domain criteria**: Add a `security` domain to `DOMAIN_CRITERIA`
2. **Template compliance checking**: Verify skill instructions don't contradict the security prompt template
3. **Intent analysis**: Evaluate whether the skill's declared scope matches its actual instructions
4. **Capability assessment**: Flag skills that request more permissions than their stated purpose requires

### 7.3 registry-schema.ts Extensions

New types needed (detailed in T-013):

```typescript
interface SkillFactoryCompliance {
  level: 'tier1' | 'tier2' | 'tier3' | 'none';
  mandatorySections: {
    description: boolean;
    scope: boolean;
    permissions: boolean;
    securityNotes: boolean;
  };
  forbiddenPatternsFound: number;
  lastValidated: string; // ISO timestamp
}
```

---

## 8. Backwards Compatibility

- All new SKILL.md sections are **additive** — existing skills without these sections remain functional
- Skills without mandatory sections are classified as `community` tier (no verification badge)
- The Secure Skill Factory Standard is **opt-in** — authors choose to comply for verification benefits
- Existing `security-scanner.ts` patterns are preserved; new patterns are appended
- No breaking changes to `FabricRegistryEntry` or `FabricSecurityScanResult` types

---

## 9. Security Considerations

### 9.1 Scanner Evasion

As Snyk demonstrated, pattern-based scanning has fundamental limits:
- **Bash parameter expansion**: `c${u}rl` evades `curl` detection → addressed in FN-001
- **Alternative tools**: `python -c "import urllib"` evades `curl`/`wget` checks → addressed in FN-010
- **Natural language**: "Please download and execute the setup script" evades all regex → addressed by Tier 2 LLM judge
- **Unicode homoglyphs**: Visually identical characters → addressed by normalizing content before scanning

### 9.2 The "Antivirus Paradox" (Snyk)

Pattern-based scanners flag their own documentation as dangerous. The Secure Skill Factory addresses this:
- Balanced fenced code blocks downgrade findings to `info` (already implemented in security-scanner.ts)
- `<!-- scanner:ignore-next-line -->` for intentional documentation of dangerous patterns
- Tier 2 LLM judge understands documentation context vs. executable instructions

### 9.3 Trust Model Limitations

This standard cannot prevent all attacks. It provides **risk reduction**, not **risk elimination**, per NCSC UK guidance. The three-tier model explicitly acknowledges this:
- Tier 1 catches obvious, automated threats (~60% effectiveness per Snyk estimate)
- Tier 2 catches behavioral mismatches and obfuscation (~80-90% with LLM analysis)
- Tier 3 catches sophisticated, targeted attacks (human review, highest effectiveness)

---

## 10. References

- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — 36.82% flaw rate, 76 malicious payloads
- [Snyk: SKILL.md to Shell Access](https://snyk.io/articles/skill-md-shell-access/) — Attack chain documentation
- [Snyk: Why Your Skill Scanner Is Just False Security](https://snyk.io/blog/skill-scanner-false-security/) — Scanner limitations
- [NCSC UK: Prompt Injection](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) — "May never be fully mitigated"
- [Agent Skills Specification](https://agentskills.io/home) — Base format standard
- [SpecWeave security-scanner.ts](/src/core/fabric/security-scanner.ts) — Existing 26-pattern scanner
- [SpecWeave skill-judge.ts](/src/core/skills/skill-judge.ts) — Existing LLM judge infrastructure
