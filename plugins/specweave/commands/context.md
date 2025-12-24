---
name: sw:context
description: Load living docs context for a topic into the current conversation. Use before implementation to get relevant specs, ADRs, and architecture docs. Keywords - context, load context, get context, living docs context, inject context.
---

# Load Living Docs Context

You are executing the SpecWeave context loading command. This injects relevant living documentation into the current conversation to provide LLM agents with project knowledge.

## Purpose

**Problem**: LLMs don't automatically know about living docs content during implementation.

**Solution**: This command searches living docs, extracts relevant content, and presents it as conversation context.

---

## STEP 1: Parse Arguments

```
Arguments provided: [user's arguments]
```

**Parse the input**:
- `<topic>`: Required. The topic/keyword to search for (e.g., "auth", "database", "api")
- `--deep`: Optional. Include full file contents instead of summaries
- `--all`: Optional. Load all living docs (warning: may be large)

**Examples**:
```bash
/sw:context auth           # Load auth-related docs
/sw:context database --deep  # Load DB docs with full content
/sw:context --all          # Load everything (use with caution)
```

---

## STEP 2: Search Living Docs

### 2.1: Define Search Locations

```bash
LIVING_DOCS_ROOT=".specweave/docs/internal"

SEARCH_LOCATIONS=(
  "$LIVING_DOCS_ROOT/specs/"           # Feature specifications
  "$LIVING_DOCS_ROOT/architecture/"    # Architecture docs & ADRs
  "$LIVING_DOCS_ROOT/strategy/"        # Business requirements
  "$LIVING_DOCS_ROOT/operations/"      # Runbooks, SLOs
  "$LIVING_DOCS_ROOT/delivery/"        # Release processes
  "$LIVING_DOCS_ROOT/governance/"      # Policies
)
```

### 2.2: Search for Topic Matches

Use Grep to find files matching the topic:

```bash
# Search file names
find "$LIVING_DOCS_ROOT" -name "*${TOPIC}*" -type f

# Search file contents
grep -ril "${TOPIC}" "$LIVING_DOCS_ROOT" --include="*.md"
```

**Prioritize matches by relevance**:
1. **Exact filename match** (highest): `auth.md`, `authentication.md`
2. **Filename contains topic**: `user-authentication.md`
3. **Content match in title/headers**: `# Authentication System`
4. **Content match in body** (lowest): mentions topic in text

---

## STEP 3: Extract and Summarize

### 3.1: For Each Matched File

Read the file and extract key information:

```typescript
interface ExtractedContext {
  file: string;           // File path
  type: string;           // "spec" | "adr" | "architecture" | "operations" | etc.
  title: string;          // Document title
  summary: string;        // 2-3 sentence summary
  keyPoints: string[];    // Bullet points of important info
  relatedDocs: string[];  // Cross-linked documents
  fullContent?: string;   // Only if --deep flag
}
```

### 3.2: Content Classification

Determine document type from location:

| Location | Type | Purpose |
|----------|------|---------|
| `specs/` | Specification | User stories, requirements |
| `architecture/adr/` | ADR | Architecture decisions |
| `architecture/` | Architecture | System design |
| `strategy/` | Strategy | Business requirements |
| `operations/` | Operations | Runbooks, SLOs |
| `delivery/` | Delivery | Release processes |
| `governance/` | Governance | Policies |

---

## STEP 4: Present Context

### Output Format (Standard Mode)

```
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT: {TOPIC}
═══════════════════════════════════════════════════════════════

Found {N} relevant documents.

───────────────────────────────────────────────────────────────
📋 SPECIFICATIONS ({count})
───────────────────────────────────────────────────────────────

**{file1_title}** ({file1_path})
{2-3 sentence summary}

Key Points:
- {point1}
- {point2}
- {point3}

Related: {related_docs}

---

**{file2_title}** ({file2_path})
{summary}
...

───────────────────────────────────────────────────────────────
📐 ARCHITECTURE DECISIONS ({count})
───────────────────────────────────────────────────────────────

**ADR-{number}: {title}** ({file_path})
Status: {Accepted/Proposed/Deprecated}
Decision: {one-line decision}
Rationale: {why this decision was made}

---

...

───────────────────────────────────────────────────────────────
🏗️ ARCHITECTURE DOCS ({count})
───────────────────────────────────────────────────────────────

**{title}** ({file_path})
{summary}

Components:
- {component1}
- {component2}

---

...

───────────────────────────────────────────────────────────────
📊 OPERATIONS ({count})
───────────────────────────────────────────────────────────────

**{runbook_title}** ({file_path})
Purpose: {purpose}
When to use: {trigger conditions}

---

...

═══════════════════════════════════════════════════════════════
✅ CONTEXT LOADED
═══════════════════════════════════════════════════════════════

{N} documents loaded for topic "{TOPIC}".

This context is now available for your current task.
Use this information to:
- Understand existing design decisions
- Avoid contradicting established patterns
- Reference existing specifications
- Follow operational procedures

To load more context: /sw:context <different-topic>
To see full content: /sw:context {TOPIC} --deep

═══════════════════════════════════════════════════════════════
```

### Output Format (Deep Mode)

When `--deep` flag is used, include full file contents:

```
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT: {TOPIC} (DEEP MODE)
═══════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
📄 {file1_path}
───────────────────────────────────────────────────────────────

{FULL FILE CONTENT}

───────────────────────────────────────────────────────────────
📄 {file2_path}
───────────────────────────────────────────────────────────────

{FULL FILE CONTENT}

...

═══════════════════════════════════════════════════════════════
```

---

## STEP 5: Handle Edge Cases

### No Matches Found

```
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT: {TOPIC}
═══════════════════════════════════════════════════════════════

❌ No documents found matching "{TOPIC}".

Suggestions:
1. Try a broader search term
2. Check available topics:

   Available in living docs:
   - authentication (5 docs)
   - database (3 docs)
   - api (8 docs)
   - deployment (4 docs)
   ...

3. List all living docs:
   ls .specweave/docs/internal/

Usage: /sw:context <topic>
═══════════════════════════════════════════════════════════════
```

### No Living Docs Exist

```
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT
═══════════════════════════════════════════════════════════════

⚠️ No living docs found at .specweave/docs/internal/

Living docs are created automatically when you:
1. Complete increments (/sw:done)
2. Run sync commands (/sw:sync-docs)

To get started:
1. Create your first increment: /sw:increment "feature name"
2. Implement tasks: /sw:do
3. Complete increment: /sw:done <id>

Living docs will be auto-generated from your increment specs.
═══════════════════════════════════════════════════════════════
```

### Too Many Matches (--all mode warning)

```
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT: ALL
═══════════════════════════════════════════════════════════════

⚠️ WARNING: Loading ALL living docs ({N} files, ~{X}k tokens)

This may:
- Use significant context window
- Slow down responses
- Include irrelevant content

Recommendation: Use topic-specific context instead:
  /sw:context <topic>

Continue anyway? (Loading all docs...)

───────────────────────────────────────────────────────────────
{... all docs content ...}
═══════════════════════════════════════════════════════════════
```

---

## STEP 6: Update Conversation Context

After presenting the context, the LLM now has:

1. **Knowledge of specifications** - What features exist, their requirements
2. **Architecture decisions** - Why things were designed a certain way
3. **Patterns to follow** - Established coding/design patterns
4. **Constraints** - Policies, SLOs, compliance requirements
5. **Cross-references** - Related documents for deeper exploration

**Important**: This context persists in the current conversation. The LLM should use this information when:
- Implementing features
- Making design decisions
- Writing code
- Answering questions

---

## Examples

### Example 1: Load Auth Context Before Implementation

```bash
User: /sw:context auth

Output:
═══════════════════════════════════════════════════════════════
📚 LIVING DOCS CONTEXT: AUTH
═══════════════════════════════════════════════════════════════

Found 4 relevant documents.

───────────────────────────────────────────────────────────────
📋 SPECIFICATIONS (2)
───────────────────────────────────────────────────────────────

**US-001: User Authentication** (.specweave/docs/internal/specs/backend/us-001-authentication.md)
Users can log in with email/password. Supports OAuth via Google and GitHub.
Passwords hashed with bcrypt (cost factor 12).

Key Points:
- JWT tokens with 24h expiry
- Refresh tokens stored in Redis
- Rate limiting: 5 attempts per minute

Related: ADR-0001, architecture/auth-flow.md

───────────────────────────────────────────────────────────────
📐 ARCHITECTURE DECISIONS (1)
───────────────────────────────────────────────────────────────

**ADR-0001: JWT vs Session Authentication** (.specweave/docs/internal/architecture/adr/0001-jwt-vs-sessions.md)
Status: Accepted
Decision: Use JWT for stateless authentication
Rationale: Supports horizontal scaling, works with microservices architecture

───────────────────────────────────────────────────────────────
🏗️ ARCHITECTURE DOCS (1)
───────────────────────────────────────────────────────────────

**Authentication Flow** (.specweave/docs/internal/architecture/auth-flow.md)
Describes the complete authentication flow from login to token refresh.

Components:
- AuthService (src/services/auth/)
- JWTManager (src/utils/jwt.ts)
- TokenStore (Redis)

═══════════════════════════════════════════════════════════════
✅ CONTEXT LOADED
═══════════════════════════════════════════════════════════════

4 documents loaded for topic "auth".

This context is now available for your current task.
═══════════════════════════════════════════════════════════════

User: Now implement a password reset feature