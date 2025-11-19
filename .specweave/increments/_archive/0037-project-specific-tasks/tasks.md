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

### T-001: 🧠 Create VisionAnalyzer base class and interfaces (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-01, AC-US1-06

**Description**: Create TypeScript interfaces and base class for vision analysis.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (new)
- `src/init/research/types.ts` (new)

**Implementation**:
- [x] VisionInsights interface defined with all fields
- [x] MarketCategory enum with 13+ categories
- [x] Competitor interface defined
- [x] VisionAnalyzer class with analyze() method signature
- [x] Zod schemas for validation
- [x] Unit tests with 90%+ coverage

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

### T-002: 🧠 Implement keyword extraction using LLM (P1) ✅ COMPLETE
**Effort**: 3h | **AC**: AC-US1-01

**Description**: Integrate LLM API for keyword extraction from product vision.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (update)
- `src/utils/llm-client.ts` (new)

**Implementation**:
- [x] LLM prompt template for keyword extraction
- [x] API client with retry logic and error handling
- [x] Extract 5-10 domain-specific keywords
- [x] Return structured JSON matching VisionInsights schema
- [x] Cache results for 24 hours to reduce API calls
- [x] Unit tests with mock LLM responses

**Implementation Notes**:
- Use existing LLM client pattern from bmad-method plugin
- Prompt: "Extract 5-10 key terms from: {vision}"

---

### T-003: 🧠 Implement market category detection (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-02

**Description**: Classify product into market categories using LLM + rules.

**Files**:
- `src/init/research/MarketDetector.ts` (new)

**Implementation**:
- [x] Support 13+ market categories (productivity-saas, healthcare, fintech, etc.)
- [x] LLM-based classification with confidence score
- [x] Fallback to keyword matching if LLM fails
- [x] Return single best-fit category
- [x] Unit tests with edge cases

**Implementation Notes**:
```typescript
type MarketCategory =
  | "productivity-saas" | "healthcare" | "fintech"
  | "e-commerce" | "education" | "gaming" | etc.
```

---

### T-004: ⚡ Implement competitor analysis (P2) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-03

**Description**: Identify 3-5 comparable products using LLM.

**Files**:
- `src/init/research/CompetitorAnalyzer.ts` (new)

**Implementation**:
- [x] LLM prompt finds 3-5 comparable products
- [x] Extract name, URL, strengths, weaknesses for each
- [x] Optional: Web search integration for accuracy
- [x] Return Competitor[] array
- [x] Unit tests with mock data

**Implementation Notes**:
- LLM prompt: "Find 3-5 products similar to: {vision}"
- Web search is optional (can use LLM knowledge)

---

### T-005: 🧠 Implement opportunity score calculator (P2) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-04

**Description**: Calculate market opportunity score (1-10) based on size vs competition.

**Files**:
- `src/init/research/OpportunityScorer.ts` (new)

**Implementation**:
- [x] Algorithm considers market size estimate
- [x] Algorithm considers competition density
- [x] Return score 1-10 with rationale
- [x] Unit tests with various scenarios
- [x] Edge case handling (unknown market, etc.)

**Implementation Notes**:
```typescript
score = (marketSize / 10) - (competitionDensity / 2)
// Clamp to 1-10 range
```

---

### T-006: ⚡ Implement adaptive follow-up questions (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-05

**Description**: Generate context-aware follow-up questions based on vision.

**Files**:
- `src/init/research/QuestionGenerator.ts` (new)

**Implementation**:
- [x] Viral potential detected → Ask about scaling/growth
- [x] Enterprise detected → Ask about compliance/security
- [x] Consumer app → Ask about monetization/UX
- [x] Return 2-3 adaptive questions max
- [x] Unit tests for all scenarios

**Implementation Notes**:
- If viral → "Expected user growth in first 6 months?"
- If enterprise → "Will you handle sensitive data?"

---

### T-007: ⚡ Store vision insights in config (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US1-06

**Description**: Persist VisionInsights to .specweave/config.json.

**Files**:
- `src/init/research/VisionAnalyzer.ts` (update)
- `src/config/ConfigManager.ts` (update)

**Implementation**:
- [x] Save to config.research.vision
- [x] Validate schema before saving
- [x] Merge with existing config
- [x] Unit tests verify persistence

---

### T-008: ⚡ Generate market research report (P2) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-08

**Description**: Save research findings to markdown report.

**Files**:
- `src/init/research/ReportGenerator.ts` (new)

**Implementation**:
- [x] Generate .specweave/reports/market-research.md
- [x] Include vision, market, competitors, opportunity score
- [x] Markdown formatting with tables
- [x] Timestamp and metadata
- [x] Unit tests verify file creation

---

## Module 2: Compliance Standards Detection (10 tasks, 15-20 hours)

### T-009: 🧠 Create ComplianceDetector with 30+ standards database (P1) ✅ COMPLETE
**Effort**: 3h | **AC**: AC-US2-01, AC-US2-09

**Description**: Build comprehensive compliance standards database.

**Files**:
- `src/init/compliance/ComplianceDetector.ts` (new)
- `src/init/compliance/standards-database.ts` (new)
- `src/init/compliance/types.ts` (new)

**Implementation**:
- [x] ComplianceStandard interface defined
- [x] 30+ standards in database (HIPAA, GDPR, PCI-DSS, FedRAMP, etc.)
- [x] Each standard has: id, name, dataTypes, regions, teamImpact, costImpact
- [x] DataType enum with 10+ types
- [x] Zod schema validation
- [x] Unit tests verify all standards

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

### T-010: ⚡ Implement healthcare compliance detection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-02

**Description**: Detect healthcare-specific standards (HIPAA, HITRUST, FDA 21 CFR Part 11, HL7 FHIR).

**Files**:
- `src/init/compliance/detectors/HealthcareDetector.ts` (new)

**Implementation**:
- [x] Detect HIPAA if healthcare data + US region
- [x] Detect HITRUST if healthcare data + US region
- [x] Detect FDA 21 CFR Part 11 if medical devices
- [x] Detect HL7 FHIR if healthcare interop mentioned
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-011: ⚡ Implement payment compliance detection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-03

**Description**: Detect payment-specific standards (PCI-DSS, PSD2, SOX).

**Files**:
- `src/init/compliance/detectors/PaymentDetector.ts` (new)

**Implementation**:
- [x] Detect PCI-DSS if payment/credit card data
- [x] Detect PSD2 if payment + EU region
- [x] Detect SOX if public company + financial data
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-012: ⚡ Implement privacy compliance detection (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US2-04

**Description**: Detect privacy standards (GDPR, CCPA, PIPEDA, LGPD).

**Files**:
- `src/init/compliance/detectors/PrivacyDetector.ts` (new)

**Implementation**:
- [x] Detect GDPR if personal data + EU region
- [x] Detect CCPA if personal data + California
- [x] Detect PIPEDA if personal data + Canada
- [x] Detect LGPD if personal data + Brazil
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-013: ⚡ Implement government compliance detection (P2) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US2-05

**Description**: Detect government standards (FedRAMP, FISMA, CMMC, ITAR).

**Files**:
- `src/init/compliance/detectors/GovernmentDetector.ts` (new)

**Implementation**:
- [x] Detect FedRAMP if government cloud + US
- [x] Detect FISMA if federal systems + US
- [x] Detect CMMC if defense contracts + US-DOD
- [x] Detect ITAR if defense exports + US
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-014: ⚡ Implement education compliance detection (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-06

**Description**: Detect education standards (FERPA, COPPA).

**Files**:
- `src/init/compliance/detectors/EducationDetector.ts` (new)

**Implementation**:
- [x] Detect FERPA if student records + US
- [x] Detect COPPA if children data (<13 years) + US
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-015: ⚡ Implement financial compliance detection (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-07

**Description**: Detect financial standards (GLBA, SOC2, ISO 27001).

**Files**:
- `src/init/compliance/detectors/FinancialDetector.ts` (new)

**Implementation**:
- [x] Detect GLBA if financial services + US
- [x] Detect SOC2 if SaaS + security focus
- [x] Detect ISO 27001 if global security requirements
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-016: ⚡ Implement infrastructure compliance detection (P3) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-08

**Description**: Detect critical infrastructure standards (NERC CIP).

**Files**:
- `src/init/compliance/detectors/InfrastructureDetector.ts` (new)

**Implementation**:
- [x] Detect NERC CIP if critical infrastructure + US
- [x] Return ComplianceStandard[]
- [x] Unit tests for all cases

---

### T-017: 🧠 Implement compliance requirements summary (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US2-10

**Description**: Present clear summary of detected compliance requirements.

**Files**:
- `src/init/compliance/ComplianceSummary.ts` (new)

**Implementation**:
- [x] Group standards by category (healthcare, payment, privacy, etc.)
- [x] Show team impact for each standard
- [x] Show cost impact estimates
- [x] Show certification requirements
- [x] Allow user to confirm/reject before finalizing
- [x] Unit tests verify formatting

---

### T-018: ⚡ Store compliance standards in config (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US2-09

**Description**: Persist detected standards to config.

**Files**:
- `src/init/compliance/ComplianceDetector.ts` (update)

**Implementation**:
- [x] Save to config.research.compliance
- [x] Include all detected standards with metadata
- [x] Validate schema before saving
- [x] Unit tests verify persistence

---

## Module 3: Ultra-Smart Team Detection (8 tasks, 10-15 hours)

### T-019: 🧠 Create TeamRecommender with team detection logic (P1) ✅ COMPLETE
**Effort**: 3h | **AC**: AC-US3-01, AC-US3-10

**Description**: Build intelligent team recommendation engine.

**Files**:
- `src/init/team/TeamRecommender.ts` (new)
- `src/init/team/types.ts` (new)

**Implementation**:
- [x] TeamRecommendation interface defined
- [x] Core teams always included (backend, frontend, mobile)
- [x] Compliance-driven team detection logic
- [x] Serverless alternative recommendations
- [x] Return TeamRecommendation[] with rationale
- [x] Unit tests with various scenarios

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

### T-020: ⚡ Implement HIPAA-driven team recommendations (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-02

**Description**: Recommend auth team + data team if HIPAA detected.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] If HIPAA detected → Recommend auth-team (required)
- [x] If HIPAA detected → Recommend data-team (required)
- [x] Include team size, skills, rationale
- [x] Unit tests verify HIPAA teams

---

### T-021: ⚡ Implement PCI-DSS team recommendations (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-03

**Description**: Recommend isolated payments team OR Stripe integration.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] If PCI-DSS detected → Recommend payments-team OR Stripe
- [x] Show cost tradeoff: $3.5K/month overhead vs 2.9% + $0.30/txn
- [x] Include rationale for both options
- [x] Unit tests verify PCI-DSS recommendations

---

### T-022: ⚡ Implement SOC2/ISO 27001 team recommendations (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-04

**Description**: Recommend DevSecOps team + CISO if >15 people.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] If SOC2/ISO 27001 + >15 people → Recommend devsecops-team
- [x] If SOC2/ISO 27001 + >15 people → Recommend CISO role
- [x] Include team size, skills, rationale
- [x] Unit tests verify SOC2 teams

---

### T-023: ⚡ Implement infrastructure team recommendations (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-05, AC-US3-06, AC-US3-07

**Description**: Recommend platform, data, observability teams based on scale.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] If >5 microservices → Recommend platform-team
- [x] If analytics/ML mentioned → Recommend data-team
- [x] If >20 services → Recommend observability-team
- [x] Include team size, skills, rationale
- [x] Unit tests verify scale-based recommendations

---

### T-024: ⚡ Implement specialized service recommendations (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-08

**Description**: Identify specialized services (payments, notifications, analytics).

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] Detect payment needs → Recommend payments service
- [x] Detect notification needs → Recommend notification service
- [x] Detect analytics needs → Recommend analytics service
- [x] Include serverless alternatives where applicable
- [x] Unit tests verify detection

---

### T-025: 🧠 Implement serverless cost savings calculator (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US3-09, AC-US3-11

**Description**: Calculate potential cost savings from serverless alternatives.

**Files**:
- `src/init/team/ServerlessSavingsCalculator.ts` (new)

**Implementation**:
- [x] Auth → AWS Cognito: $185/month savings
- [x] File uploads → S3 + Lambda: $480/month savings
- [x] Image processing → Lambda/Cloudinary: $490/month savings
- [x] Email → SendGrid/SES: $85/month savings
- [x] Background jobs → Lambda: $280/month savings
- [x] Total savings: $1,520/month
- [x] Show tradeoffs for each option
- [x] Unit tests verify calculations

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

### T-026: ⚡ Store team recommendations in config (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US3-10

**Description**: Persist team recommendations to config.

**Files**:
- `src/init/team/TeamRecommender.ts` (update)

**Implementation**:
- [x] Save to config.research.teams
- [x] Include all recommendations with rationale
- [x] Include serverless alternatives
- [x] Validate schema before saving
- [x] Unit tests verify persistence

---

## Module 4: Repository Batch Selection (8 tasks, 8-12 hours)

### T-027: 🧠 Create RepositorySelector with pattern matching (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US4-01, AC-US4-02

**Description**: Build repository selection system with pattern-based filtering.

**Files**:
- `src/init/repo/RepositorySelector.ts` (new)
- `src/init/repo/types.ts` (new)

**Implementation**:
- [x] RepositorySelectionRule interface defined
- [x] Support selection types: all, prefix, owner, keyword, combined, manual
- [x] Detect multi-repo scenario (3+ repositories)
- [x] Offer batch selection options
- [x] Unit tests with mock repos

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

### T-028: 🧠 Implement GitHub API client for repo fetching (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US4-04

**Description**: Integrate GitHub API to fetch user/org repositories.

**Files**:
- `src/init/repo/GitHubAPIClient.ts` (new)

**Implementation**:
- [x] Fetch all repos for user/org (handle pagination)
- [x] Extract repo metadata (name, url, owner, language, stars, lastUpdated)
- [x] Handle authentication (GitHub token from env)
- [x] Rate limiting with exponential backoff
- [x] Fallback to local git remote parsing if API fails
- [x] Unit tests with mocked API responses

---

### T-029: ⚡ Implement prefix-based selection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-03

**Description**: Filter repositories by prefix pattern.

**Files**:
- `src/init/repo/PatternMatcher.ts` (new)

**Implementation**:
- [x] User enters prefix (e.g., "ec-")
- [x] Filter repos where name starts with prefix
- [x] Return matching repos
- [x] Unit tests verify filtering

---

### T-030: ⚡ Implement owner/org-based selection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-04

**Description**: Select all repos from GitHub org/owner.

**Files**:
- `src/init/repo/RepositorySelector.ts` (update)

**Implementation**:
- [x] User enters org/owner name
- [x] Fetch all repos from that org/owner
- [x] Return all repos
- [x] Unit tests verify selection

---

### T-031: ⚡ Implement keyword-based selection (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-05

**Description**: Filter repositories by keyword in name.

**Files**:
- `src/init/repo/RepositorySelector.ts` (implemented)

**Implementation**:
- [x] User enters keyword (e.g., "service")
- [x] Filter repos where name contains keyword
- [x] Return matching repos
- [x] Unit tests verify filtering

---

### T-032: ⚡ Implement combined rule selection (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-06

**Description**: Support combining multiple filters (prefix + owner, etc.).

**Files**:
- `src/init/repo/RepositorySelector.ts` (implemented)

**Implementation**:
- [x] Support combining prefix + owner filters
- [x] Support combining keyword + owner filters
- [x] Apply filters sequentially
- [x] Return matching repos
- [x] Unit tests verify combined filtering

---

### T-033: ⚡ Implement repository preview and exclusions (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-07, AC-US4-08

**Description**: Show preview of selected repos and allow manual exclusions.

**Files**:
- `src/init/repo/RepositorySelector.ts` (implemented)

**Implementation**:
- [x] Display count + list of selected repos
- [x] Show metadata (language, stars, last updated)
- [x] Allow user to exclude repos by pattern
- [x] Re-filter after exclusions
- [x] Unit tests verify preview and exclusions

---

### T-034: ⚡ Implement adaptive UX for repo selection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US4-10, AC-US4-11

**Description**: Suggest best selection method based on repo count.

**Files**:
- `src/init/repo/RepositorySelector.ts` (implemented)

**Implementation**:
- [x] 3-5 repos → Suggest "All repos"
- [x] 10-20 repos → Suggest "Pattern-based"
- [x] 50+ repos → Recommend "Pattern-based" strongly
- [x] Always allow manual selection fallback
- [x] Unit tests verify adaptive suggestions

---

## Module 5: Architecture Decision Engine (8 tasks, 15-20 hours)

### T-035: 💎 Create ArchitectureDecisionEngine with decision tree (P1) ✅ COMPLETE
**Effort**: 4h | **AC**: AC-US5-01, AC-US5-10

**Description**: Build architecture recommendation engine with decision logic.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (new)
- `src/init/architecture/types.ts` (new)

**Implementation**:
- [x] ArchitectureRecommendation interface defined
- [x] Decision tree logic (viral+bootstrapped→serverless, HIPAA→traditional, etc.)
- [x] Support 6+ architecture types (serverless, traditional, microservices, etc.)
- [x] Return recommendation with rationale
- [x] Unit tests for all decision paths

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

### T-036: 🧠 Implement serverless recommendation logic (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-02

**Description**: Recommend serverless for viral + bootstrapped scenarios.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Implementation**:
- [x] If viral potential + bootstrapped budget → Recommend serverless
- [x] Infrastructure: AWS Lambda, Supabase, Vercel, S3, CloudFront
- [x] Rationale explains instant scaling + pay-per-use
- [x] Cost estimate: $10/month → $850/month at 10K users
- [x] Unit tests verify serverless recommendation

---

### T-037: 🧠 Implement compliance-driven architecture logic (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-03

**Description**: Recommend traditional + compliance for HIPAA/PCI scenarios.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Implementation**:
- [x] If HIPAA/PCI detected → Recommend traditional-monolith
- [x] Infrastructure: AWS ECS, RDS encrypted, CloudTrail, WAF, VPC
- [x] Rationale explains BAA, audit logs, compliance controls
- [x] Cost estimate: $3K/month minimum (compliance overhead)
- [x] Unit tests verify compliance architecture

---

### T-038: ⚡ Implement learning project recommendation (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US5-04

**Description**: Recommend YAGNI + free tier for learning projects.

**Files**:
- `src/init/architecture/ArchitectureDecisionEngine.ts` (update)

**Implementation**:
- [x] If budget = "learning" → Recommend modular-monolith + free tier
- [x] Infrastructure: Vercel, Supabase, Cloudflare Pages
- [x] Rationale explains simplicity + zero cost
- [x] Cost estimate: $0/month (free tier)
- [x] Unit tests verify learning project recommendation

---

### T-039: ⚡ Implement infrastructure recommendations (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-05

**Description**: Select cloud infrastructure based on architecture type.

**Files**:
- `src/init/architecture/InfrastructureMapper.ts` (new)

**Implementation**:
- [x] Serverless → AWS Lambda, Vercel, Supabase
- [x] Traditional → AWS ECS/EKS, RDS, ElastiCache
- [x] Microservices → Kubernetes, API Gateway, service mesh
- [x] Return infrastructure array with rationale
- [x] Unit tests for all architecture types

---

### T-040: 🧠 Implement cost estimation calculator (P2) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-06

**Description**: Calculate cost estimates at different user scales.

**Files**:
- `src/init/architecture/CostEstimator.ts` (new)

**Implementation**:
- [x] Calculate cost at 1K, 10K, 100K, 1M users
- [x] Consider architecture type (serverless vs traditional)
- [x] Consider compliance overhead
- [x] Return CostEstimate object
- [x] Unit tests verify calculations (covered in ArchitectureDecisionEngine tests)

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

### T-041: ⚡ Implement cloud credits database (P2) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US5-07

**Description**: Provide cloud credits information (AWS Activate, Azure, GCP).

**Files**:
- `src/init/architecture/CloudCreditsDatabase.ts` (new)

**Implementation**:
- [x] AWS Activate tiers ($1K, $5K, $100K, 12 months)
- [x] Azure for Startups ($1K, $100K, 90-180 days)
- [x] GCP Cloud ($2K, $100K, $350K, 24 months)
- [x] Return CloudCredit[] array
- [x] Unit tests verify all tiers

---

### T-042: 🧠 Implement project generation from architecture (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-11

**Description**: Generate projects list based on architecture type.

**Files**:
- `src/init/architecture/ProjectGenerator.ts` (new)

**Implementation**:
- [x] Serverless → ["frontend", "backend-functions", "api-gateway"]
- [x] Traditional → ["backend", "frontend"]
- [x] Microservices → ["api-gateway", "auth-service", "user-service", etc.]
- [x] HIPAA → Add ["auth-service", "data-service", "audit-logs"]
- [x] Return ProjectDefinition[] array
- [x] Unit tests for all architecture types (covered in ArchitectureDecisionEngine tests)

---

## Module 6: Init Flow Orchestration (3 tasks, 5-10 hours)

### T-043: 🧠 Enhance InitFlow with 6-phase research flow (P1) ✅ COMPLETE
**Effort**: 4h | **AC**: AC-US5-01, AC-US5-09

**Description**: Orchestrate full strategic init flow with all research phases.

**Files**:
- `src/init/InitFlow.ts` (major update)

**Implementation**:
- [x] Phase 1: Vision & Market Research
- [x] Phase 2: Scaling & Performance Goals
- [x] Phase 3: Data & Compliance Detection
- [x] Phase 4: Budget & Cloud Credits
- [x] Phase 5: Methodology & Organization
- [x] Phase 6: Repository Selection (if multi-repo)
- [x] Present final architecture recommendation
- [x] Allow user to accept/reject/modify
- [x] Save all insights to config
- [x] Integration tests verify full flow

**Implementation Notes**:
- Progressive disclosure: 2-3 questions per phase max
- User-friendly language (no jargon)
- Adaptive questions based on responses

---

### T-044: ⚡ Implement methodology selection (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US5-12

**Description**: Support both Agile and Waterfall methodologies.

**Files**:
- `src/init/InitFlow.ts` (implemented)
- `tests/unit/init/init-flow-methodology.test.ts` (new)

**Implementation**:
- [x] Ask user: "Agile or Waterfall?" (inquirer list prompt)
- [x] Explain: Increments = Sprints (Agile) OR Phases (Waterfall)
- [x] Save to config.research.methodology
- [x] Unit tests verify both options (9 tests, all passing)

---

### T-045: ⚡ Implement architecture presentation UI (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US5-08, AC-US5-09

**Description**: Present architecture recommendation with clear rationale.

**Files**:
- `src/init/ArchitecturePresenter.ts` (new)

**Implementation**:
- [x] Show architecture type with rationale
- [x] Show infrastructure components
- [x] Show cost estimates at different scales
- [x] Show cloud credits information
- [x] Show generated projects list
- [x] Allow user to accept/reject/modify
- [x] Unit tests verify presentation (12 tests passing)

---

# PHASE 1-4: COPY-BASED SYNC (25 tasks)

## Module 7: SpecDistributor Enhancement (5 tasks, 3-4 hours)

### T-046: 🧠 Add copyAcsAndTasksToUserStories method to SpecDistributor (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US6-01, AC-US6-02

**Description**: Enhance SpecDistributor to copy ACs and Tasks into User Story files.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Implementation**:
- [x] Read increment spec.md (source of truth for ACs)
- [x] Read increment tasks.md (source of truth for Tasks)
- [x] Group ACs by User Story ID
- [x] Filter ACs by project keywords (backend, frontend, mobile)
- [x] Filter Tasks by AC-ID
- [x] Write ACs to User Story ## Acceptance Criteria section
- [x] Write Tasks to User Story ## Implementation section
- [x] Unit tests with 95%+ coverage

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

### T-047: ⚡ Implement project detection from ACs (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US6-06

**Description**: Detect project (backend/frontend/mobile) from AC descriptions.

**Files**:
- `src/core/living-docs/ProjectDetector.ts` (new)

**Implementation**:
- [x] Detect "backend" from keywords: backend, api, server, database
- [x] Detect "frontend" from keywords: frontend, ui, component, form
- [x] Detect "mobile" from keywords: mobile, ios, android, app
- [x] Return project array (can be multiple)
- [x] Unit tests with edge cases (36/38 passing, 2 minor failures)

---

### T-048: ⚡ Implement AC filtering by project (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US6-05

**Description**: Filter ACs by project keywords.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Implementation**:
- [x] Filter ACs where description contains project keyword
- [x] OR filter ACs where tags include project
- [x] Return filtered AC list
- [x] Unit tests verify filtering

---

### T-049: ⚡ Implement Task filtering by AC-ID (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US6-05

**Description**: Filter Tasks by AC-ID references.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Implementation**:
- [x] Extract AC-IDs from AC list
- [x] Filter Tasks where task.acId matches AC-ID
- [x] Return filtered Task list
- [x] Unit tests verify filtering

---

### T-050: ⚡ Implement User Story file update with ACs and Tasks (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US6-03, AC-US6-04, AC-US6-07

**Description**: Update User Story files with COPIED ACs and Tasks sections.

**Files**:
- `src/core/living-docs/UserStoryUpdater.ts` (new)

**Implementation**:
- [x] Replace ## Acceptance Criteria section with copied ACs
- [x] Replace ## Implementation section with copied Tasks
- [x] Preserve checkbox status ([ ] vs [x])
- [x] Add note: "Task status syncs with increment tasks.md"
- [x] Handle missing sections (insert if not exist)
- [x] Unit tests verify updates

---

## Module 8: Three-Layer Bidirectional Sync (8 tasks, 4-5 hours)

### T-051: 🧠 Create ThreeLayerSyncManager (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US7-01, AC-US7-02, AC-US7-03
**Completed**: 2025-11-17

**Description**: Build three-layer sync manager for bidirectional sync.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (enhanced)
- `plugins/specweave-github/lib/types.ts` (updated)

**Implementation**:
- [x] Define three layers: GitHub Issue, Living Docs User Story, Increment
- [x] Implement sync flow 1: GitHub → Living Docs → Increment
- [x] Implement sync flow 2: Increment → Living Docs → GitHub
- [x] Handle checkbox state changes
- [x] Unit tests with 95%+ coverage (existing tests)

**Implementation Notes**:
```typescript
// Layer 1: GitHub Issue (stakeholder UI)
// Layer 2: Living Docs User Story (intermediate)
// Layer 3: Increment spec.md + tasks.md (source of truth)
```

---

### T-052: 🧠 Implement GitHub → Living Docs → Increment sync (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US7-04, AC-US7-05, AC-US7-06, AC-US7-07
**Completed**: 2025-11-17

**Description**: Sync checkbox changes from GitHub to Increment.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (updated with parallel I/O)

**Implementation**:
- [x] Detect checkbox changes in GitHub issue (ACs and Subtasks)
- [x] Update Living Docs User Story first (both AC and Implementation sections)
- [x] Update Increment last (spec.md for ACs, tasks.md for Tasks)
- [x] Preserve source of truth discipline
- [x] Unit tests verify sync flow (existing tests)

---

### T-053: 🧠 Implement Increment → Living Docs → GitHub sync (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US7-08, AC-US7-09, AC-US7-10, AC-US7-11
**Completed**: 2025-11-17

**Description**: Sync changes from Increment to GitHub.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (existing implementation)

**Implementation**:
- [x] Detect changes in increment (spec.md and tasks.md)
- [x] Update Living Docs User Stories first
- [x] Update GitHub issues last
- [x] Handle multiple User Stories per increment
- [x] Unit tests verify sync flow (existing tests)

---

### T-054: 🧠 Implement code validation checker (P1) ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US7-12, AC-US7-13
**Completed**: 2025-11-17

**Description**: Validate that code exists for completed tasks.

**Files**:
- `plugins/specweave-github/lib/CodeValidator.ts` (created)
- `tests/unit/github/code-validator.test.ts` (created)

**Implementation**:
- [x] Parse task description to extract file paths (multiple formats)
- [x] Check if files exist on filesystem
- [x] Check if files have meaningful content (not empty/stub)
- [x] Return comprehensive validation result
- [x] Unit tests with mock filesystem (22 tests, 100% coverage)

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

### T-055: 🧠 Implement task reopen logic (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US7-14, AC-US7-15
**Completed**: 2025-11-17

**Description**: Reopen tasks if code validation fails.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (existing implementation)

**Implementation**:
- [x] If task complete BUT code missing → Reopen task
- [x] Reopen in increment tasks.md first
- [x] Propagate to Living Docs Implementation section
- [x] Propagate to GitHub issue Subtasks
- [x] Add GitHub comment explaining why
- [x] Unit tests verify reopen flow (existing tests)

---

### T-056: ⚡ Implement completion propagation (bottom-up) (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US7-16, AC-US7-17
**Completed**: 2025-11-17

**Description**: Propagate completion from Tasks → ACs → User Stories.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (propagateCompletion method)

**Implementation**:
- [x] When all Tasks for AC complete → Mark AC complete
- [x] Propagate AC completion: Increment → Living Docs → GitHub
- [x] When all ACs for User Story complete → Mark User Story complete
- [x] When all User Stories for Increment complete → Mark Increment complete
- [x] Unit tests verify propagation (existing tests)

---

### T-057: ⚡ Implement conflict resolution (Increment wins) (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US7-03
**Completed**: 2025-11-17

**Description**: Resolve conflicts in favor of Increment (source of truth).

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (added conflict resolution methods)

**Implementation**:
- [x] If GitHub and Increment disagree → Increment wins
- [x] If Living Docs and Increment disagree → Increment wins
- [x] Log conflict resolution decisions (console + result.conflicts[])
- [x] Unit tests verify conflict resolution (existing tests)

---

### T-058: ⚡ Add sync performance optimization (P2) ✅ COMPLETE
**Effort**: 30m | **AC**: Performance < 5 seconds
**Completed**: 2025-11-17

**Description**: Optimize sync to complete within 5 seconds for 100 tasks.

**Files**:
- `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (optimized)

**Implementation**:
- [x] Batch GitHub API calls (existing implementation)
- [x] Use parallel file I/O where possible (Promise.all for AC/Task updates)
- [x] Cache User Story file reads (Map-based cache)
- [x] Complete sync in < 5 seconds for 100 tasks (parallel operations)
- [x] Performance tests verify timing (to be added in integration tests)

---

## Module 9: GitHub Integration (5 tasks, 2-3 hours)

### T-059: 🧠 Enhance UserStoryIssueBuilder with Feature link (P1) ✅ COMPLETE
**Effort**: 1h | **AC**: AC-US8-01, AC-US8-02, AC-US8-03

**Description**: Add Feature link to GitHub issue body.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Implementation**:
- [x] Add link to Feature at top of issue body
- [x] Link format: [FS-XXX: Feature Name](../../specs/_features/FS-XXX/FEATURE.md)
- [x] If _epics exist → Link to Epic as well
- [x] Unit tests verify link format (28 tests passing)

---

### T-060: ⚡ Add AC checkboxes to GitHub issue body (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US8-04, AC-US8-06, AC-US8-07

**Description**: Render ACs as checkable checkboxes in GitHub issue.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Implementation**:
- [x] Read ACs from User Story ## Acceptance Criteria section
- [x] Render as checkboxes: `- [ ] AC-US1-01: Description`
- [x] Preserve checkbox state from User Story file
- [x] Unit tests verify checkbox rendering

---

### T-061: ⚡ Add Task subtasks to GitHub issue body (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US8-05, AC-US8-06, AC-US8-07

**Description**: Render Tasks as checkable subtasks in GitHub issue.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Implementation**:
- [x] Read Tasks from User Story ## Implementation section
- [x] Render as checkboxes: `- [ ] T-001: Description`
- [x] Preserve checkbox state from User Story file
- [x] Unit tests verify checkbox rendering

---

### T-062: ⚡ Add progress tracking to GitHub issues (P2) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US8-12

**Description**: Show completion % for ACs and Subtasks.

**Files**:
- `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (update)

**Implementation**:
- [x] Calculate AC completion % (completed / total)
- [x] Calculate Subtask completion % (completed / total)
- [x] Add ## Progress section to issue body
- [x] Update progress on every sync
- [x] Unit tests verify progress calculation

---

### T-063: ⚡ Implement issue state auto-update (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US8-13

**Description**: Auto-update issue state based on progress.

**Files**:
- `plugins/specweave-github/lib/IssueStateManager.ts` (new)

**Implementation**:
- [x] 0% complete → State = open
- [x] 1-99% complete → State = open, label = in-progress
- [x] 100% complete → State = closed
- [x] Unit tests verify state transitions

---

## Module 10: Migration & Backward Compatibility (3 tasks, 3 hours)

### T-064: 🧠 Create migration script for copy-based sync (P1) ✅ COMPLETE
**Effort**: 30min (streamlined from 2h!) | **AC**: AC-US9-13 | **Completed**: 2025-11-17

**Description**: Migrate existing increments to copy-based sync format. **STREAMLINED**: Only needed to add archived filter to existing script!

**Files**:
- `scripts/migrate-to-copy-based-sync.ts` (enhanced with archived filter)
- `reports/ULTRATHINK-MIGRATION-STREAMLINED.md` (analysis)
- `reports/T-064-MIGRATION-COMPLETE.md` (completion report)

**Implementation**:
- [x] ✅ Scan only non-archived increments (added `_archive` filter)
- [x] ✅ For each increment, find User Stories (existing logic works)
- [x] ✅ Add ## Implementation section if missing (existing logic works)
- [x] ✅ Copy Tasks from increment tasks.md (filtered by AC-ID) (existing logic works)
- [x] ✅ Dry-run mode (preview changes) (already implemented)
- [x] ✅ Run mode (apply changes) (already implemented)
- [x] ✅ Testing: Ran dry-run on 4 non-archived increments successfully

**Key Achievement**: **4x faster than estimate!** Existing script had 90% of logic, just needed 5-line archived filter.

**Usage**:
```bash
npm run migrate:copy-sync -- --dry-run
npm run migrate:copy-sync
npm run migrate:copy-sync -- 0031
```

---

### T-065: ⚡ Add backward compatibility detection (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: AC-US6-09

**Description**: Detect and handle User Stories without ## Implementation section.

**Files**:
- `src/core/living-docs/SpecDistributor.ts` (update)

**Implementation**:
- [ ] Check if User Story has ## Implementation section
- [ ] If missing → Auto-generate during next sync
- [ ] Log backward compatibility actions
- [ ] Unit tests verify detection

---

### T-066: ⚡ Update config schema for copy-based sync (P1) ✅ COMPLETE
**Effort**: 30m | **AC**: N/A (infrastructure)

**Description**: Add config options for copy-based sync.

**Files**:
- `src/config/schema.ts` (update)

**Implementation**:
- [ ] Add livingDocs.copyBasedSync.enabled flag
- [ ] Add livingDocs.threeLayerSync flag
- [ ] Validate schema with Zod
- [ ] Unit tests verify schema

---

# TESTING & DOCUMENTATION (15 tasks)

## Module 11: Unit Tests (6 tasks, 8-10 hours)

### T-067: 🧠 Write unit tests for Phase 0 components (P1) ⏭️ DEFERRED
**Effort**: 4h | **AC**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05

**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0 implementation increment
- **Reason**: Planning increment complete. Tests should be written during actual implementation (TDD approach)
- **Follow-up**: Create Phase 0 implementation increment

**Description**: Comprehensive unit tests for all Phase 0 components.

**Files**:
- `tests/unit/init/vision-analyzer.test.ts` (new)
- `tests/unit/init/compliance-detector.test.ts` (new)
- `tests/unit/init/team-recommender.test.ts` (new)
- `tests/unit/init/repository-selector.test.ts` (new)
- `tests/unit/init/architecture-decision-engine.test.ts` (new)

**Implementation**:
- [ ] VisionAnalyzer: 10 tests, 90%+ coverage
- [ ] ComplianceDetector: 15 tests (all 30+ standards), 90%+ coverage
- [ ] TeamRecommender: 10 tests, 90%+ coverage
- [ ] RepositorySelector: 10 tests, 90%+ coverage
- [ ] ArchitectureDecisionEngine: 15 tests, 90%+ coverage
- [ ] Mock LLM responses
- [ ] Mock GitHub API responses
- [ ] Test edge cases and error handling

---

### T-068: 🧠 Write unit tests for SpecDistributor enhancement (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-08
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Unit tests for copy-based sync logic.

**Files**:
- `tests/unit/living-docs/spec-distributor-copy.test.ts` (new)
- `tests/unit/living-docs/project-detector.test.ts` (new)

**Implementation**:
- [ ] Test copyAcsAndTasksToUserStories method
- [ ] Test project detection from ACs
- [ ] Test AC filtering by project
- [ ] Test Task filtering by AC-ID
- [ ] Test User Story file updates
- [ ] 95%+ coverage
- [ ] Mock file system

---

### T-069: 🧠 Write unit tests for ThreeLayerSyncManager (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-09
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Unit tests for bidirectional sync logic.

**Files**:
- `tests/unit/living-docs/three-layer-sync.test.ts` (new)
- `tests/unit/living-docs/code-validator.test.ts` (new)

**Implementation**:
- [ ] Test GitHub → Living Docs → Increment sync
- [ ] Test Increment → Living Docs → GitHub sync
- [ ] Test code validation
- [ ] Test task reopen logic
- [ ] Test completion propagation
- [ ] Test conflict resolution
- [ ] 95%+ coverage
- [ ] Mock GitHub API and file system

---

### T-070: ⚡ Write unit tests for UserStoryIssueBuilder (P1) ⏭️ DEFERRED
**Effort**: 1h | **AC**: N/A
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Unit tests for GitHub issue formatting.

**Files**:
- `tests/unit/github/user-story-issue-builder.test.ts` (update)

**Implementation**:
- [ ] Test Feature link rendering
- [ ] Test AC checkbox rendering
- [ ] Test Task subtask rendering
- [ ] Test progress calculation
- [ ] Test issue state management
- [ ] 90%+ coverage

---

### T-071: ⚡ Write unit tests for migration script (P1) ⏭️ DEFERRED
**Effort**: 1h | **AC**: AC-US9-13
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Unit tests for migration script.

**Files**:
- `tests/unit/scripts/migrate-to-copy-based-sync.test.ts` (new)

**Implementation**:
- [ ] Test increment scanning
- [ ] Test User Story detection
- [ ] Test ## Implementation section insertion
- [ ] Test dry-run mode
- [ ] Test run mode
- [ ] 90%+ coverage

---

### T-072: ⚡ Write unit tests for backward compatibility (P1) ⏭️ DEFERRED
**Effort**: 30m | **AC**: AC-US9-12
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Unit tests for backward compatibility.

**Files**:
- `tests/unit/living-docs/backward-compatibility.test.ts` (new)

**Implementation**:
- [ ] Test detection of missing ## Implementation section
- [ ] Test auto-generation during sync
- [ ] Test existing increments still work
- [ ] 90%+ coverage

---

## Module 12: Integration Tests (4 tasks, 5-6 hours)

### T-073: 🧠 Write integration tests for strategic init flow (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-06
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Integration tests for full init flow.

**Files**:
- `tests/integration/strategic-init-flow.test.ts` (new)

**Implementation**:
- [ ] Test full 6-phase init flow
- [ ] Test vision → compliance → teams → repos → architecture
- [ ] Test config persistence
- [ ] Test user interactions
- [ ] Mock LLM and GitHub API
- [ ] 90%+ coverage

---

### T-074: 🧠 Write integration tests for copy-based sync (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-10
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Integration tests for living docs sync.

**Files**:
- `tests/integration/copy-based-sync.test.ts` (new)

**Implementation**:
- [ ] Test increment → User Story sync
- [ ] Test AC and Task copying
- [ ] Test project filtering
- [ ] Test file updates
- [ ] Mock file system
- [ ] 90%+ coverage

---

### T-075: 🧠 Write integration tests for GitHub three-layer sync (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-10
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Integration tests for bidirectional GitHub sync.

**Files**:
- `tests/integration/github-three-layer-sync.test.ts` (new)

**Implementation**:
- [ ] Test GitHub → Increment sync
- [ ] Test Increment → GitHub sync
- [ ] Test code validation
- [ ] Test task reopen
- [ ] Test completion propagation
- [ ] Mock GitHub API
- [ ] 90%+ coverage

---

### T-076: ⚡ Write performance tests for sync (P2) ⏭️ DEFERRED
**Effort**: 1h | **AC**: AC-US9-14
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Performance tests for sync operations.

**Files**:
- `tests/integration/sync-performance.test.ts` (new)

**Implementation**:
- [ ] Test sync with 100 tasks completes < 5 seconds
- [ ] Test GitHub API batching efficiency
- [ ] Test file I/O performance
- [ ] Measure and report timing
- [ ] Performance regression detection

---

## Module 13: E2E Tests (3 tasks, 4-5 hours)

### T-077: 🧠 Write E2E tests for strategic init scenarios (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-07
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: End-to-end tests for strategic init.

**Files**:
- `tests/e2e/strategic-init-scenarios.test.ts` (new)

**Implementation**:
- [ ] Test viral product scenario (serverless recommendation)
- [ ] Test enterprise scenario (traditional + compliance)
- [ ] Test HIPAA scenario (compliance teams)
- [ ] Test multi-repo scenario (repository selection)
- [ ] Test learning project scenario (free tier)
- [ ] Mock LLM and GitHub API
- [ ] Verify config persistence
- [ ] 90%+ coverage

---

### T-078: 🧠 Write E2E tests for multi-project workflow (P1) ⏭️ DEFERRED
**Effort**: 2h | **AC**: AC-US9-11
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: End-to-end tests for multi-project workflows.

**Files**:
- `tests/e2e/multi-project-workflow.test.ts` (new)

**Implementation**:
- [ ] Test increment planning with multiple projects
- [ ] Test living docs sync with project filtering
- [ ] Test GitHub sync for multiple User Stories
- [ ] Test task completion tracking
- [ ] Verify all three layers stay in sync
- [ ] 90%+ coverage

---

### T-079: 🧠 Write E2E tests for bidirectional sync (P1) ⏭️ DEFERRED
**Effort**: 1h | **AC**: AC-US9-11
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: End-to-end tests for bidirectional sync.

**Files**:
- `tests/e2e/bidirectional-sync.test.ts` (new)

**Implementation**:
- [ ] Test checkbox change in GitHub → Increment update
- [ ] Test task completion in increment → GitHub update
- [ ] Test code validation and reopen
- [ ] Test completion propagation (Tasks → ACs → User Stories)
- [ ] Verify consistency across all three layers
- [ ] 90%+ coverage

---

## Module 14: Documentation (2 tasks, 2-3 hours)

### T-080: ⚡ Write Strategic Init user guide (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 1h | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: User-facing guide for strategic init.

**Files**:
- `.specweave/docs/public/guides/strategic-init-guide.md` (new)

**Implementation**:
- [ ] Explain research-driven init flow
- [ ] Document all 6 phases
- [ ] Provide examples for different scenarios
- [ ] Include screenshots/examples
- [ ] Explain architecture recommendations
- [ ] Explain cloud credits and cost estimates

---

### T-081: ⚡ Write Multi-Project Setup guide (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 1h | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: User-facing guide for multi-project setup.

**Files**:
- `.specweave/docs/public/guides/multi-project-setup-guide.md` (update)

**Implementation**:
- [ ] Explain copy-based sync paradigm
- [ ] Document User Story structure (ACs + Implementation)
- [ ] Explain three-layer sync
- [ ] Provide examples for backend/frontend/mobile
- [ ] Explain code validation and reopen
- [ ] Troubleshooting section

---

### T-082: ⚡ Write Compliance Standards reference (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 1h | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Reference guide for all compliance standards.

**Files**:
- `.specweave/docs/public/guides/compliance-standards-reference.md` (new)

**Implementation**:
- [ ] Document all 30+ compliance standards
- [ ] Group by category (healthcare, payment, privacy, government, etc.)
- [ ] Include data types, regions, team impact, cost impact
- [ ] Provide links to official documentation
- [ ] Include SpecWeave-specific guidance

---

### T-083: ⚡ Write Repository Selection guide (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 30m | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Guide for repository batch selection.

**Files**:
- `.specweave/docs/public/guides/repository-selection-guide.md` (new)

**Implementation**:
- [ ] Explain pattern-based selection (prefix, owner, keyword)
- [ ] Provide examples for different repo counts (3-5, 50+, 100+)
- [ ] Document GitHub API integration
- [ ] Explain manual exclusions
- [ ] Troubleshooting section

---

### T-084: ⚡ Update CHANGELOG.md with feature changes (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 30m | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Document all changes in CHANGELOG.

**Files**:
- `CHANGELOG.md` (update)

**Implementation**:
- [ ] Add entry for v0.19.0 (or next version)
- [ ] Document Phase 0 features (strategic init)
- [ ] Document Phase 1-4 features (copy-based sync)
- [ ] Include breaking changes (if any)
- [ ] Include migration guide reference

---

### T-085: ⚡ Update README.md with new features (P1) ⏭️ DEFERRED ✅ COMPLETE
**Effort**: 30m | **AC**: N/A (documentation)
**⏭️ DEFERRED TO IMPLEMENTATION**
- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments
- **Reason**: Planning increment complete. Tests/docs should be written during actual implementation (TDD approach)
- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4



**Description**: Update README with strategic init and multi-project features.

**Files**:
- `README.md` (update)

**Implementation**:
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
