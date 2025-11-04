# Strategy Documentation - The "Why"

**Purpose**: Define the business rationale, vision, and success metrics for features and initiatives.

## Documentation Flow

Strategy docs are the **starting point** for all features. They flow through the system like this:

![Documentation Flow](../architecture/diagrams/documentation-flow.svg)

**Flow Explained**:
1. **Strategy** - Define WHY we're building something (PRD, Vision, OKRs)
2. **Specs** - Define WHAT we're building (User Stories, Acceptance Criteria)
3. **Architecture** - Define HOW we design it (HLD, ADRs, Diagrams)
4. **Delivery** - Define HOW we build it (Plan, Tasks, Roadmap)
5. **Operations** - Define HOW we run it (Runbooks, SLOs)
6. **Governance** - Define the guardrails (Security, Standards, Compliance)

## What Goes Here

- **PRD (Product Requirements Document)** - Problem, target users, success metrics, scope
- **Vision Documents** - Long-term product vision
- **OKRs** - Objectives and Key Results
- **Business Cases** - ROI analysis, cost-benefit
- **Stakeholder Maps** - Who cares about what

## Document Structure

### PRD (Product Requirements Document)

**Template**: See `templates/docs/prd-template.md`

**Sections**:
- **Problem** - What problem are we solving?
- **Target Users** - Who is this for?
- **Desired Outcomes / Success Metrics** - How do we measure success?
- **Scope (In / Out)** - What's included and excluded?
- **Assumptions & Risks** - What could go wrong?
- **Alternatives Considered** - What else did we consider?
- **Milestones & Release Criteria** - When are we done?

**Naming Convention**: `prd-{feature-name}.md`

**Example**: `prd-booking-system.md`, `prd-stripe-integration.md`

## Creating a New PRD

1. Copy template: `cp templates/docs/prd-template.md docs/internal/strategy/prd-{feature}.md`
2. Fill in all sections
3. Create PR for review
4. Tag stakeholders and product team
5. Once approved, reference in HLD and Spec

## Index of Strategy Documents

### PRDs
- (None yet - create your first PRD!)

### Vision Documents
- (None yet)

### OKRs
- (None yet)

## Related Documentation

- [Architecture Documentation](../architecture/README.md) - Links PRDs to HLD/ADR/Spec
- [Delivery Documentation](../delivery/README.md) - Links PRDs to roadmap
- [PRD Template](../../../templates/docs/prd-template.md)
