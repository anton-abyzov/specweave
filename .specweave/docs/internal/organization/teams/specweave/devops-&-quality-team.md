# DevOps & Quality Team

Focuses on development operations, metrics collection, testing infrastructure, and continuous validation. Ensures code quality through automated testing and provides visibility into development performance.

## Responsibilities

- Calculate and report DORA metrics from GitHub data
- Design and maintain test generation frameworks
- Implement validation utilities for spec coverage
- Track progress and provide ETA calculations for batch operations
- Ensure acceptance criteria coverage validation

## Domain Expertise

- DORA metrics calculation
- Test automation strategies
- Coverage analysis
- Performance benchmarking
- Vitest and Playwright testing

## Technology Stack

- TypeScript
- Vitest
- Playwright
- Octokit
- YAML test DSL

## Repositories

- [metrics](../../../modules/metrics.md)
- [testing](../../../modules/testing.md)
- [validators](../../../modules/validators.md)
- [progress](../../../modules/progress.md)

## Integration Boundaries

Upstream: Depends on generators for spec parsing, integrations for GitHub API access. Downstream: Reports consumed by CLI and living-docs.

---
*Clustering reasoning: These repos share focus on quality assurance and operational visibility. metrics provides DORA calculations, testing generates test scaffolds, validators ensure spec coverage, and progress tracks operation completion. All contribute to development quality and visibility.*
*Generated on 2025-12-10*