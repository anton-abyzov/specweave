# integrations

*Analyzed: 2025-12-10 | Confidence: medium**

## Purpose

Integration layer providing bidirectional synchronization between SpecWeave's internal increment/user-story tracking system and external issue trackers (JIRA and Azure DevOps). It handles mapping work items, hierarchies, credentials, caching, and API communication for both platforms.

## Key Concepts

- Bidirectional sync between SpecWeave increments and external issue trackers
- Three-tier dependency loading (metadata-only, on-demand, bulk preload)
- Work item hierarchy mapping (Epic → Feature → User Story → Task)
- Multi-organization credential management with environment variable fallbacks
- 24-hour TTL caching with rate limit detection and stale cache fallback
- Area path and board-based project organization

## Patterns

- **REST API Client with Basic Authentication** (api)
- **Atlassian Document Format (ADF) for Rich Content** (api)
- **Repository Pattern for Data Access** (data)
- **YAML Frontmatter for Document Metadata** (data)
- **Multi-Tenant Credential Management** (auth)
- **Environment Variable Configuration with Normalization** (auth)
- **Three-Tier Lazy Loading with Caching** (architecture)
- **TTL-Based Cache with Stale Fallback** (data)
- **Rate Limit Detection and Handling** (api)
- **Hierarchical Data Mapping** (architecture)
- **Bidirectional Sync with Conflict Detection** (integration)
- **Filter Presets with Custom JQL Support** (data)
- **Progress Tracking with Cancelation Support** (architecture)
- **Dependency Injection for Logging** (architecture)
- **Work Item Type Polymorphism** (architecture)
- **RFC Document Generation** (structure)

## External Dependencies

- JIRA Cloud REST API v3
- Azure DevOps REST API v7.0
- Atlassian Document Format (ADF)
- js-yaml (YAML parsing)
- chalk (console colors)
- @inquirer/prompts (interactive CLI)

## Observations

- Both JIRA and ADO integrations follow identical architectural patterns (three-tier loading, caching, rate limiting) ensuring consistency
- The credential providers support multi-tenant scenarios where different organizations/domains may require different authentication
- Sync direction is tracked (import/export/bidirectional) but conflict resolution currently defaults to 'external wins' (JIRA/ADO)
- The MetadataManager.validateBeforeCreate check prevents duplicate increment IDs during import operations
- Area path granularity selection (top-level, two-level, full-tree) allows flexible project organization based on ADO hierarchy complexity
- JiraHierarchyMapper detects project methodology (Agile, CMMI, SAFe) to use appropriate issue type mappings, though currently defaults to Agile
- The IncrementNumberManager integration ensures gap-filling for increment IDs when items are archived
- Pull sync filter (updatedSince) uses relative JQL format (-Xh) for efficient incremental syncs