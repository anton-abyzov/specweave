---
name: api-docs
description: Generate and synchronize API documentation - OpenAPI spec, Postman collection with environments, and API client SDKs. Framework-aware with auto-detection. For API projects only.
---

# API Documentation Generator

**Usage**: `/sw:api-docs [options]`

**For REST API projects only.** Skip if your project has no REST endpoints.

---

## Limitations

This command is designed for **REST APIs with OpenAPI specification**. The following API types are NOT supported:

| API Type | Why Not Supported | Alternative |
|----------|-------------------|-------------|
| **GraphQL** | Uses SDL schema, not OpenAPI | Export schema via `apollo schema:download` or GraphQL introspection |
| **gRPC** | Uses Protocol Buffers (.proto), not OpenAPI | Use `protoc` with documentation plugins |
| **WebSocket** | No standard specification format | Document in README or use AsyncAPI |
| **tRPC** | TypeScript-first, schema inferred | Types are the documentation |

For these API types, use their native specification formats instead of OpenAPI.

---

## Purpose

Generate and maintain API documentation artifacts:
- **OpenAPI specification** (source of truth)
- **Postman collection** (derived from OpenAPI)
- **Postman environment file** (derived from .env)
- **API client SDKs** (optional, TypeScript/Python)

---

## Command Options

| Option | Description |
|--------|-------------|
| (none) | Interactive mode - auto-detects framework and prompts |
| `--openapi` | Generate/update OpenAPI spec only |
| `--postman` | Generate Postman collection from OpenAPI |
| `--env` | Generate Postman environment from .env |
| `--all` | Generate all artifacts (OpenAPI + Postman + env) |
| `--watch` | Watch for API changes and regenerate |
| `--validate` | Validate existing OpenAPI spec |
| `--framework <name>` | Override framework detection (nest, express, fastapi, etc.) |
| `--base-url <url>` | Override base URL for generated collection |
| `--output <dir>` | Output directory (default: project root) |

---

## Quick Start

### Generate Everything (Recommended)

```bash
/sw:api-docs --all

# Output:
# ✅ Generated: openapi.yaml (127 endpoints)
# ✅ Generated: postman-collection.json (imported openapi.yaml)
# ✅ Generated: postman-environment.json (12 variables from .env)
```

### Interactive Mode

```bash
/sw:api-docs

# Prompts:
# 1. Detected framework: NestJS (src/main.ts)
# 2. Generate OpenAPI from decorators? [Y/n]
# 3. Generate Postman collection? [Y/n]
# 4. Generate environment file? [Y/n]
# 5. Watch for changes? [y/N]
```

---

## Framework Detection & Generation

### Supported Frameworks

| Framework | Detection | OpenAPI Generation Method |
|-----------|-----------|---------------------------|
| **NestJS** | `@nestjs/swagger` in package.json | Extract from decorators via `SwaggerModule.createDocument()` |
| **Express + swagger-jsdoc** | `swagger-jsdoc` in package.json | Generate from JSDoc comments |
| **Fastify** | `@fastify/swagger` in package.json | Extract from route schemas |
| **Hono** | `@hono/swagger-ui` in package.json | Generate from Zod schemas |
| **Next.js API Routes** | `pages/api/` or `app/api/` folders | Parse route handlers, infer from types |
| **FastAPI** | `fastapi` in requirements.txt | Export from `/openapi.json` endpoint |
| **Django REST** | `djangorestframework` in requirements.txt | Use `generateschema` management command |
| **Flask** | `flask-restx` or `apispec` in requirements.txt | Extract from decorators or specs |
| **Spring Boot** | `springdoc-openapi` in pom.xml/build.gradle | Export from `/v3/api-docs` endpoint |
| **Go/Gin** | `swaggo/swag` in go.mod | Run `swag init` |
| **Go/Echo** | `swaggo/echo-swagger` in go.mod | Run `swag init` |

---

## Implementation Steps

### Step 1: Detect Framework and Config

```typescript
import { detectApiFramework, loadApiDocsConfig } from '../../../src/cli/helpers/init/api-docs-config.js';

// Check if API docs enabled in config
const config = loadConfig(projectPath);
if (!config.apiDocs?.enabled) {
  console.log(`
ℹ️  API documentation not enabled for this project.

To enable:
  1. Run: specweave init (and answer yes to API docs)
  2. Or add to .specweave/config.json:
     "apiDocs": { "enabled": true }

This feature is for API projects only.
  `);
  return;
}

// Detect framework
const framework = await detectApiFramework(projectPath);
console.log(`🔍 Detected framework: ${framework.name} (${framework.confidence}% confidence)`);
```

### Step 2: Generate OpenAPI Specification

Based on detected framework:

#### NestJS (Decorators)

```typescript
// Option 1: Run application and extract OpenAPI
const openApiSpec = await generateNestJsOpenApi(projectPath);

// Option 2: Start dev server temporarily
// npm run start:dev & sleep 5 && curl localhost:3000/api-json > openapi.json

// Typical NestJS OpenAPI generation:
async function generateNestJsOpenApi(projectPath: string): Promise<OpenAPIObject> {
  // Check if swagger module installed
  const hasSwagger = await checkDependency(projectPath, '@nestjs/swagger');
  if (!hasSwagger) {
    throw new Error('Install @nestjs/swagger: npm install @nestjs/swagger swagger-ui-express');
  }

  // Look for existing swagger setup
  const mainTs = await findFile(projectPath, 'src/main.ts');
  const hasSwaggerSetup = /SwaggerModule\.setup/.test(mainTs);

  if (hasSwaggerSetup) {
    // Start server and fetch OpenAPI
    const result = await runCommand('npm run start:dev &');
    await sleep(5000);
    const openapi = await fetch('http://localhost:3000/api-json');
    await runCommand('pkill -f "nest start"');
    return openapi.json();
  } else {
    // Suggest adding swagger setup
    console.log(`
⚠️  Swagger not configured in main.ts

Add this to src/main.ts:

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Your API')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
    `);
  }
}
```

#### Express + swagger-jsdoc

```typescript
async function generateExpressOpenApi(projectPath: string): Promise<OpenAPIObject> {
  // Look for swagger-jsdoc config
  const swaggerConfig = await findSwaggerJsdocConfig(projectPath);

  if (swaggerConfig) {
    // Run swagger-jsdoc CLI
    const result = await runCommand(`npx swagger-jsdoc -d ${swaggerConfig} -o openapi.json`);
    return JSON.parse(await readFile('openapi.json'));
  } else {
    // Suggest adding JSDoc comments
    console.log(`
⚠️  No swagger-jsdoc configuration found

Create swagger-config.js:

module.exports = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Your API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }]
  },
  apis: ['./src/routes/*.js']
};

Then add JSDoc comments to routes:

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of users
 */
    `);
  }
}
```

#### FastAPI (Python)

```typescript
async function generateFastApiOpenApi(projectPath: string): Promise<OpenAPIObject> {
  // FastAPI auto-generates OpenAPI at /openapi.json
  // Start server and fetch
  await runCommand('uvicorn main:app &');
  await sleep(3000);
  const openapi = await fetch('http://localhost:8000/openapi.json');
  await runCommand('pkill -f uvicorn');
  return openapi.json();
}
```

### Step 3: Generate Postman Collection from OpenAPI

```typescript
import { convert as openApiToPostman } from 'openapi-to-postmanv2';

async function generatePostmanCollection(
  openApiPath: string,
  outputPath: string,
  baseUrl: string
): Promise<void> {
  const openApiContent = await readFile(openApiPath, 'utf-8');

  const options = {
    type: 'string',
    data: openApiContent
  };

  return new Promise((resolve, reject) => {
    openApiToPostman.convert(options, {}, (err, conversionResult) => {
      if (!conversionResult.result) {
        reject(new Error(`Conversion failed: ${conversionResult.reason}`));
        return;
      }

      const collection = conversionResult.output[0].data;

      // Enhance collection with baseUrl variable
      collection.variable = collection.variable || [];
      collection.variable.push({
        key: 'baseUrl',
        value: baseUrl,
        type: 'string'
      });

      // Replace hardcoded URLs with {{baseUrl}}
      const collectionStr = JSON.stringify(collection, null, 2)
        .replace(new RegExp(escapeRegex(baseUrl), 'g'), '{{baseUrl}}');

      await writeFile(outputPath, collectionStr);
      resolve();
    });
  });
}
```

### Step 4: Generate Postman Environment from .env

```typescript
async function generatePostmanEnvironment(
  projectPath: string,
  outputPath: string
): Promise<void> {
  const envPath = path.join(projectPath, '.env');
  const envContent = await readFile(envPath, 'utf-8');

  // Parse .env file
  const envVars = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      return { key: key.trim(), value };
    });

  // Create Postman environment
  const environment = {
    id: uuidv4(),
    name: `${path.basename(projectPath)} - Local`,
    values: [
      // Always include baseUrl
      {
        key: 'baseUrl',
        value: process.env.API_BASE_URL || 'http://localhost:3000',
        enabled: true,
        type: 'default'
      },
      // API-relevant env vars only (filter sensitive ones)
      ...envVars
        .filter(({ key }) => isApiRelevant(key))
        .map(({ key, value }) => ({
          key: toPostmanVarName(key),
          value: isSensitive(key) ? '' : value, // Don't include secrets
          enabled: true,
          type: isSensitive(key) ? 'secret' : 'default'
        }))
    ],
    _postman_variable_scope: 'environment'
  };

  await writeFile(outputPath, JSON.stringify(environment, null, 2));
}

function isApiRelevant(key: string): boolean {
  const relevantPatterns = [
    /^API_/i,
    /^BASE_URL/i,
    /^PORT$/i,
    /^HOST$/i,
    /TOKEN/i,
    /KEY$/i,
    /SECRET$/i,
    /^AUTH/i,
    /^JWT/i
  ];
  return relevantPatterns.some(pattern => pattern.test(key));
}

function isSensitive(key: string): boolean {
  const sensitivePatterns = [
    /SECRET/i,
    /PASSWORD/i,
    /KEY$/i,
    /TOKEN/i,
    /CREDENTIALS/i
  ];
  return sensitivePatterns.some(pattern => pattern.test(key));
}

function toPostmanVarName(envKey: string): string {
  // Convert ENV_VAR_NAME to envVarName for Postman
  return envKey
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
```

### Step 5: Display Results

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API DOCUMENTATION GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework: NestJS (detected from @nestjs/swagger)
Base URL: http://localhost:3000

📄 OpenAPI Specification
   File: openapi.yaml
   Endpoints: 47
   Schemas: 23
   Tags: 8 (users, auth, products, orders, payments, admin, webhooks, health)

📦 Postman Collection
   File: postman-collection.json
   Requests: 47
   Folders: 8
   Variables: 3 (baseUrl, apiVersion, authToken)

   Import: Postman → Import → Upload postman-collection.json

🔐 Postman Environment
   File: postman-environment.json
   Variables: 12
   Secrets: 3 (marked as secret type, values empty)

   Import: Postman → Environments → Import → Upload postman-environment.json

   ⚠️  Fill in secret values after import:
      • apiKey (from API_KEY in .env)
      • authToken (from AUTH_TOKEN in .env)
      • jwtSecret (from JWT_SECRET in .env)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Import to Postman:
   - Open Postman
   - Click "Import" → Select postman-collection.json
   - Click "Environments" → "Import" → Select postman-environment.json
   - Select the environment from dropdown

2. Configure secrets:
   - Click the environment → Edit
   - Fill in secret values (apiKey, authToken, etc.)

3. Test an endpoint:
   - Expand a folder
   - Click a request
   - Click "Send"

4. Keep in sync:
   - Run /sw:api-docs --all after API changes
   - Or enable watch mode: /sw:api-docs --watch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Watch Mode

Enable continuous synchronization during development:

```bash
/sw:api-docs --watch

# Output:
# 👀 Watching for API changes...
#
# Patterns:
#   • src/routes/**/*.ts
#   • src/controllers/**/*.ts
#   • src/api/**/*.ts
#   • **/*.dto.ts
#   • **/*.schema.ts
#
# Press Ctrl+C to stop
```

When changes detected:

```
[14:32:15] Change detected: src/controllers/users.controller.ts
[14:32:16] Regenerating OpenAPI spec...
[14:32:17] ✅ openapi.yaml updated (48 endpoints, +1)
[14:32:17] Regenerating Postman collection...
[14:32:18] ✅ postman-collection.json updated
```

---

## Integration with /sw:done

When closing an increment, if `apiDocs.generateOn: 'on-increment-done'`:

```typescript
// In close-increment.ts
if (config.apiDocs?.enabled && config.apiDocs.generateOn === 'on-increment-done') {
  const hasApiChanges = await detectApiChanges(incrementPath);

  if (hasApiChanges) {
    console.log('🔄 API changes detected, regenerating documentation...');
    await runCommand('/sw:api-docs --all');
  }
}
```

---

## Validation

Validate existing OpenAPI spec:

```bash
/sw:api-docs --validate

# Output:
# 🔍 Validating openapi.yaml...
#
# ✅ Valid OpenAPI 3.0.3 specification
#
# Statistics:
#   • Paths: 47
#   • Operations: 127
#   • Schemas: 23
#   • Security schemes: 2
#
# Warnings:
#   ⚠️  Missing description: GET /users/{id}
#   ⚠️  Missing example: POST /orders request body
#   ⚠️  Deprecated endpoint still documented: DELETE /v1/legacy-users
#
# Score: 94/100 (EXCELLENT)
```

---

## Configuration

Add to `.specweave/config.json`:

```json
{
  "apiDocs": {
    "enabled": true,
    "openApiPath": "openapi.yaml",
    "autoGenerateOpenApi": true,
    "generatePostman": true,
    "postmanPath": "postman-collection.json",
    "postmanEnvPath": "postman-environment.json",
    "generateOn": "on-increment-done",
    "watchPatterns": [
      "**/routes/**",
      "**/controllers/**",
      "**/api/**",
      "**/endpoints/**",
      "**/*.dto.ts",
      "**/*.schema.ts"
    ],
    "baseUrl": "http://localhost:3000",
    "framework": "auto"
  }
}
```

---

## Examples

### Example 1: First-Time Setup

```bash
# During init
specweave init
# → API framework detected: NestJS
# → Enable API documentation? [Y/n]: Y
# → Generate Postman collection? [Y/n]: Y
# → Generate Postman environment? [Y/n]: Y

# Generate docs
/sw:api-docs --all
```

### Example 2: After Adding New Endpoints

```bash
# Made changes to API
vim src/controllers/products.controller.ts

# Regenerate
/sw:api-docs --all
# → ✅ Added 3 new endpoints to openapi.yaml
# → ✅ Updated postman-collection.json
```

### Example 3: CI/CD Integration

```yaml
# .github/workflows/api-docs.yml
name: Update API Docs

on:
  push:
    paths:
      - 'src/controllers/**'
      - 'src/routes/**'
      - 'src/**/*.dto.ts'

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npx specweave api-docs --all
      - run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add openapi.yaml postman-*.json
          git diff --staged --quiet || git commit -m "docs: update API documentation"
          git push
```

### Example 4: Multi-Environment Setup

```bash
# Generate environment files for different stages
/sw:api-docs --env --output postman-env-local.json --base-url http://localhost:3000
/sw:api-docs --env --output postman-env-staging.json --base-url https://staging-api.example.com
/sw:api-docs --env --output postman-env-prod.json --base-url https://api.example.com
```

---

## Error Handling

### Framework Not Detected

```
❌ Could not detect API framework

Supported frameworks:
  • NestJS (@nestjs/swagger)
  • Express (swagger-jsdoc)
  • FastAPI (fastapi)
  • Django REST (djangorestframework)
  • Spring Boot (springdoc-openapi)
  • Go/Gin (swaggo/swag)

To specify manually:
  /sw:api-docs --framework nest
```

### OpenAPI Generation Failed

```
❌ Failed to generate OpenAPI specification

Error: Server not responding at http://localhost:3000/api-json

Troubleshooting:
  1. Is your dev server running? (npm run start:dev)
  2. Is Swagger configured in main.ts?
  3. Check the server logs for errors

For NestJS, ensure you have:
  SwaggerModule.setup('api', app, document);
```

### .env File Not Found

```
⚠️  No .env file found

Postman environment will include only:
  • baseUrl: http://localhost:3000

To generate full environment:
  1. Create .env file with your API configuration
  2. Run: /sw:api-docs --env
```

---

## Related Commands

- `/sw:increment` - API changes trigger docs update on close
- `/sw:done` - Auto-generates API docs if enabled
- `/sw:validate` - Validates API documentation as part of increment validation
- `/sw:living-docs` - API docs become part of living documentation

---

## Related Skills

- `auto-execute` - Ensures credentials are used for API testing
- `increment-planner` - Plans API endpoints as part of increment

---

**Important**: This feature is for API projects only. Projects without REST/GraphQL endpoints should not enable this feature.
