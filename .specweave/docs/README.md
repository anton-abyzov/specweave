# SpecWeave Documentation

This documentation follows the **PRD/HLD/RFC/Runbook** pattern with a clear separation between internal and public documentation.

## Structure

### `/internal/` - Internal Playbook (NOT published)

Your Product & Engineering Playbook — specs, RFCs, runbooks. Not published publicly.

- **`/strategy/`** - The "why" (PRD, vision, OKRs, business case)
- **`/architecture/`** - The "what" (HLD, ADR, data models, system design)
  - `/adr/` - Architecture Decision Records (0001-decision.md)
  - `/rfc/` - Request for Comments (0001-feature.md)
- **`/delivery/`** - The "how we build" (roadmap, release plans, CI/CD)
- **`/operations/`** - The "how we run" (SLOs, runbooks, monitoring, DR/BCP)
- **`/governance/`** - The "guardrails" (security, compliance, change management)

### `/public/` - Customer-Facing (PUBLISHED)

This is your customer-facing documentation. Includes simplified diagrams, feature explanations, and limited technical depth (no secrets).

- **`/overview/`** - Introduction, features, getting started
- **`/architecture/`** - Simplified architecture diagrams
- **`/api/`** - API documentation, OpenAPI specs
- **`/guides/`** - User guides, tutorials
- **`/faq/`** - Frequently Asked Questions

## Document Types

### PRD (Product Requirements Document)
**Location**: `internal/strategy/`
**Purpose**: Define the "why" - problem, target users, success metrics, scope

### HLD (High-Level Design)
**Location**: `internal/architecture/`
**Purpose**: Define the "what" - system design, components, data models, integrations

### ADR (Architecture Decision Record)
**Location**: `internal/architecture/adr/`
**Format**: `0001-decision-title.md`
**Purpose**: Document architectural decisions with context and rationale

### RFC (Request for Comments)
**Location**: `internal/architecture/rfc/` or `internal/delivery/`
**Format**: `0001-feature-title.md`
**Purpose**: Propose changes, gather feedback, document API/schema

### Runbook (Operations Guide)
**Location**: `internal/operations/`
**Purpose**: Step-by-step procedures for running and maintaining the system

## Governance

- Everything via PRs in Git
- Reviewers by pillar using CODEOWNERS
- Status gates: `draft` → `review` → `approved` → `deprecated`
- One ADR per major decision; cross-link from HLD/RFC
- Changelog: `docs/CHANGELOG.md` for notable decisions and doc changes

## Publishing

Documentation is rendered using **Docusaurus** (configured in `docs-site/docusaurus.config.ts`).

```bash
# Serve locally (development mode with hot-reload)
npm run docs:dev

# Build static site (production)
npm run docs:build

# Deploy to GitHub Pages/Vercel
# Automated via GitHub Actions on push
```

## Docusaurus Configuration

- **Internal + Public docs**: Single site serving both `.specweave/docs/internal/` and `.specweave/docs/public/`
- **Auto-deployment**: Automatically deployed via GitHub Actions
- **Search**: Algolia integration (or local search fallback)
- **Mermaid diagrams**: Native SVG rendering with hot-reload
- **Versioning**: Built-in version management

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Complete development guide
- [docs-site/docusaurus.config.ts](../../docs-site/docusaurus.config.ts) - Docusaurus configuration
- [internal/strategy/README.md](internal/strategy/README.md) - Strategy documentation index
- [internal/architecture/README.md](internal/architecture/README.md) - Architecture documentation index
- [public/overview/README.md](public/overview/README.md) - Public documentation index
