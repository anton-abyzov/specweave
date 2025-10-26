# Document Templates

This directory contains templates for all standard document types in the PRD/HLD/RFC/Runbook pattern.

## Available Templates

### Strategy Documents
- **`prd-template.md`** - Product Requirements Document
  - **Purpose**: Define the "why" - problem, users, success metrics
  - **Location**: `docs/internal/strategy/prd-{feature}.md`
  - **Usage**: `cp templates/docs/prd-template.md docs/internal/strategy/prd-{feature}.md`

### Architecture Documents
- **`hld-template.md`** - High-Level Design
  - **Purpose**: Define the "what" - system design, components, data model
  - **Location**: `docs/internal/architecture/hld-{system}.md`
  - **Usage**: `cp templates/docs/hld-template.md docs/internal/architecture/hld-{system}.md`

- **`adr-template.md`** - Architecture Decision Record
  - **Purpose**: Document architectural decisions with rationale
  - **Location**: `docs/internal/architecture/adr/0001-decision-title.md`
  - **Format**: Sequential numbering (0001, 0002, etc.)
  - **Usage**:
    ```bash
    # Find next number
    NEXT=$(printf "%04d" $(($(ls docs/internal/architecture/adr/ | grep -E '^[0-9]{4}' | tail -1 | cut -d'-' -f1) + 1)))
    cp templates/docs/adr-template.md docs/internal/architecture/adr/${NEXT}-decision-title.md
    ```

- **`rfc-template.md`** - Request for Comments
  - **Purpose**: Propose API designs, schema changes, major features
  - **Location**: `docs/internal/architecture/rfc/0001-feature-title.md`
  - **Format**: Sequential numbering (0001, 0002, etc.)
  - **Usage**:
    ```bash
    # Find next number
    NEXT=$(printf "%04d" $(($(ls docs/internal/architecture/rfc/ | grep -E '^[0-9]{4}' | tail -1 | cut -d'-' -f1) + 1)))
    cp templates/docs/rfc-template.md docs/internal/architecture/rfc/${NEXT}-feature-title.md
    ```

### Operations Documents
- **`runbook-template.md`** - Operations Runbook
  - **Purpose**: Step-by-step procedures for running and maintaining services
  - **Location**: `docs/internal/operations/runbook-{service}.md`
  - **Usage**: `cp templates/docs/runbook-template.md docs/internal/operations/runbook-{service}.md`

## Quick Start

### Creating a New Feature (Complete Workflow)

1. **Create PRD** (Strategy):
   ```bash
   cp templates/docs/prd-template.md docs/internal/strategy/prd-booking-system.md
   # Fill in: Problem, Users, Success Metrics, Scope
   ```

2. **Create HLD** (Architecture):
   ```bash
   cp templates/docs/hld-template.md docs/internal/architecture/hld-booking-system.md
   # Fill in: Architecture, Data Model, Integrations
   ```

3. **Create ADR** (if architectural decision needed):
   ```bash
   NEXT=$(printf "%04d" $(($(ls docs/internal/architecture/adr/ 2>/dev/null | grep -E '^[0-9]{4}' | tail -1 | cut -d'-' -f1 | sed 's/^0*//' || echo 0) + 1)))
   cp templates/docs/adr-template.md docs/internal/architecture/adr/${NEXT}-use-postgresql.md
   ```

4. **Create RFC** (for API design):
   ```bash
   NEXT=$(printf "%04d" $(($(ls docs/internal/architecture/rfc/ 2>/dev/null | grep -E '^[0-9]{4}' | tail -1 | cut -d'-' -f1 | sed 's/^0*//' || echo 0) + 1)))
   cp templates/docs/rfc-template.md docs/internal/architecture/rfc/${NEXT}-booking-api.md
   ```

5. **Create Runbook** (Operations):
   ```bash
   cp templates/docs/runbook-template.md docs/internal/operations/runbook-booking-service.md
   # Fill in: SLOs, Procedures, Escalation
   ```

## Template Usage Guidelines

### Fill in ALL Sections
- Do not leave template placeholders (e.g., `[Feature Name]`, `YYYY-MM-DD`)
- Replace all `@name`, `@team` with actual names
- Fill in all checklists

### Update Status
- Start with `status: draft`
- Move to `status: review` when ready for PR
- Change to `status: approved` when merged
- Use `status: deprecated` when superseded

### Cross-Link Documents
- PRD → HLD (link from PRD to HLD)
- HLD → ADR (link to all relevant ADRs)
- RFC → HLD (link from RFC to HLD)
- Runbook → HLD (link from runbook to architecture)

### Use Diagrams
- Use Mermaid for diagrams (supported in Markdown)
- Export to PNG for presentations if needed
- Keep diagrams simple and clear

### Review and Approval
- Create PR for all new documents
- Tag appropriate reviewers (see CODEOWNERS)
- Address feedback before merging
- Update status after approval

## Customizing Templates

You can customize these templates for your project:

1. **Add sections** relevant to your domain
2. **Remove sections** not applicable
3. **Adjust approval process** to match your workflow
4. **Update cross-links** to match your structure

## Related Documentation

- [docs/README.md](../../docs/README.md) - Documentation structure
- [docs/internal/README.md](../../docs/internal/README.md) - Internal documentation guide
- [CLAUDE.md](../../CLAUDE.md) - Complete development guide
