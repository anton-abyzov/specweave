# api-docs

**Path**: `src/cli/helpers/init/api-docs-config.ts`

## Purpose

API Documentation configuration module that handles OpenAPI specification generation and Postman collection creation for API projects. Automatically detects API frameworks and configures documentation generation workflows.

## Overview

The API docs module provides:
- **Framework Detection**: Auto-detects NestJS, Express, FastAPI, Django, Flask, Gin, Spring Boot, etc.
- **OpenAPI Generation**: Configures OpenAPI spec generation from code decorators/annotations
- **Postman Collections**: Derives Postman collections from OpenAPI specs
- **Environment Variables**: Generates Postman environments from `.env` files

## Configuration

Stored in `.specweave/config.json`:

```typescript
interface ApiDocsConfig {
  enabled: boolean;              // Enable API documentation features
  openApiPath: string;           // OpenAPI spec location (e.g., "openapi.yaml")
  autoGenerateOpenApi: boolean;  // Auto-generate from decorators
  generatePostman: boolean;      // Generate Postman collection
  postmanPath: string;           // Postman collection output path
  generateOn: 'on-increment-done' | 'on-api-change' | 'manual';
  watchPatterns: string[];       // API file patterns to watch
  baseUrl: string;               // API base URL
}
```

## Framework Detection

| Framework | Language | OpenAPI Support | Setup |
|-----------|----------|-----------------|-------|
| **NestJS** | TypeScript | Plugin | `@nestjs/swagger` |
| **Express** | JavaScript | Plugin | `swagger-jsdoc` |
| **Fastify** | JavaScript | Plugin | `@fastify/swagger` |
| **FastAPI** | Python | Built-in | `/openapi.json` endpoint |
| **Django REST** | Python | Plugin | `drf-spectacular` |
| **Flask** | Python | Plugin | `flask-openapi3` |
| **Gin** | Go | Plugin | `swag` |
| **Spring Boot** | Java | Plugin | `springdoc-openapi` |
| **Hono** | TypeScript | Plugin | `@hono/zod-openapi` |
| **Next.js** | TypeScript | Manual | `next-swagger-doc` |

## Generated Artifacts

| File | Purpose | Source |
|------|---------|--------|
| `openapi.yaml` | API specification (source of truth) | Framework decorators/annotations |
| `postman-collection.json` | API requests for testing | Derived from OpenAPI |
| `postman-environment.json` | Variables (baseUrl, tokens) | Derived from `.env` |

## Generation Triggers

| Setting | When Docs Generate |
|---------|-------------------|
| `on-increment-done` | When closing increment (recommended) |
| `on-api-change` | When API files change (hook-based) |
| `manual` | Only via `/sw:api-docs` command |

## Commands

```bash
# Generate all API docs
/sw:api-docs --all

# Generate only OpenAPI
/sw:api-docs --openapi

# Generate only Postman collection
/sw:api-docs --postman

# Generate only environment file
/sw:api-docs --env

# Validate existing OpenAPI spec
/sw:api-docs --validate
```

## Integration Points

- **Init Wizard**: Prompts for API docs configuration during `specweave init`
- **Increment Close**: Auto-generates docs on `/sw:done` if configured
- **Hooks**: Can trigger on API file changes via `on-api-change` setting

## Main Exports

- `ApiDocsConfig` (interface) - Configuration schema
- `DetectedApiFramework` (interface) - Framework detection result
- `detectApiFramework(targetDir)` - Auto-detect API framework
- `promptApiDocsConfig(targetDir, language)` - Interactive configuration
- `updateConfigWithApiDocs(targetDir, config, language)` - Save to config.json

## Localization

Supports all SpecWeave languages:
- English (en)
- Russian (ru)
- Spanish (es)
- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

## Usage Example

```typescript
import { detectApiFramework, promptApiDocsConfig } from './api-docs-config.js';

// Auto-detect framework
const framework = detectApiFramework('/path/to/project');
// => { name: 'NestJS', openApiSupport: 'plugin', setupInstructions: '...' }

// Interactive configuration
const result = await promptApiDocsConfig('/path/to/project', 'en');
if (result.config) {
  // Save to config.json
  updateConfigWithApiDocs('/path/to/project', result.config);
}
```

## Documentation Status

**Has README**: No
**Has Tests**: No

---
*Analysis generated on 2025-12-30*
