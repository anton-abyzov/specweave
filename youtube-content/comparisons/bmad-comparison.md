# BMAD-METHOD vs SpecWeave: Detailed Comparison

## Overview

Both BMAD-METHOD and SpecWeave are frameworks for AI-assisted development, but they approach the problem from different angles and serve different use cases.

## What is BMAD-METHOD?

**BMAD** stands for **Business-Method-Agentic-Development**. It's an open-source framework that emphasizes:

- **Agentic Agile Development**: AI agents take on traditional agile roles
- **Two-Phase Workflow**: Distinct planning and development phases
- **Role-Based Collaboration**: Explicit roles (@pm, @architect, @dev, @qa, @po, @scrum)
- **QA-Driven Quality**: Strong focus on quality assurance with specialized commands

### Key Components

**Roles:**
- `@pm` (Product Manager) - Creates and manages PRDs (Product Requirement Documents)
- `@architect` - Designs system architecture
- `@dev` (Developer) - Implements features
- `@qa` (Quality Assurance) - Performs risk assessment and quality gates
- `@po` (Product Owner) - Reviews and accepts deliverables
- `@scrum` (Scrum Master) - Facilitates agile ceremonies

**QA Commands:**
- `*risk` - Risk assessment
- `*design` - Design review
- `*trace` - Traceability check
- `*review` - Code review
- `*gate` - Quality gate validation

**Workflow:**
1. Planning Phase: @pm creates PRD, @architect designs
2. Development Phase: @dev implements, @qa validates
3. Review Phase: @po accepts, @scrum manages sprint

## Side-by-Side Comparison

### 1. Philosophy

| Aspect | BMAD-METHOD | SpecWeave |
|--------|-------------|-----------|
| **Core Principle** | Agentic agile with role separation | Specification-first with auto-routing |
| **Source of Truth** | PRDs + Architecture Docs | Specifications + Living Documentation |
| **Role Model** | Explicit roles invoked by @commands | Skills activate automatically |
| **Methodology** | Agile/Scrum-centric | Methodology-agnostic |
| **Focus** | Process and collaboration | Specifications and context precision |

### 2. Project Structure

**BMAD-METHOD:**
```
project/
├── docs/
│   ├── prd/                  # Product Requirement Documents
│   │   ├── epic-001.md
│   │   └── story-001-001.md
│   ├── architecture/
│   │   └── system-design.md
│   └── qa/
│       ├── risk-assessment.md
│       └── test-plan.md
├── src/
└── .bmad/
    └── config.yaml
```

**SpecWeave:**
```
project/
├── specifications/
│   └── modules/              # Modular specs (WHAT/WHY)
│       ├── payments/
│       └── authentication/
├── .specweave/docs/
│   ├── architecture/         # HOW (built gradually)
│   └── decisions/            # ADRs
├── features/
│   └── 001-feature-name/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── context-manifest.yaml  # Context precision!
├── src/
└── .specweave/
    └── config.yaml
```

### 3. Context Management

| Aspect | BMAD-METHOD | SpecWeave |
|--------|-------------|-----------|
| **Context Loading** | Full context (load PRD + architecture + code) | Selective via manifests (70%+ reduction) |
| **Token Efficiency** | Standard (full loading) | Optimized (context manifests) |
| **Scalability** | Works for small-medium projects | Scales to enterprise (500+ page specs) |
| **Context Declaration** | Implicit | Explicit (context-manifest.yaml) |

**Example: Context for Payment Feature**

**BMAD Approach:**
```bash
# Load full PRD, full architecture, all code
@dev Implement payment processing based on PRD-005
```
Loads: ~50,000 tokens (entire PRD, all architecture, related code)

**SpecWeave Approach:**
```yaml
# context-manifest.yaml
spec_sections:
  - specifications/modules/payments/stripe/spec.md
  - specifications/modules/payments/shared/compliance.md
documentation:
  - .specweave/docs/architecture/payment-flow.md
max_context_tokens: 8000
```
Loads: ~7,500 tokens (only relevant sections)

**Reduction: 85%**

### 4. Workflow Comparison

**BMAD Workflow (Explicit Role Invocation):**
```
User: "@pm create PRD for user authentication"
→ @pm agent creates PRD-001-authentication.md

User: "@architect design authentication architecture"
→ @architect creates architecture/auth-design.md

User: "@qa *risk assess authentication"
→ @qa creates qa/auth-risk-assessment.md

User: "@dev implement authentication based on PRD-001"
→ @dev implements src/auth/

User: "@qa *review auth implementation"
→ @qa performs code review

User: "@qa *gate check authentication"
→ @qa validates quality gate

User: "@po accept authentication feature"
→ @po marks feature as accepted
```

**SpecWeave Workflow (Auto-Routing):**
```
User: "Plan user authentication feature"
→ feature-planner activates automatically
→ Creates features/001-user-auth/
  - spec.md
  - plan.md
  - tasks.md
  - context-manifest.yaml

User: "Implement authentication feature"
→ context-loader loads relevant specs (8k tokens)
→ developer implements src/auth/
→ qa-engineer generates tests
→ playwright-tester creates E2E tests

User: "Validate authentication"
→ Tests run automatically
→ Validation report generated
```

Notice: BMAD requires explicit role invocation. SpecWeave routes automatically.

### 5. Quality Assurance

**BMAD QA Commands:**
- `@qa *risk` - Identify risks (technical, business, security)
- `@qa *design` - Review design decisions
- `@qa *trace` - Check requirement traceability
- `@qa *review` - Code review
- `@qa *gate` - Quality gate validation

**SpecWeave QA:**
- `qa-engineer` skill - Generates comprehensive tests
- `playwright-tester` skill - Creates E2E tests (MANDATORY for UI)
- Closed-loop validation - Tests must tell truth
- Regression prevention - Brownfield analysis before changes

**Comparison:**

| Aspect | BMAD @qa | SpecWeave QA |
|--------|----------|--------------|
| **Risk Assessment** | Manual via `*risk` command | Automated via brownfield-analyzer |
| **Design Review** | Manual via `*design` command | ADRs + architect skill |
| **Traceability** | Manual via `*trace` command | Context manifests link specs to code |
| **Code Review** | Manual via `*review` command | Automated via developer skill validation |
| **Testing** | Test plan creation | Auto-generated + mandatory E2E |
| **Quality Gates** | Manual via `*gate` command | Automated via test validation |

### 6. Brownfield Support

| Aspect | BMAD-METHOD | SpecWeave |
|--------|-------------|-----------|
| **Existing Code Analysis** | Limited (create PRD from code) | Dedicated brownfield-analyzer skill |
| **Retroactive Specs** | Manual PRD creation | Auto-generated specs from code |
| **Regression Prevention** | Manual risk assessment | Automated regression tests + validation |
| **Modification Safety** | @qa *risk before changes | Pre-implementation hook + tests |
| **Documentation** | Create architecture docs | Generate complete specs + ADRs |

**Example: Brownfield Project Onboarding**

**BMAD Approach:**
```
User: "@pm analyze existing authentication system"
→ @pm creates PRD based on code analysis (manual)

User: "@qa *risk assess modifying authentication"
→ @qa identifies risks (manual review)

User: "@dev implement changes"
→ @dev modifies code (risk of regression)
```

**SpecWeave Approach:**
```
User: "Analyze existing authentication system"
→ brownfield-analyzer scans codebase
→ Generates specifications/modules/authentication/existing/
  - overview.md (complete behavior)
  - api-contracts.md (all endpoints)
  - data-model.md (database schema)
  - business-rules.md (validation logic)
  - constraints.md (what NOT to change)

User: "Create regression tests for current auth behavior"
→ playwright-tester generates E2E tests
→ Tests validate all current behavior
→ User reviews tests for completeness

User: "Implement OAuth without breaking existing auth"
→ pre-implementation hook verifies specs + tests exist
→ context-loader loads existing specs + new feature spec
→ developer implements with constraints
→ Regression tests run (must still pass)
→ New tests validate OAuth
```

### 7. Integration & Extensibility

**BMAD-METHOD:**
- Custom role definitions
- Integration with project management tools
- Sprint planning and tracking
- Velocity tracking

**SpecWeave:**
- Custom skills (domain-specific expertise)
- MCP server wrappers (jira-sync, github-sync, ado-sync)
- Context manifest extensions
- Hook system for automation

### 8. Learning Curve

| Aspect | BMAD-METHOD | SpecWeave |
|--------|-------------|-----------|
| **Initial Learning** | Steeper (learn roles, commands) | Moderate (understand specs, skills) |
| **Onboarding** | Must learn @role syntax | Skills activate automatically |
| **Daily Use** | Remember which role for which task | Natural language requests |
| **Mastery** | Understanding all QA commands | Creating custom skills, optimizing manifests |

### 9. Team Size & Structure

**BMAD-METHOD:**
- **Best for**: Teams with defined agile roles
- **Team size**: 5-50 people
- **Structure**: Requires role separation
- **Collaboration**: Explicit @role handoffs

**SpecWeave:**
- **Best for**: Solo to enterprise (any size)
- **Team size**: 1-1000+ people
- **Structure**: Flexible (adapts to team)
- **Collaboration**: Module ownership, context manifests

### 10. When to Choose Each

## Choose BMAD-METHOD if:

✅ You're running formal agile/scrum processes
✅ Your team has defined roles (PM, Architect, Dev, QA, PO)
✅ You want explicit role-based collaboration
✅ You need sprint planning and velocity tracking
✅ You prefer manual control over quality gates
✅ Your team is comfortable with @role syntax
✅ You're building small to medium projects
✅ You want strong QA focus with risk assessment

**Ideal for:**
- Agile development teams
- Organizations with waterfall → agile transitions
- Teams needing strict quality gates
- Projects with clear role separation

## Choose SpecWeave if:

✅ You need brownfield/legacy codebase support
✅ Context efficiency is critical (large codebases, 100k+ lines)
✅ You want automatic skill routing (no manual @commands)
✅ You prefer specification-first development
✅ You need 70%+ token reduction
✅ You're scaling from solo to enterprise
✅ You want living documentation with auto-updates
✅ You need test-validated features (mandatory E2E)
✅ You're methodology-agnostic (not tied to agile)
✅ You want regression prevention for brownfield

**Ideal for:**
- Solo developers and startups
- Legacy codebase transformation
- Large codebases (enterprise scale)
- Teams without formal agile structure
- Context-constrained AI usage
- Brownfield-first organizations

## Use Both Together

**BMAD + SpecWeave Integration:**

You can combine strengths of both:

1. **Use BMAD for team collaboration:**
   - @pm creates PRDs
   - @scrum manages sprints
   - @po reviews deliverables

2. **Use SpecWeave for implementation:**
   - SpecWeave specifications map to BMAD PRDs
   - Context manifests for efficient AI usage
   - Brownfield-analyzer for legacy code
   - E2E tests for validation

**Example Hybrid Workflow:**
```
1. @pm creates PRD (BMAD)
2. Convert PRD to SpecWeave specifications
3. Use feature-planner to create implementation plan (SpecWeave)
4. Load context via manifests (SpecWeave - 70% reduction)
5. @dev implements (BMAD) using developer skill (SpecWeave)
6. @qa *risk assesses (BMAD)
7. playwright-tester creates E2E tests (SpecWeave)
8. @qa *gate validates (BMAD) using test results (SpecWeave)
9. @po accepts (BMAD)
```

## Technical Comparison

### Context Management Example

**Scenario**: Large e-commerce codebase (200k lines, 500 files)

**BMAD Approach:**
```
User: "@dev implement shopping cart feature based on PRD-042"

AI loads:
- Full PRD-042 (~5,000 tokens)
- Related architecture docs (~10,000 tokens)
- Related code files (~30,000 tokens)
Total: ~45,000 tokens

Result: Works, but inefficient
```

**SpecWeave Approach:**
```yaml
# features/042-shopping-cart/context-manifest.yaml
spec_sections:
  - specifications/modules/shopping/cart/spec.md
  - specifications/modules/products/catalog.md#cart-integration
  - specifications/modules/payments/checkout.md#cart-validation

code:
  - src/shopping/cart.service.ts
  - src/products/product.model.ts
  - src/payments/checkout.validator.ts

max_context_tokens: 12000
```

```
User: "Implement shopping cart feature"

AI loads (via context-loader):
- Only specified spec sections (~4,000 tokens)
- Only specified code files (~7,000 tokens)
Total: ~11,000 tokens

Result: 75% reduction, faster, cheaper
```

### Brownfield Comparison Example

**Scenario**: Adding OAuth to existing auth system (10k lines of auth code)

**BMAD Approach:**
```
1. User: "@pm analyze existing auth and create PRD for OAuth"
   → Manual review and PRD creation

2. User: "@qa *risk assess modifying authentication"
   → Risk assessment report created manually

3. User: "@dev implement OAuth based on PRD-055"
   → Implementation proceeds
   → Risk of breaking existing auth (no automated tests)

4. User: "@qa *review OAuth implementation"
   → Manual code review

5. User: "@qa *gate check OAuth"
   → Manual quality gate validation
```

**SpecWeave Approach:**
```
1. User: "Analyze existing authentication system"
   → brownfield-analyzer automatically:
     - Scans auth codebase
     - Generates retroactive specs
     - Documents current behavior
     - Identifies constraints
     - Creates dependency graph

2. User: "Create regression tests for current auth"
   → playwright-tester generates E2E tests
   → Tests validate all current behavior
   → User confirms completeness

3. User: "Implement OAuth without breaking existing auth"
   → pre-implementation hook:
     - Verifies specs exist ✅
     - Verifies regression tests exist ✅
     - Runs regression tests (baseline) ✅
   → context-loader:
     - Loads existing auth specs
     - Loads OAuth feature spec
     - Loads constraints
   → developer implements with safety
   → Regression tests re-run automatically
   → Must still pass (no regressions allowed)

4. User: "Validate OAuth implementation"
   → All regression tests pass ✅
   → New OAuth tests pass ✅
   → Validation report generated
```

## Summary

### BMAD-METHOD Strengths
- ✅ Clear role separation
- ✅ Strong QA with *risk, *design, *trace commands
- ✅ Agile/scrum workflow integration
- ✅ Explicit control over quality gates
- ✅ Sprint planning and tracking

### BMAD-METHOD Limitations
- ❌ Limited brownfield support
- ❌ No context optimization (full loading)
- ❌ Requires manual role invocation
- ❌ Steeper learning curve (roles + commands)
- ❌ Agile-centric (less flexible)

### SpecWeave Strengths
- ✅ 70%+ context reduction (scalable to enterprise)
- ✅ Automatic skill routing (no manual @commands)
- ✅ Brownfield-ready (dedicated analyzer)
- ✅ Living documentation (auto-updates)
- ✅ Mandatory E2E testing (truth-telling)
- ✅ Regression prevention (hooks + tests)
- ✅ Methodology-agnostic (flexible)

### SpecWeave Limitations
- ❌ Less explicit role control
- ❌ Requires understanding of specifications
- ❌ Initial setup (context manifests)

## Recommendation

**For New Projects (Greenfield):**
- Small team + Agile → BMAD-METHOD
- Solo/large codebase → SpecWeave
- Enterprise scale → SpecWeave
- Need both? Use hybrid approach

**For Existing Projects (Brownfield):**
- Any size → **SpecWeave** (brownfield-analyzer is critical)
- Can add BMAD roles on top if desired

**For Enterprise:**
- Large codebases → **SpecWeave** (context precision essential)
- Formal processes → Add BMAD roles to SpecWeave

## Conclusion

Both frameworks solve real problems in AI-assisted development:

- **BMAD-METHOD** brings structure through roles and explicit commands
- **SpecWeave** brings efficiency through specifications and context precision

The best choice depends on:
- Team size and structure
- Codebase size (context constraints)
- Greenfield vs brownfield
- Methodology preference (agile vs flexible)
- Need for brownfield support

Many teams will benefit from **using both together**, leveraging BMAD's role-based collaboration with SpecWeave's context efficiency and brownfield capabilities.

---

**Last Updated**: 2025-01-26
**Related**: [SpecKit Comparison](speckit-comparison.md)
