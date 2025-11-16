# Tasks: Strategic Init & Project-Specific Architecture

**Increment**: 0037-project-specific-tasks
**Feature**: FS-037
**Total Tasks**: 85
**Estimated Effort**: 78-107 hours
**Test Coverage Target**: 95%+

---

## Task Overview

**Phase 0: Strategic Init** (45 tasks, 68-92 hours)
- Vision & Market Research: 8 tasks
- Compliance Detection: 10 tasks
- Team Recommendations: 8 tasks
- Repository Selection: 8 tasks
- Architecture Decisions: 8 tasks
- Init Flow: 3 tasks

**Phase 1-4: Copy-Based Sync** (25 tasks, 10-15 hours)
- SpecDistributor Enhancement: 5 tasks
- Three-Layer Sync: 8 tasks
- GitHub Integration: 5 tasks
- Code Validation: 4 tasks
- Migration: 3 tasks

**Testing & Documentation** (15 tasks)
- Unit Tests: 6 tasks
- Integration Tests: 4 tasks
- E2E Tests: 3 tasks
- Documentation: 2 tasks

---

## Legend

- **Priority**: P1 (critical) | P2 (important) | P3 (nice-to-have)
- **Model Hints**: ⚡ haiku | 🧠 sonnet | 💎 opus
- **Status**: [ ] incomplete | [x] complete
- **Effort**: Time estimate in hours
- **AC-ID**: Links to acceptance criteria in spec.md

---

# PHASE 0: STRATEGIC INIT (45 tasks)

## Module 1: Vision & Market Research Engine (8 tasks, 15-20 hours)

### T-001: 🧠 Create VisionAnalyzer base class and interfaces (P1)
**Effort**: 2h | **AC**: AC-US1-01, AC-US1-06

**Description**: Create TypeScript interfaces and base class for vision analysis.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (new)
- `src/init/research/types.ts` (new)

**Acceptance Criteria**:
- [ ] VisionInsights interface defined with all fields
- [ ] MarketCategory enum with 13+ categories
- [ ] Competitor interface defined
- [ ] VisionAnalyzer class with analyze() method signature
- [ ] Zod schemas for validation
- [ ] Unit tests with 90%+ coverage

**Implementation Notes**:
```typescript
interface VisionInsights {
  keywords: string[];
  market: MarketCategory;
  competitors: Competitor[];
  opportunityScore: number;
  viralPotential: boolean;
  followUpQuestions: Question[];
}
```

---

### T-002: 🧠 Implement keyword extraction using LLM (P1)
**Effort**: 3h | **AC**: AC-US1-01

**Description**: Integrate LLM API for keyword extraction from product vision.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (update)
- `src/utils/llm-client.ts` (new)

**Acceptance Criteria**:
- [ ] LLM prompt template for keyword extraction
- [ ] API client with retry logic and error handling
- [ ] Extract 5-10 domain-specific keywords
- [ ] Return structured JSON matching VisionInsights schema
- [ ] Cache results for 24 hours to reduce API calls
- [ ] Unit tests with mock LLM responses

**Implementation Notes**:
- Use existing LLM client pattern from bmad-method plugin
- Prompt: "Extract 5-10 key terms from: {vision}"

---

### T-003: 🧠 Implement market category detection (P1)
**Effort**: 2h | **AC**: AC-US1-02

**Description**: Classify product into market categories using LLM + rules.

**Files**:
- `src/init/research/MarketDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Support 13+ market categories (productivity-saas, healthcare, fintech, etc.)
- [ ] LLM-based classification with confidence score
- [ ] Fallback to keyword matching if LLM fails
- [ ] Return single best-fit category
- [ ] Unit tests with edge cases

**Implementation Notes**:
```typescript
type MarketCategory =
  | "productivity-saas" | "healthcare" | "fintech"
  | "e-commerce" | "education" | "gaming" | etc.
```

---

### T-004: ⚡ Implement competitor analysis (P2)
**Effort**: 2h | **AC**: AC-US1-03

**Description**: Identify 3-5 comparable products using LLM.

**Files**:
- `src/init/research/CompetitorAnalyzer.ts` (new)

**Acceptance Criteria**:
- [ ] LLM prompt finds 3-5 comparable products
- [ ] Extract name, URL, strengths, weaknesses for each
- [ ] Optional: Web search integration for accuracy
- [ ] Return Competitor[] array
- [ ] Unit tests with mock data

**Implementation Notes**:
- LLM prompt: "Find 3-5 products similar to: {vision}"
- Web search is optional (can use LLM knowledge)

---

### T-005: 🧠 Implement opportunity score calculator (P2)
**Effort**: 2h | **AC**: AC-US1-04

**Description**: Calculate market opportunity score (1-10) based on size vs competition.

**Files**:
- `src/init/research/OpportunityScorer.ts` (new)

**Acceptance Criteria**:
- [ ] Algorithm considers market size estimate
- [ ] Algorithm considers competition density
- [ ] Return score 1-10 with rationale
- [ ] Unit tests with various scenarios
- [ ] Edge case handling (unknown market, etc.)

**Implementation Notes**:
```typescript
score = (marketSize / 10) - (competitionDensity / 2)
// Clamp to 1-10 range
```

---

### T-006: ⚡ Implement adaptive follow-up questions (P1)
**Effort**: 2h | **AC**: AC-US1-05

**Description**: Generate context-aware follow-up questions based on vision.

**Files**:
- `src/init/research/QuestionGenerator.ts` (new)

**Acceptance Criteria**:
- [ ] Viral potential detected → Ask about scaling/growth
- [ ] Enterprise detected → Ask about compliance/security
- [ ] Consumer app → Ask about monetization/UX
- [ ] Return 2-3 adaptive questions max
- [ ] Unit tests for all scenarios

**Implementation Notes**:
- If viral → "Expected user growth in first 6 months?"
- If enterprise → "Will you handle sensitive data?"

---

### T-007: ⚡ Store vision insights in config (P1)
**Effort**: 1h | **AC**: AC-US1-06

**Description**: Persist VisionInsights to .specweave/config.json.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (update)
- `src/config/ConfigManager.ts` (update)

**Acceptance Criteria**:
- [ ] Save to config.research.vision
- [ ] Validate schema before saving
- [ ] Merge with existing config
- [ ] Unit tests verify persistence

---

### T-008: ⚡ Generate market research report (P2)
**Effort**: 2h | **AC**: AC-US1-08

**Description**: Save research findings to markdown report.

**Files**:
- `src/init/research/ReportGenerator.ts` (new)

**Acceptance Criteria**:
- [ ] Generate .specweave/reports/market-research.md
- [ ] Include vision, market, competitors, opportunity score
- [ ] Markdown formatting with tables
- [ ] Timestamp and metadata
- [ ] Unit tests verify file creation

---

## Module 2: Compliance Standards Detection (10 tasks, 15-20 hours)

### T-009: 🧠 Create ComplianceDetector with 30+ standards database (P1)
**Effort**: 3h | **AC**: AC-US2-01, AC-US2-09

**Description**: Build comprehensive compliance standards database.

**Files**:
- `src/init/compliance/ComplianceDetector.ts` (new)
- `src/init/compliance/standards-database.ts` (new)
- `src/init/compliance/types.ts` (new)

**Acceptance Criteria**:
- [ ] ComplianceStandard interface defined
- [ ] 30+ standards in database (HIPAA, GDPR, PCI-DSS, FedRAMP, etc.)
- [ ] Each standard has: id, name, dataTypes, regions, teamImpact, costImpact
- [ ] DataType enum with 10+ types
- [ ] Zod schema validation
- [ ] Unit tests verify all standards

**Implementation Notes**:
```typescript
interface ComplianceStandard {
  id: string;
  name: string;
  dataTypes: DataType[];
  regions: string[];
  teamImpact: TeamRequirement[];
  costImpact: string;
  certificationRequired: boolean;
  auditFrequency: string;
}
```

---

### T-010: ⚡ Implement healthcare compliance detection (P1)
**Effort**: 1h | **AC**: AC-US2-02

**Description**: Detect healthcare-specific standards (HIPAA, HITRUST, FDA 21 CFR Part 11, HL7 FHIR).

**Files**:
- `src/init/compliance/detectors/HealthcareDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect HIPAA if healthcare data + US region
- [ ] Detect HITRUST if healthcare data + US region
- [ ] Detect FDA 21 CFR Part 11 if medical devices
- [ ] Detect HL7 FHIR if healthcare interop mentioned
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-011: ⚡ Implement payment compliance detection (P1)
**Effort**: 1h | **AC**: AC-US2-03

**Description**: Detect payment-specific standards (PCI-DSS, PSD2, SOX).

**Files**:
- `src/init/compliance/detectors/PaymentDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect PCI-DSS if payment/credit card data
- [ ] Detect PSD2 if payment + EU region
- [ ] Detect SOX if public company + financial data
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-012: ⚡ Implement privacy compliance detection (P1)
**Effort**: 2h | **AC**: AC-US2-04

**Description**: Detect privacy standards (GDPR, CCPA, PIPEDA, LGPD).

**Files**:
- `src/init/compliance/detectors/PrivacyDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect GDPR if personal data + EU region
- [ ] Detect CCPA if personal data + California
- [ ] Detect PIPEDA if personal data + Canada
- [ ] Detect LGPD if personal data + Brazil
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-013: ⚡ Implement government compliance detection (P2)
**Effort**: 2h | **AC**: AC-US2-05

**Description**: Detect government standards (FedRAMP, FISMA, CMMC, ITAR).

**Files**:
- `src/init/compliance/detectors/GovernmentDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect FedRAMP if government cloud + US
- [ ] Detect FISMA if federal systems + US
- [ ] Detect CMMC if defense contracts + US-DOD
- [ ] Detect ITAR if defense exports + US
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-014: ⚡ Implement education compliance detection (P2)
**Effort**: 1h | **AC**: AC-US2-06

**Description**: Detect education standards (FERPA, COPPA).

**Files**:
- `src/init/compliance/detectors/EducationDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect FERPA if student records + US
- [ ] Detect COPPA if children data (<13 years) + US
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-015: ⚡ Implement financial compliance detection (P2)
**Effort**: 1h | **AC**: AC-US2-07

**Description**: Detect financial standards (GLBA, SOC2, ISO 27001).

**Files**:
- `src/init/compliance/detectors/FinancialDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect GLBA if financial services + US
- [ ] Detect SOC2 if SaaS + security focus
- [ ] Detect ISO 27001 if global security requirements
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-016: ⚡ Implement infrastructure compliance detection (P3)
**Effort**: 1h | **AC**: AC-US2-08

**Description**: Detect critical infrastructure standards (NERC CIP).

**Files**:
- `src/init/compliance/detectors/InfrastructureDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect NERC CIP if critical infrastructure + US
- [ ] Return ComplianceStandard[]
- [ ] Unit tests for all cases

---

### T-017: 🧠 Implement compliance requirements summary (P1)
**Effort**: 2h | **AC**: AC-US2-10

**Description**: Present clear summary of detected compliance requirements.

**Files**:
- `src/init/compliance/ComplianceSummary.ts` (new)

**Acceptance Criteria**:
- [ ] Group standards by category (healthcare, payment, privacy, etc.)
- [ ] Show team impact for each standard
- [ ] Show cost impact estimates
- [ ] Show certification requirements
- [ ] Allow user to confirm/reject before finalizing
- [ ] Unit tests verify formatting

---

### T-018: ⚡ Store compliance standards in config (P1)
**Effort**: 1h | **AC**: AC-US2-09

**Description**: Persist detected standards to config.

**Files**:
- `src/init/compliance/ComplianceDetector.ts` (update)

**Acceptance Criteria**:
- [ ] Save to config.research.compliance
- [ ] Include all detected standards with metadata
- [ ] Validate schema before saving
- [ ] Unit tests verify persistence

---

## Module 3: Ultra-Smart Team Detection (8 tasks, 10-15 hours)

### T-019: 🧠 Create TeamRecommender with team detection logic (P1)
**Effort**: 3h | **AC**: AC-US3-01, AC-US3-10

**Description**: Build intelligent team recommendation engine.

**Files**:
- `src/init/team/TeamRecommender.ts` (new)
- `src/init/team/types.ts` (new)

**Acceptance Criteria**:
- [ ] TeamRecommendation interface defined
- [ ] Core teams always included (backend, frontend, mobile)
- [ ] Compliance-driven team detection logic
- [ ] Serverless alternative recommendations
- [ ] Return TeamRecommendation[] with rationale
- [ ] Unit tests with various scenarios

**Implementation Notes**:
```typescript
interface TeamRecommendation {
  teamName: string;
  role: string;
  required: boolean;
  reason: string;
  size: string;
  skills: string[];
  serverlessAlternative?: ServerlessOption;
}
```

---

### T-020: ⚡ Implement HIPAA-driven team recommendations (P1)
**Effort**: 1h | **AC**: AC-US3-02

**Description**: Recommend auth team + data team if HIPAA detected.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] If HIPAA detected → Recommend auth-team (required)
- [ ] If HIPAA detected → Recommend data-team (required)
- [ ] Include team size, skills, rationale
- [ ] Unit tests verify HIPAA teams

---

### T-021: ⚡ Implement PCI-DSS team recommendations (P1)
**Effort**: 1h | **AC**: AC-US3-03

**Description**: Recommend isolated payments team OR Stripe integration.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] If PCI-DSS detected → Recommend payments-team OR Stripe
- [ ] Show cost tradeoff: $3.5K/month overhead vs 2.9% + $0.30/txn
- [ ] Include rationale for both options
- [ ] Unit tests verify PCI-DSS recommendations

---

### T-022: ⚡ Implement SOC2/ISO 27001 team recommendations (P1)
**Effort**: 1h | **AC**: AC-US3-04

**Description**: Recommend DevSecOps team + CISO if >15 people.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] If SOC2/ISO 27001 + >15 people → Recommend devsecops-team
- [ ] If SOC2/ISO 27001 + >15 people → Recommend CISO role
- [ ] Include team size, skills, rationale
- [ ] Unit tests verify SOC2 teams

---

### T-023: ⚡ Implement infrastructure team recommendations (P2)
**Effort**: 1h | **AC**: AC-US3-05, AC-US3-06, AC-US3-07

**Description**: Recommend platform, data, observability teams based on scale.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] If >5 microservices → Recommend platform-team
- [ ] If analytics/ML mentioned → Recommend data-team
- [ ] If >20 services → Recommend observability-team
- [ ] Include team size, skills, rationale
- [ ] Unit tests verify scale-based recommendations

---

### T-024: ⚡ Implement specialized service recommendations (P2)
**Effort**: 1h | **AC**: AC-US3-08

**Description**: Identify specialized services (payments, notifications, analytics).

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] Detect payment needs → Recommend payments service
- [ ] Detect notification needs → Recommend notification service
- [ ] Detect analytics needs → Recommend analytics service
- [ ] Include serverless alternatives where applicable
- [ ] Unit tests verify detection

---

### T-025: 🧠 Implement serverless cost savings calculator (P1)
**Effort**: 2h | **AC**: AC-US3-09, AC-US3-11

**Description**: Calculate potential cost savings from serverless alternatives.

**Files**:
- `src/init/team/ServerlessSavingsCalculator.ts` (new)

**Acceptance Criteria**:
- [ ] Auth → AWS Cognito: $185/month savings
- [ ] File uploads → S3 + Lambda: $480/month savings
- [ ] Image processing → Lambda/Cloudinary: $490/month savings
- [ ] Email → SendGrid/SES: $85/month savings
- [ ] Background jobs → Lambda: $280/month savings
- [ ] Total savings: $1,520/month
- [ ] Show tradeoffs for each option
- [ ] Unit tests verify calculations

**Implementation Notes**:
```typescript
interface ServerlessSavings {
  useCase: string;
  traditionalCost: number;
  serverlessCost: number;
  savings: number;
  service: string;
  tradeoffs: string[];
}
```

---

### T-026: ⚡ Store team recommendations in config (P1)
**Effort**: 1h | **AC**: AC-US3-10

**Description**: Persist team recommendations to config.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Acceptance Criteria**:
- [ ] Save to config.research.teams
- [ ] Include all recommendations with rationale
- [ ] Include serverless alternatives
- [ ] Validate schema before saving
- [ ] Unit tests verify persistence

---

## Module 4: Repository Batch Selection (8 tasks, 8-12 hours)

### T-027: 🧠 Create RepositorySelector with pattern matching (P1)
**Effort**: 2h | **AC**: AC-US4-01, AC-US4-02

**Description**: Build repository selection system with pattern-based filtering.

**Files**:
- `src/init/repo/RepositorySelector.ts` (new)
- `src/init/repo/types.ts` (new)

**Acceptance Criteria**:
- [ ] RepositorySelectionRule interface defined
- [ ] Support selection types: all, prefix, owner, keyword, combined, manual
- [ ] Detect multi-repo scenario (3+ repositories)
- [ ] Offer batch selection options
- [ ] Unit tests with mock repos

**Implementation Notes**:
```typescript
interface RepositorySelectionRule {
  type: "all" | "prefix" | "owner" | "keyword" | "combined" | "manual";
  pattern?: string;
  owner?: string;
  excludePatterns?: string[];
}
```

---

### T-028: 🧠 Implement GitHub API client for repo fetching (P1)
**Effort**: 2h | **AC**: AC-US4-04

**Description**: Integrate GitHub API to fetch user/org repositories.

**Files**:
- `src/init/repo/GitHubAPIClient.ts` (new)

**Acceptance Criteria**:
- [ ] Fetch all repos for user/org (handle pagination)
- [ ] Extract repo metadata (name, url, owner, language, stars, lastUpdated)
- [ ] Handle authentication (GitHub token from env)
- [ ] Rate limiting with exponential backoff
- [ ] Fallback to local git remote parsing if API fails
- [ ] Unit tests with mocked API responses

---

### T-029: ⚡ Implement prefix-based selection (P1)
**Effort**: 1h | **AC**: AC-US4-03

**Description**: Filter repositories by prefix pattern.

**Files**:
- `src/init/repo/PatternMatcher.ts` (new)

**Acceptance Criteria**:
- [ ] User enters prefix (e.g., "ec-")
- [ ] Filter repos where name starts with prefix
- [ ] Return matching repos
- [ ] Unit tests verify filtering

---

### T-030: ⚡ Implement owner/org-based selection (P1)
**Effort**: 1h | **AC**: AC-US4-04

**Description**: Select all repos from GitHub org/owner.

**Files**:
- `src/init/repo/RepositorySelector.ts` (update)

**Acceptance Criteria**:
- [ ] User enters org/owner name
- [ ] Fetch all repos from that org/owner
- [ ] Return all repos
- [ ] Unit tests verify selection

---

### T-031: ⚡ Implement keyword-based selection (P2)
**Effort**: 1h | **AC**: AC-US4-05

**Description**: Filter repositories by keyword in name.

**Files**:
- `src/init/repo/PatternMatcher.ts` (update)

**Acceptance Criteria**:
- [ ] User enters keyword (e.g., "service")
- [ ] Filter repos where name contains keyword
- [ ] Return matching repos
- [ ] Unit tests verify filtering

---

### T-032: ⚡ Implement combined rule selection (P2)
**Effort**: 1h | **AC**: AC-US4-06

**Description**: Support combining multiple filters (prefix + owner, etc.).

**Files**:
- `src/init/repo/RepositorySelector.ts` (update)

**Acceptance Criteria**:
- [ ] Support combining prefix + owner filters
- [ ] Support combining keyword + owner filters
- [ ] Apply filters sequentially
- [ ] Return matching repos
- [ ] Unit tests verify combined filtering

---

### T-033: ⚡ Implement repository preview and exclusions (P1)
**Effort**: 1h | **AC**: AC-US4-07, AC-US4-08

**Description**: Show preview of selected repos and allow manual exclusions.

**Files**:
- `src/init/repo/RepositorySelector.ts` (update)

**Acceptance Criteria**:
- [ ] Display count + list of selected repos
- [ ] Show metadata (language, stars, last updated)
- [ ] Allow user to exclude repos by pattern
- [ ] Re-filter after exclusions
- [ ] Unit tests verify preview and exclusions

---

### T-034: ⚡ Implement adaptive UX for repo selection (P1)
**Effort**: 1h | **AC**: AC-US4-10, AC-US4-11

**Description**: Suggest best selection method based on repo count.

**Files**:
- `src/init/repo/RepositorySelector.ts` (update)

**Acceptance Criteria**:
- [ ] 3-5 repos → Suggest "All repos"
- [ ] 10-20 repos → Suggest "Pattern-based"
- [ ] 50+ repos → Recommend "Pattern-based" strongly
- [ ] Always allow manual selection fallback
- [ ] Unit tests verify adaptive suggestions

---

## Module 5: Architecture Decision Engine (8 tasks, 15-20 hours)

### T-035: 💎 Create ArchitectureDecisionEngine with decision tree (P1)
**Effort**: 4h | **AC**: AC-US5-01, AC-US5-10

**Description**: Build architecture recommendation engine with decision logic.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (new)
- `src/init/architecture/types.ts` (new)

**Acceptance Criteria**:
- [ ] ArchitectureRecommendation interface defined
- [ ] Decision tree logic (viral+bootstrapped→serverless, HIPAA→traditional, etc.)
- [ ] Support 6+ architecture types (serverless, traditional, microservices, etc.)
- [ ] Return recommendation with rationale
- [ ] Unit tests for all decision paths

**Implementation Notes**:
```typescript
type ArchitectureType =
  | "serverless" | "traditional-monolith" | "microservices"
  | "modular-monolith" | "jamstack" | "hybrid";

interface ArchitectureRecommendation {
  architecture: ArchitectureType;
  infrastructure: string[];
  rationale: string;
  costEstimate: CostEstimate;
  cloudCredits: CloudCredit[];
  projects: ProjectDefinition[];
}
```

---

### T-036: 🧠 Implement serverless recommendation logic (P1)
**Effort**: 2h | **AC**: AC-US5-02

**Description**: Recommend serverless for viral + bootstrapped scenarios.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Acceptance Criteria**:
- [ ] If viral potential + bootstrapped budget → Recommend serverless
- [ ] Infrastructure: AWS Lambda, Supabase, Vercel, S3, CloudFront
- [ ] Rationale explains instant scaling + pay-per-use
- [ ] Cost estimate: $10/month → $850/month at 10K users
- [ ] Unit tests verify serverless recommendation

---

### T-037: 🧠 Implement compliance-driven architecture logic (P1)
**Effort**: 2h | **AC**: AC-US5-03

**Description**: Recommend traditional + compliance for HIPAA/PCI scenarios.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Acceptance Criteria**:
- [ ] If HIPAA/PCI detected → Recommend traditional-monolith
- [ ] Infrastructure: AWS ECS, RDS encrypted, CloudTrail, WAF, VPC
- [ ] Rationale explains BAA, audit logs, compliance controls
- [ ] Cost estimate: $3K/month minimum (compliance overhead)
- [ ] Unit tests verify compliance architecture

---

### T-038: ⚡ Implement learning project recommendation (P1)
**Effort**: 1h | **AC**: AC-US5-04

**Description**: Recommend YAGNI + free tier for learning projects.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Acceptance Criteria**:
- [ ] If budget = "learning" → Recommend modular-monolith + free tier
- [ ] Infrastructure: Vercel, Supabase, Cloudflare Pages
- [ ] Rationale explains simplicity + zero cost
- [ ] Cost estimate: $0/month (free tier)
- [ ] Unit tests verify learning project recommendation

---

### T-039: ⚡ Implement infrastructure recommendations (P1)
**Effort**: 2h | **AC**: AC-US5-05

**Description**: Select cloud infrastructure based on architecture type.

**Files**:
- `src/init/architecture/InfrastructureSelector.ts` (new)

**Acceptance Criteria**:
- [ ] Serverless → AWS Lambda, Vercel, Supabase
- [ ] Traditional → AWS ECS/EKS, RDS, ElastiCache
- [ ] Microservices → Kubernetes, API Gateway, service mesh
- [ ] Return infrastructure array with rationale
- [ ] Unit tests for all architecture types

---

### T-040: 🧠 Implement cost estimation calculator (P2)
**Effort**: 2h | **AC**: AC-US5-06

**Description**: Calculate cost estimates at different user scales.

**Files**:
- `src/init/architecture/CostEstimator.ts` (new)

**Acceptance Criteria**:
- [ ] Calculate cost at 1K, 10K, 100K, 1M users
- [ ] Consider architecture type (serverless vs traditional)
- [ ] Consider compliance overhead
- [ ] Return CostEstimate object
- [ ] Unit tests verify calculations

**Implementation Notes**:
```typescript
interface CostEstimate {
  at1K: string;    // "$10/month"
  at10K: string;   // "$250/month"
  at100K: string;  // "$850/month"
  at1M: string;    // "$5K/month"
}
```

---

### T-041: ⚡ Implement cloud credits database (P2)
**Effort**: 1h | **AC**: AC-US5-07

**Description**: Provide cloud credits information (AWS Activate, Azure, GCP).

**Files**:
- `src/init/architecture/CloudCreditsDatabase.ts` (new)

**Acceptance Criteria**:
- [ ] AWS Activate tiers ($1K, $5K, $100K, 12 months)
- [ ] Azure for Startups ($1K, $100K, 90-180 days)
- [ ] GCP Cloud ($2K, $100K, $350K, 24 months)
- [ ] Return CloudCredit[] array
- [ ] Unit tests verify all tiers

---

### T-042: 🧠 Implement project generation from architecture (P1)
**Effort**: 2h | **AC**: AC-US5-11

**Description**: Generate projects list based on architecture type.

**Files**:
- `src/init/architecture/ProjectGenerator.ts` (new)

**Acceptance Criteria**:
- [ ] Serverless → ["frontend", "backend-functions", "api-gateway"]
- [ ] Traditional → ["backend", "frontend"]
- [ ] Microservices → ["api-gateway", "auth-service", "user-service", etc.]
- [ ] HIPAA → Add ["auth-service", "data-service", "audit-logs"]
- [ ] Return ProjectDefinition[] array
- [ ] Unit tests for all architecture types

---

## Module 6: Init Flow Orchestration (3 tasks, 5-10 hours)

### T-043: 🧠 Enhance InitFlow with 6-phase research flow (P1)
**Effort**: 4h | **AC**: AC-US5-01, AC-US5-09

**Description**: Orchestrate full strategic init flow with all research phases.

**Files**:
- `src/init/InitFlow.ts` (major update)

**Acceptance Criteria**:
- [ ] Phase 1: Vision & Market Research
- [ ] Phase 2: Scaling & Performance Goals
- [ ] Phase 3: Data & Compliance Detection
- [ ] Phase 4: Budget & Cloud Credits
- [ ] Phase 5: Methodology & Organization
- [ ] Phase 6: Repository Selection (if multi-repo)
- [ ] Present final architecture recommendation
- [ ] Allow user to accept/reject/modify
- [ ] Save all insights to config
- [ ] Integration tests verify full flow

**Implementation Notes**:
- Progressive disclosure: 2-3 questions per phase max
- User-friendly language (no jargon)
- Adaptive questions based on responses

---

### T-044: ⚡ Implement methodology selection (P1)
**Effort**: 1h | **AC**: AC-US5-12

**Description**: Support both Agile and Waterfall methodologies.

**Files**:
- `src/init/InitFlow.ts` (update)

**Acceptance Criteria**:
- [ ] Ask user: "Agile or Waterfall?"
- [ ] Explain: Increments = Sprints (Agile) OR Phases (Waterfall)
- [ ] Save to config.research.methodology
- [ ] Unit tests verify both options

---

### T-045: ⚡ Implement architecture presentation UI (P1)
**Effort**: 2h | **AC**: AC-US5-08, AC-US5-09

**Description**: Present architecture recommendation with clear rationale.

**Files**:
- `src/init/ArchitecturePresenter.ts` (new)

**Acceptance Criteria**:
- [ ] Show architecture type with rationale
- [ ] Show infrastructure components
- [ ] Show cost estimates at different scales
- [ ] Show cloud credits information
- [ ] Show generated projects list
- [ ] Allow user to accept/reject/modify
- [ ] Unit tests verify presentation

---

# PHASE 1-4: COPY-BASED SYNC (25 tasks)

## Module 7: SpecDistributor Enhancement (5 tasks, 3-4 hours)

### T-046: 🧠 Add copyAcsAndTasksToUserStories method to SpecDistributor (P1)
**Effort**: 2h | **AC**: AC-US6-01, AC-US6-02

**Description**: Enhance SpecDistributor to copy ACs and Tasks into User Story files.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Acceptance Criteria**:
- [ ] Read increment spec.md (source of truth for ACs)
- [ ] Read increment tasks.md (source of truth for Tasks)
- [ ] Group ACs by User Story ID
- [ ] Filter ACs by project keywords (backend, frontend, mobile)
- [ ] Filter Tasks by AC-ID
- [ ] Write ACs to User Story ## Acceptance Criteria section
- [ ] Write Tasks to User Story ## Implementation section
- [ ] Unit tests with 95%+ coverage

**Implementation Notes**:
```typescript
async copyAcsAndTasksToUserStories(increment: Increment): Promise<void> {
  // 1. Read increment spec.md and tasks.md
  // 2. Group ACs by User Story ID
  // 3. For each User Story:
  //    - Detect projects from ACs
  //    - Filter ACs by project keywords
  //    - Filter Tasks by AC-ID
  //    - Update User Story file with COPIED content
}
```

---

### T-047: ⚡ Implement project detection from ACs (P1)
**Effort**: 1h | **AC**: AC-US6-06

**Description**: Detect project (backend/frontend/mobile) from AC descriptions.

**Files**:
- `src/core/living-docs/ProjectDetector.ts` (new)

**Acceptance Criteria**:
- [ ] Detect "backend" from keywords: backend, api, server, database
- [ ] Detect "frontend" from keywords: frontend, ui, component, form
- [ ] Detect "mobile" from keywords: mobile, ios, android, app
- [ ] Return project array (can be multiple)
- [ ] Unit tests with edge cases

---

### T-048: ⚡ Implement AC filtering by project (P1)
**Effort**: 30m | **AC**: AC-US6-05

**Description**: Filter ACs by project keywords.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Acceptance Criteria**:
- [ ] Filter ACs where description contains project keyword
- [ ] OR filter ACs where tags include project
- [ ] Return filtered AC list
- [ ] Unit tests verify filtering

---

### T-049: ⚡ Implement Task filtering by AC-ID (P1)
**Effort**: 30m | **AC**: AC-US6-05

**Description**: Filter Tasks by AC-ID references.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Acceptance Criteria**:
- [ ] Extract AC-IDs from AC list
- [ ] Filter Tasks where task.acId matches AC-ID
- [ ] Return filtered Task list
- [ ] Unit tests verify filtering

---

### T-050: ⚡ Implement User Story file update with ACs and Tasks (P1)
**Effort**: 1h | **AC**: AC-US6-03, AC-US6-04, AC-US6-07

**Description**: Update User Story files with COPIED ACs and Tasks sections.

**Files**:
- `src/core/living-docs/UserStoryUpdater.ts` (new)

**Acceptance Criteria**:
- [ ] Replace ## Acceptance Criteria section with copied ACs
- [ ] Replace ## Implementation section with copied Tasks
- [ ] Preserve checkbox status ([ ] vs [x])
- [ ] Add note: "Task status syncs with increment tasks.md"
- [ ] Handle missing sections (insert if not exist)
- [ ] Unit tests verify updates

---

## Module 8: Three-Layer Bidirectional Sync (8 tasks, 4-5 hours)

### T-051: 🧠 Create ThreeLayerSyncManager (P1)
**Effort**: 2h | **AC**: AC-US7-01, AC-US7-02, AC-US7-03

**Description**: Build three-layer sync manager for bidirectional sync.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (new)
- `plugins/specweave-github/lib/types.ts` (update)

**Acceptance Criteria**:
- [ ] Define three layers: GitHub Issue, Living Docs User Story, Increment
- [ ] Implement sync flow 1: GitHub → Living Docs → Increment
- [ ] Implement sync flow 2: Increment → Living Docs → GitHub
- [ ] Handle checkbox state changes
- [ ] Unit tests with 95%+ coverage

**Implementation Notes**:
```typescript
// Layer 1: GitHub Issue (stakeholder UI)
// Layer 2: Living Docs User Story (intermediate)
// Layer 3: Increment spec.md + tasks.md (source of truth)
```

---

### T-052: 🧠 Implement GitHub → Living Docs → Increment sync (P1)
**Effort**: 1h | **AC**: AC-US7-04, AC-US7-05, AC-US7-06, AC-US7-07

**Description**: Sync checkbox changes from GitHub to Increment.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (update)

**Acceptance Criteria**:
- [ ] Detect checkbox changes in GitHub issue (ACs and Subtasks)
- [ ] Update Living Docs User Story first (both AC and Implementation sections)
- [ ] Update Increment last (spec.md for ACs, tasks.md for Tasks)
- [ ] Preserve source of truth discipline
- [ ] Unit tests verify sync flow

---

### T-053: 🧠 Implement Increment → Living Docs → GitHub sync (P1)
**Effort**: 1h | **AC**: AC-US7-08, AC-US7-09, AC-US7-10, AC-US7-11

**Description**: Sync changes from Increment to GitHub.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (update)

**Acceptance Criteria**:
- [ ] Detect changes in increment (spec.md and tasks.md)
- [ ] Update Living Docs User Stories first
- [ ] Update GitHub issues last
- [ ] Handle multiple User Stories per increment
- [ ] Unit tests verify sync flow

---

### T-054: 🧠 Implement code validation checker (P1)
**Effort**: 2h | **AC**: AC-US7-12, AC-US7-13

**Description**: Validate that code exists for completed tasks.

**Files**:
- `plugins/specweave-github/lib/CodeValidator.ts` (new)

**Acceptance Criteria**:
- [ ] Parse task description to extract file paths
- [ ] Check if files exist on filesystem
- [ ] Check if files have meaningful content (not empty)
- [ ] Return boolean (code exists or not)
- [ ] Unit tests with mock filesystem

**Implementation Notes**:
```typescript
async validateCodeExists(taskId: string): Promise<boolean> {
  const filePaths = extractFilePaths(taskId);
  for (const path of filePaths) {
    if (!fs.existsSync(path) || isEmpty(path)) return false;
  }
  return true;
}
```

---

### T-055: 🧠 Implement task reopen logic (P1)
**Effort**: 1h | **AC**: AC-US7-14, AC-US7-15

**Description**: Reopen tasks if code validation fails.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (update)

**Acceptance Criteria**:
- [ ] If task complete BUT code missing → Reopen task
- [ ] Reopen in increment tasks.md first
- [ ] Propagate to Living Docs Implementation section
- [ ] Propagate to GitHub issue Subtasks
- [ ] Add GitHub comment explaining why
- [ ] Unit tests verify reopen flow

---

### T-056: ⚡ Implement completion propagation (bottom-up) (P1)
**Effort**: 1h | **AC**: AC-US7-16, AC-US7-17

**Description**: Propagate completion from Tasks → ACs → User Stories.

**Files**:
- `plugins/specweave-github/lib/CompletionPropagator.ts` (new)

**Acceptance Criteria**:
- [ ] When all Tasks for AC complete → Mark AC complete
- [ ] Propagate AC completion: Increment → Living Docs → GitHub
- [ ] When all ACs for User Story complete → Mark User Story complete
- [ ] When all User Stories for Increment complete → Mark Increment complete
- [ ] Unit tests verify propagation

---

### T-057: ⚡ Implement conflict resolution (Increment wins) (P1)
**Effort**: 30m | **AC**: AC-US7-03

**Description**: Resolve conflicts in favor of Increment (source of truth).

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (update)

**Acceptance Criteria**:
- [ ] If GitHub and Increment disagree → Increment wins
- [ ] If Living Docs and Increment disagree → Increment wins
- [ ] Log conflict resolution decisions
- [ ] Unit tests verify conflict resolution

---

### T-058: ⚡ Add sync performance optimization (P2)
**Effort**: 30m | **AC**: Performance < 5 seconds

**Description**: Optimize sync to complete within 5 seconds for 100 tasks.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (update)

**Acceptance Criteria**:
- [ ] Batch GitHub API calls
- [ ] Use parallel file I/O where possible
- [ ] Cache User Story file reads
- [ ] Complete sync in < 5 seconds for 100 tasks
- [ ] Performance tests verify timing

---

## Module 9: GitHub Integration (5 tasks, 2-3 hours)

### T-059: 🧠 Enhance UserStoryIssueBuilder with Feature link (P1)
**Effort**: 1h | **AC**: AC-US8-01, AC-US8-02, AC-US8-03

**Description**: Add Feature link to GitHub issue body.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Acceptance Criteria**:
- [ ] Add link to Feature at top of issue body
- [ ] Link format: [FS-XXX: Feature Name](../../specs/_features/FS-XXX/FEATURE.md)
- [ ] If _epics exist → Link to Epic as well
- [ ] Unit tests verify link format

---

### T-060: ⚡ Add AC checkboxes to GitHub issue body (P1)
**Effort**: 30m | **AC**: AC-US8-04, AC-US8-06, AC-US8-07

**Description**: Render ACs as checkable checkboxes in GitHub issue.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Acceptance Criteria**:
- [ ] Read ACs from User Story ## Acceptance Criteria section
- [ ] Render as checkboxes: `- [ ] AC-US1-01: Description`
- [ ] Preserve checkbox state from User Story file
- [ ] Unit tests verify checkbox rendering

---

### T-061: ⚡ Add Task subtasks to GitHub issue body (P1)
**Effort**: 30m | **AC**: AC-US8-05, AC-US8-06, AC-US8-07

**Description**: Render Tasks as checkable subtasks in GitHub issue.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Acceptance Criteria**:
- [ ] Read Tasks from User Story ## Implementation section
- [ ] Render as checkboxes: `- [ ] T-001: Description`
- [ ] Preserve checkbox state from User Story file
- [ ] Unit tests verify checkbox rendering

---

### T-062: ⚡ Add progress tracking to GitHub issues (P2)
**Effort**: 30m | **AC**: AC-US8-12

**Description**: Show completion % for ACs and Subtasks.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Acceptance Criteria**:
- [ ] Calculate AC completion % (completed / total)
- [ ] Calculate Subtask completion % (completed / total)
- [ ] Add ## Progress section to issue body
- [ ] Update progress on every sync
- [ ] Unit tests verify progress calculation

---

### T-063: ⚡ Implement issue state auto-update (P1)
**Effort**: 30m | **AC**: AC-US8-13

**Description**: Auto-update issue state based on progress.

**Files**:
- `plugins/specweave-github/lib/IssueStateManager.ts` (new)

**Acceptance Criteria**:
- [ ] 0% complete → State = open
- [ ] 1-99% complete → State = open, label = in-progress
- [ ] 100% complete → State = closed
- [ ] Unit tests verify state transitions

---

## Module 10: Migration & Backward Compatibility (3 tasks, 3 hours)

### T-064: 🧠 Create migration script for copy-based sync (P1)
**Effort**: 2h | **AC**: AC-US9-13

**Description**: Migrate existing increments to copy-based sync format.

**Files**:
- `scripts/migrate-to-copy-based-sync.ts` (new)

**Acceptance Criteria**:
- [ ] Scan all increments in .specweave/increments/
- [ ] For each increment, find User Stories
- [ ] Add ## Implementation section if missing
- [ ] Copy Tasks from increment tasks.md (filtered by AC-ID)
- [ ] Dry-run mode (preview changes)
- [ ] Run mode (apply changes)
- [ ] Integration tests verify migration

**Usage**:
```bash
npm run migrate:copy-sync -- --dry-run
npm run migrate:copy-sync
npm run migrate:copy-sync -- 0031
```

---

### T-065: ⚡ Add backward compatibility detection (P1)
**Effort**: 30m | **AC**: AC-US6-09

**Description**: Detect and handle User Stories without ## Implementation section.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Acceptance Criteria**:
- [ ] Check if User Story has ## Implementation section
- [ ] If missing → Auto-generate during next sync
- [ ] Log backward compatibility actions
- [ ] Unit tests verify detection

---

### T-066: ⚡ Update config schema for copy-based sync (P1)
**Effort**: 30m | **AC**: N/A (infrastructure)

**Description**: Add config options for copy-based sync.

**Files**:
- `src/config/schema.ts` (update)

**Acceptance Criteria**:
- [ ] Add livingDocs.copyBasedSync.enabled flag
- [ ] Add livingDocs.threeLayerSync flag
- [ ] Validate schema with Zod
- [ ] Unit tests verify schema

---

# TESTING & DOCUMENTATION (15 tasks)

## Module 11: Unit Tests (6 tasks, 8-10 hours)

### T-067: 🧠 Write unit tests for Phase 0 components (P1)
**Effort**: 4h | **AC**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05

**Description**: Comprehensive unit tests for all Phase 0 components.

**Files**:
- `tests/unit/init/vision-analyzer.test.ts` (new)
- `tests/unit/init/compliance-detector.test.ts` (new)
- `tests/unit/init/team-recommender.test.ts` (new)
- `tests/unit/init/repository-selector.test.ts` (new)
- `tests/unit/init/architecture-decision-engine.test.ts` (new)

**Acceptance Criteria**:
- [ ] VisionAnalyzer: 10 tests, 90%+ coverage
- [ ] ComplianceDetector: 15 tests (all 30+ standards), 90%+ coverage
- [ ] TeamRecommender: 10 tests, 90%+ coverage
- [ ] RepositorySelector: 10 tests, 90%+ coverage
- [ ] ArchitectureDecisionEngine: 15 tests, 90%+ coverage
- [ ] Mock LLM responses
- [ ] Mock GitHub API responses
- [ ] Test edge cases and error handling

---

### T-068: 🧠 Write unit tests for SpecDistributor enhancement (P1)
**Effort**: 2h | **AC**: AC-US9-08

**Description**: Unit tests for copy-based sync logic.

**Files**:
- `tests/unit/living-docs/spec-distributor-copy.test.ts` (new)
- `tests/unit/living-docs/project-detector.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test copyAcsAndTasksToUserStories method
- [ ] Test project detection from ACs
- [ ] Test AC filtering by project
- [ ] Test Task filtering by AC-ID
- [ ] Test User Story file updates
- [ ] 95%+ coverage
- [ ] Mock file system

---

### T-069: 🧠 Write unit tests for ThreeLayerSyncManager (P1)
**Effort**: 2h | **AC**: AC-US9-09

**Description**: Unit tests for bidirectional sync logic.

**Files**:
- `tests/unit/living-docs/three-layer-sync.test.ts` (new)
- `tests/unit/living-docs/code-validator.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test GitHub → Living Docs → Increment sync
- [ ] Test Increment → Living Docs → GitHub sync
- [ ] Test code validation
- [ ] Test task reopen logic
- [ ] Test completion propagation
- [ ] Test conflict resolution
- [ ] 95%+ coverage
- [ ] Mock GitHub API and file system

---

### T-070: ⚡ Write unit tests for UserStoryIssueBuilder (P1)
**Effort**: 1h | **AC**: N/A

**Description**: Unit tests for GitHub issue formatting.

**Files**:
- `tests/unit/github/user-story-issue-builder.test.ts` (update)

**Acceptance Criteria**:
- [ ] Test Feature link rendering
- [ ] Test AC checkbox rendering
- [ ] Test Task subtask rendering
- [ ] Test progress calculation
- [ ] Test issue state management
- [ ] 90%+ coverage

---

### T-071: ⚡ Write unit tests for migration script (P1)
**Effort**: 1h | **AC**: AC-US9-13

**Description**: Unit tests for migration script.

**Files**:
- `tests/unit/scripts/migrate-to-copy-based-sync.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test increment scanning
- [ ] Test User Story detection
- [ ] Test ## Implementation section insertion
- [ ] Test dry-run mode
- [ ] Test run mode
- [ ] 90%+ coverage

---

### T-072: ⚡ Write unit tests for backward compatibility (P1)
**Effort**: 30m | **AC**: AC-US9-12

**Description**: Unit tests for backward compatibility.

**Files**:
- `tests/unit/living-docs/backward-compatibility.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test detection of missing ## Implementation section
- [ ] Test auto-generation during sync
- [ ] Test existing increments still work
- [ ] 90%+ coverage

---

## Module 12: Integration Tests (4 tasks, 5-6 hours)

### T-073: 🧠 Write integration tests for strategic init flow (P1)
**Effort**: 2h | **AC**: AC-US9-06

**Description**: Integration tests for full init flow.

**Files**:
- `tests/integration/strategic-init-flow.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test full 6-phase init flow
- [ ] Test vision → compliance → teams → repos → architecture
- [ ] Test config persistence
- [ ] Test user interactions
- [ ] Mock LLM and GitHub API
- [ ] 90%+ coverage

---

### T-074: 🧠 Write integration tests for copy-based sync (P1)
**Effort**: 2h | **AC**: AC-US9-10

**Description**: Integration tests for living docs sync.

**Files**:
- `tests/integration/copy-based-sync.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test increment → User Story sync
- [ ] Test AC and Task copying
- [ ] Test project filtering
- [ ] Test file updates
- [ ] Mock file system
- [ ] 90%+ coverage

---

### T-075: 🧠 Write integration tests for GitHub three-layer sync (P1)
**Effort**: 2h | **AC**: AC-US9-10

**Description**: Integration tests for bidirectional GitHub sync.

**Files**:
- `tests/integration/github-three-layer-sync.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test GitHub → Increment sync
- [ ] Test Increment → GitHub sync
- [ ] Test code validation
- [ ] Test task reopen
- [ ] Test completion propagation
- [ ] Mock GitHub API
- [ ] 90%+ coverage

---

### T-076: ⚡ Write performance tests for sync (P2)
**Effort**: 1h | **AC**: AC-US9-14

**Description**: Performance tests for sync operations.

**Files**:
- `tests/integration/sync-performance.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test sync with 100 tasks completes < 5 seconds
- [ ] Test GitHub API batching efficiency
- [ ] Test file I/O performance
- [ ] Measure and report timing
- [ ] Performance regression detection

---

## Module 13: E2E Tests (3 tasks, 4-5 hours)

### T-077: 🧠 Write E2E tests for strategic init scenarios (P1)
**Effort**: 2h | **AC**: AC-US9-07

**Description**: End-to-end tests for strategic init.

**Files**:
- `tests/e2e/strategic-init-scenarios.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test viral product scenario (serverless recommendation)
- [ ] Test enterprise scenario (traditional + compliance)
- [ ] Test HIPAA scenario (compliance teams)
- [ ] Test multi-repo scenario (repository selection)
- [ ] Test learning project scenario (free tier)
- [ ] Mock LLM and GitHub API
- [ ] Verify config persistence
- [ ] 90%+ coverage

---

### T-078: 🧠 Write E2E tests for multi-project workflow (P1)
**Effort**: 2h | **AC**: AC-US9-11

**Description**: End-to-end tests for multi-project workflows.

**Files**:
- `tests/e2e/multi-project-workflow.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test increment planning with multiple projects
- [ ] Test living docs sync with project filtering
- [ ] Test GitHub sync for multiple User Stories
- [ ] Test task completion tracking
- [ ] Verify all three layers stay in sync
- [ ] 90%+ coverage

---

### T-079: 🧠 Write E2E tests for bidirectional sync (P1)
**Effort**: 1h | **AC**: AC-US9-11

**Description**: End-to-end tests for bidirectional sync.

**Files**:
- `tests/e2e/bidirectional-sync.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test checkbox change in GitHub → Increment update
- [ ] Test task completion in increment → GitHub update
- [ ] Test code validation and reopen
- [ ] Test completion propagation (Tasks → ACs → User Stories)
- [ ] Verify consistency across all three layers
- [ ] 90%+ coverage

---

## Module 14: Documentation (2 tasks, 2-3 hours)

### T-080: ⚡ Write Strategic Init user guide (P1)
**Effort**: 1h | **AC**: N/A (documentation)

**Description**: User-facing guide for strategic init.

**Files**:
- `.specweave/docs/public/guides/strategic-init-guide.md` (new)

**Acceptance Criteria**:
- [ ] Explain research-driven init flow
- [ ] Document all 6 phases
- [ ] Provide examples for different scenarios
- [ ] Include screenshots/examples
- [ ] Explain architecture recommendations
- [ ] Explain cloud credits and cost estimates

---

### T-081: ⚡ Write Multi-Project Setup guide (P1)
**Effort**: 1h | **AC**: N/A (documentation)

**Description**: User-facing guide for multi-project setup.

**Files**:
- `.specweave/docs/public/guides/multi-project-setup-guide.md` (update)

**Acceptance Criteria**:
- [ ] Explain copy-based sync paradigm
- [ ] Document User Story structure (ACs + Implementation)
- [ ] Explain three-layer sync
- [ ] Provide examples for backend/frontend/mobile
- [ ] Explain code validation and reopen
- [ ] Troubleshooting section

---

### T-082: ⚡ Write Compliance Standards reference (P1)
**Effort**: 1h | **AC**: N/A (documentation)

**Description**: Reference guide for all compliance standards.

**Files**:
- `.specweave/docs/public/guides/compliance-standards-reference.md` (new)

**Acceptance Criteria**:
- [ ] Document all 30+ compliance standards
- [ ] Group by category (healthcare, payment, privacy, government, etc.)
- [ ] Include data types, regions, team impact, cost impact
- [ ] Provide links to official documentation
- [ ] Include SpecWeave-specific guidance

---

### T-083: ⚡ Write Repository Selection guide (P1)
**Effort**: 30m | **AC**: N/A (documentation)

**Description**: Guide for repository batch selection.

**Files**:
- `.specweave/docs/public/guides/repository-selection-guide.md` (new)

**Acceptance Criteria**:
- [ ] Explain pattern-based selection (prefix, owner, keyword)
- [ ] Provide examples for different repo counts (3-5, 50+, 100+)
- [ ] Document GitHub API integration
- [ ] Explain manual exclusions
- [ ] Troubleshooting section

---

### T-084: ⚡ Update CHANGELOG.md with feature changes (P1)
**Effort**: 30m | **AC**: N/A (documentation)

**Description**: Document all changes in CHANGELOG.

**Files**:
- `CHANGELOG.md` (update)

**Acceptance Criteria**:
- [ ] Add entry for v0.19.0 (or next version)
- [ ] Document Phase 0 features (strategic init)
- [ ] Document Phase 1-4 features (copy-based sync)
- [ ] Include breaking changes (if any)
- [ ] Include migration guide reference

---

### T-085: ⚡ Update README.md with new features (P1)
**Effort**: 30m | **AC**: N/A (documentation)

**Description**: Update README with strategic init and multi-project features.

**Files**:
- `README.md` (update)

**Acceptance Criteria**:
- [ ] Add Strategic Init section
- [ ] Add Multi-Project Workflows section
- [ ] Update feature list
- [ ] Update screenshots (if applicable)
- [ ] Update quick start guide

---

## Task Summary

**Total Tasks**: 85
**Estimated Effort**: 78-107 hours

**By Priority**:
- P1 (Critical): 71 tasks (83%)
- P2 (Important): 12 tasks (14%)
- P3 (Nice-to-have): 2 tasks (3%)

**By Model Hint**:
- ⚡ Haiku: 42 tasks (49%) - Simple, well-defined tasks
- 🧠 Sonnet: 41 tasks (48%) - Complex logic, integration
- 💎 Opus: 2 tasks (3%) - Critical architecture decisions

**By Phase**:
- Phase 0 (Strategic Init): 45 tasks, 68-92 hours
- Phase 1-4 (Copy-Based Sync): 25 tasks, 10-15 hours
- Testing & Documentation: 15 tasks, 15-18 hours

**Coverage Targets**:
- Phase 0: 90%+ coverage
- Phase 1-4: 95%+ coverage
- Overall: 95%+ coverage

---

## Execution Strategy

### Week-by-Week Breakdown

**Weeks 1-2: Vision & Market Research** (T-001 to T-008)
**Weeks 3-4: Compliance Detection** (T-009 to T-018)
**Weeks 5-6: Team Recommendations & Repository Selection** (T-019 to T-034)
**Weeks 7-8: Architecture Decisions** (T-035 to T-042)
**Weeks 9-10: Init Flow Integration** (T-043 to T-045)
**Week 11: Copy-Based Sync** (T-046 to T-066)
**Week 12: Testing & Documentation** (T-067 to T-085)

### Critical Path

1. T-001, T-002 → T-009 → T-019 → T-035 → T-043 (Strategic Init backbone)
2. T-046 → T-051 → T-059 (Copy-Based Sync backbone)
3. T-067 to T-079 (Testing validates everything)

### Dependencies

- T-002 to T-008 depend on T-001 (VisionAnalyzer base)
- T-010 to T-018 depend on T-009 (ComplianceDetector base)
- T-020 to T-026 depend on T-019 (TeamRecommender base)
- T-028 to T-034 depend on T-027 (RepositorySelector base)
- T-036 to T-042 depend on T-035 (ArchitectureDecisionEngine base)
- T-047 to T-050 depend on T-046 (SpecDistributor enhancement)
- T-052 to T-058 depend on T-051 (ThreeLayerSyncManager base)
- T-060 to T-063 depend on T-059 (UserStoryIssueBuilder enhancement)

---

**Status**: Ready for execution
**Next Command**: `/specweave:do 0037`
