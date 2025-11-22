---
name: technical-writing
description: Technical writing expert for API documentation, README files, tutorials, changelog management, and developer documentation. Covers style guides, information architecture, versioning docs, OpenAPI/Swagger, and documentation-as-code. Activates for technical writing, API docs, README, changelog, tutorial writing, documentation, technical communication, style guide, OpenAPI, Swagger, developer docs.
---

# Technical Writing Skill

Expert in technical documentation, API reference writing, tutorials, and developer-focused content. Specializes in clear, concise, and comprehensive documentation that developers actually use.

## Core Documentation Types

### 1. README Files

**Essential Sections**:

```markdown
# Project Name

One-sentence description of what this project does.

## Features

- Key feature 1
- Key feature 2
- Key feature 3

## Installation

```bash
npm install project-name
```

## Quick Start

```javascript
import { ProjectName } from 'project-name';

const instance = new ProjectName();
instance.doSomething();
```

## Usage

### Basic Example

[Runnable code example]

### Advanced Example

[More complex use case]

## API Reference

Link to detailed API docs or inline reference.

## Configuration

Available options and their defaults.

## Contributing

Link to CONTRIBUTING.md

## License

MIT (or your license)
```

**Best Practices**:
- **Lead with value**: What problem does this solve?
- **Show, don't tell**: Code examples > long explanations
- **Progressive disclosure**: Quick start → Advanced features
- **Keep it updated**: Sync with actual code behavior

**Examples**:

**Bad README**:
```markdown
# My Project

This is a library.

## Installation
npm install

## Usage
Use it in your code.
```

**Good README**:
```markdown
# Image Optimizer

Compress images up to 80% without visible quality loss. Supports JPEG, PNG, WebP.

## Installation

```bash
npm install image-optimizer
```

## Quick Start

```javascript
import { optimize } from 'image-optimizer';

// Compress a single image
const result = await optimize('input.jpg', {
  quality: 80,
  format: 'webp'
});
console.log(`Saved ${result.savedBytes} bytes`);
```

## Features

- ✅ Lossless and lossy compression
- ✅ Batch processing (parallel)
- ✅ Format conversion (JPEG → WebP, PNG → AVIF)
- ✅ Preserves EXIF metadata
- ✅ CLI and Node.js API

## CLI Usage

```bash
image-optimizer input.jpg --quality 80 --format webp
```

## API

### `optimize(input, options)`

Compress a single image.

**Parameters**:
- `input` (string): Path to input image
- `options` (object):
  - `quality` (number, 0-100): Compression quality (default: 80)
  - `format` (string): Output format - `jpeg`, `png`, `webp` (default: auto-detect)

**Returns**: `Promise<OptimizeResult>`

**Example**:
```javascript
const result = await optimize('photo.jpg', { quality: 90 });
```
```

### 2. API Documentation

#### RESTful API Documentation

```markdown
# API Reference

Base URL: `https://api.example.com/v1`

## Authentication

All requests require an API key in the header:

```bash
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Get User

Retrieve user details by ID.

**Endpoint**: `GET /users/:id`

**Parameters**:
- `id` (path parameter, required): User ID (UUID v4)

**Headers**:
- `Authorization: Bearer <token>` (required)

**Example Request**:
```bash
curl -H "Authorization: Bearer abc123" \
  https://api.example.com/v1/users/550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200 OK)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "status": "active"
}
```

**Error Responses**:

**404 Not Found** - User does not exist
```json
{
  "error": "USER_NOT_FOUND",
  "message": "No user found with ID 550e8400-e29b-41d4-a716-446655440000"
}
```

**401 Unauthorized** - Invalid or missing API key
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid API key"
}
```

**Rate Limiting**:
- 100 requests per minute per API key
- Header `X-RateLimit-Remaining` shows remaining requests
- Returns `429 Too Many Requests` when exceeded

---

### Create User

Create a new user account.

**Endpoint**: `POST /users`

**Headers**:
- `Content-Type: application/json` (required)
- `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "email": "user@example.com",      // required, valid email
  "name": "John Doe",                // required, 1-100 chars
  "password": "SecurePass123!",      // required, min 8 chars
  "role": "user"                     // optional, default: "user"
}
```

**Validation Rules**:
- Email must be unique
- Password must contain: 8+ chars, 1 uppercase, 1 number, 1 special char
- Role must be one of: `user`, `admin`, `moderator`

**Example Request**:
```bash
curl -X POST https://api.example.com/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer abc123" \
  -d '{"email":"user@example.com","name":"John Doe","password":"SecurePass123!"}'
```

**Success Response (201 Created)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:

**400 Bad Request** - Validation error
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Email already exists",
  "field": "email"
}
```

**422 Unprocessable Entity** - Password complexity
```json
{
  "error": "INVALID_PASSWORD",
  "message": "Password must contain at least one special character",
  "field": "password"
}
```
```

#### OpenAPI/Swagger Specification

```yaml
openapi: 3.0.0
info:
  title: Example API
  version: 1.0.0
  description: API for user management

servers:
  - url: https://api.example.com/v1

paths:
  /users/{id}:
    get:
      summary: Get user by ID
      description: Retrieve detailed user information
      operationId: getUser
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: User ID (UUID v4)
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        created_at:
          type: string
          format: date-time
        status:
          type: string
          enum: [active, inactive, suspended]

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
        message:
          type: string
        field:
          type: string
```

### 3. Tutorials and Guides

**Structure**:

```markdown
# Tutorial: Building Your First Widget

**Estimated Time**: 20 minutes
**Prerequisites**: Node.js 18+, npm 9+
**What You'll Build**: A real-time notification widget

## What You'll Learn

- How to initialize a widget instance
- How to configure event handlers
- How to style widgets with CSS
- How to deploy to production

---

## Step 1: Installation

Install the widget library:

```bash
npm install widget-library
```

**Expected Output**:
```
+ widget-library@1.0.0
added 1 package
```

---

## Step 2: Create Basic Widget

Create a new file `widget.js`:

```javascript
import { Widget } from 'widget-library';

const widget = new Widget({
  container: '#app',
  theme: 'light'
});

widget.render();
```

**What's Happening Here?**
- `container`: CSS selector for mounting point
- `theme`: Visual theme (light/dark)
- `render()`: Displays the widget on the page

**Try It**: Open `index.html` in a browser. You should see a blank widget.

---

## Step 3: Add Event Handlers

Update `widget.js` to handle notifications:

```javascript
widget.on('notification', (data) => {
  console.log('New notification:', data.message);
});

// Simulate a notification
widget.notify({
  message: 'Hello, World!',
  type: 'info'
});
```

**Expected Behavior**:
- Console logs: "New notification: Hello, World!"
- Widget displays a blue info box

---

## Step 4: Customize Styles

Create `widget.css`:

```css
.widget {
  border: 2px solid #3498db;
  border-radius: 8px;
  padding: 16px;
}

.widget-notification {
  background: #ecf0f1;
  color: #2c3e50;
}
```

**Result**: Widget now has rounded corners and custom colors.

---

## Troubleshooting

**Problem**: Widget doesn't appear
- ✅ Check that `#app` element exists in HTML
- ✅ Verify `widget.render()` is called
- ✅ Open browser console for errors

**Problem**: Notifications don't show
- ✅ Ensure event handler is registered before calling `notify()`
- ✅ Check notification type is valid (`info`, `warning`, `error`)

---

## Next Steps

- [Advanced Configuration](./advanced-config.md)
- [Custom Themes](./themes.md)
- [Production Deployment](./deployment.md)

---

## Complete Code

```javascript
// widget.js
import { Widget } from 'widget-library';

const widget = new Widget({
  container: '#app',
  theme: 'light'
});

widget.on('notification', (data) => {
  console.log('New notification:', data.message);
});

widget.render();

widget.notify({
  message: 'Hello, World!',
  type: 'info'
});
```
```

**Tutorial Best Practices**:
- **Show progress**: Step numbers, estimated time
- **Explain why**: Don't just show code, explain reasoning
- **Checkpoints**: "At this point, you should see..."
- **Troubleshooting**: Anticipate common errors
- **Complete examples**: Provide runnable code

### 4. Changelog Management

**Keep a Changelog Format** (semantic versioning):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Feature X for improved performance
- New `debugMode` configuration option

### Changed
- Updated default timeout from 5s to 10s

### Deprecated
- `oldMethod()` will be removed in v3.0.0 (use `newMethod()` instead)

### Fixed
- Bug where cache wasn't invalidated on updates

---

## [2.1.0] - 2024-01-15

### Added
- WebSocket support for real-time updates
- TypeScript type definitions
- Retry logic with exponential backoff

### Changed
- **BREAKING**: `config.timeout` now in milliseconds (was seconds)
- Improved error messages with context

### Fixed
- Memory leak in connection pool
- Race condition in concurrent requests

---

## [2.0.0] - 2023-12-01

### Added
- Complete rewrite with TypeScript
- Plugin system for extensibility

### Removed
- **BREAKING**: Removed deprecated `legacyMode` option

---

## [1.5.2] - 2023-11-10

### Fixed
- Security vulnerability in dependency (CVE-2023-XXXXX)

---

## [1.5.1] - 2023-11-05

### Fixed
- Incorrect version number in package.json
```

**Changelog Best Practices**:
- **Categorize changes**: Added, Changed, Deprecated, Removed, Fixed, Security
- **Link to issues**: `Fixed #123` links to GitHub issue
- **Breaking changes**: Mark with **BREAKING** prefix
- **Security fixes**: Separate category, include CVE if applicable
- **Date format**: ISO 8601 (YYYY-MM-DD)

### 5. Code Comments and Inline Documentation

**JSDoc Example**:

```typescript
/**
 * Compress an image file with optional format conversion.
 *
 * @param input - Path to input image file
 * @param options - Compression options
 * @returns Promise resolving to compression result
 *
 * @throws {ImageNotFoundError} If input file doesn't exist
 * @throws {UnsupportedFormatError} If format is not supported
 *
 * @example
 * ```typescript
 * const result = await compress('photo.jpg', {
 *   quality: 80,
 *   format: 'webp'
 * });
 * console.log(`Saved ${result.savedBytes} bytes`);
 * ```
 *
 * @see {@link https://docs.example.com/compression} for compression algorithm details
 */
export async function compress(
  input: string,
  options: CompressOptions
): Promise<CompressResult> {
  // Implementation
}

/**
 * Options for image compression
 */
export interface CompressOptions {
  /**
   * Compression quality (0-100)
   * @default 80
   */
  quality?: number;

  /**
   * Output format
   * @default 'jpeg' (auto-detected from input)
   */
  format?: 'jpeg' | 'png' | 'webp' | 'avif';

  /**
   * Preserve EXIF metadata
   * @default true
   */
  preserveMetadata?: boolean;
}
```

**Python Docstrings (Google Style)**:

```python
def compress_image(input_path, quality=80, format='jpeg'):
    """Compress an image file with optional format conversion.

    Args:
        input_path (str): Path to input image file.
        quality (int, optional): Compression quality (0-100). Defaults to 80.
        format (str, optional): Output format ('jpeg', 'png', 'webp').
            Defaults to 'jpeg'.

    Returns:
        CompressResult: Object containing output path and bytes saved.

    Raises:
        FileNotFoundError: If input_path doesn't exist.
        ValueError: If quality not in range 0-100.
        UnsupportedFormatError: If format is not supported.

    Examples:
        >>> result = compress_image('photo.jpg', quality=90, format='webp')
        >>> print(f"Saved {result.saved_bytes} bytes")
        Saved 1234567 bytes

    See Also:
        compress_batch: For compressing multiple images in parallel.
    """
    pass
```

## Style Guides

### 1. Microsoft Writing Style Guide Principles

- **Concise**: Remove filler words ("basically", "simply", "just")
- **Active voice**: "The function returns" > "The value is returned by"
- **Present tense**: "The system validates" > "The system will validate"
- **Second person**: "You can configure" > "Users can configure"
- **Avoid jargon**: Define acronyms on first use

**Examples**:

❌ **Bad**: "Basically, the API will simply return a JSON object containing all of the user data."
✅ **Good**: "The API returns a JSON object with user data."

❌ **Bad**: "The request is processed by the server, and then the response is sent."
✅ **Good**: "The server processes the request and sends a response."

### 2. Technical Terminology

**Consistent Capitalization**:
- API (not Api, api)
- JavaScript (not Javascript, javascript)
- TypeScript (not Typescript, typescript)
- macOS (not MacOS, Mac OS)
- Node.js (not NodeJS, nodejs)

**Abbreviations**:
- Define on first use: "Single Page Application (SPA)"
- Use consistently: Either "HTTP" or "http", not both

**Code Elements**:
- Inline code: Use backticks - "The `setTimeout()` function..."
- File names: Use backticks - "Edit `config.json`"
- Commands: Use code blocks with language hint

### 3. Information Architecture

**Progressive Disclosure**:

```
Level 1: Overview (What & Why)
  ├─ Level 2: Quick Start (How - Minimal)
  ├─ Level 3: Tutorials (How - Detailed)
  ├─ Level 4: Reference (Comprehensive)
  └─ Level 5: Advanced Topics
```

**Example Structure**:

```
Documentation Root
├── Getting Started
│   ├── Installation
│   ├── Quick Start (5 min)
│   └── Core Concepts
├── Tutorials
│   ├── Tutorial 1: Basic Usage
│   ├── Tutorial 2: Advanced Features
│   └── Tutorial 3: Production Deployment
├── API Reference
│   ├── Functions
│   ├── Classes
│   └── Types
├── How-To Guides
│   ├── Authentication
│   ├── Error Handling
│   └── Performance Optimization
└── Advanced
    ├── Architecture
    ├── Contributing
    └── Troubleshooting
```

## Documentation Tools

### 1. Markdown Variants

**GitHub Flavored Markdown (GFM)**:

```markdown
## Task Lists
- [x] Completed task
- [ ] Pending task

## Tables
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

## Syntax Highlighting
```javascript
const x = 10;
```

## Alerts (GitHub)
> [!NOTE]
> Useful information

> [!WARNING]
> Critical content

> [!IMPORTANT]
> Key information
```

### 2. Documentation Generators

**TypeDoc (TypeScript)**:

```bash
npm install --save-dev typedoc

# Generate docs
npx typedoc --out docs src/index.ts
```

**Sphinx (Python)**:

```bash
pip install sphinx

# Initialize
sphinx-quickstart docs

# Build
cd docs && make html
```

**JSDoc (JavaScript)**:

```bash
npm install --save-dev jsdoc

# Generate docs
npx jsdoc -c jsdoc.json src/
```

### 3. Versioned Documentation (Docusaurus)

```bash
npm run docusaurus docs:version 1.0.0

# Creates:
# - versioned_docs/version-1.0.0/
# - versioned_sidebars/version-1.0.0-sidebars.json
```

## Best Practices

### 1. Write for Scanning, Not Reading

**Use**:
- Headings and subheadings
- Bullet lists (not paragraphs)
- Code examples (not long explanations)
- Visual hierarchy (bold, italics, code blocks)

**Example**:

❌ **Bad**:
```
The configuration file is a JSON file that contains various options for
the application. You can set the timeout option to control how long the
application waits before timing out. The default value is 5000 milliseconds.
```

✅ **Good**:
```
## Configuration

Edit `config.json`:

```json
{
  "timeout": 5000  // milliseconds, default: 5000
}
```
```

### 2. Show, Don't Tell

❌ **Bad**: "You can use the function to fetch user data."
✅ **Good**:
```javascript
const user = await fetchUser('123');
console.log(user.name); // "John Doe"
```

### 3. Provide Context

❌ **Bad**:
```javascript
widget.setOption('cache', true);
```

✅ **Good**:
```javascript
// Enable caching to reduce API calls by 80% (recommended for production)
widget.setOption('cache', true);
```

### 4. Test Your Documentation

- **Run examples**: Ensure all code snippets actually work
- **Fresh eyes**: Ask someone unfamiliar with the project to follow docs
- **Automated checks**: Lint markdown, validate links, test code snippets

### 5. Keep It Updated

- **Deprecation warnings**: Document what's changing and when
- **Migration guides**: Provide step-by-step upgrade instructions
- **Version compatibility**: State which versions docs apply to

## Common Mistakes to Avoid

### 1. Assuming Knowledge

❌ **Bad**: "Just use the OAuth flow"
✅ **Good**: "Authenticate using OAuth 2.0 (see [tutorial](link))"

### 2. Implementation Over Outcome

❌ **Bad**: "This function uses a binary search algorithm"
✅ **Good**: "This function finds elements in O(log n) time"

### 3. Missing Error Cases

❌ **Bad**: Only documenting success responses
✅ **Good**: Document all HTTP status codes (200, 400, 401, 404, 500)

### 4. Outdated Examples

❌ **Bad**: Examples using deprecated APIs
✅ **Good**: Update examples with each release

### 5. No Searchability

❌ **Bad**: PDF documentation (not searchable)
✅ **Good**: HTML docs with search functionality (Algolia, local search)

## Templates

### API Endpoint Template

```markdown
### [HTTP Method] [Endpoint Path]

[One-sentence description]

**Endpoint**: `[METHOD] /path/:param`

**Authentication**: [Required/Optional]

**Parameters**:
- `param1` (type, location): Description

**Request Body** (if applicable):
```json
{
  "field": "value"
}
```

**Success Response ([Status Code])**:
```json
{
  "result": "data"
}
```

**Error Responses**:
- **[Status Code]**: Description
```json
{
  "error": "ERROR_CODE"
}
```

**Rate Limiting**: [Limits]

**Example**:
```bash
curl [example command]
```
```

### Tutorial Template

```markdown
# Tutorial: [Goal]

**Time**: [Estimate]
**Prerequisites**: [Requirements]
**What You'll Build**: [Outcome]

## What You'll Learn

- Bullet list

---

## Step 1: [Action]

[Instructions]

```code
[Example]
```

**Expected Result**: [What should happen]

---

[Repeat steps]

---

## Troubleshooting

**Problem**: [Issue]
- ✅ Solution 1
- ✅ Solution 2

---

## Next Steps

- [Related tutorial]
- [Advanced topic]
```

## Resources

- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs](https://www.writethedocs.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## Activation Keywords

Ask me about:
- "How to write API documentation"
- "README best practices"
- "Technical writing style guide"
- "Changelog format and versioning"
- "Tutorial structure and examples"
- "OpenAPI/Swagger documentation"
- "JSDoc and code comments"
- "Developer documentation tips"
- "How to write clear technical docs"
