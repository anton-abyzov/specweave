---
description: Generate documentation from TypeScript/JavaScript code, OpenAPI specs, GraphQL schemas, and SpecWeave specifications.
---

# Generate Documentation from Code

Generate documentation automatically from TypeScript/JavaScript code, OpenAPI specs, GraphQL schemas, and SpecWeave specifications. Creates comprehensive API docs, type references, and usage examples.

## Usage

```
/sw-docs:generate <source-type> <path> [options]
```

## Source Types

### 1. TypeScript/JavaScript Code
```bash
/sw-docs:docs-generate code ./src \
  --output ./docs/api \
  --format markdown
```

### 2. OpenAPI/Swagger Specs
```bash
/sw-docs:docs-generate openapi ./api/openapi.yaml \
  --output ./docs/api \
  --interactive
```

### 3. GraphQL Schema
```bash
/sw-docs:docs-generate graphql ./schema.graphql \
  --output ./docs/graphql
```

### 4. SpecWeave Living Docs
```bash
/sw-docs:docs-generate specweave ./.specweave/docs \
  --output ./docs/specs \
  --include features,modules,architecture
```

## Options

### General Options
- `--output <path>` - Output directory (default: `./docs/generated`)
- `--format <format>` - Output format: markdown, html, json (default: markdown)
- `--template <template>` - Custom template directory
- `--watch` - Watch for changes and regenerate

### Code Documentation Options
- `--exclude <patterns>` - Exclude files/directories (glob patterns)
- `--include-private` - Include private members (default: false)
- `--include-internal` - Include @internal tagged members (default: false)
- `--examples` - Generate usage examples (default: true)
- `--types` - Generate type reference docs (default: true)

### OpenAPI Options
- `--interactive` - Generate interactive API playground (default: true)
- `--group-by <field>` - Group endpoints by: tag, path, method (default: tag)
- `--show-examples` - Include request/response examples (default: true)

### SpecWeave Options
- `--include <types>` - Comma-separated: features, modules, architecture, team
- `--depth <number>` - Directory depth to traverse (default: unlimited)
- `--format-adrs` - Special formatting for ADRs (default: true)

## Generated Documentation

### From TypeScript Code

Generates comprehensive API documentation using TypeDoc:

**Input**: TypeScript source files
```typescript
/**
 * User management service
 * @category Services
 * @example
 * ```ts
 * const service = new UserService();
 * const user = await service.getUser(123);
 * ```
 */
export class UserService {
  /**
   * Retrieve user by ID
   * @param userId - Unique user identifier
   * @returns User object or null if not found
   * @throws {UserNotFoundError} If user doesn't exist
   */
  async getUser(userId: number): Promise<User | null> {
    // implementation
  }
}
```

**Output**: Markdown documentation
```markdown
# UserService

User management service

## Methods

### getUser

Retrieve user by ID

**Parameters:**
- `userId`: number - Unique user identifier

**Returns:** `Promise<User | null>` - User object or null if not found

**Throws:**
- `UserNotFoundError` - If user doesn't exist

**Example:**
\```typescript
const service = new UserService();
const user = await service.getUser(123);
\```
```

### From OpenAPI Specification

Generates interactive API documentation:

**Input**: OpenAPI YAML/JSON
```yaml
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

**Output**: Interactive Markdown with API playground
```markdown
# GET /users/{id}

Get user by ID

## Parameters

| Name | In   | Type    | Required | Description |
|------|------|---------|----------|-------------|
| id   | path | integer | Yes      | User ID     |

## Responses

### 200 OK

Successful response

**Response Schema:**
\```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
\```

## Try it out

[Interactive API Playground]

\```bash
curl -X GET https://api.example.com/users/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\```
```

### From SpecWeave Living Docs

Generates consolidated documentation from `.specweave/docs/`:

**Input**: SpecWeave directory structure
```
.specweave/docs/
├── features/
│   ├── FS-001/
│   │   ├── feature.md
│   │   └── user-stories/
│   │       ├── US-001.md
│   │       └── US-002.md
│   └── FS-002/
├── modules/
│   ├── authentication/
│   │   └── module.md
│   └── payments/
└── architecture/
    ├── adr/
    │   ├── 0001-tech-stack.md
    │   └── 0002-database-choice.md
    └── diagrams/
```

**Output**: Organized Docusaurus docs
```
docs/
├── features/
│   ├── fs-001-user-authentication.md
│   ├── fs-002-payment-processing.md
│   └── index.md
├── modules/
│   ├── authentication.md
│   ├── payments.md
│   └── index.md
└── architecture/
    ├── decisions/
    │   ├── adr-0001.md
    │   ├── adr-0002.md
    │   └── index.md
    └── diagrams.md
```

## Configuration

### TypeDoc Configuration

Create `typedoc.json`:
```json
{
  "entryPoints": ["./src"],
  "out": "./docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludePrivate": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Services", "Models", "Utils", "*"],
  "sort": ["source-order"]
}
```

### Custom Templates

Create custom Handlebars templates:

```handlebars
{{!-- templates/class.hbs --}}
# {{name}}

{{#if comment}}
{{comment}}
{{/if}}

## Constructor

\```typescript
new {{name}}({{#each constructorParams}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}})
\```

## Methods

{{#each methods}}
### {{name}}

{{comment}}

**Signature:**
\```typescript
{{signature}}
\```
{{/each}}
```

## Continuous Documentation

### Watch Mode

Auto-regenerate on file changes:
```bash
/sw-docs:docs-generate code ./src --watch
```

### CI/CD Integration

```yaml
# .github/workflows/docs.yml
name: Generate Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'api/**'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate API docs
        run: |
          npm install
          npx claude /sw-docs:docs-generate code ./src
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## Use Cases

### 1. API Reference Documentation
Generate comprehensive API docs from TypeScript interfaces and JSDoc comments.

### 2. OpenAPI Documentation
Create interactive API explorers from OpenAPI/Swagger specifications.

### 3. Architecture Documentation
Consolidate ADRs, diagrams, and technical specifications into searchable docs.

### 4. Living Documentation
Auto-sync SpecWeave features, user stories, and modules to documentation site.

### 5. Type Documentation
Generate TypeScript type reference guides for library consumers.

## Advanced Features

### Custom Transformers

```typescript
// transformers/custom-transformer.ts
import { DocNode } from 'typedoc';

export function transformNode(node: DocNode): DocNode {
  // Custom transformation logic
  if (node.kind === 'method' && node.name.startsWith('_')) {
    return null; // Skip private methods
  }
  return node;
}
```

### Multi-Source Aggregation

```bash
# Generate from multiple sources
/sw-docs:docs-generate code ./src --output ./docs/api
/sw-docs:docs-generate openapi ./api/openapi.yaml --output ./docs/api
/sw-docs:docs-generate specweave ./.specweave/docs --output ./docs/specs

# Combine all outputs
cat ./docs/api/index.md ./docs/specs/index.md > ./docs/complete-reference.md
```

### Internationalization

```bash
# Generate docs in multiple languages
/sw-docs:docs-generate code ./src --output ./docs/en --lang en
/sw-docs:docs-generate code ./src --output ./docs/es --lang es
/sw-docs:docs-generate code ./src --output ./docs/fr --lang fr
```

## Examples

### Generate TypeScript API Docs
```bash
/sw-docs:docs-generate code ./src/api \
  --output ./docs/api-reference \
  --exclude "**/*.test.ts" \
  --include-examples
```

### Generate OpenAPI Docs with Playground
```bash
/sw-docs:docs-generate openapi ./api/v1/openapi.yaml \
  --output ./docs/api/v1 \
  --interactive \
  --group-by tag
```

### Generate SpecWeave Architecture Docs
```bash
/sw-docs:docs-generate specweave ./.specweave/docs \
  --output ./docs/architecture \
  --include architecture,modules \
  --format-adrs
```

### Watch Mode for Development
```bash
/sw-docs:docs-generate code ./src --watch
```

## Related Commands

- `/sw-docs:init` - Initialize Docusaurus documentation site
- `/sw-docs:view` - View generated documentation
- `/sw-docs:build` - Build static site from generated docs

## Requirements

- **TypeDoc**: For TypeScript/JavaScript documentation
- **Redocly**: For OpenAPI documentation
- **GraphQL Code Generator**: For GraphQL schema docs
- **Node.js 18+**: Runtime requirement

## Performance Tips

1. **Incremental Generation**: Use `--watch` for development
2. **Exclude Tests**: Skip test files with `--exclude "**/*.test.ts"`
3. **Parallel Processing**: Generate different sources concurrently
4. **Cache Results**: Reuse generated docs when source hasn't changed

## Troubleshooting

### Missing Dependencies
```bash
npm install --save-dev typedoc typedoc-plugin-markdown @redocly/cli
```

### Large Codebases
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" \
  /sw-docs:docs-generate code ./src
```

### Broken Links in Generated Docs
```bash
# Validate generated docs
npx markdown-link-check ./docs/**/*.md
```
