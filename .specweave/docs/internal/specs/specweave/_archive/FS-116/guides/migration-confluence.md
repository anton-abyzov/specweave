# Migration Guide: Confluence to LivingSpec

This guide walks you through migrating documentation from Atlassian Confluence to LivingSpec with E-suffix tracking for imported content.

## Overview

| Confluence Concept | LivingSpec Equivalent |
|-------------------|----------------------|
| Space | Project (manifest.yaml) |
| Page Tree | specs/ hierarchy |
| Page | Feature, User Story, or ADR |
| Page Labels | Tags in frontmatter |
| Child Pages | Nested directories |

## Step 1: Export from Confluence

### Option A: Space Export (Recommended)

1. Go to **Space Settings** > **Content Tools** > **Export**
2. Select **HTML** format
3. Check "Include attachments"
4. Download the export ZIP

### Option B: API Export

```bash
# Using Confluence REST API
curl -u username:token \
  "https://your-domain.atlassian.net/wiki/rest/api/space/SPACEKEY/content?expand=body.storage" \
  -o confluence-export.json
```

### Option C: Using confluence-to-markdown

```bash
# Install converter
npm install -g confluence-to-markdown

# Export space
confluence-to-markdown \
  --baseUrl https://your-domain.atlassian.net/wiki \
  --space SPACEKEY \
  --output ./confluence-export
```

## Step 2: Analyze Exported Content

Create an inventory of your Confluence content:

```bash
# Count pages by type
find ./confluence-export -name "*.html" | wc -l

# List page titles
grep -h "<title>" ./confluence-export/*.html | head -20
```

### Mapping Content to LivingSpec Types

| Confluence Page Title Pattern | LivingSpec Type | Directory |
|------------------------------|-----------------|-----------|
| "PRD: *", "Product: *" | Feature (FS) | specs/FS-XXX/ |
| "Epic: *", "Initiative: *" | Epic (EP) | _epics/EP-XXX/ |
| "Story: *", "User Story: *" | User Story (US) | specs/FS-XXX/US-XXX.md |
| "ADR-*", "Decision: *" | ADR | architecture/adr/ |
| "Runbook: *", "How to: *" | Operations | operations/runbooks/ |
| "Architecture: *" | Module | architecture/modules/ |

## Step 3: Convert to LivingSpec Format

### Manual Conversion

For each Confluence page, create the appropriate LivingSpec document:

**Confluence Page (HTML)**:
```html
<h1>PRD: User Authentication</h1>
<p>This document describes the authentication feature...</p>
<h2>User Stories</h2>
<ul>
  <li>As a user, I want to log in</li>
  <li>As a user, I want to register</li>
</ul>
```

**LivingSpec Feature**:
```yaml
---
id: "FS-001E"
title: "User Authentication"
status: "approved"
origin: "external"
source: "confluence"
external_id: "12345678"
external_url: "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/12345678"
---

# FS-001E: User Authentication

> **Note**: This feature was migrated from Confluence.

## Description

This document describes the authentication feature...

## User Stories

- [US-001E: User Login](./US-001E.md)
- [US-002E: User Registration](./US-002E.md)
```

### Automated Conversion Script

```bash
#!/bin/bash
# confluence-to-livingspec.sh

INPUT_DIR="./confluence-export"
OUTPUT_DIR="./.livingspec/specs"
COUNTER="1"

for file in "$INPUT_DIR"/*.html; do
  # Extract title
  TITLE="$(grep" -oP '<title>\K[^<]+' "$file")

  # Determine type from title
  if [[ "$TITLE" =~ ^PRD:|^Product:|^Feature: ]]; then
    TYPE="FS"
    DEST_DIR="$OUTPUT_DIR/FS-$(printf '%03d' $COUNTER)E"
    mkdir -p "$DEST_DIR"

    # Convert HTML to Markdown
    pandoc "$file" -f html -t markdown -o "$DEST_DIR/FEATURE.md"

    # Add frontmatter
    FRONTMATTER="---
id: \"FS-$(printf '%03d' $COUNTER)E\"
title: \"${TITLE#*: }\"
status: \"approved\"
origin: \"external\"
source: \"confluence\"
external_id: \"$(basename "$file" .html)\"
---
"
    echo "$FRONTMATTER" | cat - "$DEST_DIR/FEATURE.md" > temp && mv temp "$DEST_DIR/FEATURE.md"

    ((COUNTER++))
  fi
done
```

## Step 4: Handle Attachments

### Images

Move images to a local assets folder:

```bash
# Create assets directory
mkdir -p .livingspec/assets/images

# Copy attachments
cp confluence-export/attachments/* .livingspec/assets/images/

# Update image references in Markdown
find .livingspec -name "*.md" -exec sed -i 's|/download/attachments/[0-9]*/|../assets/images/|g' {} \;
```

### Documents (PDF, DOC)

```bash
mkdir -p .livingspec/assets/documents
cp confluence-export/attachments/*.pdf .livingspec/assets/documents/
```

## Step 5: Preserve Links

### Internal Links

Confluence internal links need to be converted to LivingSpec relative paths:

```bash
# Before (Confluence)
[See Authentication](/wiki/spaces/SPACE/pages/12345678)

# After (LivingSpec)
[See Authentication](../FS-001E/FEATURE.md)
```

### Create Link Mapping

```yaml
# link-mapping.yaml
mappings:
  - confluence_id: "12345678"
    livingspec_path: "specs/FS-001E/FEATURE.md"
  - confluence_id: "12345679"
    livingspec_path: "specs/FS-001E/US-001E.md"
```

### Update Links Script

```bash
#!/bin/bash
# update-links.sh

while IFS= read -r line; do
  CONF_ID=$(echo "$line" | cut -d: -f1 | tr -d ' ')
  LS_PATH=$(echo "$line" | cut -d: -f2 | tr -d ' ')

  find .livingspec -name "*.md" -exec sed -i \
    "s|/wiki/spaces/[^/]*/pages/$CONF_ID|$LS_PATH|g" {} \;
done < link-mapping.txt
```

## Step 6: Apply E-Suffix

All migrated content gets the E-suffix to indicate external origin:

| Original ID | LivingSpec ID | Reason |
|-------------|---------------|--------|
| Feature-1 | FS-001E | Migrated from Confluence |
| Story-1 | US-001E | Child of FS-001E |
| AC-1 | AC-US1E-01E | Child of US-001E |

### Validation

```bash
# Validate E-suffix consistency
livingspec validate . --check-e-suffix

# Expected output:
# ✅ All external items have E-suffix
# ✅ E-suffix propagation correct (parent → children)
# ✅ Origin metadata present for all E-suffix items
```

## Step 7: Verify Migration

### Checklist

- [ ] All Confluence pages converted to LivingSpec documents
- [ ] E-suffix applied to all migrated items
- [ ] Origin metadata (source: confluence, external_id) present
- [ ] Images and attachments migrated
- [ ] Internal links updated
- [ ] LivingSpec validation passes

### Compare Content

```bash
# Count source vs destination
echo "Confluence pages: $(find confluence-export -name '*.html' | wc -l)"
echo "LivingSpec docs: $(find .livingspec/specs -name '*.md' | wc -l)"
```

## Step 8: Archive Confluence Space

After successful migration:

1. Set Confluence space to read-only
2. Add notice: "This content has moved to [LivingSpec docs link]"
3. Keep for 6 months for reference
4. Archive or delete after transition period

## Rollback Plan

If migration fails, the original Confluence space remains unchanged. Simply delete the `.livingspec/` directory and start over.

## Common Issues

### HTML Conversion Artifacts

```bash
# Remove empty paragraphs
find .livingspec -name "*.md" -exec sed -i '/^<p>$/d' {} \;

# Fix code blocks
find .livingspec -name "*.md" -exec sed -i 's/<pre>/<code>/g; s/<\/pre>/<\/code>/g' {} \;
```

### Missing Frontmatter

```bash
# Find files without frontmatter
for file in $(find .livingspec -name "*.md"); do
  if ! head -1 "$file" | grep -q "^---$"; then
    echo "Missing frontmatter: $file"
  fi
done
```

### Duplicate IDs

```bash
# Find duplicate IDs
grep -rh "^id:" .livingspec | sort | uniq -d
```

## See Also

- [Migration Guide: Notion](./migration-notion.md)
- [E-Suffix Documentation](../SPECIFICATION.md#e-suffix)
- [Quick-Start Guide](./quick-start.md)
