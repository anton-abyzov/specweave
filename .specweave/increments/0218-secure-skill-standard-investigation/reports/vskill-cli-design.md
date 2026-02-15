# `npx vskill` CLI Architecture Design

**Increment**: 0218-secure-skill-standard-investigation
**Tasks**: T-009, T-010, T-011
**Date**: 2026-02-15
**Status**: Draft
**Parent Increment**: 0217-skill-security-extensibility-standard

---

## 1. CLI Command Structure (T-009)

### 1.1 Package Identity

| Field | Value |
|-------|-------|
| npm package | `vskill` |
| Binary | `vskill` |
| Invocation | `npx vskill <command>` |
| Scoped alt | `@vskill/cli` (for org publishing) |
| Node minimum | 18.0.0 |
| Domain | verified-skill.com |

### 1.2 Global Flags

Available on all commands:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help`, `-h` | boolean | false | Show command help |
| `--version`, `-V` | boolean | false | Print version |
| `--no-color` | boolean | false | Disable terminal colors |
| `--quiet`, `-q` | boolean | false | Suppress non-essential output |
| `--verbose` | boolean | false | Show debug-level detail |

---

### 1.3 `vskill verify <path>`

Runs the SSP scoring algorithm against a SKILL.md file or directory of skills.

**Synopsis**:
```
vskill verify <path> [flags]
```

**Arguments**:

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | Yes | Path to a SKILL.md file or directory containing SKILL.md files |

If `path` is a directory, the scanner recursively finds all `SKILL.md` files (respecting `.gitignore`) and scores each independently.

**Flags**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output JSON instead of human-readable table |
| `--verbose` | boolean | false | Show per-line match details for every finding |
| `--threshold <N>` | integer | 80 | Custom pass/fail threshold (0-100) |
| `--ssp-version <v>` | string | `v1.0` | SSP algorithm version to use |
| `--manifest` | boolean | false | Also parse and validate any `VSKILL:VERIFY` manifest |
| `--ci` | boolean | false | Alias for `--json --quiet`, optimized for CI pipelines |

**Process**:
1. Read file(s) at `path`
2. For each SKILL.md, run the SSP/v1.0 deterministic scoring algorithm:
   a. Extract content lines, track fenced code blocks
   b. Match against all pattern categories (destructive, execution, data access, prompt safety)
   c. If `VSKILL:PERMISSIONS` manifest present, run declaration honesty check
   d. Calculate weighted score: `100 - sum(category_weight * severity_penalty * finding_count)`
   e. Determine E-level from structural markers (`SS:IMPORTABLE`, `SS:EXTENDS`, dependency manifests)
   f. Determine S-level from scan result + manifest presence + signature
3. Output score, level, and findings

**Exit Codes**:

| Code | Meaning |
|------|---------|
| 0 | PASS -- score >= threshold (default 80) |
| 1 | FAIL -- score < threshold |
| 2 | ERROR -- invalid input, file not found, parse failure |

**Examples**:
```bash
# Verify a single skill
npx vskill verify ./plugins/sw-frontend/skills/component-generate/SKILL.md

# Verify all skills in a directory
npx vskill verify ./plugins/

# CI pipeline with custom threshold
npx vskill verify ./SKILL.md --ci --threshold 90

# JSON output for programmatic consumption
npx vskill verify ./SKILL.md --json

# Verify with manifest validation
npx vskill verify ./SKILL.md --manifest --verbose
```

---

### 1.4 `vskill install <source>`

Fetches a skill from a remote source, runs a security scan, and installs it to detected agents.

**Synopsis**:
```
vskill install <source> [flags]
```

**Arguments**:

| Argument | Required | Description |
|----------|----------|-------------|
| `source` | Yes | GitHub `owner/repo` or `owner/repo --skill <name>` or full URL |

**Flags**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--skill <name>` | string | (all) | Install a specific skill from a multi-skill repo |
| `--agent <name>` | string | (prompt) | Install for a specific detected agent |
| `--all` | boolean | false | Install to all detected agents without prompting |
| `--skip-scan` | boolean | false | Skip pre-install scan (requires `--force`) |
| `--force` | boolean | false | Confirm dangerous operations (required with `--skip-scan`) |
| `--trust-vendor` | boolean | false | Auto-approve installs from trusted vendor orgs |
| `--ref <tag/sha>` | string | `HEAD` | Pin to a specific git ref (tag, branch, or SHA) |
| `--copy` | boolean | false | Copy files instead of symlinking |
| `--dry-run` | boolean | false | Show what would be installed without writing files |
| `--json` | boolean | false | Output JSON results |

**Process**:
1. **Resolve source**: Parse `owner/repo` into GitHub API URL. If `--skill` specified, locate that skill's SKILL.md within the repo.
2. **Fetch content**: Clone or download the skill content at the specified `--ref` (default: latest tag or HEAD).
3. **Vendor check**: If owner matches a trusted vendor org, skip scan and auto-approve:
   - `anthropics/` -- Anthropic official
   - `openai/` -- OpenAI official
   - `google/` -- Google official
   - `vercel-labs/` -- Vercel (Skills.sh creators)
   - `supabase/` -- Supabase official
   - Custom whitelist from `~/.vskill/config.json`
4. **Security scan**: Run Tier 1 SSP scan (deterministic patterns). Display score and findings summary.
5. **User prompt**: Show score + findings. Ask user to confirm installation. If `--trust-vendor` or `--all`, skip prompt for passing scans.
6. **Detect agents**: Scan filesystem for all 39 known agents (see section 1.8). Present list of detected agents.
7. **Agent selection**: If `--agent <name>`, install only to that agent. If `--all`, install to every detected agent. Otherwise, present interactive multi-select.
8. **Install**: Write SKILL.md to each selected agent's skills directory. Record in `vskill.lock`.
9. **Lock file**: Write/update `vskill.lock` with version, SHA, scan date, tier, findings count.

**Lock File Format** (`vskill.lock`):
```json
{
  "lockVersion": 1,
  "skills": {
    "anthropics/skills/frontend-design": {
      "version": "v1.3.0",
      "sha": "abc123def456",
      "scannedAt": "2026-02-15T18:00:00Z",
      "sspVersion": "v1.0",
      "score": 97,
      "tier": "verified",
      "findingsCount": 0,
      "agents": ["claude-code", "cursor"]
    }
  }
}
```

**Examples**:
```bash
# Install a specific skill from Anthropic (vendor fast-path)
npx vskill install anthropics/skills --skill frontend-design

# Install to all agents
npx vskill install my-org/my-skill --all

# Pin to a specific version
npx vskill install my-org/my-skill --ref v2.1.0 --agent claude-code

# Dry run to see what happens
npx vskill install my-org/my-skill --dry-run
```

---

### 1.5 `vskill audit [flags]`

Scans all installed skills across all detected agents and produces a security report.

**Synopsis**:
```
vskill audit [flags]
```

**Flags**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--path <dir>` | string | `.` | Root directory to scan from |
| `--json` | boolean | false | Output JSON report |
| `--agent <name>` | string | (all) | Audit only a specific agent's skills |
| `--fix` | boolean | false | Suggest remediation for each finding |
| `--stale` | boolean | false | Also check lock file for outdated versions |
| `--threshold <N>` | integer | 80 | Custom pass/fail threshold |

**Process**:
1. **Detect agents**: Scan from `--path` for all 39 known agent skill directories.
2. **Discover skills**: For each agent, enumerate all installed SKILL.md files.
3. **Deduplicate**: Group identical skills installed across multiple agents (by content hash).
4. **Scan**: Run SSP/v1.0 scoring on each unique skill.
5. **Lock check**: If `vskill.lock` exists, compare installed versions against locked versions. Flag drift.
6. **Stale check**: If `--stale`, check if newer versions exist on GitHub for locked skills.
7. **Report**: Output table (or JSON) of all skills with E/S levels, scores, and findings.
8. **Fix suggestions**: If `--fix`, append remediation advice per finding (e.g., "Replace `rm -rf` with scoped cleanup in temp dir").

**Exit Codes**:

| Code | Meaning |
|------|---------|
| 0 | All skills pass threshold |
| 1 | One or more skills fail threshold |
| 2 | Error during scan |

**Examples**:
```bash
# Audit everything in current project
npx vskill audit

# Audit only Cursor skills
npx vskill audit --agent cursor

# JSON report for CI
npx vskill audit --json --threshold 90

# Full audit with fix suggestions and stale checks
npx vskill audit --fix --stale
```

---

### 1.6 `vskill sign <path> --key <keyfile>`

Cryptographically signs a SKILL.md file by computing its hash and embedding a `VSKILL:VERIFY` manifest.

**Synopsis**:
```
vskill sign <path> --key <keyfile> [flags]
```

**Arguments**:

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | Yes | Path to the SKILL.md file to sign |

**Flags**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--key <path>` | string | **required** | Path to ed25519 private key file |
| `--output <path>` | string | (in-place) | Write signed output to a different file |
| `--permissions <list>` | string | (auto-detect) | Comma-separated declared permissions |
| `--strip` | boolean | false | Remove existing manifest before re-signing |

**Process**:
1. **Read**: Load SKILL.md content.
2. **Strip**: If `--strip` or if existing manifest detected, remove old `VSKILL:*` comment lines.
3. **Scan**: Run SSP/v1.0 scoring to get current score.
4. **Permissions**: If `--permissions` provided, use those. Otherwise, auto-detect from scan findings:
   - No destructive findings = `no-destructive`
   - No execution findings = `no-exec`
   - No credential findings = `no-credential-access`
   - No network findings = `no-network`
   - Map to canonical set: `read-only`, `no-bash`, `no-network`, `project-scoped`, etc.
5. **Hash**: Compute SHA-256 hash of the SKILL.md content (excluding any existing manifest lines).
6. **Sign**: Sign the hash with the ed25519 private key.
7. **Embed**: Append the manifest block to the end of the file:
   ```markdown
   <!-- VSKILL:VERIFY ssp/v1 -->
   <!-- VSKILL:PERMISSIONS read-only, no-bash, no-network -->
   <!-- VSKILL:HASH sha256:a1b2c3d4e5f6... -->
   <!-- VSKILL:SIGNED ed25519:BASE64_SIGNATURE... -->
   <!-- VSKILL:SCORE 97/100 ssp/v1.0 2026-02-15 -->
   ```
8. **Write**: Write to `--output` path or modify in-place.

**Key Generation** (documented in help, not a CLI command):
```bash
# Generate an ed25519 key pair for signing
openssl genpkey -algorithm Ed25519 -out vskill-private.pem
openssl pkey -in vskill-private.pem -pubout -out vskill-public.pem
```

**Examples**:
```bash
# Sign a skill in-place
npx vskill sign ./SKILL.md --key ~/.vskill/private.pem

# Sign with explicit permissions and output to new file
npx vskill sign ./SKILL.md --key ./key.pem --permissions "read-only,no-bash" --output ./SKILL.signed.md

# Re-sign after content changes
npx vskill sign ./SKILL.md --key ./key.pem --strip
```

---

### 1.7 `vskill info <path>`

Displays parsed metadata from a SKILL.md file, including any embedded manifest.

**Synopsis**:
```
vskill info <path> [flags]
```

**Arguments**:

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | Yes | Path to a SKILL.md file |

**Flags**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output JSON |
| `--verify-signature` | boolean | false | Verify ed25519 signature against known public keys |
| `--pubkey <path>` | string | (none) | Path to public key for signature verification |

**Process**:
1. **Parse frontmatter**: Extract YAML metadata (description, tags, etc.).
2. **Parse manifest**: Look for `VSKILL:VERIFY`, `VSKILL:PERMISSIONS`, `VSKILL:HASH`, `VSKILL:SIGNED`, `VSKILL:SCORE` comment lines.
3. **Integrity check**: If hash present, recompute and compare.
4. **Signature verification**: If `--verify-signature`, validate ed25519 signature against provided or known public keys.
5. **Display**: Show formatted info panel.

**Output**:
```
Skill: frontend-design
Source: anthropics/skills
───────────────────────────────
Extensibility:  E1 (Importable)
Security:       S3 (Certified)
Score:          97/100 (ssp/v1.0)
Scanned:        2026-02-15
───────────────────────────────
Permissions:    read-only, no-bash, no-network
Hash:           sha256:a1b2c3...
Signature:      VALID (ed25519)
───────────────────────────────
Sections:       12
Lines:          284
Code blocks:    5
```

**Examples**:
```bash
# Quick info
npx vskill info ./SKILL.md

# Verify signature integrity
npx vskill info ./SKILL.md --verify-signature --pubkey ./author-public.pem

# JSON for scripting
npx vskill info ./SKILL.md --json
```

---

### 1.8 Agent Registry (39 Agents)

The install and audit commands auto-detect installed agents by probing known filesystem paths. The full registry is sourced from `skills@1.3.9` and contains 39 agents split into two categories.

**7 Universal Agents** (shared directory: `.agents/skills/`):

| Agent | Detect Path |
|-------|-------------|
| Amp | `.amp/` config or `amp` binary |
| Codex | `.codex/` config |
| Gemini CLI | `.gemini/` config |
| GitHub Copilot | `.github/copilot/` |
| Kimi Code CLI | `.kimi/` config |
| OpenCode | `.opencode/` config |
| Replit | `.replit` file |

**32 Non-Universal Agents** (agent-specific directories):

| Agent | Local Skills Dir | Global Skills Dir |
|-------|-----------------|-------------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.windsurf/skills/` |
| Cline | `.cline/skills/` | `~/.cline/skills/` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Continue | `.continue/skills/` | `~/.continue/skills/` |
| Augment | `.augment/skills/` | `~/.augment/skills/` |
| Goose | `.goose/skills/` | `~/.goose/skills/` |
| Junie | `.junie/skills/` | `~/.junie/skills/` |
| Trae | `.trae/skills/` | `~/.trae/skills/` |
| ... | ... | ... |

Detection logic:
```
for each agent in REGISTRY:
  localDir = cwd + agent.localSkillsDir
  globalDir = expandHome(agent.globalSkillsDir)
  if exists(localDir) OR exists(globalDir):
    agent.detected = true
```

The full 39-agent mapping (with exact paths per agent) lives in the `@vskill/scanner` package as `agent-registry.ts`. This is the single source of truth for both `vskill` and `specweave` CLIs.

---

## 2. Scoring Output Format (T-010)

### 2.1 Human-Readable Output

Terminal output uses Unicode box-drawing characters and ANSI colors. Colors degrade gracefully (`--no-color` or non-TTY).

**Pass result** (score >= threshold):
```
+------------------------------------------+
|  vskill verify result                    |
+------------------------------------------+
|  Score: 97/100          Level: E1/S3     |
|  Status: PASS                            |
+------------------------------------------+
|  CATEGORIES                              |
|  [pass] Destructive:    0 findings (25%) |
|  [pass] Execution:      0 findings (25%) |
|  [warn] Data Access:    1 finding  (20%) |
|    > low: Reads .env for config (L42)    |
|  [pass] Prompt Safety:  0 findings (15%) |
|  [pass] Declaration:    0 findings (15%) |
+------------------------------------------+
|  Manifest: present, signature valid      |
|  SSP Version: v1.0                       |
+------------------------------------------+
```

**Fail result** (score < threshold):
```
+------------------------------------------+
|  vskill verify result                    |
+------------------------------------------+
|  Score: 38/100          Level: E0/S0     |
|  Status: FAIL (threshold: 80)           |
+------------------------------------------+
|  CATEGORIES                              |
|  [FAIL] Destructive:    2 findings (25%) |
|    > critical: rm -rf / detected (L15)   |
|    > critical: DROP TABLE detected (L88) |
|  [FAIL] Execution:      1 finding  (25%) |
|    > critical: curl | bash (L23)         |
|  [FAIL] Data Access:    3 findings (20%) |
|    > high: GITHUB_TOKEN access (L31)     |
|    > high: AWS_SECRET access (L32)       |
|    > high: .env file reading (L45)       |
|  [warn] Prompt Safety:  1 finding  (15%) |
|    > high: "ignore previous" (L71)       |
|  [pass] Declaration:    0 findings (15%) |
+------------------------------------------+
|  Manifest: not present                   |
|  SSP Version: v1.0                       |
+------------------------------------------+
```

**Color scheme** (ANSI):

| Element | Color | ANSI Code |
|---------|-------|-----------|
| PASS status | Green | `\x1b[32m` |
| FAIL status | Red | `\x1b[31m` |
| `[pass]` marker | Green | `\x1b[32m` |
| `[warn]` marker | Yellow | `\x1b[33m` |
| `[FAIL]` marker | Red bold | `\x1b[1;31m` |
| Score (passing) | Green bold | `\x1b[1;32m` |
| Score (failing) | Red bold | `\x1b[1;31m` |
| Finding detail | Dim | `\x1b[2m` |
| Box borders | Default | (no color) |

**Verbose mode** (`--verbose`):

When `--verbose` is set, each finding includes the matched line content:

```
  [FAIL] Destructive:    2 findings (25%)
    > critical: rm -rf / detected (L15)
      | 15: rm -rf /var/log/* /tmp/* /home/*
    > critical: DROP TABLE detected (L88)
      | 88: DROP TABLE users CASCADE;
```

**Multi-file output** (directory scan):

```
Scanning 5 skills in ./plugins/

  plugins/sw-frontend/skills/component-generate/SKILL.md
  Score: 100/100    Level: E1/S1    Status: PASS

  plugins/sw-frontend/skills/style-system/SKILL.md
  Score: 95/100     Level: E2/S1    Status: PASS

  plugins/sw-backend/skills/api-design/SKILL.md
  Score: 72/100     Level: E0/S0    Status: FAIL

  plugins/sw-testing/skills/test-writer/SKILL.md
  Score: 88/100     Level: E1/S1    Status: PASS

  plugins/sw-testing/skills/coverage/SKILL.md
  Score: 91/100     Level: E1/S1    Status: PASS

Summary: 4/5 passed (threshold: 80)
  1 failed: plugins/sw-backend/skills/api-design/SKILL.md (72)
```

---

### 2.2 JSON Output

The `--json` flag produces machine-readable output conforming to the `VskillVerifyResult` schema. This is the contract for CI integrations, GitHub Actions, and the `@vskill/scanner` API.

**Single file**:
```json
{
  "version": "ssp/v1.0",
  "file": "plugins/sw-frontend/skills/component-generate/SKILL.md",
  "score": 97,
  "threshold": 80,
  "level": {
    "extensibility": "E1",
    "security": "S3"
  },
  "status": "PASS",
  "categories": {
    "destructive": {
      "weight": 0.25,
      "score": 25,
      "findings": []
    },
    "execution": {
      "weight": 0.25,
      "score": 25,
      "findings": []
    },
    "dataAccess": {
      "weight": 0.20,
      "score": 17,
      "findings": [
        {
          "severity": "low",
          "category": "data-access",
          "pattern": "reads .env for config loading",
          "message": "Direct .env file reading pattern detected",
          "line": 42,
          "inCodeBlock": false,
          "remediation": "Use environment variable injection instead of direct .env reads"
        }
      ]
    },
    "promptSafety": {
      "weight": 0.15,
      "score": 15,
      "findings": []
    },
    "declarationHonesty": {
      "weight": 0.15,
      "score": 15,
      "findings": []
    }
  },
  "manifest": {
    "present": true,
    "hash": "sha256:a1b2c3d4e5f6...",
    "hashValid": true,
    "signed": true,
    "signatureValid": true,
    "permissions": ["read-only", "no-bash", "no-network"],
    "scannedAt": "2026-02-15T18:00:00Z"
  },
  "metadata": {
    "lines": 284,
    "sections": 12,
    "codeBlocks": 5,
    "frontmatter": true,
    "eLevelMarkers": ["SS:IMPORTABLE"]
  }
}
```

**Multi-file** (directory scan):
```json
{
  "version": "ssp/v1.0",
  "directory": "./plugins/",
  "threshold": 80,
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1
  },
  "results": [
    { "file": "...", "score": 100, "status": "PASS", "level": { "extensibility": "E1", "security": "S1" }, "categories": { "..." : "..." } },
    { "file": "...", "score": 72, "status": "FAIL", "level": { "extensibility": "E0", "security": "S0" }, "categories": { "..." : "..." } }
  ]
}
```

**Audit output** (`vskill audit --json`):
```json
{
  "version": "ssp/v1.0",
  "auditedAt": "2026-02-15T18:30:00Z",
  "agents": {
    "claude-code": {
      "detected": true,
      "localDir": "/project/.claude/skills/",
      "globalDir": "/Users/dev/.claude/skills/",
      "skills": [
        {
          "name": "frontend-design",
          "source": "anthropics/skills",
          "score": 97,
          "level": { "extensibility": "E1", "security": "S3" },
          "locked": true,
          "lockedVersion": "v1.3.0",
          "installedSha": "abc123",
          "stale": false
        }
      ]
    },
    "cursor": {
      "detected": true,
      "skills": []
    }
  },
  "summary": {
    "totalAgents": 2,
    "totalSkills": 1,
    "passed": 1,
    "failed": 0,
    "drifted": 0
  }
}
```

---

### 2.3 TypeScript Schema

The JSON output conforms to these TypeScript interfaces (defined in `@vskill/scanner`):

```typescript
/** Severity levels aligned with existing FabricSecurityFinding */
type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Extensibility level */
type ELevel = 'E0' | 'E1' | 'E2' | 'E3';

/** Security level */
type SLevel = 'S0' | 'S1' | 'S2' | 'S3';

/** A single finding within a scoring category */
interface ScoringFinding {
  severity: Severity;
  category: string;
  pattern: string;
  message: string;
  line: number;
  inCodeBlock: boolean;
  remediation?: string;
}

/** Results for a single scoring category */
interface CategoryResult {
  weight: number;
  score: number;
  findings: ScoringFinding[];
}

/** Manifest parsed from VSKILL:* comments */
interface ManifestInfo {
  present: boolean;
  hash?: string;
  hashValid?: boolean;
  signed?: boolean;
  signatureValid?: boolean;
  permissions?: string[];
  scannedAt?: string;
}

/** Complete verify result for a single file */
interface VerifyResult {
  version: string;
  file: string;
  score: number;
  threshold: number;
  level: { extensibility: ELevel; security: SLevel };
  status: 'PASS' | 'FAIL';
  categories: {
    destructive: CategoryResult;
    execution: CategoryResult;
    dataAccess: CategoryResult;
    promptSafety: CategoryResult;
    declarationHonesty: CategoryResult;
  };
  manifest: ManifestInfo;
  metadata: {
    lines: number;
    sections: number;
    codeBlocks: number;
    frontmatter: boolean;
    eLevelMarkers: string[];
  };
}

/** Multi-file verify result */
interface BatchVerifyResult {
  version: string;
  directory: string;
  threshold: number;
  summary: { total: number; passed: number; failed: number };
  results: VerifyResult[];
}
```

---

## 3. SpecWeave CLI Integration Points (T-011)

### 3.1 Separation of Concerns

`vskill` and `specweave` are distinct packages with distinct audiences. They share a scanner engine but serve different purposes.

| Dimension | `vskill` | `specweave` |
|-----------|----------|-------------|
| **Purpose** | Skill security: verify, install, audit, sign | Project management: increments, specs, tasks, docs |
| **Audience** | Any developer using AI skills | SpecWeave framework users |
| **npm package** | `vskill` | `specweave` |
| **Repo** | `verified-skill/vskill` (private) | `specweave/specweave` (public) |
| **Dependency** | `@vskill/scanner` | `@vskill/scanner` + SpecWeave core |
| **Agent awareness** | Yes (39 agents, install/audit) | Limited (skill export, fabric) |
| **Registry interaction** | verified-skill.com API (read + submit) | verified-skill.com API (read-only) |

There is zero functional overlap. `vskill` never manages increments. `specweave` never installs third-party skills.

---

### 3.2 Shared Scanner Package: `@vskill/scanner`

The core scoring algorithm lives in a shared package used by both CLIs. This ensures identical scoring regardless of entry point.

**Package structure**:
```
@vskill/scanner/
  src/
    index.ts                 # Public API
    scoring-engine.ts        # SSP/v1.0 weighted scoring algorithm
    pattern-checks.ts        # Pattern definitions (extends security-scanner.ts)
    manifest-parser.ts       # VSKILL:* comment parser
    e-level-detector.ts      # Extensibility level detection
    s-level-detector.ts      # Security level determination
    agent-registry.ts        # 39-agent detection and path mapping
    declaration-checker.ts   # Permission vs. behavior comparison
    types.ts                 # TypeScript interfaces (VerifyResult, etc.)
  tests/
    scoring-engine.test.ts
    pattern-checks.test.ts
    manifest-parser.test.ts
    ...
```

**Relationship to existing `security-scanner.ts`**:

The existing SpecWeave scanner (`src/core/fabric/security-scanner.ts`) has 26 pattern checks and returns a boolean `passed` result. The `@vskill/scanner` package extends this foundation:

| Existing Scanner | `@vskill/scanner` Extension |
|-----------------|----------------------------|
| 26 regex patterns | Same patterns + declaration honesty category |
| Binary pass/fail | Weighted 0-100 score |
| Flat findings list | Findings grouped by 5 categories |
| `severity` field | Same severities + penalty weights |
| Code block awareness | Same logic, carried over |
| `safeContexts` | Same logic, carried over |
| No manifest support | Full `VSKILL:VERIFY` manifest parsing |
| No E-level | Structural marker detection |
| No signing | ed25519 signature verification |

**Migration path**: SpecWeave's `security-scanner.ts` will eventually import from `@vskill/scanner` instead of maintaining its own pattern list. During transition, both contain the patterns. After `@vskill/scanner` is published, `security-scanner.ts` becomes a thin wrapper:

```typescript
// Future security-scanner.ts (after @vskill/scanner is published)
import { scoreSKILL } from '@vskill/scanner';
import { FabricSecurityScanResult } from './registry-schema.js';

export function scanSkillContent(content: string): FabricSecurityScanResult {
  const result = scoreSKILL(content);
  return {
    passed: result.score >= 80,
    findings: Object.values(result.categories)
      .flatMap(cat => cat.findings)
      .map(f => ({
        severity: f.severity,
        category: f.category,
        message: f.message,
        line: f.line,
      })),
  };
}
```

---

### 3.3 SpecWeave CLI Commands That Delegate to vskill

Three `specweave fabric` subcommands interact with the vskill ecosystem:

#### `specweave fabric verify <path>`

Delegates to `@vskill/scanner`'s scoring engine. Does NOT shell out to `npx vskill` -- it imports the package directly.

```
specweave fabric verify ./plugins/sw-frontend/skills/component-generate/SKILL.md
```

- Uses the same SSP/v1.0 algorithm as `npx vskill verify`
- Output format follows SpecWeave CLI conventions (logger, not raw stdout)
- Integrated with SpecWeave's existing `specweave fabric` command group
- No agent detection or install capability (that stays in `vskill`)

#### `specweave fabric search <query>`

Queries the verified-skill.com API to find verified skills.

```
specweave fabric search "react component generator"
```

- Calls `GET https://verified-skill.com/api/v1/skills?q=<query>`
- Displays results with trust badges, scores, and install commands
- Shows `npx vskill install <source>` as the install instruction
- SpecWeave itself does not install third-party skills

#### `specweave fabric install <source>`

Delegates the actual installation to `vskill`. This is the bridge command.

```
specweave fabric install anthropics/skills --skill frontend-design
```

- Checks if `vskill` is available (globally or via `npx`)
- If available: delegates with `npx vskill install <source> [flags]`
- If not available: prints `npm install -g vskill` instruction and exits
- Passes through relevant flags (`--agent`, `--all`, `--ref`)
- Never bypasses the security scan (no `--skip-scan` pass-through)

---

### 3.4 Data Flow Architecture

```
Developer
    |
    v
+-------------------+     +-------------------+     +-------------------+
| specweave CLI     |     | vskill CLI        |     | verified-skill.com|
|                   |     |                   |     |                   |
| fabric verify ----|---->| verify            |     | /api/v1/skills    |
| fabric search ----|-----|-------------------|---->| /api/v1/search    |
| fabric install ---|---->| install           |     | /api/v1/submit    |
|                   |     | audit             |     |                   |
|                   |     | sign              |     |                   |
|                   |     | info              |     |                   |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
         v                         v                          v
   @vskill/scanner           @vskill/scanner          @vskill/scanner
   (npm dependency)          (npm dependency)          (server-side)
```

All three consumers -- `specweave`, `vskill`, and `verified-skill.com` -- use the same `@vskill/scanner` package. This guarantees score consistency: a skill that scores 97 via `npx vskill verify` scores 97 on the website and 97 via `specweave fabric verify`.

---

### 3.5 Configuration

`vskill` has its own configuration file at `~/.vskill/config.json`:

```json
{
  "defaultThreshold": 80,
  "sspVersion": "v1.0",
  "trustedVendors": [
    "anthropics",
    "openai",
    "google",
    "vercel-labs",
    "supabase"
  ],
  "registryUrl": "https://verified-skill.com/api/v1",
  "installMode": "copy",
  "autoUpdate": false,
  "telemetry": false
}
```

`specweave` accesses scanner configuration through its existing `.specweave/config.json`:

```json
{
  "fabric": {
    "scanner": {
      "threshold": 80,
      "sspVersion": "v1.0"
    },
    "registry": {
      "url": "https://verified-skill.com/api/v1"
    }
  }
}
```

Both configs are independent. Changing the threshold in `vskill` does not affect `specweave` and vice versa.

---

### 3.6 Monorepo Structure (verified-skill Repository)

The `vskill` CLI and scanner live in a private Turborepo monorepo:

```
verified-skill/
  packages/
    scanner/               # @vskill/scanner - shared scoring engine
      src/
        index.ts
        scoring-engine.ts
        pattern-checks.ts
        manifest-parser.ts
        e-level-detector.ts
        s-level-detector.ts
        agent-registry.ts
        declaration-checker.ts
        types.ts
      package.json         # name: "@vskill/scanner"
    cli/                   # vskill - CLI package
      src/
        index.ts           # Entry point, commander setup
        commands/
          verify.ts
          install.ts
          audit.ts
          sign.ts
          info.ts
        output/
          human-renderer.ts
          json-renderer.ts
        agents/
          detector.ts      # Uses @vskill/scanner agent-registry
          installer.ts     # Write SKILL.md to agent dirs
        lock/
          lock-file.ts     # vskill.lock read/write
      bin/
        vskill.js          # #!/usr/bin/env node entry
      package.json         # name: "vskill", bin: { vskill: "bin/vskill.js" }
    web/                   # verified-skill.com website
      src/
        app/               # Next.js 14+ App Router
        emails/            # React Email templates
      prisma/
        schema.prisma      # PostgreSQL schema
      package.json         # name: "@vskill/web"
  turbo.json
  package.json             # Workspaces root
```

---

### 3.7 Future Integration Points

These are not in scope for the current increment but are acknowledged for forward compatibility:

1. **GitHub Action**: `vskill/verify-action` that runs `npx vskill verify` in CI and posts results as PR comments.
2. **Pre-commit hook**: `vskill verify` as a git pre-commit hook for skill authors.
3. **VS Code extension**: Inline SSP scoring in the editor when editing SKILL.md files.
4. **specweave skill export**: When `specweave export-skills` runs, automatically compute and embed the SSP score in exported SKILL.md files.
5. **Badge API**: `https://verified-skill.com/badge/<owner>/<repo>/<skill>.svg` for README badges.

---

## Appendix A: Scoring Algorithm Reference

For completeness, the scoring formula from the 0218 plan:

```
Score = 100 - sum(category_weight * severity_penalty * finding_count)

Categories and weights:
  Destructive patterns:    0.25
  Code execution:          0.25
  Data access:             0.20
  Prompt safety:           0.15
  Declaration honesty:     0.15

Severity penalties:
  critical = 25 points
  high     = 15 points
  medium   = 8 points
  low      = 3 points
  info     = 0 points

Score floor = 0 (no negative scores)
```

Example calculation for a skill with 1 critical destructive finding and 2 high data access findings:

```
Destructive:  0.25 * 25 * 1  =  6.25
Data access:  0.20 * 15 * 2  =  6.00
Total penalty:                  12.25
Score: 100 - 12.25 = 87.75 -> 88 (rounded)
Status: PASS (>= 80)
```

---

## Appendix B: Pattern Category Mapping

Mapping from existing `security-scanner.ts` categories to SSP scoring categories:

| Existing Category | SSP Category | Weight |
|-------------------|--------------|--------|
| `destructive-command` | Destructive | 0.25 |
| `remote-code-execution` | Execution | 0.25 |
| `credential-access` | Data Access | 0.20 |
| `dangerous-permissions` | Data Access | 0.20 |
| `network-access` | Data Access | 0.20 |
| `prompt-injection` | Prompt Safety | 0.15 |
| `frontmatter-issue` | Declaration Honesty | 0.15 |
| (new) Permission mismatch | Declaration Honesty | 0.15 |

---

## Appendix C: Exit Code Summary

| Command | Code 0 | Code 1 | Code 2 |
|---------|--------|--------|--------|
| `verify` | Score >= threshold | Score < threshold | Parse/file error |
| `install` | Installed successfully | Scan failed, user aborted | Network/file error |
| `audit` | All skills pass | Any skill fails | Scan error |
| `sign` | Signed successfully | -- | Key/file error |
| `info` | Displayed successfully | -- | Parse/file error |
