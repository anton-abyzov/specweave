## Increment Validation Workflow

**CRITICAL**: SpecWeave automatically validates increment documents (spec.md, plan.md, tasks.md, tests.md) to ensure consistency, completeness, quality, and traceability BEFORE implementation.

### Why Validation Matters

**Problems it prevents**:
- ❌ Spec mentions "real-time updates" but plan.md doesn't address it (inconsistency)
- ❌ Missing acceptance criteria for user stories (incompleteness)
- ❌ Spec contains technical details like "React" or "FastAPI" (quality issue)
- ❌ TC-0007 in spec.md but no test coverage in tests.md (traceability broken)
- ❌ Security considerations missing from plan.md (risk)

**Benefits**:
- ✅ Catch issues BEFORE implementation (save hours of rework)
- ✅ Ensure specs are production-ready
- ✅ Maintain consistency across all increments
- ✅ Reduce regression risk

### Architecture: Hybrid (Hook + Skill + Agent)

**Quick validation** (5-10s) runs automatically on document save → **Deep analysis** (30-60s) when issues detected

```
User saves spec.md/plan.md/tasks.md/tests.md
         ↓
.claude/hooks/post-document-save.sh (triggers)
         ↓
increment-validator skill (quick validation - 5-10s)
    - 47 consistency checks
    - 23 completeness checks
    - 31 quality checks
    - 19 traceability checks
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

### Validation Rules Overview

**120 validation rules** across 4 categories:

#### 1. Consistency Rules (47 rules)
- **User Story → Plan** (10 rules): Every user story in spec.md MUST have section in plan.md
- **Plan → Tasks** (12 rules): Every component in plan.md MUST have tasks in tasks.md
- **Spec → Tests** (15 rules): Every TC-0001 in spec.md MUST appear in tests.md
- **Cross-Document** (10 rules): Increment ID, priorities, dependencies consistent

#### 2. Completeness Rules (23 rules)
- **Spec.md** (8 rules): Frontmatter, problem statement, user stories, acceptance criteria, success criteria
- **Plan.md** (10 rules): Architecture, ADRs, components, data model, API contracts, security, error handling
- **Tasks.md** (5 rules): Task IDs, descriptions, priorities, estimates, dependencies

#### 3. Quality Rules (31 rules)
- **Spec.md** (12 rules): Technology-agnostic, testable acceptance criteria, measurable success criteria
- **Plan.md** (14 rules): Technical details, ADRs exist, security addressed, error handling defined
- **Tasks.md** (5 rules): Actionable tasks, reasonable estimates (< 1 day), valid dependencies

#### 4. Traceability Rules (19 rules)
- **TC-0001 IDs** (8 rules): Format TC-0001, sequential, every ID in spec.md appears in tests.md
- **ADR References** (6 rules): Referenced ADRs exist, sequential numbering, valid status
- **Diagram References** (5 rules): Diagrams exist, valid syntax, correct locations

**Complete rules**: See [INCREMENT-VALIDATION-DESIGN.md](.specweave/increments/0002-core-enhancements/reports/INCREMENT-VALIDATION-DESIGN.md)

### User Experience

#### Scenario 1: Clean Documents (No Issues)
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

#### Scenario 2: Minor Issues (Warnings)
```
User: *saves tasks.md*

🔍 Validating increment 0003-payment-processing...
⚠️ Quick validation found 2 warnings:
  - Task T015 exceeds size guideline (3 days, should be < 1 day)
  - Missing dependency link: T008 likely depends on T003

Recommendations:
1. Consider breaking down T015 into smaller tasks
2. Add dependency: T008 → T003

These are warnings, not blockers. Fix when convenient.
```

#### Scenario 3: Critical Issues (Errors)
```
User: *saves spec.md*

🔍 Validating increment 0004-reporting-dashboard...
❌ Quick validation found 3 errors, 5 warnings:

ERRORS:
  - Missing acceptance criteria for US-003 (spec.md:45)
  - Inconsistency: spec.md mentions "real-time updates" but plan.md doesn't address it
  - Traceability broken: TC-0007 in spec.md not in tests.md

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
2. Address "real-time updates" in plan.md or remove from spec.md
3. Add test coverage for TC-0007 (tests.md)
4. Add security considerations section to plan.md
5. Create ADR-0005 or remove reference (plan.md:89)

Validation runs automatically when you save documents. For manual quality assessment, ask Claude to "validate quality of increment 0004" to invoke the `increment-quality-judge` skill.
```

### How Validation Works

#### Automatic Validation (On Save)

**Rule-based validation runs automatically** when you save increment documents:
- Saves spec.md → Validates consistency, completeness, quality
- Saves plan.md → Validates HOW aligns with WHAT
- Saves tasks.md → Validates tasks match plan
- Saves tests.md → Validates test coverage for acceptance criteria

**No manual commands needed** - validation happens in the background.

#### Manual Quality Assessment

For deeper AI-powered quality assessment, **ask Claude**:

```
"Validate quality of increment 0002"
"Quality check for increment 0004"
"Assess spec quality for authentication feature"
```

This invokes the `increment-quality-judge` skill, which evaluates:
- Clarity of requirements
- Testability of acceptance criteria
- Completeness of edge cases
- Feasibility of technical approach
- Maintainability of design
- Architecture soundness

**Workflow for Fixing Issues**:
1. Review validation output (shown automatically on save)
2. Present issues one by one (highest severity first)
3. Suggest fixes for each issue
4. Apply fixes with user approval
5. Re-validate after all fixes

### Validation Report Format

**Generated at**: `.specweave/increments/####-name/reports/validation-report.md`

**Sections**:
1. **Executive Summary**: Overall assessment, critical issues count
2. **Detailed Findings**: Issues by severity (🔴 CRITICAL, 🟡 HIGH, 🟠 MEDIUM, 🟢 LOW)
3. **Consistency Analysis**: spec ↔ plan ↔ tasks alignment
4. **Completeness Analysis**: Missing sections
5. **Risk Assessment**: Security, performance, technical debt risks
6. **Action Items**: MUST FIX (before implementation), RECOMMENDED, NICE TO HAVE

**Example finding**:
```markdown
### 🔴 CRITICAL: Missing Security Considerations

**File**: plan.md
**Location**: Section "Authentication Flow"
**Severity**: ERROR

**Issue**:
Plan describes OAuth2 implementation but does NOT address:
- Token storage security (XSS prevention)
- CSRF protection
- Rate limiting for auth endpoints

**Recommendation**:
1. Add "Security Considerations" section to plan.md
2. Reference ADR-0004 (if created) or create new ADR
3. Address OWASP A01:2021 (Broken Access Control)

**See**: [OWASP Top 10](https://owasp.org/Top10/)
```

### Configuration

**File**: `.specweave/config.yaml`

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
    save_to: "reports/validation-report.md" # Report location
    format: markdown                        # markdown | json | html
    include_line_numbers: true              # Include line numbers in findings
    include_suggestions: true               # Include fix suggestions
```

### Components

**Hook**: `.claude/hooks/post-document-save.sh`
- Detects when spec.md, plan.md, tasks.md, tests.md saved
- Triggers `increment-validator` skill

**Skill**: `src/skills/increment-validator/` (installed to `.claude/skills/`)
- Runs quick validation (5-10s)
- Checks all 120 validation rules
- Invokes agent if errors > 0 OR warnings > 3

**Agent**: `src/agents/increment-validator/` (installed to `.claude/agents/`)
- Performs deep multi-perspective analysis (30-60s)
- PM, Architect, QA, Security perspectives
- Generates detailed validation reports
- Identifies risks with severity levels

### Related Documentation

- [INCREMENT-VALIDATION-DESIGN.md](.specweave/increments/0002-core-enhancements/reports/INCREMENT-VALIDATION-DESIGN.md) - Complete validation design
- [Test Case Strategy](https://github.com/anthropics/claude-code/blob/main/docs/testing.md) - Testing philosophy

---

