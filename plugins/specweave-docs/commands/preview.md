---
name: specweave-docs:preview
description: Launch Docusaurus documentation server. Supports both public (port 3016) and internal (port 8001) documentation sites.
---

# Documentation Preview Command

Launch Docusaurus development server with hot reload, Mermaid diagrams, and auto-generated sidebar.

## Usage

```bash
# Preview INTERNAL docs (SpecWeave living documentation) - DEFAULT
/specweave-docs:preview

# Preview PUBLIC docs (end-user documentation)
/specweave-docs:preview --public
```

## Two Documentation Sites

| Site | Port | Content | NPM Script |
|------|------|---------|------------|
| **Internal** | 8001 | `.specweave/docs/internal/` | `docs:internal` |
| **Public** | 3016 | `docs-site/docs/` | `docs:dev` |

## Your Task

Execute the appropriate npm script based on user flags:

```bash
# Check if user wants public docs
PUBLIC_FLAG="${1:-}"

cd /path/to/project

if [ "$PUBLIC_FLAG" = "--public" ]; then
  echo "Launching PUBLIC documentation on port 3016..."
  echo "Content: docs-site/docs/"
  echo ""
  npm run docs:dev
else
  echo "Launching INTERNAL documentation on port 8001..."
  echo "Content: .specweave/docs/internal/"
  echo ""
  npm run docs:internal
fi
```

### Alternative: Run directly with npx

If in a fresh project without the docs-site setup:

```bash
# For internal docs
cd docs-site && npm run start:internal

# For public docs
cd docs-site && npm run start
```

## What You Get

- **Hot reload** - Edit markdown, see changes instantly
- **Auto sidebar** - Generated from folder structure
- **Mermaid diagrams** - Architecture diagrams render beautifully
- **Dark/light mode** - Toggle in navbar
- **Local search** - Instant search across all docs
- **Mobile responsive** - Works on any device

## First-Time Setup

If `docs-site/node_modules` doesn't exist:

```bash
npm run docs:install
```

This installs Docusaurus dependencies (~200MB, ~30 seconds).

## Ports

| Script | Port | URL |
|--------|------|-----|
| `docs:dev` | 3016 | http://localhost:3016 |
| `docs:internal` | 8001 | http://localhost:8001 |

## Internal Docs Structure

```
.specweave/docs/internal/
├── strategy/        → Product strategy
├── specs/           → Feature specifications (708 files!)
│   └── specweave/
│       ├── FS-001/  → Feature folders
│       ├── FS-002/
│       └── ...
├── architecture/    → ADRs, HLDs, diagrams
├── delivery/        → Release plans, guides
├── operations/      → Runbooks, NFRs
└── governance/      → Standards, conventions
```

## Configuration Files

| File | Purpose |
|------|---------|
| `docusaurus.config.ts` | Public docs config |
| `docusaurus.config.internal.ts` | Internal docs config |
| `sidebars.ts` | Public docs sidebar |
| `sidebars.internal.ts` | Internal docs sidebar |

## Troubleshooting

### Port already in use
```bash
# Find process using port
lsof -i :8001

# Kill it
kill -9 <PID>
```

### Missing dependencies
```bash
npm run docs:install
```

### Build errors
```bash
cd docs-site && npm run clear && npm run start:internal
```

## See Also

- `/specweave-docs:build` - Build static site for deployment
- `/specweave-docs:organize` - Generate themed indexes for large folders
- `/specweave-docs:health` - Documentation health report
