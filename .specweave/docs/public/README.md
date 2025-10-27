# Public Documentation

**This documentation IS published publicly.** It is customer-facing and should contain no secrets or internal details.

## Structure

### `/overview/` - Introduction
- **Purpose**: High-level introduction to the product
- **Contents**: Features, getting started, FAQ
- **Audience**: New users, evaluators, decision-makers

### `/architecture/` - Architecture Overview
- **Purpose**: Simplified architecture diagrams
- **Contents**: System overview, component diagrams (simplified), data flow
- **Audience**: Technical evaluators, developers integrating with your product
- **Note**: NO internal implementation details, NO secrets

### `/api/` - API Documentation
- **Purpose**: API reference for developers
- **Contents**: OpenAPI specs, authentication, rate limits, examples
- **Audience**: Developers integrating with your API

### `/guides/` - User Guides
- **Purpose**: Step-by-step tutorials
- **Contents**: How-to guides, tutorials, best practices
- **Audience**: End users, developers

### `/faq/` - Frequently Asked Questions
- **Purpose**: Common questions and answers
- **Contents**: FAQ items organized by topic
- **Audience**: All users

## What NOT to Include

❌ Internal architecture details (HLD)
❌ Architecture Decision Records (ADR)
❌ Security model internals
❌ Database schemas
❌ Internal runbooks
❌ Secrets, credentials, API keys
❌ Internal roadmap, release plans
❌ Compliance documentation details

## Creating Public Documentation

### Overview:
```bash
touch docs/public/overview/intro.md
touch docs/public/overview/features.md
```

### Architecture:
```bash
# Create simplified architecture overview
touch docs/public/architecture/overview.md
# Add diagrams (use Mermaid, export to PNG)
```

### API:
```bash
# Create API documentation
touch docs/public/api/index.md
touch docs/public/api/authentication.md
# Add OpenAPI spec
touch docs/public/api/openapi.yaml
```

### Guides:
```bash
# Create user guides
touch docs/public/guides/{guide-name}.md
```

### FAQ:
```bash
touch docs/public/faq/index.md
```

## Publishing

Public documentation is published using **MkDocs** (configured in `mkdocs.yml`).

```bash
# Serve locally
mkdocs serve

# Build static site
mkdocs build

# Deploy to GitHub Pages
mkdocs gh-deploy
```

The `mkdocs.yml` configuration should:
- **Include** all `docs/public/` content
- **Exclude** all `docs/internal/` content (or have separate builds)

## Related Documentation

- [Internal Documentation](../internal/README.md) - Internal playbook (NOT published)
- [MkDocs Configuration](../../mkdocs.yml)
