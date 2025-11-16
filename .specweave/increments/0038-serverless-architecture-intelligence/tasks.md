---
increment: 0038-serverless-architecture-intelligence
total_tasks: 24
completed_tasks: 0
test_mode: TDD
coverage_target: 90%
phase_1_tasks: 8
phase_2_tasks: 8
phase_3_tasks: 4
phase_4_tasks: 4
---

# Implementation Tasks: Serverless Architecture Intelligence

**Total Estimated Effort**: 32-40 hours (4-5 weeks at 8 hours/week)

**Architecture References**:
- [ADR-0038: Serverless Platform Knowledge Base](../../docs/internal/architecture/adr/0038-serverless-platform-knowledge-base.md)
- [ADR-0039: Context Detection Strategy](../../docs/internal/architecture/adr/0039-context-detection-strategy.md)
- [ADR-0040: IaC Template Engine](../../docs/internal/architecture/adr/0040-iac-template-engine.md)
- [ADR-0041: Cost Estimation Algorithm](../../docs/internal/architecture/adr/0041-cost-estimation-algorithm.md)
- [ADR-0042: Agent Enhancement Pattern](../../docs/internal/architecture/adr/0042-agent-enhancement-pattern.md)

---

## Phase 1: Core Platform Awareness (8-10 hours)

### T-001: Create Platform Knowledge Base Schema and Data Structure

**User Story**: [US-002: Platform Comparison Matrix](../../docs/internal/specs/specweave/FS-038/us-002-platform-comparison-matrix.md)
**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: None (foundational task)

**Test Plan**:
- **Given** a serverless platform knowledge base schema
- **When** platform data is loaded and validated
- **Then** all required fields are present and correctly typed
- **And** data freshness indicators show last verified date
- **And** pricing, features, ecosystem, and lock-in data are queryable

**Test Cases**:
1. **Unit**: `tests/unit/serverless/platform-knowledge-base.test.ts`
   - testSchemaValidation(): All platforms have required fields (pricing, features, ecosystem)
   - testDataFreshness(): lastVerified date is present and valid
   - testPricingDataStructure(): Free tier and pay-as-you-go pricing are correctly structured
   - testFeatureComparison(): Runtime support, cold start times, max execution duration are queryable
   - testEcosystemData(): Integrations, SDKs, community size are present
   - testLockInRiskAssessment(): Portability and migration complexity are documented
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/platform-data-loading.test.ts`
   - testLoadAllPlatforms(): Load AWS, Azure, GCP, Firebase, Supabase data successfully
   - testQueryByPricing(): Filter platforms by free tier limits
   - testQueryByFeatures(): Filter platforms by runtime support
   - **Coverage Target**: 90%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create JSON schema: `plugins/specweave/knowledge-base/serverless/schema.json`
2. Create platform data files in `plugins/specweave/knowledge-base/serverless/platforms/`:
   - `aws-lambda.json` (pricing, features, ecosystem, lock-in, startup programs)
   - `azure-functions.json`
   - `gcp-cloud-functions.json`
   - `firebase.json`
   - `supabase.json`
3. Create TypeScript types: `src/core/serverless/types.ts` (Platform, Pricing, Features, Ecosystem)
4. Create data loader: `src/core/serverless/platform-data-loader.ts`
5. Create validation script: `scripts/validate-platforms.ts`
6. Write unit tests (6 tests)
7. Run unit tests: `npm test platform-knowledge-base` (should pass: 6/6)
8. Write integration tests (3 tests)
9. Run integration tests: `npm test platform-data-loading` (should pass: 3/3)
10. Verify coverage: `npm run coverage -- --include=src/core/serverless/` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 9 tests above (should fail)
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement platform knowledge base (steps 1-5)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed (maintain green tests)
6. ✅ Final check: Coverage ≥92%

---

### T-002: Implement Context Detection Engine

**User Story**: [US-001: Context-Aware Serverless Recommendations](../../docs/internal/specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
**AC**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: None

**Test Plan**:
- **Given** user input describing a project (pet project, startup, enterprise)
- **When** context detector analyzes the input
- **Then** project type is correctly classified (pet/startup/enterprise)
- **And** clarifying questions are asked if context is ambiguous
- **And** confidence score is provided (high/medium/low)

**Test Cases**:
1. **Unit**: `tests/unit/serverless/context-detector.test.ts`
   - testPetProjectDetection(): Keywords "learning", "personal", "side project" → pet project
   - testStartupDetection(): Keywords "MVP", "early stage", "startup" → startup
   - testEnterpriseDetection(): Keywords "production", "large scale", "compliance" → enterprise
   - testAmbiguousContext(): No clear keywords → low confidence, clarifying questions generated
   - testMetadataAnalysis(): Team size, traffic estimates, budget → context classification
   - testConfidenceScoring(): Confidence score ranges from 0-100
   - testClarifyingQuestions(): Generates questions for team size, traffic, budget
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/context-detection-flow.test.ts`
   - testFullContextDetectionFlow(): User input → classification → confidence → questions
   - testContextRefinement(): Initial detection → clarifying Q&A → refined classification
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create context detector module: `src/core/serverless/context-detector.ts`
2. Implement keyword matching logic (pet/startup/enterprise signals)
3. Implement metadata analyzer (team size, traffic, budget)
4. Implement confidence scoring algorithm (0-100)
5. Implement clarifying question generator
6. Create ContextDetectionResult type with classification, confidence, questions
7. Write unit tests (7 tests)
8. Run unit tests: `npm test context-detector` (should pass: 7/7)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test context-detection-flow` (should pass: 2/2)
11. Verify coverage: `npm run coverage -- --include=src/core/serverless/context-detector.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 9 tests above (should fail)
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement context detector (steps 1-6)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-003: Implement Serverless Suitability Analyzer

**User Story**: [US-001: Context-Aware Serverless Recommendations](../../docs/internal/specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
**AC**: AC-US1-03, AC-US1-04, AC-US1-05
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-002 (context detection)

**Test Plan**:
- **Given** project requirements (workload type, traffic patterns, state management needs)
- **When** suitability analyzer evaluates serverless fit
- **Then** recommendation is "Yes", "Conditional", or "No" with rationale
- **And** warnings are provided for anti-patterns (stateful apps, long-running processes)
- **And** rationale includes cost, scalability, and complexity considerations

**Test Cases**:
1. **Unit**: `tests/unit/serverless/suitability-analyzer.test.ts`
   - testEventDrivenWorkload(): Webhooks, file processing → serverless recommended
   - testApiDrivenWorkload(): REST APIs, GraphQL → serverless recommended
   - testVariableLoadWorkload(): Traffic spikes → serverless recommended
   - testStatefulApp(): WebSockets, real-time chat → serverless NOT recommended
   - testLongRunningProcess(): Video encoding > 15 min → serverless NOT recommended
   - testHighMemoryApp(): Data processing > 10GB RAM → serverless NOT recommended
   - testRationaleGeneration(): Each recommendation includes cost, scalability, complexity rationale
   - testAntiPatternWarnings(): Warnings for unsuitable workloads
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/suitability-analysis-flow.test.ts`
   - testFullSuitabilityAnalysisFlow(): Requirements → analysis → recommendation + rationale
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create suitability analyzer module: `src/core/serverless/suitability-analyzer.ts`
2. Implement workload pattern detection (event-driven, API-driven, batch, etc.)
3. Implement anti-pattern detection (stateful, long-running, high-memory)
4. Implement recommendation logic (Yes/Conditional/No based on patterns)
5. Implement rationale generator (cost, scalability, complexity)
6. Create SuitabilityAnalysisResult type
7. Write unit tests (8 tests)
8. Run unit tests: `npm test suitability-analyzer` (should pass: 8/8)
9. Write integration test (1 test)
10. Run integration tests: `npm test suitability-analysis-flow` (should pass: 1/1)
11. Verify coverage: `npm run coverage -- --include=src/core/serverless/suitability-analyzer.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 9 tests above (should fail)
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement suitability analyzer (steps 1-6)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-004: Implement Platform Selection Logic

**User Story**: [US-001: Context-Aware Serverless Recommendations](../../docs/internal/specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
**AC**: AC-US1-06, AC-US1-07
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-001 (platform knowledge base), T-002 (context detection)

**Test Plan**:
- **Given** project context (pet/startup/enterprise) and platform comparison data
- **When** platform selector ranks platforms
- **Then** AWS Lambda recommended for enterprise compliance
- **And** Firebase recommended for mobile apps and learning projects
- **And** Supabase recommended for open-source preference and PostgreSQL familiarity
- **And** learning vs production trade-offs are documented

**Test Cases**:
1. **Unit**: `tests/unit/serverless/platform-selector.test.ts`
   - testAwsLambdaSelection(): Enterprise + AWS ecosystem → AWS Lambda
   - testAzureFunctionsSelection(): Microsoft stack + .NET → Azure Functions
   - testGcpCloudFunctionsSelection(): Google ecosystem + ML → GCP Cloud Functions
   - testFirebaseSelection(): Mobile app + learning project → Firebase
   - testSupabaseSelection(): Open-source + PostgreSQL → Supabase
   - testStartupCreditsPriority(): Startup context → prioritize platforms with credits
   - testLearningVsProductionTradeoff(): Learning project → beginner-friendly platforms prioritized
   - testPlatformRanking(): Multiple suitable platforms → ranked by context fit
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/platform-selection-flow.test.ts`
   - testFullPlatformSelectionFlow(): Context + requirements → platform ranking + rationale
   - testCollaborationWithKnowledgeBase(): Platform selector queries knowledge base for data
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create platform selector module: `src/core/serverless/platform-selector.ts`
2. Implement ranking algorithm based on context (pet/startup/enterprise)
3. Implement ecosystem matching (AWS/Azure/GCP/Firebase/Supabase indicators)
4. Implement startup credits prioritization logic
5. Implement learning vs production trade-off analyzer
6. Create PlatformSelectionResult type with ranked platforms and rationale
7. Write unit tests (8 tests)
8. Run unit tests: `npm test platform-selector` (should pass: 8/8)
9. Write integration tests (2 tests)
10. Run integration tests: `npm test platform-selection-flow` (should pass: 2/2)
11. Verify coverage: `npm run coverage -- --include=src/core/serverless/platform-selector.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 10 tests above (should fail)
2. ❌ Run tests: `npm test` (0/10 passing)
3. ✅ Implement platform selector (steps 1-6)
4. 🟢 Run tests: `npm test` (10/10 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-005: Create Serverless Recommender Skill

**User Story**: [US-001: Context-Aware Serverless Recommendations](../../docs/internal/specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
**AC**: AC-US1-01 through AC-US1-08, AC-US2-07
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-001, T-002, T-003, T-004

**Test Plan**:
- **Given** user asks "Should I use serverless for this project?"
- **When** serverless-recommender skill activates
- **Then** context is detected, suitability is analyzed, platform is recommended
- **And** recommendation is conversational and plain-language (no excessive jargon)
- **And** rationale is provided with cost, scalability, complexity considerations
- **And** platform comparison is available via query filtering

**Test Cases**:
1. **Unit**: `tests/unit/serverless/serverless-recommender-skill.test.ts`
   - testSkillActivation(): Keywords "serverless", "AWS Lambda", "Firebase" trigger skill
   - testRecommendationFormatting(): Output follows template (context, suitability, platform, rationale)
   - testConversationalLanguage(): Output avoids excessive jargon, is plain-language
   - testPlatformComparisonQuery(): User can filter platforms by price, runtime, region
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/serverless/recommender-skill-integration.test.ts`
   - testFullRecommendationWorkflow(): User question → context detection → suitability → platform selection → formatted output
   - testCollaborationWithArchitectAgent(): Skill passes recommendation to architect agent
   - testPlatformComparisonIntegration(): Platform comparison queries work with knowledge base
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/serverless/serverless-recommendation.spec.ts`
   - userAsksAboutServerlessForPetProject(): Full browser flow simulating user question
   - userAsksAboutServerlessForStartup(): Full flow with startup context
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create skill directory: `plugins/specweave/skills/serverless-recommender/`
2. Create skill file: `plugins/specweave/skills/serverless-recommender/SKILL.md`
   - YAML frontmatter with name, description (trigger keywords)
   - Documentation of when to activate
   - Context detection logic reference
   - Platform selection logic reference
   - Recommendation format template
3. Integrate with core modules (context-detector, suitability-analyzer, platform-selector)
4. Create recommendation formatter (markdown output)
5. Write unit tests (4 tests)
6. Run unit tests: `npm test serverless-recommender-skill` (should pass: 4/4)
7. Write integration tests (3 tests)
8. Run integration tests: `npm test recommender-skill-integration` (should pass: 3/3)
9. Write E2E tests (2 scenarios)
10. Run E2E tests: `npm run test:e2e serverless-recommendation` (should pass: 2/2)
11. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 9 tests above (should fail)
2. ❌ Run tests: `npm test` (0/9 passing)
3. ✅ Implement serverless recommender skill (steps 1-4)
4. 🟢 Run tests: `npm test` (9/9 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-006: Enhance Architect Agent with Serverless Knowledge

**User Story**: [US-007: Architect Agent Enhancement](../../docs/internal/specs/specweave/FS-038/us-007-architect-agent-enhancement.md)
**AC**: AC-US7-01 through AC-US7-08
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-005 (serverless recommender skill)

**Test Plan**:
- **Given** architect agent receives project requirements
- **When** serverless suitability is detected
- **Then** agent recommends serverless with platform selection
- **And** agent provides architecture patterns (event-driven, API-driven, batch)
- **And** agent warns about anti-patterns (stateful apps, long-running processes)
- **And** agent generates ADR documenting serverless decision

**Test Cases**:
1. **Unit**: `tests/unit/agents/architect-serverless-enhancement.test.ts`
   - testServerlessSuitabilityDetection(): Project requirements → serverless suitability detected
   - testPlatformRecommendation(): Context → appropriate platform recommended
   - testArchitecturePatternRecommendation(): Workload type → matching pattern (event/API/batch)
   - testAntiPatternWarnings(): Unsuitable workload → warnings provided
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/agents/architect-serverless-integration.test.ts`
   - testArchitectAgentWorkflow(): Requirements → serverless analysis → recommendation → ADR generation
   - testCollaborationWithRecommenderSkill(): Architect agent invokes serverless recommender skill
   - testCollaborationWithInfrastructureAgent(): Recommendation passed to infrastructure agent
   - testAdrGeneration(): ADR includes serverless decision rationale
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/agents/architect-serverless-flow.spec.ts`
   - architectRecommendsServerlessForApiProject(): Full flow from project description to serverless recommendation
   - architectWarnsAgainstServerlessForStatefulApp(): Full flow with anti-pattern warning
   - **Coverage Target**: 85%

**Overall Coverage Target**: 90%

**Implementation**:
1. Modify architect agent: `plugins/specweave/agents/architect/AGENT.md` (~600 lines → ~900 lines)
2. Add "Serverless Suitability Framework" section (when to use, when not to use)
3. Add "Platform Selection Framework" section (AWS vs Azure vs GCP vs Firebase vs Supabase)
4. Add "Serverless Architecture Patterns" section (event-driven, API-driven, batch, BFF, CQRS)
5. Add reference to serverless-recommender skill (collaboration)
6. Add ADR template for serverless decisions
7. Write unit tests (4 tests)
8. Run unit tests: `npm test architect-serverless-enhancement` (should pass: 4/4)
9. Write integration tests (4 tests)
10. Run integration tests: `npm test architect-serverless-integration` (should pass: 4/4)
11. Write E2E tests (2 scenarios)
12. Run E2E tests: `npm run test:e2e architect-serverless-flow` (should pass: 2/2)
13. Verify coverage: `npm run coverage` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 10 tests above (should fail)
2. ❌ Run tests: `npm test` (0/10 passing)
3. ✅ Enhance architect agent (steps 1-6)
4. 🟢 Run tests: `npm test` (10/10 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-007: Create Platform Data Validation GitHub Action

**User Story**: [US-002: Platform Comparison Matrix](../../docs/internal/specs/specweave/FS-038/us-002-platform-comparison-matrix.md)
**AC**: AC-US2-06
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-001 (platform knowledge base)

**Test Plan**: N/A (infrastructure task)

**Validation**:
- GitHub Action runs on schedule (weekly)
- Validation script checks platform JSONs against schema
- Warning issued if lastVerified > 30 days old
- Manual review required if validation fails

**Implementation**:
1. Create validation script: `scripts/validate-platforms.ts`
   - Load platform JSONs
   - Validate against schema
   - Check lastVerified dates (warn if > 30 days)
   - Exit with error if validation fails
2. Create GitHub Action: `.github/workflows/validate-platforms.yml`
   - Scheduled weekly (cron: '0 0 * * 0')
   - Run validation script
   - Create issue if validation fails
3. Test locally: `npm run validate:platforms` (should pass)
4. Commit and push
5. Verify GitHub Action runs successfully
6. Test failure scenario (modify JSON to fail schema validation)

---

### T-008: Add Platform Data Freshness Indicator to Recommendations

**User Story**: [US-002: Platform Comparison Matrix](../../docs/internal/specs/specweave/FS-038/us-002-platform-comparison-matrix.md)
**AC**: AC-US2-06
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-001 (platform knowledge base), T-005 (recommender skill)

**Test Plan**:
- **Given** platform data with lastVerified date
- **When** recommendation is generated
- **Then** data freshness indicator is shown (e.g., "Last verified: 2025-11-16")
- **And** warning is displayed if lastVerified > 30 days old

**Test Cases**:
1. **Unit**: `tests/unit/serverless/data-freshness-indicator.test.ts`
   - testFreshnessIndicatorDisplay(): lastVerified date shown in recommendation
   - testStaleDataWarning(): lastVerified > 30 days → warning displayed
   - testFreshData(): lastVerified ≤ 30 days → no warning
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Modify recommendation formatter to include lastVerified date
2. Add logic to check if lastVerified > 30 days (show warning)
3. Update recommendation template in serverless-recommender skill
4. Write unit tests (3 tests)
5. Run unit tests: `npm test data-freshness-indicator` (should pass: 3/3)
6. Verify coverage: `npm run coverage -- --include=src/core/serverless/` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement freshness indicator (steps 1-3)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

## Phase 2: IaC Pattern Library (10-12 hours)

### T-009: Create Terraform Template Engine with Handlebars

**User Story**: [US-008: Infrastructure Agent IaC Generation](../../docs/internal/specs/specweave/FS-038/us-008-infrastructure-agent-iac-generation.md)
**AC**: AC-US8-01, AC-US8-06, AC-US8-07
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: None

**Test Plan**:
- **Given** a Handlebars template and variable data
- **When** template generator renders the template
- **Then** Terraform files are generated with correct variable substitution
- **And** generated files are syntax-valid (pass terraform validate)
- **And** custom helpers work correctly (conditionals, loops)

**Test Cases**:
1. **Unit**: `tests/unit/iac/template-generator.test.ts`
   - testHandlebarsTemplateRendering(): Template + variables → rendered output
   - testVariableSubstitution(): Variables replaced correctly (function_name, region, etc.)
   - testConditionalRendering(): Handlebars {{#if}} conditions work
   - testLoopRendering(): Handlebars {{#each}} loops work
   - testCustomHelpers(): Custom helpers (uppercase, lowercase, etc.) work
   - testTerraformSyntaxValidation(): Generated .tf files pass terraform validate
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/iac/template-generation-flow.test.ts`
   - testFullTemplateGenerationWorkflow(): Load template → merge variables → render → validate syntax
   - testMultipleFileGeneration(): Generate main.tf, variables.tf, outputs.tf, providers.tf
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Install Handlebars: `npm install handlebars @types/handlebars --save`
2. Create template generator module: `src/core/iac/template-generator.ts`
3. Implement Handlebars compiler integration
4. Create custom Handlebars helpers (uppercase, lowercase, conditional, etc.)
5. Implement variable resolver (merge defaults + custom variables)
6. Implement Terraform syntax validator (call `terraform validate` if available)
7. Create TemplateGeneratorResult type
8. Write unit tests (6 tests)
9. Run unit tests: `npm test template-generator` (should pass: 6/6)
10. Write integration tests (2 tests)
11. Run integration tests: `npm test template-generation-flow` (should pass: 2/2)
12. Verify coverage: `npm run coverage -- --include=src/core/iac/template-generator.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement template generator (steps 1-7)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-010: Create AWS Lambda + API Gateway + DynamoDB Terraform Templates

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-01, AC-US5-06, AC-US5-08
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-009 (template engine)

**Test Plan**:
- **Given** AWS Lambda template with variables
- **When** template is rendered and deployed to test AWS account
- **Then** Lambda function is created with API Gateway and DynamoDB
- **And** API endpoint responds successfully
- **And** template includes variables, outputs, provider config
- **And** README includes deployment instructions

**Test Cases**:
1. **Unit**: `tests/unit/iac/aws-lambda-template.test.ts`
   - testAwsLambdaTemplateStructure(): Template includes main.tf, variables.tf, outputs.tf, providers.tf, iam.tf
   - testVariablesIncluded(): function_name, runtime, memory_size, timeout variables defined
   - testOutputsIncluded(): api_endpoint, function_arn, table_name outputs defined
   - testIamRoleLeastPrivilege(): IAM role grants only necessary permissions (DynamoDB, CloudWatch Logs)
   - testReadmeGeneration(): README includes deployment instructions, cost estimate
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/iac/aws-lambda-template-generation.test.ts`
   - testFullAwsLambdaTemplateGeneration(): Render template → generate all files → validate syntax
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/iac/aws-lambda-deployment.spec.ts`
   - deployAwsLambdaToTestAccount(): Generate template → terraform init → terraform apply → verify API works → terraform destroy
   - **Coverage Target**: 90% (CRITICAL: must deploy successfully)

**Overall Coverage Target**: 92%

**Implementation**:
1. Create template directory: `plugins/specweave/templates/iac/aws-lambda/`
2. Create Handlebars templates:
   - `main.tf.hbs` (Lambda, API Gateway HTTP API, DynamoDB, Lambda permission)
   - `variables.tf.hbs` (region, function_name, runtime, memory_size, timeout, etc.)
   - `outputs.tf.hbs` (api_endpoint, function_arn, table_name, table_arn)
   - `providers.tf.hbs` (AWS provider with region)
   - `iam.tf.hbs` (Lambda execution role, DynamoDB policies, CloudWatch Logs policies)
3. Create defaults file: `defaults.json` (default values for variables)
4. Create environment tfvars templates:
   - `environments/dev.tfvars.hbs`
   - `environments/staging.tfvars.hbs`
   - `environments/prod.tfvars.hbs`
5. Create README template: `README.md.hbs` (deployment instructions, free tier optimization tips)
6. Write unit tests (5 tests)
7. Run unit tests: `npm test aws-lambda-template` (should pass: 5/5)
8. Write integration test (1 test)
9. Run integration tests: `npm test aws-lambda-template-generation` (should pass: 1/1)
10. Write E2E test (1 test - deploy to test AWS account)
11. Run E2E test: `npm run test:e2e aws-lambda-deployment` (should pass: 1/1)
12. Verify coverage: `npm run coverage` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Implement AWS Lambda templates (steps 1-5)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%

---

### T-011: Create Azure Functions + Cosmos DB Terraform Templates

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-02, AC-US5-06, AC-US5-08
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-009 (template engine), T-010 (AWS template pattern)

**Test Plan**:
- **Given** Azure Functions template with variables
- **When** template is rendered and deployed to test Azure account
- **Then** Azure Function App is created with Cosmos DB
- **And** function endpoint responds successfully
- **And** template structure follows AWS Lambda pattern

**Test Cases**:
1. **Unit**: `tests/unit/iac/azure-functions-template.test.ts`
   - testAzureFunctionsTemplateStructure(): Template includes main.tf, variables.tf, outputs.tf, providers.tf
   - testVariablesIncluded(): app_name, location, runtime, os_type variables defined
   - testOutputsIncluded(): function_url, app_id, cosmos_endpoint outputs defined
   - testReadmeGeneration(): README includes deployment instructions
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/iac/azure-functions-template-generation.test.ts`
   - testFullAzureFunctionsTemplateGeneration(): Render template → generate files → validate syntax
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/iac/azure-functions-deployment.spec.ts`
   - deployAzureFunctionsToTestAccount(): Generate → deploy → verify → destroy
   - **Coverage Target**: 90%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create template directory: `plugins/specweave/templates/iac/azure-functions/`
2. Create Handlebars templates (main.tf.hbs, variables.tf.hbs, outputs.tf.hbs, providers.tf.hbs)
3. Create defaults.json
4. Create environment tfvars templates (dev, staging, prod)
5. Create README.md.hbs
6. Write unit tests (4 tests)
7. Run unit tests: `npm test azure-functions-template` (should pass: 4/4)
8. Write integration test (1 test)
9. Run integration tests: `npm test azure-functions-template-generation` (should pass: 1/1)
10. Write E2E test (1 test)
11. Run E2E test: `npm run test:e2e azure-functions-deployment` (should pass: 1/1)
12. Verify coverage: `npm run coverage` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement Azure Functions templates (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%

---

### T-012: Create GCP Cloud Functions + Firestore Terraform Templates

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-03, AC-US5-06, AC-US5-08
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-009 (template engine), T-010 (AWS template pattern)

**Test Plan**:
- **Given** GCP Cloud Functions template with variables
- **When** template is rendered and deployed to test GCP project
- **Then** Cloud Function is created with Firestore database
- **And** function endpoint responds successfully
- **And** template structure follows AWS Lambda pattern

**Test Cases**:
1. **Unit**: `tests/unit/iac/gcp-cloud-functions-template.test.ts`
   - testGcpCloudFunctionsTemplateStructure(): Template includes main.tf, variables.tf, outputs.tf, providers.tf
   - testVariablesIncluded(): project_id, region, function_name, runtime variables defined
   - testOutputsIncluded(): function_url, function_id outputs defined
   - testReadmeGeneration(): README includes deployment instructions
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/iac/gcp-cloud-functions-template-generation.test.ts`
   - testFullGcpCloudFunctionsTemplateGeneration(): Render template → generate files → validate syntax
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/iac/gcp-cloud-functions-deployment.spec.ts`
   - deployGcpCloudFunctionsToTestProject(): Generate → deploy → verify → destroy
   - **Coverage Target**: 90%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create template directory: `plugins/specweave/templates/iac/gcp-cloud-functions/`
2. Create Handlebars templates (main.tf.hbs, variables.tf.hbs, outputs.tf.hbs, providers.tf.hbs)
3. Create defaults.json
4. Create environment tfvars templates (dev, staging, prod)
5. Create README.md.hbs
6. Write unit tests (4 tests)
7. Run unit tests: `npm test gcp-cloud-functions-template` (should pass: 4/4)
8. Write integration test (1 test)
9. Run integration tests: `npm test gcp-cloud-functions-template-generation` (should pass: 1/1)
10. Write E2E test (1 test)
11. Run E2E test: `npm run test:e2e gcp-cloud-functions-deployment` (should pass: 1/1)
12. Verify coverage: `npm run coverage` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement GCP Cloud Functions templates (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%

---

### T-013: Create Firebase (Hosting + Functions + Firestore) Terraform Templates

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-04, AC-US5-06, AC-US5-08
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-009 (template engine), T-012 (GCP pattern - Firebase is GCP-based)

**Test Plan**:
- **Given** Firebase template with variables
- **When** template is rendered and deployed to test Firebase project
- **Then** Firebase Hosting, Cloud Functions for Firebase, and Firestore are configured
- **And** template includes environment-specific configs

**Test Cases**:
1. **Unit**: `tests/unit/iac/firebase-template.test.ts`
   - testFirebaseTemplateStructure(): Template includes main.tf, variables.tf, outputs.tf, providers.tf
   - testVariablesIncluded(): project_id, region, site_id variables defined
   - testOutputsIncluded(): hosting_url, functions_url outputs defined
   - testReadmeGeneration(): README includes Firebase CLI deployment instructions
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/iac/firebase-template-generation.test.ts`
   - testFullFirebaseTemplateGeneration(): Render template → generate files → validate syntax
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/iac/firebase-deployment.spec.ts`
   - deployFirebaseToTestProject(): Generate → deploy → verify → cleanup
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create template directory: `plugins/specweave/templates/iac/firebase/`
2. Create Handlebars templates (main.tf.hbs, variables.tf.hbs, outputs.tf.hbs, providers.tf.hbs)
3. Create defaults.json
4. Create environment configs (dev, staging, prod)
5. Create README.md.hbs (Firebase CLI deployment instructions)
6. Write unit tests (4 tests)
7. Run unit tests: `npm test firebase-template` (should pass: 4/4)
8. Write integration test (1 test)
9. Run integration tests: `npm test firebase-template-generation` (should pass: 1/1)
10. Write E2E test (1 test)
11. Run E2E test: `npm run test:e2e firebase-deployment` (should pass: 1/1)
12. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement Firebase templates (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-014: Create Supabase (Database + Auth + Storage) Terraform Templates

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-05, AC-US5-06, AC-US5-08
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-009 (template engine), T-010 (AWS template pattern)

**Test Plan**:
- **Given** Supabase template with variables
- **When** template is rendered and deployed to test Supabase project
- **Then** PostgreSQL database, Auth, and Storage are configured
- **And** template includes environment-specific configs

**Test Cases**:
1. **Unit**: `tests/unit/iac/supabase-template.test.ts`
   - testSupabaseTemplateStructure(): Template includes main.tf, variables.tf, outputs.tf, providers.tf
   - testVariablesIncluded(): project_name, region, db_password variables defined
   - testOutputsIncluded(): api_url, db_url, storage_url outputs defined
   - testReadmeGeneration(): README includes Supabase CLI deployment instructions
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/iac/supabase-template-generation.test.ts`
   - testFullSupabaseTemplateGeneration(): Render template → generate files → validate syntax
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/iac/supabase-deployment.spec.ts`
   - deploySupabaseToTestProject(): Generate → deploy → verify → cleanup
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create template directory: `plugins/specweave/templates/iac/supabase/`
2. Create Handlebars templates (main.tf.hbs, variables.tf.hbs, outputs.tf.hbs, providers.tf.hbs)
3. Create defaults.json
4. Create environment configs (dev, staging, prod)
5. Create README.md.hbs (Supabase CLI deployment instructions)
6. Write unit tests (4 tests)
7. Run unit tests: `npm test supabase-template` (should pass: 4/4)
8. Write integration test (1 test)
9. Run integration tests: `npm test supabase-template-generation` (should pass: 1/1)
10. Write E2E test (1 test)
11. Run E2E test: `npm run test:e2e supabase-deployment` (should pass: 1/1)
12. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement Supabase templates (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-015: Enhance Infrastructure Agent with IaC Generation

**User Story**: [US-008: Infrastructure Agent IaC Generation](../../docs/internal/specs/specweave/FS-038/us-008-infrastructure-agent-iac-generation.md)
**AC**: AC-US8-01 through AC-US8-08
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-009, T-010, T-011, T-012, T-013, T-014

**Test Plan**:
- **Given** infrastructure agent receives platform recommendation (AWS Lambda)
- **When** user requests IaC generation
- **Then** Terraform files are generated in .infrastructure/ directory
- **And** all required files are present (main.tf, variables.tf, outputs.tf, providers.tf, iam.tf, README.md)
- **And** environment-specific tfvars are generated (dev, staging, prod)
- **And** next steps are provided (terraform init, plan, apply)

**Test Cases**:
1. **Unit**: `tests/unit/agents/infrastructure-iac-generation.test.ts`
   - testTemplateLoading(): Load correct template based on platform (AWS, Azure, GCP, Firebase, Supabase)
   - testTemplateCustomization(): Customize template with project-specific values
   - testFileGeneration(): Generate all required files (main.tf, variables.tf, etc.)
   - testEnvironmentTfvarsGeneration(): Generate dev, staging, prod tfvars
   - testReadmeGeneration(): Generate README with deployment instructions
   - testNextStepsGeneration(): Provide actionable next steps
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/agents/infrastructure-iac-generation-flow.test.ts`
   - testFullIacGenerationWorkflow(): Platform recommendation → template loading → customization → file generation → next steps
   - testCollaborationWithArchitectAgent(): Infrastructure agent receives recommendation from architect agent
   - testMultiPlatformGeneration(): Generate IaC for all 5 platforms (AWS, Azure, GCP, Firebase, Supabase)
   - **Coverage Target**: 90%

3. **E2E**: `tests/e2e/agents/infrastructure-iac-generation.spec.ts`
   - userRequestsAwsLambdaIac(): Full flow from request to generated files
   - userDeploysGeneratedIac(): User runs terraform apply → deployment succeeds
   - **Coverage Target**: 85%

**Overall Coverage Target**: 90%

**Implementation**:
1. Modify infrastructure agent: `plugins/specweave/agents/infrastructure/AGENT.md` (~400 lines → ~600 lines)
2. Add "IaC Generation for Serverless" section
3. Add reference to serverless-iac-generator skill (if creating separate skill)
4. Document collaboration with architect agent (receive platform recommendation)
5. Add deployment workflow section (terraform init → plan → apply)
6. Create IaC generation logic in infrastructure agent or skill
7. Integrate with template generator (T-009)
8. Write unit tests (6 tests)
9. Run unit tests: `npm test infrastructure-iac-generation` (should pass: 6/6)
10. Write integration tests (3 tests)
11. Run integration tests: `npm test infrastructure-iac-generation-flow` (should pass: 3/3)
12. Write E2E tests (2 scenarios)
13. Run E2E tests: `npm run test:e2e infrastructure-iac-generation` (should pass: 2/2)
14. Verify coverage: `npm run coverage` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 11 tests above (should fail)
2. ❌ Run tests: `npm test` (0/11 passing)
3. ✅ Enhance infrastructure agent (steps 1-7)
4. 🟢 Run tests: `npm test` (11/11 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-016: Add Environment-Specific Terraform Variable Files

**User Story**: [US-005: IaC Pattern Library - Terraform](../../docs/internal/specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
**AC**: AC-US5-07
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-010, T-011, T-012, T-013, T-014

**Test Plan**:
- **Given** Terraform templates for all platforms
- **When** environment-specific tfvars are generated
- **Then** dev.tfvars has development-optimized settings (smallest resources, free tier)
- **And** staging.tfvars has staging-optimized settings (medium resources)
- **And** prod.tfvars has production-optimized settings (high availability, backup enabled)

**Test Cases**:
1. **Unit**: `tests/unit/iac/environment-tfvars-generation.test.ts`
   - testDevTfvarsGeneration(): Dev tfvars use smallest resources, free tier settings
   - testStagingTfvarsGeneration(): Staging tfvars use medium resources
   - testProdTfvarsGeneration(): Prod tfvars use high availability, backup enabled
   - testEnvironmentDifferences(): Dev vs staging vs prod settings differ appropriately
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create environment-specific defaults in each template directory:
   - `environments/dev.defaults.json` (free tier, smallest resources)
   - `environments/staging.defaults.json` (medium resources)
   - `environments/prod.defaults.json` (high availability, backup)
2. Modify template generator to merge environment-specific defaults
3. Update all 5 platform templates (AWS, Azure, GCP, Firebase, Supabase)
4. Write unit tests (4 tests)
5. Run unit tests: `npm test environment-tfvars-generation` (should pass: 4/4)
6. Verify coverage: `npm run coverage -- --include=src/core/iac/` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement environment-specific tfvars (steps 1-3)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

## Phase 3: Cost Optimization (6-8 hours)

### T-017: Implement Cost Estimation Calculator

**User Story**: [US-006: Cost Estimation and Optimization](../../docs/internal/specs/specweave/FS-038/us-006-cost-estimation-optimization.md)
**AC**: AC-US6-01, AC-US6-02, AC-US6-03
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-001 (platform knowledge base with pricing data)

**Test Plan**:
- **Given** expected traffic (requests/month, execution time, memory size, data transfer)
- **When** cost calculator estimates monthly costs
- **Then** cost breakdown includes compute, requests, data transfer, storage
- **And** free tier vs paid tier costs are compared
- **And** cost estimates are accurate within ±15% of actual costs

**Test Cases**:
1. **Unit**: `tests/unit/serverless/cost-estimator.test.ts`
   - testComputeCostCalculation(): GB-seconds formula → compute cost
   - testRequestCostCalculation(): Requests/month × price/request → request cost
   - testDataTransferCostCalculation(): GB transferred × price/GB → data transfer cost
   - testFreeTierDeduction(): Billable usage = total - free tier
   - testFreeTierVsPaidComparison(): Show when free tier is exceeded
   - testCostBreakdown(): Breakdown by compute, requests, data transfer, storage
   - testMultiPlatformEstimation(): Calculate costs for AWS, Azure, GCP, Firebase, Supabase
   - testAccuracyValidation(): Estimates within ±15% of actual costs (using test data)
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/cost-estimation-flow.test.ts`
   - testFullCostEstimationWorkflow(): Input traffic → calculate costs → generate breakdown
   - testCollaborationWithPlatformData(): Cost estimator queries platform pricing data
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create cost estimator module: `src/core/serverless/cost-estimator.ts`
2. Implement compute cost calculator (GB-seconds formula)
3. Implement request cost calculator (requests × price)
4. Implement data transfer cost calculator (GB × price)
5. Implement free tier deduction logic (total - free tier = billable)
6. Implement cost breakdown formatter
7. Create CostEstimationResult type
8. Write unit tests (8 tests)
9. Run unit tests: `npm test cost-estimator` (should pass: 8/8)
10. Write integration tests (2 tests)
11. Run integration tests: `npm test cost-estimation-flow` (should pass: 2/2)
12. Verify coverage: `npm run coverage -- --include=src/core/serverless/cost-estimator.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 10 tests above (should fail)
2. ❌ Run tests: `npm test` (0/10 passing)
3. ✅ Implement cost estimator (steps 1-7)
4. 🟢 Run tests: `npm test` (10/10 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-018: Add Cost Optimization Recommendations

**User Story**: [US-006: Cost Estimation and Optimization](../../docs/internal/specs/specweave/FS-038/us-006-cost-estimation-optimization.md)
**AC**: AC-US6-04, AC-US6-05
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-017 (cost estimator)

**Test Plan**:
- **Given** cost estimation for a serverless deployment
- **When** cost optimizer analyzes the estimate
- **Then** optimization recommendations are provided (right-sizing memory, caching, batching)
- **And** reserved capacity is recommended if cost-effective (high consistent traffic)

**Test Cases**:
1. **Unit**: `tests/unit/serverless/cost-optimizer.test.ts`
   - testMemoryRightSizing(): Suggest optimal memory size (balance cost vs performance)
   - testCachingRecommendation(): High traffic + repetitive requests → recommend caching
   - testBatchingRecommendation(): Many small invocations → recommend batching
   - testReservedCapacityRecommendation(): High consistent traffic → recommend reserved capacity
   - testCompressionRecommendation(): High data transfer → recommend gzip compression
   - testCdnRecommendation(): High read traffic → recommend CloudFront/CDN
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/cost-optimization-flow.test.ts`
   - testFullCostOptimizationWorkflow(): Cost estimate → analyze → generate recommendations
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create cost optimizer module: `src/core/serverless/cost-optimizer.ts`
2. Implement memory right-sizing logic (test 128MB, 256MB, 512MB → suggest optimal)
3. Implement caching recommendation logic (repetitive requests → cache)
4. Implement batching recommendation logic (many small invocations → batch)
5. Implement reserved capacity recommendation logic (high consistent traffic)
6. Implement compression recommendation logic (high data transfer)
7. Create CostOptimizationResult type
8. Write unit tests (6 tests)
9. Run unit tests: `npm test cost-optimizer` (should pass: 6/6)
10. Write integration test (1 test)
11. Run integration tests: `npm test cost-optimization-flow` (should pass: 1/1)
12. Verify coverage: `npm run coverage -- --include=src/core/serverless/cost-optimizer.ts` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Implement cost optimizer (steps 1-7)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-019: Integrate Free Tier Guidance into Recommendations

**User Story**: [US-003: Free Tier and Startup Credit Guidance](../../docs/internal/specs/specweave/FS-038/us-003-free-tier-startup-credit-guidance.md)
**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-06
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-001 (platform data with free tier), T-017 (cost estimator)

**Test Plan**:
- **Given** pet project or startup context
- **When** serverless recommender generates recommendation
- **Then** free-tier-optimized configurations are recommended (smallest resources)
- **And** startup credit program details are provided (AWS Activate, Azure for Startups, GCP Credits)
- **And** monthly cost estimate shows if deployment stays within free tier
- **And** generated IaC uses free tier settings (128MB memory, PAY_PER_REQUEST billing)

**Test Cases**:
1. **Unit**: `tests/unit/serverless/free-tier-guidance.test.ts`
   - testFreeTierConfigurationRecommendation(): Pet project → smallest resources recommended
   - testStartupCreditProgramDetails(): Startup context → credit program details provided
   - testFreeTierCostEstimate(): Low traffic → stays within free tier ($0/month)
   - testFreeTierWarning(): Approaching 90% free tier limit → warning displayed
   - testIacFreeTierSettings(): Generated IaC uses free tier settings
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/serverless/free-tier-integration.test.ts`
   - testFreeTierGuidanceInRecommendation(): Pet project → recommendation includes free tier guidance
   - testIacGenerationWithFreeTier(): Pet project → generated IaC optimized for free tier
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Modify serverless recommender to include free tier guidance for pet projects/startups
2. Modify cost estimator to show free tier vs paid tier comparison
3. Modify IaC templates to use free tier defaults for pet projects (128MB, PAY_PER_REQUEST)
4. Add startup credit program details to platform JSONs (AWS Activate, Azure for Startups, GCP Credits)
5. Add free tier warning logic (approaching 90% utilization)
6. Write unit tests (5 tests)
7. Run unit tests: `npm test free-tier-guidance` (should pass: 5/5)
8. Write integration tests (2 tests)
9. Run integration tests: `npm test free-tier-integration` (should pass: 2/2)
10. Verify coverage: `npm run coverage` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Implement free tier guidance (steps 1-5)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-020: Add Multi-Platform Cost Comparison

**User Story**: [US-006: Cost Estimation and Optimization](../../docs/internal/specs/specweave/FS-038/us-006-cost-estimation-optimization.md)
**AC**: AC-US6-06
**Priority**: P3
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-017 (cost estimator)

**Test Plan**:
- **Given** expected traffic and usage pattern
- **When** user requests cost comparison across platforms
- **Then** costs are calculated for AWS, Azure, GCP, Firebase, Supabase
- **And** platforms are ranked by cost (cheapest to most expensive)
- **And** cost differences are explained (free tier limits, pricing models)

**Test Cases**:
1. **Unit**: `tests/unit/serverless/cost-comparison.test.ts`
   - testMultiPlatformCostCalculation(): Calculate costs for all 5 platforms
   - testCostRanking(): Platforms ranked by total cost (ascending)
   - testCostDifferenceExplanation(): Explain why costs differ (free tier, pricing model)
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create cost comparison module: `src/core/serverless/cost-comparison.ts`
2. Implement multi-platform cost calculation (loop through platforms)
3. Implement cost ranking logic (sort by total cost)
4. Implement cost difference explanation generator
5. Create CostComparisonResult type
6. Write unit tests (3 tests)
7. Run unit tests: `npm test cost-comparison` (should pass: 3/3)
8. Verify coverage: `npm run coverage -- --include=src/core/serverless/cost-comparison.ts` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 3 tests above (should fail)
2. ❌ Run tests: `npm test` (0/3 passing)
3. ✅ Implement cost comparison (steps 1-5)
4. 🟢 Run tests: `npm test` (3/3 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

## Phase 4: Learning and Security (8-10 hours)

### T-021: Create Learning Path Recommendations Data and Skill

**User Story**: [US-004: Learning Path Recommendations](../../docs/internal/specs/specweave/FS-038/us-004-learning-path-recommendations.md)
**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-001 (platform knowledge base)

**Test Plan**:
- **Given** developer wants to learn AWS Lambda (beginner level)
- **When** learning path recommender is queried
- **Then** beginner tutorials are provided (Getting Started, YouTube tutorials)
- **And** sample projects are recommended (Hello World, REST API)
- **And** best practices guides are provided (performance, security, cost)
- **And** common pitfalls are warned (cold starts, execution limits, memory limits)
- **And** learning vs production trade-offs are documented

**Test Cases**:
1. **Unit**: `tests/unit/serverless/learning-path-recommender.test.ts`
   - testBeginnerTutorialsRecommendation(): Beginner level → beginner tutorials
   - testIntermediateTutorialsRecommendation(): Intermediate level → intermediate tutorials
   - testAdvancedTutorialsRecommendation(): Advanced level → advanced tutorials
   - testSampleProjectsRecommendation(): Sample projects by complexity (beginner/intermediate/advanced)
   - testBestPracticesRecommendation(): Performance, security, cost optimization tips
   - testCommonPitfallsWarning(): Cold starts, execution limits, memory limits warned
   - testDataFreshness(): Learning resources verified within 60 days
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/serverless/learning-path-integration.test.ts`
   - testFullLearningPathWorkflow(): User query → skill level detection → learning path recommendation
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create learning paths data file: `plugins/specweave/knowledge-base/serverless/learning-paths.json`
   - Beginner, intermediate, advanced tutorials for each platform
   - Sample projects with complexity levels
   - Best practices (performance, security, cost)
   - Common pitfalls with mitigations
2. Create learning path recommender module: `src/core/serverless/learning-path-recommender.ts`
3. Implement skill level detection (beginner/intermediate/advanced)
4. Implement learning path selection logic
5. Implement data freshness validation (verified ≤ 60 days)
6. Create LearningPathResult type
7. Write unit tests (7 tests)
8. Run unit tests: `npm test learning-path-recommender` (should pass: 7/7)
9. Write integration test (1 test)
10. Run integration tests: `npm test learning-path-integration` (should pass: 1/1)
11. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement learning path recommender (steps 1-6)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-022: Add Security Best Practices to IaC Templates

**User Story**: [US-010: Security and Compliance Guidance](../../docs/internal/specs/specweave/FS-038/us-010-security-compliance-guidance.md)
**AC**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-05
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-010, T-011, T-012 (IaC templates)

**Test Plan**:
- **Given** generated Terraform templates for serverless deployments
- **When** security best practices are applied
- **Then** IAM roles follow least privilege principle
- **And** secrets are managed via Secrets Manager/Key Vault (not environment variables)
- **And** HTTPS-only configurations are enforced (TLS 1.2+)
- **And** VPC, encryption, and logging are configured

**Test Cases**:
1. **Unit**: `tests/unit/iac/security-best-practices.test.ts`
   - testIamLeastPrivilege(): IAM policies grant only necessary permissions (no wildcards)
   - testSecretsManagement(): Secrets stored in Secrets Manager/Key Vault (not env vars)
   - testHttpsEnforcement(): API Gateway uses HTTPS-only (TLS 1.2+)
   - testVpcConfiguration(): Lambda in VPC for secure database access
   - testEncryptionAtRest(): DynamoDB/RDS encryption enabled
   - testLoggingEnabled(): CloudWatch Logs enabled with retention > 90 days
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/iac/security-validation.test.ts`
   - testSecurityConfigurationsInGeneratedIac(): Generated IaC includes all security configurations
   - testSecurityAudit(): Deploy to test account → run security audit (AWS Trusted Advisor) → no high-severity findings
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Modify AWS Lambda template (`plugins/specweave/templates/iac/aws-lambda/iam.tf.hbs`):
   - Least privilege IAM policies (specific actions, specific resources)
   - Reference to AWS Secrets Manager for secrets
2. Modify Azure Functions template:
   - Least privilege Azure RBAC
   - Reference to Azure Key Vault
3. Modify GCP Cloud Functions template:
   - Least privilege IAM roles
   - Reference to GCP Secret Manager
4. Add VPC configuration to templates (optional, for database access)
5. Add encryption at rest configuration (DynamoDB, RDS, Cosmos DB)
6. Add CloudWatch Logs retention configuration (> 90 days)
7. Add HTTPS enforcement to API Gateway configuration (TLS 1.2+)
8. Write unit tests (6 tests)
9. Run unit tests: `npm test security-best-practices` (should pass: 6/6)
10. Write integration tests (2 tests)
11. Run integration tests: `npm test security-validation` (should pass: 2/2)
12. Verify coverage: `npm run coverage` (should be ≥93%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement security best practices in templates (steps 1-7)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥93%

---

### T-023: Add Compliance Guidance to Architect Agent

**User Story**: [US-010: Security and Compliance Guidance](../../docs/internal/specs/specweave/FS-038/us-010-security-compliance-guidance.md)
**AC**: AC-US10-04, AC-US10-06, AC-US10-07
**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-006 (architect agent enhancement)

**Test Plan**:
- **Given** architect agent detects compliance requirements (SOC 2, HIPAA, GDPR, PCI-DSS)
- **When** serverless recommendations are provided
- **Then** compliance guidance is included (encryption, audit logging, access controls)
- **And** warnings are provided for common security misconfigurations (public S3, overly permissive IAM)
- **And** security checklist is provided for production deployments

**Test Cases**:
1. **Unit**: `tests/unit/agents/architect-compliance-guidance.test.ts`
   - testSoc2ComplianceGuidance(): SOC 2 requirements → encryption, logging, access controls
   - testHipaaComplianceGuidance(): HIPAA requirements → BAA, encryption, audit logging, VPC isolation
   - testGdprComplianceGuidance(): GDPR requirements → data residency, right to erasure, consent management
   - testPciDssComplianceGuidance(): PCI-DSS requirements → tokenization, no raw card data, encryption
   - testSecurityMisconfigurationWarnings(): Warn against public S3, overly permissive IAM
   - testProductionSecurityChecklist(): Provide checklist (IAM, secrets, HTTPS, encryption, VPC, logging)
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/agents/architect-compliance-integration.test.ts`
   - testComplianceGuidanceInRecommendation(): Compliance requirements → guidance included in recommendation
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Modify architect agent: `plugins/specweave/agents/architect/AGENT.md`
2. Add "Compliance Guidance" section:
   - SOC 2 requirements (encryption, logging, access controls)
   - HIPAA requirements (BAA, encryption, audit logging, VPC)
   - GDPR requirements (data residency, right to erasure)
   - PCI-DSS requirements (tokenization, encryption)
3. Add "Security Misconfigurations to Avoid" section:
   - Public S3 buckets
   - Overly permissive IAM policies
   - Hardcoded secrets
4. Add "Production Security Checklist" section:
   - IAM least privilege
   - Secrets management
   - HTTPS only
   - Encryption at rest
   - VPC for databases
   - Logging with retention > 90 days
   - Monitoring and alerting
5. Write unit tests (6 tests)
6. Run unit tests: `npm test architect-compliance-guidance` (should pass: 6/6)
7. Write integration test (1 test)
8. Run integration tests: `npm test architect-compliance-integration` (should pass: 1/1)
9. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Add compliance guidance to architect agent (steps 1-4)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-024: Create End-to-End Integration Test Suite

**User Story**: All user stories (integration validation)
**AC**: All AC-IDs (validation that everything works together)
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: All previous tasks

**Test Plan**:
- **Given** a complete serverless architecture intelligence implementation
- **When** end-to-end user workflows are tested
- **Then** all features work together seamlessly (context detection → recommendation → IaC generation → deployment)
- **And** critical paths are tested (pet project flow, startup flow, enterprise flow)
- **And** E2E tests deploy to real cloud accounts and verify functionality

**Test Cases**:
1. **E2E**: `tests/e2e/serverless/full-user-workflow.spec.ts`
   - petProjectWorkflow(): User describes pet project → Firebase recommended → IaC generated → deployed to test Firebase project → verified
   - startupWorkflow(): User describes startup → AWS Lambda recommended (startup credits) → IaC generated → deployed to test AWS account → verified
   - enterpriseWorkflow(): User describes enterprise app → AWS Lambda recommended (compliance) → IaC generated with security → deployed to test AWS account → verified
   - costEstimationWorkflow(): User provides traffic estimates → cost calculated → free tier guidance provided
   - learningPathWorkflow(): User wants to learn Firebase → learning path provided (tutorials, samples, best practices)
   - complianceWorkflow(): User mentions HIPAA → compliance guidance provided → IaC includes VPC, encryption, logging
   - **Coverage Target**: 85% (critical paths)

**Overall Coverage Target**: 85%

**Implementation**:
1. Create E2E test suite: `tests/e2e/serverless/full-user-workflow.spec.ts`
2. Set up test cloud accounts (AWS, Azure, GCP, Firebase, Supabase)
3. Configure test credentials (AWS_ACCESS_KEY_ID, AZURE_SUBSCRIPTION_ID, GCP_PROJECT_ID, etc.)
4. Implement 6 E2E test scenarios
5. Implement cleanup logic (terraform destroy after each test)
6. Run E2E tests: `npm run test:e2e full-user-workflow` (should pass: 6/6)
7. Verify coverage: `npm run coverage:e2e` (should be ≥85%)

**TDD Workflow**:
1. 📝 Write all 6 E2E tests above (should fail initially)
2. ❌ Run tests: `npm run test:e2e` (0/6 passing)
3. ✅ All previous tasks should be complete (fixes tests)
4. 🟢 Run tests: `npm run test:e2e` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

---

## Summary by Phase

**Phase 1: Core Platform Awareness** (8 tasks, 8-10 hours)
- T-001: Platform knowledge base schema and data
- T-002: Context detection engine
- T-003: Serverless suitability analyzer
- T-004: Platform selection logic
- T-005: Serverless recommender skill
- T-006: Architect agent enhancement
- T-007: Platform data validation GitHub Action
- T-008: Data freshness indicator

**Phase 2: IaC Pattern Library** (8 tasks, 10-12 hours)
- T-009: Terraform template engine (Handlebars)
- T-010: AWS Lambda templates
- T-011: Azure Functions templates
- T-012: GCP Cloud Functions templates
- T-013: Firebase templates
- T-014: Supabase templates
- T-015: Infrastructure agent IaC generation
- T-016: Environment-specific tfvars

**Phase 3: Cost Optimization** (4 tasks, 6-8 hours)
- T-017: Cost estimation calculator
- T-018: Cost optimization recommendations
- T-019: Free tier guidance integration
- T-020: Multi-platform cost comparison

**Phase 4: Learning and Security** (4 tasks, 8-10 hours)
- T-021: Learning path recommendations
- T-022: Security best practices in IaC
- T-023: Compliance guidance in architect agent
- T-024: End-to-end integration test suite

---

## Test Coverage Summary

**Overall Coverage Target**: 90%+

**By Component**:
- Platform knowledge base: 92%
- Context detector: 93%
- Suitability analyzer: 93%
- Platform selector: 93%
- Serverless recommender skill: 88%
- Template generator: 93%
- IaC templates (AWS, Azure, GCP, Firebase, Supabase): 88-92%
- Cost estimator: 93%
- Cost optimizer: 93%
- Learning path recommender: 88%
- Security configurations: 93%
- E2E tests: 85%

**Test Counts**:
- Unit tests: ~120 tests
- Integration tests: ~30 tests
- E2E tests: ~20 scenarios

---

## Acceptance Criteria Coverage Matrix

| AC-ID | Task(s) | Status |
|-------|---------|--------|
| AC-US1-01 | T-002, T-005 | [ ] pending |
| AC-US1-02 | T-002, T-005 | [ ] pending |
| AC-US1-03 | T-003, T-005 | [ ] pending |
| AC-US1-04 | T-003, T-005 | [ ] pending |
| AC-US1-05 | T-003, T-005 | [ ] pending |
| AC-US1-06 | T-004, T-005 | [ ] pending |
| AC-US1-07 | T-004, T-005 | [ ] pending |
| AC-US1-08 | T-005 | [ ] pending |
| AC-US2-01 | T-001 | [ ] pending |
| AC-US2-02 | T-001 | [ ] pending |
| AC-US2-03 | T-001 | [ ] pending |
| AC-US2-04 | T-001 | [ ] pending |
| AC-US2-05 | T-001 | [ ] pending |
| AC-US2-06 | T-007, T-008 | [ ] pending |
| AC-US2-07 | T-005 | [ ] pending |
| AC-US3-01 | T-019 | [ ] pending |
| AC-US3-02 | T-019 | [ ] pending |
| AC-US3-03 | T-019 | [ ] pending |
| AC-US3-04 | T-019 | [ ] pending |
| AC-US3-05 | T-019 | [ ] pending |
| AC-US3-06 | T-019 | [ ] pending |
| AC-US3-07 | T-018 | [ ] pending |
| AC-US4-01 | T-021 | [ ] pending |
| AC-US4-02 | T-021 | [ ] pending |
| AC-US4-03 | T-021 | [ ] pending |
| AC-US4-04 | T-021 | [ ] pending |
| AC-US4-05 | T-021 | [ ] pending |
| AC-US4-06 | T-021 | [ ] pending |
| AC-US5-01 | T-010 | [ ] pending |
| AC-US5-02 | T-011 | [ ] pending |
| AC-US5-03 | T-012 | [ ] pending |
| AC-US5-04 | T-013 | [ ] pending |
| AC-US5-05 | T-014 | [ ] pending |
| AC-US5-06 | T-010, T-011, T-012, T-013, T-014 | [ ] pending |
| AC-US5-07 | T-016 | [ ] pending |
| AC-US5-08 | T-010, T-011, T-012, T-013, T-014 | [ ] pending |
| AC-US5-09 | T-010, T-011, T-012, T-013, T-014 (E2E tests) | [ ] pending |
| AC-US6-01 | T-017 | [ ] pending |
| AC-US6-02 | T-017 | [ ] pending |
| AC-US6-03 | T-017 | [ ] pending |
| AC-US6-04 | T-018 | [ ] pending |
| AC-US6-05 | T-018 | [ ] pending |
| AC-US6-06 | T-020 | [ ] pending |
| AC-US6-07 | T-017 (validation against real bills) | [ ] pending |
| AC-US7-01 | T-006 | [ ] pending |
| AC-US7-02 | T-006 | [ ] pending |
| AC-US7-03 | T-006 | [ ] pending |
| AC-US7-04 | T-006 | [ ] pending |
| AC-US7-05 | T-006 | [ ] pending |
| AC-US7-06 | T-006, T-015 | [ ] pending |
| AC-US7-07 | T-006 | [ ] pending |
| AC-US7-08 | T-006 | [ ] pending |
| AC-US8-01 | T-015 | [ ] pending |
| AC-US8-02 | T-015 | [ ] pending |
| AC-US8-03 | T-015 | [ ] pending |
| AC-US8-04 | T-016 | [ ] pending |
| AC-US8-05 | T-015 | [ ] pending |
| AC-US8-06 | T-015 | [ ] pending |
| AC-US8-07 | T-009, T-015 | [ ] pending |
| AC-US8-08 | T-015 | [ ] pending |
| AC-US10-01 | T-022 | [ ] pending |
| AC-US10-02 | T-022 | [ ] pending |
| AC-US10-03 | T-022 | [ ] pending |
| AC-US10-04 | T-023 | [ ] pending |
| AC-US10-05 | T-022 | [ ] pending |
| AC-US10-06 | T-023 | [ ] pending |
| AC-US10-07 | T-023 | [ ] pending |

**All AC-IDs Covered**: ✅ Yes (68 acceptance criteria mapped to 24 tasks)

---

**Status**: Planning complete, ready for implementation
**Next Steps**:
1. Review tasks.md with team
2. Set up test cloud accounts (AWS, Azure, GCP, Firebase, Supabase)
3. Begin Phase 1 implementation (T-001 through T-008)
4. Run `/specweave:do 0038` to start execution
