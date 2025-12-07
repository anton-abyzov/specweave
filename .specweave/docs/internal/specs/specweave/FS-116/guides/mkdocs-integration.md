# MkDocs Integration Guide

This guide explains how to integrate LivingSpec with [MkDocs](https://www.mkdocs.org/) using the [Material theme](https://squidfunk.github.io/mkdocs-material/) for simpler documentation sites.

## When to Use MkDocs

Choose MkDocs over Docusaurus when:
- You prefer Python-based tooling
- You need simpler setup with fewer dependencies
- Your team is already familiar with MkDocs
- You don't need React/MDX components
- You want faster build times for smaller projects

## Prerequisites

- Python 3.8+ installed
- An existing LivingSpec project (`.livingspec/` directory)
- pip or pipx for package management

## Quick Start

### 1. Install MkDocs and Material Theme

```bash
pip install mkdocs mkdocs-material livingspec-mkdocs
```

### 2. Create mkdocs.yml

```yaml
# mkdocs.yml
site_name: My Project Documentation
site_url: https://docs.example.com
repo_url: https://github.com/org/project

theme:
  name: material
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - search.suggest
    - content.code.copy

plugins:
  - search
  - livingspec:
      specs_dir: .livingspec
      output_dir: docs/specs
      auto_nav: true
      show_origin_badges: true

nav:
  - Home: index.md
  - Specifications: specs/
  - Architecture: architecture/

extra_css:
  - stylesheets/livingspec.css
```

### 3. Build the Site

```bash
mkdocs build
# or for development
mkdocs serve
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `specs_dir` | string | `.livingspec` | Path to LivingSpec directory |
| `output_dir` | string | `docs/specs` | Where to generate docs |
| `auto_nav` | boolean | `true` | Auto-generate navigation |
| `show_origin_badges` | boolean | `true` | Show badges for E-suffix items |
| `include_work_units` | boolean | `false` | Include active work items |
| `hierarchy_depth` | int | `3` | Max nesting depth in nav |

## Auto-Generated Navigation

When `auto_nav: true`, the plugin generates navigation matching your LivingSpec structure:

```yaml
# Generated in mkdocs.yml
nav:
  - Specifications:
    - EP-001 Platform Modernization:
      - FS-042 User Authentication:
        - US-001 User Registration: specs/FS-042/US-001.md
        - US-002 User Login: specs/FS-042/US-002.md
      - FS-043 Authorization:
        - US-003 Role Assignment: specs/FS-043/US-003.md
    - EP-002E External Initiative:  # 🔗 External
      - FS-044E Imported Feature: specs/FS-044E/index.md
```

## Origin Badges for E-Suffix Items

### Custom CSS for Badges

Create `docs/stylesheets/livingspec.css`:

```css
/* Origin badges for external items */
.origin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  vertical-align: middle;
}

.origin-badge::before {
  content: "🔗";
  font-size: 0.875rem;
}

.origin-badge--github {
  background-color: #24292e;
  color: #ffffff;
}

.origin-badge--jira {
  background-color: #0052cc;
  color: #ffffff;
}

.origin-badge--ado {
  background-color: #0078d4;
  color: #ffffff;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge--draft { background: #6b7280; color: white; }
.status-badge--in-progress { background: #3b82f6; color: white; }
.status-badge--completed { background: #10b981; color: white; }
.status-badge--blocked { background: #ef4444; color: white; }

/* Hierarchy breadcrumb */
.hierarchy-breadcrumb {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.hierarchy-breadcrumb a {
  color: #3b82f6;
  text-decoration: none;
}

.hierarchy-breadcrumb a:hover {
  text-decoration: underline;
}

.hierarchy-breadcrumb .separator::before {
  content: "›";
}
```

### Markdown Extensions

Enable these extensions in `mkdocs.yml` for better rendering:

```yaml
markdown_extensions:
  - admonition
  - attr_list
  - md_in_html
  - pymdownx.superfences
  - pymdownx.tasklist:
      custom_checkbox: true
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg
  - toc:
      permalink: true
```

## Generated Document Format

The plugin transforms LivingSpec documents into MkDocs-compatible Markdown:

### Input (LivingSpec)

```yaml
# .livingspec/specs/FS-042/US-001.md
---
id: "US-001"
feature: "FS-042"
title: "User Registration"
status: "in-progress"
---

## Acceptance Criteria
- [ ] **AC-US1-01**: Given valid email...
- [ ] **AC-US1-02**: Given invalid email...
```

### Output (MkDocs)

```markdown
---
title: US-001 User Registration
---

# US-001: User Registration

<span class="status-badge status-badge--in-progress">In Progress</span>

<nav class="hierarchy-breadcrumb">
  <a href="../../../EP-001/">EP-001</a>
  <span class="separator"></span>
  <a href="../../">FS-042</a>
  <span class="separator"></span>
  <span>US-001</span>
</nav>

**Feature**: [FS-042 User Authentication](../)

## Acceptance Criteria

- [ ] **AC-US1-01**: Given valid email, when submit, then account created
- [ ] **AC-US1-02**: Given invalid email, when submit, then error shown
```

## Material Theme Features

### Tabs for Document Sections

```yaml
theme:
  features:
    - navigation.tabs
```

Creates top-level tabs for Specifications, Architecture, etc.

### Collapsible Sections

```yaml
theme:
  features:
    - navigation.sections
```

Groups related specs under collapsible headers.

### Search

```yaml
plugins:
  - search:
      lang: en
      separator: '[\s\-,:!=\[\]()"/]+|(?!\b)(?=[A-Z][a-z])'
```

Indexes all LivingSpec content for full-text search.

## Example Project Structure

```
my-project/
├── .livingspec/
│   ├── manifest.yaml
│   ├── specs/
│   │   └── FS-042/
│   │       ├── FEATURE.md
│   │       └── US-001.md
│   └── architecture/
│       └── adr/
│           └── ADR-0001.md
├── docs/
│   ├── index.md
│   ├── specs/              # Auto-generated
│   │   ├── FS-042/
│   │   │   ├── index.md
│   │   │   └── US-001.md
│   │   └── nav.yml
│   └── stylesheets/
│       └── livingspec.css
└── mkdocs.yml
```

## Building for Production

```bash
# Build static site
mkdocs build

# Output in site/ directory
ls site/
# index.html specs/ search/ ...
```

### Deploy to GitHub Pages

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - '.livingspec/**'
      - 'docs/**'
      - 'mkdocs.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install mkdocs mkdocs-material livingspec-mkdocs
      - run: mkdocs gh-deploy --force
```

## Troubleshooting

### "Invalid YAML in frontmatter"

Ensure quotes around IDs with special characters:

```yaml
# Correct
id: "FS-042E"

# Incorrect (may fail)
id: FS-042E
```

### Navigation not updating

Clear the cache and rebuild:

```bash
rm -rf site/
mkdocs build
```

### Origin badges not rendering

1. Verify custom CSS is loaded in `extra_css`
2. Check E-suffix items have `origin`, `source` fields
3. Ensure `attr_list` extension is enabled

## See Also

- [Docusaurus Integration Guide](./docusaurus-integration.md)
- [LivingSpec Specification](../SPECIFICATION.md)
- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material Theme](https://squidfunk.github.io/mkdocs-material/)
