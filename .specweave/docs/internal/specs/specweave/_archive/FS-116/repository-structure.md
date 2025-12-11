# LivingSpec Repository Structure

This document defines the structure for the public `livingspec/specification` GitHub repository that hosts the LivingSpec Universal Standard.

## Repository Overview

**Repository**: `github.com/livingspec/specification`
**Purpose**: Open-source specification for synchronized living documentation
**License**: MIT

## Directory Structure

```
livingspec/specification/
├── README.md                    # Overview, badges, quick links
├── LICENSE                      # MIT License
├── CONTRIBUTING.md              # Contribution guidelines
├── CODE_OF_CONDUCT.md           # Community standards
├── CHANGELOG.md                 # Version history
│
├── SPECIFICATION.md             # Complete specification document
│
├── schemas/                     # JSON Schema definitions
│   ├── v1/
│   │   ├── manifest.schema.json
│   │   ├── epic.schema.json
│   │   ├── feature.schema.json
│   │   ├── user-story.schema.json
│   │   ├── task.schema.json
│   │   ├── acceptance-criteria.schema.json
│   │   └── adr.schema.json
│   └── README.md                # Schema documentation
│
├── examples/                    # Reference implementations
│   ├── minimal/                 # Bare minimum setup
│   │   ├── .livingspec/
│   │   │   ├── manifest.yaml
│   │   │   └── specs/
│   │   │       └── FS-001/
│   │   │           └── FEATURE.md
│   │   └── README.md
│   ├── full/                    # Complete example
│   │   ├── .livingspec/
│   │   │   ├── manifest.yaml
│   │   │   ├── specs/
│   │   │   ├── architecture/
│   │   │   ├── work/
│   │   │   └── sync/
│   │   └── README.md
│   └── external-sync/           # E-suffix and sync example
│       ├── .livingspec/
│       │   ├── manifest.yaml
│       │   ├── specs/
│       │   │   └── FS-001E/      # External feature
│       │   └── sync/
│       └── README.md
│
├── guides/                      # User guides
│   ├── quick-start.md
│   ├── docusaurus-integration.md
│   ├── mkdocs-integration.md
│   ├── migration-confluence.md
│   ├── migration-notion.md
│   └── e-suffix-guide.md
│
├── glossary/                    # Terminology
│   └── GLOSSARY.md
│
├── diagrams/                    # Architecture diagrams
│   ├── c4-context.mmd
│   ├── c4-container.mmd
│   ├── e-suffix-flow.mmd
│   └── README.md
│
├── .github/                     # GitHub configuration
│   ├── workflows/
│   │   ├── validate.yml         # Schema validation CI
│   │   ├── release.yml          # Release automation
│   │   └── docs.yml             # Documentation deployment
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── spec_change.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
└── docs-site/                   # Docusaurus documentation site
    ├── docusaurus.config.js
    ├── sidebars.js
    ├── docs/
    ├── src/
    └── package.json
```

## File Contents

### README.md

```markdown
# LivingSpec Universal Standard

[![Version](https://img.shields.io/github/v/release/livingspec/specification)](https://github.com/livingspec/specification/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-livingspec.io-blue)](https://livingspec.io)

**LivingSpec** is an open, vendor-neutral standard for synchronized living documentation.

## What is LivingSpec?

LivingSpec solves the documentation crisis by:
- **Staying in sync** - Bidirectional sync with GitHub, JIRA, ADO
- **Being structured** - Machine-readable with JSON schemas
- **Supporting AI** - Optimized for LLM context loading
- **Tracking origins** - E-suffix for external imports

## Quick Start

\`\`\`bash
npm install -g livingspec-cli
livingspec init
\`\`\`

See [Quick Start Guide](guides/quick-start.md) for details.

## Documentation

- [Full Specification](SPECIFICATION.md)
- [JSON Schemas](schemas/)
- [Examples](examples/)
- [Guides](guides/)
- [Glossary](glossary/GLOSSARY.md)

## Implementations

| Tool | Status | Link |
|------|--------|------|
| CLI Validator | ✅ Stable | [livingspec-cli](https://npmjs.com/package/livingspec-cli) |
| Docusaurus Plugin | ✅ Stable | [@livingspec/docusaurus-plugin](https://npmjs.com/package/@livingspec/docusaurus-plugin) |
| VS Code Extension | 🚧 Beta | [marketplace](https://marketplace.visualstudio.com) |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - See [LICENSE](LICENSE)
```

### CONTRIBUTING.md

```markdown
# Contributing to LivingSpec

Thank you for your interest in contributing to the LivingSpec standard!

## Ways to Contribute

1. **Report Issues** - Found a bug or have a suggestion? Open an issue.
2. **Improve Documentation** - Fix typos, clarify explanations, add examples.
3. **Propose Changes** - Submit RFCs for specification changes.
4. **Build Tools** - Create implementations, plugins, or integrations.

## Specification Changes

Changes to the core specification require an RFC:

1. Open an issue with the `rfc` label
2. Describe the proposed change and rationale
3. Community discussion period (2 weeks minimum)
4. Maintainer review and decision
5. Implementation in next minor/major version

### E-Suffix Standard

The E-suffix convention for external items is **immutable**:
- Never remove E-suffix support
- Add patterns additively only
- Maintain backwards compatibility

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

\`\`\`bash
git clone https://github.com/livingspec/specification.git
cd specification
npm install
npm run validate
\`\`\`

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure validation passes
5. Submit a PR with clear description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
```

### .github/workflows/validate.yml

```yaml
name: Validate Specification

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate JSON Schemas
        run: |
          npx ajv validate -s schemas/v1/manifest.schema.json -d examples/*/**.yaml
          npx ajv validate -s schemas/v1/feature.schema.json -d examples/**/FEATURE.md --preprocess

      - name: Check E-Suffix Consistency
        run: |
          # Verify all E-suffix items have origin metadata
          for file in $(grep -rl 'E"$' examples/); do
            if ! grep -q 'origin:' "$file"; then
              echo "ERROR: E-suffix item missing origin: $file"
              exit 1
            fi
          done

      - name: Lint Markdown
        run: npx markdownlint '**/*.md' --ignore node_modules

      - name: Check Links
        run: npx markdown-link-check **/*.md --quiet
```

### CHANGELOG.md

```markdown
# Changelog

All notable changes to the LivingSpec specification will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial specification release

## [1.0.0] - YYYY-MM-DD

### Added
- Core specification document
- JSON schemas for all document types
- E-suffix convention for external items
- Directory structure definition
- Sync protocol specification
- AI context protocol
- Docusaurus integration guide
- MkDocs integration guide
- Migration guides (Confluence, Notion)
- Quick-start guide

### E-Suffix Standard
- EP-XXXE for external Epics
- FS-XXXE for external Features
- US-XXXE for external User Stories
- AC-XXXE for external Acceptance Criteria
- T-XXXE for external Tasks
- Propagation rules defined
- Immutability rules defined
```

## GitHub Labels

Create these labels for issue management:

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | #d73a4a | Something isn't working |
| `enhancement` | #a2eeef | New feature or request |
| `documentation` | #0075ca | Documentation improvements |
| `rfc` | #7057ff | Request for Comments on spec changes |
| `e-suffix` | #008672 | Related to E-suffix standard |
| `schema` | #fbca04 | JSON schema related |
| `breaking` | #b60205 | Breaking change |
| `good first issue` | #7057ff | Good for newcomers |

## Branch Strategy

- `main` - Stable specification
- `develop` - Development branch
- `feature/*` - Feature branches
- `rfc/*` - RFC proposal branches
- `release/*` - Release preparation

## Release Process

1. Create `release/vX.Y.Z` branch from `develop`
2. Update CHANGELOG.md
3. Update version in manifest examples
4. Run full validation
5. Create PR to `main`
6. Tag release after merge
7. Publish to npm (CLI, plugins)
8. Deploy documentation site

## See Also

- [Delivery Documentation](../delivery/)
- [Governance Documentation](../governance/)
- [Strategy Documentation](../strategy/)
