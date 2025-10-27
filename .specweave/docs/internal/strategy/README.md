# Strategy Documentation - The "Why"

**Purpose**: Define the business rationale, vision, and success metrics for features and initiatives.

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
5. Once approved, reference in HLD and RFC

## Index of Strategy Documents

### PRDs
- (None yet - create your first PRD!)

### Vision Documents
- (None yet)

### OKRs
- (None yet)

## Related Documentation

- [Architecture Documentation](../architecture/README.md) - Links PRDs to HLD/ADR/RFC
- [Delivery Documentation](../delivery/README.md) - Links PRDs to roadmap
- [PRD Template](../../../templates/docs/prd-template.md)
