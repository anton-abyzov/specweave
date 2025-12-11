# Migration Guide: Notion to LivingSpec

This guide walks you through migrating documentation from Notion to LivingSpec with E-suffix tracking for imported content.

## Overview

| Notion Concept | LivingSpec Equivalent |
|----------------|----------------------|
| Workspace | Project (manifest.yaml) |
| Database | specs/ or work/ directory |
| Page | Feature, User Story, or ADR |
| Database Properties | Frontmatter fields |
| Nested Pages | Directory hierarchy |
| Relations | Cross-references |

## Step 1: Export from Notion

### Option A: Workspace Export (Recommended)

1. Go to **Settings & Members** > **Settings**
2. Scroll to **Export content**
3. Select **Markdown & CSV** format
4. Include subpages: **Yes**
5. Download the export ZIP

### Option B: Database Export

1. Open your database
2. Click **...** menu > **Export**
3. Select **Markdown & CSV**
4. Download export

### Option C: API Export

```javascript
// notion-export.js
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function exportDatabase(databaseId) {
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  for (const page of response.results) {
    const pageContent = await notion.blocks.children.list({
      block_id: page.id,
    });

    // Convert to Markdown
    const markdown = blocksToMarkdown(pageContent.results);

    // Save to file
    fs.writeFileSync(`./export/${page.id}.md`, markdown);
  }
}

exportDatabase('your-database-id');
```

## Step 2: Understand Notion Export Structure

Notion exports create this structure:

```
Export-YYYY-MM-DD/
├── Database Name/
│   ├── Page Title abc123.md
│   ├── Page Title def456.md
│   └── Database.csv
├── Page Name/
│   ├── Subpage 1.md
│   └── Subpage 2.md
└── Loose Page ghi789.md
```

### CSV Database Properties

The `Database.csv` contains all properties:

```csv
Name,Status,Priority,Tags,Created
User Authentication,In Progress,P1,"security,core",2024-01-15
Payment Processing,Planned,P2,"payments",2024-01-20
```

## Step 3: Map Notion to LivingSpec

### Database-Based Mapping

If you used Notion databases for requirements:

```yaml
# notion-mapping.yaml
databases:
  "Features Database":
    type: "feature"
    output_dir: "specs"
    id_prefix: "FS"
    property_mapping:
      Name: title
      Status: status
      Priority: priority
      Owner: owner

  "User Stories":
    type: "user-story"
    output_dir: "specs/{feature}"
    id_prefix: "US"
    property_mapping:
      Name: title
      Status: status
      Feature: feature
      Acceptance Criteria: acceptance_criteria
```

### Page-Based Mapping

For simple page hierarchies:

| Notion Page Location | LivingSpec Location |
|---------------------|---------------------|
| /Product/ | specs/ |
| /Product/Feature A/ | specs/FS-001E/ |
| /Architecture/ | architecture/ |
| /Decisions/ | architecture/adr/ |
| /Team Docs/ | teams/ |

## Step 4: Convert Content

### Automated Conversion Script

```python
#!/usr/bin/env python3
# notion-to-livingspec.py

import os
import re
import csv
import yaml
from pathlib import Path

def convert_notion_export(export_dir, output_dir):
    """Convert Notion export to LivingSpec format."""

    counter = 1

    # Process each markdown file
    for md_file in Path(export_dir).rglob('*.md'):
        # Extract Notion ID from filename
        match = re.search(r'([a-f0-9]{32})\.md$', str(md_file))
        notion_id = match.group(1) if match else str(counter)

        # Read content
        with open(md_file, 'r') as f:
            content = f.read()

        # Determine document type from content/location
        doc_type = determine_type(md_file, content)

        # Create LivingSpec document
        ls_doc = create_livingspec_doc(
            content="content,"
            doc_type=doc_type,
            notion_id=notion_id,
            counter="counter"
        )

        # Write to output
        output_path = get_output_path(output_dir, doc_type, counter)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(ls_doc)

        counter += 1

def determine_type(filepath, content):
    """Determine LivingSpec document type from Notion content."""
    path_lower = str(filepath).lower()
    content_lower = content.lower()

    if 'feature' in path_lower or 'prd' in path_lower:
        return 'feature'
    elif 'story' in path_lower or 'user story' in content_lower:
        return 'user-story'
    elif 'decision' in path_lower or 'adr' in path_lower:
        return 'adr'
    elif 'runbook' in path_lower:
        return 'operations'
    else:
        return 'feature'  # Default

def create_livingspec_doc(content, doc_type, notion_id, counter):
    """Create LivingSpec document with frontmatter."""

    id_prefix = {
        'feature': 'FS',
        'user-story': 'US',
        'adr': 'ADR',
        'operations': 'RB'
    }.get(doc_type, 'DOC')

    # Extract title from first heading
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else 'Untitled'

    frontmatter = f"""---
id: "{id_prefix}-{counter:03d}E"
title: "{title}"
status: "approved"
origin: "external"
source: "notion"
external_id: "{notion_id}"
---

"""
    return frontmatter + content

def get_output_path(output_dir, doc_type, counter):
    """Get output path for document type."""
    if doc_type == 'feature':
        return Path(output_dir) / f"specs/FS-{counter:03d}E/FEATURE.md"
    elif doc_type == 'user-story':
        return Path(output_dir) / f"specs/FS-001E/US-{counter:03d}E.md"
    elif doc_type == 'adr':
        return Path(output_dir) / f"architecture/adr/{counter:04d}-imported.md"
    else:
        return Path(output_dir) / f"specs/DOC-{counter:03d}E.md"

if __name__ == '__main__':
    convert_notion_export('./Export-2024-01-15', './.livingspec')
```

## Step 5: Handle Notion-Specific Content

### Database Properties to Frontmatter

Notion database properties map to LivingSpec frontmatter:

**Notion Database Entry**:
```
Name: User Authentication
Status: In Progress
Priority: P1
Owner: @alice
Tags: security, core
```

**LivingSpec Frontmatter**:
```yaml
---
id: "FS-001E"
title: "User Authentication"
status: "in-progress"
priority: "P1"
owner: "alice"
tags: ["security", "core"]
origin: "external"
source: "notion"
external_id: "abc123"
---
```

### Notion Blocks to Markdown

| Notion Block | Markdown Equivalent |
|--------------|---------------------|
| Heading 1 | `# Heading` |
| Heading 2 | `## Heading` |
| Bulleted list | `- item` |
| Numbered list | `1. item` |
| To-do | `- [ ] task` |
| Code | ``` code ``` |
| Quote | `> quote` |
| Callout | `> **Note**: text` |
| Toggle | Expandable section |
| Database | Link to related docs |

### Notion Callouts to Admonitions

```markdown
# Notion callout
💡 This is an info callout

# LivingSpec (Docusaurus admonition)
:::info
This is an info callout
:::
```

### Notion Relations to Cross-References

```markdown
# Notion relation property
Related Features: Feature A, Feature B

# LivingSpec cross-reference
## Related Features
- [FS-001E: Feature A](../FS-001E/FEATURE.md)
- [FS-002E: Feature B](../FS-002E/FEATURE.md)
```

## Step 6: Handle Attachments

### Images

Notion uses temporary URLs for images. Download and store locally:

```bash
# Download images from Notion export
find ./Export -name "*.png" -o -name "*.jpg" | while read img; do
  cp "$img" .livingspec/assets/images/
done

# Update image references
find .livingspec -name "*.md" -exec sed -i \
  's|https://prod-files.*\.amazonaws\.com/[^)]*|../assets/images/|g' {} \;
```

### Files and Attachments

```bash
mkdir -p .livingspec/assets/documents
find ./Export -name "*.pdf" -o -name "*.docx" | while read doc; do
  cp "$doc" .livingspec/assets/documents/
done
```

## Step 7: Apply E-Suffix

All migrated Notion content gets E-suffix:

```yaml
# Before migration (Notion ID)
id: "abc123def456"

# After migration (LivingSpec with E-suffix)
id: "FS-001E"
origin: "external"
source: "notion"
external_id: "abc123def456"
```

### Parent-Child E-Suffix Propagation

```yaml
# Feature (migrated)
id: "FS-001E"

# User Story (child of migrated feature)
id: "US-001E"
feature: "FS-001E"

# Task (child of migrated story)
id: "T-001E"
user_story: "US-001E"
```

## Step 8: Validate Migration

```bash
# Run validation
livingspec validate .

# Check E-suffix consistency
livingspec validate . --check-e-suffix

# Verify all external items have origin metadata
grep -rL "origin:" .livingspec/specs/*E* || echo "All E-suffix items have origin"
```

### Migration Report

```bash
echo "=== Migration Report ==="
echo "Features: $(find .livingspec/specs -name 'FEATURE.md' | wc -l)"
echo "User Stories: $(find .livingspec/specs -name 'US-*.md' | wc -l)"
echo "ADRs: $(find .livingspec/architecture/adr -name '*.md' | wc -l)"
echo "External items: $(grep -rl 'origin: \"external\"' .livingspec | wc -l)"
```

## Step 9: Preserve Notion Links (Optional)

If you want to keep Notion as a backup reference:

```yaml
# Add to frontmatter
external_url: "https://www.notion.so/your-workspace/Page-Title-abc123"
```

### Create Redirect Page in Notion

Create a Notion page that redirects to your new LivingSpec docs:

```markdown
# Documentation Moved

This documentation has moved to: [LivingSpec Docs](https://docs.yourproject.com)

Please update your bookmarks.
```

## Common Issues

### Untitled Database Entries

```bash
# Find and fix untitled documents
grep -l 'title: "Untitled"' .livingspec/**/*.md | while read file; do
  echo "Fix title in: $file"
done
```

### Broken Image Links

```bash
# Find broken image references
grep -rn 'amazonaws.com' .livingspec/
# These need to be downloaded and paths updated
```

### Nested Toggle Content

Notion toggles don't export well. Convert to collapsible sections:

```markdown
# Notion toggle
▸ Click to expand

# LivingSpec (HTML details)
<details>
<summary>Click to expand</summary>

Content here...

</details>
```

### Database Formulas and Rollups

Notion formulas don't export. Calculate values manually or note them:

```yaml
# Original Notion formula: Progress = Tasks Done / Total Tasks
# Manual calculation stored
progress: 75  # 15/20 tasks
```

## See Also

- [Migration Guide: Confluence](./migration-confluence.md)
- [E-Suffix Documentation](../SPECIFICATION.md#e-suffix)
- [Quick-Start Guide](./quick-start.md)
