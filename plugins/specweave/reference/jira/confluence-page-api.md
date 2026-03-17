# Confluence REST API Reference - Page Operations

**Purpose**: Reference for updating Confluence pages via REST API (Cloud and Data Center)

**Use Case**: Sync SpecWeave living docs, specs, and increments to Confluence pages

**Last Updated**: 2026-02-02

---

## API Overview

### Cloud vs Data Center

| Feature | Cloud | Data Center/Server |
|---------|-------|-------------------|
| Base URL | `https://{domain}/wiki/api/v2/` | `https://{domain}/rest/api/content/` |
| API Version | v2 (recommended) | v1 |
| Auth | Basic Auth / OAuth 2.0 | Basic Auth / PAT |
| Rate Limits | Points-based (Feb 2026+) | Request-based |

### Authentication

```bash
# Cloud/DC: Basic Auth (email:api_token or username:password)
AUTH=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)
curl -H "Authorization: Basic $AUTH" ...

# Cloud: OAuth 2.0 (production recommended)
curl -H "Authorization: Bearer $OAUTH_TOKEN" ...

# Data Center: Personal Access Token (7.9+)
curl -H "Authorization: Bearer $PAT" ...
```

**Required Credentials** (`.env`):
```bash
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_DOMAIN=your-domain.atlassian.net
CONFLUENCE_SPACE_KEY=SPECWEAVE
```

---

## Page Operations

### 1. Get Page (Required Before Update)

**Endpoint**: `GET /wiki/api/v2/pages/{pageId}?body-format=storage`

```bash
curl -X GET \
  -H "Authorization: Basic $AUTH" \
  -H "Accept: application/json" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages/{pageId}?body-format=storage"
```

**Response**:
```json
{
  "id": "123456",
  "status": "current",
  "title": "Page Title",
  "spaceId": "789",
  "version": {
    "number": 5,
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "body": {
    "storage": {
      "value": "<p>Current page content</p>",
      "representation": "storage"
    }
  }
}
```

**Critical**: Save `version.number` for the update request.

---

### 2. Update Page (PUT)

**Endpoint**: `PUT /wiki/api/v2/pages/{pageId}`

**CRITICAL RULES**:
1. **Version MUST increment**: `version.number = currentVersion + 1`
2. **Title is REQUIRED** (even if unchanged)
3. **Body format**: Use `storage` representation

#### Request Body

```json
{
  "id": "123456",
  "status": "current",
  "title": "Page Title",
  "spaceId": "789",
  "body": {
    "representation": "storage",
    "value": "<p>Updated content here</p>"
  },
  "version": {
    "number": 6,
    "message": "Updated via SpecWeave sync"
  }
}
```

#### Full Example

```bash
# Step 1: Get current page to retrieve version
CURRENT=$(curl -s -X GET \
  -H "Authorization: Basic $AUTH" \
  -H "Accept: application/json" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages/$PAGE_ID?body-format=storage")

# Extract current version
VERSION=$(echo $CURRENT | jq '.version.number')
NEXT_VERSION=$((VERSION + 1))
TITLE=$(echo $CURRENT | jq -r '.title')
SPACE_ID=$(echo $CURRENT | jq -r '.spaceId')

# Step 2: Update page with incremented version
curl -X PUT \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages/$PAGE_ID" \
  -d "{
    \"id\": \"$PAGE_ID\",
    \"status\": \"current\",
    \"title\": \"$TITLE\",
    \"spaceId\": \"$SPACE_ID\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": \"<h1>Updated Content</h1><p>Synced from SpecWeave</p>\"
    },
    \"version\": {
      \"number\": $NEXT_VERSION,
      \"message\": \"Synced from SpecWeave\"
    }
  }"
```

---

### 3. Create Page (POST)

**Endpoint**: `POST /wiki/api/v2/pages`

```bash
curl -X POST \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages" \
  -d '{
    "spaceId": "789",
    "status": "current",
    "title": "New Page Title",
    "parentId": "456",
    "body": {
      "representation": "storage",
      "value": "<h1>New Page</h1><p>Created by SpecWeave</p>"
    }
  }'
```

**Optional Fields**:
- `parentId`: Page ID for parent (creates as child page)
- `status`: `current` (published) or `draft`

---

### 4. Delete Page

**Endpoint**: `DELETE /wiki/api/v2/pages/{pageId}`

```bash
curl -X DELETE \
  -H "Authorization: Basic $AUTH" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages/$PAGE_ID"
```

---

## Storage Format (XHTML)

Confluence uses an XHTML-based storage format. **NOT standard HTML**.

### Basic Elements

```xml
<!-- Paragraph -->
<p>Text content</p>

<!-- Headings -->
<h1>Heading 1</h1>
<h2>Heading 2</h2>

<!-- Line break (self-closing required) -->
<p>Line 1<br />Line 2</p>

<!-- Bold/Italic -->
<strong>Bold</strong>
<em>Italic</em>

<!-- Code inline -->
<code>inline code</code>

<!-- Code block -->
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">typescript</ac:parameter>
  <ac:plain-text-body><![CDATA[const x = 1;]]></ac:plain-text-body>
</ac:structured-macro>

<!-- Unordered list -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- Ordered list -->
<ol>
  <li>Step 1</li>
  <li>Step 2</li>
</ol>

<!-- Table -->
<table>
  <tbody>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
    </tr>
  </tbody>
</table>

<!-- Task list (checkboxes) -->
<ac:task-list>
  <ac:task>
    <ac:task-status>incomplete</ac:task-status>
    <ac:task-body>Task description</ac:task-body>
  </ac:task>
  <ac:task>
    <ac:task-status>complete</ac:task-status>
    <ac:task-body>Completed task</ac:task-body>
  </ac:task>
</ac:task-list>

<!-- Status macro (colored labels) -->
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">DONE</ac:parameter>
</ac:structured-macro>

<!-- Info panel -->
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>Information message</p>
  </ac:rich-text-body>
</ac:structured-macro>

<!-- Warning panel -->
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body>
    <p>Warning message</p>
  </ac:rich-text-body>
</ac:structured-macro>

<!-- Link to another page -->
<ac:link>
  <ri:page ri:content-title="Target Page Title" ri:space-key="SPACE" />
</ac:link>

<!-- External link -->
<a href="https://example.com">Link text</a>
```

### Markdown to Storage Format Conversion

| Markdown | Storage Format |
|----------|---------------|
| `# H1` | `<h1>H1</h1>` |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |
| `` `code` `` | `<code>code</code>` |
| `- item` | `<ul><li>item</li></ul>` |
| `[text](url)` | `<a href="url">text</a>` |
| `- [ ] task` | `<ac:task-list><ac:task><ac:task-status>incomplete</ac:task-status>...` |
| `- [x] done` | `<ac:task-list><ac:task><ac:task-status>complete</ac:task-status>...` |

---

## Error Handling

### Common Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| **409** | `Version must be incremented` | Version number not incremented | GET current version, add 1 |
| **401** | `Unauthorized` | Invalid/expired credentials | Refresh API token |
| **403** | `Forbidden` | Insufficient permissions | Check space/page permissions |
| **404** | `Page not found` | Invalid page ID | Verify page ID exists |
| **400** | `Invalid storage format` | Malformed XHTML | Validate storage format XML |

### Version Conflict Resolution

```bash
# Error: "Version must be incremented on update. Current version is: 15"

# Solution: Re-fetch current version and retry
CURRENT_VERSION=$(curl -s -X GET \
  -H "Authorization: Basic $AUTH" \
  "https://$CONFLUENCE_DOMAIN/wiki/api/v2/pages/$PAGE_ID" \
  | jq '.version.number')

NEXT_VERSION=$((CURRENT_VERSION + 1))
# Retry PUT with correct version
```

---

## SpecWeave Integration Patterns

### Pattern 1: Sync Increment Spec to Confluence

```typescript
// Pseudo-code for syncing spec.md → Confluence page
async function syncSpecToConfluence(incrementId: string) {
  // 1. Read spec.md
  const specContent = await readFile(`.specweave/increments/${incrementId}/spec.md`);

  // 2. Convert markdown to storage format
  const storageContent = markdownToConfluenceStorage(specContent);

  // 3. Get page ID from metadata
  const metadata = await readMetadata(incrementId);
  const pageId = metadata.external_sync?.confluence?.pageId;

  if (pageId) {
    // 4a. Update existing page
    const current = await getPage(pageId);
    await updatePage(pageId, {
      title: current.title,
      body: storageContent,
      version: current.version.number + 1
    });
  } else {
    // 4b. Create new page
    const page = await createPage({
      spaceKey: config.confluence.spaceKey,
      title: `[${incrementId}] ${metadata.title}`,
      parentId: config.confluence.parentPageId,
      body: storageContent
    });

    // 5. Store page ID in metadata
    await updateMetadata(incrementId, {
      external_sync: {
        confluence: {
          pageId: page.id,
          pageUrl: `https://${domain}/wiki/spaces/${spaceKey}/pages/${page.id}`,
          lastSyncedAt: new Date().toISOString()
        }
      }
    });
  }
}
```

### Pattern 2: Sync Tasks to Confluence Task List

```typescript
// Convert tasks.md checkboxes to Confluence task list
function tasksToConfluenceTaskList(tasks: Task[]): string {
  const taskItems = tasks.map(task => `
    <ac:task>
      <ac:task-status>${task.completed ? 'complete' : 'incomplete'}</ac:task-status>
      <ac:task-body>${escapeXml(task.title)}</ac:task-body>
    </ac:task>
  `).join('');

  return `<ac:task-list>${taskItems}</ac:task-list>`;
}
```

### Pattern 3: Bidirectional Status Sync

```
SpecWeave → Confluence:
  planned      → Status macro: Grey "PLANNED"
  in_progress  → Status macro: Blue "IN PROGRESS"
  completed    → Status macro: Green "DONE"

Confluence → SpecWeave:
  (Manual edits to task checkboxes sync back via polling)
```

---

## Metadata Storage

Store Confluence links in `metadata.json`:

```json
{
  "external_sync": {
    "jira": {
      "issueKey": "PROJ-123",
      "issueUrl": "https://company.atlassian.net/browse/PROJ-123"
    },
    "confluence": {
      "pageId": "123456789",
      "pageUrl": "https://company.atlassian.net/wiki/spaces/PROJ/pages/123456789",
      "spaceKey": "PROJ",
      "lastSyncedAt": "2026-02-02T10:30:00Z",
      "syncDirection": "push"
    }
  }
}
```

---

## Rate Limiting (2026)

As of February 2026, Atlassian enforces **points-based rate limiting**:

- Base: 1 point per request
- Additional points for objects returned/created
- Limit: Varies by plan tier

**Best Practices**:
1. Batch updates where possible
2. Use pagination (limit: 50 per request)
3. Implement exponential backoff on 429 responses
4. Cache page versions locally

---

## Security Checklist

- [ ] API token stored in `.env` (gitignored)
- [ ] Never log or commit tokens
- [ ] Use least-privilege permissions
- [ ] Consider OAuth 2.0 for production
- [ ] Validate input before constructing storage format (prevent XSS)
- [ ] Sanitize user content in storage format

---

## Related Documentation

- [Confluence Cloud REST API v2](https://developer.atlassian.com/cloud/confluence/rest/v2/intro/)
- [Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html)
- [Confluence REST API Examples](https://developer.atlassian.com/server/confluence/confluence-rest-api-examples/)
- [JIRA ↔ SpecWeave Mapping](./jira-specweave-mapping.md)

---

**Version**: 1.0.0
**Plugin**: specweave-jira
