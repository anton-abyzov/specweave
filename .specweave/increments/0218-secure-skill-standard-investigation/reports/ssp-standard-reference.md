# Secure Skill Protocol (SSP) — Standard Reference

**Version**: ssp/v1.0
**Status**: Draft
**Date**: 2026-02-15

SSP is an open standard for rating the extensibility and security of AI agent skills. It provides a two-dimensional classification system, a deterministic scoring algorithm, and a self-audit manifest format that makes trust portable across registries and platforms.

---

## Extensibility Levels (E0-E3)

The E-level classifies what a skill can do architecturally — how it relates to other skills in a composition.

| Level | Name | Description | Markers | Examples |
|-------|------|-------------|---------|----------|
| **E0** | Standalone | A single SKILL.md file with no imports, exports, or external dependencies. Does one thing in isolation. | No `SS:IMPORTABLE`, no `SS:EXTENDS`, no dependency manifest | A code review skill, a commit message generator, a single-purpose formatter |
| **E1** | Importable | Declares a stable API surface that other skills can reference. Can be used as a building block. | `<!-- SS:IMPORTABLE -->` in header, documented exports | A logging skill that other skills reference for output formatting, a shared prompt template |
| **E2** | Extensible | Provides documented hooks, override points, or configuration surfaces for customization by consuming skills. | `<!-- SS:EXTENDS base-skill -->` support, documented hooks | A testing framework skill with pluggable assertion styles, a deployment skill with provider hooks |
| **E3** | Composable | Full dependency manifest with explicit conflict resolution rules. Safe for inclusion in directed acyclic graphs (DAGs) of skill composition. | Complete dependency manifest, conflict resolution rules, DAG-safe declaration | An orchestration skill that composes 5+ sub-skills with explicit precedence and conflict handling |

**Detection rules:**
- E0: Default. No extensibility markers detected.
- E1: Contains `<!-- SS:IMPORTABLE -->` and documents at least one export.
- E2: Contains `<!-- SS:EXTENDS -->` or documents hook/override points with usage instructions.
- E3: Contains a dependency manifest section listing all composed skills with version constraints and conflict resolution strategy.

---

## Security Levels (S0-S3)

The S-level classifies how thoroughly a skill has been verified for safety.

| Level | Name | Description | Requirements | Progression |
|-------|------|-------------|--------------|-------------|
| **S0** | Unknown | No security scan has been performed. Default state for all unscanned skills. | None | Run `npx vskill verify` to reach S1 |
| **S1** | Scanned | Passed automated pattern-based security checks. Known dangerous patterns have been evaluated. | Pass 29+ regex pattern checks across 5 categories. No critical findings. | Achieve unified score >= 80/100 with LLM analysis for S2 |
| **S2** | Verified | Scanned plus LLM-based intent analysis. Behavioral safety evaluated beyond pattern matching. | S1 requirements met. LLM intent analysis completed. Unified score >= 80/100. | Add ed25519 signature and VSKILL:VERIFY manifest for S3 |
| **S3** | Certified | Fully verified with cryptographic signature and embedded self-audit manifest. Trust is portable. | S2 requirements met. ed25519 signature attached. `<!-- VSKILL:VERIFY ssp/v1 -->` manifest embedded. Content hash matches. | Maintain: re-verify on any content change |

**Key principle:** S-levels are strictly progressive. You cannot reach S2 without meeting all S1 requirements. You cannot reach S3 without S2. There are no shortcuts.

**Re-verification:** Any modification to skill content invalidates the current S-level. The content hash in the VSKILL:VERIFY manifest enables detection of post-certification changes.

---

## Scoring Rubric

The SSP unified score is a number from 0 to 100, computed deterministically from pattern analysis across five weighted categories.

### Formula

```
Score = 100 - SUM(category_weight * severity_penalty * finding_count)
```

### Categories and Weights

| Category | Weight | What It Detects | Example Patterns |
|----------|--------|----------------|------------------|
| **Destructive Patterns** | 0.25 (25%) | Commands that destroy data or system state | `rm -rf`, `DROP TABLE`, `dd if=`, `format`, `mkfs`, `fdisk` |
| **Code Execution** | 0.25 (25%) | Arbitrary code execution vectors | `eval()`, `exec()`, `curl \| bash`, `child_process`, `subprocess`, `os.system` |
| **Data Access** | 0.20 (20%) | Unauthorized data reading or exfiltration | `.env` access, `credentials`, `~/.ssh/`, `keychain`, network calls to unknown hosts |
| **Prompt Safety** | 0.15 (15%) | Prompt injection and override attempts | "Ignore previous instructions", "You are now", precedence override patterns, system prompt extraction |
| **Declaration Honesty** | 0.15 (15%) | Mismatch between declared and actual behavior | Declares `no-bash` but contains `Bash()` calls, declares `read-only` but writes files |

### Severity Penalties

| Severity | Point Penalty | Description |
|----------|---------------|-------------|
| Critical | 25 points | Immediate danger: active data destruction, malware delivery, credential theft |
| High | 15 points | Significant risk: arbitrary code execution, broad file system access |
| Medium | 8 points | Moderate concern: runtime package installation, network calls, elevated permissions |
| Low | 3 points | Minor issue: unnecessary permissions declared, suboptimal security practices |
| Info | 0 points | Informational only: observations that do not affect the score |

### Scoring Example

A skill that installs npm packages at runtime and reads environment variables:

```
Finding 1: "Installs packages at runtime" (Code Execution, Medium)
  Penalty: 0.25 * 8 * 1 = 2.0

Finding 2: "Reads .env files" (Data Access, Medium)
  Penalty: 0.20 * 8 * 1 = 1.6

Score = 100 - 2.0 - 1.6 = 96.4 -> 96/100
```

A skill with a base64-encoded shell payload:

```
Finding 1: "Base64-encoded executable payload" (Code Execution, Critical)
  Penalty: 0.25 * 25 * 1 = 6.25

Finding 2: "Exfiltrates data to external host" (Data Access, Critical)
  Penalty: 0.20 * 25 * 1 = 5.0

Finding 3: "Overrides system safety instructions" (Prompt Safety, High)
  Penalty: 0.15 * 15 * 1 = 2.25

Score = 100 - 6.25 - 5.0 - 2.25 = 86.5 -> 86/100
```

**Note:** Even the malicious skill scores 86/100 with pattern matching alone. This is why S2 requires LLM intent analysis — patterns catch syntax, LLM analysis catches intent.

### Determinism Guarantee

The scoring algorithm is pinned to the SSP version. `ssp/v1.0` will always produce the same score for the same skill content. Scoring algorithm changes require a new SSP version (e.g., `ssp/v2.0`), and skills retain their score under the version they were scored against.

---

## Quick Start: Verify a Skill in 3 Steps

### Step 1: Install vskill

```bash
npm install -g vskill
```

Or run without installing:

```bash
npx vskill verify ./SKILL.md
```

### Step 2: Run verification

```bash
npx vskill verify ./path/to/SKILL.md
```

Output:

```
  VSKILL v1.0 — Secure Skill Protocol Verifier

  Skill:     my-awesome-skill
  File:      ./SKILL.md
  SSP:       ssp/v1.0

  E-Level:   E1 (Importable)
  S-Level:   S1 (Scanned)
  Score:     94/100

  FINDINGS (2)

  [MEDIUM] Code Execution
    Line 45: Installs npm packages at runtime
    Penalty: -2.0

  [LOW] Data Access
    Line 112: Reads process.env for configuration
    Penalty: -0.6

  [INFO] Declaration Honesty
    All declared permissions match actual behavior

  RECOMMENDATION
    Score qualifies for S2 with LLM analysis.
    Run: npx vskill verify --deep ./SKILL.md
```

### Step 3: Interpret results

The output tells you:
- **E-Level**: What the skill can do architecturally (E0-E3)
- **S-Level**: How thoroughly it has been verified (S0-S3)
- **Score**: Numeric safety score (0-100)
- **Findings**: Specific issues found, with severity, category, line number, and penalty
- **Recommendation**: Next steps to improve the skill's rating

---

## Badge Format

SSP badges use the format **E{n}/S{n}** — two characters separated by a slash.

### Reading a Badge

| Badge | Meaning |
|-------|---------|
| **E0/S0** | Standalone skill, never scanned. Treat with maximum caution. |
| **E0/S1** | Standalone skill, passed automated pattern checks. Basic safety verified. |
| **E1/S2** | Importable skill, verified with LLM analysis, score >= 80. Suitable for use as a dependency. |
| **E2/S3** | Extensible skill with hooks, cryptographically certified. Highest practical trust for extensible skills. |
| **E3/S3** | Composable skill, fully certified. Safe for inclusion in multi-skill orchestration pipelines. |

### Badge Display

In markdown: `![SSP](https://verified-skill.com/badge/E2/S3)`

In terminal output: `[E2/S3]` with color coding (green for S2+, yellow for S1, red for S0).

In registries: Rendered as a two-tone badge where the left half shows extensibility (blue gradient) and the right half shows security (green/yellow/red gradient).

---

## VSKILL:VERIFY Manifest Reference

The self-audit manifest is embedded as HTML comments in the SKILL.md file. It enables any runtime to verify the skill's integrity and trust level without contacting a registry.

### Manifest Fields

```markdown
<!-- VSKILL:VERIFY ssp/v1 -->
<!-- VSKILL:PERMISSIONS read-only, no-bash, no-network -->
<!-- VSKILL:HASH sha256:a1b2c3d4e5f6789... -->
<!-- VSKILL:SIGNED ed25519:base64-encoded-signature... -->
<!-- VSKILL:SCORE 94/100 ssp/v1.0 2026-02-15 -->
```

| Field | Required For | Format | Description |
|-------|-------------|--------|-------------|
| `VSKILL:VERIFY` | S3 | `ssp/v{major}` | Protocol version. Signals this skill contains a self-audit manifest. |
| `VSKILL:PERMISSIONS` | S3 | Comma-separated permission tokens | Declared capabilities: `read-only`, `read-write`, `bash`, `no-bash`, `network`, `no-network`, `file-create`, `no-file-create` |
| `VSKILL:HASH` | S3 | `sha256:{hex-digest}` | SHA-256 hash of the skill content EXCLUDING the manifest block itself. Enables tamper detection. |
| `VSKILL:SCORE` | S3 | `{score}/100 ssp/v{version} {date}` | Score at time of certification, SSP version used, and date. |
| `VSKILL:SIGNED` | S3 | `ed25519:{base64-signature}` | ed25519 signature over the concatenation of PERMISSIONS + HASH + SCORE fields. Verifiable with the author's public key. |

### Verification Process

1. **Parse manifest**: Extract all `VSKILL:*` fields from HTML comments
2. **Compute hash**: SHA-256 of skill content excluding the manifest comment block
3. **Compare hash**: Computed hash must match `VSKILL:HASH` value
4. **Verify signature**: Validate ed25519 signature against author's registered public key
5. **Check permissions**: Run pattern analysis and compare findings against `VSKILL:PERMISSIONS`
6. **Confirm score**: Re-run scoring algorithm; result must match `VSKILL:SCORE` within tolerance (score drift tolerance: 0 for same SSP version)

If any step fails, the skill's S-level drops to the highest level it can currently demonstrate (typically S1 if automated scans still pass).

---

## Frequently Asked Questions

### How is the score calculated?

The score starts at 100 and subtracts penalties for each finding. Penalties are computed as `category_weight * severity_penalty * finding_count`. The five categories (Destructive, Execution, Data Access, Prompt Safety, Declaration Honesty) have fixed weights summing to 1.0. Severity penalties range from 0 (info) to 25 (critical). The algorithm is deterministic — same content, same SSP version, same score. See the Scoring Rubric section above for the full formula and examples.

### Can a skill with shell access still score well?

Yes. Shell access is not automatically disqualifying. A skill that declares `bash` in its permissions AND uses bash commands in ways consistent with its stated purpose will receive lower penalties than a skill that declares `no-bash` but secretly executes shell commands. Declaration honesty matters more than raw capability. A deployment skill that legitimately needs `bash` to run `kubectl apply` can score 90+ if it is honest about what it does.

### Can I dispute a score?

SSP scores are deterministic. If you believe a finding is a false positive, you can:
1. Run `npx vskill verify --verbose` to see exactly which patterns triggered each finding
2. Modify your skill to avoid the pattern (e.g., move dangerous commands into documented code blocks with appropriate context)
3. If you believe the SSP pattern set has a bug, file an issue against the SSP specification repository

Scores cannot be manually overridden. The algorithm is the source of truth.

### How do I get to S3?

1. **Reach S1**: Run `npx vskill verify ./SKILL.md` and resolve all critical findings
2. **Reach S2**: Run `npx vskill verify --deep ./SKILL.md` for LLM intent analysis. Achieve score >= 80/100
3. **Reach S3**: Generate an ed25519 key pair, then run `npx vskill sign ./SKILL.md --key ./my-key.pem`. This embeds the VSKILL:VERIFY manifest with permissions, hash, signature, and score

### What happens if I modify a signed skill?

The content hash in the VSKILL:VERIFY manifest will no longer match the actual content. Any runtime or verifier that checks the manifest will detect the mismatch and downgrade the skill's S-level to S1 (or S0 if pattern checks also fail). You must re-sign after any content change.

### Does SSP work with skills for agents other than Claude?

Yes. SSP is agent-agnostic and platform-agnostic. The standard evaluates SKILL.md content regardless of which AI agent will consume it. The pattern checks, scoring algorithm, and manifest format are not tied to any specific agent runtime. Any platform can implement SSP verification.

### Is SSP tied to SpecWeave?

No. SSP is published as an open specification. SpecWeave provides the reference implementation (`npx vskill`) and hosts the specification, but any registry, scanner, or agent platform can implement SSP verification independently. The goal is ecosystem-wide adoption, not vendor lock-in.

### What is the difference between SSP and SkillShield / Skills Directory scoring?

Existing scanners use proprietary scoring methodologies that vary between platforms. A skill might score 92/100 on SkillShield and receive a "B" grade on Skills Directory for the same content. SSP provides a single, deterministic, version-pinned algorithm. `ssp/v1.0` always produces the same score everywhere. The algorithm is public and auditable. No proprietary black boxes.

---

## Additional Resources

- SSP Specification Repository: *coming soon*
- Verification tool: `npx vskill verify` *coming soon*
- Badge service: verified-skill.com *coming soon*
- SpecWeave security scanner (current): `src/core/skills/security/security-scanner.ts`
