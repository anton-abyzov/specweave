---
increment: 0008-user-education-faq
total_tasks: 15
test_mode: Standard
coverage_target: 85%
---

# Tasks for Increment 0008: User Education & FAQ

**Status**: In Progress
**Started**: 2025-11-04
**Target Completion**: 2 weeks

---

## Phase 1: Documentation (P0 - High Priority)

### T-001: Create FAQ Page with Specs Architecture Section

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

**Test Plan** (BDD format):
- **Given** new user visits docs site → **When** navigates to FAQ → **Then** sees 8+ questions about specs architecture
- **Given** user confused about two specs → **When** reads Q1 answer → **Then** understands Living Docs vs Increment Specs
- **Given** user wants examples → **When** reads FAQ → **Then** sees authentication system example spanning 3 increments

**Test Cases**:
- Unit:
  - N/A (documentation content)
- Integration (`tests/integration/docs/faq-validation.test.ts`):
  - `validateFAQStructure()` - checks 8+ questions present
  - `validateFAQContent()` - checks all required topics covered
  - `validateFAQLinks()` - ensures all internal links valid
  - `validateFAQExamples()` - verifies real-world examples present
  - **Coverage: 100% (all FAQ validation checks)**
- E2E (`tests/e2e/docs-site-faq.spec.ts`):
  - `faqPageAccessible()` - page loads without errors
  - `faqNavigationWorks()` - table of contents links work
  - `faqSearchable()` - Docusaurus search finds FAQ content
  - **Coverage: 100% (critical user paths)**

**Implementation**:
1. Create `docs-site/docs/faq.md` with structure:
   ```markdown
   # Frequently Asked Questions (FAQ)

   ## Specs Architecture

   ### Q1: Why does SpecWeave have specs in TWO locations?
   [Answer from FAQ-SECTION-PLAN.md Q1 - 200 words]

   ### Q2: Is a living docs spec required for every increment?
   [Answer from FAQ-SECTION-PLAN.md Q2 - 150 words]

   ### Q3: Can I delete increment specs after completion?
   [Answer from FAQ-SECTION-PLAN.md Q3 - 150 words]

   ### Q4: Which spec is the "source of truth"?
   [Answer from FAQ-SECTION-PLAN.md Q4 - 150 words]

   ### Q5: How do I link brownfield documentation?
   [Answer from FAQ-SECTION-PLAN.md Q5 - 150 words]

   ### Q6: What if I have a small feature (1 increment)?
   [Answer from FAQ-SECTION-PLAN.md Q6 - 150 words]

   ### Q7: How do external PM tools (Jira, ADO, GitHub) integrate?
   [Answer from FAQ-SECTION-PLAN.md Q7 - 150 words]

   ### Q8: What about the Project Structure section in the README?
   [Answer from FAQ-SECTION-PLAN.md Q8 - 100 words]
   ```
2. Use content from `.specweave/increments/0007-smart-increment-discipline/reports/FAQ-SECTION-PLAN.md`
3. Add authentication system example (feature spanning increments 0007, 0012, 0018)
4. Add cross-references to other docs sections
5. Validate all internal links work

**Dependencies**: None

**Estimated Effort**: 3-4 hours

---

### T-002: Embed Two-Spec Architecture Diagram in Docs

**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan** (BDD format):
- **Given** user reads FAQ Q1 → **When** sees diagram → **Then** understands Living Docs (permanent) vs Increment Specs (temporary)
- **Given** diagram rendered → **When** viewed on GitHub/Docusaurus → **Then** displays correctly with colors and styling

**Test Cases**:
- Integration (`tests/integration/docs/diagram-validation.test.ts`):
  - `validateMermaidSyntax()` - checks diagram is valid Mermaid
  - `validateDiagramElements()` - ensures all nodes present (Living Docs, Inc1-3, Brownfield, PMTool)
  - `validateDiagramLinks()` - checks relationships shown correctly
  - **Coverage: 100% (all diagram validation)**
- E2E (`tests/e2e/docs-site-diagrams.spec.ts`):
  - `diagramRendersOnFAQ()` - diagram visible on FAQ page
  - `diagramRendersOnREADME()` - diagram visible on README
  - `diagramStylingCorrect()` - colors and styling applied
  - **Coverage: 100% (rendering validation)**

**Implementation**:
1. Add Mermaid diagram from plan.md (lines 108-132) to FAQ page Q1 answer
2. Add same diagram to README.md "Specs Architecture" section
3. Test rendering on:
   - GitHub README preview
   - Docusaurus docs site
   - Local Markdown viewers
4. Verify colors render correctly:
   - Living Docs: Green (#90EE90, stroke #228B22)
   - Increment Specs: Orange (#FFE4B5, stroke #FFA500)
   - External: Gray (#E0E0E0, stroke #808080)

**Dependencies**: T-001 (FAQ page must exist)

**Estimated Effort**: 1-2 hours

---

### T-003: Create "Do I Need Living Docs?" Decision Flowchart

**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan** (BDD format):
- **Given** user unsure about living docs spec → **When** follows flowchart → **Then** gets clear YES/NO answer
- **Given** feature spans 3+ increments → **When** follows flowchart → **Then** reaches "Create living docs" decision

**Test Cases**:
- Integration (`tests/integration/docs/flowchart-validation.test.ts`):
  - `validateFlowchartSyntax()` - checks valid Mermaid flowchart
  - `validateFlowchartDecisionPoints()` - ensures 4 decision nodes present
  - `validateFlowchartPaths()` - checks all paths lead to YES/NO
  - **Coverage: 100% (all flowchart validation)**
- E2E (`tests/e2e/docs-site-diagrams.spec.ts`):
  - `flowchartRendersOnFAQ()` - flowchart visible on FAQ page
  - `flowchartInteractive()` - user can follow decision paths visually
  - **Coverage: 100% (user interaction)**

**Implementation**:
1. Add Mermaid flowchart from plan.md (lines 146-177) to FAQ page Q2 answer
2. Verify decision logic matches PM agent validation heuristics:
   - Feature spans 3+ increments? → YES suggestion
   - Needs brownfield integration? → YES suggestion
   - External PM tool configured? → YES suggestion
   - Needs historical record? → Conditional suggestion
3. Test rendering and readability
4. Add explanatory text above/below flowchart

**Dependencies**: T-001 (FAQ page must exist)

**Estimated Effort**: 1-2 hours

---

### T-004: Update Main Workflow Diagram with PM Agent Validation

**AC**: AC-US4-01, AC-US4-02, AC-US4-03

**Test Plan** (BDD format):
- **Given** developer reviews workflow → **When** sees diagram → **Then** understands PM agent suggests living docs for major features
- **Given** workflow shows hooks → **When** task completes → **Then** shows living docs auto-sync

**Test Cases**:
- Integration (`tests/integration/docs/workflow-validation.test.ts`):
  - `validateWorkflowSyntax()` - checks valid Mermaid sequence diagram
  - `validateWorkflowSteps()` - ensures PM validation step present
  - `validateWorkflowActors()` - checks User, PM, Architect, TestPlanner, Developer, Hooks
  - `validateWorkflowMessages()` - verifies all interactions shown
  - **Coverage: 100% (all workflow validation)**
- E2E (`tests/e2e/docs-site-diagrams.spec.ts`):
  - `workflowRendersOnREADME()` - diagram visible on README
  - `workflowActorsDistinct()` - each actor has distinct color
  - **Coverage: 100% (rendering validation)**

**Implementation**:
1. Replace current workflow diagram in README.md with updated version from plan.md (lines 192-245)
2. Key changes from old diagram:
   - Added "Step 1: Analyze Feature" (PM agent validation)
   - Added conditional living docs spec creation
   - Added "Step 2: Create Increment Spec" (always happens)
   - Added hook synchronization (living docs + PM tool)
   - Added living docs spec update on completion
3. Update any references to workflow in other docs
4. Test rendering on GitHub

**Dependencies**: None (updates existing diagram)

**Estimated Effort**: 1-2 hours

---

### T-005: Add FAQ Links to README and Website Navigation

**AC**: AC-US1-04, AC-US3-01, AC-US3-02

**Test Plan** (BDD format):
- **Given** user on README → **When** sees FAQ link → **Then** can click to jump to FAQ section
- **Given** user on docs site → **When** looks at sidebar → **Then** sees FAQ in navigation

**Test Cases**:
- Integration (`tests/integration/docs/link-validation.test.ts`):
  - `validateREADMELinks()` - all FAQ links in README work
  - `validateDocsiteLinks()` - all FAQ links in site work
  - `validateNavigation()` - FAQ appears in sidebar
  - **Coverage: 100% (all link validation)**
- E2E (`tests/e2e/docs-site-navigation.spec.ts`):
  - `faqInSidebar()` - FAQ link visible in docs sidebar
  - `faqLinkWorks()` - clicking FAQ link navigates correctly
  - `faqREADMELinkWorks()` - README link navigates to FAQ
  - **Coverage: 100% (navigation paths)**

**Implementation**:
1. Update README.md:
   - Add FAQ link in "Documentation" section
   - Add FAQ link in "Getting Started" section
   - Format: `[FAQ](https://spec-weave.com/docs/faq)`
2. Update `docs-site/docusaurus.config.js`:
   ```javascript
   sidebar: {
     items: [
       { type: 'doc', id: 'intro', label: 'Introduction' },
       { type: 'doc', id: 'getting-started', label: 'Getting Started' },
       { type: 'doc', id: 'faq', label: 'FAQ' }, // ADD THIS
       // ... rest of sidebar
     ]
   }
   ```
3. Test all links resolve correctly (no 404s)

**Dependencies**: T-001 (FAQ page must exist)

**Estimated Effort**: 1 hour

---

### T-006: Add FAQ Reference to CLAUDE.md Template

**AC**: AC-US3-02

**Test Plan** (BDD format):
- **Given** new user runs `specweave init` → **When** reads generated CLAUDE.md → **Then** sees FAQ reference section

**Test Cases**:
- Integration (`tests/integration/cli/init-template.test.ts`):
  - `validateCLAUDETemplate()` - checks FAQ reference present in template
  - `validateTemplateLinks()` - ensures FAQ link valid
  - **Coverage: 100% (template validation)**
- E2E (`tests/e2e/cli-init.spec.ts`):
  - `initCreatesCLAUDEWithFAQ()` - generated CLAUDE.md has FAQ section
  - **Coverage: 100% (init workflow)**

**Implementation**:
1. Update `src/templates/CLAUDE.md.template`:
   - Add new section "Frequently Asked Questions" after "Documentation" section
   - Content:
     ```markdown
     ## Frequently Asked Questions

     **New to SpecWeave?** Check out our FAQ for answers to common questions:
     - Why does SpecWeave have specs in two locations?
     - When do I need a living docs spec?
     - Can I delete increment specs after completion?
     - [View Complete FAQ](https://spec-weave.com/docs/faq)
     ```
2. Test template generation with `specweave init`

**Dependencies**: T-001 (FAQ page must exist)

**Estimated Effort**: 30 minutes

---

## Phase 2: PM Agent Enhancement (P1 - Medium Priority)

### T-007: Add Living Docs Spec Detection to PM Agent

**AC**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04

**Test Plan** (BDD format):
- **Given** user creates increment "Add authentication with OAuth and 2FA" → **When** PM agent analyzes → **Then** suggests creating living docs spec
- **Given** user creates increment "Add dark mode toggle" → **When** PM agent analyzes → **Then** does NOT suggest living docs spec
- **Given** user mentions "migrate existing system" → **When** PM agent analyzes → **Then** detects brownfield integration

**Test Cases**:
- Unit (`tests/unit/agents/pm-validation.test.ts`):
  - `detectLargeFeature()` - detects multiple components (score +3)
  - `detectBrownfieldIntegration()` - detects migration keywords (score +2)
  - `detectExternalPMTool()` - checks config for Jira/ADO (score +2)
  - `detectHistoricalRecord()` - detects "permanent", "historical" keywords (score +1)
  - `calculateScore()` - sums scores correctly
  - `shouldSuggestLivingDocs()` - threshold logic (score >= 3)
  - `formatSuggestion()` - creates user-friendly message
  - **Coverage: 90%+ (all validation logic)**
- Integration (`tests/integration/agents/pm-flow.test.ts`):
  - `pmAgentSuggestsLivingDocs()` - end-to-end flow with large feature
  - `pmAgentSkipsLivingDocs()` - end-to-end flow with small feature
  - `pmAgentRespectsBrownfield()` - detects brownfield context
  - `pmAgentRespectsExternalPM()` - detects Jira/ADO configuration
  - **Coverage: 85%+ (all PM agent flows)**

**Implementation**:
1. Update `plugins/specweave/agents/pm/AGENT.md`:
   - Add new Step 1B: "Check if Living Docs Spec Needed" (after Step 1: Understand Request, before Step 2: Generate RFC)
   - Insert between lines ~50-60 (after initial analysis, before RFC generation)
2. Add detection logic (pseudocode from plan.md lines 427-485):
   ```markdown
   ## Step 1B: Check if Living Docs Spec Needed (NEW - v0.8.0)

   **Purpose**: Proactively suggest living docs spec creation for major features.

   **Detection Heuristics**:

   1. **Large Feature Detection** (Score +3):
      - Keywords: "authentication", "payment", "messaging", "dashboard"
      - Multiple components mentioned: "login + OAuth + 2FA"
      - Multiple user stories expected (3+)

   2. **Brownfield Integration** (Score +2):
      - Keywords: "migrate", "existing", "legacy", "current system", "replace"
      - User mentions existing documentation

   3. **External PM Tool Configured** (Score +2):
      - Check `.specweave/config.json` for `externalPM.enabled = true`
      - Tools: Jira, Azure DevOps, GitHub Issues

   4. **Historical Record Needed** (Score +1):
      - Keywords: "permanent", "historical", "reference", "documentation"

   **Suggestion Logic**:
   - Calculate total score from heuristics
   - If score >= 3: Suggest living docs spec creation
   - If score >= 5: Strong suggestion (high confidence)
   - If score < 3: Skip suggestion (increment spec sufficient)

   **Suggestion Message** (non-blocking):
   ```
   💡 **Suggestion**: This feature may benefit from a living docs spec

   **Reasons**:
   - Large feature detected (multiple components)
   - Brownfield integration mentioned

   **What is a living docs spec?**
   A permanent specification that captures the COMPLETE feature scope across multiple increments.

   **Should I create one?**
   - ✅ YES if: Feature spans 3+ increments, needs brownfield links, or external PM tool tracking
   - ❌ NO if: Small feature (1-2 increments), no brownfield, no external PM tools

   **Learn more**: [FAQ - Living Docs Specs](https://spec-weave.com/docs/faq#q2)

   Would you like me to create a living docs spec? (You can also do this later)
   - YES → I'll create `.specweave/docs/internal/specs/spec-NNNN-{feature}/spec.md`
   - NO → I'll proceed with increment spec only (you can create living docs later if needed)
   ```

   **Important**: This is a SUGGESTION only. User can skip and create living docs spec later if needed.
   ```
3. Add helper functions section to PM agent
4. Ensure backward compatibility (new step is optional, doesn't block existing workflow)

**Dependencies**: None (enhances existing PM agent)

**Estimated Effort**: 4-5 hours

---

### T-008: Implement PM Agent Validation Helper Functions

**AC**: AC-US5-02, AC-US5-04

**Test Plan** (BDD format):
- **Given** input text "Add authentication with OAuth and 2FA" → **When** `hasMultipleComponents()` runs → **Then** returns true
- **Given** input text "Add dark mode toggle" → **When** `hasMultipleComponents()` runs → **Then** returns false

**Test Cases**:
- Unit (`tests/unit/utils/pm-validation-helpers.test.ts`):
  - `hasMultipleComponents()` - detects complex features
  - `mentionsBrownfield()` - detects migration keywords
  - `mentionsHistoricalRecord()` - detects documentation needs
  - `checkLivingDocsNeed()` - integrates all heuristics
  - `formatSuggestionMessage()` - creates user-friendly output
  - **Coverage: 90%+ (all helper functions)**

**Implementation**:
1. Create new file: `src/utils/pm-validation-helpers.ts`
2. Implement functions from plan.md pseudocode (lines 427-485):
   ```typescript
   export interface LivingDocsNeeded {
     suggested: boolean;
     reasons: string[];
     confidence: 'high' | 'medium';
     score: number;
   }

   export function hasMultipleComponents(input: string): boolean {
     const complexKeywords = [
       'authentication', 'oauth', '2fa', 'two-factor',
       'payment', 'stripe', 'billing', 'subscription',
       'messaging', 'chat', 'real-time', 'websocket',
       'dashboard', 'analytics', 'reporting'
     ];

     const andPattern = /\s+(and|with|\+|,)\s+/gi;
     const matches = input.match(andPattern);
     const hasMultipleParts = matches && matches.length >= 2;

     const hasComplexKeyword = complexKeywords.some(kw =>
       input.toLowerCase().includes(kw)
     );

     return hasMultipleParts || hasComplexKeyword;
   }

   export function mentionsBrownfield(input: string): boolean {
     const brownfieldKeywords = [
       'migrate', 'migration', 'existing', 'legacy',
       'current system', 'replace', 'refactor from'
     ];
     return brownfieldKeywords.some(kw =>
       input.toLowerCase().includes(kw)
     );
   }

   export function mentionsHistoricalRecord(input: string): boolean {
     const recordKeywords = [
       'permanent', 'historical', 'reference',
       'documentation', 'knowledge base'
     ];
     return recordKeywords.some(kw =>
       input.toLowerCase().includes(kw)
     );
   }

   export function checkLivingDocsNeed(
     userInput: string,
     config: Config
   ): LivingDocsNeeded | null {
     let score = 0;
     const reasons: string[] = [];

     // Heuristic 1: Large feature
     if (hasMultipleComponents(userInput)) {
       score += 3;
       reasons.push('Large feature (multiple components)');
     }

     // Heuristic 2: Brownfield integration
     if (mentionsBrownfield(userInput)) {
       score += 2;
       reasons.push('Brownfield integration mentioned');
     }

     // Heuristic 3: External PM tool
     if (config.externalPM?.enabled) {
       score += 2;
       reasons.push(`External PM tool configured (${config.externalPM.tool})`);
     }

     // Heuristic 4: Historical record
     if (mentionsHistoricalRecord(userInput)) {
       score += 1;
       reasons.push('Historical record need mentioned');
     }

     // Threshold: score >= 3
     if (score >= 3) {
       return {
         suggested: true,
         reasons,
         confidence: score >= 5 ? 'high' : 'medium',
         score
       };
     }

     return null;
   }
   ```
3. Export functions for use in PM agent
4. Add comprehensive unit tests

**Dependencies**: None (new utility module)

**Estimated Effort**: 2-3 hours

---

### T-009: Create Unit Tests for PM Agent Validation

**AC**: AC-US5-04 (90%+ test coverage)

**Test Plan** (BDD format):
- **Given** test suite runs → **When** all unit tests execute → **Then** 90%+ code coverage achieved
- **Given** PM validation logic → **When** edge cases tested → **Then** handles all scenarios correctly

**Test Cases**:
- Unit (`tests/unit/agents/pm-validation.test.ts`):
  - **Large Feature Detection**:
    - `suggestsForAuthenticationSystem()` - "Add authentication with OAuth and 2FA" → suggestion
    - `suggestsForPaymentIntegration()` - "Add payment processing with Stripe" → suggestion
    - `suggestsForMessagingSystem()` - "Add real-time chat with WebSocket" → suggestion
    - `doesNotSuggestForSimpleFeature()` - "Add dark mode toggle" → no suggestion
  - **Brownfield Detection**:
    - `detectsMigrationKeyword()` - "Migrate existing auth to new system" → suggestion
    - `detectsLegacyKeyword()` - "Replace legacy payment system" → suggestion
  - **External PM Tool**:
    - `suggestsWhenJiraConfigured()` - config has Jira enabled → suggestion
    - `suggestsWhenADOConfigured()` - config has ADO enabled → suggestion
  - **Historical Record**:
    - `detectsPermanentKeyword()` - "Need permanent reference" → score +1
  - **Score Calculation**:
    - `calculatesScoreCorrectly()` - multiple heuristics sum properly
    - `respectsThreshold()` - score >= 3 triggers suggestion
  - **Edge Cases**:
    - `handlesEmptyInput()` - empty string → no suggestion
    - `handlesNullConfig()` - null config → graceful handling
    - `handlesMixedCase()` - "AUTHENTICATION" → still detects
  - **Coverage: 90%+**

**Implementation**:
1. Create comprehensive test file: `tests/unit/agents/pm-validation.test.ts`
2. Test all heuristics individually
3. Test integration (checkLivingDocsNeed)
4. Test edge cases
5. Verify 90%+ coverage with `npm run test:coverage`

**Dependencies**: T-008 (helper functions must exist)

**Estimated Effort**: 2-3 hours

---

### T-010: Create Integration Tests for PM Agent Flow

**AC**: AC-US5-04 (85%+ integration coverage)

**Test Plan** (BDD format):
- **Given** PM agent receives user input → **When** validation runs → **Then** appropriate suggestion shown
- **Given** PM agent with external PM tool → **When** increment created → **Then** score includes PM tool bonus

**Test Cases**:
- Integration (`tests/integration/agents/pm-flow.test.ts`):
  - `pmAgentSuggestsLivingDocsForLargeFeature()` - end-to-end with auth system
  - `pmAgentSkipsLivingDocsForSmallFeature()` - end-to-end with dark mode
  - `pmAgentDetectsBrownfieldContext()` - end-to-end with migration
  - `pmAgentRespectsJiraConfig()` - end-to-end with Jira enabled
  - `pmAgentShowsSuggestionMessage()` - user sees formatted message
  - `pmAgentAllowsSkipping()` - user can decline suggestion
  - **Coverage: 85%+**

**Implementation**:
1. Create integration test file: `tests/integration/agents/pm-flow.test.ts`
2. Test complete PM agent workflow with validation
3. Test with various config scenarios (Jira enabled, ADO enabled, no external PM)
4. Verify user can skip suggestion (non-blocking)
5. Run with `npm run test:integration`

**Dependencies**: T-007, T-008 (PM agent validation must be implemented)

**Estimated Effort**: 2-3 hours

---

## Phase 3: Onboarding Enhancement (P2 - Lower Priority)

### T-011: Enhance CLI Onboarding Messages

**AC**: AC-US5-05, AC-US5-06

**Test Plan** (BDD format):
- **Given** new user runs `specweave init` → **When** initialization completes → **Then** sees educational message about two-spec architecture
- **Given** user reads init message → **When** sees FAQ link → **Then** can click to learn more

**Test Cases**:
- Integration (`tests/integration/cli/init-messages.test.ts`):
  - `validateInitMessage()` - checks message contains specs architecture explanation
  - `validateFAQLink()` - ensures FAQ link present and valid
  - **Coverage: 100% (init message validation)**
- E2E (`tests/e2e/cli-init.spec.ts`):
  - `initDisplaysEducationalMessage()` - message visible during init
  - `initFAQLinkClickable()` - link is clickable (if terminal supports)
  - **Coverage: 100% (onboarding flow)**

**Implementation**:
1. Update `src/cli/commands/init.ts`:
   - Locate the section after `.specweave/` structure creation (around line 150-200)
   - Add enhanced message from plan.md (lines 295-307):
     ```typescript
     console.log('✔ .specweave/ structure created');
     console.log('');
     console.log('📚 About SpecWeave\'s Spec Architecture:');
     console.log('   SpecWeave uses TWO types of specs for different purposes:');
     console.log('   - Living Docs Specs (permanent, for major features)');
     console.log('   - Increment Specs (temporary, for focused work)');
     console.log('');
     console.log('   💡 Most features only need increment specs.');
     console.log('      Living docs specs are optional for major features (3+ increments).');
     console.log('');
     console.log('   Learn more: https://spec-weave.com/docs/faq#specs-architecture');
     console.log('');
     console.log('✔ Core plugin installed');
     ```
2. Keep message concise (5-7 lines max)
3. Make it visually distinct with emoji
4. Test message displays correctly on macOS/Linux/Windows terminals

**Dependencies**: T-001 (FAQ page must exist for link)

**Estimated Effort**: 1-2 hours

---

### T-012: Update CLAUDE.md Template with Specs Architecture Section

**AC**: AC-US5-06

**Test Plan** (BDD format):
- **Given** user generates CLAUDE.md from template → **When** reads file → **Then** sees specs architecture explanation section

**Test Cases**:
- Integration (`tests/integration/cli/init-template-content.test.ts`):
  - `validateCLAUDETemplateHasSpecsSection()` - section present
  - `validateSpecsSectionContent()` - content accurate
  - `validateSpecsSectionLinks()` - links work
  - **Coverage: 100% (template content validation)**

**Implementation**:
1. Update `src/templates/CLAUDE.md.template`:
   - Add new section "Understanding SpecWeave's Specs Architecture" after "Quick Start"
   - Content:
     ```markdown
     ## Understanding SpecWeave's Specs Architecture

     SpecWeave uses **two types of specs** for different purposes:

     ### Living Docs Specs (Optional - Major Features Only)
     - **Location**: `.specweave/docs/internal/specs/spec-NNNN-feature-name/`
     - **Purpose**: Permanent knowledge base for ENTIRE feature (all user stories, brownfield links, PM tool references)
     - **When to create**: Feature spans 3+ increments, needs brownfield integration, or external PM tool tracking
     - **Lifecycle**: PERMANENT (never delete)
     - **Example**: `spec-0005-authentication` covering login, OAuth, 2FA (20 user stories, 3-10 increments)

     ### Increment Specs (Required - Every Increment)
     - **Location**: `.specweave/increments/NNNN-feature-name/spec.md`
     - **Purpose**: Temporary snapshot of CURRENT work (focused implementation, 3-5 user stories)
     - **When to create**: ALWAYS (every increment gets a spec.md)
     - **Lifecycle**: Temporary (can delete after completion)
     - **Example**: `0007-basic-login` covering just login flow (3 user stories, 1 increment)

     ### The Relationship
     ```
     Living Docs Spec (Source of Truth - Optional)
     ├── Increment 0007 spec (references US-001 to US-003)
     ├── Increment 0012 spec (references US-010 to US-012)
     └── Increment 0018 spec (references US-018 to US-020)
     ```

     ### Quick Decision Guide
     - ✅ **Small feature (1-2 increments)**: Use increment spec only
     - ✅ **Major feature (3+ increments)**: Create living docs spec + increment specs
     - ✅ **Brownfield integration needed**: Create living docs spec
     - ✅ **External PM tool (Jira, ADO)**: Create living docs spec

     **Learn more**: [FAQ - Specs Architecture](https://spec-weave.com/docs/faq#specs-architecture)
     ```
2. Ensure section is prominent (near top of file)
3. Test template generation with `specweave init`

**Dependencies**: T-001 (FAQ page must exist)

**Estimated Effort**: 1-2 hours

---

### T-013: Create E2E Tests for Onboarding Flow

**AC**: NFR-002 (100% critical path coverage)

**Test Plan** (BDD format):
- **Given** new user → **When** runs `specweave init` → **Then** sees onboarding message and can proceed
- **Given** user reads message → **When** follows FAQ link → **Then** reaches correct FAQ section

**Test Cases**:
- E2E (`tests/e2e/onboarding-flow.spec.ts`):
  - `initShowsOnboardingMessage()` - message visible
  - `initMessageContainsFAQLink()` - FAQ link present
  - `initMessageClear()` - message is readable and concise
  - `initProceeds()` - user can continue after message
  - `generatedCLAUDEHasSpecsSection()` - CLAUDE.md includes specs architecture
  - `faqLinkAccessible()` - FAQ page loads from link
  - **Coverage: 100% (all onboarding paths)**

**Implementation**:
1. Create E2E test file: `tests/e2e/onboarding-flow.spec.ts`
2. Use Playwright to simulate:
   - Running `specweave init` in a test directory
   - Capturing CLI output
   - Verifying message content
   - Checking generated CLAUDE.md
3. Verify all critical paths covered
4. Run with `npm run test:e2e`

**Dependencies**: T-011, T-012 (onboarding enhancements must be implemented)

**Estimated Effort**: 2-3 hours

---

## Phase 4: Validation & Deployment (All Phases)

### T-014: Validate All Links and Diagram Rendering

**AC**: NFR-001 (100% links valid, 100% diagrams render)

**Test Plan** (BDD format):
- **Given** all docs updated → **When** link checker runs → **Then** zero broken links
- **Given** diagrams added → **When** rendered on GitHub/Docusaurus → **Then** all display correctly

**Test Cases**:
- Integration (`tests/integration/docs/validation.test.ts`):
  - `validateAllInternalLinks()` - no 404s
  - `validateAllExternalLinks()` - external URLs reachable
  - `validateAllDiagramsSyntax()` - Mermaid syntax valid
  - `validateDiagramsRender()` - diagrams render without errors
  - **Coverage: 100% (all validation checks)**
- E2E (`tests/e2e/docs-site-validation.spec.ts`):
  - `allLinksAccessible()` - click all links, verify no 404s
  - `allDiagramsVisible()` - all diagrams render on page
  - `diagramsStyledCorrectly()` - colors and styling applied
  - **Coverage: 100% (user-facing validation)**

**Implementation**:
1. Run link checker on:
   - README.md
   - docs-site/docs/faq.md
   - All modified documentation files
2. Test diagram rendering on:
   - GitHub (README.md preview)
   - Docusaurus local (`npm run start`)
   - Docusaurus build (`npm run build`)
3. Fix any broken links or rendering issues
4. Document any external dependencies (Mermaid version, browser support)

**Dependencies**: T-001, T-002, T-003, T-004, T-005, T-006 (all docs must be created)

**Estimated Effort**: 2-3 hours

---

### T-015: Run Complete Test Suite and Validate Coverage

**AC**: NFR-002 (85%+ overall coverage)

**Test Plan** (BDD format):
- **Given** all implementation complete → **When** test suite runs → **Then** 85%+ coverage achieved
- **Given** tests run → **When** failures occur → **Then** fix issues and re-run

**Test Cases**:
- All tests from T-001 through T-014:
  - Unit tests: PM validation (90%+ coverage)
  - Integration tests: PM flow, docs validation (85%+ coverage)
  - E2E tests: Onboarding, docs site, navigation (100% critical paths)
- Overall coverage validation:
  - `npm run test:coverage` shows 85%+ overall
  - All critical paths covered (onboarding, PM validation, FAQ access)

**Implementation**:
1. Run complete test suite:
   ```bash
   npm test                    # Unit tests
   npm run test:integration    # Integration tests
   npm run test:e2e           # E2E tests
   npm run test:coverage      # Coverage report
   ```
2. Verify coverage targets met:
   - PM validation: 90%+
   - Integration: 85%+
   - E2E critical paths: 100%
   - Overall: 85%+
3. Fix any failing tests
4. Document test results in increment report

**Dependencies**: All previous tasks (T-001 through T-014)

**Estimated Effort**: 2-3 hours

---

## Summary

**Total Tasks**: 15
**Total Estimated Effort**: 30-40 hours (1.5-2 weeks)

**Phase Breakdown**:
- Phase 1 (Documentation): 6 tasks, 8-11 hours
- Phase 2 (PM Agent): 4 tasks, 12-16 hours
- Phase 3 (Onboarding): 3 tasks, 5-8 hours
- Phase 4 (Validation): 2 tasks, 4-6 hours

**Coverage Targets**:
- PM validation logic: 90%+ unit coverage
- PM agent flow: 85%+ integration coverage
- Onboarding flow: 100% E2E coverage
- Overall increment: 85%+ total coverage

**Dependencies**:
- Phase 1 must complete before Phase 3 (onboarding needs FAQ links)
- T-007 and T-008 must complete before T-009 and T-010 (tests need implementation)
- All phases must complete before Phase 4 (validation is final step)

**Risk Mitigation**:
- FAQ content already drafted in FAQ-SECTION-PLAN.md (low content risk)
- Mermaid diagrams already designed in plan.md (low design risk)
- PM validation uses heuristics, not AI (low complexity risk)
- All changes are additive, backward compatible (low breaking risk)

**Success Criteria**:
- ✅ FAQ page accessible with 8+ questions
- ✅ 3 diagrams rendering correctly
- ✅ PM agent suggests living docs for major features
- ✅ User onboarding message educates about specs architecture
- ✅ 85%+ test coverage achieved
- ✅ Zero broken links
- ✅ All tests passing

---

**Next Action**: Begin Phase 1, Task T-001 (Create FAQ Page)
