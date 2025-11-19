---
increment: 0038-serverless-architecture-intelligence
architecture_docs:
  - ../../docs/internal/architecture/system-design.md#serverless-architecture-intelligence
  - ../../docs/internal/architecture/adr/0038-serverless-platform-knowledge-base.md
  - ../../docs/internal/architecture/adr/0039-context-detection-strategy.md
  - ../../docs/internal/architecture/adr/0040-iac-template-engine.md
  - ../../docs/internal/architecture/adr/0041-cost-estimation-algorithm.md
  - ../../docs/internal/architecture/adr/0042-agent-enhancement-pattern.md
  - ../../docs/internal/architecture/diagrams/serverless-intelligence/
  - ../../docs/internal/architecture/data-models/serverless-platforms.json
---

# Implementation Plan: Serverless Architecture Intelligence

**Increment**: 0038-serverless-architecture-intelligence
**Status**: Planning
**Priority**: P1
**Target Release**: v0.22.0

---

## Architecture Overview

**Complete Architecture**: [System Design - Serverless Intelligence](../../docs/internal/architecture/system-design.md#serverless-architecture-intelligence)

**Key Architectural Decisions**:
- [ADR-0038: Serverless Platform Knowledge Base](../../docs/internal/architecture/adr/0038-serverless-platform-knowledge-base.md) - JSON-based platform data structure
- [ADR-0039: Context Detection Strategy](../../docs/internal/architecture/adr/0039-context-detection-strategy.md) - Pet project vs startup vs enterprise detection
- [ADR-0040: IaC Template Engine](../../docs/internal/architecture/adr/0040-iac-template-engine.md) - Handlebars-based Terraform generation
- [ADR-0041: Cost Estimation Algorithm](../../docs/internal/architecture/adr/0041-cost-estimation-algorithm.md) - Tier-based cost calculator
- [ADR-0042: Agent Enhancement Pattern](../../docs/internal/architecture/adr/0042-agent-enhancement-pattern.md) - Skill-based knowledge injection

**Architecture Diagrams**:
- [C4 Level 1: System Context](../../docs/internal/architecture/diagrams/serverless-intelligence/system-context.mmd)
- [C4 Level 2: Container Diagram](../../docs/internal/architecture/diagrams/serverless-intelligence/system-container.mmd)
- [C4 Level 3: Component Diagram](../../docs/internal/architecture/diagrams/serverless-intelligence/component-diagram.mmd)

**Data Model**:
- [Serverless Platform Schema](../../docs/internal/architecture/data-models/serverless-platforms.json)

---

## Technology Stack Summary

**Language**: TypeScript 5.x (see ADR-0042)
**Framework**: Node.js 20 LTS
**Template Engine**: Handlebars 4.x (see ADR-0040)
**Data Format**: JSON (see ADR-0038)
**IaC Target**: Terraform 1.5+
**Deployment**: Claude Code Plugin System

**Key Decisions**:
- Handlebars for template rendering (ADR-0040)
- JSON for platform knowledge base (ADR-0038)
- Heuristic-based context detection (ADR-0039)
- Tier-based cost calculation (ADR-0041)
- Skill-based architecture (ADR-0042)

---

## Implementation Phases

### Phase 1: Core Platform Awareness (P1) - 8-10 hours

**User Stories**: US-001, US-002, US-007

**Components to Build**:
1. **Platform Knowledge Base** (US-002)
   - Create JSON schema (`plugins/specweave/knowledge-base/serverless/schema.json`)
   - Create platform JSONs (AWS Lambda, Azure Functions, GCP, Firebase, Supabase)
   - Validation script (`scripts/validate-platforms.ts`)
   - GitHub Action for automated validation

2. **Context Detector** (US-001)
   - TypeScript module (`src/core/serverless/context-detector.ts`)
   - Keyword matcher (pet/startup/enterprise signals)
   - Metadata analyzer (team size, traffic, budget)
   - Confidence scoring algorithm
   - Unit tests (95%+ coverage)

3. **Serverless Recommender Skill** (US-001, US-007)
   - Skill YAML frontmatter + documentation
   - Platform ranking algorithm
   - Recommendation formatter (markdown output)
   - Integration with architect agent
   - E2E tests (recommendation flow)

**Deliverables**:
- Enhanced architect agent with serverless context detection
- Platform comparison knowledge base (5 platforms)
- Decision framework (pet project vs startup vs enterprise)

**Test Strategy**:
- Unit tests: Context detection logic (keyword matching, confidence scoring)
- Integration tests: Architect agent + serverless-recommender collaboration
- E2E tests: User asks serverless question → Receives recommendation → ADR created

---

### Phase 2: IaC Pattern Library (P1) - 10-12 hours

**User Stories**: US-005, US-008

**Components to Build**:
1. **Template Library** (US-005)
   - Handlebars templates for AWS Lambda (`plugins/specweave/templates/iac/aws-lambda/`)
     - `main.tf.hbs` (Lambda + API Gateway + DynamoDB)
     - `variables.tf.hbs` (input variables)
     - `outputs.tf.hbs` (output values)
     - `providers.tf.hbs` (AWS provider config)
     - `iam.tf.hbs` (IAM roles and policies)
   - Handlebars templates for Azure Functions
   - Handlebars templates for GCP Cloud Functions
   - Handlebars templates for Firebase
   - Handlebars templates for Supabase
   - Context-specific defaults (`defaults.json` per platform)
   - Environment configs (dev/staging/prod tfvars)

2. **Template Generator** (US-008)
   - TypeScript module (`src/core/iac/template-generator.ts`)
   - Handlebars compiler integration
   - Variable resolver (merge defaults + custom)
   - Tfvars generator (environment-specific)
   - README generator (deployment instructions)
   - File writer (output to infrastructure/)

3. **IaC Generator Skill** (US-008)
   - Skill YAML frontmatter + documentation
   - Integration with infrastructure agent
   - Template loading logic
   - E2E tests (generate + deploy)

**Deliverables**:
- Terraform templates for all 5 platforms
- Auto-generation logic in infrastructure agent
- Template validation and E2E testing

**Test Strategy**:
- Unit tests: Template rendering, variable substitution
- Integration tests: Infrastructure agent + IaC generator workflow
- E2E tests: Deploy templates to test AWS/Azure/GCP accounts (critical!)

---

### Phase 3: Cost Optimization (P1) - 6-8 hours

**User Stories**: US-003, US-006

**Components to Build**:
1. **Cost Estimator** (US-006)
   - TypeScript module (`src/core/serverless/cost-estimator.ts`)
   - Compute cost calculator (GB-seconds)
   - Request cost calculator (per 1M requests)
   - Data transfer cost calculator (per GB)
   - Free tier deduction logic
   - Startup credit runway calculator
   - Recommendation engine (cost optimization tips)

2. **Cost Estimator Skill** (US-006)
   - Skill YAML frontmatter + documentation
   - Integration with architect agent
   - Cost breakdown formatter
   - Unit tests (pricing calculations)

3. **Free Tier Intelligence** (US-003)
   - Free tier data in platform JSONs
   - Free tier checker logic
   - Free-tier-optimized template defaults
   - Warning system (approaching free tier limits)

**Deliverables**:
- Free tier configuration templates
- Startup credit tracking (AWS, Azure, GCP)
- Cost estimation models

**Test Strategy**:
- Unit tests: Cost calculation formulas (critical - must be accurate!)
- Unit tests: Free tier deduction logic
- Integration tests: Cost estimates shown in recommendations
- Comparison tests: Compare estimates to actual AWS bills (validation)

---

### Phase 4: Learning and Security (P2) - 8-10 hours

**User Stories**: US-004, US-010

**Components to Build**:
1. **Learning Path Recommender** (US-004)
   - Learning resources in platform JSONs (tutorials, docs)
   - Skill level detection (beginner/intermediate/advanced)
   - Learning path generator
   - Sample project links

2. **Security Guidance Skill** (US-010)
   - Skill YAML frontmatter + documentation
   - IAM best practices (least privilege)
   - Secrets management guidance (AWS Secrets Manager, Azure Key Vault)
   - HTTPS enforcement
   - Compliance checklist (SOC 2, HIPAA, GDPR)
   - Security templates (VPC, security groups)

3. **Migration Patterns** (US-009) - P3, deferred
   - Migration guides (Firebase → AWS, Supabase → Azure)
   - Data migration scripts
   - Rollback plans

**Deliverables**:
- Learning resources (documentation, tutorials)
- Security best practices (IAM, secrets management)
- Compliance guidance (SOC 2, HIPAA)

**Test Strategy**:
- Unit tests: Learning path selection logic
- Manual tests: Follow learning paths (validate accuracy)
- Security audit: Review IAM templates (ensure least privilege)

---

## File Structure (Exact Paths)

### Knowledge Base
```
plugins/specweave/knowledge-base/serverless/
├── platforms/
│   ├── aws-lambda.json
│   ├── azure-functions.json
│   ├── gcp-functions.json
│   ├── firebase.json
│   └── supabase.json
├── schema.json
└── README.md
```

### Templates
```
plugins/specweave/templates/iac/
├── aws-lambda/
│   ├── templates/
│   │   ├── main.tf.hbs
│   │   ├── variables.tf.hbs
│   │   ├── outputs.tf.hbs
│   │   ├── providers.tf.hbs
│   │   └── iam.tf.hbs
│   ├── defaults.json
│   └── schema.json
├── azure-functions/
│   ├── templates/
│   └── defaults.json
├── gcp-cloud-functions/
├── firebase/
└── supabase/
```

### Skills
```
plugins/specweave/skills/
├── serverless-recommender/
│   └── SKILL.md
├── serverless-iac-generator/
│   └── SKILL.md
├── serverless-cost-estimator/
│   └── SKILL.md
└── serverless-security/
    └── SKILL.md
```

### Core Logic (TypeScript)
```
src/core/serverless/
├── context-detector.ts
├── cost-estimator.ts
└── types.ts

src/core/iac/
├── template-generator.ts
└── handlebars-helpers.ts
```

### Tests
```
tests/unit/serverless/
├── context-detector.test.ts
├── cost-estimator.test.ts
└── template-generator.test.ts

tests/integration/serverless/
├── architect-recommender-collaboration.test.ts
└── infrastructure-iac-generation.test.ts

tests/e2e/serverless/
├── recommendation-flow.test.ts
└── iac-deployment.test.ts  # CRITICAL: Deploy to test accounts
```

### Documentation Updates
```
.specweave/docs/internal/architecture/
├── system-design.md (updated with serverless section)
├── adr/
│   ├── 0038-serverless-platform-knowledge-base.md
│   ├── 0039-context-detection-strategy.md
│   ├── 0040-iac-template-engine.md
│   ├── 0041-cost-estimation-algorithm.md
│   └── 0042-agent-enhancement-pattern.md
├── diagrams/serverless-intelligence/
│   ├── system-context.mmd
│   ├── system-container.mmd
│   └── component-diagram.mmd
└── data-models/
    └── serverless-platforms.json
```

---

## Integration Points

### Architect Agent Enhancement
**File**: `plugins/specweave/agents/architect/AGENT.md`

**Changes**:
- Add "Serverless Architecture" section (reference skills)
- Document collaboration with serverless-recommender skill
- Add ADR template for serverless decisions

**Size**: ~600 lines → ~700 lines (NO bloat, just references)

### Infrastructure Agent Enhancement
**File**: `plugins/specweave/agents/infrastructure/AGENT.md`

**Changes**:
- Add "IaC Generation for Serverless" section (reference skills)
- Document collaboration with serverless-iac-generator skill
- Add deployment workflow

**Size**: ~400 lines → ~450 lines (NO bloat, just references)

---

## Testing Strategy (Comprehensive)

### Unit Tests (95%+ Coverage)

**Context Detector**:
- Keyword matching (pet/startup/enterprise signals)
- Metadata analysis (team size, traffic, budget)
- Confidence scoring (high/medium/low)
- Clarifying question generation

**Cost Estimator**:
- Compute cost calculation (GB-seconds formula)
- Request cost calculation (per 1M requests)
- Data transfer cost calculation
- Free tier deduction logic
- Startup credit runway calculation
- Recommendation generation

**Template Generator**:
- Handlebars template rendering
- Variable substitution (defaults + custom)
- Tfvars generation (dev/staging/prod)
- README generation

### Integration Tests (90%+ Coverage)

**Architect Agent + Serverless Recommender**:
- User asks serverless question
- Skill activates and provides recommendation
- Architect agent creates ADR

**Infrastructure Agent + IaC Generator**:
- User requests Terraform generation
- Skill activates and loads templates
- Infrastructure agent writes files

**End-to-End Recommendation Flow**:
- User input → Context detection → Platform ranking → Cost estimate → Recommendation

### E2E Tests (80%+ Coverage - Critical Paths)

**Terraform Deployment** (CRITICAL):
- Generate AWS Lambda template
- Deploy to test AWS account
- Verify resources created (Lambda, API Gateway, DynamoDB)
- Test API endpoint
- Destroy infrastructure (cleanup)
- Repeat for Azure, GCP, Firebase, Supabase

**Cost Validation** (CRITICAL):
- Generate cost estimate for pet project
- Compare to actual AWS bill (must be within ±15%)
- Validate free tier deduction logic

**Full User Workflow**:
- User: "Should I use serverless for my pet project?"
- System: Recommends Firebase + cost estimate ($0/month)
- User: "Generate Terraform"
- System: Creates infrastructure/ directory with Terraform files
- User: Runs `terraform apply` → Deployment succeeds

---

## Risk Mitigation

### Risk 1: Platform Pricing Changes
**Mitigation**:
- Weekly GitHub Action checks provider docs
- `lastVerified` date in platform JSONs
- User warning if data > 30 days old

### Risk 2: Template Breakage (Provider API Changes)
**Mitigation**:
- E2E tests deploy to test accounts (CI pipeline)
- Terraform validation in tests
- Version lock templates to provider versions

### Risk 3: Misclassification (Context Detection)
**Mitigation**:
- Show confidence score (users can correct)
- Allow manual override
- Clarifying questions if confidence is low

### Risk 4: Inaccurate Cost Estimates
**Mitigation**:
- Unit tests validate formulas
- Comparison tests against actual bills
- Display caveat: "Estimate based on average usage"

---

## Success Metrics

**Adoption Metrics**:
- 60%+ of projects using serverless recommendations within 3 months
- 80%+ of serverless projects use auto-generated Terraform

**Quality Metrics**:
- 90%+ developer satisfaction with recommendations (survey)
- 95%+ generated Terraform configs deploy successfully without edits
- 40%+ cost savings for pet projects (free tier optimization)

**Technical Metrics**:
- Context detection: < 200ms
- Platform comparison: < 100ms
- IaC generation: < 2 seconds
- Cost estimation: < 500ms

---

## Rollout Plan

### Phase 1: Alpha (Internal - 1 week)
- Deploy to SpecWeave core team (2 developers)
- Test AWS Lambda + Firebase templates
- Gather feedback

### Phase 2: Beta (Limited Public - 2-3 weeks)
- Announce in GitHub Discussions
- Invite 20-30 early adopters
- Collect metrics (usage, satisfaction, bugs)

### Phase 3: General Availability
- Full release to all SpecWeave users
- Blog post: "Serverless Architecture Intelligence: From Idea to Deployment in 10 Minutes"
- Update documentation

---

## Documentation Requirements

**User-Facing** (Public):
- User Guide: "Serverless Deployment with SpecWeave"
- Platform Comparison: "AWS vs Azure vs GCP vs Firebase vs Supabase"
- IaC Tutorial: "Deploying with Generated Terraform"

**Developer-Facing** (Internal):
- Architecture Decision Records (5 ADRs - already created)
- IaC Template Structure Guide
- Platform Data Schema Documentation

**Maintenance** (Internal):
- Maintenance Guide: How to update pricing, free tier limits
- Testing Guide: How to run E2E tests with cloud accounts

---

## Related Documentation

**Living Specs**:
- [FS-038: Serverless Architecture Intelligence](../../docs/internal/specs/_features/FS-038/FEATURE.md)
- [US-001: Context-Aware Recommendations](../../docs/internal/specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
- [US-005: IaC Pattern Library](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
- [US-007: Architect Agent Enhancement](../../docs/internal/specs/specweave/FS-038/us-007-architect-agent-enhancement.md)
- [US-008: Infrastructure Agent IaC Generation](../../docs/internal/specs/specweave/FS-038/us-008-infrastructure-agent-iac-generation.md)

**Strategy**:
- [Serverless Intelligence - Product Strategy](../../docs/internal/strategy/serverless-intelligence/overview.md)

---

## Total Estimated Effort

**Phase 1**: 8-10 hours (Core Platform Awareness)
**Phase 2**: 10-12 hours (IaC Pattern Library)
**Phase 3**: 6-8 hours (Cost Optimization)
**Phase 4**: 8-10 hours (Learning and Security)

**Total**: 32-40 hours (4-5 weeks at 8 hours/week)

---

**Status**: Planning
**Next Steps**:
1. Review ADRs with team
2. Create tasks.md (breakdown by phase)
3. Set up test AWS/Azure/GCP accounts for E2E tests
4. Begin Phase 1 implementation
