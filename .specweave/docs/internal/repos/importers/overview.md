# importers

*Analyzed: 2025-12-10 | Confidence: medium**

## Purpose

A multi-platform import system that fetches work items (issues, epics, user stories, tasks) from GitHub, JIRA, and Azure DevOps, converts them to a platform-agnostic format, and generates living documentation markdown files with hierarchical organization (epics, features, user stories).

## Key Concepts

- External item import with pagination
- Multi-platform abstraction (GitHub/JIRA/ADO)
- Rate limiting and backoff strategies
- Duplicate detection via external ID mapping
- Hierarchy mapping (Epic→Feature→UserStory→Task)
- Living docs markdown generation
- 2-level directory structure support
- Orphan item handling
- Parent recovery for incomplete hierarchy imports

## Patterns

- **REST API Integration (GitHub, JIRA, ADO)** (api)
- **Adapter Pattern for Multi-Platform Abstraction** (architecture)
- **Async Generator Pagination** (architecture)
- **Rate Limiting with Exponential Backoff** (api)
- **Repository Pattern for Duplicate Detection** (data)
- **Strategy Pattern for Hierarchy Mapping** (architecture)
- **Factory Pattern for Importer Creation** (architecture)
- **Coordinator/Orchestrator Pattern** (architecture)
- **Gray-matter Frontmatter Parsing** (data)
- **MDX/HTML Sanitization** (security)
- **Caching with Cache Invalidation** (data)
- **Callback-based Progress Reporting** (architecture)
- **File System as Data Store** (data)
- **Atlassian Document Format (ADF) Parsing** (data)
- **Acceptance Criteria Extraction via Regex** (data)
- **Type Normalization for Cross-Platform Consistency** (architecture)
- **Dependency Injection via Constructor Options** (architecture)
- **Sync Metadata Tracking** (data)

## External Dependencies

- @octokit/rest (GitHub API client)
- gray-matter (YAML frontmatter parsing)
- glob (file pattern matching)
- GitHub REST API (issues.listForRepo)
- JIRA REST API v3 (/rest/api/3/search/jql)
- Azure DevOps REST API (work items)

## Observations

- Supports 3 external platforms with unified abstraction layer
- Multi-repo (GitHub) and multi-project (JIRA/ADO) modes for enterprise setups
- Hierarchical import: Epic→Feature→UserStory→Task with configurable mapping
- 2-level directory structure support for JIRA spaces/projects and ADO area paths
- Parent recovery mechanism fetches missing Epics not in time range
- External items get 'E' suffix (US-001E, FS-001E) to distinguish from internal items
- Auto-archiving explicitly disabled for imports (user-initiated only)
- Rate limiting protects against API throttling with configurable thresholds
- Duplicate detection prevents re-importing existing items via external ID tracking
- Task checkboxes rendered in User Story markdown for visual progress tracking
- Orphan handling groups parent-less items in _orphans/ folder by default
- JIRA API recently changed from /search to /search/jql with token-based pagination
- Global collision detection option for umbrella/multi-repo setups