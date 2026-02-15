# Implementation Plan: Secure Skill Standard & Marketplace Investigation

## Overview

Four-phase approach: forensic investigation of the openskills exposure → SSP standard design → CLI architecture → public docs and YouTube content. Research-heavy increment where findings feed into 0217 for implementation.

## Architecture

### The Secure Skill Protocol (SSP)

Two independent dimensions rating every skill:

**Extensibility (E-level)**:
| Level | Name | Compliance Criteria |
|-------|------|-------------------|
| E0 | Standalone | Single SKILL.md, no imports/exports |
| E1 | Importable | Declares `<!-- VSKILL:IMPORTABLE -->`, stable API surface |
| E2 | Extensible | Provides documented hooks/override points via `<!-- VSKILL:EXTENDS -->` |
| E3 | Composable | Full dependency manifest, conflict resolution rules, DAG-safe |

**Security (S-level)**:
| Level | Name | Compliance Criteria |
|-------|------|-------------------|
| S0 | Unknown | No scan performed |
| S1 | Scanned | Passed automated pattern checks (29+ regex patterns) |
| S2 | Verified | S1 + LLM intent analysis + unified score >= 80/100 |
| S3 | Certified | S2 + ed25519 signature + `<!-- VSKILL:VERIFY ssp/v1 -->` self-audit manifest |

### Unified Scoring Algorithm

```
Score = 100 - Σ(category_weight × severity_penalty × finding_count)

Categories:
  Destructive patterns:    weight = 0.25  (rm -rf, DROP TABLE, dd, format)
  Code execution:          weight = 0.25  (eval, exec, curl|bash, child_process)
  Data access:             weight = 0.20  (.env, credentials, network calls)
  Prompt safety:           weight = 0.15  (injection, precedence overrides)
  Declaration honesty:     weight = 0.15  (declared permissions vs actual behavior)

Severity penalties:
  critical = 25 points
  high     = 15 points
  medium   = 8 points
  low      = 3 points
  info     = 0 points (informational only)
```

### Self-Audit Manifest Format

```markdown
<!-- VSKILL:VERIFY ssp/v1 -->
<!-- VSKILL:PERMISSIONS read-only, no-bash, no-network -->
<!-- VSKILL:HASH sha256:a1b2c3d4e5f6... -->
<!-- VSKILL:SIGNED ed25519:author-pubkey... -->
<!-- VSKILL:SCORE 97/100 ssp/v1.0 2026-02-15 -->
```

### `npx vskill` CLI Command Architecture

```
vskill verify <path>              → Score + findings (human-readable + JSON)
vskill install <author/skill>     → Verify → Install (gate on S-level threshold)
vskill audit [--path <dir>]       → Scan all installed skills
vskill sign <path> --key <keyfile> → Attach ed25519 signature
vskill info <path>                → Show E/S level, score, audit history
```

## Architecture Decisions

### AD-1: SSP as Open Standard
Publish SSP as an open specification, not locked to SpecWeave. Any agent platform can implement verification. This positions SpecWeave as the ecosystem authority.

### AD-2: Deterministic Scoring
SSP version pins the scoring algorithm. `ssp/v1.0` ALWAYS produces the same score for the same content. No LLM variability in the score — LLM analysis is separate (Tier 2 qualification).

### AD-3: `vskill` Name Choice
"Verified Skill" → `vskill`. Clean, memorable, instantly communicates "verified." npm package: `vskill`. Domain: `verified-skill.com`.

### AD-4: Build on Existing Scanner
Extend `security-scanner.ts` with weighted scoring, don't replace it. The 29 patterns become the S1 foundation. New "declaration honesty" category added for S2+.

### AD-5: Docs-First Deliverables
This increment produces specifications, RFCs, and docs. Implementation deferred to 0217 and follow-up increments. Standards must be published before code.

## Implementation Phases

### Phase 1: Forensic Investigation (T-001 to T-003)
Web research on openskills registry, majiayu000 profile, content diff analysis.

### Phase 2: SSP Standard Design (T-004 to T-008)
E-level spec, S-level spec, scoring algorithm, VSKILL:VERIFY manifest, RFC document.

### Phase 3: CLI Architecture (T-009 to T-011)
Command design, output formats, integration with specweave CLI.

### Phase 4: Docs & YouTube (T-012 to T-015)
"Skills are the new libraries" page, SSP reference, YouTube script section, findings report.

## Testing Strategy

Primarily document review and factual verification:
- Web research verified with multiple sources
- Scoring algorithm tested with example skills (manual calculation)
- CLI design reviewed against existing specweave CLI patterns
- Docs reviewed for accuracy against Snyk article data

## Technical Challenges

### Challenge 1: npm Package Name `ss`
**Solution**: Register `secure-skill` package, alias `ss` in bin field. Check availability.
**Risk**: Name squatting. Mitigation: reserve early.

### Challenge 2: Declaration Honesty Detection
**Solution**: Compare skill's declared permissions (`<!-- VSKILL:PERMISSIONS -->`) against actual content patterns. If declares `no-bash` but contains `Bash()`, flag as violation.
**Risk**: False positives from examples/docs. Mitigation: code block awareness (already in scanner).
