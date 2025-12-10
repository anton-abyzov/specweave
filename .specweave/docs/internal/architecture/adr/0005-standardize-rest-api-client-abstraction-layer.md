# 0005-standardize-rest-api-client-abstraction-layer: Standardize REST API Client Abstraction Layer

**Status**: Detected
**Confidence**: medium

## Context

Found REST API Integration (GitHub, JIRA, ADO) pattern in 2 repositories.

## Decision

The team has adopted REST API Integration (GitHub, JIRA, ADO) as a standard approach.

## Consequences

- Consistent REST API Integration (GitHub, JIRA, ADO) implementation across services
- Team familiarity with the pattern
- Standardization benefits for 2 repositories

## Evidence

- **sync, importers**: JIRA REST API v3 calls with Basic auth; GitHub API via GitHubClientV2; Azure DevOps API via AdoClient; fetch() calls to external REST endpoints; Octokit REST client for GitHub API