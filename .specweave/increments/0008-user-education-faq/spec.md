# Increment 0008: User Education & FAQ Implementation

**Status**: active
**Type**: feature
**Created**: 2025-11-04
**Related**: Increment 0007 (Smart Increment Discipline)

---

## Summary

Implement comprehensive user education materials to address confusion about SpecWeave's two-spec architecture (Living Docs vs Increment Specs). Create FAQ page, diagrams, flowcharts, and enhance PM agent validation to guide users toward correct usage patterns.

**Links to Living Docs**: N/A (no permanent spec needed - focused enhancement)

---

## Motivation

### The Problem

**User Confusion Identified**:
- "Why do I have specs in two places?"
- "Which spec is the source of truth?"
- "Do I need both for every feature?"
- "Can I delete increment specs after completion?"

**Evidence**:
- Session 2025-11-04: User requested "ultrathink on it" and "maybe in public docs we should have a section, FAQ"
- SPECS-ARCHITECTURE-CLARIFICATION.md created (500+ lines) to address confusion
- FAQ-SECTION-PLAN.md created with 8 critical questions
- Judge LLM assessment revealed design is sound but needs better user education

### The Opportunity

**User Education Gap**: While the two-spec architecture is well-designed, users lack:
1. **Quick reference** - FAQ page answering common questions
2. **Visual aids** - Diagrams showing architecture and decision flowcharts
3. **Proactive guidance** - PM agent suggestions for when to create living docs specs
4. **Clear workflow** - Updated Mermaid diagrams reflecting current workflow

### Success Criteria

**User Success** (measurable):
- ✅ Users correctly create living docs specs for major features only (3+ increments)
- ✅ Users correctly use increment specs for focused work
- ✅ Reduced confusion (tracked via GitHub issues, Discord questions)
- ✅ Increased clarity (tracked via FAQ page views, user surveys)

**Technical Success** (deliverables):
- ✅ FAQ page with 8+ questions published
- ✅ 2+ diagrams (architecture, decision flowchart)
- ✅ PM agent validation for large features
- ✅ Updated user onboarding flow
- ✅ Corrected main workflow diagram

---

## User Stories

### US1: As a NEW USER, I want a FAQ page so I can quickly understand the two-spec architecture

**Priority**: P0 (Critical)

**Acceptance Criteria**:
- **AC-US1-01**: FAQ page exists at `docs-site/docs/faq.md` with 8+ questions (P0, testable via file existence)
- **AC-US1-02**: FAQ answers address: two locations, requirement, deletion, source of truth, brownfield, small features, PM tools, project structure (P0, testable via content review)
- **AC-US1-03**: FAQ includes real-world examples (authentication system spanning 3 increments) (P0, testable via content review)
- **AC-US1-04**: FAQ page is linked from main README.md and website navigation (P0, testable via link validation)
- **AC-US1-05**: FAQ uses clear, concise language (no jargon without explanation) (P1, testable via readability score)

**User Flow**:
```
1. User encounters confusion about specs
2. User finds FAQ link in README or website nav
3. User reads FAQ, finds answer to specific question
4. User understands two-spec architecture
5. User correctly creates specs for their project
```

**Out of Scope**:
- Interactive FAQ (search, filtering) - future enhancement
- Multi-language FAQ - future enhancement
- Video tutorials - future enhancement

---

### US2: As a NEW USER, I want visual diagrams so I can quickly understand the architecture

**Priority**: P0 (Critical)

**Acceptance Criteria**:
- **AC-US2-01**: Two-spec architecture diagram exists (Mermaid) showing Living Docs vs Increment Specs relationship (P0, testable via file existence)
- **AC-US2-02**: "Do I need a living docs spec?" decision flowchart exists (Mermaid) (P0, testable via file existence)
- **AC-US2-03**: Diagrams are embedded in FAQ page and README.md (P0, testable via rendering check)
- **AC-US2-04**: Diagrams use consistent SpecWeave branding (colors, style) (P1, testable via visual review)
- **AC-US2-05**: Diagrams export to PNG for presentations (P2, testable via export functionality)

**User Flow**:
```
1. User reads FAQ
2. User sees diagram illustrating two-spec architecture
3. User sees flowchart: "Do I need living docs?"
4. User follows flowchart for their specific scenario
5. User makes correct decision (living docs vs increment spec only)
```

**Out of Scope**:
- Interactive diagrams (clickable, zoom) - future enhancement
- Animated diagrams - future enhancement
- 3D visualizations - not needed

---

### US3: As a USER, I want PM agent guidance so I'm prompted when I should create a living docs spec

**Priority**: P1 (High)

**Acceptance Criteria**:
- **AC-US3-01**: PM agent detects large features (3+ increments) during planning (P1, testable via unit test)
- **AC-US3-02**: PM agent suggests creating living docs spec with clear reasoning (P1, testable via output validation)
- **AC-US3-03**: PM agent detects brownfield integration needs (existing doc links) (P1, testable via content analysis)
- **AC-US3-04**: PM agent detects external PM tool tracking (Jira, ADO, GitHub) (P1, testable via config detection)
- **AC-US3-05**: PM agent provides skip option (not mandatory, just suggestion) (P0, testable via workflow check)

**User Flow**:
```
1. User creates increment: /specweave:inc "Add authentication system"
2. PM agent analyzes: Large feature (OAuth, 2FA, session management)
3. PM agent suggests: "This appears to be a large feature. Consider creating living docs spec."
4. PM agent shows: Benefits (brownfield links, PM tool tracking, historical record)
5. User decides: Create living docs spec or skip
6. Increment creation continues normally
```

**Out of Scope**:
- Auto-create living docs spec (should be user decision) - not wanted
- Mandatory living docs spec (should be optional) - design principle
- AI-powered feature size estimation - future enhancement

---

### US4: As a CONTRIBUTOR, I want an updated workflow diagram so I understand the correct SpecWeave flow

**Priority**: P1 (High)

**Acceptance Criteria**:
- **AC-US4-01**: Main workflow diagram reviewed for accuracy (P1, testable via content review)
- **AC-US4-02**: Workflow diagram reflects two-spec architecture (P1, testable via diagram check)
- **AC-US4-03**: Workflow diagram shows PM agent validation step (P1, testable via diagram check)
- **AC-US4-04**: Workflow diagram clarifies when living docs specs are created (P1, testable via diagram check)
- **AC-US4-05**: Workflow diagram is embedded in README.md and CLAUDE.md (P1, testable via link validation)

**User Flow**:
```
1. Contributor reads CLAUDE.md or README.md
2. Contributor sees updated workflow diagram
3. Contributor understands: Spec creation → PM validation → Plan → Tasks → Implementation
4. Contributor follows correct workflow
5. Contributor submits high-quality PRs
```

**Out of Scope**:
- Interactive workflow (clickable steps) - future enhancement
- Video walkthrough of workflow - future enhancement
- Workflow validation tool - future enhancement

---

### US5: As a NEW USER, I want improved onboarding so I learn about two-spec architecture from day one

**Priority**: P2 (Medium)

**Acceptance Criteria**:
- **AC-US5-01**: `specweave init` output mentions two-spec architecture (P2, testable via CLI output)
- **AC-US5-02**: User's CLAUDE.md template includes FAQ link and brief explanation (P2, testable via template check)
- **AC-US5-03**: Post-init message provides link to FAQ page (P2, testable via CLI output)
- **AC-US5-04**: First-run experience includes opt-in tutorial (P3, testable via user flow)

**User Flow**:
```
1. User runs: specweave init my-project
2. CLI shows: "Creating .specweave/ structure..."
3. CLI shows: "SpecWeave uses two types of specs for different purposes..."
4. CLI shows: "  - Living Docs Specs (permanent, for major features)"
5. CLI shows: "  - Increment Specs (temporary, for focused work)"
6. CLI shows: "Learn more: https://spec-weave.com/docs/faq#specs-architecture"
7. User's CLAUDE.md includes FAQ reference
8. User starts with correct understanding
```

**Out of Scope**:
- Interactive tutorial (step-by-step walkthrough) - future enhancement
- Video onboarding - future enhancement
- Gamification (badges, achievements) - not needed

---

## Functional Requirements

### FR-001: FAQ Page Structure

**Description**: FAQ page must answer 8 critical questions with clear, concise answers

**Requirements**:
- **FR-001-01**: Q1: Why does SpecWeave have specs in TWO locations?
- **FR-001-02**: Q2: Is a living docs spec required for every increment? (Answer: NO)
- **FR-001-03**: Q3: Can I delete increment specs after completion? (Answer: YES)
- **FR-001-04**: Q4: Which spec is the "source of truth"? (Answer: Living docs when it exists)
- **FR-001-05**: Q5: How do I link brownfield documentation?
- **FR-001-06**: Q6: What if I have a small feature (1 increment)?
- **FR-001-07**: Q7: How do external PM tools (Jira, ADO, GitHub) integrate?
- **FR-001-08**: Q8: What about the Project Structure section?

**Implementation**: `docs-site/docs/faq.md`

---

### FR-002: Diagram Requirements

**Description**: Visual aids must clearly illustrate two-spec architecture and decision logic

**Requirements**:
- **FR-002-01**: Two-spec architecture diagram (Mermaid): Show Living Docs ↔ Increment Specs relationship
- **FR-002-02**: Decision flowchart (Mermaid): "Do I need a living docs spec?" with 4 decision points
- **FR-002-03**: Diagrams use Mermaid syntax (GitHub/Docusaurus compatible)
- **FR-002-04**: Diagrams are embeddable in Markdown files
- **FR-002-05**: Diagrams export to PNG for presentations (via Mermaid CLI)

**Implementation**: Embedded in FAQ page, README.md

---

### FR-003: PM Agent Validation

**Description**: PM agent must proactively suggest living docs specs for appropriate scenarios

**Requirements**:
- **FR-003-01**: Detect large features (3+ user stories mentioned, multiple components, "phases" keyword)
- **FR-003-02**: Detect brownfield integration (user mentions "existing", "legacy", "migration")
- **FR-003-03**: Detect external PM tools (config file has Jira/ADO/GitHub settings)
- **FR-003-04**: Provide clear suggestion message with reasoning
- **FR-003-05**: Allow user to skip (not mandatory, optional guidance)

**Implementation**: `plugins/specweave/agents/pm/AGENT.md` (step 1B: Living Docs Spec Check)

---

### FR-004: Workflow Diagram Updates

**Description**: Main workflow diagram must reflect current SpecWeave flow including two-spec architecture

**Requirements**:
- **FR-004-01**: Show specification phase with PM validation step
- **FR-004-02**: Clarify when living docs specs are created (optional, major features)
- **FR-004-03**: Show increment specs are always created (required)
- **FR-004-04**: Reflect PM tool auto-sync (v0.8.0 feature)
- **FR-004-05**: Include hooks (post-task-completion, living docs sync)

**Implementation**: Update Mermaid diagram in README.md "How It Works" section

---

### FR-005: User Onboarding Enhancement

**Description**: First-run experience must educate users about two-spec architecture

**Requirements**:
- **FR-005-01**: `specweave init` CLI output mentions two-spec architecture
- **FR-005-02**: CLAUDE.md template includes FAQ link and brief explanation
- **FR-005-03**: Post-init message includes link to FAQ page
- **FR-005-04**: User's `.specweave/docs/internal/README.md` includes specs explanation

**Implementation**: `src/cli/commands/init.ts`, `src/templates/CLAUDE.md.template`

---

## Non-Functional Requirements

### NFR-001: Documentation Quality

**Requirements**:
- **NFR-001-01**: FAQ answers are clear, concise (no jargon without explanation)
- **NFR-001-02**: Real-world examples included (authentication system)
- **NFR-001-03**: Readability score: Flesch Reading Ease > 60 (accessible to general audience)
- **NFR-001-04**: Cross-references to detailed docs (SPECS-ARCHITECTURE-CLARIFICATION.md)

---

### NFR-002: Diagram Quality

**Requirements**:
- **NFR-002-01**: Diagrams render correctly in GitHub, Docusaurus, and local Markdown viewers
- **NFR-002-02**: Diagrams use consistent SpecWeave branding (colors, fonts)
- **NFR-002-03**: Diagrams are simple (not overwhelming)
- **NFR-002-04**: Diagrams export to high-resolution PNG (300 DPI for presentations)

---

### NFR-003: PM Agent Validation Quality

**Requirements**:
- **NFR-003-01**: Detection accuracy > 90% (correctly identifies large features)
- **NFR-003-02**: False positive rate < 10% (rarely suggests when not needed)
- **NFR-003-03**: Non-intrusive (suggestion only, not mandatory)
- **NFR-003-04**: Clear reasoning provided (user understands why suggestion made)

---

### NFR-004: User Experience

**Requirements**:
- **NFR-004-01**: FAQ page loads < 2 seconds
- **NFR-004-02**: FAQ is searchable (browser Ctrl+F works)
- **NFR-004-03**: FAQ is mobile-friendly (responsive design)
- **NFR-004-04**: Links in FAQ are validated (no broken links)

---

## Technical Constraints

### TC-001: Backward Compatibility

**Constraint**: Changes must not break existing SpecWeave projects

**Implications**:
- PM agent suggestions are non-blocking (users can skip)
- Existing increments continue to work (no migration needed)
- FAQ is additive (no changes to existing workflow)

---

### TC-002: Technology Stack

**Constraint**: Use existing SpecWeave technology stack

**Stack**:
- Docusaurus 3.x for FAQ page
- Mermaid for diagrams (GitHub/Docusaurus compatible)
- Markdown for all documentation
- TypeScript for PM agent validation logic

---

### TC-003: Performance

**Constraint**: PM agent validation must not slow down increment creation

**Requirements**:
- Validation runs < 500ms
- No external API calls (local analysis only)
- Lightweight heuristics (not AI-powered)

---

## Out of Scope (Explicitly NOT Included)

### Not in This Increment

1. **Interactive FAQ** - Search, filtering, collapsible sections (future: 0009)
2. **Multi-language FAQ** - Translations to Russian, Spanish, Chinese (future: 0010)
3. **Video Tutorials** - Screencast walkthroughs (future: 0011)
4. **Interactive Diagrams** - Clickable, zoomable diagrams (future: 0012)
5. **AI-Powered Feature Size Estimation** - ML model predicting increment count (future: 0013)
6. **Mandatory Living Docs Specs** - Design principle: Keep optional (never)
7. **Auto-Create Living Docs Specs** - User decision, not auto (never)

### Deferred to Future Increments

1. **FAQ Analytics** - Track views, searches, popular questions (future: 0014)
2. **User Surveys** - Collect feedback on FAQ clarity (future: 0015)
3. **Contextual Help** - In-CLI help messages (future: 0016)
4. **Workflow Validation Tool** - CLI command to validate increment structure (future: 0017)

---

## Success Metrics

### User Adoption Metrics

| Metric | Baseline | Target | Timeframe |
|--------|----------|--------|-----------|
| **FAQ Page Views** | 0 | 500+ views/month | 3 months |
| **GitHub Issues (Confusion)** | ~5/month | < 2/month | 3 months |
| **Discord Questions (Specs)** | ~10/week | < 3/week | 2 months |
| **Living Docs Spec Usage** | Unknown | 60% of major features | 6 months |

### Quality Metrics

| Metric | Target |
|--------|--------|
| **FAQ Readability** | Flesch Reading Ease > 60 |
| **Diagram Render Success** | 100% (GitHub, Docusaurus, local) |
| **PM Agent Accuracy** | > 90% correct suggestions |
| **Link Validation** | 100% working links |

### Technical Metrics

| Metric | Target |
|--------|--------|
| **FAQ Page Load Time** | < 2 seconds |
| **PM Agent Validation Time** | < 500ms |
| **Test Coverage** | 80%+ for new code |
| **Zero Regressions** | All existing tests passing |

---

## Dependencies

### Internal Dependencies

- **Increment 0007**: Two-spec architecture established, SPECS-ARCHITECTURE-CLARIFICATION.md created
- **Existing documentation**: README.md, CLAUDE.md, FAQ-SECTION-PLAN.md

### External Dependencies

- **Docusaurus 3.x**: For FAQ page rendering
- **Mermaid**: For diagram rendering
- **GitHub Pages**: For website hosting

### Blocker Dependencies

- **None**: This increment is unblocked and ready for implementation

---

## Risks & Mitigation

### Risk 1: User Confusion Persists

**Risk**: FAQ might not fully address user confusion
**Probability**: Medium (30%)
**Impact**: High (users continue to be confused)
**Mitigation**:
- Include real-world examples in FAQ
- Link to comprehensive SPECS-ARCHITECTURE-CLARIFICATION.md
- Monitor GitHub issues and Discord questions
- Iterate based on user feedback

### Risk 2: PM Agent False Positives

**Risk**: PM agent suggests living docs specs when not needed
**Probability**: Medium (20%)
**Impact**: Medium (users annoyed by suggestions)
**Mitigation**:
- Use conservative detection heuristics
- Allow easy skip option
- Provide clear reasoning for suggestion
- Iterate based on user feedback

### Risk 3: Diagram Rendering Issues

**Risk**: Mermaid diagrams don't render on all platforms
**Probability**: Low (10%)
**Impact**: Medium (users see broken diagrams)
**Mitigation**:
- Test on GitHub, Docusaurus, local viewers
- Provide PNG fallbacks
- Use simple Mermaid syntax (widely supported)

---

## Acceptance Criteria (Increment-Level)

### Definition of Done

This increment is COMPLETE when:

1. ✅ **FAQ Page Published**: `docs-site/docs/faq.md` exists with 8+ questions
2. ✅ **Diagrams Created**: 2+ Mermaid diagrams (architecture, flowchart)
3. ✅ **PM Agent Enhanced**: Living docs spec suggestions implemented
4. ✅ **Workflow Diagram Updated**: Main Mermaid diagram reflects current flow
5. ✅ **Onboarding Updated**: `specweave init` mentions two-spec architecture
6. ✅ **Navigation Added**: FAQ linked from README and website nav
7. ✅ **Tests Passing**: 100% of existing tests + new tests for PM validation
8. ✅ **Documentation Updated**: CLAUDE.md, README.md reflect changes
9. ✅ **User Testing**: 2+ users confirm FAQ answers their questions
10. ✅ **No Regressions**: Existing functionality unchanged

---

## Related Documentation

### Preparation Documents (Increment 0007)

- [SPECS-ARCHITECTURE-CLARIFICATION.md](../0007-smart-increment-discipline/reports/SPECS-ARCHITECTURE-CLARIFICATION.md)
- [FAQ-SECTION-PLAN.md](../0007-smart-increment-discipline/reports/FAQ-SECTION-PLAN.md)
- [SESSION-COMPLETE-2025-11-04.md](../0007-smart-increment-discipline/reports/SESSION-COMPLETE-2025-11-04.md)

### Target Files (To Be Updated)

- `docs-site/docs/faq.md` (new)
- `README.md` (update workflow diagram, add FAQ link)
- `CLAUDE.md` (add FAQ reference)
- `plugins/specweave/agents/pm/AGENT.md` (add validation step)
- `src/cli/commands/init.ts` (enhance onboarding)
- `src/templates/CLAUDE.md.template` (add FAQ reference)

---

**Status**: READY FOR PLANNING
**Next Step**: Create plan.md (Architect agent) with technical design and implementation approach
