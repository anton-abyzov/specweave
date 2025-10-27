# Increment Validation System - Architecture Design

**Created**: 2025-10-26
**Status**: Design Complete
**Priority**: P1 (Critical for quality assurance)

---

## Executive Summary

**Problem**: Currently, spec.md, plan.md, and tasks.md can be created with inconsistencies, missing sections, or quality issues that only surface during implementation.

**Solution**: Automated validation system using **hybrid architecture** (hook + skill + agent) that:
- Runs quick validation (5-10s) on every document save
- Performs deep analysis (30-60s) when issues detected
- Provides multi-perspective review (PM, Architect, QA, Security)
- Generates actionable validation reports

**Impact**:
- Catch issues BEFORE implementation (save hours of rework)
- Ensure specs are production-ready
- Maintain consistency across all increments
- Reduce regression risk

---

## Architecture: Hybrid Approach

### Why Hybrid?

**Performance**: Most documents are clean → quick validation sufficient (5-10s)
**Efficiency**: Deep analysis only when needed (avoid overhead)
**Thoroughness**: Agent provides multi-perspective review when issues found
**User Experience**: Fast feedback loop, detailed analysis on demand

### Component Overview

```
User saves spec.md/plan.md/tasks.md
         ↓
.claude/hooks/post-document-save.sh (triggers)
         ↓
increment-validator skill (quick validation - 5-10s)
         ↓
    ✅ Clean? → Report success, done
    ❌ Issues? → Invoke increment-validator agent
         ↓
increment-validator agent (deep analysis - 30-60s)
    - PM perspective (business requirements)
    - Architect perspective (technical design)
    - QA perspective (test coverage)
    - Security perspective (security considerations)
    - Risk assessment (controversial items)
         ↓
Generate: validation-report.md in increment/reports/
         ↓
Notify user with actionable recommendations
```

---

## Component 1: Hook (.claude/hooks/post-document-save.sh)

### Purpose
Detect when spec.md, plan.md, tasks.md, or tests.md are modified and trigger validation

### Implementation

```bash
#!/bin/bash
# .claude/hooks/post-document-save.sh

# Detect if spec.md, plan.md, tasks.md, or tests.md was modified
MODIFIED_FILE=$1

if [[ "$MODIFIED_FILE" =~ (spec|plan|tasks|tests)\.md$ ]]; then
  # Extract increment ID from path
  INCREMENT_ID=$(echo "$MODIFIED_FILE" | grep -oE '[0-9]{4}-[a-z-]+')

  if [ -z "$INCREMENT_ID" ]; then
    echo "⚠️  Could not detect increment ID from: $MODIFIED_FILE"
    exit 0
  fi

  # Activate increment-validator skill
  echo "🔍 Validating increment: $INCREMENT_ID"
  echo "Modified file: $(basename $MODIFIED_FILE)"

  # Skill will run quick validation
  # If issues found, agent will be invoked automatically
fi
```

### Trigger Conditions
- File saved: `spec.md`, `plan.md`, `tasks.md`, `tests.md`
- Path contains: `.specweave/increments/####-name/`
- Auto-detect increment ID from path

---

## Component 2: Skill (increment-validator)

### Location
`src/skills/increment-validator/`

### Responsibilities

#### 1. Quick Validation (5-10 seconds)
- Parse spec.md, plan.md, tasks.md, tests.md
- Run validation rules (see Validation Rules section)
- Count issues by severity (error, warning, info)
- Decide if deep analysis needed

#### 2. Decision Logic
```
IF errors > 0 OR warnings > 3:
  → Invoke increment-validator agent
ELSE:
  → Report quick summary to user
```

#### 3. Coordination
- Invoke `increment-validator` agent via Task tool
- Pass context: increment ID, issues found, modified file
- Wait for validation report
- Present report to user

### SKILL.md Structure

```yaml
---
name: increment-validator
description: >
  Validates SpecWeave increment documents (spec.md, plan.md, tasks.md, tests.md)
  for consistency, completeness, quality, and traceability. Automatically activates
  when increment documents are saved. Runs quick validation first, then deep analysis
  if issues detected. Keywords: validate increment, check spec, validate plan,
  validate tasks, increment validation, document validation, consistency check.
allowed-tools: Read, Grep, Glob, Bash
---

# Increment Validator Skill

## Purpose

Validates SpecWeave increment documents to ensure:
- **Consistency**: spec.md ↔ plan.md ↔ tasks.md alignment
- **Completeness**: All required sections present
- **Quality**: Technology-agnostic spec, detailed plan, actionable tasks
- **Traceability**: TC-0001 IDs, ADR references, user stories → tasks
- **Risk Assessment**: Security, performance, technical debt

## Activation

Auto-activates when:
- User saves spec.md, plan.md, tasks.md, or tests.md
- User runs `/validate-increment ####`
- Hook triggers: `.claude/hooks/post-document-save.sh`

## Quick Validation (5-10 seconds)

### 1. Parse Documents
Read spec.md, plan.md, tasks.md, tests.md from increment folder

### 2. Run Validation Rules
- Consistency checks (47 rules)
- Completeness checks (23 rules)
- Quality checks (31 rules)
- Traceability checks (19 rules)

### 3. Count Issues
- Errors: MUST fix before implementation
- Warnings: SHOULD fix (not blockers)
- Info: Nice to have

### 4. Decision
```
IF errors > 0 OR warnings > 3:
  → Invoke increment-validator agent (deep analysis)
ELSE:
  → Report quick summary
```

## Deep Analysis Trigger

When deep analysis needed, invoke agent:
```typescript
await Task({
  subagent_type: "increment-validator",
  prompt: `Validate increment ${incrementId}. Quick validation found ${errorCount} errors and ${warningCount} warnings. Perform deep analysis.`,
  description: "Deep increment validation"
});
```

## Validation Rules

See: [Validation Rules Reference](references/validation-rules.md)

## Output

### Clean Documents
```
✅ Quick validation passed (0 errors, 0 warnings)
✅ All consistency checks passed
✅ All completeness checks passed
✅ All traceability checks passed

No issues found! Ready for implementation.
```

### Minor Issues
```
⚠️ Quick validation found 2 warnings:
  - Task T015 exceeds size guideline (3 days)
  - Missing dependency link for T008

Recommendations:
1. Consider breaking down T015 into smaller tasks
2. Add dependency: T008 depends on T003
```

### Critical Issues
```
❌ Quick validation found 3 errors:
  - Missing acceptance criteria for US-003
  - Inconsistency: spec.md mentions "real-time" but plan.md doesn't address it
  - Traceability broken: TC-0007 in spec.md not in tests.md

🔬 Running deep analysis (increment-validator agent)...
```

## Scripts

- `scripts/consistency-check.sh` - Check spec ↔ plan ↔ tasks alignment
- `scripts/completeness-check.sh` - Check all sections present
- `scripts/traceability-check.sh` - Check TC-0001, ADR references
- `scripts/quality-check.sh` - Check technology-agnostic spec, actionable tasks
```

### File Structure

```
src/skills/increment-validator/
├── SKILL.md                        # Skill definition
├── scripts/
│   ├── consistency-check.sh        # Consistency validation
│   ├── completeness-check.sh       # Completeness validation
│   ├── traceability-check.sh       # Traceability validation
│   └── quality-check.sh            # Quality validation
├── test-cases/                     # Minimum 3 test cases
│   ├── test-1-detect-inconsistency.yaml
│   ├── test-2-missing-sections.yaml
│   └── test-3-traceability-broken.yaml
└── references/
    └── validation-rules.md         # Complete validation rules
```

---

## Component 3: Agent (increment-validator)

### Location
`src/agents/increment-validator/`

### Responsibilities

#### 1. Multi-Perspective Analysis (30-60 seconds)

**PM Perspective**: Business requirements quality
- User stories clear and complete?
- Acceptance criteria testable?
- Problem statement compelling?
- Success criteria measurable?

**Architect Perspective**: Technical design quality
- Architecture sound and scalable?
- ADRs referenced correctly?
- Components well-defined?
- Data model complete?
- API contracts clear?

**QA Perspective**: Test coverage adequacy
- All acceptance criteria (TC-0001) covered?
- Test types appropriate (E2E, Unit, Integration)?
- Test file locations specified?
- Edge cases considered?

**Security Perspective**: Security considerations
- Authentication/authorization addressed?
- Data encryption considered?
- Input validation mentioned?
- OWASP Top 10 considerations?
- Threat model complete?

#### 2. Risk Assessment

Identify and assess:
- **Security risks**: Missing auth, no encryption, no input validation
- **Performance risks**: No caching strategy, no scalability plan
- **Technical debt**: Introduced without justification
- **Breaking changes**: Not documented or communicated
- **Controversial items**: High-risk decisions without ADRs

Severity levels:
- 🔴 **CRITICAL**: Must fix before implementation
- 🟡 **HIGH**: Should fix before implementation
- 🟠 **MEDIUM**: Fix before release
- 🟢 **LOW**: Nice to have

#### 3. Report Generation

Create `validation-report.md` in `increment/reports/` with:
- Executive summary (overall assessment)
- Detailed findings (by severity)
- Consistency analysis
- Completeness analysis
- Risk assessment
- Action items (MUST FIX, RECOMMENDED, NICE TO HAVE)
- Validation metadata

#### 4. Actionable Output

- Clear "must fix" vs "nice to have"
- Line number references for easy navigation
- Links to documentation/guides
- Suggested fixes (not just complaints)
- Commands to re-validate after fixes

### AGENT.md Structure

```yaml
---
name: increment-validator
description: >
  Expert increment validator that performs deep multi-perspective analysis
  of SpecWeave increment documents. Validates from PM, Architect, QA, and
  Security perspectives. Assesses risks, generates detailed validation reports
  with actionable recommendations. Invoked by increment-validator skill when
  critical issues detected.
tools: Read, Grep, Glob, Write
model: claude-sonnet-4-5-20250929
---

You are an expert increment validator with deep knowledge of:
- Product Management best practices
- Software architecture principles
- Quality assurance methodology
- Security engineering standards
- Risk assessment frameworks

## Your Role

Perform **deep multi-perspective analysis** of SpecWeave increment documents:
1. spec.md (business requirements)
2. plan.md (technical design)
3. tasks.md (implementation plan)
4. tests.md (test strategy)

## Analysis Perspectives

### 1. PM Perspective (Business Requirements)

Validate spec.md quality:
- ✅ Problem statement clear and compelling?
- ✅ User stories follow "As a... I want... So that..." format?
- ✅ Acceptance criteria testable (no vague statements)?
- ✅ Success criteria measurable (KPIs defined)?
- ✅ Technology-agnostic (no framework/library mentions)?
- ✅ Edge cases considered?

**Red flags**:
- Vague acceptance criteria ("should work well")
- Missing user personas
- Unclear value proposition
- No success metrics

### 2. Architect Perspective (Technical Design)

Validate plan.md quality:
- ✅ Architecture diagram present and referenced?
- ✅ ADRs referenced for key decisions?
- ✅ Component breakdown clear?
- ✅ Data model complete (entities, relationships)?
- ✅ API contracts defined (endpoints, payloads)?
- ✅ Tech stack justified?
- ✅ Security considerations addressed?
- ✅ Performance considerations addressed?
- ✅ Error handling strategy defined?

**Red flags**:
- No architecture diagram
- ADRs referenced but don't exist
- Missing data model
- No error handling
- No security section

### 3. QA Perspective (Test Coverage)

Validate tests.md quality:
- ✅ All TC-0001 IDs from spec.md covered?
- ✅ Test coverage matrix complete?
- ✅ Test types appropriate (E2E for UI, Unit for logic)?
- ✅ Test file locations specified?
- ✅ Edge cases have test coverage?
- ✅ Priorities assigned (P1, P2, P3)?

**Red flags**:
- Missing TC-0001 coverage
- No test file locations
- Only happy path tested (no edge cases)
- Vague test descriptions

### 4. Security Perspective (Security Considerations)

Validate security coverage:
- ✅ Authentication/authorization addressed?
- ✅ Data encryption mentioned (at rest, in transit)?
- ✅ Input validation strategy defined?
- ✅ OWASP Top 10 considerations present?
- ✅ Rate limiting mentioned (if API)?
- ✅ Secrets management addressed?
- ✅ Threat model complete (if high-risk)?

**Red flags**:
- No security section in plan.md
- OAuth/auth without security details
- No input validation
- Storing passwords without hashing
- No rate limiting for public APIs

## Risk Assessment

Identify and assess:

### Security Risks
- Missing authentication/authorization
- No encryption strategy
- No input validation
- Missing OWASP considerations
- No secrets management
- No threat model (for high-risk features)

### Performance Risks
- No caching strategy (when needed)
- No scalability plan
- Missing performance targets
- No load testing mentioned
- Database queries not optimized

### Technical Debt Risks
- Introduced without justification
- No plan to address later
- Not documented in spec.md
- "Quick hack" without ADR

### Breaking Change Risks
- Not documented
- No migration plan
- No backward compatibility
- Users not notified

### Controversial Items
- High-risk decisions without ADRs
- Technology choices not justified
- Architectural patterns not documented
- Deviations from standards

## Severity Levels

- 🔴 **CRITICAL**: Blocks implementation, must fix immediately
- 🟡 **HIGH**: Should fix before implementation
- 🟠 **MEDIUM**: Fix before release
- 🟢 **LOW**: Nice to have, can defer

## Report Generation

Create validation report at:
`.specweave/increments/####-name/reports/validation-report.md`

Use template:
`templates/validation-report.md.template`

Include:
1. Executive summary (overall assessment)
2. Critical issues (with line numbers)
3. Detailed findings (by severity)
4. Consistency analysis
5. Completeness analysis
6. Risk assessment
7. Action items (MUST FIX, RECOMMENDED, NICE TO HAVE)
8. Validation metadata

## Output Format

- Clear, actionable recommendations
- Reference line numbers for easy navigation
- Link to documentation/guides
- Suggest fixes (not just complaints)
- Provide commands to re-validate

## Example Output

See: [templates/validation-report.md.template](templates/validation-report.md.template)
```

### File Structure

```
src/agents/increment-validator/
├── AGENT.md                        # Agent definition
├── templates/
│   └── validation-report.md.template  # Report template
├── test-cases/                     # Minimum 3 test cases
│   ├── test-1-pm-validation.yaml
│   ├── test-2-architect-validation.yaml
│   └── test-3-security-validation.yaml
└── references/
    ├── validation-criteria.md      # Complete validation criteria
    └── risk-assessment-guide.md    # Risk assessment methodology
```

---

## Validation Rules Reference

### Consistency Rules (47 rules)

#### User Story → Plan (10 rules)
1. Every user story in spec.md MUST have corresponding section in plan.md
2. Section names should match or clearly reference user story ID
3. Plan sections should address ALL acceptance criteria
4. No orphaned plan sections (not referenced in spec)
5. User story priorities align with plan implementation order
6. Success criteria in spec.md reflected in plan.md deliverables
7. Problem statement in spec.md addressed by plan.md solution
8. Constraints in spec.md respected in plan.md design
9. Assumptions in spec.md documented in plan.md ADRs
10. Edge cases in spec.md have error handling in plan.md

#### Plan → Tasks (12 rules)
1. Every component in plan.md MUST have tasks in tasks.md
2. Task descriptions reference plan sections (clear traceability)
3. All API endpoints in plan.md have implementation tasks
4. All data entities in plan.md have migration/setup tasks
5. All ADRs referenced in plan.md have creation tasks (if new)
6. All diagrams referenced in plan.md have creation tasks (if new)
7. Security considerations in plan.md have implementation tasks
8. Performance optimizations in plan.md have tasks
9. Error handling strategies in plan.md have tasks
10. Testing strategies in plan.md have test creation tasks
11. No orphaned tasks (not referenced in plan.md)
12. Task dependencies align with plan.md component dependencies

#### Spec → Tests (15 rules)
1. Every TC-0001 in spec.md MUST appear in tests.md
2. Every TC-0001 in tests.md specifies test file location
3. Acceptance criteria format consistent (TC-0001, TC-0002, etc.)
4. Test coverage matrix in tests.md includes ALL TC-0001 IDs
5. Critical paths (P1) have E2E test coverage
6. Edge cases have test coverage
7. Error conditions have test coverage
8. Performance criteria have load/stress tests
9. Security requirements have security tests
10. User stories with UI have Playwright E2E tests
11. Business logic has unit tests
12. API endpoints have integration tests
13. Database operations have integration tests
14. No TC-0001 IDs duplicated
15. TC-0001 numbering sequential (no gaps)

#### Cross-Document (10 rules)
1. Increment ID consistent across all files (frontmatter)
2. Feature name consistent across all files
3. Priority consistent (P1/P2/P3)
4. Estimated timeline consistent
5. Dependencies consistent
6. Tech stack consistent (plan.md, tasks.md)
7. ADR references valid (files exist)
8. Diagram references valid (files exist)
9. No contradictions between documents
10. Terminology consistent (use same terms across docs)

### Completeness Rules (23 rules)

#### Spec.md (8 rules)
1. Has valid YAML frontmatter (increment, title, priority, status, dates)
2. Has problem statement section
3. Has user stories section (at least 1 user story)
4. User stories follow "As a... I want... So that..." format
5. Has acceptance criteria (TC-0001 format)
6. Has success criteria section (KPIs defined)
7. Has constraints/assumptions section (if applicable)
8. Technology-agnostic (no framework/library mentions)

#### Plan.md (10 rules)
1. Has valid YAML frontmatter
2. Has architecture section (or references HLD)
3. References ADRs for key decisions (at least 1 ADR)
4. Has component breakdown section
5. Has data model section (entities, relationships)
6. Has API contracts section (if API feature)
7. Has tech stack section (justified choices)
8. Has security considerations section
9. Has error handling strategy section
10. Has performance considerations section (if applicable)

#### Tasks.md (5 rules)
1. Has valid YAML frontmatter (total_tasks, completed_tasks)
2. All tasks have unique IDs (T001, T002, etc.)
3. All tasks have descriptions
4. All tasks have priorities (P1, P2, P3)
5. All tasks have estimated time (hours or days)
6. Dependencies clearly marked (if applicable)

### Quality Rules (31 rules)

#### Spec.md Quality (12 rules)
1. Technology-agnostic (no "React", "FastAPI", "PostgreSQL")
2. User stories follow standard format
3. Acceptance criteria are testable (no vague "should work")
4. Success criteria are measurable (numbers, percentages)
5. Problem statement is clear and compelling (answers "why?")
6. User personas defined (who is this for?)
7. Value proposition clear (what benefit?)
8. Edge cases considered
9. Constraints documented
10. Assumptions documented
11. No jargon without explanation
12. Consistent terminology

#### Plan.md Quality (14 rules)
1. Technical details present (not abstract)
2. ADRs referenced exist in `.specweave/docs/internal/architecture/adr/`
3. Diagrams referenced exist
4. Component names follow naming conventions
5. API contracts include: method, path, request, response, errors
6. Data model includes: entities, attributes, relationships, constraints
7. Tech stack choices justified (not arbitrary)
8. Security considerations address: auth, encryption, input validation
9. Error handling defines: error types, user messages, logging, recovery
10. Performance targets specified (response time, throughput)
11. Scalability addressed (how to scale?)
12. Monitoring/observability mentioned
13. Deployment strategy defined
14. Rollback strategy defined (if breaking changes)

#### Tasks.md Quality (5 rules)
1. Tasks are actionable (start with verb: "Create", "Implement", "Test")
2. Estimates reasonable (< 1 day per task)
3. Priorities follow P1 (critical) → P2 (important) → P3 (nice-to-have)
4. Task descriptions clear (no ambiguity)
5. Dependencies valid (referenced tasks exist)

### Traceability Rules (19 rules)

#### TC-0001 Traceability (8 rules)
1. Format: TC-0001, TC-0002, etc. (4 digits, zero-padded)
2. Sequential numbering (no gaps: TC-0001, TC-0002, TC-0003)
3. No duplicates (each ID unique)
4. Every TC-0001 in spec.md appears in tests.md
5. Every TC-0001 in tests.md specifies test file location
6. Test file locations valid (files exist or will be created)
7. TC-0001 IDs in test file names match spec.md (e.g., `TC-0001: Valid Login`)
8. No orphaned TC-0001 IDs (in tests.md but not spec.md)

#### ADR Traceability (6 rules)
1. Every ADR referenced in plan.md exists in `.specweave/docs/internal/architecture/adr/`
2. ADR numbers sequential (0001, 0002, etc.)
3. ADR file names match format: `####-decision-title.md`
4. ADRs have valid frontmatter (number, title, status, date)
5. ADR status appropriate (proposed, accepted, deprecated, superseded)
6. If ADR superseded, references new ADR

#### Diagram Traceability (5 rules)
1. Every diagram referenced exists (or will be created)
2. Diagram files follow naming conventions (C4, sequence, ER, deployment)
3. Diagram locations correct (HLD → `architecture/diagrams/`, LLD → `architecture/diagrams/{module}/`)
4. Diagram syntax valid (Mermaid C4, sequenceDiagram, erDiagram)
5. Diagrams render correctly (validated by user)

---

## Risk Assessment Framework

### Security Risk Categories

#### 🔴 CRITICAL (Block implementation)
- No authentication/authorization (public data exposure)
- Passwords stored in plaintext
- SQL injection vulnerability (no input validation)
- No secrets management (hardcoded keys)
- No encryption for sensitive data (PII, PCI)

#### 🟡 HIGH (Fix before implementation)
- Missing CSRF protection
- No rate limiting (DoS risk)
- Missing input validation
- No security logging
- Missing threat model (for high-risk features)

#### 🟠 MEDIUM (Fix before release)
- No HTTPS enforcement
- Missing security headers
- No session timeout
- Missing audit trail
- Weak password policy

#### 🟢 LOW (Nice to have)
- No security training mentioned
- Missing security documentation
- No penetration testing plan

### Performance Risk Categories

#### 🔴 CRITICAL
- No database indexing (full table scans)
- N+1 query problem
- No pagination (loading all records)
- Synchronous blocking operations (no async)

#### 🟡 HIGH
- No caching strategy (frequent repeated queries)
- No CDN for static assets
- Missing query optimization
- No connection pooling

#### 🟠 MEDIUM
- No lazy loading (loading unnecessary data)
- Missing performance targets
- No load testing plan
- Missing monitoring/metrics

#### 🟢 LOW
- No performance budget
- Missing optimization plan
- No performance profiling

### Technical Debt Risk Categories

#### 🔴 CRITICAL
- Technical debt without justification (why?)
- No plan to address (when?)
- Quick hacks without ADR
- Breaking existing functionality

#### 🟡 HIGH
- Technical debt with justification but no timeline
- Deviating from standards without ADR
- Missing tests for new code
- Copy-paste code (DRY violation)

#### 🟠 MEDIUM
- Known limitations not documented
- Missing error handling
- No logging
- Hard-coded values (should be config)

#### 🟢 LOW
- Minor code quality issues
- Missing comments
- Non-critical refactoring needed

---

## User Experience Scenarios

### Scenario 1: Clean Documents (No Issues)

```
User: *saves plan.md*

🔍 Validating increment 0002-user-authentication...
✅ Quick validation passed (0 errors, 0 warnings)
✅ All consistency checks passed (47/47)
✅ All completeness checks passed (23/23)
✅ All quality checks passed (31/31)
✅ All traceability checks passed (19/19)

No issues found! Ready for implementation.
```

### Scenario 2: Minor Issues (Warnings Only)

```
User: *saves tasks.md*

🔍 Validating increment 0003-payment-processing...
⚠️ Quick validation found 2 warnings:
  - Task T015 exceeds size guideline (estimated 3 days, should be < 1 day)
  - Missing dependency link: T008 likely depends on T003

Recommendations:
1. Consider breaking down T015 into smaller tasks (T015a, T015b, T015c)
2. Add dependency marker: T008 → T003

These are warnings, not blockers. Fix when convenient.
```

### Scenario 3: Critical Issues (Errors Found)

```
User: *saves spec.md*

🔍 Validating increment 0004-reporting-dashboard...
❌ Quick validation found 3 errors, 5 warnings:

ERRORS:
  - Missing acceptance criteria for US-003
  - Inconsistency: spec.md mentions "real-time updates" but plan.md doesn't address it
  - Traceability broken: TC-0007 in spec.md not found in tests.md

WARNINGS:
  - Task T012 exceeds size guideline (5 days)
  - No security considerations in plan.md
  - Missing error handling strategy
  - No performance targets specified
  - ADR-0005 referenced but doesn't exist

🔬 Running deep analysis (increment-validator agent)...

⏳ Analyzing from multiple perspectives...
  ✅ PM perspective complete (found 2 issues)
  ✅ Architect perspective complete (found 4 issues)
  ✅ QA perspective complete (found 3 issues)
  ✅ Security perspective complete (found 5 issues)
  ✅ Risk assessment complete (3 critical, 5 high risks)

📋 Validation report generated:
.specweave/increments/0004-reporting-dashboard/reports/validation-report.md

🔴 CRITICAL ISSUES FOUND
Please review validation report before proceeding with implementation.

Action required:
1. Fix missing acceptance criteria for US-003 (spec.md:45)
2. Address "real-time updates" in plan.md or remove from spec.md (spec.md:67, plan.md)
3. Add test coverage for TC-0007 (tests.md:120)
4. Add security considerations section to plan.md
5. Create ADR-0005 or remove reference (plan.md:89)

Run `/validate-increment 0004` after fixes to re-validate.
```

---

## Slash Commands

### `/validate-increment ####`

**Purpose**: Manually trigger validation for specific increment

**Usage**:
```bash
/validate-increment 0002                    # Validate increment 0002
/validate-increment 0002 --deep             # Force deep analysis (skip quick check)
/validate-increment 0002 --report-only      # Show existing report, don't re-validate
/validate-increment 0002 --fix              # Start guided fix workflow
```

**Output**:
- Quick validation summary OR
- Deep validation report OR
- Existing validation report

### `/fix-increment ####`

**Purpose**: Guided workflow to fix validation issues

**Usage**:
```bash
/fix-increment 0004
```

**Workflow**:
1. Load validation report
2. Present issues one by one (highest severity first)
3. Suggest fixes for each issue
4. Apply fixes with user approval
5. Re-validate after all fixes
6. Generate updated validation report

**Example**:
```
🔧 Starting guided fix for increment 0004

Issue 1/8 (CRITICAL):
Missing acceptance criteria for US-003 (spec.md:45)

Suggested fix:
Add acceptance criteria to spec.md after line 45:

**Acceptance Criteria**:
- [ ] **TC-0007**: User can filter reports by date range
- [ ] **TC-0008**: User can export reports to CSV
- [ ] **TC-0009**: User can save custom filter presets

Apply this fix? [Yes/No/Skip]
```

---

## Configuration

### .specweave/config.yaml

```yaml
validation:
  enabled: true                             # Enable/disable validation
  auto_validate: true                       # Auto-validate on document save
  severity_threshold: warning               # warning | error (when to invoke agent)

  rules:
    consistency: true                       # Enable consistency checks
    completeness: true                      # Enable completeness checks
    quality: true                           # Enable quality checks
    traceability: true                      # Enable traceability checks
    risk_assessment: true                   # Enable risk assessment

  hooks:
    post_document_save: true                # Trigger on document save
    pre_implementation: true                # Validate before starting tasks

  reports:
    save_to: "reports/validation-report.md" # Report location (relative to increment)
    format: markdown                        # markdown | json | html
    include_line_numbers: true              # Include line numbers in findings
    include_suggestions: true               # Include fix suggestions

  agent:
    model: claude-sonnet-4-5-20250929       # Model for deep analysis
    perspectives:                           # Perspectives to analyze
      - pm
      - architect
      - qa
      - security
    max_analysis_time: 60                   # Max seconds for deep analysis
```

---

## Testing Strategy

### Skill Test Cases

**Location**: `src/skills/increment-validator/test-cases/`

#### test-1-detect-inconsistency.yaml
```yaml
---
name: "Detect Inconsistency Between Spec and Plan"
description: "Skill detects when spec.md mentions feature not addressed in plan.md"
input:
  increment_id: "test-001"
  files:
    spec.md: |
      # User Story US-001
      Real-time notifications via WebSocket
    plan.md: |
      # Architecture
      REST API implementation
expected_output:
  type: "validation_failed"
  errors:
    - "Inconsistency: spec.md mentions 'WebSocket' but plan.md uses REST API"
validation:
  - "Error detected correctly"
  - "Recommends adding WebSocket section to plan.md or creating ADR"
success_criteria:
  - "Skill identifies inconsistency"
  - "Invokes agent for deep analysis"
---
```

#### test-2-missing-sections.yaml
```yaml
---
name: "Detect Missing Sections"
description: "Skill detects missing required sections in plan.md"
input:
  increment_id: "test-002"
  files:
    plan.md: |
      # Architecture
      Component breakdown...
      # Data Model
      Entities...
expected_output:
  type: "validation_failed"
  errors:
    - "Missing section: Security Considerations"
    - "Missing section: Error Handling Strategy"
validation:
  - "Missing sections detected"
  - "Severity: ERROR (blocks implementation)"
success_criteria:
  - "Skill identifies all missing sections"
  - "Reports correct severity"
---
```

#### test-3-traceability-broken.yaml
```yaml
---
name: "Detect Broken Traceability"
description: "Skill detects TC-0001 in spec.md not covered in tests.md"
input:
  increment_id: "test-003"
  files:
    spec.md: |
      - [ ] **TC-0001**: Valid login
      - [ ] **TC-0002**: Invalid password
      - [ ] **TC-0003**: Account lockout
    tests.md: |
      | TC-0001 | Valid login | E2E | tests/e2e/login.spec.ts | P1 |
      | TC-0002 | Invalid password | E2E | tests/e2e/login.spec.ts | P1 |
expected_output:
  type: "validation_failed"
  errors:
    - "Missing test coverage: TC-0003 (Account lockout)"
validation:
  - "Missing TC-0003 detected"
  - "Recommends adding test case to tests.md"
success_criteria:
  - "Skill identifies missing TC-0003"
  - "Traceability check works correctly"
---
```

### Agent Test Cases

**Location**: `src/agents/increment-validator/test-cases/`

#### test-1-pm-validation.yaml
```yaml
---
name: "PM Perspective Validation"
description: "Agent validates business requirements quality from PM perspective"
input:
  increment_id: "test-004"
  spec.md: |
    # Problem
    Users need to do stuff.

    # User Stories
    As a user, I want features.
expected_output:
  type: "validation_report"
  findings:
    - severity: "CRITICAL"
      category: "pm"
      issue: "Problem statement too vague ('do stuff')"
    - severity: "CRITICAL"
      category: "pm"
      issue: "User story missing 'So that' (value proposition)"
    - severity: "HIGH"
      category: "pm"
      issue: "No acceptance criteria defined"
validation:
  - "PM perspective identifies vague requirements"
  - "Provides actionable recommendations"
success_criteria:
  - "All PM quality issues detected"
  - "Report includes specific line numbers"
  - "Recommendations are actionable"
---
```

#### test-2-architect-validation.yaml
```yaml
---
name: "Architect Perspective Validation"
description: "Agent validates technical design quality from Architect perspective"
input:
  increment_id: "test-005"
  plan.md: |
    # Architecture
    We'll use OAuth2.

    # Data Model
    User table with fields.
expected_output:
  type: "validation_report"
  findings:
    - severity: "CRITICAL"
      category: "architect"
      issue: "No ADR for OAuth2 decision"
    - severity: "CRITICAL"
      category: "architect"
      issue: "Data model incomplete (no entity attributes, relationships)"
    - severity: "HIGH"
      category: "architect"
      issue: "Missing security considerations for OAuth2"
validation:
  - "Architect perspective identifies missing ADRs"
  - "Identifies incomplete data model"
success_criteria:
  - "All architecture issues detected"
  - "Report suggests creating ADR"
  - "Recommends completing data model"
---
```

#### test-3-security-validation.yaml
```yaml
---
name: "Security Perspective Validation"
description: "Agent validates security considerations from Security perspective"
input:
  increment_id: "test-006"
  plan.md: |
    # OAuth2 Implementation
    Users authenticate with email/password.
    Store credentials in database.
expected_output:
  type: "validation_report"
  findings:
    - severity: "CRITICAL"
      category: "security"
      issue: "No password hashing mentioned (security violation)"
    - severity: "CRITICAL"
      category: "security"
      issue: "No rate limiting for authentication endpoint (brute force risk)"
    - severity: "HIGH"
      category: "security"
      issue: "Missing OWASP Top 10 considerations"
validation:
  - "Security perspective identifies critical security gaps"
  - "OWASP Top 10 checks performed"
success_criteria:
  - "All security issues detected"
  - "Report includes OWASP references"
  - "Severity correctly assessed as CRITICAL"
---
```

---

## Implementation Plan

### Phase 1: Hook + Skill (Quick Validation)

**Tasks**:
1. Create `.claude/hooks/post-document-save.sh`
2. Create `src/skills/increment-validator/`
   - SKILL.md
   - scripts/ (consistency, completeness, traceability, quality)
   - test-cases/ (3+ tests)
   - references/validation-rules.md
3. Install hook (symlink to .claude/hooks/)
4. Install skill to .claude/skills/
5. Test quick validation workflow

**Deliverables**:
- Hook triggers on spec/plan/tasks/tests.md save
- Skill runs quick validation (5-10s)
- Reports errors, warnings, info
- Decides if deep analysis needed

**Success Criteria**:
- Hook detects document changes correctly
- Skill validates all 120 rules
- Reports issues with correct severity
- No false positives

### Phase 2: Agent (Deep Analysis)

**Tasks**:
1. Create `src/agents/increment-validator/`
   - AGENT.md
   - templates/validation-report.md.template
   - test-cases/ (3+ tests)
   - references/ (validation-criteria.md, risk-assessment-guide.md)
2. Implement multi-perspective analysis (PM, Architect, QA, Security)
3. Implement risk assessment framework
4. Create validation report template
5. Install agent to .claude/agents/
6. Test deep analysis workflow

**Deliverables**:
- Agent performs multi-perspective analysis
- Generates detailed validation reports
- Identifies risks with severity levels
- Provides actionable recommendations

**Success Criteria**:
- All 4 perspectives implemented
- Risk assessment accurate
- Reports include line numbers
- Recommendations are actionable

### Phase 3: Commands + Integration

**Tasks**:
1. Create `/validate-increment` slash command
2. Create `/fix-increment` slash command (guided fix)
3. Add validation to `/create-increment` workflow
4. Update CLAUDE.md with validation documentation
5. Create user guides
6. Test end-to-end workflows

**Deliverables**:
- Manual validation command
- Guided fix workflow
- Auto-validation on increment creation
- Complete documentation

**Success Criteria**:
- Commands work as expected
- Guided fix helps users resolve issues
- Documentation complete
- All test cases pass

---

## Benefits

### For Users

1. **Catch issues early**: Before implementation (save hours of rework)
2. **Quality assurance**: Ensure specs are production-ready
3. **Consistency**: All increments follow same standards
4. **Actionable feedback**: Clear recommendations, not just complaints
5. **Fast feedback**: Quick validation (5-10s) for most cases
6. **Deep analysis**: Multi-perspective review when needed

### For SpecWeave Framework

1. **Maintain standards**: Ensure all increments meet quality bar
2. **Reduce rework**: Catch issues before implementation
3. **Improve traceability**: Ensure TC-0001 → tests → code linkage
4. **Risk management**: Identify security, performance, debt risks early
5. **Living documentation**: Ensure docs stay consistent and complete

---

## Related Documentation

- [Increment Lifecycle Management](../../../../../CLAUDE.md#increment-lifecycle-management) - Lifecycle and WIP limits
- [Testing Philosophy](../../../../../CLAUDE.md#testing-philosophy) - Test case levels and traceability
- [Development Workflow](../../../../../CLAUDE.md#development-workflow) - Greenfield and brownfield workflows

---

**Status**: Design Complete ✅
**Next Steps**: Implement Phase 1 (Hook + Skill)
