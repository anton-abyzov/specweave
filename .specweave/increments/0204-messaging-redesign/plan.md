# Plan: Messaging & Docs Redesign

## Approach
Three-phase execution: README rewrite (highest impact) → Landing page + navigation → Supporting content updates.

## Messaging Framework
Three pillars: Programmable AI | Autonomous Teams | Enterprise Ready

## Architecture Decisions
- Keep all filesystem paths unchanged (no broken links)
- Only change sidebar labels and navbar items
- No Docusaurus theme changes beyond minor CSS
- Move contributor content (Skill Dev Guidelines) out of README to docs

## Key Files
- README.md (rewrite)
- docs-site/docs/intro.md (landing page)
- docs-site/docusaurus.config.ts (navbar, meta)
- docs-site/sidebars.ts (sidebar labels)
- 3 new pages + 5 page updates
