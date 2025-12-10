# Documentation & Living Docs Team

Owns the living documentation system including automatic generation, intelligent organization, ID allocation, and documentation health monitoring. Ensures traceability between specifications and implementation.

## Responsibilities

- Manage hierarchical living documentation structure
- Implement intelligent ID allocation with collision detection
- Generate and organize documentation with theme classification
- Monitor documentation health and detect mismatches
- Ensure Docusaurus compatibility for preview functionality

## Domain Expertise

- Living documentation patterns
- Markdown/MDX processing
- Docusaurus integration
- ID allocation algorithms
- Documentation health scoring

## Technology Stack

- TypeScript
- gray-matter
- YAML
- Markdown
- Docusaurus
- glob patterns

## Repositories

- [living-docs](../../../modules/living-docs.md)
- [generators](../../../modules/generators.md)
- [templates](../../../modules/templates.md)

## Integration Boundaries

Upstream: Receives sync data from integrations team. Downstream: Provides documentation structure consumed by CLI commands and adapters.

---
*Clustering reasoning: These repos collaborate on documentation generation and management. living-docs handles organization and ID allocation, generators parse spec files for traceability, and templates provide the scaffolding for generated documentation. All focus on maintaining accurate, organized documentation.*
*Generated on 2025-12-10*