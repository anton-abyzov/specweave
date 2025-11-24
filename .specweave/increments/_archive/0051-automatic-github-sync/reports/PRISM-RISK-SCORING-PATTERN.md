# PRISM Risk Scoring Pattern

**Pattern Name**: PRISM (**PR**obability **I**mpact **S**coring **M**odel)
**Version**: 1.0
**Created**: 2025-11-23
**Replaces**: BMAD pattern (deprecated)
**Status**: Active

---

## 🎯 What is PRISM?

**PRISM** is a quantitative risk assessment framework that evaluates software risks using a **Probability × Impact** calculation to produce a standardized risk score (0-10 scale).

### Why "PRISM"?

The name **PRISM** was chosen for multiple reasons:

1. **Descriptive**: **PR**obability **I**mpact **S**coring **M**odel - clearly explains what it does
2. **Professional**: Sounds like an established framework, builds credibility
3. **Memorable**: Visual metaphor - light through a prism reveals the **spectrum of risks**
4. **Unique**: Avoids confusion with BMAD Method (Best, Most Appropriate, Design - technology decisions)

---

## 📐 The PRISM Formula

```
Risk Score = Probability × Impact

Where:
- Probability: 0.0 - 1.0 (likelihood of occurrence)
- Impact: 1 - 10 (severity if it occurs)
- Risk Score: 0.0 - 10.0 (final risk rating)
```

---

## 🎨 The Risk Spectrum (PRISM Metaphor)

Just like white light through a prism reveals a spectrum, PRISM reveals the full spectrum of software risks:

```
             PRISM Risk Spectrum
┌─────────────────────────────────────────────┐
│ 🟢 0.0-2.9  │ LOW       │ Acceptable       │
│ 🟡 3.0-5.9  │ MEDIUM    │ Monitor          │
│ 🟠 6.0-8.9  │ HIGH      │ Address Soon     │
│ 🔴 9.0-10.0 │ CRITICAL  │ Blocker (FAIL)   │
└─────────────────────────────────────────────┘
```

---

## 📊 Probability Scale (0.0-1.0)

| Range | Level | Description | Example |
|-------|-------|-------------|---------|
| **0.0-0.3** | **Low** | Unlikely to occur | Edge case in well-tested code |
| **0.4-0.6** | **Medium** | May occur | Known limitation, no mitigation yet |
| **0.7-1.0** | **High** | Likely to occur | Missing security validation |

### How to Assess Probability

**Consider**:
- Spec clarity (vague → high probability of misunderstanding)
- Past experience (similar issues before → high probability)
- Complexity (complex logic → higher probability of bugs)
- Test coverage (low coverage → higher probability of defects)

**Examples**:
- **0.2**: Password hashing is specified (bcrypt) but not unit tested → Low probability of failure
- **0.5**: Rate limiting mentioned but no implementation details → Medium probability of issues
- **0.9**: Spec says "store passwords" with no hashing mentioned → High probability of security breach

---

## 💥 Impact Scale (1-10)

| Range | Level | Description | Examples |
|-------|-------|-------------|----------|
| **1-3** | **Minor** | Cosmetic, no user impact | Typo in error message, UI spacing off |
| **4-6** | **Moderate** | Some impact, workaround exists | Slow query (but cacheable), session timeout |
| **7-9** | **Major** | Significant impact, no workaround | Data inconsistency, auth bypass, performance degradation |
| **10** | **Critical** | System failure, data loss, security breach | SQL injection, data loss, complete outage |

### How to Assess Impact

**Consider**:
- **User impact**: How many users affected? Can they work around it?
- **Data impact**: Data loss? Data corruption? Data exposure?
- **System impact**: Downtime? Performance degradation? Cascading failures?
- **Security impact**: OWASP Top 10? Compliance violation?

**Examples**:
- **3**: Slow page load (2s → 5s) → Minor (annoying but usable)
- **6**: Missing validation allows invalid data → Moderate (workaround: manual cleanup)
- **10**: Plain text password storage → Critical (security breach, compliance violation)

---

## 🔢 Risk Score Calculation

### Formula

```typescript
riskScore = probability × impact

// Example 1: Critical Risk
probability = 0.9  // Highly likely (no validation mentioned)
impact = 10        // Critical (plain text passwords)
riskScore = 0.9 × 10 = 9.0  // 🔴 CRITICAL

// Example 2: Medium Risk
probability = 0.4  // May occur (in-memory sessions)
impact = 6         // Moderate (session loss on restart)
riskScore = 0.4 × 6 = 2.4  // 🟢 LOW

// Example 3: High Risk
probability = 0.6  // Likely (no rate limiting)
impact = 10        // Critical (brute force vulnerability)
riskScore = 0.6 × 10 = 6.0  // 🟠 HIGH
```

---

## 🚦 Risk Severity Mapping

| Risk Score | Severity | Symbol | Action | Quality Gate |
|------------|----------|--------|--------|--------------|
| **9.0-10.0** | CRITICAL | 🔴 | **MUST FIX** before implementation | **FAIL** |
| **6.0-8.9** | HIGH | 🟠 | **SHOULD FIX** before release | **CONCERNS** |
| **3.0-5.9** | MEDIUM | 🟡 | Monitor, may address | **PASS** (with monitoring) |
| **0.0-2.9** | LOW | 🟢 | Acceptable, track | **PASS** |

---

## 📋 Risk Categories

PRISM evaluates risks across four categories:

### 1. Security Risks
- OWASP Top 10 vulnerabilities
- Authentication/authorization flaws
- Data exposure, encryption failures
- Injection vulnerabilities (SQL, XSS, etc.)

**Example**: Missing password hashing
- **Probability**: 0.9 (not mentioned in spec)
- **Impact**: 10 (CRITICAL security breach)
- **Score**: **9.0** (CRITICAL)

---

### 2. Technical Risks
- Architecture complexity
- Scalability bottlenecks
- Performance issues
- Technical debt

**Example**: In-memory sessions (no Redis)
- **Probability**: 0.4 (mentioned in plan)
- **Impact**: 6 (moderate, sessions lost on restart)
- **Score**: **2.4** (LOW)

---

### 3. Implementation Risks
- Tight timeline
- External dependencies
- Technical complexity
- Integration challenges

**Example**: Third-party API with no SLA
- **Probability**: 0.5 (may go down)
- **Impact**: 8 (major feature broken)
- **Score**: **4.0** (MEDIUM)

---

### 4. Operational Risks
- Lack of monitoring
- Difficult to maintain
- Poor documentation
- Unclear deployment process

**Example**: No logging/monitoring
- **Probability**: 0.3 (can add later)
- **Impact**: 7 (hard to debug issues)
- **Score**: **2.1** (LOW)

---

## 🎯 Quality Gate Decisions (PRISM-based)

### Decision Logic

```typescript
enum QualityGateDecision {
  PASS = "PASS",          // Ready for production
  CONCERNS = "CONCERNS",  // Issues found, should address
  FAIL = "FAIL"           // Blockers, must fix
}

// PRISM Thresholds
FAIL if:
  - Any risk score ≥ 9.0 (CRITICAL)
  - Overall risk score ≥ 9.0
  - Test coverage < 60%
  - Spec quality < 50

CONCERNS if:
  - Any risk score 6.0-8.9 (HIGH)
  - Overall risk score 6.0-8.9
  - Test coverage < 80%
  - Spec quality < 70

PASS otherwise
```

---

## 📝 PRISM Assessment Prompt

```markdown
You are evaluating SOFTWARE RISKS for an increment using PRISM's Probability × Impact scoring.

Read increment files:
- .specweave/increments/{id}/spec.md
- .specweave/increments/{id}/plan.md

For EACH risk you identify:

1. **Calculate PROBABILITY** (0.0-1.0)
   - Based on spec clarity, past experience, complexity
   - Low: 0.2, Medium: 0.5, High: 0.8

2. **Calculate IMPACT** (1-10)
   - 10 = Critical (security breach, data loss, system failure)
   - 7-9 = Major (significant user impact, no workaround)
   - 4-6 = Moderate (some impact, workaround exists)
   - 1-3 = Minor (cosmetic, no user impact)

3. **Calculate RISK SCORE** = Probability × Impact

4. **Provide MITIGATION** strategy

5. **Link to ACCEPTANCE CRITERIA** (if applicable)

Output format (JSON):
{
  "risks": [
    {
      "id": "RISK-001",
      "category": "security",
      "title": "Password storage not specified",
      "description": "Spec doesn't mention password hashing algorithm",
      "probability": 0.9,
      "impact": 10,
      "score": 9.0,
      "severity": "CRITICAL",
      "mitigation": "Use bcrypt or Argon2, never plain text",
      "location": "spec.md, Authentication section",
      "acceptance_criteria": "AC-US1-01"
    }
  ],
  "overall_risk_score": 7.5,
  "dimension_score": 0.35
}
```

---

## 🔄 Migration from BMAD

**Previous Name**: BMAD pattern (Probability × Impact)
**New Name**: PRISM pattern (Probability Impact Scoring Model)

**Why the change?**
1. **BMAD was confusing**: Conflicted with "BMAD Method" (Best, Most Appropriate, Design) for technology decisions
2. **PRISM is clearer**: Explicitly states it's a scoring model
3. **PRISM is professional**: Sounds like an established framework
4. **PRISM is memorable**: Visual metaphor (risk spectrum)

**What changed?**
- ✅ Name only: BMAD → PRISM
- ✅ All calculations remain the same
- ✅ All thresholds remain the same
- ✅ All documentation updated

**Backward compatibility**:
- All existing risk assessments valid (same formula)
- Quality gate decisions unchanged
- No code changes required

---

## 📊 Example: Full PRISM Assessment

### Increment: User Authentication Feature

**Risks Identified**:

#### 🔴 RISK-001: CRITICAL (9.0/10)
- **Category**: Security
- **Title**: Password storage implementation
- **Description**: Spec doesn't specify password hashing
- **Probability**: 0.9 (High) - Not mentioned in spec
- **Impact**: 10 (Critical) - Security breach, compliance violation
- **Score**: 0.9 × 10 = **9.0** (CRITICAL)
- **Mitigation**: Add "Use bcrypt/Argon2" to spec, create task for implementation
- **Location**: spec.md, Authentication section
- **AC**: AC-US1-01

#### 🟠 RISK-002: HIGH (6.0/10)
- **Category**: Security
- **Title**: Rate limiting not specified
- **Description**: No brute-force protection mentioned
- **Probability**: 0.6 (Medium) - Common oversight
- **Impact**: 10 (Critical) - Account takeover vulnerability
- **Score**: 0.6 × 10 = **6.0** (HIGH)
- **Mitigation**: Add rate limiting (5 failed attempts → 15 min lockout)
- **Location**: spec.md, Security section
- **AC**: AC-US1-03

#### 🟢 RISK-003: LOW (2.4/10)
- **Category**: Technical
- **Title**: Session storage scalability
- **Description**: Plan uses in-memory sessions
- **Probability**: 0.4 (Medium) - Will become issue at scale
- **Impact**: 6 (Moderate) - Sessions lost on restart
- **Score**: 0.4 × 6 = **2.4** (LOW)
- **Mitigation**: Plan migration to Redis before 10k users
- **Location**: plan.md, Architecture section
- **AC**: N/A (architecture decision)

**Overall Risk Score**: (9.0 + 6.0 + 2.4) / 3 = **5.8/10** (MEDIUM)

**Quality Gate Decision**: **🟡 CONCERNS**
- **Blocker**: RISK-001 (9.0) must be fixed
- **Concern**: RISK-002 (6.0) should be addressed
- **Monitor**: RISK-003 (2.4) acceptable for now

---

## ✅ Best Practices

### 1. Assess Risks Early
- Run PRISM assessment during spec review (before implementation)
- Catch security issues before code is written
- Fix critical risks immediately

### 2. Focus on High Impact
- A low-probability, high-impact risk (0.1 × 10 = 1.0) is still worth documenting
- Security risks almost always have impact = 10
- Data loss risks always have impact = 10

### 3. Provide Concrete Mitigations
- ❌ "Address security concerns" (vague)
- ✅ "Use bcrypt with cost factor 12 for password hashing" (specific)

### 4. Link to Acceptance Criteria
- Risks often indicate missing or vague ACs
- Update spec.md with specific security/performance ACs
- Create tasks to address high-priority risks

### 5. Re-assess During Implementation
- New risks may emerge during coding
- Update PRISM assessment if architecture changes
- Run final assessment before quality gate

---

## 🚫 What PRISM Cannot Do

**Limitations**:
- ❌ Cannot predict exact probability without historical data
- ❌ Cannot replace domain expertise (e.g., HIPAA compliance)
- ❌ Cannot verify technical feasibility with actual codebase
- ❌ Cannot replace human security audits

**What PRISM CAN do**:
- ✅ Systematically identify common risks
- ✅ Quantify risk severity consistently
- ✅ Flag missing security considerations (OWASP-based)
- ✅ Provide actionable mitigation strategies
- ✅ Support quality gate decisions

---

## 📚 Related Frameworks

**PRISM complements (not replaces)**:
- **OWASP Top 10**: Security vulnerability categories
- **STRIDE**: Threat modeling (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- **FMEA**: Failure Mode and Effects Analysis
- **Risk Matrix**: Traditional 5×5 matrix (PRISM uses continuous 0-10 scale)

**PRISM vs Traditional Risk Matrix**:

| Aspect | Traditional (5×5) | PRISM (0-10) |
|--------|------------------|--------------|
| **Granularity** | 25 buckets (5×5) | Continuous (0.0-10.0) |
| **Calculation** | Lookup table | Mathematical (P × I) |
| **Precision** | Low/Medium/High | Exact score (e.g., 6.3) |
| **Automation** | Manual | LLM-assisted |

---

## 🔧 Configuration

PRISM can be customized via `.specweave/config.json`:

```json
{
  "qa": {
    "prism": {
      "enabled": true,
      "thresholds": {
        "critical": 9.0,
        "high": 6.0,
        "medium": 3.0
      },
      "categories": ["security", "technical", "implementation", "operational"],
      "quality_gate": {
        "fail_on_critical": true,
        "fail_on_high": false,
        "concerns_on_high": true
      }
    }
  }
}
```

---

## 🎓 Summary

**PRISM** (**PR**obability **I**mpact **S**coring **M**odel) is a quantitative risk assessment framework that:

✅ Calculates risk scores using **Probability × Impact** (0-10 scale)
✅ Categorizes risks as **CRITICAL, HIGH, MEDIUM, LOW**
✅ Supports **quality gate decisions** (PASS/CONCERNS/FAIL)
✅ Provides **actionable mitigations** for identified risks
✅ Integrates with **SpecWeave Quality Judge v2.0**

**Use PRISM when**:
- Assessing spec quality before implementation
- Making quality gate decisions
- Prioritizing risk mitigation efforts
- Communicating risk to stakeholders

**Visual Metaphor**: Just as a prism reveals the spectrum of light, **PRISM reveals the spectrum of software risks** from low (green) to critical (red).

---

**Version**: 1.0
**Since**: v0.24.8 (replaces BMAD pattern)
**Related**: Quality Judge v2.0, `/specweave:qa` command
**Documentation**: This file is the canonical reference for PRISM pattern
