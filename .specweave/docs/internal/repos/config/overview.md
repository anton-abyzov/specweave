# config

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

SpecWeave Configuration Management module that handles persistent storage, validation, and retrieval of project configuration including research insights, living documentation settings, and external tool import configurations for the SpecWeave spec-driven development framework.

## Key Concepts

- Configuration persistence to .specweave/config.json
- Zod schema validation for type-safe configuration
- Environment variable override pattern
- Research insights storage (vision, compliance, teams, architecture)
- Living documentation sync configuration
- External import configuration for GitHub/JIRA/ADO
- Atomic read-modify-write operations

## Patterns

- **Zod Schema Validation** (data)
- **Repository Pattern for Configuration** (architecture)
- **Environment Variable Override Pattern** (architecture)
- **Atomic Read-Modify-Write** (data)
- **Default Configuration Pattern** (architecture)
- **TypeScript Native fs/promises** (data)

## External Dependencies

- zod (runtime schema validation)
- Node.js fs/promises (file system)
- Node.js path (path manipulation)
- GitHub API (via import config)
- JIRA API (via import config)
- Azure DevOps API (via import config)

## Observations

- Configuration follows single-file JSON pattern at .specweave/config.json
- Supports multi-platform external tool integration (GitHub, JIRA, ADO)
- Research config stores strategic init insights (vision, compliance, teams, architecture, methodology)
- Living docs config controls sync behavior with three-layer sync option
- Import config has sensible defaults (1 month range, 100 page size)
- Environment variables provide override mechanism for CI/CD scenarios
- No encryption or secrets handling in this module - secrets stored separately in .env
- Graceful error handling with meaningful error messages for missing config