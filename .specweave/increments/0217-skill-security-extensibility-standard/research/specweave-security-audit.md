# SpecWeave Security Infrastructure Audit

**Date**: 2026-02-15
**Auditor**: research-security agent
**Scope**: All security-related code, skills, hooks, and schemas in SpecWeave v1.0.265

---

## Executive Summary

SpecWeave has a **solid foundation** for skill security scanning with its regex-based `security-scanner.ts`, 15 pre-commit hooks, and two security-focused skills. However, the infrastructure has significant **integration gaps**: the scanner is not wired into any runtime workflow, referenced components (`skill-validator.ts`, `skill-judge.ts`) do not exist, and there is no certification pipeline, version-pinned verification, or continuous scanning capability.

**Maturity Level**: Early-stage (scanner + schema exist, but not integrated into a verification pipeline)

---

## 1. Core Security Scanner

**File**: `src/core/fabric/security-scanner.ts` (312 lines)
**Function**: `scanSkillContent(content: string): FabricSecurityScanResult`

### 1.1 Pattern Checks (26 total)

| Category | Count | Severity | Patterns |
|----------|-------|----------|----------|
| Destructive Command | 7 | Critical | `rm -rf`, `rm -f`, `rm --force`, `rm --recursive`, `format C:`, `DROP TABLE/DATABASE`, `dd if=...of=/dev/`, `mkfs`, `Remove-Item -Recurse -Force` |
| Remote Code Execution | 6 | Critical | `curl \| bash`, `wget \| bash`, `eval()`, `exec()`, `child_process`, `Invoke-Expression` |
| Credential Access | 6 | High | `.env` file reading, `GITHUB_TOKEN`, `AWS_SECRET`, `API_KEY`, `credentials.json`, `secrets.yaml` |
| Dangerous Permissions | 1 | High | `chmod 777` |
| Prompt Injection | 4 | High | `<system>` tags, "ignore previous instructions", "you are now [malicious]", "override system prompt" |
| Network Access | 4 | Info | `fetch()`, `http.get()`, `axios`, external URLs |
| Frontmatter Issue | 1 | Medium | `name:` field in YAML frontmatter (strips plugin namespace) |

### 1.2 Advanced Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Safe Context Detection** | `rm -rf` in temp dirs (`/tmp/`, `$TMPDIR`, `$TMP`, `os.tmpdir`) is not flagged | Working |
| **Code Block Awareness** | Findings inside balanced fenced code blocks (` ``` `) are downgraded to `info` severity | Working |
| **Unclosed Block Prevention** | Odd number of ` ``` ` lines disables downgrading (prevents bypass via unclosed blocks) | Working |
| **Inline Suppression** | `<!-- scanner:ignore-next-line -->` suppresses the next line's findings | Working |
| **"You are now" Safe Contexts** | Natural phrases like "you are now ready/done/in/able/..." are not flagged as prompt injection | Working |
| **Long-form rm Flags** | Detects `rm --force`, `rm --recursive` in addition to short-form `-rf` | Working |

### 1.3 Pass/Fail Logic

- **FAIL**: Any finding with severity `critical` or `high`
- **PASS**: Only `medium`, `low`, or `info` findings present

### 1.4 Test Coverage

**File**: `tests/unit/core/fabric/security-scanner.test.ts` (771 lines, 50+ test cases)

Test categories covered:
- Clean content passes
- Each of 26 patterns detected correctly
- Safe contexts prevent false positives
- Code block downgrading works
- Inline suppression works
- Unclosed code block bypass prevention
- Multiple findings per line
- Edge cases (empty content, whitespace-only, natural language)

**Coverage**: Comprehensive for the existing scanner. No gaps identified in pattern detection tests.

---

## 2. Registry Schema

**File**: `src/core/fabric/registry-schema.ts` (86 lines)

### 2.1 Trust Tiers

```typescript
type FabricTier = 'official' | 'verified' | 'community';
```

| Tier | Description | Current Usage |
|------|-------------|---------------|
| `official` | First-party SpecWeave plugins | Defined in schema |
| `verified` | Third-party plugins that passed review | Defined in schema |
| `community` | Unverified community plugins | Defined in schema |

### 2.2 Schema Fields

```typescript
interface FabricRegistryEntry {
  name: string;           // Plugin name
  displayName: string;    // Human-readable name
  description: string;    // Description
  author: string;         // Author name/org
  tier: FabricTier;       // Trust tier
  version: string;        // Current version
  tags: string[];         // Search tags
  skills: FabricSkillEntry[]; // Skills in plugin
  agentSkillsCompat: boolean; // Agent Skills standard compat
  repository?: string;    // Repo URL (optional)
  homepage?: string;      // Homepage (optional)
  minSpecweaveVersion?: string; // Min version (optional)
}
```

### 2.3 Security Scan Types

```typescript
interface FabricSecurityScanResult {
  passed: boolean;
  findings: FabricSecurityFinding[];
}

interface FabricSecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line?: number;
}
```

### 2.4 Gaps in Schema

| Missing Field | Purpose | Priority |
|---------------|---------|----------|
| `certificationLevel` | Track Scanned/Verified/Certified status | High |
| `trustLabels` | Extensible, safe, portable, deprecated, warning | High |
| `securityScanHistory` | Array of scan results over time | Medium |
| `contradictionRecords` | Conflicts with other skills | Medium |
| `contentHash` | SHA-256 per version for tamper detection | High |
| `lastScannedAt` | Timestamp of last security scan | Medium |
| `scannerVersion` | Version of scanner used | Low |

---

## 3. Pre-Commit Hooks

**File**: `.git/hooks/pre-commit` (233 lines, 15 checks + 1 security-specific)

### 3.1 Security-Relevant Hooks

| # | Hook | Security Relevance | Blocks Commit? |
|---|------|--------------------|----------------|
| 0B | Mass .specweave/ deletion | Prevents accidental data loss (threshold: 50 files) | Yes |
| 1 | TS source in dist/ | Prevents polluted build artifacts | Yes |
| 2 | Build verification | Ensures compiled output is valid | Yes |
| 4 | Duplicate increment check | Prevents data corruption | Yes |
| 5 | Status desync check | Prevents source-of-truth violations | Yes |
| 7 | fs-extra import check | Enforces native fs (reduces dependencies) | Yes |
| 8 | YAML frontmatter validation | Prevents malformed configuration | Yes |
| 14 | name: in frontmatter | Prevents namespace stripping (command hijacking risk) | Yes |
| 15 | **Security anti-patterns** | Direct security scanning of staged files | Yes |

### 3.2 Security Anti-Patterns Hook (Check #15)

**File**: `scripts/pre-commit-security-patterns.sh` (100 lines)

Scans staged `.ts`, `.js`, `.tsx`, `.jsx` files for:

| Pattern | Category | Detection Method |
|---------|----------|-----------------|
| API keys/tokens/passwords in string literals | Hardcoded Secrets | Regex on assignment |
| `eval()` calls | Code Execution | Word-boundary match |
| `.innerHTML =` assignment | XSS | Property assignment match |
| SQL string concatenation with `${}` | SQL Injection | Template literal in SQL |
| `console.log/debug/info` with password/token/secret | Data Leakage | Console + sensitive word |

**Note**: Uses `git show ":$file"` to scan staged content (not working tree), which is correct practice.

---

## 4. Security Skills

### 4.1 `/sw:security` — Full Security Assessment

**File**: `plugins/specweave/skills/security/SKILL.md`
**Type**: User-invocable skill

Provides:
1. OWASP Top 10 assessment
2. Threat modeling (attack surfaces, data flow)
3. Authentication/authorization review
4. Dependency audit (CVE checks)

**Limitation**: Manual invocation only. Not integrated into any automated pipeline.

### 4.2 `/sw:security-patterns` — Real-Time Pattern Detection

**File**: `plugins/specweave/skills/security-patterns/SKILL.md`
**Type**: Non-user-invocable (auto-activated during code writing)
**Tools**: Read, Grep, Glob only (no write access)

Detects 10 pattern categories:

| Pattern | Category | Severity |
|---------|----------|----------|
| `eval(` | Code Execution | CRITICAL |
| `new Function(` | Code Execution | CRITICAL |
| `dangerouslySetInnerHTML` | XSS | HIGH |
| `innerHTML =` | XSS | HIGH |
| `document.write(` | XSS | HIGH |
| `exec(` + string concat | Command Injection | CRITICAL |
| `spawn(` + shell:true | Command Injection | HIGH |
| `pickle.loads(` | Deserialization | CRITICAL |
| `${{ github.event` | GH Actions Injection | CRITICAL |
| Template literal in SQL | SQL Injection | CRITICAL |

Covers 6 languages: JavaScript/TypeScript, Python, YAML (GitHub Actions), SQL.

**Limitation**: Skill-based detection relies on LLM judgment. Not a deterministic scanner.

---

## 5. LLM Judge Validator

**File**: `plugins/specweave/hooks/llm-judge-validator.sh` (220 lines)

### 5.1 Architecture

- Gathers context: spec.md ACs, tasks.md completion, git diff, test results
- Builds structured prompt for Claude API
- Calls `claude-sonnet-4-20250514` with 1024 max tokens
- Parses JSON response: `{decision, confidence, reasoning, concerns, recommendations}`
- Returns exit code 0 (approve) or 1 (reject)

### 5.2 Quality Gates

Approves when:
- All ACs implemented (not just marked)
- Tests exist and pass for critical paths
- Code quality is production-ready
- Security best practices followed

Rejects when:
- Self-deception (ACs marked but not implemented)
- Missing tests for critical functionality
- Obvious bugs or security vulnerabilities
- Incomplete error handling

### 5.3 Security Considerations

| Concern | Severity | Notes |
|---------|----------|-------|
| Requires `ANTHROPIC_API_KEY` | Medium | Skips judge if key not set (soft fail) |
| Uses external API call | Low | Expected behavior for LLM judge |
| Temporary file for request body | Low | Cleaned up with `rm -f` |
| No rate limiting | Low | Single call per judge invocation |

---

## 6. Components Referenced But Missing

The tasks.md references several components that **do not exist** in the codebase:

| Component | Referenced As | Status |
|-----------|--------------|--------|
| `src/core/fabric/skill-validator.ts` | "6 validation domains" | **DOES NOT EXIST** |
| `src/core/fabric/skill-judge.ts` | "LLM-based judge" | **DOES NOT EXIST** |

**Note**: The LLM judge functionality exists only in `llm-judge-validator.sh` (a shell-based hook), not as a TypeScript module. The `skill-validator.ts` concept is partially covered by `security-scanner.ts` but is not a separate validation module.

---

## 7. Integration Analysis

### 7.1 Where Security Scanner Is Used

| Location | Integration Type | Status |
|----------|-----------------|--------|
| `tests/unit/core/fabric/security-scanner.test.ts` | Unit tests | Active |
| Pre-commit hook #15 | Staged file scanning | Active (but separate implementation) |
| CLI `specweave fabric scan` | Runtime scanning | **NOT FOUND** |
| Plugin install pipeline | Pre-install validation | **NOT FOUND** |
| Registry submission | Certification scanning | **NOT FOUND** |

**Critical Gap**: The `scanSkillContent()` function is **exported but never imported** outside of tests. The pre-commit hook #15 uses its own grep-based implementation, not the TypeScript scanner.

### 7.2 Security Data Flow

```
Current:
  SKILL.md → (nothing) → Registry entry → User installs

Desired:
  SKILL.md → Scanner → Findings → Certification → Trust Labels → Registry → Badge API → User decision
```

---

## 8. Recommendations

### 8.1 Critical (Must-Have)

1. **Wire `scanSkillContent()` into CLI**: Create `specweave fabric scan <path>` command that uses the TypeScript scanner
2. **Add certification pipeline**: Scanned → Verified → Certified tiers with clear criteria
3. **Extend registry schema**: Add `certificationLevel`, `trustLabels`, `securityScanHistory`, `contentHash`
4. **Create `skill-validator.ts`**: Unified validation module combining pattern scanning + structural checks + LLM judge
5. **Version-pinned verification**: Content hash (SHA-256) per version, diff scanning on updates

### 8.2 Important (Should-Have)

6. **Unify pre-commit and scanner**: Pre-commit hook #15 should call `scanSkillContent()` instead of maintaining parallel grep patterns
7. **Add submission pipeline**: State machine for skill submissions (RECEIVED → SCANNING → APPROVED/REJECTED → PUBLISHED)
8. **Continuous monitoring**: Periodic re-scanning of published skills for badge downgrades
9. **Vendor fast-path**: Auto-verify skills from trusted orgs (anthropic/, openai/, google/)

### 8.3 Nice-to-Have

10. **AST-based analysis**: Move beyond regex for JS/TS patterns (false positive reduction)
11. **Dependency scanning**: Check skill dependencies for known CVEs
12. **Permission system**: Declare required permissions in SKILL.md frontmatter
13. **Sandbox testing**: Run skills in isolated environments to detect runtime behavior

---

## 9. Security Posture Summary

| Dimension | Score (0-5) | Notes |
|-----------|-------------|-------|
| Pattern Detection | 4 | 26 patterns, 6 categories, good coverage |
| False Positive Handling | 4 | Safe contexts, code block awareness, inline suppression |
| Schema Design | 2 | Basic trust tiers exist, no certification/scan history fields |
| Pipeline Integration | 1 | Scanner exists but is not wired into any workflow |
| Continuous Monitoring | 0 | No re-scanning capability |
| Version Security | 0 | No content hashing or diff scanning |
| Certification Process | 0 | No multi-tier verification pipeline |
| Pre-commit Guards | 5 | 15 hooks covering build, data integrity, security patterns |

**Overall Maturity**: 2/5 — Strong detection engine, weak integration and process

---

## Appendix A: File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/core/fabric/security-scanner.ts` | 312 | Core regex-based SKILL.md scanner |
| `src/core/fabric/registry-schema.ts` | 86 | Registry types with trust tiers |
| `tests/unit/core/fabric/security-scanner.test.ts` | 771 | Comprehensive scanner tests |
| `plugins/specweave/skills/security/SKILL.md` | 21 | OWASP assessment skill |
| `plugins/specweave/skills/security-patterns/SKILL.md` | 199 | Real-time pattern detection skill |
| `plugins/specweave/hooks/llm-judge-validator.sh` | 220 | LLM-based quality judge |
| `scripts/pre-commit-security-patterns.sh` | 100 | Staged file security scanning |
| `.git/hooks/pre-commit` | 233 | 15-check pre-commit guard |
