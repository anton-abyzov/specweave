# SpecWeave Masterclass - Slide Deck Outline

**Total Slides**: ~80-100
**Duration**: 2h 50min
**Format**: 16:9 (1920x1080)

---

## Slide Sequence

### Opening (Slides 1-5)

**Slide 1: Title**
- SpecWeave Masterclass
- Spec-Driven Development for the AI Era
- Anton Abyzov

**Slide 2: The Problem**
- Image: Chaotic code changes
- Text: "Vibe Coding" - AI makes changes based on vibes, not verified specs
- Result: Broken features, regression bugs, production issues

**Slide 3: What You'll Learn**
- Build software where specifications are the source of truth
- Reduce AI context usage by 70%+
- Transform legacy codebases safely
- Create custom AI skills
- Close the loop with tests that tell the truth

**Slide 4: Who This Is For**
- Developers (faster with AI, without sacrificing quality)
- Architects (maintain system integrity at scale)
- Technical Leads (code quality + team velocity)

**Slide 5: What Makes SpecWeave Different**
- Specifications ARE the source of truth
- Context precision (70%+ token reduction)
- Skills-based architecture
- Brownfield-ready
- Test-validated

---

### Part 1: The Problem & Solution (Slides 6-15)

**Slide 6: Vibe Coding Problem**
- AI refactors authentication
- Looks great, but...
- Production: 💥 Users can't log in

**Slide 7: Three Root Causes**
1. No Source of Truth
2. Context Overload
3. No Validation Loop

**Slide 8: SpecWeave Solution**
- Specifications as source of truth
- Context precision
- Skills-based architecture

**Slide 9: Traditional vs SpecWeave**
- Traditional: Code → Docs (maybe) → Tests (hopefully)
- SpecWeave: Specification → Implementation → Tests → Validation

**Slide 10: Context Precision**
- Full codebase: 500,000 tokens
- With manifest: 10,000 tokens
- Reduction: 98%

**Slide 11: Skills System**
- specweave-detector (entry point)
- feature-planner (creates plans)
- context-loader (loads selectively)
- developer (implements)
- qa-engineer (validates)
- brownfield-analyzer (legacy code)

**Slide 12: Before vs After**
- Before: "I made improvements!" → "Did you break anything?" → 💥
- After: Spec → Plan → Implement → Test → Deploy ✅

---

### Part 2: Comparison to Alternatives (Slides 16-30)

**Slide 16: Framework Landscape**
- BMAD-METHOD
- SpecKit
- SpecWeave

**Slide 17: BMAD-METHOD Overview**
- Agentic agile development
- Explicit roles (@pm, @architect, @dev, @qa)
- Two-phase workflow

**Slide 18-22: BMAD Comparison**
- Slide 18: Philosophy (role-based vs spec-first)
- Slide 19: Workflow comparison
- Slide 20: Context management
- Slide 21: QA approach
- Slide 22: When to choose BMAD

**Slide 23: SpecKit Overview**
- Lightweight specification toolkit
- Templates, validation, workflows
- Spec management only

**Slide 24-28: SpecKit Comparison**
- Slide 24: Scope (narrow vs comprehensive)
- Slide 25: Features comparison table
- Slide 26: Workflow comparison
- Slide 27: Use case examples
- Slide 28: When to choose SpecKit

**Slide 29: Decision Guide**
- Choose BMAD if...
- Choose SpecKit if...
- Choose SpecWeave if...

**Slide 30: Use Multiple Together**
- BMAD + SpecWeave hybrid
- SpecKit + SpecWeave migration path

---

### Part 3: Core Concepts (Slides 31-45)

**Slide 31: Concept 1 - Specifications as Source of Truth**
- Paradigm shift diagram

**Slide 32: Specification Structure**
- Directory tree: specifications/modules/

**Slide 33: Modular Specifications**
- payments/stripe/
- payments/paypal/
- payments/shared/

**Slide 34: Example Spec**
- Stripe payment spec excerpt

**Slide 35: Concept 2 - Context Precision**
- Token usage graph (before/after)

**Slide 36: Context Manifest Example**
```yaml
spec_sections:
  - specifications/modules/payments/stripe/spec.md
max_context_tokens: 10000
```

**Slide 37: Context Loading Flow**
- Diagram: manifest → context-loader → AI

**Slide 38: Concept 3 - Skills-Based Architecture**
- Skills diagram (auto-routing)

**Slide 39: Core Skills List**
- Entry, Planning, Implementation, QA, Brownfield, Integration

**Slide 40: Skill Activation Example**
- User request → skill-router → appropriate skill

**Slide 41: Creating Custom Skills**
- SKILL.md structure
- Domain expertise examples

**Slide 42: Concept 4 - Living Documentation**
- Auto-update via hooks
- Manual vs auto sections

**Slide 43: Documentation Structure**
- getting-started/, guides/, reference/, architecture/, decisions/

**Slide 44: Concept 5 - Hooks System**
- post_task_completion
- pre_implementation
- human_input_required

**Slide 45: Core Concepts Summary**
- 5 key concepts visual

---

### Part 4: Greenfield Demo (Slides 46-55)

**Slide 46: Demo Introduction**
- Building TaskMaster from scratch
- 30 minutes: Spec → Tested code

**Slide 47: Project Setup**
- `specweave init`
- Directory structure created

**Slide 48: Writing Specifications**
- AI-assisted spec creation
- Modular organization

**Slide 49: Feature Planning**
- feature-planner creates 001-user-authentication/
- spec.md, plan.md, tasks.md, context-manifest.yaml

**Slide 50: Context Manifest**
- Only 8k tokens loaded (84% reduction)

**Slide 51: Implementation**
- developer skill implements from plan
- Code generated in 10 minutes

**Slide 52: Generated Code Example**
- AuthService excerpt

**Slide 53: Testing**
- qa-engineer: 12 unit tests
- playwright-tester: 15 E2E tests

**Slide 54: Documentation Auto-Update**
- Hook fires → docs-updater → API reference, changelog

**Slide 55: Greenfield Summary**
- 30 minutes: idea → tested, documented feature

---

### Part 5: Brownfield Demo (Slides 56-70)

**Slide 56: Demo Introduction**
- Transforming EasyChamp (production codebase)
- Adding Google OAuth safely

**Slide 57: Project Onboarding**
- `specweave init --brownfield`
- Existing code preserved

**Slide 58: Brownfield Analysis**
- brownfield-analyzer scans codebase
- 12,400 lines analyzed in 2 minutes

**Slide 59: Retroactive Specifications**
- 6 comprehensive docs generated
- Current behavior documented

**Slide 60: Regression Tests**
- 42 E2E tests capture ALL current behavior
- Baseline established

**Slide 61: Stakeholder Review**
- Critical: confirm tests are complete
- Missing edge cases? Add tests now

**Slide 62: Planning OAuth Feature**
- feature-planner creates 015-google-oauth/
- Constraints from existing system preserved

**Slide 63: Context Manifest (Brownfield)**
- Loads existing specs + new feature
- Explicit constraints

**Slide 64: Pre-Implementation Hook**
- Verifies specs exist ✅
- Verifies regression tests exist ✅
- Runs baseline tests ✅

**Slide 65: Safe Implementation**
- Additive database changes only
- Existing code unchanged
- OAuth code in separate files

**Slide 66: Post-Implementation Validation**
- Re-run regression tests
- All 42 still pass ✅
- 20 new OAuth tests pass ✅

**Slide 67: Validation Report**
- NO REGRESSIONS
- All tests pass
- Ready for deployment

**Slide 68: Documentation Auto-Update**
- Hook fires
- API reference updated
- Changelog updated

**Slide 69: Brownfield Summary**
- 40 minutes: analysis → safe extension

**Slide 70: Key Takeaway**
- Brownfield is SAFE with SpecWeave

---

### Part 6: Advanced Features (Slides 71-80)

**Slide 71: Creating Custom Skills**
- SKILL.md template
- Domain expertise example (agile-expert)

**Slide 72: Skill Testing**
- Minimum 3 tests per skill
- YAML test format

**Slide 73: Context Manifest Best Practices**
- Advanced patterns (anchors, dependencies, cache)

**Slide 74: Integration with External Tools**
- JIRA sync
- GitHub sync
- Azure DevOps sync

**Slide 75: Testing Demonstrations**
- Skill tests
- E2E tests
- Truth-telling tests

**Slide 76: Closed-Loop Validation**
- Spec → Implementation → Tests → Validation Report

**Slide 77: Best Practices**
- Do's and Don'ts list

**Slide 78: Common Pitfalls**
- Monolithic specs
- No context manifests
- False positive tests
- Skipping brownfield analysis

**Slide 79: Tips for Success**
- Start small
- Iterate on specs
- Custom skills for your domain
- Use ADRs
- Review with stakeholders

**Slide 80: Conclusion**
- What we covered
- Getting started steps
- Join the community

---

## Visual Style Guide

### Color Palette
- Primary: #2563EB (Blue)
- Secondary: #10B981 (Green)
- Accent: #F59E0B (Amber)
- Background: #F9FAFB (Light gray)
- Text: #111827 (Dark gray)

### Typography
- Headings: Inter Bold, 48-72pt
- Body: Inter Regular, 24-32pt
- Code: JetBrains Mono, 18-24pt

### Layout
- Consistent header with SpecWeave logo
- Section indicators (Part 1/10)
- Page numbers
- Consistent footer

### Code Blocks
- Syntax highlighting
- Line numbers for important sections
- Annotations for key points

### Diagrams
- Mermaid-style flow diagrams
- Clean, minimal design
- Consistent arrow styles
- Clear labels

### Screenshots
- High resolution (2x for retina)
- Annotations with arrows/highlights
- Consistent terminal theme

---

## Animation Guidelines

- Slide transitions: Fade (0.3s)
- Bullet points: Appear one at a time
- Code: Highlight key lines
- Diagrams: Build progressively
- Comparisons: Side-by-side reveal

---

## Notes for Presenter

- Each slide has talking points in script
- Demo slides: switch to live demo
- Code slides: zoom in if needed
- Pause for questions at major sections
- Timebox each part strictly

---

**Last Updated**: 2025-01-26
**Version**: 1.0
**For**: SpecWeave Masterclass Video
