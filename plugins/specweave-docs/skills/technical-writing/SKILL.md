---
name: technical-writing
description: Technical writing expert for API documentation, README files, tutorials, changelog management, and developer documentation. Covers style guides, information architecture, versioning docs, OpenAPI/Swagger, and documentation-as-code. Activates for technical writing, API docs, README, changelog, tutorial writing, documentation, technical communication, style guide, OpenAPI, Swagger, developer docs.
---

# Technical Writing Skill

**Self-contained technical documentation expertise for ANY user project.**

Expert in developer-focused documentation: READMEs, API references, tutorials, and changelogs.

---

## Core Documentation Types

### 1. README Files

**Essential Structure**:
```markdown
# Project Name

One-sentence description.

## Features
- Key feature 1
- Key feature 2

## Installation
```bash
npm install project-name
```

## Quick Start
```javascript
import { ProjectName } from 'project-name';
const instance = new ProjectName();
```

## Usage
[Basic example]

## API Reference
[Link or inline reference]

## Contributing
[Link to CONTRIBUTING.md]

## License
MIT
```

**Best Practices**:
- Lead with value (what problem solved?)
- Code examples > long explanations
- Progressive disclosure (quick start → advanced)
- Keep updated with code

### 2. API Documentation

**Function/Method Documentation**:
```typescript
/**
 * Compress image with quality settings
 *
 * @param {string} input - Path to input image
 * @param {CompressOptions} options - Compression options
 * @param {number} options.quality - Quality 0-100 (default: 80)
 * @param {string} options.format - Output format: jpeg|png|webp
 *
 * @returns {Promise<CompressResult>} Compression result with saved bytes
 *
 * @example
 * const result = await compress('photo.jpg', { quality: 90 });
 * console.log(`Saved ${result.savedBytes} bytes`);
 */
```

**REST API Documentation**:
```markdown
### POST /api/users

Create a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "created": "2025-11-24T12:00:00Z"
}
```

**Errors**:
- 400: Invalid email format
- 409: Email already exists
```

### 3. Tutorials

**Structure**:
```markdown
# Tutorial: Build X in 10 Minutes

**You'll learn**:
- How to set up X
- Core concepts
- Build a working example

**Prerequisites**:
- Node.js 18+
- Basic JavaScript knowledge

## Step 1: Setup

```bash
npm create vite@latest my-project
cd my-project
npm install
```

## Step 2: Create Component

[Code with explanation]

## Step 3: Test It

[How to run and verify]

## Next Steps

- Advanced feature 1
- Advanced feature 2
- Link to API docs
```

**Best Practices**:
- State prerequisites up front
- Break into small, testable steps
- Show expected output at each step
- Link to related docs

### 4. Changelogs

**Keep a Changelog Format** (keepachangelog.com):
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature X for Y use case

### Changed
- Improved performance of Z by 40%

### Fixed
- Critical bug in authentication (CVE-2024-1234)

## [1.2.0] - 2025-11-24

### Added
- Real-time notifications via WebSocket
- Export to PDF functionality

### Changed
- Updated dependencies (React 19)

### Deprecated
- `oldMethod()` - use `newMethod()` instead

### Removed
- Legacy API v1 endpoints

### Fixed
- Memory leak in image processing
- CORS issue with production domain

### Security
- Fixed SQL injection vulnerability (CVE-2025-5678)

## [1.1.0] - 2025-11-01

[Previous release notes]
```

**Categories**:
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Now removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

---

## Style Guide Essentials

### Voice & Tone

**Active Voice** (preferred):
- ✅ "The function returns an array"
- ❌ "An array is returned by the function"

**Present Tense** (preferred):
- ✅ "The API validates input"
- ❌ "The API will validate input"

**Second Person** (for tutorials):
- ✅ "You can configure the timeout"
- ❌ "Users can configure the timeout"

### Clarity Rules

**Be Specific**:
- ✅ "Set timeout to 5000ms"
- ❌ "Set a reasonable timeout"

**Avoid Jargon** (or explain it):
- ✅ "Idempotent (can be called multiple times safely)"
- ❌ "The endpoint is idempotent"

**Short Sentences**:
- ✅ "Install the package. Then import it."
- ❌ "After installing the package, you need to import it into your project."

### Code Examples

**Show Complete Examples**:
```javascript
// ✅ GOOD - Complete, runnable
import { connect } from 'database';

const db = await connect({
  host: 'localhost',
  port: 5432
});

const users = await db.query('SELECT * FROM users');
console.log(users);
```

```javascript
// ❌ BAD - Incomplete
db.query('SELECT * FROM users');
```

**Include Error Handling**:
```javascript
// ✅ GOOD
try {
  const result = await processImage('photo.jpg');
  console.log('Success:', result);
} catch (error) {
  console.error('Failed to process image:', error.message);
}
```

---

## Documentation Structure

### Information Architecture

**Organize by User Journey**:
```
docs/
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── first-project.md
├── guides/
│   ├── authentication.md
│   ├── deployment.md
│   └── troubleshooting.md
├── api-reference/
│   ├── client.md
│   ├── server.md
│   └── types.md
└── examples/
    ├── basic-crud.md
    ├── real-time-updates.md
    └── advanced-queries.md
```

**Progressive Disclosure**:
1. **Getting Started**: Quickest path to value
2. **Guides**: Task-oriented how-tos
3. **API Reference**: Complete technical reference
4. **Examples**: Real-world patterns

### Navigation Best Practices

**Clear Hierarchy**:
- Use consistent heading levels (H1 → H2 → H3)
- Don't skip heading levels
- One H1 per page

**Cross-Linking**:
- Link to related docs
- Link to prerequisites
- Link to next steps

**Table of Contents** (for long pages):
```markdown
## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Basic Example](#basic-example)
  - [Advanced Example](#advanced-example)
- [API Reference](#api-reference)
```

---

## OpenAPI / Swagger

### OpenAPI 3.0 Template

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
  description: User management API

servers:
  - url: https://api.example.com/v1

paths:
  /users:
    get:
      summary: List all users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string

    CreateUser:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
```

---

## Documentation Maintenance

### Versioning Strategy

**Version docs alongside code**:
```
docs/
├── v1.0/
│   ├── api.md
│   └── guides.md
├── v2.0/
│   ├── api.md
│   ├── guides.md
│   └── migration.md
└── latest/ → symlink to v2.0/
```

**Migration Guides**:
```markdown
# Migrating from v1 to v2

## Breaking Changes

### Authentication

**v1**:
```javascript
const api = new API({ token: 'abc123' });
```

**v2**:
```javascript
const api = new API({
  auth: { bearer: 'abc123' }
});
```

### What Changed
- `token` parameter renamed to `auth.bearer`
- Supports multiple auth methods now

### Migration Steps

1. Update API initialization
2. Test authentication flow
3. Update error handling (new error codes)
```

### Keep Docs Fresh

**Automation**:
- Generate API docs from code (JSDoc, TypeDoc, OpenAPI)
- Auto-update version numbers in docs
- CI/CD checks for broken links

**Review Checklist**:
- [ ] Code examples run without errors
- [ ] All links work (no 404s)
- [ ] Version numbers match package.json
- [ ] Screenshots show current UI
- [ ] Deprecation warnings added for old features

---

## Common Pitfalls

**❌ Avoid**:
- Outdated examples (don't run)
- Missing prerequisites
- Incomplete code snippets
- Vague error messages ("something went wrong")
- Over-explaining obvious things
- Using future tense ("will do X")

**✅ Do**:
- Test all code examples
- State prerequisites up front
- Show complete, runnable code
- Specific error messages with fixes
- Respect reader's intelligence
- Use present tense

---

## Quick Reference Templates

### Function Documentation
```javascript
/**
 * Brief description
 *
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @throws {ErrorType} When/why
 * @example
 * functionName(arg);
 */
```

### CLI Command Documentation
```markdown
### command [options]

Description of what command does.

**Options**:
- `-f, --flag`: Description (default: value)
- `-o, --option <value>`: Description

**Examples**:
```bash
command --flag --option=value
```
```

### Error Documentation
```markdown
### Error: ECONNREFUSED

**Cause**: Cannot connect to database

**Solutions**:
1. Check database is running: `docker ps`
2. Verify connection string in `.env`
3. Check firewall allows port 5432
```

---

**This skill is self-contained and works in ANY user project.**
