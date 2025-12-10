# External Integrations Team

Specializes in bidirectional synchronization between SpecWeave and external issue tracking systems (GitHub Issues, JIRA, Azure DevOps). Handles API communication, conflict resolution, and maintains data consistency across platforms.

## Responsibilities

- Implement and maintain REST API clients for GitHub, JIRA, and Azure DevOps
- Design bidirectional sync algorithms with conflict resolution
- Handle rate limiting, pagination, and API authentication
- Maintain credential management and multi-organization support
- Ensure format preservation during sync operations

## Domain Expertise

- GitHub REST API
- JIRA REST API and Atlassian Document Format (ADF)
- Azure DevOps REST API
- OAuth and PAT authentication
- Conflict resolution strategies

## Technology Stack

- TypeScript
- Axios
- Octokit
- REST APIs
- YAML frontmatter
- gray-matter

## Repositories

- [integrations](../../../modules/integrations.md)
- [sync](../../../modules/sync.md)
- [importers](../../../modules/importers.md)

## Integration Boundaries

Upstream: Depends on core for configuration and logging. Downstream: living-docs and progress consume imported/synced data.

---
*Clustering reasoning: These repos share the common purpose of external platform communication. Integrations provides the API clients, sync coordinates bidirectional state, and importers handles initial data ingestion. All three deal with rate limiting, pagination, and platform-specific data formats.*
*Generated on 2025-12-10*